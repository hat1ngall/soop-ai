"use client";

import { useState, useEffect } from "react";
import Markdown from "react-markdown";

interface Props { message: { id?: string; role: "user" | "assistant"; content: string }; isLoading?: boolean; isThinking?: boolean; model?: string; }
const stages = ["Thinking", "Connecting the dots", "Writing a clear answer"];

function UserMessageContent({ content }: { content: string }) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const images: { alt: string; url: string }[] = [];
  const files: { name: string }[] = [];

  let text = content
    .replace(/!\[(.*?)\]\(((?:data:image\/[^)]+)|(?:https?:\/\/[^)]+))\)/g, (_, alt, url) => {
      images.push({ alt, url });
      return "";
    });

  text = text.replace(/<<<FILE:(.*?)>>>\n?([\s\S]*?)\n?<<<END_FILE>>>/g, (_, name) => {
    files.push({ name: name.trim() });
    return "";
  });

  text = text.replace(/---\s*Файл:\s*(.*?)\s*---\n?([\s\S]*?)(?:---\s*Конец файла\s*---|(?=---\s*Файл:)|\s*$)/g, (_, name) => {
    files.push({ name: name.trim() });
    return "";
  });

  const cleanText = text.trim();

  return (
    <div className="space-y-2">
      {/* Компактные превью фото сверху */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-0.5">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedImage(img.url)}
              className="group relative h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-xl border border-white/20 bg-black/30 shadow-sm transition-all hover:scale-105 active:scale-95"
              title="Нажмите для просмотра в полном размере"
            >
              <img
                src={img.url}
                alt={img.alt || "Вложенное изображение"}
                className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
              />
              <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-md bg-black/60 text-white/90 backdrop-blur-sm opacity-0 transition-opacity group-hover:opacity-100">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Карточки прикреплённых файлов сверху */}
      {files.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-0.5">
          {files.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs text-white/95 shadow-sm backdrop-blur-sm"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white shadow-inner">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-white">{file.name}</div>
                <div className="text-[10px] text-white/60">Прикреплённый файл</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Текст запроса пользователя */}
      {cleanText && <div className="whitespace-pre-wrap">{cleanText}</div>}

      {/* Модальное окно для полного размера при клике */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedImage}
              alt="Изображение"
              className="max-h-[85vh] max-w-[85vw] rounded-2xl object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md hover:bg-white/40 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function MessageBubble({ message, isLoading, isThinking }: Props) {
  const [stage, setStage] = useState(0);
  useEffect(() => { if (!isThinking) return; const timer = window.setInterval(() => setStage((value) => (value + 1) % stages.length), 1800); return () => window.clearInterval(timer); }, [isThinking]);
  if (message.role === "user") return <div className="flex justify-end animate-slide-up"><div className="max-w-[82%] rounded-2xl rounded-br-md bg-[#18212f] px-4 py-3 text-sm leading-6 text-white shadow-[0_8px_24px_rgba(24,33,47,.12)]"><UserMessageContent content={message.content} /></div></div>;
  return <div className="flex gap-3 animate-slide-up"><img src="/logo.svg" alt="" className="h-8 w-8 shrink-0 rounded-xl border border-[#e0e5ed] bg-white p-1" /><div className="min-w-0 flex-1"><div className="mb-1 text-[11px] font-semibold uppercase tracking-[.12em] text-[#8390a3]">Soop AI</div>{isLoading && isThinking && !message.content ? <div className="inline-flex items-center gap-2 rounded-2xl rounded-tl-md border border-[#e2e6ec] bg-[#f7f8fa] px-4 py-3 text-xs text-[#718198]"><span className="flex gap-1"><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#4662f0]" /><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#4662f0] [animation-delay:200ms]" /><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#4662f0] [animation-delay:400ms]" /></span>{stages[stage]}</div> : <div className="rounded-2xl rounded-tl-md border border-[#e2e6ec] bg-white px-4 py-3 text-sm leading-7 text-[#334155] shadow-[0_5px_18px_rgba(35,48,70,.04)]"><MarkdownContent content={message.content} />{isLoading && <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-[#4662f0] align-text-bottom" />}</div>}</div></div>;
}

function MarkdownContent({ content }: { content: string }) { return <Markdown components={{ p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>, h1: ({ children }) => <h1 className="mb-3 mt-5 text-xl font-semibold text-[#18212f]">{children}</h1>, h2: ({ children }) => <h2 className="mb-2 mt-4 text-lg font-semibold text-[#18212f]">{children}</h2>, ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5">{children}</ul>, ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5">{children}</ol>, li: ({ children }) => <li>{children}</li>, strong: ({ children }) => <strong className="font-semibold text-[#18212f]">{children}</strong>, a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="font-medium text-[#3857e8] underline-offset-2 hover:underline">{children}</a>, code({ className, children, ...props }) { const match = /language-(\w+)/.exec(className || ""); if (!match) return <code className="rounded-md bg-[#eef1f5] px-1.5 py-0.5 text-[12px] text-[#4b5563]" {...props}>{children}</code>; const code = String(children).replace(/\n$/, ""); return <div className="my-4 overflow-hidden rounded-xl border border-[#dfe4eb] bg-[#f7f8fa]"><div className="flex items-center justify-between border-b border-[#dfe4eb] px-3 py-2 text-[11px] font-medium uppercase tracking-[.1em] text-[#8290a3]"><span>{match[1]}</span><CopyButton text={code} /></div><pre className="overflow-x-auto px-4 py-3 text-[13px] leading-6 text-[#334155]"><code>{code}</code></pre></div>; } }}>{content}</Markdown>; }
function CopyButton({ text }: { text: string }) { const [copied, setCopied] = useState(false); return <button onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 1400); }} className="rounded-md bg-white px-2 py-1 text-[10px] font-medium normal-case tracking-normal text-[#718198] hover:text-[#18212f]">{copied ? "Copied" : "Copy"}</button>; }
