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
  "Ваши напоминания": "Your reminders",
  "Сегодня": "Today",
  "Предстоящие": "Upcoming",
  "Все напоминания": "All reminders",
  "Уже напомнили": "Delivered",
  "На сегодня напоминаний нет": "No reminders for today",
  "Предстоящих напоминаний нет": "No upcoming reminders",
  "Пока нет напоминаний": "No reminders yet",
  "Пока не было уведомлений": "No reminders delivered yet",
  "Разделы планирования": "Planning sections",
  "Идеи под контролем.": "Stay on top of your plans.",
  "Главное — вовремя.": "Right on time.",
  "SOOP AI / ПЛАНИРОВАНИЕ": "SOOP AI / PLANNING",
  "Разрешить уведомления и включить звук": "Allow notifications and enable sound",
  "Включить звук": "Enable sound",
  "Включить уведомления": "Enable notifications",
  "О чём напомнить?": "What should we remind you about?",
  "Добавить напоминание — например, позвонить врачу": "Add a reminder — for example, call the doctor",
  "Создаём…": "Creating…",
  "Добавить": "Add",
  "Дата и время": "Date and time",
  "1 запрос бесплатного тарифа": "Uses 1 free-plan request",
  "Здесь появятся напоминания после уведомления.": "Delivered reminders will appear here.",
  "Добавьте напоминание выше — мы сохраним его для вас.": "Add a reminder above and we will save it for you.",
  "Напомнили": "Delivered",
  "Ожидает": "Pending",
  "Удалить напоминание": "Delete reminder",
  "Напоминания с Soop AI": "Reminders with Soop AI",
  "Сайт должен оставаться открытым. Если время прошло, напомним при следующем открытии. Время указано по часовому поясу вашего устройства.": "Keep the site open to receive reminders. If the time has passed, we will remind you when you next open it. Times use your device’s time zone.",
  "Не удалось загрузить напоминания.": "Could not load reminders.",
  "Этот браузер не поддерживает уведомления. Напоминания появятся на сайте.": "This browser does not support notifications. Reminders will appear on the site.",
  "Уведомления включены. Держите сайт открытым для напоминаний.": "Notifications enabled. Keep the site open to receive reminders.",
  "Разрешите уведомления в настройках браузера. Напоминания также появятся на сайте.": "Allow notifications in your browser settings. Reminders will also appear on the site.",
  "Введите текст и выберите дату и время в будущем.": "Enter a reminder and select a future date and time.",
  "Не удалось создать напоминание.": "Could not create the reminder.",
  "Напоминание запланировано.": "Reminder scheduled.",
  "Не удалось удалить напоминание.": "Could not delete the reminder.",
  "Укажите текст до 500 символов и будущее время.": "Enter up to 500 characters and select a future time.",
  "Сервис нейросети временно недоступен.": "The AI service is temporarily unavailable.",
  "Дневной лимит запросов исчерпан. Оформите подписку для безлимитного доступа.": "Your daily request limit has been reached. Subscribe for unlimited access.",
  "Указанное время уже наступило. Выберите новое время.": "That time has already passed. Choose a new time.",
  "Не удалось создать напоминание. Попробуйте ещё раз.": "Could not create the reminder. Please try again.",
  "Не авторизован": "Not signed in",
  "Напоминание": "Reminder",
  "Напоминание Soop AI": "Soop AI reminder",
  "Закрыть": "Close",
  "SOOP AI / ИНСТРУМЕНТЫ": "SOOP AI / TOOLS",
  "Выберите сервисы для работы с нейросетью.": "Choose services to use with the AI assistant.",
  "подключено": "connected",
  "Открытые источники можно подключить без ключей. При их включении до 180 символов текущего сообщения отправляются выбранным сервисам для поиска; история чата и вложения не передаются.": "Open sources can be connected without API keys. When enabled, up to 180 characters of your current message are sent to the selected services for search; chat history and attachments are not shared.",
  "Искать плагины": "Search plugins",
  "Не удалось загрузить плагины. Обновите страницу.": "Could not load plugins. Refresh the page.",
  "Не удалось изменить настройки плагина. Попробуйте ещё раз.": "Could not update the plugin settings. Please try again.",
  "Загрузка…": "Loading…",
  "Плагины не найдены.": "No plugins found.",
  "БЕСПЛАТНО": "FREE",
  "Отключить": "Disconnect",
  "Подключить": "Connect",
  "Логотип": "Logo",
  "Разработка": "Development",
  "Знания": "Knowledge",
  "Наука": "Science",
  "Книги": "Books",
  "Данные и аналитика": "Data and analytics",
  "Википедия": "Wikipedia",
  "Поиск публичных репозиториев": "Search public repositories",
  "Открытые репозитории и их описания. Без доступа к аккаунту и приватным проектам.": "Public repositories and their descriptions. No access to accounts or private projects.",
  "Поиск статей энциклопедии": "Search encyclopedia articles",
  "Краткие выдержки и ссылки на статьи Википедии.": "Short excerpts and links to Wikipedia articles.",
  "Поиск научных публикаций": "Search academic publications",
  "Названия, авторы и ссылки DOI из открытого каталога научных публикаций.": "Titles, authors and DOI links from an open scholarly catalog.",
  "Поиск книг и авторов": "Search books and authors",
  "Открытый каталог книг, авторов и ссылок Open Library.": "An open catalog of books, authors and Open Library links.",
  "Поиск публичных AI-моделей": "Search public AI models",
  "Открытый каталог моделей Hugging Face. Без доступа к личному аккаунту.": "The public Hugging Face model catalog. No access to personal accounts.",
  "Поиск по документации библиотек": "Search library documentation",
  "Поиск примеров и текстов документации без ключа; возможны ограничения числа запросов.": "Search documentation and examples without a key; rate limits may apply.",
  "Поиск публичных данных Ethereum": "Search public Ethereum data",
  "Поиск адресов и токенов в открытом обозревателе Ethereum. Без доступа к кошелькам.": "Search addresses and tokens in a public Ethereum explorer. No access to wallets.",
  "Чем могу": "How can I", "помочь?": "help?", "Я могу отвечать на вопросы, писать код, анализировать данные": "I can answer questions, write code, analyze data", "и многое другое.": "and much more.",
  "Напиши код на Python": "Write Python code", "Объясни квантовую физику": "Explain quantum physics", "Помоги с дизайном": "Help me with design", "Напишите сообщение...": "Write a message...", "Создать изображение": "Create image", "Начать чат": "Start chat", "Enter — отправить · Shift + Enter — новая строка": "Enter to send · Shift + Enter for a new line",
  "＋ Новый чат": "+ New chat", "Главная": "Home", "Планирование": "Planning", "Плагины": "Plugins", "Недавние чаты": "Recent chats", "Здесь появятся ваши чаты.": "Your chats will appear here.", "Открыть больше возможностей": "Unlock more possibilities", "Больше моделей, больше места для идей.": "More models, more room for ideas.", "Рабочее пространство": "Workspace", "☾ Тёмная": "☾ Dark", "☀ Светлая": "☀ Light",
  "Выберите план": "Choose a plan", "Получите доступ к продвинутым моделям AI": "Get access to advanced AI models", "Безлимитные запросы": "Unlimited requests", "Все бесплатные модели": "All free models", "Доступ к Pro моделям": "Access to Pro models", "Приоритетная поддержка": "Priority support", "Все Pro модели": "All Pro models", "Доступ к Boost моделям": "Access to Boost models", "Все модели": "All models", "Безлимитные сообщения": "Unlimited messages", "Все модели без ограничений": "All models without limits", "Выделенный менеджер": "Dedicated manager", "ПОПУЛЯРНЫЙ": "POPULAR", "Модели:": "Models:", "Продолжить с планом": "Continue with", "Для получения кода свяжитесь с нами в Telegram:": "Contact us on Telegram for a code:", "Назад к выбору плана": "Back to plans", "Активация подписки": "Activate subscription", "Введите промокод для активации плана": "Enter a promo code to activate", "Выбранный план": "Selected plan", "Стоимость": "Price", "Лимит:": "Limit:", "Безлимит": "Unlimited", "Код активации": "Activation code", "Введите промокод": "Enter promo code", "Проверка...": "Checking...", "Активировать": "Activate", "Нет кода? Свяжитесь с нами:": "No code? Contact us:", "Подписка активирована!": "Subscription activated!", "Перезагрузка страницы...": "Reloading...", "/мес": "/month",
  "Я могу отвечать на вопросы, писать код, анализировать данные и многое другое.": "I can answer questions, write code, analyze data and more.", "Чат": "Chat", "Лимит исчерпан...": "Limit reached...", "Опишите изображение: сюжет, стиль, свет, детали...": "Describe the image: subject, style, light, details...", "Отправить сообщение": "Send message", "Обновить план": "Upgrade plan", "Подписка": "Subscription", "запросов сегодня": "requests today", "Осталось": "Remaining", "Прикрепить изображение или файл": "Attach image or file",
};
export function useLanguage() {
  const context = useContext(LanguageContext);
  return { ...context, t: (text: string) => context.language === "en" ? (EN[text] || text) : text };
}
