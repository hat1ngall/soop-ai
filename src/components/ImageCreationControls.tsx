"use client";

import { IMAGE_SIZES, type ImageSize } from "@/lib/generated-images";

export function ImageIcon({ className = "h-4 w-4" }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" strokeWidth="1.7" /><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" /><path d="m4 17 5-5 4 4 3-3 5 5" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function ImageCreationControls({ imageMode, onModeChange, size, onSizeChange, disabled, hasAttachments }: {
  imageMode: boolean;
  onModeChange: (enabled: boolean) => void;
  size: ImageSize;
  onSizeChange: (size: ImageSize) => void;
  disabled: boolean;
  hasAttachments: boolean;
}) {
  return <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
    <div className="inline-flex rounded-xl border border-[#e2e6ec] bg-[#f7f8fa] p-1" aria-label="Режим запроса">
      <button type="button" aria-pressed={!imageMode} disabled={disabled} onClick={() => onModeChange(false)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-50 ${!imageMode ? "bg-white text-[#18212f] shadow-sm" : "text-[#8290a3] hover:text-[#18212f]"}`}>Чат</button>
      <button type="button" aria-pressed={imageMode} disabled={disabled || hasAttachments} title={hasAttachments ? "Уберите вложения, чтобы создать изображение" : "Создать изображение по описанию"} onClick={() => onModeChange(true)} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-50 ${imageMode ? "bg-[#4662f0] text-white shadow-sm" : "text-[#4662f0] hover:bg-[#eef1ff]"}`}><ImageIcon />Создать изображение</button>
    </div>
    {imageMode && <div className="flex items-center gap-1" aria-label="Формат изображения">{IMAGE_SIZES.map((item) => <button key={item.value} type="button" title={item.label} aria-label={`${item.label}, ${item.ratio}`} aria-pressed={size === item.value} disabled={disabled} onClick={() => onSizeChange(item.value)} className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] transition-colors disabled:opacity-50 ${size === item.value ? "border-[#91a4f7] bg-[#eef1ff] text-[#4662f0]" : "border-transparent text-[#8290a3] hover:bg-[#f7f8fa]"}`}><span className={`inline-block rounded-[2px] border border-current ${item.ratio === "1:1" ? "h-3 w-3" : item.ratio === "3:2" ? "h-2.5 w-3.5" : "h-3.5 w-2.5"}`} />{item.ratio}</button>)}</div>}
  </div>;
}

const IDEAS = [
  { title: "Предметное фото", label: "Свет, фактура, детали", tone: "from-amber-100 to-orange-200 dark:from-amber-950 dark:to-orange-950", prompt: "Предметное фото флакона парфюма на светлом камне, тёплый солнечный свет, тени листьев, минимализм, журнальная съёмка" },
  { title: "Портрет", label: "Характер в одном кадре", tone: "from-rose-100 to-violet-200 dark:from-rose-950 dark:to-violet-950", prompt: "Кинематографичный портрет человека на вечерней улице, мягкий свет неоновых вывесок, плёночная фактура, крупный план" },
  { title: "Мир из воображения", label: "От идеи до иллюстрации", tone: "from-sky-100 to-emerald-200 dark:from-sky-950 dark:to-emerald-950", prompt: "Уютный домик над облаками с маленьким садом, воздушная иллюстрация, мягкий утренний свет, пастельные цвета и много деталей" },
];

export function ImageCreationEmptyState({ onPrompt }: { onPrompt: (prompt: string) => void }) {
  return <div className="flex flex-col items-center py-12 text-center sm:py-20">
    <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-[#4662f0] to-[#a477e8] text-white shadow-[0_12px_32px_rgba(70,98,240,.22)]"><ImageIcon className="h-8 w-8" /></div>
    <span className="mb-2 text-[10px] font-semibold uppercase tracking-[.24em] text-[#4662f0]">Студия изображений</span>
    <h2 className="text-2xl font-semibold tracking-tight text-[#18212f] sm:text-3xl">Представьте. Опишите. Создайте.</h2>
    <p className="mt-3 max-w-md text-sm leading-6 text-[#8290a3]">Фотография, иллюстрация или новая идея — начните с нескольких слов.</p>
    <div className="mt-8 grid w-full max-w-2xl gap-3 sm:grid-cols-3">{IDEAS.map((idea, index) => <button key={idea.title} type="button" onClick={() => onPrompt(idea.prompt)} className="group overflow-hidden rounded-2xl border border-[#e2e6ec] bg-white text-left transition-all hover:-translate-y-1 hover:border-[#b6c1f7] hover:shadow-lg">
      <div className={`relative flex h-24 items-center justify-center overflow-hidden bg-gradient-to-br ${idea.tone}`} aria-hidden="true"><div className={`h-14 w-14 transition-transform duration-500 group-hover:scale-110 ${index === 0 ? "rounded-xl border border-white/70 bg-white/50 shadow-xl rotate-[-12deg]" : index === 1 ? "rounded-t-full rounded-b-[38%] bg-gradient-to-b from-white/80 to-white/10 shadow-xl" : "rotate-45 rounded-2xl border border-white/60 bg-white/40 shadow-xl"}`} /><span className="absolute right-3 top-3 text-xs text-slate-600/60">0{index + 1}</span></div>
      <div className="p-3.5"><span className="block text-xs font-semibold text-[#18212f]">{idea.title}</span><span className="mt-1 block text-[11px] text-[#8290a3]">{idea.label}</span></div>
    </button>)}</div>
  </div>;
}
