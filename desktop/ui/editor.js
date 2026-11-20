import { EditorState } from "@codemirror/state";
import { EditorView, keymap, highlightActiveLine, highlightActiveLineGutter, lineNumbers } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { searchKeymap } from "@codemirror/search";
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { indentOnInput, bracketMatching, syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { javascript } from "@codemirror/lang-javascript";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { json } from "@codemirror/lang-json";
import { python } from "@codemirror/lang-python";
import { markdown } from "@codemirror/lang-markdown";

const theme = EditorView.theme({
  "&": { color: "#e6e4eb", backgroundColor: "var(--bg)" },
  ".cm-gutters": { color: "#8c8b98", backgroundColor: "var(--aside)", border: 0 },
  ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "#ffffff08" },
  ".cm-cursor": { borderLeftColor: "#d9ceff" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": { backgroundColor: "#7565a965" },
  ".cm-panels, .cm-tooltip": { color: "#eeeef2", backgroundColor: "var(--surface)" },
  "&.cm-focused": { outline: "none" },
}, { dark: true });
const highlight = HighlightStyle.define([
  { tag: [tags.keyword, tags.operatorKeyword], color: "#c2a7fa" },
  { tag: [tags.string, tags.special(tags.string)], color: "#a8d7a6" },
  { tag: [tags.number, tags.atom, tags.bool], color: "#f2be89" },
  { tag: [tags.comment], color: "#9295a3", fontStyle: "italic" },
  { tag: [tags.typeName, tags.tagName, tags.heading], color: "#8ec7ec" },
  { tag: [tags.propertyName, tags.attributeName], color: "#e7c990" },
]);
function language(file) {
  const ext = file.split(".").pop().toLowerCase();
  if (["js", "jsx", "mjs", "cjs", "ts", "tsx"].includes(ext)) {
    return javascript({ jsx: ext.endsWith("x"), typescript: ext.startsWith("ts") });
  }
  return ({ css, html, json, py: python, md: markdown })[ext]?.() || [];
}

export function openEditor(parent, tab, prefs, onEdit, onSave) {
  return new EditorView({
    parent,
    state: EditorState.create({ doc: tab.draft, extensions: [
      theme, language(tab.file), syntaxHighlighting(highlight), history(),
      highlightActiveLine(), bracketMatching(), closeBrackets(), indentOnInput(),
      ...(prefs.completion ? [autocompletion()] : []),
      ...(prefs.lines ? [lineNumbers(), highlightActiveLineGutter()] : []),
      ...(prefs.wrap ? [EditorView.lineWrapping] : []),
      EditorState.tabSize.of(prefs.tabSize),
      keymap.of([
        { key: "Mod-s", run: () => { onSave(); return true; } }, indentWithTab,
        ...searchKeymap, ...completionKeymap, ...closeBracketsKeymap, ...historyKeymap, ...defaultKeymap,
      ]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) onEdit(update.state.doc.toString());
      }),
    ] }),
  });
}
