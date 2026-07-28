"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    if (!email.trim()) {
      setError("Введите email");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Некорректный формат email");
      return false;
    }
    if (!password) {
      setError("Введите пароль");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validate()) return;
    setLoading(true);

    const res = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Неверный email или пароль");
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fbfbfa] px-4 py-8">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-6 text-center sm:mb-8">
          <Link href="/" className="inline-block">
            <img src="/logo.svg" alt="Soop AI" className="mx-auto mb-4 h-12 w-12 rounded-xl border border-[#e9e9e7]" />
          </Link>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[#191919]">Вход в Soop AI</h1>
          <p className="mt-2 text-sm text-[#787774]">Продолжайте работу с вашего места.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-[#e9e9e7] bg-white p-5 sm:p-6">
          {error && (
            <div className="animate-shake rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-[#dcdcd8] bg-white px-3 py-2.5 text-sm text-[#191919] outline-none transition focus:border-[#9b9a97] focus:ring-2 focus:ring-[#191919]/5"
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
              className="w-full rounded-md border border-[#dcdcd8] bg-white px-3 py-2.5 text-sm text-[#191919] outline-none transition focus:border-[#9b9a97] focus:ring-2 focus:ring-[#191919]/5"
              placeholder="Минимум 6 символов"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[#191919] py-3 text-sm font-medium text-white transition-colors hover:bg-[#37352f] disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Вход...
              </span>
            ) : (
              "Войти"
            )}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500 sm:mt-6">
          Нет аккаунта?{" "}
          <Link href="/register" className="font-semibold text-slate-950 hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
}
