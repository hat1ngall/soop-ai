"use client";

import { useState, useEffect } from "react";
import Markdown from "react-markdown";

interface MessageBubbleProps {
  message: {
    id?: string;
    role: "user" | "assistant";
    content: string;
  };
  isLoading?: boolean;
  isThinking?: boolean;
  model?: string;
}

const THINKING_STAGES = [
  "Думаю",
  "Анализирую",
  "Формулирую",
  "Готовлю",
];

export function MessageBubble({ message, isLoading, isThinking, model }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [thinkingStage, setThinkingStage] = useState(0);

  useEffect(() => {
    if (!isThinking) return;
    const interval = setInterval(() => {
      setThinkingStage((prev) => (prev + 1) % THINKING_STAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [isThinking]);

  if (isUser) {
    return (
      <div className="flex justify-end animate-slide-up">
        <div className="max-w-[85%] rounded-xl rounded-br-sm bg-[#191919] px-4 py-2.5 text-sm leading-relaxed text-white">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 animate-slide-up">
      <img src="/logo.svg" alt="" className="h-7 w-7 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1 pt-0.5">
        {isLoading && isThinking && !message.content ? (
          <div className="space-y-2 rounded-lg border border-[#e9e9e7] bg-[#f7f7f5] px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" style={{ animationDelay: "200ms" }} />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" style={{ animationDelay: "400ms" }} />
              </div>
              <span className="text-xs text-[#787774]">{THINKING_STAGES[thinkingStage]}</span>
            </div>
          </div>
        ) : message.content ? (
          <div className="rounded-lg border border-[#e9e9e7] bg-white px-4 py-3 text-sm leading-relaxed text-[#37352f]">
            <MarkdownContent content={message.content} />
            {isLoading && (
              <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-slate-500 align-text-bottom" />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <Markdown
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          const isInline = !match;

          if (isInline) {
            return (
              <code className="rounded bg-[#f1f1ef] px-1.5 py-0.5 text-xs text-[#37352f]" {...props}>
                {children}
              </code>
            );
          }

          const language = match ? match[1] : "code";
          const code = String(children).replace(/\n$/, "");

          return (
            <div className="my-4 max-w-full overflow-hidden rounded-lg border border-[#e9e9e7] bg-white">
              <div className="flex items-center justify-between border-b border-[#e9e9e7] bg-[#f7f7f5] px-3 py-2.5 sm:px-4">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#e9e9e7] text-[10px] font-black text-[#55534f]">
                    {language.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      {language}
                    </div>
                    <div className="hidden text-[10px] text-slate-400 sm:block">
                      Нажмите, чтобы скопировать весь блок
                    </div>
                  </div>
                </div>
                <CopyButton text={code} />
              </div>
              <pre className="max-w-full overflow-x-auto bg-[#fbfbfa] px-4 py-4 text-[13px] leading-7 text-[#37352f] sm:px-5">
                <code className="font-mono">{code}</code>
              </pre>
            </div>
          );
        },
        p({ children }) {
          return <p className="mb-2 last:mb-0">{children}</p>;
        },
        h1({ children }) {
          return <h1 className="mb-3 mt-5 text-xl font-bold text-slate-950">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="mb-2 mt-4 text-lg font-bold text-slate-950">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="mb-2 mt-3 text-base font-semibold text-slate-950">{children}</h3>;
        },
        ul({ children }) {
          return <ul className="mb-2 list-disc pl-4 space-y-0.5">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="mb-2 list-decimal pl-4 space-y-0.5">{children}</ol>;
        },
        li({ children }) {
          return <li className="text-slate-700">{children}</li>;
        },
        blockquote({ children }) {
          return (
            <blockquote className="my-2 border-l-2 border-slate-300 pl-3 text-slate-500 italic">
              {children}
            </blockquote>
          );
        },
        a({ href, children }) {
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-sky-600 hover:underline">
              {children}
            </a>
          );
        },
        strong({ children }) {
          return <strong className="font-semibold text-slate-950">{children}</strong>;
        },
        table({ children }) {
          return (
            <div className="my-3 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-xs">{children}</table>
            </div>
          );
        },
        thead({ children }) {
          return <thead className="border-b border-slate-200 bg-slate-50">{children}</thead>;
        },
        th({ children }) {
          return <th className="px-3 py-1.5 text-left font-medium text-slate-700">{children}</th>;
        },
        td({ children }) {
          return <td className="border-b border-slate-200 px-3 py-1.5 text-slate-600">{children}</td>;
        },
      }}
    >
      {content}
    </Markdown>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white/80 px-2.5 py-1.5 text-[10px] font-semibold text-slate-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:text-slate-950"
    >
      {copied ? (
        <>
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          OK
        </>
      ) : (
        <>
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Копировать
        </>
      )}
    </button>
  );
}
