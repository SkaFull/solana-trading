import './utils/loadEnv.js';
import express from 'express';
import WebSocket from 'ws';
import { getTokenTradeHistory } from './price/tradeDataApi.js';
import { initSharedState } from './core/sharedState.js';
import { registerHandlers } from './handlers/index.js';
import logger from './logger/index.js';
import { requestLogger } from './logger/middleware.js';
import { getPool } from './infra/db.js';
import dbCommon from './infra/dbCommon.js';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { getRedis, disconnectRedis } from './infra/redis.js';
import { safeTimeout } from './utils/safeRpc.js';
import { JWT_SECRET } from './core/constants.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(requestLogger);
const port = process.env.PORT || 3000;

const ctx = initSharedState();
const { scheduler, clients } = ctx;

const actionMap = registerHandlers(ctx);

const wss = new WebSocket.Server({ port: process.env.WEBSOCKET_PORT || 8080 });

const timers = [];

/**
 * 关闭指定客户端的 WebSocket 连接
 * @param {string} clientId - 客户端唯一标识符
 * @returns {void}
 * @description 根据客户端 ID 关闭对应的 WebSocket 连接，并从客户端列表中移除
 */
function closeClient(clientId) {
  if (clients.has(clientId)) {
    const ws = clients.get(clientId);
    ws.close(1000, '管理员强制断开');
    clients.delete(clientId);
  }
}

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  logger.info(`✅ WebSocket client connection: ${url}`);
  try {
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        logger.info(`✅ 心跳检测数据>>>>> ${JSON.stringify({ status: 'info', receivedMessage: data }, null, 2)}`);
        const action = data.action || '';
        const operator = data.operator || '';

        if (action && action !== 'undefined' && action !== 'register' && action !== 'logout') {
          try {
            const token = data.token;
            logger.info(`action : ${action} , client token: ${token}`);
            const payload = jwt.verify(token, JWT_SECRET);
            const userName = payload.userName;
            ws.user = payload;
            ws.isAlive = true;
            if (operator !== userName) {
              throw new Error('操作人与登录用户不一致！');
            }
            logger.info(`? userName: ${payload.userName} userId: 正常请求`);
          } catch (e) {
            logger.warn(`${action} : ? 无效 token：${e.message}`);
            ws.close(4001, '无效的JWT token');
            return;
          }
          const [userRows] = await dbCommon.safeQuery(
            'SELECT USER_ID, USER_NAME FROM SYS_USER WHERE USER_NAME = ? AND STATUS = "0" AND DEL_FLAG = "0"',
            [operator]
          );
          if (userRows.length === 0) {
            throw new Error('用户不存在或已停用或已删除！');
          }
        }
        if (actionMap.has(action)) {
          const handler = actionMap.get(action);
          await handler(data, ws, ctx);
        } else if (action === 'ping' || action === 'heartbeat' || action === 'pong') {
          ws.isAlive = true;
          logger.info(`? userName: ${payload.userName} userId: 正常心跳`);
        } else {
          logger.warn(`未知的action: ${action}`);
        }
      } catch (error) {
        ws.send(JSON.stringify({
          status: 'error',
          message: error.message,
        }));
      }
    });
    ws.on('error', (error) => {
      logger.error(`WebSocket client error: ${error.message}`);
    });
    ws.on('close', () => {
      logger.info('WebSocket client disconnected');
      for (const [clientId, clientWs] of clients) {
        if (clientWs === ws) {
          clients.delete(clientId);
          logger.info(`Client disconnected: ${clientId} (Total: ${clients.size})`);
          break;
        }
      }
    });
  } catch (error) {
    logger.error(`WebSocket connection rejected: Invalid token: ${error.message}`);
    ws.close(1008, '无效的token');
  }
});

app.listen(port, async () => {
  logger.info(`正在启动服务器，端口: ${port}`);
  try {
    logger.info('正在启动服务器 >>> 正在连接 Redis...');
    getRedis();
    logger.info(`✅ Redis 连接成功`);
    logger.info(`正在启动服务器 >>> 正在同步交易数据`);
    await sysTokenTradeData();
    logger.info(`✅ 交易数据同步完成`);
    logger.info(`✅ Server running on port ${port}`);
    logger.info(`✅ WebSocket server running on port ${process.env.WEBSOCKET_PORT || 8080}`);
  } catch (error) {
    logger.error(`❌ 启动失败: ${error.message}`);
    logger.error(`错误堆栈: ${error.stack}`);
  }
});

/**
 * 同步系统代币交易数据
 * @async
 * @returns {Promise<void>}
 * @description 启动时同步所有主钱包的代币交易历史数据
 * - 更新任务状态为 stopped
 * - 查询所有主钱包
 * - 为每个主钱包获取代币交易历史
 * - 使用事务确保数据一致性
 * @throws {Error} 数据库连接失败或查询失败时抛出错误
 */
export async function sysTokenTradeData() {
  logger.info('sysTokenTradeData 开始执行');
  let dbConnection;
  try {
    logger.info('正在获取数据库连接...');
    dbConnection = await getPool().getConnection();
    logger.info(`✅ 数据库连接成功`);
    
    logger.info('正在开启事务...');
    await dbConnection.beginTransaction();
    logger.info(`✅ 事务开启成功`);
    
    logger.info('正在更新任务状态...');
    await dbConnection.query("UPDATE trade_tasks SET status = 'stopped' where status = 'running' ");
    await dbConnection.query("UPDATE TASK_PARAM_INFO SET status = 'canceled' where status = 'active' ");
    logger.info(`✅ 任务状态更新完成`);
    
    logger.info('正在查询主钱包...');
    const [masterWallets] = await dbConnection.execute('SELECT master_public_key FROM MASTER_WALLETS MW where MW.DATA_STATUS = "0" ');
    logger.info(`✅ 查询主钱包成功，查询到 ${masterWallets.length} 个主钱包`);
    
    if (masterWallets.length <= 0) {
      logger.info(`✅ 没有主钱包，跳过交易数据同步`);
      return;
    }
    logger.info(`✅ 开始处理主钱包交易数据`);
    const results = await Promise.all(masterWallets.map(async (masterWallet) => {
      try {
        const masterPublicKey = masterWallet.master_public_key;
        logger.info(`✅ 处理主钱包: ${masterPublicKey}`);
        
        const [tokenRows] = await dbConnection.execute('SELECT mint_address FROM TOKENS WHERE MASTER_PUBLIC_KEY = ? and DATA_STATUS = "0" ', [masterPublicKey]);
        if (tokenRows.length <= 0) {
          logger.info(`✅ 主钱包 ${masterPublicKey} 没有代币，跳过`);
          return;
        }
        
        const mintAddress = tokenRows[0].mint_address;
        logger.info(`✅ 主钱包 ${masterPublicKey} 的代币地址: ${mintAddress}`);
        
        const [subRows] = await dbConnection.execute('SELECT public_key FROM SUB_WALLETS WHERE DATA_STATUS = "0" and master_public_key = ? ', [masterPublicKey]);
        const [holdingRows] = await dbConnection.execute('SELECT public_key FROM HOLDING_WALLETS WHERE DATA_STATUS = "0"');
        
        logger.info(`✅ 获取交易历史: ${mintAddress}`);
        await getTokenTradeHistory(mintAddress, masterPublicKey, subRows, holdingRows, 100);
        logger.info(`✅ 主钱包 ${masterPublicKey} 交易数据处理完成`);
      } catch (error) {
        logger.error(`❌ 任务构建交易异常: ${error.message}`);
        logger.error(`❌ 错误堆栈: ${error.stack}`);
      }
    }));
    
    logger.info('✅ 事务提交...');
    await dbConnection.commit();
    logger.info(`✅ 事务提交成功`);
    logger.info('sysTokenTradeData 执行完成');
  } catch (error) {
    logger.error(`❌ 同步获取交易数据异常: ${error.message}`);
    logger.error(`❌ 错误堆栈: ${error.stack}`);
    if (dbConnection) {
      logger.info('✅ 事务回滚...');
      await dbConnection.rollback();
      logger.info('✅ 事务已回滚');
    }
  } finally {
    if (dbConnection) {
      dbConnection.release();
      logger.info('✅ 数据库连接已释放');
    }
  }
}

scheduler.on('round', async ({ key, result, roundCount, elapsed }) => {
  logger.info(`[${key}] 本轮任务批次[${roundCount}]：启动 ${result.allTaskIds.length} 个任务，分 ${result.taskBatches.length} 批处理，耗时 ${elapsed} ms`);
  const [op, tn, mint] = key.split('-', 3);
  const [rows] = await dbCommon.safeQuery("SELECT status FROM TASK_PARAM_INFO where CREATE_BY = ? and TASK_NAME = ? and status = 'active'", [op, tn]);
  if (rows.length <= 0) {
    scheduler.stop(key);
  }
});

scheduler.on('error', async ({ key, error, roundCount, elapsed }) => {
  logger.error(`[${key}] 本轮任务批次[${roundCount}]，耗时 ${elapsed} ms，异常: ${error.message}`);
  const [op, tn, mint] = key.split('-', 3);
  const [rows] = await dbCommon.safeQuery("SELECT status FROM TASK_PARAM_INFO where CREATE_BY = ? and TASK_NAME = ? and status = 'active'", [op, tn]);
  if (rows.length <= 0) {
    scheduler.stop(key);
  }
});

/**
 * 优雅关闭服务
 * @async
 * @param {string} signal - 关闭信号（如 'SIGTERM', 'SIGINT'）
 * @returns {Promise<void>}
 * @description 按顺序清理所有资源并关闭服务
 * - 清理所有定时器
 * - 停止任务调度器
 * - 关闭 WebSocket 服务器
 * - 断开 Redis 连接
 * - 关闭数据库连接池
 * - 退出进程
 */
async function gracefulShutdown(signal) {
  logger.info(`${signal} 关闭服务...`);
  try {
    logger.info(`正在清理 ${timers.length} 个定时器...`);
    timers.forEach((timer, index) => {
      clearInterval(timer);
      logger.info(`定时器 ${index + 1} 已清理`);
    });
    timers.length = 0;
    logger.info('所有定时器已清理完成');
    
    logger.info('正在停止任务调度器...');
    scheduler.stopAll();
    logger.info('任务调度器已停止');
    
    logger.info('正在关闭 WebSocket 服务器...');
    await new Promise((resolve) => {
      wss.close(() => {
        logger.info('WebSocket 已关闭');
        resolve();
      });
    });
    
    logger.info('正在断开 Redis 连接...');
    await disconnectRedis();
    logger.info('Redis 连接已断开');
    
    logger.info('正在关闭数据库连接池...');
    if (getPool()) {
      await getPool().end();
      logger.info('数据库连接池已关闭');
    }
    
    logger.info('✅ 所有资源已释放，进程即将退出');
    process.exit(0);
    
  } catch (err) {
    logger.error(`❌ 优雅关闭时发生异常: ${err.message}`);
    logger.error(`错误堆栈: ${err.stack}`);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.error(`未捕获的异常: ${error.message}`);
});
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`未处理的Promise拒绝: ${reason.message}`);
});

/**
 * 检查内存使用情况
 * @async
 * @returns {Promise<Object>} 内存使用信息对象
 * @property {string} rss - 常驻内存集大小（MB）
 * @property {string} heapUsed - 堆内存使用量（MB）
 * @description 监控进程内存使用情况，当 RSS 超过 3GB 时发出警告
 */
async function checkMemoryUsage() {
  const memoryUsage = process.memoryUsage();
  const memoryInfo = {
    rss: (memoryUsage.rss / 1024 / 1024).toFixed(2) + 'MB',
    heapUsed: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2) + 'MB',
  };
  logger.info(`内存使用情况:${JSON.stringify(memoryInfo)}`);
  if (memoryUsage.rss > 3 * 1024 * 1024 * 1024) {
    logger.warn(`内存使用过高！当前RSS: ${memoryInfo.rss}`);
  }
  return memoryInfo;
}

const memoryCheckTimer = setInterval(async () => {
  try {
    await safeTimeout(checkMemoryUsage(), 10000);
  } catch (error) {
    logger.error(`内存监控任务出错: ${error.message}`);
  }
}, 60000);

timers.push(memoryCheckTimer);
logger.info('内存监控定时器已启动');
