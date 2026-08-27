import React, { useState, useMemo, useRef } from 'react';
import { 
  tokenizeLine, 
  getTokenClasses 
} from '../lib/shaderHighlighter';
import { 
  Code, 
  Edit3, 
  Copy, 
  Check, 
  Trash2, 
  Hash, 
  WrapText,
  BookOpen,
  Sparkles
} from 'lucide-react';

interface SourceCodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  placeholder?: string;
  title: string;
  onOpenSnippetLibrary?: () => void;
}

export const SourceCodeEditor: React.FC<SourceCodeEditorProps> = ({
  code,
  onChange,
  placeholder,
  title,
  onOpenSnippetLibrary,
}) => {
  const [viewMode, setViewMode] = useState<'edit' | 'highlight'>('edit');
  const [copied, setCopied] = useState<boolean>(false);
  const [wordWrap, setWordWrap] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const lines = useMemo(() => {
    return code.split('\n');
  }, [code]);

  const tokenizedLines = useMemo(() => {
    return lines.map(line => tokenizeLine(line));
  }, [lines]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    onChange('');
    textareaRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0C0E] text-slate-200">
      
      {/* Header bar */}
      <div className="bg-[#1A1D21] px-3.5 py-1.5 border-b border-[#23272F] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center space-x-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
          <span className="font-mono text-xs font-medium text-slate-200 truncate">
            {title}
          </span>
        </div>

        <div className="flex items-center space-x-1 shrink-0">
          {/* Snippet Library Trigger Button */}
          {onOpenSnippetLibrary && (
            <button
              id="btn-open-snippet-library-editor"
              onClick={onOpenSnippetLibrary}
              className="flex items-center space-x-1 px-2 py-0.5 rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-[11px] font-medium transition cursor-pointer mr-1 shadow-xs"
              title="Browse, insert, and save GLSL shader snippets (Noise, SDF, Blending, Color math)"
            >
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>Snippets</span>
            </button>
          )}

          {/* Edit / Highlight Toggle */}
          <div className="inline-flex items-center bg-[#0E1013] border border-[#23272F] rounded p-0.5 mr-1">
            <button
              onClick={() => setViewMode('edit')}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition cursor-pointer ${
                viewMode === 'edit' ? 'bg-indigo-600/30 text-indigo-300 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Interactive Source Editor"
            >
              <Edit3 className="w-3 h-3" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => setViewMode('highlight')}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition cursor-pointer ${
                viewMode === 'highlight' ? 'bg-indigo-600/30 text-indigo-300 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Syntax Highlighted View"
            >
              <Code className="w-3 h-3" />
              <span>Highlight</span>
            </button>
          </div>

          <button
            onClick={() => setWordWrap(!wordWrap)}
            className={`p-1 rounded text-xs transition cursor-pointer ${
              wordWrap ? 'bg-indigo-600/30 text-indigo-300' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Word Wrap"
          >
            <WrapText className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleCopy}
            className="p-1 rounded text-slate-400 hover:text-slate-200 transition cursor-pointer"
            title="Copy Source Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleClear}
            className="p-1 rounded text-slate-400 hover:text-rose-400 transition cursor-pointer"
            title="Clear Source Code"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <span className="text-[11px] text-slate-500 font-mono pl-1 flex items-center gap-0.5">
            <Hash className="w-2.5 h-2.5" />
            {lines.length}
          </span>
        </div>
      </div>

      {/* Editor Body */}
      <div className="relative flex-1 min-h-[460px] overflow-auto bg-[#0A0C0E] font-mono text-xs">
        {viewMode === 'edit' ? (
          <div className="flex h-full min-h-[460px]">
            {/* Gutter with line numbers */}
            <div className="w-10 shrink-0 py-4 select-none bg-[#0D0F13] text-right pr-3 text-slate-600 border-r border-[#1B1E26] text-[11px] font-mono leading-relaxed">
              {lines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>

            {/* Editable Textarea */}
            <textarea
              ref={textareaRef}
              id="source-glsl-textarea"
              value={code}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              spellCheck={false}
              className={`flex-1 p-4 bg-[#0A0C0E] text-slate-200 font-mono text-xs leading-relaxed resize-none focus:outline-none selection:bg-indigo-500/30 border-none ${
                wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre overflow-x-auto'
              }`}
            />
          </div>
        ) : (
          <div className="p-2">
            {tokenizedLines.map((tokens, lineIdx) => (
              <div
                key={lineIdx}
                className="flex items-start hover:bg-[#15181E] pl-1.5 rounded-xs"
              >
                <div className="w-10 shrink-0 text-right pr-3 text-slate-600 select-none text-[11px] font-mono py-0.5">
                  {lineIdx + 1}
                </div>
                <div className={`flex-1 py-0.5 pr-4 ${wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'}`}>
                  {tokens.length === 0 ? (
                    <span>&nbsp;</span>
                  ) : (
                    tokens.map((token, tokIdx) => (
                      <span key={tokIdx} className={getTokenClasses(token.type)}>
                        {token.text}
                      </span>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
