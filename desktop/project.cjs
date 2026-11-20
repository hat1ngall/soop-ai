const fs = require("node:fs/promises");
const path = require("node:path");
const { spawn, execFile } = require("node:child_process");
const { promisify } = require("node:util");

const exec = promisify(execFile);
const hidden = new Set([".git", "node_modules", ".next", ".venv"]);
const privateName = /^(?:\.env(?:\.|$)|.*\.(?:pem|pfx|key)$)/i;
const denied = (name, exclusions) => hidden.has(name.toLowerCase()) || privateName.test(name) ||
  exclusions.some((item) => item.toLowerCase() === name.toLowerCase());

async function resolveInside(root, relative = "", exclusions = []) {
  if (!root || typeof relative !== "string" || path.isAbsolute(relative)) throw new Error("Invalid project path");
  const parts = relative ? relative.split(/[\\/]/) : [];
  if (parts.some((name) => !name || name === "." || name === ".." || /[:\0]/.test(name) || denied(name, exclusions))) {
    throw new Error("This path is excluded");
  }
  let current = root;
  for (const name of parts) {
    current = path.join(current, name);
    if ((await fs.lstat(current)).isSymbolicLink()) throw new Error("Symbolic links are excluded");
  }
  const real = await fs.realpath(current);
  const relation = path.relative(root, real);
  if (relation === ".." || relation.startsWith(".." + path.sep) || path.isAbsolute(relation)) throw new Error("Outside project");
  return real;
}

async function list(root, relative, exclusions) {
  const directory = await resolveInside(root, relative, exclusions);
  const entries = await fs.readdir(directory, { withFileTypes: true });
  return entries.filter((entry) => (entry.isFile() || entry.isDirectory()) && !denied(entry.name, exclusions))
    .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name))
    .slice(0, 1500).map((entry) => ({ name: entry.name, directory: entry.isDirectory() }));
}

async function read(root, relative, exclusions) {
  const file = await resolveInside(root, relative, exclusions);
  const stat = await fs.stat(file);
  if (!stat.isFile() || stat.size > 1_000_000 || stat.nlink !== 1) throw new Error("Only regular UTF-8 files up to 1 MB can be edited");
  const buffer = await fs.readFile(file);
  if (buffer.includes(0)) throw new Error("Binary file");
  return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(buffer);
}

async function write(root, relative, original, content, exclusions) {
  if (typeof content !== "string" || Buffer.byteLength(content) > 1_000_000) throw new Error("File is too large");
  const file = await resolveInside(root, relative, exclusions);
  if (await read(root, relative, exclusions) !== original) throw new Error("File changed on disk. Reopen it before saving");
  await fs.writeFile(file, content, "utf8");
}

async function create(root, relative, name, directory, exclusions) {
  if (typeof name !== "string" || !name.trim() || name === "." || name === ".." ||
      /[\\/:*?"<>|\0]|[. ]$/.test(name) || denied(name, exclusions)) {
    throw new Error("Invalid or excluded name");
  }
  const parent = await resolveInside(root, relative, exclusions);
  const target = path.join(parent, name);
  if (directory) await fs.mkdir(target);
  else await fs.writeFile(target, "", { flag: "wx" });
}

async function git(root, action, value) {
  if (!root) throw new Error("Open a project first");
  const options = { cwd: root, timeout: 20000, maxBuffer: 1_000_000, windowsHide: true, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } };
  const { stdout: top } = await exec("git", ["rev-parse", "--show-toplevel"], options);
  if (path.relative(root, path.resolve(top.trim()))) throw new Error("Open the root of the Git repository");
  const args = {
    status: ["status", "--short", "--branch"], log: ["log", "-30", "--oneline"],
    diff: ["diff", "--no-ext-diff", "--no-textconv"], staged: ["diff", "--cached", "--no-ext-diff", "--no-textconv"],
    stage: ["add", "--all", "--", "."], commit: ["commit", "-m", String(value || "").trim().slice(0, 300)],
  }[action];
  if (!Array.isArray(args)) throw new Error("Unknown Git action");
  return (await exec("git", args, options)).stdout;
}

function terminal(root, command, onOutput, onExit) {
  if (!root || typeof command !== "string" || !command.trim() || command.length > 2000) throw new Error("Enter a command and open a project");
  const child = spawn(command, [], {
    cwd: root, shell: true, windowsHide: true, detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (data) => onOutput(data.toString()));
  child.stderr.on("data", (data) => onOutput(data.toString()));
  child.once("error", (error) => onOutput(error.message));
  child.once("close", onExit);
  return child;
}

function stopTerminal(child) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === "win32") {
    const taskkill = path.join(process.env.SystemRoot || "C:\\Windows", "System32", "taskkill.exe");
    execFile(taskkill, ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true }, () => {});
  } else {
    try { process.kill(-child.pid, "SIGTERM"); } catch (error) { if (error.code !== "ESRCH") throw error; }
  }
}

module.exports = { resolveInside, list, read, write, create, git, terminal, stopTerminal };
