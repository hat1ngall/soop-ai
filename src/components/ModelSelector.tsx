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
}

const MODELS: Model[] = [
  // Free
  { id: "gemini-flash-3.5", name: "Gemini Flash 3.5", tier: "free", icon: "✦" },
  { id: "minimax-2.5",      name: "Minimax 2.5",      tier: "free", icon: "◈" },
  { id: "claude-sonnet-4.6", name: "Claude Sonnet 4.6", tier: "free", icon: "◉" },
  { id: "llama-4-scout",    name: "Llama 4 Scout",    tier: "free", icon: "◆" },
  // Pro
  { id: "gpt-5.6-sol",      name: "GPT 5.6 Sol",      tier: "pro", icon: "★" },
  { id: "gemini-3.1-pro",   name: "Gemini 3.1 Pro",   tier: "pro", icon: "✦" },
  // Boost
  { id: "claude-fable-5",   name: "Claude Fable 5",   tier: "boost", icon: "★" },
  { id: "claude-opus-5",    name: "Claude Opus 5",     tier: "boost", icon: "★" },
];

function canAccessModel(plan: string, modelTier: string): boolean {
  const tierOrder = ["free", "pro", "boost", "enterprise"];
  const planIdx = tierOrder.indexOf(plan);
  const modelIdx = tierOrder.indexOf(modelTier);
  return planIdx >= modelIdx;
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
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
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

  const getRequiredPlan = (tier: string): string => {
    if (tier === "pro") return "Pro";
    if (tier === "boost") return "Boost";
    return "";
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full border border-white/20 bg-[#2f2f2f] px-4 py-2 text-sm text-white transition-all hover:bg-[#3a3a3a]"
      >
        <span>{selected.icon}</span>
        <span>{selected.name}</span>
        <svg className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-1/2 top-full z-50 mt-2 w-72 -translate-x-1/2 overflow-hidden rounded-2xl border border-white/10 bg-[#2f2f2f] shadow-2xl">
          <div className="p-2">
            <div className="mb-1 px-3 py-2 text-xs font-medium text-gray-500">
              Бесплатные модели
            </div>
            {MODELS.filter((m) => m.tier === "free").map((model) => (
              <button
                key={model.id}
                onClick={() => handleSelect(model)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                  selected.id === model.id
                    ? "bg-white text-black"
                    : "text-gray-300 hover:bg-white/10"
                }`}
              >
                <span className="text-lg">{model.icon}</span>
                <span className="text-sm font-medium">{model.name}</span>
              </button>
            ))}
          </div>

          <div className="border-t border-white/10 p-2">
            <div className="mb-1 px-3 py-2 text-xs font-medium text-gray-500">
              Pro модели
            </div>
            {MODELS.filter((m) => m.tier === "pro").map((model) => {
              const hasAccess = canAccessModel(currentPlan, model.tier);
              return (
                <button
                  key={model.id}
                  onClick={() => handleSelect(model)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                    selected.id === model.id
                      ? "bg-white text-black"
                      : "text-gray-300 hover:bg-white/10"
                  }`}
                >
                  <span className="text-lg">{model.icon}</span>
                  <span className="text-sm font-medium">{model.name}</span>
                  {!hasAccess && (
                    <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-gray-400">
                      {getRequiredPlan(model.tier)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="border-t border-white/10 p-2">
            <div className="mb-1 px-3 py-2 text-xs font-medium text-gray-500">
              Boost модели
            </div>
            {MODELS.filter((m) => m.tier === "boost").map((model) => {
              const hasAccess = canAccessModel(currentPlan, model.tier);
              return (
                <button
                  key={model.id}
                  onClick={() => handleSelect(model)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                    selected.id === model.id
                      ? "bg-white text-black"
                      : "text-gray-300 hover:bg-white/10"
                  }`}
                >
                  <span className="text-lg">{model.icon}</span>
                  <span className="text-sm font-medium">{model.name}</span>
                  {!hasAccess && (
                    <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-gray-400">
                      {getRequiredPlan(model.tier)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
