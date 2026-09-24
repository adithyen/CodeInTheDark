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
  fontSize = 15,
}: MonacoBlindEditorProps) {
  const handleEditorDidMount: OnMount = (editor, monaco) => {
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

    // Block paste commands inside Monaco
    editor.onKeyDown((e) => {
      // Ctrl+V or Cmd+V
      if ((e.ctrlKey || e.metaKey) && e.keyCode === monaco.KeyCode.KeyV) {
        e.preventDefault();
        e.stopPropagation();
      }
      // Ctrl+C or Cmd+C
      if ((e.ctrlKey || e.metaKey) && e.keyCode === monaco.KeyCode.KeyC) {
        e.preventDefault();
        e.stopPropagation();
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
          contextmenu: false, // Right-click disabled
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
