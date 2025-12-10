import { GoogleGenAI } from "@google/genai";
import { StockDataPoint, MonthlyGrowth } from "../types";
import { formatCurrency } from "../utils";

export class GeminiService {
  private ai: GoogleGenAI;
  private modelId = 'gemini-3-pro-preview';

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async createChatSession(stockData: StockDataPoint[], monthlyData: MonthlyGrowth[]) {
    // Prepare a summarized context string
    const latestValue = stockData[stockData.length - 1].value;
    const startValue = stockData[0].value;
    const totalGrowth = latestValue - startValue;
    const totalGrowthPercent = ((totalGrowth / startValue) * 100).toFixed(2);
    
    let indexContext = '';
    const firstPoint = stockData[0];
    const lastPoint = stockData[stockData.length - 1];

    if (firstPoint.index !== undefined && lastPoint.index !== undefined) {
        const indexGrowth = lastPoint.index - firstPoint.index;
        const indexGrowthPercent = ((indexGrowth / firstPoint.index) * 100).toFixed(2);
        indexContext = `
        Market Index Analysis:
        - Start Index: ${firstPoint.index}
        - Current Index: ${lastPoint.index}
        - Index Growth: ${indexGrowthPercent}%
        
        Compare the user's portfolio growth (${totalGrowthPercent}%) against the market index growth (${indexGrowthPercent}%).
        `;
    }

    const monthlySummary = monthlyData.map(m => 
      `${m.month}: ${m.growthPercent.toFixed(2)}% growth (${formatCurrency(m.growth)})`
    ).join('\n');

    const systemInstruction = `
      You are an expert financial analyst assistant. You are analyzing a user's stock investment portfolio.
      
      Here is the summary of the data:
      - Current Portfolio Value: ${formatCurrency(latestValue)}
      - Starting Value: ${formatCurrency(startValue)}
      - Total Gain/Loss: ${formatCurrency(totalGrowth)} (${totalGrowthPercent}%)
      - Date Range: ${stockData[0].date} to ${stockData[stockData.length - 1].date}

      ${indexContext}

      Monthly Performance:
      ${monthlySummary}

      Rules:
      1. Be concise, professional, and helpful.
      2. Use the provided data to answer questions accurately.
      3. Format currency properly (e.g., $35,000,000).
      4. If the user asks for future predictions, give a standard disclaimer that past performance is not indicative of future results, but you can analyze trends.
      5. Keep responses short and easy to read.
    `;

    return this.ai.chats.create({
      model: this.modelId,
      config: {
        systemInstruction,
      },
    });
  }
}

export const geminiService = new GeminiService();