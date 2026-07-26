"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    if (!name.trim()) {
      setError("Введите имя");
      return false;
    }
    if (name.trim().length < 2) {
      setError("Имя минимум 2 символа");
      return false;
    }
    if (!email.trim()) {
      setError("Введите email");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Некорректный формат email");
      return false;
    }
    if (password.length < 6) {
      setError("Пароль минимум 6 символов");
      return false;
    }
    if (password !== confirm) {
      setError("Пароли не совпадают");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validate()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ошибка регистрации");
        setLoading(false);
        return;
      }

      const loginRes = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      setLoading(false);

      if (loginRes?.error) {
        setError("Аккаунт создан. Теперь войдите.");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Ошибка сети. Попробуйте позже.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-6 text-center sm:mb-8">
          <Link href="/" className="inline-block">
            <img src="/logo.svg" alt="Soop AI" className="mx-auto mb-4 h-14 w-14 rounded-2xl shadow-[0_16px_40px_rgba(80,93,120,0.18)]" />
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Регистрация</h1>
          <p className="mt-2 text-sm text-slate-500">Создайте аккаунт в Soop AI</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 rounded-[28px] border border-white/80 bg-white/75 p-5 shadow-[0_24px_70px_rgba(80,93,120,0.14)] backdrop-blur-xl sm:p-6">
          {error && (
            <div className="animate-shake rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Имя</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-slate-300 focus:shadow-[0_0_0_4px_rgba(251,191,36,0.12)]"
              placeholder="Ваше имя"
              autoComplete="name"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-slate-300 focus:shadow-[0_0_0_4px_rgba(251,191,36,0.12)]"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-slate-300 focus:shadow-[0_0_0_4px_rgba(251,191,36,0.12)]"
              placeholder="Минимум 6 символов"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Подтвердите пароль</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-slate-300 focus:shadow-[0_0_0_4px_rgba(251,191,36,0.12)]"
              placeholder="Повторите пароль"
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-slate-950 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Создание...
              </span>
            ) : (
              "Создать аккаунт"
            )}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500 sm:mt-6">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="font-semibold text-slate-950 hover:underline">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
