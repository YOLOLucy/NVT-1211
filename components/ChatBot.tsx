import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, X } from 'lucide-react';
import { ChatMessage } from '../types';
import { geminiService } from '../services/geminiService';
import { Chat, GenerateContentResponse } from '@google/genai';

interface ChatBotProps {
  stockContext: any;
  monthlyContext: any;
  isOpen: boolean;
  onClose: () => void;
}

export const ChatBot: React.FC<ChatBotProps> = ({ stockContext, monthlyContext, isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: 'Hello! I analyzed your portfolio data. Ask me about trends, growth, or specific dates.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initChat = async () => {
      try {
        const chat = await geminiService.createChatSession(stockContext, monthlyContext);
        setChatSession(chat);
      } catch (error) {
        console.error("Failed to init chat", error);
      }
    };
    if (stockContext.length > 0) {
      initChat();
    }
  }, [stockContext, monthlyContext]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !chatSession) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await chatSession.sendMessageStream({ message: input });
      
      const botMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: botMsgId, role: 'model', text: '' }]);

      let fullText = '';
      for await (const chunk of result) {
        const c = chunk as GenerateContentResponse;
        if (c.text) {
            fullText += c.text;
            setMessages(prev => prev.map(msg => 
                msg.id === botMsgId ? { ...msg, text: fullText } : msg
            ));
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "I'm having trouble connecting right now." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed md:relative inset-0 md:inset-auto z-50 md:z-auto w-full md:w-[400px] h-full md:h-full bg-zinc-950 md:bg-zinc-900/30 md:border-l border-zinc-800 flex flex-col shadow-2xl">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-500/10 rounded-lg">
             <Sparkles size={18} className="text-indigo-400" />
          </div>
          <div>
            <h3 className="font-medium text-white">Gemini Analyst</h3>
            <p className="text-xs text-zinc-500">Powered by gemini-3-pro</p>
          </div>
        </div>
        <button onClick={onClose} className="md:hidden p-2 text-zinc-400 hover:text-white">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-zinc-800 text-zinc-200 rounded-bl-sm border border-zinc-700'
              }`}
            >
              {msg.text ? msg.text : <span className="animate-pulse">Analyzing...</span>}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-zinc-900 border-t border-zinc-800">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about your portfolio..."
            className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-full py-3 pl-4 pr-12 focus:outline-none focus:border-indigo-500 transition-colors placeholder-zinc-600"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};