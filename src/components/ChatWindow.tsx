"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { MessageBubble } from "./MessageBubble";
import { useChat } from "@/hooks/useChat";
import { UpgradeModal } from "./UpgradeModal";

interface UsageInfo { plan: string; used: number; limit: number; remaining: number; }

const MODEL_LIST = [
  // Free
  { id: "gemini-flash-3.5", name: "Gemini 3.5 Flash", tier: "free", icon: "✦", color: "text-blue-400" },
  { id: "minimax-2.5", name: "Minimax 2.5", tier: "free", icon: "◆", color: "text-gray-400" },
  { id: "llama-4-scout", name: "Llama 4 Scout", tier: "free", icon: "◆", color: "text-orange-400" },
  { id: "kimi-k2.6", name: "Kimi K2.6", tier: "free", icon: "≋", color: "text-gray-400" },
  { id: "kimi-k2.7-code", name: "Kimi K2.7 Code", tier: "free", icon: "≋", color: "text-gray-400" },
  { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro", tier: "free", icon: "≋", color: "text-blue-400" },
  // Pro
  { id: "claude-sonnet-4.6", name: "Sonnet 4.6", tier: "pro", icon: "✳", color: "text-orange-500" },
  { id: "gpt-5.2", name: "GPT 5.2", tier: "pro", icon: "◎", color: "text-gray-400" },
  { id: "gpt-5.4", name: "GPT 5.4", tier: "pro", icon: "◎", color: "text-gray-400" },
  { id: "gpt-5.5", name: "GPT 5.5", tier: "pro", icon: "◎", color: "text-gray-400" },
  { id: "grok-4.3", name: "Grok 4.3", tier: "pro", icon: "⊗", color: "text-gray-400" },
  { id: "grok-4.5", name: "Grok 4.5", tier: "pro", icon: "⊗", color: "text-gray-400" },
  // Boost
  { id: "claude-sonnet-5", name: "Sonnet 5", tier: "boost", icon: "✳", color: "text-orange-500" },
  { id: "claude-opus-4.7", name: "Opus 4.7", tier: "boost", icon: "✳", color: "text-orange-500" },
  { id: "claude-opus-4.8", name: "Opus 4.8", tier: "boost", icon: "✳", color: "text-orange-500" },
  { id: "claude-opus-5", name: "Opus 5", tier: "boost", icon: "✳", color: "text-orange-500" },
  { id: "claude-fable-5", name: "Fable 5", tier: "boost", icon: "✳", color: "text-orange-400" },
  { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro", tier: "boost", icon: "✦", color: "text-blue-500" },
  { id: "gpt-5.6-sol", name: "GPT 5.6 Sol", tier: "boost", icon: "◎", color: "text-gray-400" },
  { id: "gpt-5.6-terra", name: "GPT 5.6 Terra", tier: "boost", icon: "◎", color: "text-gray-400" },
  { id: "glm-5.2", name: "GLM 5.2", tier: "boost", icon: "✦", color: "text-green-400" },
  // Enterprise
  { id: "grok-build-0.1", name: "Grok Build 0.1", tier: "enterprise", icon: "⊗", color: "text-gray-400" },
];

export function ChatWindow() {
  const params = useParams();
  const sessionId = params.id as string;
  const [model, setModel] = useState("claude-opus-5");
  const [input, setInput] = useState("");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);

  const { messages, loading, thinking, sendMessage, loadMessages } = useChat({ sessionId, model });

  useEffect(() => { loadMessages(); fetchUsage(); }, [sessionId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (modelRef.current && !modelRef.current.contains(e.target as Node)) setModelMenuOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const fetchUsage = async () => {
    try { const r = await fetch("/api/user/usage"); if (r.ok) setUsage(await r.json()); } catch {}
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const text = input;
    setInput("");
    const result = await sendMessage(text);
    if (result?.upgradeRequired) setUpgradeOpen(true);
    fetchUsage();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  const isLimitExceeded = usage ? (usage.limit !== -1 && usage.used >= usage.limit) : false;
  const selectedModel = MODEL_LIST.find(m => m.id === model) || MODEL_LIST[0];

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {messages.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <img src="/logo.svg" alt="Soop AI" className="mb-6 h-14 w-14 rounded-full" />
              <h2 className="mb-2 text-2xl font-medium text-white">Чем могу помочь?</h2>
              <p className="text-sm text-gray-500">Я могу отвечать на вопросы, писать код, анализировать данные и многое другое.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} isLoading={loading && msg.role === "assistant" && msg.id === messages[messages.length - 1]?.id} isThinking={thinking && msg.role === "assistant" && msg.id === messages[messages.length - 1]?.id} model={model} />
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-white/5 bg-[#171717] px-4 pb-4 pt-3">
        <div className="mx-auto max-w-3xl">
          {usage && usage.limit !== -1 && (
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-[11px] text-gray-600">{usage.used}/{usage.limit} сообщений сегодня</span>
              {usage.remaining <= 5 && usage.remaining > 0 && <span className="text-[11px] text-yellow-500/80">Осталось {usage.remaining}</span>}
            </div>
          )}

          <div className={`flex items-end gap-2 rounded-2xl border p-2 transition-colors ${isLimitExceeded ? "border-red-500/30 bg-red-500/5" : "border-white/10 bg-[#2a2a2a] focus-within:border-white/20"}`}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isLimitExceeded ? "Лимит исчерпан..." : "Напишите сообщение..."}
              rows={1}
              disabled={loading || isLimitExceeded}
              className="max-h-40 flex-1 resize-none bg-transparent px-1 py-1.5 text-sm text-white outline-none placeholder:text-gray-500 disabled:opacity-50"
              style={{ minHeight: "20px" }}
            />

            {/* Model selector pill */}
            <div ref={modelRef} className="relative shrink-0">
              <button
                onClick={() => setModelMenuOpen(!modelMenuOpen)}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:bg-white/10"
              >
                <span className={selectedModel.color}>{selectedModel.icon}</span>
                <span>{selectedModel.name}</span>
                <svg className="h-3 w-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {modelMenuOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-64 overflow-hidden rounded-xl border border-white/10 bg-[#2f2f2f] shadow-2xl">
                  <div className="max-h-[50vh] overflow-y-auto p-1.5" style={{ scrollbarColor: "#555 #2f2f2f" }}>
                    {/* Free */}
                    <div className="px-2 py-1 text-[10px] font-medium text-gray-500">Free</div>
                    {MODEL_LIST.filter(m => m.tier === "free").map((m) => (
                      <button key={m.id} onClick={() => { setModel(m.id); setModelMenuOpen(false); }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${model === m.id ? "bg-white text-black font-medium" : "text-gray-300 hover:bg-white/10"}`}>
                        <span className={m.color}>{m.icon}</span>
                        <span>{m.name}</span>
                        {model === m.id && <svg className="ml-auto h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                      </button>
                    ))}

                    {/* Pro */}
                    <div className="mt-2 flex items-center gap-2 px-2 py-1">
                      <span className="text-[10px] font-medium text-gray-500">Pro</span>
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[8px] font-bold text-gray-400">Pro</span>
                    </div>
                    {MODEL_LIST.filter(m => m.tier === "pro").map((m) => (
                      <button key={m.id} onClick={() => { setModel(m.id); setModelMenuOpen(false); }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${model === m.id ? "bg-white text-black font-medium" : "text-gray-300 hover:bg-white/10"}`}>
                        <span className={m.color}>{m.icon}</span>
                        <span>{m.name}</span>
                        {model === m.id && <svg className="ml-auto h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                      </button>
                    ))}

                    {/* Boost */}
                    <div className="mt-2 flex items-center gap-2 px-2 py-1">
                      <span className="text-[10px] font-medium text-gray-500">Boost</span>
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[8px] font-bold text-gray-400">Boost</span>
                    </div>
                    {MODEL_LIST.filter(m => m.tier === "boost").map((m) => (
                      <button key={m.id} onClick={() => { setModel(m.id); setModelMenuOpen(false); }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${model === m.id ? "bg-white text-black font-medium" : "text-gray-300 hover:bg-white/10"}`}>
                        <span className={m.color}>{m.icon}</span>
                        <span>{m.name}</span>
                        {model === m.id && <svg className="ml-auto h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                      </button>
                    ))}

                    {/* Enterprise */}
                    <div className="mt-2 flex items-center gap-2 px-2 py-1">
                      <span className="text-[10px] font-medium text-gray-500">Enterprise</span>
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[8px] font-bold text-gray-400">All</span>
                    </div>
                    {MODEL_LIST.filter(m => m.tier === "enterprise").map((m) => (
                      <button key={m.id} onClick={() => { setModel(m.id); setModelMenuOpen(false); }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${model === m.id ? "bg-white text-black font-medium" : "text-gray-300 hover:bg-white/10"}`}>
                        <span className={m.color}>{m.icon}</span>
                        <span>{m.name}</span>
                        {model === m.id && <svg className="ml-auto h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading || isLimitExceeded}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-black transition-all hover:bg-gray-200 disabled:opacity-20"
            >
              {loading ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>

          {isLimitExceeded && (
            <div className="mt-2 text-center">
              <button onClick={() => setUpgradeOpen(true)} className="text-xs text-white hover:underline">Обновить план</button>
            </div>
          )}
        </div>
      </div>

      <UpgradeModal isOpen={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
  );
}
