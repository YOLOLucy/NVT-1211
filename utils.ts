import { StockDataPoint, MonthlyGrowth } from './types';
import { RAW_CSV_DATA } from './constants';

export const parseCSV = (csvContent: string = RAW_CSV_DATA): StockDataPoint[] => {
  const lines = csvContent.trim().split('\n');
  // Skip header
  const dataLines = lines.slice(1);
  
  const parsedData = dataLines.map((line): StockDataPoint | null => {
    // Regex to handle quoted numbers with commas
    const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    
    if (!matches || matches.length < 2) return null;

    const dateStr = matches[0];
    const valueStr = matches[1].replace(/"/g, '').replace(/,/g, '');
    
    // Parse Date "2024/12/31"
    const [year, month, day] = dateStr.split('/').map(Number);
    const dateObj = new Date(year, month - 1, day);

    // Parse Index if available (3rd column)
    let indexVal: number | undefined = undefined;
    if (matches.length >= 3) {
        const indexStr = matches[2].replace(/"/g, '').replace(/,/g, '');
        const parsed = parseFloat(indexStr);
        if (!isNaN(parsed)) {
            indexVal = parsed;
        }
    }

    return {
      date: dateStr,
      dateObj: dateObj,
      value: parseInt(valueStr, 10),
      index: indexVal
    };
  }).filter((item): item is StockDataPoint => item !== null);

  return parsedData.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
};

export const calculateMonthlyGrowth = (data: StockDataPoint[]): MonthlyGrowth[] => {
  const grouped: Record<string, StockDataPoint[]> = {};

  data.forEach(point => {
    const key = `${point.dateObj.getFullYear()}-${String(point.dateObj.getMonth() + 1).padStart(2, '0')}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(point);
  });

  // Get sorted keys to ensure chronological order
  const monthKeys = Object.keys(grouped).sort();

  const monthlyGrowth: MonthlyGrowth[] = monthKeys.map((monthKey, index) => {
    const points = grouped[monthKey];
    // Sort points by date within the month to be safe
    points.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
    
    const currentEndValue = points[points.length - 1].value;
    let previousEndValue: number;

    if (index === 0) {
      // First month: compare last value vs first value of this month
      previousEndValue = points[0].value;
    } else {
      // Subsequent months: compare last value of this month vs last value of previous month
      const prevMonthKey = monthKeys[index - 1];
      const prevPoints = grouped[prevMonthKey];
      // Ensure previous month points are sorted
      prevPoints.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
      previousEndValue = prevPoints[prevPoints.length - 1].value;
    }

    const growth = currentEndValue - previousEndValue;
    const growthPercent = previousEndValue !== 0 ? (growth / previousEndValue) * 100 : 0;

    return {
      month: monthKey,
      startValue: previousEndValue,
      endValue: currentEndValue,
      growth,
      growthPercent
    };
  });

  return monthlyGrowth;
};

export const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(val);
};

export const formatCompactCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: "compact",
    maximumFractionDigits: 1
  }).format(val);
};