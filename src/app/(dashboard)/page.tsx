"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const starters = [{ icon: "✦", title: "Spark an idea", text: "Start from a blank page" }, { icon: "▱", title: "Read a document", text: "Find what matters fast" }, { icon: "⌘", title: "Build a solution", text: "Turn a thought into a plan" }];

export default function DashboardPage() {
  const router = useRouter(); const { data: session, status } = useSession(); const [prompt, setPrompt] = useState(""); const [creating, setCreating] = useState(false);
  useEffect(() => { if (status === "unauthenticated") router.replace("/login"); }, [status, router]);
  const startChat = async (value = prompt, imageMode = false) => { if (creating) return; setCreating(true); try { const text = value.trim(); const response = await fetch("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: text.slice(0, 42) || "New chat", model: "claude-opus-5.5" }) }); if (!response.ok) return; const chat = await response.json(); if (text) sessionStorage.setItem("soop:pending-prompt", text); if (imageMode) sessionStorage.setItem("soop:pending-mode", "image"); router.push(`/chat/${chat.id}`); } finally { setCreating(false); } };
  if (status === "loading") return <div className="flex h-full items-center justify-center"><span className="h-5 w-5 animate-spin rounded-full border-2 border-[#d5dbe5] border-t-[#4662f0]" /></div>;
  if (!session) return null;
  const firstName = session.user?.name?.split(" ")[0] || "there";
  return (
    <div className="home-canvas">
      <section className="home-inner animate-slide-up">
        <div className="home-eyebrow"><span className="home-spark">✳</span> YOUR AI WORKSPACE <span className="home-eyebrow-line" /></div>
        <h1 className="home-title">Good to see you,<br /><span>{firstName}.</span></h1>
        <p className="home-intro">Bring a question, a file, or a half-formed idea.<br className="hidden sm:block" /> Let's make something of it.</p>
        <div className="home-composer">
          <label className="sr-only" htmlFor="home-prompt">What would you like to work on?</label>
          <textarea id="home-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void startChat(); } }} placeholder="What would you like to work on?" rows={3} />
          <div className="home-composer-actions">
            <button type="button" onClick={() => void startChat(prompt, true)} disabled={creating} className="home-image-button"><span>✧</span> Создать изображение</button>
            <button type="button" onClick={() => void startChat()} disabled={creating} className="home-send" aria-label="Start chat">↗</button>
          </div>
        </div>
        <div className="home-helper"><span>YOUR SPACE TO THINK</span><span>Enter to send · Shift + Enter for a new line</span></div>
        <div className="home-starters-heading"><span>NEED A STARTING POINT?</span><span>01 — 03</span></div>
        <div className="home-starters">{starters.map((starter, index) => <button key={starter.title} type="button" onClick={() => setPrompt(starter.title)} className="home-starter"><span className="home-starter-top"><span className="home-starter-icon">{starter.icon}</span><span>0{index + 1} / 03</span></span><span className="home-starter-title">{starter.title}<span>↗</span></span><span className="home-starter-text">{starter.text}</span></button>)}</div>
      </section>
      <div className="home-orbit" aria-hidden="true"><span>✳</span></div>
    </div>
  );
}
