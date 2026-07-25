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
  "Анализирую запрос",
  "Обрабатываю информацию",
  "Формулирую ответ",
  "Готовлю ответ",
];

export function MessageBubble({ message, isLoading, isThinking, model }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [thinkingStage, setThinkingStage] = useState(0);

  useEffect(() => {
    if (!isThinking) return;
    const interval = setInterval(() => {
      setThinkingStage((prev) => (prev + 1) % THINKING_STAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [isThinking]);

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-3xl bg-[#2f2f2f] px-5 py-3 text-[15px] leading-relaxed text-white">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      <img src="/logo.svg" alt="Soop AI" className="h-8 w-8 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 pt-1">
        {isLoading && isThinking && !message.content ? (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="h-2 w-2 animate-pulse rounded-full bg-gray-400" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 animate-pulse rounded-full bg-gray-400" style={{ animationDelay: "300ms" }} />
                <span className="h-2 w-2 animate-pulse rounded-full bg-gray-400" style={{ animationDelay: "600ms" }} />
              </div>
              <span className="text-sm text-gray-400">
                {THINKING_STAGES[thinkingStage]}
                <span className="animate-pulse">...</span>
              </span>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-3/4 animate-pulse rounded-full bg-white/5" />
              <div className="h-3 w-1/2 animate-pulse rounded-full bg-white/5" />
              <div className="h-3 w-2/3 animate-pulse rounded-full bg-white/5" />
            </div>
          </div>
        ) : message.content ? (
          <div className="text-[15px] leading-relaxed text-gray-200">
            <MarkdownContent content={message.content} />
            {isLoading && (
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-gray-400 align-text-bottom" />
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
              <code className="rounded-md bg-white/10 px-1.5 py-0.5 text-sm text-gray-200" {...props}>
                {children}
              </code>
            );
          }

          return (
            <div className="my-3 overflow-hidden rounded-xl border border-white/10">
              <div className="flex items-center justify-between bg-[#1a1a1a] px-4 py-2 text-xs text-gray-400">
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
                  background: "#0d0d0d",
                  fontSize: "13px",
                  lineHeight: "1.6",
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
          return <p className="mb-3 last:mb-0">{children}</p>;
        },
        h1({ children }) {
          return <h1 className="mb-4 mt-6 text-2xl font-bold text-white">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="mb-3 mt-5 text-xl font-bold text-white">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="mb-2 mt-4 text-lg font-semibold text-white">{children}</h3>;
        },
        h4({ children }) {
          return <h4 className="mb-2 mt-3 text-base font-semibold text-white">{children}</h4>;
        },
        ul({ children }) {
          return <ul className="mb-3 list-disc pl-5 space-y-1">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="mb-3 list-decimal pl-5 space-y-1">{children}</ol>;
        },
        li({ children }) {
          return <li className="text-gray-200">{children}</li>;
        },
        blockquote({ children }) {
          return (
            <blockquote className="my-3 border-l-4 border-gray-600 pl-4 text-gray-400 italic">
              {children}
            </blockquote>
          );
        },
        a({ href, children }) {
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              {children}
            </a>
          );
        },
        strong({ children }) {
          return <strong className="font-semibold text-white">{children}</strong>;
        },
        em({ children }) {
          return <em className="italic text-gray-300">{children}</em>;
        },
        hr() {
          return <hr className="my-4 border-white/10" />;
        },
        table({ children }) {
          return (
            <div className="my-3 overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">{children}</table>
            </div>
          );
        },
        thead({ children }) {
          return <thead className="border-b border-white/10 bg-white/5">{children}</thead>;
        },
        th({ children }) {
          return <th className="px-3 py-2 text-left font-medium text-gray-300">{children}</th>;
        },
        td({ children }) {
          return <td className="border-b border-white/5 px-3 py-2 text-gray-300">{children}</td>;
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
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
    >
      {copied ? (
        <>
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Скопировано
        </>
      ) : (
        <>
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Копировать
        </>
      )}
    </button>
  );
}
