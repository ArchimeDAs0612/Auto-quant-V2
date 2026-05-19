import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';
import styled from 'styled-components';

const ChartContainer = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
`;

const ChartHeader = styled.div`
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 10;
  display: flex;
  gap: 16px;
  background: rgba(13, 20, 33, 0.9);
  padding: 8px 16px;
  border-radius: 8px;
  backdrop-filter: blur(10px);
`;

const TimeframeButton = styled.button`
  background: ${props => props.active ? 'linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%)' : 'transparent'};
  color: ${props => props.active ? '#fff' : '#6b7280'};
  border: 1px solid ${props => props.active ? 'transparent' : '#2a3441'};
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: #00d4ff;
    color: #00d4ff;
  }
`;

const IndicatorPanel = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  background: rgba(13, 20, 33, 0.9);
  padding: 12px 16px;
  border-radius: 8px;
  backdrop-filter: blur(10px);
  min-width: 180px;
`;

const IndicatorTitle = styled.div`
  font-size: 11px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
`;

const IndicatorItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  font-size: 12px;
`;

const IndicatorLabel = styled.span`
  color: #9ca3af;
`;

const IndicatorValue = styled.span`
  color: ${props => {
    if (props.positive) return '#10b981';
    if (props.negative) return '#ef4444';
    return '#e0e0e0';
  }};
  font-weight: 600;
  font-family: 'SF Mono', monospace;
`;

function Chart({ marketData }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  const ema21Ref = useRef(null);
  const ema55Ref = useRef(null);
  const ema200Ref = useRef(null);
  const [timeframe, setTimeframe] = useState('15m');
  const [indicators, setIndicators] = useState({
    ema21: 0,
    ema55: 0,
    ema200: 0,
    adx: 0,
    atr: 0,
    trend: 'unknown'
  });

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0d1421' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: '#1a2332' },
        horzLines: { color: '#1a2332' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#00d4ff',
          labelBackgroundColor: '#00d4ff',
        },
        horzLine: {
          color: '#00d4ff',
          labelBackgroundColor: '#00d4ff',
        },
      },
      rightPriceScale: {
        borderColor: '#2a3441',
      },
      timeScale: {
        borderColor: '#2a3441',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    candlestickSeriesRef.current = candlestickSeries;

    const ema21 = chart.addLineSeries({
      color: '#00d4ff',
      lineWidth: 2,
      title: 'EMA21',
    });

    const ema55 = chart.addLineSeries({
      color: '#f59e0b',
      lineWidth: 2,
      title: 'EMA55',
    });

    const ema200 = chart.addLineSeries({
      color: '#7c3aed',
      lineWidth: 2,
      title: 'EMA200',
    });

    ema21Ref.current = ema21;
    ema55Ref.current = ema55;
    ema200Ref.current = ema200;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!marketData || !candlestickSeriesRef.current) return;

    const data = marketData.analysis;

    if (data && data.analysis) {
      const analysis = data.analysis;
      
      setIndicators({
        ema21: analysis.ema4H?.ema21?.toFixed(2) || 0,
        ema55: analysis.ema4H?.ema55?.toFixed(2) || 0,
        ema200: analysis.ema4H?.ema200?.toFixed(2) || 0,
        adx: analysis.adx?.toFixed(2) || 0,
        atr: analysis.atr?.toFixed(2) || 0,
        trend: data.trend || 'unknown'
      });
    }

    const tfData = marketData[timeframe];
    if (tfData && tfData.length > 0) {
      const candleData = tfData.map(c => ({
        time: c.timestamp / 1000,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));

      candlestickSeriesRef.current.setData(candleData);

      const ema21Data = calculateEMA(tfData, 21);
      const ema55Data = calculateEMA(tfData, 55);
      const ema200Data = calculateEMA(tfData, 200);

      ema21Ref.current.setData(ema21Data);
      ema55Ref.current.setData(ema55Data);
      ema200Ref.current.setData(ema200Data);

      chartRef.current.timeScale().fitContent();
    }
  }, [marketData, timeframe]);

  const calculateEMA = (data, period) => {
    const k = 2 / (period + 1);
    const ema = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        ema.push({
          time: data[i].timestamp / 1000,
          value: data[i].close
        });
      } else {
        const value = data[i].close * k + ema[i - 1].value * (1 - k);
        ema.push({
          time: data[i].timestamp / 1000,
          value: value
        });
      }
    }
    
    return ema;
  };

  return (
    <ChartContainer ref={chartContainerRef}>
      <ChartHeader>
        <TimeframeButton 
          active={timeframe === '4H'} 
          onClick={() => setTimeframe('4H')}
        >
          4H
        </TimeframeButton>
        <TimeframeButton 
          active={timeframe === '1H'} 
          onClick={() => setTimeframe('1H')}
        >
          1H
        </TimeframeButton>
        <TimeframeButton 
          active={timeframe === '15m'} 
          onClick={() => setTimeframe('15m')}
        >
          15m
        </TimeframeButton>
      </ChartHeader>

      <IndicatorPanel>
        <IndicatorTitle>技术指标</IndicatorTitle>
        <IndicatorItem>
          <IndicatorLabel>趋势</IndicatorLabel>
          <IndicatorValue 
            positive={indicators.trend === 'long'}
            negative={indicators.trend === 'short'}
          >
            {indicators.trend === 'long' ? '上涨' : 
             indicators.trend === 'short' ? '下跌' : '震荡'}
          </IndicatorValue>
        </IndicatorItem>
        <IndicatorItem>
          <IndicatorLabel>EMA21</IndicatorLabel>
          <IndicatorValue>{indicators.ema21}</IndicatorValue>
        </IndicatorItem>
        <IndicatorItem>
          <IndicatorLabel>EMA55</IndicatorLabel>
          <IndicatorValue>{indicators.ema55}</IndicatorValue>
        </IndicatorItem>
        <IndicatorItem>
          <IndicatorLabel>EMA200</IndicatorLabel>
          <IndicatorValue>{indicators.ema200}</IndicatorValue>
        </IndicatorItem>
        <IndicatorItem>
          <IndicatorLabel>ADX</IndicatorLabel>
          <IndicatorValue positive={indicators.adx > 25}>{indicators.adx}</IndicatorValue>
        </IndicatorItem>
        <IndicatorItem>
          <IndicatorLabel>ATR</IndicatorLabel>
          <IndicatorValue>{indicators.atr}</IndicatorValue>
        </IndicatorItem>
      </IndicatorPanel>
    </ChartContainer>
  );
}

export default Chart;
