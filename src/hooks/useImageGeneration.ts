"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Message } from "@/types";
import { parseGeneratedImage, type ImageSize } from "@/lib/generated-images";

export function useImageGeneration({ sessionId, setMessages }: {
  sessionId: string;
  setMessages: Dispatch<SetStateAction<Message[]>>;
}) {
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    setGeneratingImage(false);
    setImageError(null);
    return () => {
      activeRequest.current?.abort();
      activeRequest.current = null;
    };
  }, [sessionId]);

  const generateImage = useCallback(async (prompt: string, size: ImageSize) => {
    const trimmed = prompt.trim();
    if (!trimmed || activeRequest.current) return { success: false };
    const controller = new AbortController();
    activeRequest.current = controller;
    const optimisticId = crypto.randomUUID();
    setMessages((previous) => [...previous, {
      id: optimisticId, role: "user", content: `Создай изображение: ${trimmed}`,
    }]);
    setGeneratingImage(true);
    setImageError(null);
    const timeout = window.setTimeout(() => controller.abort(), 270_000);

    try {
      const response = await fetch("/api/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed, sessionId, size }),
        signal: controller.signal,
      });
      if (activeRequest.current !== controller) return { success: false };
      const data = await response.json();
      if (activeRequest.current !== controller) return { success: false };
      if (!response.ok) {
        setMessages((previous) => previous.filter((message) => message.id !== optimisticId));
        setImageError(data.message || (data.error === "limit_exceeded" ? "Лимит запросов на сегодня исчерпан." : data.error) || "Не удалось создать изображение. Попробуйте ещё раз.");
        return { success: false, limitExceeded: data.error === "limit_exceeded" };
      }
      if (!data.userMessage?.id || !data.assistantMessage?.id || !parseGeneratedImage(data.assistantMessage.content)) {
        throw new Error("Invalid image response");
      }
      setMessages((previous) => {
        const hasOptimistic = previous.some((message) => message.id === optimisticId);
        const messages = hasOptimistic ? previous.map((message) => message.id === optimisticId ? data.userMessage : message) : [...previous, data.userMessage];
        return [...messages, data.assistantMessage];
      });
      return { success: true, usage: data.usage };
    } catch {
      if (activeRequest.current !== controller) return { success: false };
      setMessages((previous) => previous.filter((message) => message.id !== optimisticId));
      setImageError(controller.signal.aborted
        ? "Создание заняло слишком много времени. Обновите чат: результат мог уже сохраниться."
        : "Не удалось создать изображение. Проверьте соединение и попробуйте ещё раз.");
      return { success: false };
    } finally {
      window.clearTimeout(timeout);
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setGeneratingImage(false);
      }
    }
  }, [sessionId, setMessages]);

  return { generatingImage, imageError, setImageError, generateImage };
}
