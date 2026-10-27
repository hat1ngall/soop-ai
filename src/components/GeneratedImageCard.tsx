"use client";

import { useEffect, useState } from "react";
import { IMAGE_SIZES, type GeneratedImageContent } from "@/lib/generated-images";
import { ImageIcon } from "./ImageCreationControls";

export function GeneratedImageCard({ image }: { image: GeneratedImageContent }) {
  const [expanded, setExpanded] = useState(false);
  const [failed, setFailed] = useState(false);
  const source = `/api/images/${encodeURIComponent(image.imageId)}`;
  const format = IMAGE_SIZES.find((item) => item.value === image.size);

  useEffect(() => {
    if (!expanded) return;
    const handleKey = (event: KeyboardEvent) => { if (event.key === "Escape") setExpanded(false); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [expanded]);

  return <>
    <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-[#e2e6ec] bg-white shadow-[0_8px_28px_rgba(35,48,70,.07)]">
      <div className="flex items-center justify-between gap-3 border-b border-[#edf0f4] px-4 py-3"><span className="flex items-center gap-2 text-xs font-semibold text-[#18212f]"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#eef1ff] text-[#4662f0]"><ImageIcon className="h-3.5 w-3.5" /></span>Изображение готово</span><span className="text-[10px] text-[#8290a3]">{format?.label} · {format?.ratio}</span></div>
      {failed ? <div className="flex min-h-52 flex-col items-center justify-center gap-3 bg-[#f7f8fa] p-6 text-center text-sm text-[#8290a3]"><ImageIcon className="h-8 w-8" /><p>Не удалось загрузить превью.</p><a href={source} target="_blank" rel="noreferrer" className="font-medium text-[#4662f0]">Открыть изображение</a></div> : <button type="button" onClick={() => setExpanded(true)} className="group relative block w-full bg-[#f7f8fa]" aria-label="Посмотреть изображение в полном размере"><img src={source} alt={image.prompt} onError={() => setFailed(true)} className="mx-auto max-h-[520px] w-full object-contain" loading="lazy" /><span className="absolute bottom-3 right-3 rounded-lg bg-black/50 px-2.5 py-1.5 text-[11px] text-white opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">Увеличить ↗</span></button>}
      <div className="flex items-center justify-between gap-3 p-3.5"><p className="line-clamp-2 min-w-0 text-xs leading-5 text-[#8290a3]" title={image.prompt}>{image.prompt}</p><a href={`${source}?download=1`} download className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#eef1ff] px-3 py-2 text-xs font-semibold text-[#4662f0] transition-colors hover:bg-[#e9edff]" aria-label="Скачать изображение"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>Скачать</a></div>
    </div>
    {expanded && <div role="dialog" aria-modal="true" aria-label="Созданное изображение" className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-5 backdrop-blur-sm" onClick={() => setExpanded(false)}><button autoFocus type="button" onClick={() => setExpanded(false)} className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl text-white hover:bg-white/25" aria-label="Закрыть просмотр">×</button><img src={source} alt={image.prompt} className="max-h-[88vh] max-w-[92vw] rounded-xl object-contain shadow-2xl" onClick={(event) => event.stopPropagation()} /></div>}
  </>;
}

export function ImageGenerationProgress() {
  return <div className="flex gap-3 animate-slide-up" role="status" aria-live="polite"><img src="/logo.svg" alt="" className="h-8 w-8 shrink-0 rounded-xl border border-[#e0e5ed] bg-white p-1" /><div className="min-w-0 flex-1"><div className="mb-1 text-[11px] font-semibold uppercase tracking-[.12em] text-[#8390a3]">Soop AI</div><div className="relative max-w-xl overflow-hidden rounded-2xl rounded-tl-md border border-[#e2e6ec] bg-[#f7f8fa] p-5 sm:p-6"><div className="flex items-center gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4662f0] to-[#b388eb] text-white shadow-md motion-safe:animate-pulse"><ImageIcon className="h-7 w-7" /></div><div><p className="text-sm font-semibold text-[#18212f]">Создаём ваше изображение</p><p className="mt-1 text-xs leading-5 text-[#8290a3]">Добавляем свет, цвет и детали. Это может занять пару минут.</p></div></div><div className="mt-5 h-1 overflow-hidden rounded-full bg-[#dfe4eb]"><div className="h-full w-1/3 rounded-full bg-gradient-to-r from-[#4662f0] to-[#b388eb] motion-safe:animate-[image-generation-sweep_1.8s_ease-in-out_infinite]" /></div></div></div></div>;
}
