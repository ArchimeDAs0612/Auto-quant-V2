const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.dbPath = path.join(__dirname, '../data/trading.db');
    this.db = null;
    this.pgPool = null;

    if (this.isProduction) {
      this.initPostgres();
    }
  }

  async initPostgres() {
    const { Pool } = require('pg');
    this.pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    try {
      await this.pgPool.query('SELECT 1');
      console.log('✅ PostgreSQL 数据库连接成功');
      await this.createPostgresTables();
    } catch (err) {
      console.error('❌ PostgreSQL 连接失败:', err);
      throw err;
    }
  }

  async createPostgresTables() {
    const queries = [
      `CREATE TABLE IF NOT EXISTS positions (
        id TEXT PRIMARY KEY,
        side TEXT NOT NULL,
        entry_price REAL NOT NULL,
        stop_loss REAL NOT NULL,
        take_profit REAL NOT NULL,
        size REAL NOT NULL,
        leverage INTEGER NOT NULL,
        margin REAL NOT NULL,
        reason TEXT,
        status TEXT DEFAULT 'open',
        opened_at TEXT NOT NULL,
        closed_at TEXT,
        exit_price REAL,
        exit_reason TEXT,
        pnl REAL,
        pnl_percent REAL,
        unrealized_pnl REAL,
        unrealized_pnl_percent REAL,
        current_price REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS trades (
        id TEXT PRIMARY KEY,
        position_id TEXT NOT NULL,
        side TEXT NOT NULL,
        entry_price REAL NOT NULL,
        exit_price REAL NOT NULL,
        stop_loss REAL NOT NULL,
        take_profit REAL NOT NULL,
        size REAL NOT NULL,
        leverage INTEGER NOT NULL,
        margin REAL NOT NULL,
        pnl REAL NOT NULL,
        pnl_percent REAL NOT NULL,
        reason TEXT,
        exit_reason TEXT,
        opened_at TEXT NOT NULL,
        closed_at TEXT NOT NULL,
        duration INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS account_state (
        id SERIAL PRIMARY KEY,
        balance REAL NOT NULL,
        peak_balance REAL NOT NULL,
        total_trades INTEGER DEFAULT 0,
        winning_trades INTEGER DEFAULT 0,
        total_pnl REAL DEFAULT 0,
        max_drawdown REAL DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS market_data (
        id SERIAL PRIMARY KEY,
        timeframe TEXT NOT NULL,
        timestamp BIGINT NOT NULL,
        open REAL NOT NULL,
        high REAL NOT NULL,
        low REAL NOT NULL,
        close REAL NOT NULL,
        volume REAL NOT NULL,
        UNIQUE(timeframe, timestamp)
      )`,
      `CREATE TABLE IF NOT EXISTS signals (
        id SERIAL PRIMARY KEY,
        action TEXT NOT NULL,
        entry_price REAL NOT NULL,
        stop_loss REAL NOT NULL,
        take_profit REAL NOT NULL,
        rr REAL NOT NULL,
        confidence INTEGER NOT NULL,
        reason TEXT,
        timeframe TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS equity_history (
        id SERIAL PRIMARY KEY,
        equity REAL NOT NULL,
        balance REAL NOT NULL,
        position_count INTEGER DEFAULT 0,
        unrealized_pnl REAL DEFAULT 0,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS state_data (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const query of queries) {
      try {
        await this.pgPool.query(query);
      } catch (err) {
        if (!err.message.includes('already exists')) {
          console.error('创建表失败:', err.message);
        }
      }
    }
  }

  async init() {
    if (this.isProduction) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('数据库连接失败:', err);
          reject(err);
        } else {
          console.log('✅ 数据库连接成功');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS positions (
        id TEXT PRIMARY KEY,
        side TEXT NOT NULL,
        entry_price REAL NOT NULL,
        stop_loss REAL NOT NULL,
        take_profit REAL NOT NULL,
        size REAL NOT NULL,
        leverage INTEGER NOT NULL,
        margin REAL NOT NULL,
        reason TEXT,
        status TEXT DEFAULT 'open',
        opened_at TEXT NOT NULL,
        closed_at TEXT,
        exit_price REAL,
        exit_reason TEXT,
        pnl REAL,
        pnl_percent REAL,
        unrealized_pnl REAL,
        unrealized_pnl_percent REAL,
        current_price REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS trades (
        id TEXT PRIMARY KEY,
        position_id TEXT NOT NULL,
        side TEXT NOT NULL,
        entry_price REAL NOT NULL,
        exit_price REAL NOT NULL,
        stop_loss REAL NOT NULL,
        take_profit REAL NOT NULL,
        size REAL NOT NULL,
        leverage INTEGER NOT NULL,
        margin REAL NOT NULL,
        pnl REAL NOT NULL,
        pnl_percent REAL NOT NULL,
        reason TEXT,
        exit_reason TEXT,
        opened_at TEXT NOT NULL,
        closed_at TEXT NOT NULL,
        duration INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS account_state (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        balance REAL NOT NULL,
        peak_balance REAL NOT NULL,
        total_trades INTEGER DEFAULT 0,
        winning_trades INTEGER DEFAULT 0,
        total_pnl REAL DEFAULT 0,
        max_drawdown REAL DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS market_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timeframe TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        open REAL NOT NULL,
        high REAL NOT NULL,
        low REAL NOT NULL,
        close REAL NOT NULL,
        volume REAL NOT NULL,
        UNIQUE(timeframe, timestamp)
      )`,
      `CREATE TABLE IF NOT EXISTS signals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        entry_price REAL NOT NULL,
        stop_loss REAL NOT NULL,
        take_profit REAL NOT NULL,
        rr REAL NOT NULL,
        confidence INTEGER NOT NULL,
        reason TEXT,
        timeframe TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS equity_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equity REAL NOT NULL,
        balance REAL NOT NULL,
        position_count INTEGER DEFAULT 0,
        unrealized_pnl REAL DEFAULT 0,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS state_data (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const sql of tables) {
      await new Promise((resolve, reject) => {
        this.db.run(sql, (err) => {
          if (err) {
            console.error('创建表失败:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
  }

  async saveState(key, value) {
    const jsonValue = JSON.stringify(value);

    if (this.isProduction && this.pgPool) {
      await this.pgPool.query(
        `INSERT INTO state_data (key, value, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
        [key, jsonValue]
      );
    } else if (this.db) {
      await new Promise((resolve, reject) => {
        this.db.run(
          `INSERT OR REPLACE INTO state_data (key, value, updated_at)
           VALUES (?, ?, datetime('now'))`,
          [key, jsonValue],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }
  }

  async loadState(key) {
    if (this.isProduction && this.pgPool) {
      const result = await this.pgPool.query(
        'SELECT value FROM state_data WHERE key = $1',
        [key]
      );
      return result.rows[0] ? JSON.parse(result.rows[0].value) : null;
    } else if (this.db) {
      return new Promise((resolve, reject) => {
        this.db.get(
          'SELECT value FROM state_data WHERE key = ?',
          [key],
          (err, row) => {
            if (err) reject(err);
            else resolve(row ? JSON.parse(row.value) : null);
          }
        );
      });
    }
    return null;
  }

  async saveEquityHistory(equity, balance, positionCount, unrealizedPnl) {
    if (this.isProduction && this.pgPool) {
      await this.pgPool.query(
        `INSERT INTO equity_history (equity, balance, position_count, unrealized_pnl, recorded_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [equity, balance, positionCount, unrealizedPnl]
      );
    } else if (this.db) {
      await new Promise((resolve, reject) => {
        this.db.run(
          `INSERT INTO equity_history (equity, balance, position_count, unrealized_pnl, recorded_at)
           VALUES (?, ?, ?, ?, datetime('now'))`,
          [equity, balance, positionCount, unrealizedPnl],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }
  }

  async loadEquityHistory(limit = 1000) {
    if (this.isProduction && this.pgPool) {
      const result = await this.pgPool.query(
        `SELECT equity, balance, position_count, unrealized_pnl, recorded_at
         FROM equity_history ORDER BY id DESC LIMIT $1`,
        [limit]
      );
      return result.rows.reverse();
    } else if (this.db) {
      return new Promise((resolve, reject) => {
        this.db.all(
          `SELECT equity, balance, position_count, unrealized_pnl, recorded_at
           FROM equity_history ORDER BY id DESC LIMIT ?`,
          [limit],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows.reverse());
          }
        );
      });
    }
    return [];
  }

  async savePosition(position) {
    const sql = `INSERT OR REPLACE INTO positions
      (id, side, entry_price, stop_loss, take_profit, size, leverage, margin, reason, status,
       opened_at, closed_at, exit_price, exit_reason, pnl, pnl_percent, unrealized_pnl,
       unrealized_pnl_percent, current_price, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`;

    if (this.isProduction && this.pgPool) {
      await this.pgPool.query(
        `INSERT INTO positions
         (id, side, entry_price, stop_loss, take_profit, size, leverage, margin, reason, status,
          opened_at, closed_at, exit_price, exit_reason, pnl, pnl_percent, unrealized_pnl,
          unrealized_pnl_percent, current_price, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE SET
          side = $2, entry_price = $3, stop_loss = $4, take_profit = $5, size = $6, leverage = $7,
          margin = $8, reason = $9, status = $10, closed_at = $12, exit_price = $13,
          exit_reason = $14, pnl = $15, pnl_percent = $16, unrealized_pnl = $17,
          unrealized_pnl_percent = $18, current_price = $19`,
        [position.id, position.side, position.entryPrice, position.stopLoss, position.takeProfit,
         position.size, position.leverage, position.margin, position.reason, position.status,
         position.openedAt, position.closedAt, position.exitPrice, position.exitReason,
         position.pnl, position.pnlPercent, position.unrealizedPnl,
         position.unrealizedPnlPercent, position.currentPrice]
      );
    } else if (this.db) {
      await new Promise((resolve, reject) => {
        this.db.run(sql, [
          position.id, position.side, position.entryPrice, position.stopLoss, position.takeProfit,
          position.size, position.leverage, position.margin, position.reason, position.status,
          position.openedAt, position.closedAt, position.exitPrice, position.exitReason,
          position.pnl, position.pnlPercent, position.unrealizedPnl,
          position.unrealizedPnlPercent, position.currentPrice
        ], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }

  async loadPositions(status = 'open') {
    if (this.isProduction && this.pgPool) {
      const result = await this.pgPool.query(
        'SELECT * FROM positions WHERE status = $1 ORDER BY created_at DESC',
        [status]
      );
      return result.rows.map(this.mapPositionFromPostgres);
    } else if (this.db) {
      return new Promise((resolve, reject) => {
        this.db.all(
          'SELECT * FROM positions WHERE status = ? ORDER BY created_at DESC',
          [status],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows.map(this.mapPositionFromSQLite));
          }
        );
      });
    }
    return [];
  }

  mapPositionFromSQLite(row) {
    return {
      id: row.id,
      side: row.side,
      entryPrice: row.entry_price,
      stopLoss: row.stop_loss,
      takeProfit: row.take_profit,
      size: row.size,
      leverage: row.leverage,
      margin: row.margin,
      reason: row.reason,
      status: row.status,
      openedAt: row.opened_at,
      closedAt: row.closed_at,
      exitPrice: row.exit_price,
      exitReason: row.exit_reason,
      pnl: row.pnl,
      pnlPercent: row.pnl_percent,
      unrealizedPnl: row.unrealized_pnl,
      unrealizedPnlPercent: row.unrealized_pnl_percent,
      currentPrice: row.current_price
    };
  }

  mapPositionFromPostgres(row) {
    return {
      id: row.id,
      side: row.side,
      entryPrice: row.entry_price,
      stopLoss: row.stop_loss,
      takeProfit: row.take_profit,
      size: row.size,
      leverage: row.leverage,
      margin: row.margin,
      reason: row.reason,
      status: row.status,
      openedAt: row.opened_at,
      closedAt: row.closed_at,
      exitPrice: row.exit_price,
      exitReason: row.exit_reason,
      pnl: row.pnl,
      pnlPercent: row.pnl_percent,
      unrealizedPnl: row.unrealized_pnl,
      unrealizedPnlPercent: row.unrealized_pnl_percent,
      currentPrice: row.current_price
    };
  }

  async saveTrade(trade) {
    if (this.isProduction && this.pgPool) {
      await this.pgPool.query(
        `INSERT INTO trades
         (id, position_id, side, entry_price, exit_price, stop_loss, take_profit, size,
          leverage, margin, pnl, pnl_percent, reason, exit_reason, opened_at, closed_at, duration, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE SET
          exit_price = $4, exit_reason = $14, closed_at = $16, pnl = $11, pnl_percent = $12, duration = $17`,
        [trade.id, trade.positionId, trade.side, trade.entryPrice, trade.exitPrice,
         trade.stopLoss, trade.takeProfit, trade.size, trade.leverage, trade.margin,
         trade.pnl, trade.pnlPercent, trade.reason, trade.exitReason,
         trade.openedAt, trade.closedAt, trade.duration]
      );
    } else if (this.db) {
      await new Promise((resolve, reject) => {
        this.db.run(
          `INSERT OR REPLACE INTO trades
           (id, position_id, side, entry_price, exit_price, stop_loss, take_profit, size,
            leverage, margin, pnl, pnl_percent, reason, exit_reason, opened_at, closed_at, duration, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [trade.id, trade.positionId, trade.side, trade.entryPrice, trade.exitPrice,
           trade.stopLoss, trade.takeProfit, trade.size, trade.leverage, trade.margin,
           trade.pnl, trade.pnlPercent, trade.reason, trade.exitReason,
           trade.openedAt, trade.closedAt, trade.duration],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }
  }

  async loadTrades(limit = 100) {
    if (this.isProduction && this.pgPool) {
      const result = await this.pgPool.query(
        'SELECT * FROM trades ORDER BY created_at DESC LIMIT $1',
        [limit]
      );
      return result.rows.map(row => ({
        id: row.id,
        positionId: row.position_id,
        side: row.side,
        entryPrice: row.entry_price,
        exitPrice: row.exit_price,
        stopLoss: row.stop_loss,
        takeProfit: row.take_profit,
        size: row.size,
        leverage: row.leverage,
        margin: row.margin,
        pnl: row.pnl,
        pnlPercent: row.pnl_percent,
        reason: row.reason,
        exitReason: row.exit_reason,
        openedAt: row.opened_at,
        closedAt: row.closed_at,
        duration: row.duration
      }));
    } else if (this.db) {
      return new Promise((resolve, reject) => {
        this.db.all(
          'SELECT * FROM trades ORDER BY created_at DESC LIMIT ?',
          [limit],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });
    }
    return [];
  }

  async saveAccountState(state) {
    if (this.isProduction && this.pgPool) {
      await this.pgPool.query(
        `INSERT INTO account_state (balance, peak_balance, total_trades, winning_trades, total_pnl, max_drawdown, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
        [state.balance, state.peakBalance, state.totalTrades, state.winningTrades, state.totalPnl, state.maxDrawdown]
      );
    } else if (this.db) {
      await new Promise((resolve, reject) => {
        this.db.run(
          `INSERT INTO account_state (balance, peak_balance, total_trades, winning_trades, total_pnl, max_drawdown, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
          [state.balance, state.peakBalance, state.totalTrades, state.winningTrades, state.totalPnl, state.maxDrawdown],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }
  }

  async loadLatestAccountState() {
    if (this.isProduction && this.pgPool) {
      const result = await this.pgPool.query(
        'SELECT * FROM account_state ORDER BY id DESC LIMIT 1'
      );
      return result.rows[0] || null;
    } else if (this.db) {
      return new Promise((resolve, reject) => {
        this.db.get(
          'SELECT * FROM account_state ORDER BY id DESC LIMIT 1',
          (err, row) => {
            if (err) reject(err);
            else resolve(row || null);
          }
        );
      });
    }
    return null;
  }

  async close() {
    if (this.pgPool) {
      await this.pgPool.end();
    }
    if (this.db) {
      return new Promise((resolve) => {
        this.db.close(() => resolve());
      });
    }
  }
}

module.exports = Database;