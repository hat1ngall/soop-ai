"use client";

import { useState, useCallback } from "react";
import { Message } from "@/types";

const CHAT_REQUEST_TIMEOUT_MS = 180_000;


interface UseChatOptions {
  sessionId: string;
  model: string;
}

export function useChat({ sessionId, model }: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/sessions/${sessionId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch {}
  }, [sessionId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || loading) return;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: content.trim(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);
      setThinking(true);
      setError(null);

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), CHAT_REQUEST_TIMEOUT_MS);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: content.trim(), model, sessionId }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const data = await res.json();
          if (data.error === "upgrade_required") setError("upgrade_required");
          else if (data.error === "limit_exceeded") setError("limit_exceeded");
          else setError(data.error || "Ошибка");
          setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
          setLoading(false);
          setThinking(false);
          return { upgradeRequired: data.error === "upgrade_required", limitExceeded: data.error === "limit_exceeded" };
        }

        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "",
        };
        setMessages((prev) => [...prev, assistantMsg]);

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;
              const data = trimmed.slice(6);

              try {
                const parsed = JSON.parse(data);

                if (parsed.thinking) {
                  setThinking(true);
                  continue;
                }

                if (parsed.error) {
                  setError(parsed.error);
                  setMessages((prev) => prev.filter((m) => m.id !== assistantMsg.id));
                  setLoading(false);
                  setThinking(false);
                  return { upgradeRequired: false, limitExceeded: false };
                }

                if (parsed.chunk) {
                  setThinking(false);
                  fullContent += parsed.chunk;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsg.id ? { ...m, content: fullContent } : m
                    )
                  );
                }

                if (parsed.done) {
                  setLoading(false);
                  setThinking(false);
                  return { upgradeRequired: false, limitExceeded: false, usage: parsed.usage };
                }
              } catch {}
            }
          }
        }

        setLoading(false);
        setThinking(false);
        return { upgradeRequired: false, limitExceeded: false };
      } catch (error) {
        setError(error instanceof DOMException && error.name === "AbortError" ? "Запрос слишком долго не отвечал" : "Сервис недоступен");
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
        setLoading(false);
        setThinking(false);
        return { upgradeRequired: false, limitExceeded: false };
      } finally {
        window.clearTimeout(timeoutId);
        setLoading(false);
        setThinking(false);
      }
    },
    [sessionId, model, loading]
  );

  return { messages, setMessages, loading, thinking, error, setError, sendMessage, loadMessages };
}
