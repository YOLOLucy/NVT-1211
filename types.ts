export interface StockDataPoint {
  date: string;
  dateObj: Date;
  value: number;
  index?: number;
}

export interface MonthlyGrowth {
  month: string;
  startValue: number;
  endValue: number;
  growth: number;
  growthPercent: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}