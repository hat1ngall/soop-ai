"use client";

import { useState, useCallback } from "react";
import { Message } from "@/types";
import type { ChatAttachment } from "@/lib/attachments";

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
    async (content: string, attachments: ChatAttachment[] = []) => {
      const trimmed = content.trim();
      if ((!trimmed && attachments.length === 0) || loading) return;

      let displayContent = trimmed;
      const imageAttachments = attachments.filter((a) => a.dataUrl && a.type.startsWith("image/"));
      const textAttachments = attachments.filter((a) => a.text);

      if (imageAttachments.length > 0) {
        const imgs = imageAttachments.map((a) => `![${a.name}](${a.dataUrl})`).join("\n\n");
        displayContent = displayContent ? `${imgs}\n\n${displayContent}` : imgs;
      }
      if (textAttachments.length > 0) {
        const files = textAttachments.map((a) => `--- Файл: ${a.name} ---\n${a.text}\n--- Конец файла ---`).join("\n\n");
        displayContent = displayContent ? `${displayContent}\n\n${files}` : files;
      }

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: displayContent,
      };

      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);
      setThinking(true);
      setError(null);

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), CHAT_REQUEST_TIMEOUT_MS);
      let assistantMsgId: string | null = null;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, model, sessionId, attachments }),
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
        assistantMsgId = assistantMsg.id;
        setMessages((prev) => [...prev, assistantMsg]);

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";
        let buffer = "";
        let finished = false;
        let usage: { used: number; limit: number } | undefined;

        const handleLine = (line: string) => {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) return;

          let parsed: any;
          try {
            parsed = JSON.parse(trimmed.slice(6));
          } catch {
            return;
          }

          if (parsed.thinking) {
            setThinking(true);
            return;
          }

          if (parsed.error) {
            setError(parsed.error);
            setThinking(false);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsg.id ? { ...m, content: `⚠️ ${parsed.error}` } : m
              )
            );
            finished = true;
            return;
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
            finished = true;
            usage = parsed.usage;
          }
        };

        if (reader) {
          while (!finished) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              handleLine(line);
              if (finished) break;
            }
          }
          if (!finished && buffer) handleLine(buffer);
        }

        setLoading(false);
        setThinking(false);
        return { upgradeRequired: false, limitExceeded: false, usage };
      } catch (error) {
        const errMsg = error instanceof DOMException && error.name === "AbortError" ? "Запрос слишком долго не отвечал" : "Сервис недоступен";
        setError(errMsg);
        if (assistantMsgId) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId && !m.content ? { ...m, content: `⚠️ ${errMsg}` } : m
            )
          );
        }
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
