"use client";

import { useState, useRef, useEffect } from "react";

interface ModelSelectorProps {
  selectedModel: string;
  onSelect: (model: string) => void;
  currentPlan: string;
  onUpgradeRequest: () => void;
}

interface Model {
  id: string;
  name: string;
  tier: "free" | "pro" | "boost" | "enterprise";
  icon: string;
  iconColor: string;
}

const MODELS: Model[] = [
  // Free
  { id: "gemini-flash-3.5", name: "Gemini 3.5 Flash", tier: "free", icon: "✦", iconColor: "text-blue-500" },
  { id: "minimax-2.5", name: "Minimax 2.5", tier: "free", icon: "◆", iconColor: "text-gray-400" },
  { id: "llama-4-scout", name: "Llama 4 Scout", tier: "free", icon: "◆", iconColor: "text-orange-400" },
  // Pro
  { id: "claude-sonnet-4.6", name: "Sonnet 4.6", tier: "pro", icon: "✳", iconColor: "text-orange-500" },
  { id: "gpt-5.2", name: "GPT-5.2", tier: "pro", icon: "◎", iconColor: "text-gray-400" },
  { id: "gpt-5.4", name: "GPT-5.4", tier: "pro", icon: "◎", iconColor: "text-gray-400" },
  { id: "gpt-5.6-sol", name: "GPT-5.6 Sol", tier: "pro", icon: "◎", iconColor: "text-gray-400" },
  // Boost
  { id: "claude-sonnet-5", name: "Sonnet 5", tier: "boost", icon: "✳", iconColor: "text-orange-500" },
  { id: "claude-opus-4.7", name: "Opus 4.7", tier: "boost", icon: "✳", iconColor: "text-orange-500" },
  { id: "claude-opus-4.8", name: "Opus 4.8", tier: "boost", icon: "✳", iconColor: "text-orange-500" },
  { id: "claude-opus-5", name: "Opus 5", tier: "boost", icon: "✳", iconColor: "text-orange-500" },
  { id: "claude-fable-5", name: "Fable 5", tier: "boost", icon: "✳", iconColor: "text-orange-400" },
  { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro", tier: "boost", icon: "✦", iconColor: "text-blue-500" },
  { id: "gpt-5.6-terra", name: "GPT-5.6 Terra", tier: "boost", icon: "◎", iconColor: "text-gray-400" },
  { id: "gpt-5.5", name: "GPT-5.5", tier: "boost", icon: "◎", iconColor: "text-gray-400" },
  // Enterprise
  { id: "grok-4.3", name: "Grok 4.3", tier: "enterprise", icon: "⊗", iconColor: "text-gray-400" },
  { id: "grok-4.5", name: "Grok 4.5", tier: "enterprise", icon: "⊗", iconColor: "text-gray-400" },
  { id: "grok-build-0.1", name: "Grok Build 0.1", tier: "enterprise", icon: "⊗", iconColor: "text-gray-400" },
  { id: "kimi-k2.6", name: "Kimi K2.6", tier: "enterprise", icon: "≋", iconColor: "text-gray-400" },
  { id: "kimi-k2.7-code", name: "Kimi K2.7 Code", tier: "enterprise", icon: "≋", iconColor: "text-gray-400" },
  { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro", tier: "enterprise", icon: "≋", iconColor: "text-gray-400" },
  { id: "glm-5.2", name: "GLM 5.2", tier: "enterprise", icon: "≋", iconColor: "text-gray-400" },
];

function canAccessModel(plan: string, modelTier: string): boolean {
  const tierOrder = ["free", "pro", "boost", "enterprise"];
  return tierOrder.indexOf(plan) >= tierOrder.indexOf(modelTier);
}

export function ModelSelector({
  selectedModel,
  onSelect,
  currentPlan,
  onUpgradeRequest,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = MODELS.find((m) => m.id === selectedModel) || MODELS[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (model: Model) => {
    if (!canAccessModel(currentPlan, model.tier)) {
      onUpgradeRequest();
      setOpen(false);
      return;
    }
    onSelect(model.id);
    setOpen(false);
  };

  const Section = ({ title, badge, models }: { title: string; badge?: string; models: Model[] }) => (
    <div className="border-t border-white/10 p-2">
      <div className="mb-1 flex items-center gap-2 px-3 py-1.5">
        <span className="text-[11px] font-medium text-gray-500">{title}</span>
        {badge && <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-gray-400">{badge}</span>}
      </div>
      {models.map((model) => {
        const hasAccess = canAccessModel(currentPlan, model.tier);
        return (
          <button
            key={model.id}
            onClick={() => handleSelect(model)}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-all ${
              selected.id === model.id
                ? "bg-white text-black"
                : hasAccess
                  ? "text-gray-300 hover:bg-white/10"
                  : "text-gray-500 hover:bg-white/5"
            }`}
          >
            <span className={`text-base ${model.iconColor}`}>{model.icon}</span>
            <span className="text-sm">{model.name}</span>
            {!hasAccess && (
              <span className="ml-auto rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-bold text-gray-600">
                {model.tier.toUpperCase()}
              </span>
            )}
            {selected.id === model.id && (
              <svg className="ml-auto h-4 w-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full border border-white/20 bg-[#2f2f2f] px-4 py-2 text-sm text-white transition-all hover:bg-[#3a3a3a]"
      >
        <span className={selected.iconColor}>{selected.icon}</span>
        <span>{selected.name}</span>
        <svg className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-1/2 top-full z-50 mt-2 w-72 -translate-x-1/2 overflow-hidden rounded-2xl border border-white/10 bg-[#2f2f2f] shadow-2xl">
          <div className="max-h-[60vh] overflow-y-auto">
            <div className="p-2">
              <div className="mb-1 px-3 py-1.5 text-[11px] font-medium text-gray-500">Free</div>
              {MODELS.filter((m) => m.tier === "free").map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleSelect(model)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-all ${
                    selected.id === model.id ? "bg-white text-black" : "text-gray-300 hover:bg-white/10"
                  }`}
                >
                  <span className={`text-base ${model.iconColor}`}>{model.icon}</span>
                  <span className="text-sm">{model.name}</span>
                  {selected.id === model.id && <svg className="ml-auto h-4 w-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                </button>
              ))}
            </div>
            <Section title="Pro" badge="Pro" models={MODELS.filter((m) => m.tier === "pro")} />
            <Section title="Boost" badge="Boost" models={MODELS.filter((m) => m.tier === "boost")} />
            <Section title="Enterprise" badge="All" models={MODELS.filter((m) => m.tier === "enterprise")} />
          </div>
        </div>
      )}
    </div>
  );
}
