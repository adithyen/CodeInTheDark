'use client';

import React from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { Language } from '@/types';

interface MonacoBlindEditorProps {
  language: Language;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  fontSize?: number;
  allowCopyPaste?: boolean;
  onProhibitedKey?: (keyName: string) => void;
}

const MONACO_LANG_MAP: Record<Language, string> = {
  c: 'c',
  python: 'python',
  java: 'java',
};

export default function MonacoBlindEditor({
  language,
  value,
  onChange,
  disabled = false,
  fontSize = 18,
  allowCopyPaste = false,
  onProhibitedKey,
}: MonacoBlindEditorProps) {
  const allowCopyPasteRef = React.useRef(allowCopyPaste);
  const onProhibitedKeyRef = React.useRef(onProhibitedKey);
  const editorRef = React.useRef<any>(null);

  React.useEffect(() => {
    allowCopyPasteRef.current = allowCopyPaste;
    if (editorRef.current) {
      editorRef.current.updateOptions({
        contextmenu: Boolean(allowCopyPaste),
      });
    }
  }, [allowCopyPaste]);

  React.useEffect(() => {
    onProhibitedKeyRef.current = onProhibitedKey;
  }, [onProhibitedKey]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Define Cyberpunk Dark theme
    monaco.editor.defineTheme('cyberpunk-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '00E676', fontStyle: 'italic' },
        { token: 'keyword', foreground: '00B0FF', fontStyle: 'bold' },
        { token: 'string', foreground: 'FFB300' },
        { token: 'number', foreground: 'FF5252' },
        { token: 'type', foreground: '7C4DFF' },
      ],
      colors: {
        'editor.background': '#070b12',
        'editor.foreground': '#d1d5db',
        'editorCursor.foreground': '#00E676',
        'editor.lineHighlightBackground': '#0f1722',
        'editorLineNumber.foreground': '#374151',
        'editorLineNumber.activeForeground': '#00B0FF',
        'editor.selectionBackground': '#1e293b',
      },
    });

    monaco.editor.setTheme('cyberpunk-dark');

    // Register strict command overrides inside Monaco to prevent browser action bubbling
    if (!allowCopyPasteRef.current) {
      editor.addCommand(monaco.KeyCode.F11, () => {
        onProhibitedKeyRef.current?.('F11 Fullscreen toggle');
      });
      editor.addCommand(monaco.KeyCode.Escape, () => {
        onProhibitedKeyRef.current?.('Escape key');
      });
      for (let f = 1; f <= 12; f++) {
        const keyCode = (monaco.KeyCode as any)[`F${f}`];
        if (keyCode) {
          editor.addCommand(keyCode, () => {
            onProhibitedKeyRef.current?.(`F${f}`);
          });
        }
      }
    }

    // Comprehensive keydown interceptor inside Monaco's event pipeline
    editor.onKeyDown((e) => {
      if (allowCopyPasteRef.current) return;

      const rawKey = e.browserEvent?.key || '';
      const rawCode = e.browserEvent?.code || '';
      const rawKeyCode = (e.browserEvent as any)?.keyCode;

      // 1. Trap PrintScreen / Screen Capture key attempts
      if (
        rawKey === 'PrintScreen' ||
        rawCode === 'PrintScreen' ||
        rawKeyCode === 44 ||
        rawKey === 'Snapshot' ||
        (e.ctrlKey && rawKey === 'PrintScreen') ||
        (e.metaKey && e.shiftKey && ['3', '4', 's', 'S'].includes(rawKey))
      ) {
        e.preventDefault();
        e.stopPropagation();
        onProhibitedKeyRef.current?.('PrintScreen');
        return;
      }

      // 2. Trap F11 (Fullscreen toggle)
      if (e.keyCode === monaco.KeyCode.F11 || rawKey === 'F11' || rawCode === 'F11' || rawKeyCode === 122) {
        e.preventDefault();
        e.stopPropagation();
        onProhibitedKeyRef.current?.('F11 Fullscreen toggle');
        return;
      }

      // 3. Trap Escape
      if (e.keyCode === monaco.KeyCode.Escape || rawKey === 'Escape' || rawCode === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onProhibitedKeyRef.current?.('Escape key');
        return;
      }

      // 4. Trap all Function keys F1 - F12
      if (
        (e.keyCode >= monaco.KeyCode.F1 && e.keyCode <= monaco.KeyCode.F12) ||
        (rawKey.startsWith('F') && /^F([1-9]|1[0-2])$/.test(rawKey))
      ) {
        e.preventDefault();
        e.stopPropagation();
        onProhibitedKeyRef.current?.(rawKey || 'Function key');
        return;
      }

      // 5. Block Clipboard Shortcuts inside Monaco (Ctrl+C, Ctrl+V, Ctrl+X)
      if ((e.ctrlKey || e.metaKey) && e.keyCode === monaco.KeyCode.KeyV) {
        e.preventDefault();
        e.stopPropagation();
        onProhibitedKeyRef.current?.('Ctrl+V (Paste)');
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.keyCode === monaco.KeyCode.KeyC) {
        e.preventDefault();
        e.stopPropagation();
        onProhibitedKeyRef.current?.('Ctrl+C (Copy)');
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.keyCode === monaco.KeyCode.KeyX) {
        e.preventDefault();
        e.stopPropagation();
        onProhibitedKeyRef.current?.('Ctrl+X (Cut)');
        return;
      }

      // 6. Block Devtools & Source shortcuts (Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U)
      if (
        (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c', 'K', 'k'].includes(rawKey)) ||
        (e.ctrlKey && ['u', 'U', 's', 'S', 'p', 'P'].includes(rawKey))
      ) {
        // Let Ctrl+S pass if needed, but prevent default browser save
        if (e.ctrlKey && (rawKey === 's' || rawKey === 'S')) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        onProhibitedKeyRef.current?.(`Ctrl+${rawKey}`);
        return;
      }
    });
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-white/10 bg-[#070b12]">
      {/* Retro Code In The Dark Badge */}
      <div className="absolute right-3 top-3 z-10 select-none rounded border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-400 backdrop-blur-sm">
        Blind Arena · Zero Output
      </div>

      <Editor
        height="100%"
        language={MONACO_LANG_MAP[language]}
        value={value}
        onChange={(val) => onChange(val || '')}
        onMount={handleEditorDidMount}
        options={{
          readOnly: disabled,
          minimap: { enabled: false },
          fontSize: fontSize,
          fontFamily: "'Fira Code', 'Courier New', monospace",
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          contextmenu: Boolean(allowCopyPaste),
          tabSize: 4,
          wordWrap: 'on',
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          renderWhitespace: 'selection',
        }}
      />
    </div>
  );
}
