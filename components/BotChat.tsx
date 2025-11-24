import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Bot as BotIcon, Volume2 } from 'lucide-react';
import { Bot, ChatMessage } from '../types';
import { getGeminiResponse } from '../services/geminiService';

interface BotChatProps {
  bot: Bot;
  onClose: () => void;
  volume: number; // Simulated proximity volume 0-1
}

export const BotChat: React.FC<BotChatProps> = ({ bot, onClose, volume }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial greeting
    setMessages([
      {
        sender: bot.name,
        text: `¡Hola! Soy ${bot.name}. ¿En qué puedo ayudarte?`,
        isUser: false,
        timestamp: new Date(),
      },
    ]);
  }, [bot]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = {
      sender: 'Yo',
      text: input,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const botResponseText = await getGeminiResponse(
      input,
      bot,
      messages.map((m) => `${m.sender}: ${m.text}`)
    );

    const botMsg: ChatMessage = {
      sender: bot.name,
      text: botResponseText,
      isUser: false,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, botMsg]);
    setLoading(false);
  };

  return (
    <div className="absolute top-20 right-5 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden z-50 animate-in fade-in slide-in-from-right-10 duration-300">
      {/* Header */}
      <div className="p-4 bg-indigo-600 flex justify-between items-center text-white">
        <div className="flex items-center gap-2">
          <BotIcon size={20} />
          <span className="font-bold">{bot.name}</span>
        </div>
        <div className="flex items-center gap-3">
            {/* Visual indicator of proximity audio */}
             <div className="flex items-center gap-1 opacity-80" title={`Volumen de proximidad: ${Math.round(volume * 100)}%`}>
                <Volume2 size={16} />
                <div className="w-12 h-1 bg-indigo-800 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-green-400 transition-all duration-300" 
                        style={{ width: `${volume * 100}%`}}
                    />
                </div>
            </div>
          <button onClick={onClose} className="hover:bg-indigo-700 p-1 rounded">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 h-64 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg text-sm ${
                msg.isUser
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-white dark:bg-slate-700 dark:text-gray-100 border border-slate-200 dark:border-slate-600 rounded-tl-none'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-200 dark:bg-slate-700 px-4 py-2 rounded-full text-xs text-slate-500 animate-pulse">
              Escribiendo...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Escribe un mensaje..."
          className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
        />
        <button
          onClick={handleSend}
          disabled={loading}
          className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};