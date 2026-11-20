const { app, BrowserWindow, dialog, ipcMain, Notification, safeStorage, session, shell } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { autoUpdater } = require("electron-updater");
const project = require("./project.cjs");

const origin = new URL((!app.isPackaged && process.env.SOOP_DESKTOP_ORIGIN) || "https://soop-ai-c5q5.onrender.com");
const loopback = (url) => ["http:", "https:"].includes(url.protocol) &&
  ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) && !url.username && !url.password;
if (origin.protocol !== "https:" && !(loopback(origin) && !app.isPackaged)) throw new Error("HTTPS required");
const entry = path.join(__dirname, "dist", "index.html");
const windows = new Map();
const accountPartition = "persist:soop-account";
const api = /^\/api\/(?:user\/(?:me|usage)|sessions(?:\/[\w-]+(?:\/messages)?)?|chat|plugins|activate|auth\/register|images(?:\/[\w-]+)?|reminders(?:\/[\w-]+)?)$/;
let recents = [];
let authenticatedId;
let reminderBusy = false;
let reminderTimer;
let offeredVersion = null;
app.enableSandbox();
app.setAppUserModelId("ai.soop.desktop");
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;
autoUpdater.on("error", () => {});

async function checkUpdate() {
  if (!app.isPackaged || process.platform !== "win32") return null;
  const result = await autoUpdater.checkForUpdates();
  offeredVersion = result?.isUpdateAvailable ? result.updateInfo.version : null;
  return offeredVersion;
}

function event(win, kind, data) {
  if (!win.isDestroyed()) win.webContents.send("desktop:event", kind, data);
}

function notify(title, body) {
  if (Notification.isSupported()) new Notification({ title, body: String(body).slice(0, 250) }).show();
}

function startJob(state, lane, command) {
  if (state.jobs.has(lane)) throw new Error("Stop the current command first");
  const child = project.terminal(state.root, command,
    (output) => event(state.win, "terminal", { lane, output }),
    (code) => { state.jobs.delete(lane); event(state.win, "terminalEnd", { lane, code }); });
  state.jobs.set(lane, child);
}

async function runScript(state, name, lang) {
  if (typeof name !== "string" || !/^[a-zA-Z0-9][\w:-]{0,79}$/.test(name)) throw new Error("Invalid script name");
  const readManifest = () => project.read(state.root, "package.json", state.exclusions);
  const manifest = await readManifest();
  const scripts = JSON.parse(manifest).scripts || {};
  if (!Object.hasOwn(scripts, name) || typeof scripts[name] !== "string") throw new Error("Script is missing from package.json");
  const command = "npm run " + name;
  const detail = ["pre" + name, name, "post" + name].filter((key) => Object.hasOwn(scripts, key))
    .map((key) => key + ": " + String(scripts[key])).join("\n");
  const result = await dialog.showMessageBox(state.win, {
    type: "question", title: "Soop AI Desktop", message: command, detail: detail.slice(0, 800),
    buttons: lang === "en" ? ["Cancel", "Run"] : ["Отмена", "Запустить"], cancelId: 0, defaultId: 0,
  });
  if (result.response !== 1) return false;
  if (manifest !== await readManifest()) throw new Error("package.json changed. Review the script again.");
  startJob(state, "assistant", command);
  return true;
}

function request(route, options = {}) {
  return session.fromPartition(accountPartition).fetch(new URL(route, origin).href, {
    ...options, credentials: "include", redirect: options.redirect || "error",
    signal: options.signal || AbortSignal.timeout(330_000),
  });
}

async function json(response) {
  const data = await response.json().catch(() => null);
  if (response.status === 403 && data === null) throw new Error("Soop AI API blocked access (HTTP 403).");
  if (!response.ok || data === null) throw new Error(data?.message || data?.error || ("HTTP " + response.status));
  return data;
}

function profile() {
  return request("/api/auth/session").then(json);
}

async function signIn(email, password) {
  if (typeof email !== "string" || typeof password !== "string") throw new Error("Invalid credentials");
  const { csrfToken } = await request("/api/auth/csrf").then(json);
  const result = await request("/api/auth/callback/credentials", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email, password, csrfToken, callbackUrl: origin.origin, json: "true" }),
  });
  if (!result.ok || new URL((await result.json()).url, origin).searchParams.has("error")) {
    throw new Error("Invalid email or password");
  }
  const data = await profile();
  if (!data.user?.id) throw new Error("Could not establish a session");
  authenticatedId = data.user.id;
  return data;
}

async function cache(owner, id, data) {
  if (!owner || owner !== authenticatedId || !/^[\w-]{1,100}$/.test(owner) ||
      !safeStorage.isEncryptionAvailable() || !/^[\w-]{1,100}$/.test(id)) return null;
  const file = path.join(app.getPath("userData"), "chats", owner, id + ".bin");
  if (data === undefined) {
    try { return JSON.parse(safeStorage.decryptString(await fs.readFile(file))); } catch { return null; }
  }
  if (data === null) { await fs.rm(file, { force: true }); return null; }
  const contents = JSON.stringify(data);
  if (contents.length > 2_000_000) return null;
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, safeStorage.encryptString(contents));
  return null;
}

function createWindow(root = null) {
  const win = new BrowserWindow({ width: 1440, height: 920, minWidth: 760, minHeight: 560, frame: false, transparent: true, backgroundColor: "#00000000",
    title: "Soop AI Desktop", webPreferences: { preload: path.join(__dirname, "preload.cjs"), sandbox: true, contextIsolation: true } });
  const id = win.webContents.id;
  const state = { win, root, exclusions: [], jobs: new Map(), stream: null };
  windows.set(id, state);
  win.on("maximize", () => event(win, "maximize", true));
  win.on("unmaximize", () => event(win, "maximize", false));
  win.webContents.on("will-navigate", (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.on("closed", () => {
    state.stream?.abort();
    for (const job of state.jobs.values()) project.stopTerminal(job);
    windows.delete(id);
  });
  win.loadFile(entry);
  return win;
}

function preview(parent, value) {
  const url = new URL(value);
  if (!loopback(url)) throw new Error("Use a local preview address");
  const win = new BrowserWindow({ parent, width: 1050, height: 740, title: "Soop AI Desktop · Preview",
    webPreferences: { partition: "soop-preview", sandbox: true, contextIsolation: true, nodeIntegration: false } });
  const previewSession = win.webContents.session;
  previewSession.setPermissionRequestHandler((_wc, _name, callback) => callback(false));
  previewSession.setPermissionCheckHandler(() => false);
  previewSession.webRequest.onBeforeRequest((details, callback) => {
    let allowed = false;
    try { allowed = loopback(new URL(details.url)); } catch {}
    callback({ cancel: !allowed });
  });
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.loadURL(url.href).catch(() => {});
}

async function pickRoot(win, recent) {
  let selection = recent;
  if (recent && !recents.includes(recent)) throw new Error("Unknown project");
  if (!selection) {
    const result = await dialog.showOpenDialog(win, { properties: ["openDirectory"] });
    if (result.canceled) return null;
    selection = result.filePaths[0];
  }
  const root = await fs.realpath(selection);
  if (!(await fs.stat(root)).isDirectory()) throw new Error("Invalid folder");
  recents = [root, ...recents.filter((item) => item !== root)].slice(0, 12);
  await fs.writeFile(path.join(app.getPath("userData"), "recent.json"), JSON.stringify(recents));
  return root;
}

ipcMain.handle("desktop:call", async ({ sender, senderFrame }, action, ...args) => {
  const state = windows.get(sender.id);
  if (!state || senderFrame !== sender.mainFrame || senderFrame.url !== pathToFileURL(entry).href) throw new Error("Invalid window");
  const { win, root, exclusions } = state;
  switch (action) {
    case "minimize": win.minimize(); return;
    case "maximize": if (win.isMaximized()) win.unmaximize(); else win.maximize(); return;
    case "close": win.close(); return;
    case "profile": {
      const data = await profile();
      authenticatedId = data.user?.id;
      return data;
    }
    case "signin": return signIn(...args);
    case "signout":
      for (const item of windows.values()) item.stream?.abort();
      await session.fromPartition(accountPartition).clearStorageData({ storages: ["cookies"] });
      authenticatedId = undefined;
      for (const item of windows.values()) event(item.win, "signout");
      return;
    case "api": {
      const [route, method = "GET", data] = args;
      if (!api.test(route) || !["GET", "POST", "PUT", "DELETE"].includes(method)) throw new Error("Invalid API request");
      const response = await request(route, { method, ...(data === undefined ? {} : {
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      }) });
      if (route === "/api/chat" && response.ok) {
        throw new Error("Use the chat stream");
      }
      return json(response);
    }
    case "image": {
      if (!/^[\w-]+$/.test(args[0])) throw new Error("Invalid image");
      const response = await request("/api/images/" + args[0]);
      const mime = response.headers.get("content-type")?.split(";")[0];
      if (!response.ok || !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(mime)) throw new Error("Image unavailable");
      return "data:" + mime + ";base64," + Buffer.from(await response.arrayBuffer()).toString("base64");
    }
    case "chat": {
      if (state.stream) throw new Error("A response is already running");
      const stream = state.stream = new AbortController();
      const signal = AbortSignal.any([stream.signal, AbortSignal.timeout(300_000)]);
      try {
        const response = await request("/api/chat", { method: "POST", signal,
          headers: { "Content-Type": "application/json" }, body: JSON.stringify(args[0]) });
        if (!response.ok) return await json(response);
        const decoder = new TextDecoder();
        for await (const chunk of response.body) event(win, "chat", decoder.decode(chunk, { stream: true }));
        const tail = decoder.decode();
        if (tail) event(win, "chat", tail);
      } finally { state.stream = null; }
      return;
    }
    case "stopChat": state.stream?.abort(); return;
    case "cache": return cache(...args);
    case "checkUpdate": return checkUpdate();
    case "installUpdate":
      if (!offeredVersion) throw new Error("Check for updates first");
      if ((await dialog.showMessageBox(win, {
        type: "question", message: "Install Soop AI Desktop " + offeredVersion + "?",
        buttons: ["Cancel", "Install"], defaultId: 0, cancelId: 0,
      })).response !== 1) return;
      await autoUpdater.downloadUpdate();
      autoUpdater.quitAndInstall();
      return;
    case "notify": if (!win.isFocused()) notify("Soop AI Desktop", args[0]); return;
    case "state": return { root, recents, version: app.getVersion() };
    case "root": {
      const selected = await pickRoot(win, args[0]);
      if (!selected) return null;
      if (root && root !== selected) { createWindow(selected); return null; }
      state.root = selected;
      return { root: selected, recents };
    }
    case "exclusions":
      state.exclusions = Array.isArray(args[0]) ? args[0].filter((name) => typeof name === "string").slice(0, 100) : [];
      return;
    case "list": return project.list(root, args[0], exclusions);
    case "read": return project.read(root, args[0], exclusions);
    case "write": await project.write(root, ...args.slice(0, 3), exclusions); return;
    case "create": await project.create(root, args[0], args[1], args[2] === true, exclusions); return;
    case "trash": {
      const file = await project.resolveInside(root, args[0], exclusions);
      if (!(await fs.lstat(file)).isFile()) throw new Error("Select a regular file");
      const result = await dialog.showMessageBox(win, {
        type: "warning", message: (args[1] === "en" ? "Move file to Trash?" : "Переместить файл в корзину?"),
        detail: path.basename(file), buttons: args[1] === "en" ? ["Cancel", "Move to Trash"] : ["Отмена", "В корзину"],
        cancelId: 0, defaultId: 0,
      });
      if (result.response !== 1) return false;
      await shell.trashItem(await project.resolveInside(root, args[0], exclusions));
      return true;
    }
    case "openLink": {
      const url = new URL(args[0]);
      if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error("Unsupported link");
      await shell.openExternal(url.href);
      return;
    }
    case "git": return project.git(root, ...args);
    case "preview": return preview(win, args[0]);
    case "terminal": startJob(state, "user", args[0]); return;
    case "runScript": return runScript(state, args[0], args[1]);
    case "stopTerminal": project.stopTerminal(state.jobs.get(args[0] === "assistant" ? "assistant" : "user")); return;
    default: throw new Error("Unknown action");
  }
});

app.whenReady().then(async () => {
  try { recents = JSON.parse(await fs.readFile(path.join(app.getPath("userData"), "recent.json"), "utf8")); } catch {}
  createWindow();
  setTimeout(async () => {
    try {
      const version = await checkUpdate();
      if (version) for (const state of windows.values()) event(state.win, "update", version);
    } catch {}
  }, 15000).unref();
  reminderTimer = setInterval(async () => {
    if (!authenticatedId || reminderBusy) return;
    const owner = authenticatedId;
    reminderBusy = true;
    try {
      const reminders = await request("/api/reminders/due", { method: "POST" }).then(json);
      if (authenticatedId === owner) for (const item of reminders) notify("Soop AI Desktop", item.message);
    } catch {} finally { reminderBusy = false; }
  }, 30000);
  app.on("activate", () => { if (!windows.size) createWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("before-quit", () => clearInterval(reminderTimer));
