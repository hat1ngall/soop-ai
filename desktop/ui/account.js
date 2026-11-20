import { element as el, button, api, call, $ } from "./dom";
import { PLUGINS } from "../../src/lib/plugins";

export function makeAccount({ tr, dialog, safe, refresh, prefs, changePrefs }) {
  function action(label, task, options) { return button(label, () => safe(task), options); }
  function form(handler, ...children) {
    return el("form", { className: "modal-form", onsubmit: (event) => {
      event.preventDefault();
      safe(handler);
    } }, ...children);
  }
  function submit(label) { return el("button", { className: "primary", type: "submit", textContent: label }); }
  function login(register = false) {
    const name = el("input", { placeholder: tr("Имя", "Name"), required: true, autocomplete: "name" });
    const email = el("input", { type: "email", placeholder: "Email", required: true, autocomplete: "email" });
    const password = el("input", { type: "password", placeholder: tr("Пароль", "Password"), required: true, autocomplete: register ? "new-password" : "current-password" });
    dialog(register ? tr("Регистрация", "Create account") : tr("Вход в Soop AI", "Sign in to Soop AI"),
      form(async () => {
        if (register) await api("auth/register", "POST", { name: name.value, email: email.value, password: password.value });
        const profile = await call("signin", email.value, password.value);
        $("overlay").close();
        await refresh(profile);
      }, register ? name : null, email, password, submit(register ? tr("Зарегистрироваться", "Sign up") : tr("Войти", "Sign in")),
      button(register ? tr("Уже есть аккаунт", "I have an account") : tr("Создать аккаунт", "Create an account"), () => login(!register))));
  }
  async function planning() {
    const reminders = await api("reminders");
    const subject = el("input", { required: true, maxLength: 500, placeholder: tr("О чём напомнить?", "What should we remind you about?") });
    const time = el("input", { type: "datetime-local", required: true, ariaLabel: tr("Дата и время", "Date and time") });
    dialog(tr("Планирование", "Planning"),
      form(async () => {
        await api("reminders", "POST", { subject: subject.value, remindAt: new Date(time.value).toISOString() });
        await planning();
      }, subject, time, submit(tr("Создать напоминание", "Create reminder"))),
      ...reminders.map((item) => el("div", { className: "group" }, el("div", { className: "sidebar-top" },
        el("strong", { textContent: item.subject }),
        action("×", async () => { await api("reminders/" + item.id, "DELETE"); await planning(); }, { title: tr("Удалить", "Delete") })),
        el("p", { textContent: new Date(item.remindAt).toLocaleString(prefs.lang) }),
        item.deliveredAt ? el("p", { textContent: item.message }) : null)));
  }
  async function plugins() {
    const { enabled } = await api("plugins");
    dialog(tr("Плагины", "Plugins"), ...PLUGINS.map((plugin) => {
      const active = enabled.includes(plugin.id);
      return el("div", { className: "group" }, el("div", { className: "sidebar-top" },
        el("strong", { textContent: plugin.name + " · " + plugin.domain }),
        action(active ? tr("Выключить", "Disable") : tr("Включить", "Enable"), async () => {
          await api("plugins", "PUT", { id: plugin.id, enabled: !active });
          await plugins();
        }, { className: active ? "outline" : "primary" })),
        el("p", { textContent: tr(plugin.description, englishPlugins[plugin.id]) }));
    }));
  }
  async function account(profile) {
    if (!profile) return login();
    const [plan, usage] = await Promise.all([api("user/me"), api("user/usage")]);
    const code = el("input", { placeholder: tr("Код активации", "Activation code"), required: true });
    const selectedPlan = el("select", { ariaLabel: tr("Тариф", "Plan") }, ...["pro", "boost", "enterprise"].map((value) => el("option", { value, textContent: value })));
    dialog(tr("Аккаунт и подписка", "Account and subscription"),
      el("div", { className: "group" }, el("strong", { textContent: profile.email }), el("p", {
        textContent: plan.plan.toUpperCase() + " · " + usage.used + " / " + (usage.limit === -1 ? "∞" : usage.limit),
      })),
      form(async () => { await api("activate", "POST", { code: code.value.trim(), selectedPlan: selectedPlan.value }); await refresh(); await account(profile); },
        code, selectedPlan, submit(tr("Активировать", "Activate"))),
      action(tr("Выйти", "Sign out"), async () => { await call("signout"); $("overlay").close(); }, { className: "outline" }));
  }
  const choice = (key, values) => el("select", {
    onchange: (event) => changePrefs(key, typeof prefs[key] === "number" ? Number(event.target.value) : event.target.value),
  }, ...values.map(([value, label]) => el("option", { value, textContent: label, selected: value === prefs[key] })));
  const check = (key) => el("input", { type: "checkbox", checked: prefs[key], onchange: (event) => changePrefs(key, event.target.checked) });
  const field = (label, control) => el("label", { className: "field inline" }, label, control);
  const group = (title, ...fields) => el("section", { className: "group" }, el("h3", { textContent: title }), ...fields);
  function settings(version) {
    dialog(tr("Настройки", "Settings"),
      group(tr("Приложение", "Application"),
        field(tr("Язык", "Language"), choice("lang", [["ru","Русский"],["en","English"]])),
        field(tr("Тема", "Theme"), choice("theme", [["dark",tr("Тёмная","Dark")],["graphite",tr("Графит","Graphite")]])),
        field(tr("Уведомления о завершении", "Completion notifications"), check("notify"))),
      group(tr("Чат", "Chat"),
        field(tr("Размер текста", "Text size"), choice("chatFont", [13,14,15,16,18,20].map((n) => [n,n+" px"]))),
        field(tr("Enter отправляет сообщение", "Enter sends messages"), check("enterSend")),
        field(tr("Локальная копия истории", "Keep a local history copy"), check("cache"))),
      group(tr("Редактор", "Editor"),
        field(tr("Размер шрифта", "Font size"), choice("editorFont", [12,13,14,15,16,18,20].map((n) => [n,n+" px"]))),
        field(tr("Размер отступа", "Tab size"), choice("tabSize", [2,4,8].map((n) => [n,String(n)]))),
        field(tr("Номера строк", "Line numbers"), check("lines")),
        field(tr("Перенос строк", "Line wrapping"), check("wrap")),
        field(tr("Автодополнение", "Autocomplete"), check("completion"))),
      group(tr("Файлы проекта", "Project files"),
        field(tr("Исключения по имени, через запятую", "Excluded names, comma separated"),
          el("input", { value: prefs.exclusions, onchange: (event) => changePrefs("exclusions", event.target.value) })),
        field(tr("Правки от модели", "Suggested edits"), choice("edits", [
          ["review",tr("С подтверждением", "Ask before applying")],["off",tr("Только чат", "Chat only")]])),
        field(tr("Запуск скриптов от модели", "Scripts suggested by the model"), choice("scripts", [
          ["confirm",tr("С подтверждением", "Ask before running")],["off",tr("Выключено", "Disabled")]]))),
      group(tr("Версия", "Version"), version,
        action(tr("Проверить обновления", "Check for updates"), async () => {
          const message = await call("checkUpdate");
          const info = el("p", { textContent: message ? tr("Версия доступна: ", "Version available: ") + message : tr("Обновлений нет.", "You’re up to date.") });
          if (message) info.append(action(tr("Установить", "Install"), () => call("installUpdate")));
          dialog(tr("Обновления", "Updates"), info);
        }, { className: "outline" })));
  }
  return { login, account, planning, plugins, settings };
}
const englishPlugins = {
  github: "Search public repositories", wikipedia: "Search encyclopedia articles",
  crossref: "Search academic publications", openlibrary: "Search books and authors",
  huggingface: "Search public AI models", context7: "Search library documentation",
  blockscout: "Search public Ethereum data",
};
