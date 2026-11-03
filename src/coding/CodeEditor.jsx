import { useEffect, useRef } from "react";
import * as monaco from "monaco-editor/editor/editor.api.js";
import "monaco-editor/languages/definitions/python/register.js";
import "monaco-editor/languages/definitions/javascript/register.js";
import "monaco-editor/languages/definitions/cpp/register.js";
import EditorWorker from "monaco-editor/editor/editor.worker.js?worker";

// Bundle the editor and its worker locally; no CDN or credentials in the browser.
self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
monaco.editor.defineTheme("return-tech", {
  base: "vs-dark", inherit: true, rules: [],
  colors: { "editor.background": "#10161e", "editorLineNumber.foreground": "#637083" },
});

export default function CodeEditor({ value, language, onChange }) {
  const element = useRef(null);
  const editor = useRef(null);
  const change = useRef(onChange);
  change.current = onChange;
  useEffect(() => {
    const instance = monaco.editor.create(element.current, {
      value, language, theme: "return-tech", automaticLayout: true,
      minimap: { enabled: false }, fontSize: 14, lineHeight: 23,
      scrollBeyondLastLine: false, tabSize: 4, padding: { top: 16 },
      ariaLabel: "Editor de código", fixedOverflowWidgets: true,
      // Keep keyboard input compatible with standard text controls and assistive tools.
      editContext: false,
    });
    editor.current = instance;
    const listener = instance.onDidChangeModelContent(() => change.current(instance.getValue()));
    return () => {
      listener.dispose();
      const model = instance.getModel();
      instance.dispose();
      model?.dispose();
      editor.current = null;
    };
  }, []);
  useEffect(() => {
    if (editor.current && editor.current.getValue() !== value) editor.current.setValue(value);
  }, [value]);
  useEffect(() => {
    const model = editor.current?.getModel();
    if (model) monaco.editor.setModelLanguage(model, language);
  }, [language]);
  return <div ref={element} className="code-editor" />;
}
