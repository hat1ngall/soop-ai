import { $, element as el, button, call, icon } from "./dom";
import { openEditor } from "./editor";

export function makeWorkspace({ tr, prefs, safe, dialog, setStatus, attach }) {
  const tabs = new Map();
  let editor, active, root, terminalVisible = false;
  const jobs = { user: { text: "", running: false }, assistant: { text: "", running: false } };
  let lane = "user";
  let directory = "";
  const filename = (file) => file.split("/").pop();
  const run = (fn) => () => safe(fn);
  const action = (text, fn, attrs) => button(text, run(fn), attrs);
  const terminalPanel = () => {
    const job = jobs[lane];
    const output = el("pre", { className: "output", id: "terminal-output", textContent: job.text });
    const input = el("input", { id: "command", placeholder: tr("Введите команду", "Enter a command"), disabled: job.running });
    return el("section", { className: "terminal" },
      el("div", { className: "panel-header" }, el("div", { className: "tools" },
        button(tr("Терминал", "Terminal"), () => { lane = "user"; render(); }, { disabled: lane === "user" }),
        button("Soop AI", () => { lane = "assistant"; render(); }, { disabled: lane === "assistant" })),
        action(tr("Стоп", "Stop"), () => call("stopTerminal", lane), { disabled: !job.running })),
      output, lane === "user" ? el("form", { onsubmit: (event) => {
        event.preventDefault();
        safe(async () => {
          const command = input.value.trim();
          if (!command) return;
          job.text += "\n> " + command + "\n";
          job.running = true;
          try { await call("terminal", command); } catch (error) { job.running = false; throw error; }
          finally { render(); }
        });
      } }, input, el("button", { type: "submit", textContent: "↵", disabled: job.running })) : null);
  };
  async function save() {
    const tab = tabs.get(active);
    if (!tab || tab.draft === tab.original) return;
    const draft = tab.draft;
    await call("write", tab.file, tab.original, draft);
    tab.original = draft;
    updateTabs();
    setStatus(tr("Изменён файл", "File updated") + " · " + tab.file);
  }
  function updateTabs() {
    $("tabs")?.replaceChildren(...Array.from(tabs.values(), (tab) => el("span", { className: "tab" + (tab.file === active ? " active" : "") },
      button(filename(tab.file) + (tab.draft !== tab.original ? " ●" : ""), () => { active = tab.file; render(); }, { title: tab.file }),
      button("×", () => {
        if (tab.draft !== tab.original && !window.confirm(tr("Закрыть без сохранения?", "Close without saving?"))) return;
        tabs.delete(tab.file);
        if (active === tab.file) active = tabs.keys().next().value;
        render();
      }, { title: tr("Закрыть вкладку", "Close tab") }))));
  }
  function render() {
    editor?.destroy();
    editor = null;
    if (!root) return;
    const heading = el("strong", { textContent: active || filename(root.replaceAll("\\","/")) });
    const edit = el("div", { className: "editor-wrap" });
    $("workspace").replaceChildren(el("div", { className: "panel-header" }, heading,
      el("div", { className: "tools" },
        action(tr("Сохранить", "Save"), save, { disabled: !active }),
        action("×", trash, { title: tr("В корзину", "Move to Trash"), disabled: !active }),
        (() => { const control = button("", () => { terminalVisible = !terminalVisible; render(); }, { title: tr("Терминал", "Terminal") }); control.append(icon("terminal")); return control; })(),
        action("↗", preview, { title: tr("Предпросмотр", "Preview") }))),
      el("div", { id: "tabs" }), edit, ...(terminalVisible ? [terminalPanel()] : []));
    updateTabs();
    const tab = tabs.get(active);
    if (tab) editor = openEditor(edit, tab, prefs, (value) => { tab.draft = value; updateTabs(); }, run(save));
    else edit.append(el("div", { className: "empty muted" }, tr("Выбери файл в проводнике", "Select a file in Explorer")));
    if ($("terminal-output")) $("terminal-output").scrollTop = $("terminal-output").scrollHeight;
    $("attach-file").hidden = !tab;
  }
  async function open(file) {
    if (!tabs.has(file)) {
      const original = await call("read", file);
      tabs.set(file, { file, original, draft: original });
    }
    active = file;
    render();
    editor.focus();
  }
  async function trash() {
    const tab = tabs.get(active);
    if (!tab) return;
    if (tab.draft !== tab.original) throw new Error(tr("Сначала сохрани изменения.", "Save your changes first."));
    if (!await call("trash", tab.file, prefs.lang)) return;
    tabs.delete(tab.file);
    if (active === tab.file) active = tabs.keys().next().value;
    render();
    if ($("project-files")) await browse($("project-files"));
  }
  function create(container) {
    const name = el("input", { required: true, placeholder: tr("Имя файла или папки", "File or folder name") });
    const type = el("select", {}, el("option", { value: "file", textContent: tr("Файл", "File") }),
      el("option", { value: "folder", textContent: tr("Папка", "Folder") }));
    const parent = directory;
    dialog(tr("Создать", "Create"), el("form", {
      className: "modal-form", onsubmit: (event) => {
        event.preventDefault();
        safe(async () => {
          const folder = type.value === "folder";
          await call("create", parent, name.value, folder);
          $("overlay").close();
          await browse(container, parent);
          if (!folder) await open(parent ? parent + "/" + name.value : name.value);
        });
      },
    }, name, type, el("button", { className: "primary", type: "submit", textContent: tr("Создать", "Create") })));
  }
  async function browse(container, relative = directory) {
    directory = relative;
    const entries = await call("list", relative);
    if (!container.isConnected || directory !== relative) return;
    container.replaceChildren(
      relative ? action("‹  " + relative, () => browse(container, relative.split("/").slice(0, -1).join("/")), { className: "list-button" }) : nullNode(),
      ...entries.map(({ name, directory: folder }) => {
        const next = relative ? relative + "/" + name : name;
        const control = action(name, folder ? () => browse(container, next) : () => open(next),
          { className: "list-button file-entry", title: next });
        control.prepend(icon(folder ? "folder" : "file"));
        return control;
      }));
  }
  function nullNode() { return document.createDocumentFragment(); }
  function preview() {
    const url = el("input", { value: "http://localhost:3000", type: "url", required: true });
    dialog(tr("Просмотр проекта", "Project preview"),
      el("form", { className: "modal-form", onsubmit: (event) => {
        event.preventDefault();
        safe(async () => { await call("preview", url.value); $("overlay").close(); });
      } }, url, el("button", { type: "submit", className: "primary", textContent: tr("Открыть", "Open") })));
  }
  function git() {
    const output = el("pre", { className: "output" });
    const message = el("input", { placeholder: tr("Сообщение коммита", "Commit message") });
    const exec = async (command) => {
      try { output.textContent = await call("git", command, message.value) || tr("Готово", "Done"); }
      catch (error) { output.textContent = error.message; }
    };
    dialog("Git", el("div", { className: "group" }, el("div", { className: "tools" },
      ...[["status", "Статус", "Status"], ["diff", "Изменения", "Changes"], ["staged", "Индекс", "Staged"], ["log", "История", "History"]]
        .map(([key, ru, en]) => action(tr(ru, en), () => exec(key)))),
      output, el("div", { className: "tools" },
        button(tr("Добавить все", "Stage all"), () => exec("stage"), { className: "outline" }),
        message, button(tr("Коммит", "Commit"), () => { if (message.value.trim()) exec("commit"); }, { className: "outline" }))));
    exec("status");
  }
  return {
    setRoot: (value) => { root = value; render(); },
    activeFile: () => active,
    hasTab: (file) => tabs.has(file),
    hasUnsaved: (file) => tabs.get(file)?.draft !== tabs.get(file)?.original,
    reload(file, content) { tabs.set(file, { file, original: content, draft: content }); render(); },
    render, browse, git, create,
    attachActive: () => {
      const tab = tabs.get(active);
      if (tab) attach({ name: tab.file, type: "text/plain", text: tab.draft.slice(0, 50_000) });
    },
    async runScript(name) {
      const job = jobs.assistant;
      if (job.running) throw new Error(tr("Команда уже выполняется.", "A command is already running."));
      const original = job.text;
      job.running = true;
      job.text += "\n> npm run " + name + "\n";
      try {
        if (!await call("runScript", name, prefs.lang)) { job.text = original; job.running = false; return false; }
        lane = "assistant";
        terminalVisible = true;
        render();
        return true;
      } catch (error) { job.text = original; job.running = false; throw error; }
    },
    event(kind, data) {
      if (kind !== "terminal" && kind !== "terminalEnd") return;
      const job = jobs[data.lane];
      if (kind === "terminalEnd") {
        job.running = false;
        job.text += "\n[" + tr("код выхода", "exit code") + ": " + data.code + "]\n";
        if (data.lane === lane && terminalVisible) render();
        return;
      }
      job.text = (job.text + data.output).slice(-90_000);
      if (data.lane === lane && $("terminal-output")) {
        $("terminal-output").textContent = job.text;
        $("terminal-output").scrollTop = $("terminal-output").scrollHeight;
      }
    },
  };
}
