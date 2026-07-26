"use client";

import { useState, useEffect } from "react";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

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
        <div className="max-w-[85%] rounded-[22px] rounded-br-md bg-slate-950 px-4 py-2.5 text-sm leading-relaxed text-white shadow-[0_14px_36px_rgba(15,23,42,0.18)] transition-transform duration-200 hover:-translate-y-0.5">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 animate-slide-up">
      <img src="/logo.svg" alt="" className="h-8 w-8 shrink-0 rounded-2xl shadow-[0_14px_34px_rgba(80,93,120,0.16)] animate-pulse-glow" />
      <div className="min-w-0 flex-1 pt-0.5">
        {isLoading && isThinking && !message.content ? (
          <div className="space-y-2 rounded-[22px] rounded-tl-md border border-white/80 bg-white/70 px-4 py-3 shadow-[0_14px_40px_rgba(80,93,120,0.12)]">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" style={{ animationDelay: "200ms" }} />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" style={{ animationDelay: "400ms" }} />
              </div>
              <span className="text-xs text-slate-500">{THINKING_STAGES[thinkingStage]}</span>
            </div>
          </div>
        ) : message.content ? (
          <div className="rounded-[22px] rounded-tl-md border border-white/80 bg-white/70 px-4 py-3 text-sm leading-relaxed text-slate-700 shadow-[0_14px_40px_rgba(80,93,120,0.12)]">
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
              <code className="rounded-lg bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700" {...props}>
                {children}
              </code>
            );
          }

          return (
            <div className="my-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-[0_14px_36px_rgba(15,23,42,0.16)]">
              <div className="flex items-center justify-between bg-slate-900 px-3 py-1.5 text-[11px] text-slate-400">
                <span>{match ? match[1] : "code"}</span>
                <CopyButton text={String(children).replace(/\n$/, "")} />
              </div>
              <SyntaxHighlighter
                style={oneDark}
                language={match ? match[1] : "text"}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  borderRadius: 0,
                  background: "#020617",
                  fontSize: "12px",
                  lineHeight: "1.5",
                }}
                codeTagProps={{
                  style: { fontFamily: "monospace" },
                }}
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
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
      className="flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[10px] text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
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
