"use client";

import { useLanguage } from "@/components/LanguageProvider";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const starters = [
  { icon: "⌘", title: "CODE", text: "Напиши код на Python", tone: "code" },
  { icon: "✳", title: "EXPLAIN", text: "Объясни квантовую физику", tone: "explain" },
  { icon: "◉", title: "DESIGN", text: "Помоги с дизайном", tone: "design" },
];

export default function DashboardPage() {
  const { t } = useLanguage();
  const router = useRouter(); const { data: session, status } = useSession(); const [prompt, setPrompt] = useState(""); const [creating, setCreating] = useState(false);
  useEffect(() => { if (status === "unauthenticated") router.replace("/login"); }, [status, router]);
  const startChat = async (value = prompt, imageMode = false) => { if (creating) return; setCreating(true); try { const text = value.trim(); const response = await fetch("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: text.slice(0, 42) || "New chat", model: "claude-opus-5.5" }) }); if (!response.ok) return; const chat = await response.json(); if (text) sessionStorage.setItem("soop:pending-prompt", text); if (imageMode) sessionStorage.setItem("soop:pending-mode", "image"); router.push(`/chat/${chat.id}`); } finally { setCreating(false); } };
  if (status === "loading") return <div className="flex h-full items-center justify-center"><span className="h-5 w-5 animate-spin rounded-full border-2 border-[#d5dbe5] border-t-[#4662f0]" /></div>;
  if (!session) return null;
  return (
    <div className="reference-home">
      <section className="reference-home-content animate-slide-up">
        <div className="reference-logo"><img src="/logo.svg" alt="Soop AI" /></div>
        <h1>{t("Чем могу")} <span>{t("помочь?")}</span></h1>
        <p className="reference-intro">{t("Я могу отвечать на вопросы, писать код, анализировать данные")}<br className="hidden sm:block" /> {t("и многое другое.")}</p>
        <div className="reference-starters">{starters.map((starter) => <button type="button" key={starter.title} onClick={() => setPrompt(t(starter.text))} className={`reference-card ${starter.tone}`}><span className="reference-card-icon">{starter.icon}</span><span className="reference-card-label">{starter.title}</span><span className="reference-card-text">{t(starter.text)}</span><span className="reference-card-arrow" aria-hidden="true">→</span></button>)}</div>
        <div className="reference-composer">
          <label htmlFor="home-prompt" className="sr-only">Напишите сообщение</label>
          <textarea id="home-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void startChat(); } }} placeholder={t("Напишите сообщение...")} rows={2} />
          <div className="reference-composer-actions"><button type="button" onClick={() => void startChat(prompt, true)} disabled={creating} className="reference-image-button">✧ <span>{t("Создать изображение") }</span></button><button type="button" onClick={() => void startChat()} disabled={creating} aria-label={t("Начать чат")} className="reference-send">→</button></div>
        </div>
        <p className="reference-helper">{t("Enter — отправить · Shift + Enter — новая строка") }</p>
      </section>
    </div>
  );
}
