import React, { useState, useEffect, useMemo } from 'react';
import { parseCSV, calculateMonthlyGrowth, formatCurrency } from './utils';
import { StockCharts } from './components/StockCharts';
import { StockDataPoint, MonthlyGrowth } from './types';
import { TrendingUp, DollarSign, Calendar, Upload } from 'lucide-react';
import { RAW_CSV_DATA } from './constants';

const App: React.FC = () => {
  const [csvContent, setCsvContent] = useState<string>(RAW_CSV_DATA);
  const [stockData, setStockData] = useState<StockDataPoint[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyGrowth[]>([]);

  // Initialize Data
  useEffect(() => {
    const data = parseCSV(csvContent);
    const monthly = calculateMonthlyGrowth(data);
    setStockData(data);
    setMonthlyData(monthly);
  }, [csvContent]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === 'string') {
          setCsvContent(text);
        }
      };
      reader.readAsText(file);
    }
  };

  // Calculate Key Metrics
  const metrics = useMemo(() => {
    if (stockData.length === 0) return null;
    const current = stockData[stockData.length - 1].value;
    const previous = stockData[0].value;
    const diff = current - previous;
    const percent = ((diff / previous) * 100).toFixed(2);
    const maxVal = Math.max(...stockData.map(d => d.value));
    
    return { current, diff, percent, maxVal };
  }, [stockData]);

  const currentMonthMetric = useMemo(() => {
     if (monthlyData.length === 0) return null;
     return monthlyData[monthlyData.length - 1];
  }, [monthlyData]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-zinc-950 text-zinc-200">
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Header */}
        <header className="px-8 py-6 flex justify-between items-center border-b border-zinc-800/50 bg-zinc-950/50 backdrop-blur-sm z-10">
            <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                    <TrendingUp className="text-rose-500" />
                    StockVision
                </h1>
                <p className="text-zinc-500 text-sm mt-1">Portfolio Performance Analytics</p>
            </div>
            
            <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all cursor-pointer">
                    <Upload size={18} />
                    <span className="hidden sm:inline">Upload CSV</span>
                    <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                </label>
            </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto space-y-8">
            
            {/* KPI Cards - Updated Grid Layout and Colors */}
            {metrics && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Net Value Card - Split into two equal columns */}
                    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 md:col-span-2 relative overflow-hidden grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-800">
                        
                        {/* Left Column: Net Value */}
                        <div className="p-6 relative z-10 flex flex-col justify-center">
                            <div className="flex items-center gap-3 text-zinc-400 mb-3">
                                <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500">
                                    <DollarSign size={20} />
                                </div>
                                <span className="text-sm font-medium">Net Value</span>
                            </div>
                            <div className="text-4xl lg:text-5xl font-bold text-white tracking-tight">
                                {formatCurrency(metrics.current)}
                            </div>
                        </div>

                        {/* Right Column: Current Month Growth */}
                        {currentMonthMetric && (
                             <div className="p-6 relative z-10 flex flex-col justify-center">
                                <div className="flex items-center gap-3 text-zinc-400 mb-3">
                                    <div className={`p-2 rounded-lg ${currentMonthMetric.growth >= 0 ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                        <TrendingUp size={20} />
                                    </div>
                                    <span className="text-sm font-medium">Current Month Growth</span>
                                </div>
                                <div className={`text-4xl lg:text-5xl font-bold tracking-tight flex flex-wrap items-baseline gap-x-3 gap-y-1 ${currentMonthMetric.growth >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                    <span>
                                        {currentMonthMetric.growth >= 0 ? '+' : ''}
                                        {formatCurrency(currentMonthMetric.growth)}
                                    </span>
                                    <span className="text-lg lg:text-xl font-medium text-zinc-500">
                                        ({currentMonthMetric.growthPercent.toFixed(2)}%)
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Decorative background element */}
                        <div className="absolute top-0 right-0 h-full w-full bg-gradient-to-l from-rose-500/5 via-transparent to-transparent pointer-events-none" />
                    </div>

                    {/* Total Return */}
                    <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
                         <div className="flex items-center gap-3 text-zinc-400 mb-2">
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                                <TrendingUp size={20} />
                            </div>
                            <span className="text-sm font-medium">Total Return</span>
                        </div>
                         {/* Swapped Colors: Rose for Positive, Emerald for Negative */}
                         <div className={`text-3xl font-semibold tracking-tight ${metrics.diff >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {metrics.diff >= 0 ? '+' : ''}{metrics.percent}%
                            <span className="text-sm text-zinc-500 ml-2 font-normal">
                                ({metrics.diff >= 0 ? '+' : ''}{formatCurrency(metrics.diff)})
                            </span>
                        </div>
                    </div>

                    {/* All Time High */}
                    <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
                        <div className="flex items-center gap-3 text-zinc-400 mb-2">
                             <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                                <Calendar size={20} />
                            </div>
                            <span className="text-sm font-medium">All Time High</span>
                        </div>
                        <div className="text-3xl font-semibold text-white tracking-tight">
                             {formatCurrency(metrics.maxVal)}
                        </div>
                    </div>
                </div>
            )}

            {/* Charts Section */}
            <div className="w-full">
                 <StockCharts data={stockData} monthlyData={monthlyData} />
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default App;