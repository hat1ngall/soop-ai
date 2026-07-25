"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { MessageBubble } from "./MessageBubble";
import { useChat } from "@/hooks/useChat";
import { UpgradeModal } from "./UpgradeModal";

interface UsageInfo {
  plan: string;
  used: number;
  limit: number;
  remaining: number;
}

export function ChatWindow() {
  const params = useParams();
  const sessionId = params.id as string;
  const [model] = useState("gemini-flash-3.5");
  const [input, setInput] = useState("");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { messages, loading, thinking, sendMessage, loadMessages } = useChat({
    sessionId,
    model,
  });

  useEffect(() => {
    loadMessages();
    fetchUsage();
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const fetchUsage = async () => {
    try {
      const res = await fetch("/api/user/usage");
      if (res.ok) {
        const data = await res.json();
        setUsage(data);
      }
    } catch {}
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const text = input;
    setInput("");

    const result = await sendMessage(text);
    if (result?.upgradeRequired) {
      setUpgradeOpen(true);
    }
    // Обновляем счётчик после отправки
    fetchUsage();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isLimitExceeded = usage ? (usage.limit !== -1 && usage.used >= usage.limit) : false;

  return (
    <div className="flex h-full flex-col bg-[#212121]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {messages.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <img src="/logo.svg" alt="Soop AI" className="mb-6 h-16 w-16 rounded-full" />
              <h2 className="mb-3 text-3xl font-semibold text-white">Soop AI</h2>
              <p className="text-gray-400">
                Как я могу помочь вам сегодня?
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {loading && (
                <MessageBubble
                  message={{ role: "assistant", content: "" }}
                  isLoading
                  isThinking={thinking}
                  model={model}
                />
              )}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-white/10 bg-[#212121] px-4 pb-6 pt-4">
        <div className="mx-auto max-w-3xl">
          {/* Лимит сообщений */}
          {usage && usage.limit !== -1 && (
            <div className="mb-3 flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="text-xs text-gray-500">
                  Сообщений сегодня: {usage.used} / {usage.limit}
                </span>
              </div>
              {usage.remaining <= 5 && usage.remaining > 0 && (
                <span className="text-xs text-yellow-500">
                  Осталось {usage.remaining}
                </span>
              )}
            </div>
          )}
          {usage && usage.limit === -1 && (
            <div className="mb-3 flex items-center gap-2 px-2">
              <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-xs text-green-500">Безлимитные сообщения</span>
            </div>
          )}

          <div className={`flex items-end gap-3 rounded-3xl p-4 ${isLimitExceeded ? "bg-red-500/10" : "bg-[#2f2f2f]"}`}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isLimitExceeded ? "Дневной лимит исчерпан..." : "Сообщение для Soop AI..."}
              rows={1}
              disabled={loading || isLimitExceeded}
              className="max-h-48 flex-1 resize-none bg-transparent text-white outline-none placeholder:text-gray-500 disabled:opacity-50"
              style={{ minHeight: "24px" }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading || isLimitExceeded}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black transition-all hover:bg-gray-200 disabled:opacity-30"
            >
              {loading ? (
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>

          {isLimitExceeded && (
            <div className="mt-3 text-center">
              <button
                onClick={() => setUpgradeOpen(true)}
                className="text-sm text-white hover:underline"
              >
                Обновить план для увеличения лимита
              </button>
            </div>
          )}

          <p className="mt-3 text-center text-xs text-gray-500">
            Soop AI может допускать ошибки. Проверяйте важную информацию.
          </p>
        </div>
      </div>

      <UpgradeModal
        isOpen={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
      />
    </div>
  );
}
