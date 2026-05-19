const RiskManager = require('../server/services/riskManager');

describe('RiskManager 风险管理器', () => {
  let riskManager;

  beforeEach(() => {
    riskManager = new RiskManager(1000);
  });

  describe('仓位控制 Position Control', () => {
    test('初始账户余额为1000', () => {
      expect(riskManager.balance).toBe(1000);
      expect(riskManager.initialBalance).toBe(1000);
    });

    test('最大仓位为账户100%', () => {
      expect(riskManager.config.maxPositionPercent).toBe(1.0);
    });

    test('最大杠杆为10x', () => {
      expect(riskManager.config.maxLeverage).toBe(10);
    });

    test('单笔风险为账户5%', () => {
      expect(riskManager.config.riskPercent).toBe(0.05);
    });

    test('止损范围1%-5%', () => {
      expect(riskManager.config.stopLossMinPercent).toBe(0.01);
      expect(riskManager.config.stopLossMaxPercent).toBe(0.05);
    });
  });

  describe('盈亏比 Risk/Reward Ratio', () => {
    test('止盈止损比至少3.1:1', () => {
      expect(riskManager.config.takeProfitMinRatio).toBe(3.1);
    });

    test('计算仓位时止盈止损比正确', () => {
      const signal = {
        direction: 'long',
        confidence: 80,
        entry: { riskReward: { stopLossPercent: 0.02 } }
      };

      const result = riskManager.calculatePositionSize(signal, 80000, 500);

      const stopLossDiff = result.entryPrice - result.stopLoss;
      const takeProfitDiff = result.takeProfit - result.entryPrice;
      const actualRatio = takeProfitDiff / stopLossDiff;

      expect(actualRatio).toBeGreaterThanOrEqual(3.1);
    });

    test('做多时止盈大于止损', () => {
      const signal = {
        direction: 'long',
        confidence: 70,
        entry: { riskReward: { stopLossPercent: 0.03 } }
      };

      const result = riskManager.calculatePositionSize(signal, 80000, 500);

      expect(result.takeProfit).toBeGreaterThan(result.entryPrice);
      expect(result.stopLoss).toBeLessThan(result.entryPrice);
    });

    test('做空时止盈小于止损', () => {
      const signal = {
        direction: 'short',
        confidence: 70,
        entry: { riskReward: { stopLossPercent: 0.03 } }
      };

      const result = riskManager.calculatePositionSize(signal, 80000, 500);

      expect(result.takeProfit).toBeLessThan(result.entryPrice);
      expect(result.stopLoss).toBeGreaterThan(result.entryPrice);
    });
  });

  describe('仓位计算 Position Sizing', () => {
    test('风险金额为账户5% ($50)', () => {
      const signal = { direction: 'long', confidence: 80 };
      const result = riskManager.calculatePositionSize(signal, 80000, 500);

      expect(result.riskAmount).toBe(50);
    });

    test('止损3%时仓位计算有上限', () => {
      const signal = {
        direction: 'long',
        confidence: 80,
        entry: { riskReward: { stopLossPercent: 0.03 } }
      };

      const result = riskManager.calculatePositionSize(signal, 80000, 500);

      const expectedPositionValue = 50 / 0.03;
      expect(result.positionSize).toBeLessThanOrEqual(expectedPositionValue);
      expect(result.positionSize).toBeLessThanOrEqual(riskManager.balance * riskManager.config.maxPositionPercent);
    });

    test('杠杆根据ATR和止损动态调整', () => {
      const signal = {
        direction: 'long',
        confidence: 80,
        entry: { riskReward: { stopLossPercent: 0.02 } }
      };

      const result = riskManager.calculatePositionSize(signal, 80000, 400);

      expect(result.leverage).toBeGreaterThanOrEqual(1);
      expect(result.leverage).toBeLessThanOrEqual(10);
    });

    test('高置信度获得较高杠杆', () => {
      const lowConfidence = { direction: 'long', confidence: 50 };
      const highConfidence = { direction: 'long', confidence: 90 };

      const lowResult = riskManager.calculatePositionSize(lowConfidence, 80000, 500);
      const highResult = riskManager.calculatePositionSize(highConfidence, 80000, 500);

      expect(highResult.leverage).toBeGreaterThanOrEqual(lowResult.leverage);
    });
  });

  describe('止损止盈触发 Stop Loss / Take Profit Trigger', () => {
    test('做多触及止损应该触发', () => {
      const position = {
        direction: 'long',
        entryPrice: 80000,
        stopLoss: 78400,
        takeProfit: 82400,
        positionSize: 1666.67
      };

      riskManager.positions.push(position);
      const result = riskManager.checkPosition(78400);

      expect(result.length).toBe(1);
      expect(result[0].status).toBe('stop_loss');
    });

    test('做多触及止盈应该触发', () => {
      const position = {
        direction: 'long',
        entryPrice: 80000,
        stopLoss: 78400,
        takeProfit: 82400,
        positionSize: 1666.67
      };

      riskManager.positions.push(position);
      const result = riskManager.checkPosition(82400);

      expect(result.length).toBe(1);
      expect(result[0].status).toBe('take_profit');
    });

    test('做空触及止损应该触发', () => {
      const position = {
        direction: 'short',
        entryPrice: 80000,
        stopLoss: 81600,
        takeProfit: 77600,
        positionSize: 1666.67
      };

      riskManager.positions.push(position);
      const result = riskManager.checkPosition(81600);

      expect(result.length).toBe(1);
      expect(result[0].status).toBe('stop_loss');
    });

    test('价格未触及止盈止损不触发', () => {
      const position = {
        direction: 'long',
        entryPrice: 80000,
        stopLoss: 78400,
        takeProfit: 82400,
        positionSize: 1666.67
      };

      riskManager.positions.push(position);
      const result = riskManager.checkPosition(80000);

      expect(result.length).toBe(0);
    });
  });

  describe('连错3次当日停止 Consecutive Losses', () => {
    test('连续亏损计数正确', () => {
      expect(riskManager.stats.consecutiveLosses).toBe(0);
    });

    test('亏损后连续计数增加', () => {
      const position = {
        direction: 'long',
        entryPrice: 80000,
        stopLoss: 78400,
        takeProfit: 82400,
        positionSize: 1666.67,
        pnl: -50,
        status: 'stop_loss'
      };

      riskManager.closePosition(position);
      expect(riskManager.stats.consecutiveLosses).toBe(1);
      expect(riskManager.stats.lastLossDate).toBe(new Date().toDateString());
    });

    test('盈利后连续计数重置', () => {
      const lossPosition = {
        direction: 'long',
        entryPrice: 80000,
        stopLoss: 78400,
        takeProfit: 82400,
        positionSize: 1666.67,
        pnl: -50,
        status: 'stop_loss'
      };
      riskManager.closePosition(lossPosition);

      const winPosition = {
        direction: 'long',
        entryPrice: 80000,
        stopLoss: 78400,
        takeProfit: 82400,
        positionSize: 1666.67,
        pnl: 100,
        status: 'take_profit'
      };
      riskManager.closePosition(winPosition);

      expect(riskManager.stats.consecutiveLosses).toBe(0);
    });

    test('连错3次禁止开仓', () => {
      for (let i = 0; i < 3; i++) {
        const position = {
          direction: 'long',
          entryPrice: 80000,
          stopLoss: 78400,
          takeProfit: 82400,
          positionSize: 1666.67,
          pnl: -50,
          status: 'stop_loss'
        };
        riskManager.closePosition(position);
      }

      const canOpen = riskManager.canOpenPosition();
      expect(canOpen.allowed).toBe(false);
      expect(canOpen.reason).toContain('连错3次');
    });

    test('新一天连续计数重置', () => {
      riskManager.stats.consecutiveLosses = 3;
      riskManager.stats.lastLossDate = '2020-01-01';

      const canOpen = riskManager.canOpenPosition();
      expect(canOpen.allowed).toBe(true);
      expect(riskManager.stats.consecutiveLosses).toBe(0);
    });
  });

  describe('账户动态平衡 Dynamic Balance', () => {
    test('开仓后账户余额不变', () => {
      const initialBalance = riskManager.balance;

      const signal = {
        direction: 'long',
        confidence: 80,
        entry: { riskReward: { stopLossPercent: 0.03 } }
      };

      const positionDetails = riskManager.calculatePositionSize(signal, 80000, 500);
      riskManager.openPosition(signal, positionDetails);

      expect(riskManager.balance).toBe(initialBalance);
    });

    test('止损亏损正确扣减余额', () => {
      const signal = {
        direction: 'long',
        confidence: 80,
        entry: { riskReward: { stopLossPercent: 0.03 } }
      };

      const positionDetails = riskManager.calculatePositionSize(signal, 80000, 500);
      riskManager.openPosition(signal, positionDetails);

      const closedPosition = {
        ...riskManager.positions[0],
        pnl: -50,
        status: 'stop_loss'
      };
      riskManager.closePosition(closedPosition);

      expect(riskManager.balance).toBe(950);
    });

    test('止盈盈利正确增加余额', () => {
      const signal = {
        direction: 'long',
        confidence: 80,
        entry: { riskReward: { stopLossPercent: 0.03 } }
      };

      const positionDetails = riskManager.calculatePositionSize(signal, 80000, 500);
      riskManager.openPosition(signal, positionDetails);

      const closedPosition = {
        ...riskManager.positions[0],
        pnl: 155,
        status: 'take_profit'
      };
      riskManager.closePosition(closedPosition);

      expect(riskManager.balance).toBe(1155);
    });

    test('风险金额随账户余额动态变化', () => {
      riskManager.balance = 1500;

      const signal = { direction: 'long', confidence: 80 };
      const result = riskManager.calculatePositionSize(signal, 80000, 500);

      expect(result.riskAmount).toBe(75);
    });
  });

  describe('持仓控制 Position Control', () => {
    test('有持仓时禁止开新仓', () => {
      const signal = { direction: 'long', confidence: 80 };
      const positionDetails = riskManager.calculatePositionSize(signal, 80000, 500);
      riskManager.openPosition(signal, positionDetails);

      const canOpen = riskManager.canOpenPosition();
      expect(canOpen.allowed).toBe(false);
      expect(canOpen.reason).toContain('已有持仓');
    });

    test('平仓后可以开新仓', () => {
      const signal = { direction: 'long', confidence: 80 };
      const positionDetails = riskManager.calculatePositionSize(signal, 80000, 500);
      riskManager.openPosition(signal, positionDetails);

      const closedPosition = {
        ...riskManager.positions[0],
        pnl: 50,
        status: 'take_profit'
      };
      riskManager.closePosition(closedPosition);

      const canOpen = riskManager.canOpenPosition();
      expect(canOpen.allowed).toBe(true);
    });

    test('最大回撤20%时禁止交易', () => {
      riskManager.stats.consecutiveLosses = 2;
      riskManager.stats.lastLossDate = new Date().toDateString();

      const closedPosition = {
        direction: 'long',
        entryPrice: 100000,
        stopLoss: 98000,
        takeProfit: 103000,
        positionSize: 10000,
        pnl: -250,
        status: 'stop_loss'
      };

      for (let i = 0; i < 3; i++) {
        riskManager.closePosition({ ...closedPosition, id: i });
      }

      const canOpen = riskManager.canOpenPosition();
      expect(canOpen.allowed).toBe(false);
    });
  });
});

describe('P&L 计算验证', () => {
  let riskManager;

  beforeEach(() => {
    riskManager = new RiskManager(1000);
  });

  test('止损5%亏损正确计算', () => {
    const position = {
      direction: 'long',
      entryPrice: 80000,
      stopLoss: 76000,
      takeProfit: 92400,
      positionSize: 1000,
      leverage: 10
    };

    const pnl = riskManager.calculatePnl(position, 76000);
    expect(pnl).toBe(-500);
  });

  test('止盈盈亏比正确 (3.1:1)', () => {
    const position = {
      direction: 'long',
      entryPrice: 80000,
      stopLoss: 76000,
      takeProfit: 92400,
      positionSize: 1000,
      leverage: 10
    };

    const loss = Math.abs(riskManager.calculatePnl(position, 76000));
    const profit = riskManager.calculatePnl(position, 92400);
    expect(profit / loss).toBeCloseTo(3.1, 1);
  });
});