"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Language = "ru" | "en";
const LanguageContext = createContext<{ language: Language; setLanguage: (language: Language) => void }>({ language: "ru", setLanguage: () => {} });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("ru");
  useEffect(() => {
    try { if (localStorage.getItem("soop:language") === "en") setLanguageState("en"); } catch {}
  }, []);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const setLanguage = (value: Language) => {
    setLanguageState(value);
    try { localStorage.setItem("soop:language", value); } catch {}
  };
  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}

const EN: Record<string, string> = {
  "Чем могу": "How can I", "помочь?": "help?", "Я могу отвечать на вопросы, писать код, анализировать данные": "I can answer questions, write code, analyze data", "и многое другое.": "and much more.",
  "Напиши код на Python": "Write Python code", "Объясни квантовую физику": "Explain quantum physics", "Помоги с дизайном": "Help me with design", "Напишите сообщение...": "Write a message...", "Создать изображение": "Create image", "Начать чат": "Start chat", "Enter — отправить · Shift + Enter — новая строка": "Enter to send · Shift + Enter for a new line",
  "＋ Новый чат": "+ New chat", "Главная": "Home", "Планирование": "Planning", "Недавние чаты": "Recent chats", "Здесь появятся ваши чаты.": "Your chats will appear here.", "Открыть больше возможностей": "Unlock more possibilities", "Больше моделей, больше места для идей.": "More models, more room for ideas.", "Рабочее пространство": "Workspace", "☾ Тёмная": "☾ Dark", "☀ Светлая": "☀ Light",
  "Выберите план": "Choose a plan", "Получите доступ к продвинутым моделям AI": "Get access to advanced AI models", "Безлимитные запросы": "Unlimited requests", "Все бесплатные модели": "All free models", "Доступ к Pro моделям": "Access to Pro models", "Приоритетная поддержка": "Priority support", "Все Pro модели": "All Pro models", "Доступ к Boost моделям": "Access to Boost models", "Все модели": "All models", "Безлимитные сообщения": "Unlimited messages", "Все модели без ограничений": "All models without limits", "Выделенный менеджер": "Dedicated manager", "ПОПУЛЯРНЫЙ": "POPULAR", "Модели:": "Models:", "Продолжить с планом": "Continue with", "Для получения кода свяжитесь с нами в Telegram:": "Contact us on Telegram for a code:", "Назад к выбору плана": "Back to plans", "Активация подписки": "Activate subscription", "Введите промокод для активации плана": "Enter a promo code to activate", "Выбранный план": "Selected plan", "Стоимость": "Price", "Лимит:": "Limit:", "Безлимит": "Unlimited", "Код активации": "Activation code", "Введите промокод": "Enter promo code", "Проверка...": "Checking...", "Активировать": "Activate", "Нет кода? Свяжитесь с нами:": "No code? Contact us:", "Подписка активирована!": "Subscription activated!", "Перезагрузка страницы...": "Reloading...", "/мес": "/month",
  "Я могу отвечать на вопросы, писать код, анализировать данные и многое другое.": "I can answer questions, write code, analyze data and more.", "Чат": "Chat", "Лимит исчерпан...": "Limit reached...", "Опишите изображение: сюжет, стиль, свет, детали...": "Describe the image: subject, style, light, details...", "Отправить сообщение": "Send message", "Обновить план": "Upgrade plan", "Подписка": "Subscription", "запросов сегодня": "requests today", "Осталось": "Remaining", "Прикрепить изображение или файл": "Attach image or file",
};
export function useLanguage() {
  const context = useContext(LanguageContext);
  return { ...context, t: (text: string) => context.language === "en" ? (EN[text] || text) : text };
}
