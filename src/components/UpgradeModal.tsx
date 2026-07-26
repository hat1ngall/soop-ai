"use client";

import { useState } from "react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Plan {
  id: string;
  name: string;
  price: string;
  color: string;
  gradient: string;
  features: string[];
  models: string[];
}

const ACTIVATION_TIMEOUT_MS = 20_000;

const PLANS: Plan[] = [
  {
    id: "pro",
    name: "Pro",
    price: "$9.99",
    color: "blue",
    gradient: "from-blue-500 to-blue-600",
    models: ["GPT 5.6 Sol", "Gemini 3.1 Pro"],
    features: [
      "100 сообщений в день",
      "Все бесплатные модели",
      "Доступ к Pro моделям",
      "Приоритетная поддержка",
    ],
  },
  {
    id: "boost",
    name: "Boost",
    price: "$19.99",
    color: "purple",
    gradient: "from-purple-500 to-purple-600",
    models: ["Claude Fable 5", "Claude Opus 5"],
    features: [
      "300 сообщений в день",
      "Все Pro модели",
      "Доступ к Boost моделям",
      "Приоритетная поддержка",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$49.99",
    color: "amber",
    gradient: "from-amber-500 to-orange-600",
    models: ["Все модели"],
    features: [
      "Безлимитные сообщения",
      "Все модели без ограничений",
      "API доступ",
      "Выделенный менеджер",
      "SLA 99.9%",
    ],
  },
];

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const [step, setStep] = useState<"select" | "activate">("select");
  const [selectedPlan, setSelectedPlan] = useState<string>("pro");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const currentPlan = PLANS.find((p) => p.id === selectedPlan) || PLANS[0];

  const handleActivate = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError("");

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), ACTIVATION_TIMEOUT_MS);

    try {
      const res = await fetch("/api/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), selectedPlan }),
        signal: controller.signal,
      });

      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await res.json()
        : { error: await res.text() };

      if (!res.ok) {
        setError(data.error || "Ошибка активации");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setStep("select");
        setCode("");
        setSuccess(false);
        window.location.reload();
      }, 2000);
    } catch (error) {
      setError(error instanceof DOMException && error.name === "AbortError" ? "Сервер долго не отвечает. Попробуйте ещё раз." : "Ошибка сети");
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setStep("select");
    setCode("");
    setSuccess(false);
    setError("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4 animate-fade-in">
      <div className="fixed inset-0 bg-slate-950/30 backdrop-blur-sm animate-fade-in" onClick={handleClose} />

      <div className="relative z-10 max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-[32px] border border-white/80 bg-white/90 shadow-[0_28px_90px_rgba(15,23,42,0.24)] backdrop-blur-2xl sm:rounded-[32px] animate-pop-in">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-slate-100 p-2 text-slate-400 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-200 hover:text-slate-900"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {success ? (
          <div className="p-8 text-center sm:p-12">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] bg-emerald-100">
              <svg className="h-10 w-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-950">Подписка активирована!</h3>
            <p className="mt-3 text-slate-500">Перезагрузка страницы...</p>
          </div>
        ) : step === "select" ? (
          <div className="p-6 sm:p-8">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-950">Выберите план</h2>
              <p className="mt-3 text-slate-500">
                Получите доступ к продвинутым моделям AI
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
              {PLANS.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative rounded-[28px] border-2 p-6 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(80,93,120,0.16)] ${
                    selectedPlan === plan.id
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white/70 hover:border-slate-300"
                  }`}
                >
                  {plan.id === "boost" && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-500 px-4 py-1 text-xs font-bold text-white shadow-lg">
                      ПОПУЛЯРНЫЙ
                    </div>
                  )}

                  <div className={`mb-4 text-xl font-bold ${selectedPlan === plan.id ? "text-white" : "text-slate-950"}`}>{plan.name}</div>

                  <div className="mb-6">
                    <span className={`text-4xl font-bold ${selectedPlan === plan.id ? "text-white" : "text-slate-950"}`}>{plan.price}</span>
                    <span className={selectedPlan === plan.id ? "text-white/50" : "text-slate-400"}>/мес</span>
                  </div>

                  {/* Доступные модели */}
                  <div className={`mb-4 rounded-2xl p-3 ${selectedPlan === plan.id ? "bg-white/10" : "bg-slate-50"}`}>
                    <div className={`mb-2 text-xs font-medium ${selectedPlan === plan.id ? "text-white/45" : "text-slate-400"}`}>Модели:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {plan.models.map((model, i) => (
                        <span key={i} className={`rounded-full px-2.5 py-1 text-xs ${selectedPlan === plan.id ? "bg-white/10 text-white/80" : "bg-white text-slate-600"}`}>
                          {model}
                        </span>
                      ))}
                    </div>
                  </div>

                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className={`flex items-start gap-3 text-sm ${selectedPlan === plan.id ? "text-white/75" : "text-slate-600"}`}>
                        <svg className={`mt-0.5 h-5 w-5 shrink-0 ${selectedPlan === plan.id ? "text-emerald-300" : "text-emerald-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {selectedPlan === plan.id && (
                    <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-4 ring-slate-950/10" />
                  )}
                </button>
              ))}
            </div>

            <div className="mt-8 flex flex-col items-center gap-4">
              <button
                onClick={() => setStep("activate")}
                className="w-full max-w-md rounded-2xl bg-slate-950 py-4 text-base font-semibold text-white shadow-[0_16px_35px_rgba(15,23,42,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 active:scale-[0.98]"
              >
                Продолжить с планом {currentPlan.name}
              </button>

              <p className="text-center text-sm text-slate-500">
                Для получения кода свяжитесь с нами в Telegram:{" "}
                <a href="https://t.me/mqqwk1" target="_blank" rel="noopener" className="font-semibold text-slate-950 hover:underline">
                  @mqqwk1
                </a>
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6 sm:p-8">
            <button
              onClick={() => setStep("select")}
              className="mb-6 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-950"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Назад к выбору плана
            </button>

            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-950">Активация подписки</h2>
              <p className="mt-3 text-slate-500">
                Введите промокод для активации плана{" "}
                <span className="font-semibold text-slate-950">{currentPlan.name}</span>
              </p>
            </div>

            <div className="mx-auto mb-8 max-w-md rounded-[28px] border border-slate-200 bg-slate-50/80 p-6">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Выбранный план</span>
                <span className="rounded-full bg-slate-950 px-4 py-1 text-sm font-bold text-white">
                  {currentPlan.name}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-slate-500">Стоимость</span>
                <span className="text-2xl font-bold text-slate-950">{currentPlan.price}<span className="text-slate-400">/мес</span></span>
              </div>
              <div className="mt-4 border-t border-slate-200 pt-4">
                <div className="text-xs text-slate-400">Лимит:</div>
                <div className="text-sm font-medium text-slate-950">
                  {currentPlan.id === "enterprise" ? "Безлимит" : currentPlan.features[0]}
                </div>
              </div>
            </div>

            <div className="mx-auto max-w-md">
              <label className="mb-3 block text-sm font-medium text-slate-500">Код активации</label>
                <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && code.trim()) handleActivate();
                }}
                placeholder="Введите промокод"
                className="w-full rounded-2xl border border-slate-200 bg-white px-6 py-4 text-center font-mono text-xl tracking-widest text-slate-950 outline-none transition-all duration-200 focus:border-slate-300 focus:shadow-[0_0_0_4px_rgba(251,191,36,0.12)]"
                autoFocus
              />

              {error && (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                onClick={handleActivate}
                disabled={!code.trim() || loading}
                className="mt-6 w-full rounded-2xl bg-slate-950 py-4 text-base font-semibold text-white shadow-[0_16px_35px_rgba(15,23,42,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Проверка...
                  </span>
                ) : (
                  "Активировать"
                )}
              </button>

              <p className="mt-6 text-center text-sm text-slate-500">
                Нет кода? Свяжитесь с нами:{" "}
                <a href="https://t.me/mqqwk1" target="_blank" rel="noopener" className="font-semibold text-slate-950 hover:underline">
                  @mqqwk1
                </a>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
