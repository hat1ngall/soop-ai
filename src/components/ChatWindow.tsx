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

interface AttachedFile {
  name: string;
  size: string;
  type: string;
}

export function ChatWindow() {
  const params = useParams();
  const sessionId = params.id as string;
  const [model] = useState("gemini-flash-3.5");
  const [input, setInput] = useState("");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " Б";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " КБ";
    return (bytes / (1024 * 1024)).toFixed(1) + " МБ";
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: AttachedFile[] = Array.from(files).map((f) => ({
      name: f.name,
      size: formatSize(f.size),
      type: f.type || "unknown",
    }));

    setAttachedFiles((prev) => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if ((!input.trim() && attachedFiles.length === 0) || loading) return;

    let text = input.trim();

    // Добавляем информацию о файлах к сообщению
    if (attachedFiles.length > 0) {
      const fileList = attachedFiles.map((f) => `📎 ${f.name} (${f.size})`).join("\n");
      text = text ? `${text}\n\nФайлы:\n${fileList}` : `Файлы:\n${fileList}`;
    }

    setInput("");
    setAttachedFiles([]);

    const result = await sendMessage(text);
    if (result?.upgradeRequired) {
      setUpgradeOpen(true);
    }
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
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {messages.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <img src="/logo.svg" alt="Soop AI" className="mb-6 h-14 w-14 rounded-full" />
              <h2 className="mb-2 text-2xl font-medium text-white">Чем могу помочь?</h2>
              <p className="text-sm text-gray-500">
                Я могу отвечать на вопросы, писать код, анализировать данные и многое другое.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isLoading={loading && msg.role === "assistant" && msg.id === messages[messages.length - 1]?.id}
                  isThinking={thinking && msg.role === "assistant" && msg.id === messages[messages.length - 1]?.id}
                  model={model}
                />
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-white/5 bg-[#171717] px-4 pb-4 pt-3">
        <div className="mx-auto max-w-3xl">
          {/* Лимит сообщений */}
          {usage && usage.limit !== -1 && (
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-[11px] text-gray-600">
                {usage.used}/{usage.limit} сообщений сегодня
              </span>
              {usage.remaining <= 5 && usage.remaining > 0 && (
                <span className="text-[11px] text-yellow-500/80">
                  Осталось {usage.remaining}
                </span>
              )}
            </div>
          )}

          {/* Attached files */}
          {attachedFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachedFiles.map((file, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-gray-300">
                  <svg className="h-3.5 w-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="max-w-[120px] truncate">{file.name}</span>
                  <span className="text-gray-600">{file.size}</span>
                  <button onClick={() => removeFile(i)} className="ml-1 text-gray-500 hover:text-gray-300">
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input container */}
          <div className={`flex items-end gap-2 rounded-2xl border p-2 transition-colors ${
            isLimitExceeded
              ? "border-red-500/30 bg-red-500/5"
              : "border-white/10 bg-[#2a2a2a] focus-within:border-white/20"
          }`}>
            {/* File attach button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || isLimitExceeded}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-200 disabled:opacity-30"
              title="Прикрепить файл"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileAttach}
              className="hidden"
              accept=".txt,.pdf,.doc,.docx,.xls,.xlsx,.csv,.json,.xml,.md,.py,.js,.ts,.html,.css,.java,.cpp,.c,.rb,.go,.rs,.php,.sql,.yaml,.yml,.toml,.log,.png,.jpg,.jpeg,.gif,.webp"
            />

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

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={(!input.trim() && attachedFiles.length === 0) || loading || isLimitExceeded}
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
              <button onClick={() => setUpgradeOpen(true)} className="text-xs text-white hover:underline">
                Обновить план
              </button>
            </div>
          )}
        </div>
      </div>

      <UpgradeModal isOpen={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
  );
}
