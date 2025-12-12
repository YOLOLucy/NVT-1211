import React, { useMemo, useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Brush,
  LineChart,
  Line
} from 'recharts';
import { StockDataPoint, MonthlyGrowth } from '../types';
import { formatCompactCurrency, formatCurrency } from '../utils';
import { ArrowUp, ArrowDown, Minus, Calendar as CalendarIcon } from 'lucide-react';

interface ChartProps {
  data: StockDataPoint[];
  monthlyData: MonthlyGrowth[];
}

const formatDateForInput = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseInputDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900 border border-zinc-700 p-3 rounded shadow-lg text-sm z-50">
        <p className="text-zinc-400 mb-2 border-b border-zinc-800 pb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1">
             <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
             <span className="text-zinc-300 text-xs uppercase tracking-wider">{entry.name}:</span>
             <span className="font-mono font-medium text-white">
               {entry.name === 'Market Index' 
                 ? entry.value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})
                 : formatCurrency(entry.value)
               }
             </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as MonthlyGrowth;
    const isPositive = data.growth >= 0;
    return (
      <div className="bg-zinc-900 border border-zinc-700 p-3 rounded shadow-lg text-sm">
        <p className="text-zinc-400 mb-1">{label}</p>
        <p className={`font-semibold text-lg ${isPositive ? 'text-rose-400' : 'text-emerald-400'}`}>
          {formatCurrency(data.growth)} ({data.growthPercent.toFixed(2)}%)
        </p>
      </div>
    );
  }
  return null;
};

const GrowthIndicator: React.FC<{ value: number; isCurrency?: boolean; isPercentage?: boolean }> = ({ value, isCurrency = true, isPercentage = false }) => {
  if (value === 0) return <span className="text-zinc-500"><Minus size={14} /></span>;
  
  const isPositive = value > 0;
  // Using Rose for Positive (Up) and Emerald for Negative (Down) based on app convention
  const colorClass = isPositive ? 'text-rose-400' : 'text-emerald-400';
  const Icon = isPositive ? ArrowUp : ArrowDown;

  return (
    <div className={`flex items-center justify-end gap-1 ${colorClass}`}>
      <Icon size={14} strokeWidth={2.5} />
      <span className="font-mono">
        {isCurrency 
            ? formatCurrency(Math.abs(value)) 
            : Math.abs(value).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})
        }
        {isPercentage ? '%' : ''}
      </span>
    </div>
  );
};

// Dual Axis Sparkline Component
const DualSparkline = ({ data, hasIndex }: { data: any[], hasIndex: boolean }) => {
  const valMin = Math.min(...data.map(d => d.value));
  const valMax = Math.max(...data.map(d => d.value));
  
  let idxMin: number | undefined;
  let idxMax: number | undefined;
  
  if (hasIndex) {
    const indices = data.map(d => d.index).filter(i => i !== undefined) as number[];
    if (indices.length > 0) {
        idxMin = Math.min(...indices);
        idxMax = Math.max(...indices);
    }
  }

  return (
    <div className="w-24 h-10 inline-block align-middle">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis yAxisId="val" domain={[valMin, valMax]} hide />
          <Line 
            yAxisId="val" 
            type="monotone" 
            dataKey="value" 
            stroke="#f43f5e" 
            strokeWidth={1.5} 
            dot={false} 
            isAnimationActive={false} 
          />
          {hasIndex && idxMin !== undefined && idxMax !== undefined && (
             <>
                <YAxis yAxisId="idx" domain={[idxMin, idxMax]} hide />
                <Line 
                    yAxisId="idx" 
                    type="monotone" 
                    dataKey="index" 
                    stroke="#0ea5e9" 
                    strokeWidth={1.5} 
                    dot={false} 
                    isAnimationActive={false} 
                />
             </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

type TimeRange = '1D' | '7D' | '1M' | '3M' | 'YTD' | 'ALL';

export const StockCharts: React.FC<ChartProps> = ({ data, monthlyData }) => {
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [activeRange, setActiveRange] = useState<TimeRange | 'CUSTOM'>('ALL');
  
  const hasIndexData = data.some(d => d.index !== undefined);

  // Initialize dates when data loads
  useEffect(() => {
    if (data.length > 0) {
        // Only reset if range is ALL or invalid
        if (activeRange === 'ALL' || !dateRange.start) {
            const first = data[0].dateObj;
            const last = data[data.length - 1].dateObj;
            setDateRange({
                start: formatDateForInput(first),
                end: formatDateForInput(last)
            });
        }
    }
  }, [data, activeRange]);

  const handleRangeClick = (range: TimeRange) => {
    setActiveRange(range);
    if (data.length === 0) return;

    const lastPoint = data[data.length - 1];
    const endObj = lastPoint.dateObj;
    let startObj = new Date(endObj);

    switch (range) {
        case '1D':
             // For 1D, we usually want to see context, maybe last 2 days or just the previous close to now
             startObj.setDate(endObj.getDate() - 1);
             break;
        case '7D':
            startObj.setDate(endObj.getDate() - 7);
            break;
        case '1M':
            startObj.setMonth(endObj.getMonth() - 1);
            break;
        case '3M':
            startObj.setMonth(endObj.getMonth() - 3);
            break;
        case 'YTD':
            startObj = new Date(endObj.getFullYear(), 0, 1);
            break;
        case 'ALL':
            startObj = data[0].dateObj;
            break;
    }

    setDateRange({
        start: formatDateForInput(startObj),
        end: formatDateForInput(endObj)
    });
  };

  const handleManualDateChange = (type: 'start' | 'end', value: string) => {
      setActiveRange('CUSTOM');
      setDateRange(prev => ({
          ...prev,
          [type]: value
      }));
  };

  // Filter Logic for Main Chart
  const chartData = useMemo(() => {
    if (data.length === 0) return [];
    if (!dateRange.start || !dateRange.end) return data;

    const start = parseInputDate(dateRange.start);
    const end = parseInputDate(dateRange.end);
    
    // Set end date to end of day to be inclusive if needed, 
    // but input is YYYY-MM-DD so comparisons are usually >= start (00:00) and <= end (00:00)
    // Actually for <= end, if end is today 00:00, it might miss today's data depending on how parsed.
    // parseInputDate returns 00:00:00 local time.
    // StockDataPoint dateObj is also 00:00:00 local time.
    // So <= comparison works perfectly for inclusive.

    return data.filter(d => {
        // Reset times to 0 to ensure clean date comparison
        const dTime = new Date(d.dateObj);
        dTime.setHours(0,0,0,0);
        
        const startTime = new Date(start);
        startTime.setHours(0,0,0,0);
        
        const endTime = new Date(end);
        endTime.setHours(0,0,0,0);

        return dTime.getTime() >= startTime.getTime() && dTime.getTime() <= endTime.getTime();
    });
  }, [data, dateRange]);

  // Filter Monthly Data for the Bar Chart
  const barChartData = useMemo(() => {
    return monthlyData.filter((m, index) => {
        if (index === 0 && m.growth === 0) return false;
        return true;
    });
  }, [monthlyData]);

  // Current Month Table Data Logic
  const { tableData, monthLabel, totalValueChange, totalIndexChange } = useMemo(() => {
    if (data.length === 0) return { tableData: [], monthLabel: '', totalValueChange: 0, totalIndexChange: 0 };
    
    // Find the very last available date in the dataset
    const lastPoint = data[data.length - 1];
    const targetDate = lastPoint.dateObj;
    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();
    
    const monthLabel = targetDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    // Filter for current month
    const currentMonthItems = data.filter(d => d.dateObj.getMonth() === targetMonth && d.dateObj.getFullYear() === targetYear);
    
    // Map to include daily growth and sparkline history
    const augmentedData = currentMonthItems.map(item => {
        const indexInFull = data.findIndex(d => d.date === item.date);
        
        let valueChange = 0;
        let indexChange = 0;
        let trendHistory: StockDataPoint[] = [];

        if (indexInFull >= 0) {
            // Get previous day for diff
            if (indexInFull > 0) {
                const prevItem = data[indexInFull - 1];
                valueChange = item.value - prevItem.value;
                if (item.index !== undefined && prevItem.index !== undefined) {
                    indexChange = item.index - prevItem.index;
                }
            }
            
            // Get last 7 days for trend (inclusive of current day)
            const startIndex = Math.max(0, indexInFull - 6);
            trendHistory = data.slice(startIndex, indexInFull + 1);
        }

        return {
            ...item,
            valueChange,
            indexChange,
            trendHistory
        };
    });

    // Calculate totals
    const totalValueChange = augmentedData.reduce((acc, curr) => acc + curr.valueChange, 0);
    const totalIndexChange = augmentedData.reduce((acc, curr) => acc + curr.indexChange, 0);

    // Sort descending by date (newest first)
    return { 
        tableData: augmentedData.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime()), 
        monthLabel,
        totalValueChange,
        totalIndexChange
    };
  }, [data]);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Main Area Chart */}
      <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800 shadow-sm backdrop-blur-sm min-h-[400px]">
        
        <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-6 gap-6">
          <h2 className="text-xl font-light text-white flex items-center gap-2 whitespace-nowrap">
            <span className="w-1 h-6 bg-rose-500 rounded-full"></span>
            Portfolio vs Market Index
          </h2>

          <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto xl:justify-end">
             
             {/* Date Pickers */}
             <div className="flex items-center gap-2 bg-zinc-800/30 p-1 rounded-lg border border-zinc-800">
                <div className="relative flex items-center px-2">
                    <CalendarIcon size={14} className="text-zinc-500 absolute left-2 pointer-events-none" />
                    <input 
                        type="date" 
                        value={dateRange.start}
                        onChange={(e) => handleManualDateChange('start', e.target.value)}
                        className="bg-transparent border-none text-zinc-300 text-xs focus:ring-0 pl-6 [color-scheme:dark] w-[105px] font-mono cursor-pointer"
                    />
                </div>
                <span className="text-zinc-600">-</span>
                <div className="relative flex items-center px-2">
                     <CalendarIcon size={14} className="text-zinc-500 absolute left-2 pointer-events-none" />
                     <input 
                        type="date" 
                        value={dateRange.end}
                        onChange={(e) => handleManualDateChange('end', e.target.value)}
                        className="bg-transparent border-none text-zinc-300 text-xs focus:ring-0 pl-6 [color-scheme:dark] w-[105px] font-mono cursor-pointer"
                    />
                </div>
             </div>

             {/* Range Selector */}
             <div className="flex items-center bg-zinc-800/50 p-1 rounded-lg overflow-x-auto">
                {(['1D', '7D', '1M', '3M', 'YTD', 'ALL'] as const).map((range) => (
                    <button
                        key={range}
                        onClick={() => handleRangeClick(range)}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                            activeRange === range
                                ? 'bg-zinc-600 text-white shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'
                        }`}
                    >
                        {range}
                    </button>
                ))}
             </div>
          </div>
        </div>
        
        {hasIndexData && (
             <div className="flex justify-end mb-2 text-xs">
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        <span className="text-zinc-400">Portfolio</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                        <span className="text-zinc-400">Index</span>
                    </div>
                </div>
             </div>
        )}

        <div className="w-full h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorIndex" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
              <XAxis 
                dataKey="date" 
                tick={{ fill: '#71717a', fontSize: 12 }} 
                tickLine={false}
                axisLine={false}
                minTickGap={30}
              />
              <YAxis 
                yAxisId="left"
                tick={{ fill: '#71717a', fontSize: 12 }} 
                tickFormatter={(value) => formatCompactCurrency(value)}
                tickLine={false}
                axisLine={false}
                domain={['auto', 'auto']}
                width={60}
              />
              {hasIndexData && (
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: '#71717a', fontSize: 12 }}
                  tickFormatter={(val) => val.toLocaleString()}
                  tickLine={false}
                  axisLine={false}
                  domain={['auto', 'auto']}
                  width={60}
                />
              )}
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3f3f46', strokeWidth: 1 }} />
              
              <Area 
                yAxisId="left"
                name="Portfolio"
                type="monotone" 
                dataKey="value" 
                stroke="#f43f5e" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorValue)" 
                animationDuration={1500}
              />
              {hasIndexData && (
                <Area 
                  yAxisId="right"
                  name="Market Index"
                  type="monotone" 
                  dataKey="index" 
                  stroke="#0ea5e9" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorIndex)"
                  animationDuration={1500}
                />
              )}
              <Brush 
                dataKey="date"
                height={30}
                stroke="#52525b"
                fill="#09090b"
                tickFormatter={() => ''}
                travellerWidth={10}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Secondary Bar Chart - Monthly Growth */}
      <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800 shadow-sm backdrop-blur-sm h-[300px]">
        <h2 className="text-xl font-light text-white mb-6 flex items-center gap-2">
          <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
          Monthly Growth ($)
        </h2>
        <div className="w-full h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
              <XAxis 
                dataKey="month" 
                tick={{ fill: '#71717a', fontSize: 12 }} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fill: '#71717a', fontSize: 12 }} 
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => formatCompactCurrency(val)}
              />
              <Tooltip content={<CustomBarTooltip />} cursor={{fill: '#27272a'}} />
              <Bar dataKey="growth" radius={[4, 4, 0, 0]}>
                {barChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.growth >= 0 ? '#f43f5e' : '#10b981'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Current Month Details Table */}
      <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800 shadow-sm backdrop-blur-sm">
         <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <h2 className="text-xl font-light text-white flex items-center gap-2">
              <span className="w-1 h-6 bg-indigo-500 rounded-full"></span>
              Current Month Details <span className="text-zinc-500 font-normal ml-2">({monthLabel})</span>
            </h2>
            
            {/* Display Totals */}
            {tableData.length > 0 && (
                <div className="flex items-center gap-6 bg-zinc-900/50 px-4 py-2 rounded-lg border border-zinc-800/50 self-start md:self-auto">
                    <div className="flex items-center gap-3">
                        <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Total Change</span>
                        <GrowthIndicator value={totalValueChange} isCurrency={true} />
                    </div>
                    {hasIndexData && (
                        <div className="flex items-center gap-3 pl-6 border-l border-zinc-800">
                            <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Total Index</span>
                            <GrowthIndicator value={totalIndexChange} isCurrency={false} />
                        </div>
                    )}
                </div>
            )}
         </div>
         
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-wider">
                        <th className="py-3 pl-2 font-medium">Date</th>
                        <th className="py-3 px-4 font-medium text-right">Net Value</th>
                        <th className="py-3 px-4 font-medium text-right">Daily Change</th>
                        {hasIndexData && (
                            <>
                                <th className="py-3 px-4 font-medium text-right">Index</th>
                                <th className="py-3 px-4 font-medium text-right">Index Change</th>
                            </>
                        )}
                        <th className="py-3 pr-2 font-medium text-center">Trend (7d)</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    {tableData.map((day) => (
                        <tr key={day.date} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                            <td className="py-3 pl-2 text-zinc-300 font-mono">{day.date}</td>
                            <td className="py-3 px-4 text-right font-mono text-white tracking-wide">
                                {formatCurrency(day.value)}
                            </td>
                             <td className="py-3 px-4 text-right font-mono">
                                <GrowthIndicator value={day.valueChange} isCurrency={true} />
                            </td>
                            {hasIndexData && (
                                <>
                                    <td className="py-3 px-4 text-right font-mono text-sky-400">
                                        {day.index?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) ?? '-'}
                                    </td>
                                    <td className="py-3 px-4 text-right font-mono">
                                        <GrowthIndicator value={day.indexChange} isCurrency={false} />
                                    </td>
                                </>
                            )}
                            <td className="py-3 pr-2 text-center align-middle h-12">
                                <DualSparkline data={day.trendHistory} hasIndex={hasIndexData} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};