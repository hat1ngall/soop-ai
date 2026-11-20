import { $, element as el, button, call, api, icon } from "./dom";
import { makeWorkspace } from "./workspace";
import { makeAccount } from "./account";
import { MODEL_LIST } from "../../src/lib/model-catalog";
import { processFile } from "../../src/lib/attachments";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server.browser";
import Markdown, { defaultUrlTransform } from "react-markdown";

const defaults = { lang: "ru", theme: "dark", notify: true, cache: true, enterSend: true,
  chatFont: 15, editorFont: 14, tabSize: 2, lines: true, wrap: false, completion: true, edits: "review", scripts: "confirm", exclusions: "" };
function loadPrefs() {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem("soop-preferences")) }; } catch { return { ...defaults }; }
}
const prefs = loadPrefs();
const tr = (ru, en) => prefs.lang === "en" ? en : ru;
const setStatus = (message, error = false) => { $("status").textContent = message; $("status").classList.toggle("error", error); };
let profile, plan = "free", usage, version = "", root, recents = [], mode = "chat";
let chats = [], chatId, messages = [], pending = false, attachments = [], imageMode = false, activeStream;
let loadSequence = 0;
let model = MODEL_LIST[0];

function dialog(title, ...children) {
  const overlay = $("overlay");
  overlay.replaceChildren(el("div", { className: "modal-head" }, el("h2", { textContent: title }),
    button("×", () => overlay.close(), { title: tr("Закрыть", "Close") })),
    el("p", { className: "error", id: "overlay-error", role: "alert", hidden: true }), ...children);
  if (!overlay.open) overlay.showModal();
}
async function safe(task) {
  try { return await task(); } catch (error) {
    const message = error.message.replace(/^Error invoking remote method '[^']+': Error: /, "");
    setStatus(message, true);
    if ($("overlay").open && $("overlay-error")) {
      $("overlay-error").textContent = message;
      $("overlay-error").hidden = false;
    }
  }
}
const click = (label, fn, attrs) => button(label, () => safe(fn), attrs);
const account = makeAccount({ tr, dialog, safe, refresh, prefs, changePrefs });
const workspace = makeWorkspace({ tr, prefs, safe, dialog, setStatus, attach });

function theme() {
  document.documentElement.lang = prefs.lang;
  document.documentElement.dataset.theme = prefs.theme;
  document.documentElement.style.setProperty("--editor-font", prefs.editorFont + "px");
  document.documentElement.style.setProperty("--chat-font", prefs.chatFont + "px");
}
async function changePrefs(key, value) {
  prefs[key] = value;
  localStorage.setItem("soop-preferences", JSON.stringify(prefs));
  if (key === "exclusions") await sendExclusions();
  if (key === "cache" && !value) await call("clearCache");
  theme();
  render();
  workspace.render();
  if (key === "lang") account.settings(version);
}
function sendExclusions() { return call("exclusions", prefs.exclusions.split(",").map((name) => name.trim()).filter(Boolean)); }
function cache(id, value) { return prefs.cache ? call("cache", profile?.id, id, value).catch(() => null) : Promise.resolve(null); }
function newChat() {
  loadSequence++;
  chatId = null;
  messages = [];
  attachments = [];
  render();
  $("prompt").focus();
}
async function openChat(id) {
  if (pending) return;
  const sequence = ++loadSequence;
  chatId = id;
  attachments = [];
  messages = [];
  render();
  const snapshot = await cache(id);
  if (sequence !== loadSequence) return;
  if (snapshot) { messages = snapshot; renderMessages(); }
  const fresh = await api("sessions/" + id + "/messages");
  if (sequence !== loadSequence) return;
  messages = fresh;
  renderMessages();
  await cache(id, fresh);
}
async function removeChat(id) {
  if (!window.confirm(tr("Удалить чат из общей истории?", "Delete the chat from your synced history?"))) return;
  await api("sessions/" + id, "DELETE");
  await cache(id, null);
  if (chatId === id) newChat();
  await loadChats();
}
async function loadChats() {
  if (!profile) return;
  const owner = profile.id;
  const list = await api("sessions");
  if (profile?.id !== owner) return;
  chats = list;
  await cache("index", list);
  renderSidebar();
}
async function refresh(result) {
  const data = result || await call("profile");
  profile = data.user || null;
  render();
  if (!profile) return;
  const owner = profile.id;
  const snapshot = await cache("index");
  if (profile?.id !== owner) return;
  if (snapshot) { chats = snapshot; renderSidebar(); }
  const [sub, quota] = await Promise.all([api("user/me"), api("user/usage"), loadChats()]);
  if (profile?.id !== owner) return;
  plan = sub.plan;
  usage = quota;
  if (!modelAllowed(model)) model = MODEL_LIST[0];
  render();
}
async function openRoot(recent) {
  const project = await call("root", recent);
  if (!project) return;
  root = project.root;
  recents = project.recents;
  mode = "project";
  workspace.setRoot(root);
  render();
}
const filename = (path) => path.split(/[\\/]/).pop();
function switchMode(next) {
  if (next === "project" && !root) return openRoot();
  mode = next;
  render();
  if (mode === "project") workspace.render();
}
function renderSidebar() {
  const sidebar = $("sidebar");
  const entries = [];
  if (mode === "project") {
    const files = el("div", { id: "project-files" });
    entries.push(el("div", { className: "sidebar-top" },
      el("strong", { textContent: tr("Проводник", "Explorer") }), el("div", { className: "tools" },
        click("＋", () => workspace.create(files), { title: tr("Создать файл или папку", "Create file or folder") }),
        click("↻", () => workspace.browse(files), { title: tr("Обновить", "Refresh") }))), files);
    queueMicrotask(() => safe(() => workspace.browse(files)));
  }
  entries.push(el("div", { className: "sidebar-top" },
    el("strong", { textContent: tr("Чаты", "Chats") }),
    button("＋", newChat, { disabled: pending, title: tr("Новый чат", "New chat") })));
  if (!profile) entries.push(button(tr("Войти", "Sign in"), () => account.login(), { className: "primary list-button" }));
  for (const chat of chats) entries.push(el("div", { className: "row" },
    click(chat.title, () => openChat(chat.id), { title: chat.title, disabled: pending, className: chatId === chat.id ? "active" : "" }),
    click("×", () => removeChat(chat.id), { disabled: pending, title: tr("Удалить чат", "Delete chat") })));
  if (recents.length && mode === "chat") {
    entries.push(el("div", { textContent: tr("Недавние проекты", "Recent projects"), className: "section-label" }));
    for (const dir of recents) entries.push(click("▸  " + filename(dir), () => openRoot(dir), { title: dir, className: "list-button" }));
  }
  sidebar.replaceChildren(...entries);
}

function modelAllowed(item) { return ["free","pro","boost","enterprise"].indexOf(plan) >= ["free","pro","boost","enterprise"].indexOf(item.tier); }
function modelIcon(item) { return el("img", { src: "." + item.icon, alt: "" }); }
function renderModels() {
  $("model").replaceChildren(modelIcon(model), model.name, icon("down"));
  $("model-menu").replaceChildren(...["free", "pro", "boost", "enterprise"].map((tier) => {
    const section = el("section", { className: "model-group" }, el("div", { className: "model-tier", textContent: tier.toUpperCase() }));
    section.append(...MODEL_LIST.filter((item) => item.tier === tier).map((item) => {
    const node = button("", () => {
      if (!modelAllowed(item)) { $("model-menu").hidden = true; safe(() => account.account(profile)); return; }
      model = item;
      $("model-menu").hidden = true;
      renderModels();
    }, { title: item.name + " · " + item.tier.toUpperCase() });
    node.append(modelIcon(item), item.name);
      return node;
    }));
    return section;
  }));
}
function imageData(content) {
  if (!content.startsWith("{")) return null;
  try { const item = JSON.parse(content); return item.type === "generated_image" && typeof item.imageId === "string" ? item : null; } catch { return null; }
}
const imageCache = new Map();
function richText(content) {
  const body = el("div", { className: "markdown" });
  const readable = content.replace(/<<<FILE:(.*?)>>>\n?([\s\S]*?)\n?<<<END_FILE>>>/g, (_all, name) => "\n\n📎 " + name + "\n\n");
  body.innerHTML = renderToStaticMarkup(createElement(Markdown, {
    skipHtml: true,
    urlTransform: (url, attr) => attr === "src" ? (/^data:image\/(?:png|jpe?g|webp|gif);base64,[\w+/=]+$/i.test(url) ? url : "") : defaultUrlTransform(url),
  }, readable));
  body.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (!link) return;
    event.preventDefault();
    safe(() => call("openLink", link.getAttribute("href")));
  });
  return body;
}
function renderMessages() {
  const panel = $("messages");
  if (!messages.length) {
    panel.replaceChildren(el("div", { className: "empty" }, el("img", { src: "logo.svg", alt: "" }),
      el("h1", { textContent: mode === "project" ? tr("Чем помочь с проектом?", "What are we building?") : tr("Чем помочь?", "How can I help?") }),
      el("p", { textContent: mode === "project" ? filename(root) : tr("Чат, изображения и работа с файлами.", "Chat, images and project work.") }),
      el("div", { className: "empty-actions" },
        !profile ? button(tr("Войти в Soop AI", "Sign in to Soop AI"), () => account.login(), { className: "primary" }) : null,
        mode === "chat" ? click(tr("Открыть проект", "Open project"), () => openRoot(), { className: "outline" }) : null)));
    return;
  }
  panel.replaceChildren(...messages.map((item) => {
    const image = imageData(item.content);
    const label = item.role === "user" ? tr("Вы", "You") : item.role === "action" ? tr("Проект", "Project") : "Soop AI";
    const article = el("article", { className: "message " + item.role }, el("small", { textContent: label }));
    if (image) {
      const figure = el("img", { alt: image.prompt });
      article.append(el("p", { textContent: image.prompt }), figure);
      if (!imageCache.has(image.imageId)) imageCache.set(image.imageId, call("image", image.imageId).catch(() => { imageCache.delete(image.imageId); return ""; }));
      imageCache.get(image.imageId).then((src) => { if (src) figure.src = src; });
    } else {
      article.append(item.streaming || !item.content
        ? el("p", { textContent: item.content || tr("Думает…", "Thinking…") })
        : richText(item.content));
      const edit = prefs.edits === "review" && mode === "project" && item.role === "assistant" && /^\s*\x60\x60\x60soop-edit\s+([\s\S]+?)\s*\x60\x60\x60\s*$/.exec(item.content);
      if (edit && !item.streaming) article.append(click(tr("Проверить правку", "Review edit"), () => inspectEdit(edit[1]), { className: "outline" }));
      const script = prefs.scripts === "confirm" && mode === "project" && item.role === "assistant" &&
        /^\s*\x60\x60\x60soop-run\s+([a-zA-Z0-9][\w:-]{0,79})\s*\x60\x60\x60\s*$/.exec(item.content);
      if (script && !item.streaming) article.append(click("npm run " + script[1], async () => {
        if (await workspace.runScript(script[1])) {
          messages.push({ role: "action", content: tr("Запущено", "Started") + " · npm run " + script[1] });
          renderMessages();
        }
      }, { className: "outline" }));
    }
    return article;
  }));
  panel.scrollTop = panel.scrollHeight;
}

async function inspectEdit(raw) {
  const item = JSON.parse(raw);
  if (typeof item.file !== "string" || typeof item.content !== "string") throw new Error(tr("Неверный формат правки", "Invalid edit format"));
  if (!workspace.hasTab(item.file)) throw new Error(tr("Сначала открой предложенный файл в редакторе.", "Open the suggested file in the editor first."));
  const original = await call("read", item.file);
  const proposal = el("pre", { className: "output", textContent: item.content });
  dialog(item.file, el("p", { textContent: tr("Модель предлагает заменить содержимое файла.", "The model suggests replacing the file contents.") }),
    proposal, click(tr("Применить", "Apply"), async () => {
      if (workspace.hasUnsaved(item.file)) throw new Error(tr("Сначала сохрани или закрой свои правки.", "Save or close your own changes first."));
      await call("write", item.file, original, item.content);
      workspace.reload(item.file, item.content);
      messages.push({ role: "action", content: tr("Изменён файл", "File updated") + " · " + item.file });
      renderMessages();
      $("overlay").close();
    }, { className: "primary" }));
}
function attach(value) {
  if (pending || imageMode || attachments.length >= 6) return;
  attachments.push(value);
  renderAttachments();
}
function renderAttachments() {
  $("attachments").replaceChildren(...attachments.map((file, index) => button(file.name + " ×", () => {
    attachments.splice(index, 1);
    renderAttachments();
  }, { disabled: pending })));
}
function render() {
  const isProject = mode === "project";
  document.querySelector(".shell").classList.toggle("project", isProject);
  $("workspace").hidden = !isProject;
  $("top-open").textContent = tr("Открыть папку", "Open folder");
  $("breadcrumb").textContent = isProject ? filename(root) : tr("Обычный чат", "Chat");
  $("chat-heading").textContent = chats.find((item) => item.id === chatId)?.title || tr("Новый чат", "New chat");
  $("prompt").placeholder = isProject ? tr("Спроси о проекте или прикрепи файл…", "Ask about the project or attach a file…") :
    imageMode ? tr("Опиши изображение…", "Describe an image…") : tr("Напиши сообщение…", "Write a message…");
  $("chat-refresh").title = tr("Синхронизировать", "Sync now");
  $("chat-refresh").disabled = pending || !profile;
  $("attach").title = tr("Прикрепить файлы", "Attach files");
  $("attach").disabled = imageMode || pending;
  $("attach-file").title = tr("Добавить открытый файл", "Attach open file");
  $("attach-file").disabled = imageMode || pending;
  $("image-mode").title = tr("Генерация изображения", "Generate image");
  $("image-mode").disabled = pending || !!attachments.length;
  $("image-mode").classList.toggle("primary", imageMode);
  $("image-size").hidden = !imageMode;
  $("send").replaceChildren(icon(pending ? "stop" : "send"));
  $("send").title = pending ? tr("Остановить", "Stop") : tr("Отправить", "Send");
  $("send").disabled = pending && imageMode;
  $("model").disabled = pending || imageMode;
  $("usage").textContent = usage ? plan.toUpperCase() + " · " + usage.used + " / " + (usage.limit === -1 ? "∞" : usage.limit) : "";
  const nav = (symbol, ru, en, task, active) => click(symbol, task, { title: tr(ru, en), ariaLabel: tr(ru, en), className: active ? "active" : "" });
  $("rail").replaceChildren(
    nav("▤", "Чаты", "Chats", () => switchMode("chat"), !isProject),
    nav("▱", "Проекты", "Projects", () => switchMode("project"), isProject),
    ...(isProject ? [nav("⑂", "Git", "Git", workspace.git)] : []),
    nav("◷", "Планирование", "Planning", () => profile ? account.planning() : account.login()),
    nav("⌘", "Плагины", "Plugins", () => profile ? account.plugins() : account.login()),
    nav("◉", "Аккаунт", "Account", () => account.account(profile)),
    nav("⚙", "Настройки", "Settings", () => account.settings(version)));
  renderSidebar();
  renderModels();
  renderMessages();
  renderAttachments();
}
function receiveChat(text) {
  if (!activeStream) return;
  activeStream.buffer += text;
  let blockEnd;
  while ((blockEnd = activeStream.buffer.indexOf("\n\n")) >= 0) {
    const block = activeStream.buffer.slice(0, blockEnd);
    activeStream.buffer = activeStream.buffer.slice(blockEnd + 2);
    if (!block.startsWith("data: ")) continue;
    const packet = JSON.parse(block.slice(6));
    if (packet.chunk) activeStream.message.content += packet.chunk;
    if (packet.error) activeStream.error = packet.error;
    if (packet.done) activeStream.done = true;
    if (packet.usage) usage = packet.usage;
  }
  renderMessages();
}
async function send() {
  if (pending) return call("stopChat");
  if (!profile) return account.login();
  const prompt = $("prompt").value.trim();
  if (!prompt && !attachments.length) return;
  if (!root && /(?:исправь|открой|поменяй|fix|open|edit).{0,50}(?:мой сайт|проект|файл|my project|my site|my file)/i.test(prompt) &&
      window.confirm(tr("Открыть папку проекта для этой задачи?", "Open a project folder for this task?"))) {
    await openRoot();
    return;
  }
  pending = true;
  const owner = profile.id;
  render();
  setStatus(tr("Запрос отправляется…", "Sending request…"));
  let sent = false;
  try {
    if (!chatId) {
      const created = await api("sessions", "POST", { title: (prompt || attachments[0]?.name || "").slice(0, 80) });
      if (profile?.id !== owner) return;
      chatId = created.id;
      chats.unshift(created);
    }
    messages.push({ role: "user", content: prompt || attachments.map((item) => item.name).join(", ") });
    const reply = { role: "assistant", content: "", streaming: true };
    messages.push(reply);
    render();
    if (imageMode) {
      await api("images", "POST", { prompt, sessionId: chatId, size: $("image-size").value });
    } else {
      activeStream = { buffer: "", message: reply };
      const context = [];
      if (mode === "project") {
        if (prefs.edits === "review" && attachments.some((file) => file.name === workspace.activeFile())) {
          context.push("If asked to edit the attached project file, return one fenced soop-edit block containing JSON with file (relative path) and content (complete replacement). Only suggest changes to the attached file.");
        }
        if (prefs.scripts === "confirm" && /(?:запуст|запуск|проверь тесты|\brun\b|\bstart\b)/i.test(prompt)) {
          context.push("If the user explicitly asks to run an existing npm script and its name is known from context, return one fenced soop-run block containing only the script name.");
        }
      }
      const requestText = context.length ? prompt + "\n\n[" + context.join(" ") + "]" : prompt;
      await call("chat", { message: requestText, model: model.id, sessionId: chatId, attachments });
      if (activeStream.error || !activeStream.done) throw new Error(activeStream.error || tr("Поток ответа завершился раньше времени.", "The response stream ended early."));
    }
    if (profile?.id !== owner) return;
    sent = true;
    attachments = [];
    $("prompt").value = "";
    setStatus(tr("Ответ готов", "Response ready"));
    if (prefs.notify) await call("notify", tr("Ответ готов", "Response ready"));
  } finally {
    const stillSignedIn = profile?.id === owner;
    if (stillSignedIn && chatId) {
      const latest = await api("sessions/" + chatId + "/messages").catch(() => null);
      if (latest && profile?.id === owner) { messages = latest; await cache(chatId, messages); }
      else if (profile?.id === owner) for (const item of messages) item.streaming = false;
    }
    activeStream = null;
    pending = false;
    render();
    if (sent && profile?.id === owner) await loadChats().catch(() => {});
  }
}
$("top-open").onclick = () => safe(() => openRoot());
for (const [id, name] of [["attach", "attach"], ["attach-file", "attachFile"], ["image-mode", "image"],
  ["chat-refresh", "↻"], ["minimize", "minimize"], ["maximize", "maximize"], ["close", "close"]]) {
  $(id).replaceChildren(icon(name));
}
$("minimize").onclick = () => safe(() => call("minimize"));
$("maximize").onclick = () => safe(() => call("maximize"));
$("close").onclick = () => safe(() => call("close"));
$("chat-refresh").onclick = () => safe(async () => { await refresh(); if (chatId) await openChat(chatId); });
$("send").onclick = () => safe(send);
$("image-mode").onclick = () => { imageMode = !imageMode; render(); };
$("attach").onclick = () => $("attachment-input").click();
$("attach-file").onclick = workspace.attachActive;
$("attachment-input").onchange = () => safe(async () => {
  const input = $("attachment-input");
  const selected = Array.from(input.files);
  input.value = "";
  for (const file of selected.slice(0, 6 - attachments.length)) {
    if (file.size > 20_000_000) throw new Error(tr("Файл больше 20 МБ.", "File exceeds 20 MB."));
    const value = await processFile(file);
    if (value) attach(value);
  }
});
$("prompt").onkeydown = (event) => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing && prefs.enterSend && !pending) {
    event.preventDefault();
    safe(send);
  }
};
$("model").onclick = () => { $("model-menu").hidden = !$("model-menu").hidden; };
document.addEventListener("pointerdown", (event) => { if (!event.target.closest(".models")) $("model-menu").hidden = true; });
window.addEventListener("storage", (event) => {
  if (event.key !== "soop-preferences") return;
  Object.assign(prefs, loadPrefs());
  safe(sendExclusions);
  theme();
  render();
  workspace.render();
});
window.desktop.onEvent((kind, data) => {
  if (kind === "maximize") document.body.classList.toggle("maximized", data);
  else if (kind === "chat") receiveChat(data);
  else if (kind === "signout") { profile = null; chats = []; usage = null; plan = "free"; imageCache.clear(); newChat(); }
  else if (kind === "update") setStatus(tr("Доступно обновление", "Update available") + " · " + data);
  else workspace.event(kind, data);
});
theme();
render();
safe(async () => {
  ({ root, recents, version } = await call("state"));
  await sendExclusions();
  if (root) { mode = "project"; workspace.setRoot(root); }
  render();
  await refresh();
  setStatus(tr("Готово", "Ready"));
});
