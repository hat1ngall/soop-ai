import { createElement, MessageSquare, FolderOpen, GitBranch, CalendarClock, Puzzle, CircleUserRound,
  Settings, Plus, RefreshCw, X, Terminal, ExternalLink, ChevronLeft, Paperclip,
  FilePlus, ImagePlus, ArrowUp, Square, Minus, Maximize2, ChevronDown, Folder, FileText } from "lucide";

const symbols = {
  "▤": MessageSquare, "▱": FolderOpen, "⑂": GitBranch, "◷": CalendarClock,
  "⌘": Puzzle, "◉": CircleUserRound, "⚙": Settings, "＋": Plus, "↻": RefreshCw,
  "×": X, "↗": ExternalLink, "‹": ChevronLeft,
};
const named = { terminal: Terminal, attach: Paperclip, attachFile: FilePlus, image: ImagePlus,
  send: ArrowUp, stop: Square, minimize: Minus, maximize: Maximize2, close: X, down: ChevronDown,
  folder: Folder, file: FileText };
export function icon(name) {
  const graphic = named[name] || symbols[name];
  return graphic ? createElement(graphic, { width: 18, height: 18, "stroke-width": 1.8, "aria-hidden": "true" }) : document.createTextNode(name);
}
export const $ = (id) => document.getElementById(id);
export function element(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  node.append(...children.filter((child) => child !== null && child !== undefined && child !== false));
  return node;
}
export const button = (label, onclick, props = {}) => {
  const node = element("button", { type: "button", onclick, ...props });
  if (symbols[label]) node.append(icon(label));
  else node.textContent = label;
  return node;
};
export const call = (action, ...args) => window.desktop.call(action, ...args);
export const api = (route, method, data) => call("api", "/api/" + route, method, data);
