import React, { useState, useRef, useEffect } from "react";
import { chatWithAI } from "../services/api";
import { ChatMessage } from "../types";
import Markdown from "react-markdown";
import { Send, Compass, Sparkles, AlertCircle, Bot, User, Clock } from "lucide-react";
import { motion } from "motion/react";

const SUGGESTIONS = [
  "What should I do in Paris for 3 days?",
  "Suggest authentic hidden gems in Japan.",
  "Is Goa good to visit during the monsoon?",
  "What is the best way to travel around Italy on a budget?",
];

const AIChatPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hello! I am your Voyages AI Companion. Ask me anything about destinations, hidden gems, budgets, transit, or packing advice. Where are we exploring next?",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    setError("");
    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      role: "user",
      text: textToSend,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const reply = await chatWithAI(textToSend, messages);
      const assistantMessage: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        role: "assistant",
        text: reply,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to get reply from AI companion.");
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 h-[calc(100vh-140px)] flex flex-col justify-between">
      {/* Page Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
            AI Travel Companion <Sparkles className="w-5 h-5 text-indigo-500" />
          </h1>
          <p className="text-xs text-slate-400 font-light font-sans mt-0.5">
            Ask travel-related questions and get conversational, tailored advice instantly.
          </p>
        </div>
      </div>

      {/* Chat Messages Frame */}
      <div className="flex-1 overflow-y-auto py-6 pr-1 space-y-6 scrollbar-thin">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar Icon */}
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  isUser
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                    : "bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-indigo-500" />}
              </div>

              {/* Message Bubble */}
              <div className="space-y-1.5 max-w-[80%]">
                <div
                  className={`px-4.5 py-3 rounded-2xl text-xs md:text-sm leading-relaxed border shadow-sm ${
                    isUser
                      ? "bg-indigo-500 border-indigo-500 text-white"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-line">{msg.text}</p>
                  ) : (
                    <div className="markdown-body prose dark:prose-invert max-w-none space-y-2 text-xs md:text-sm">
                      <Markdown>{msg.text}</Markdown>
                    </div>
                  )}
                </div>
                {/* Timestamp line */}
                <div
                  className={`flex items-center gap-1 text-[9px] text-slate-400 ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  <Clock className="w-2.5 h-2.5" />
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing Loader Indicator */}
        {loading && (
          <div className="flex items-start gap-3.5 flex-row">
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400">
              <Bot className="w-4 h-4 text-indigo-400 animate-pulse" />
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-2xl flex items-center gap-1.5">
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" />
            </div>
          </div>
        )}

        {/* Error alerting */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {/* Element to auto scroll to */}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Suggestions and Form */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shrink-0 space-y-4">
        {/* Suggestion cards (only visible when chat is fresh/clean) */}
        {messages.length === 1 && (
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Prompt Ideas</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTIONS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(item)}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-left text-xs text-slate-600 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-900 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/15 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="line-clamp-1">{item}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat input form */}
        <form onSubmit={handleFormSubmit} className="flex items-center gap-2 pb-2">
          <input
            type="text"
            required
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your travel inquiry here... (e.g. recommend sights in Rome)"
            className="flex-1 px-4 py-3 text-xs md:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="p-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center shrink-0"
          >
            <Send className="w-4.5 h-4.5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIChatPage;
