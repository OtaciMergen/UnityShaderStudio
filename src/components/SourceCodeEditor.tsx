import React, { useState, useMemo, useRef } from 'react';
import { 
  tokenizeLine, 
  getTokenClasses 
} from '../lib/shaderHighlighter';
import { 
  getEditorTheme, 
  DEFAULT_THEME_ID 
} from '../lib/shaderEditorThemes';
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
  themeId?: string;
}

export const SourceCodeEditor: React.FC<SourceCodeEditorProps> = ({
  code,
  onChange,
  placeholder,
  title,
  onOpenSnippetLibrary,
  themeId = DEFAULT_THEME_ID,
}) => {
  const [viewMode, setViewMode] = useState<'edit' | 'highlight'>('edit');
  const [copied, setCopied] = useState<boolean>(false);
  const [wordWrap, setWordWrap] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeTheme = useMemo(() => getEditorTheme(themeId), [themeId]);

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
    <div 
      className="flex flex-col h-full text-slate-200 transition-colors"
      style={{ backgroundColor: activeTheme.colors.bg }}
    >
      
      {/* Header bar */}
      <div className="bg-[#14171E] px-3 py-1 border-b border-[#202530] flex items-center justify-between gap-2 shrink-0 min-h-[34px]">
        <div className="flex items-center space-x-2 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
          <span className="font-mono text-[11px] font-semibold text-slate-200 truncate">
            {title}
          </span>
        </div>

        <div className="flex items-center space-x-1 shrink-0">
          {/* Snippet Library Trigger Button */}
          {onOpenSnippetLibrary && (
            <button
              id="btn-open-snippet-library-editor"
              onClick={onOpenSnippetLibrary}
              className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-medium transition cursor-pointer"
              title="Browse, insert, and save GLSL shader snippets"
            >
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>Snippets</span>
            </button>
          )}

          {/* Edit / Highlight Toggle */}
          <div className="inline-flex items-center bg-[#0C0E12] border border-[#1E232E] rounded p-0.5">
            <button
              onClick={() => setViewMode('edit')}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition cursor-pointer ${
                viewMode === 'edit' ? 'bg-indigo-600 text-white font-medium shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Interactive Source Editor"
            >
              <Edit3 className="w-2.5 h-2.5" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => setViewMode('highlight')}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition cursor-pointer ${
                viewMode === 'highlight' ? 'bg-indigo-600 text-white font-medium shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Syntax Highlighted View"
            >
              <Code className="w-2.5 h-2.5" />
              <span>Highlight</span>
            </button>
          </div>

          <button
            onClick={() => setWordWrap(!wordWrap)}
            className={`p-1 rounded text-[10px] transition cursor-pointer ${
              wordWrap ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-[#1C2029]'
            }`}
            title="Toggle Word Wrap"
          >
            <WrapText className="w-3 h-3" />
          </button>

          <button
            onClick={handleCopy}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-[#1C2029] transition cursor-pointer"
            title="Copy Source Code"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>

          <button
            onClick={handleClear}
            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-[#1C2029] transition cursor-pointer"
            title="Clear Source Code"
          >
            <Trash2 className="w-3 h-3" />
          </button>

          <span className="text-[10px] text-slate-500 font-mono pl-1 flex items-center gap-0.5">
            <Hash className="w-2.5 h-2.5" />
            {lines.length}
          </span>
        </div>
      </div>

      {/* Editor Body */}
      <div 
        className="relative flex-1 min-h-[440px] overflow-auto font-mono text-xs transition-colors"
        style={{ backgroundColor: activeTheme.colors.bg }}
      >
        {viewMode === 'edit' ? (
          <div className="flex h-full min-h-[440px]">
            {/* Gutter with line numbers */}
            <div 
              className="w-9 shrink-0 py-2.5 select-none text-right pr-2 text-[11px] font-mono leading-relaxed border-r transition-colors"
              style={{ 
                backgroundColor: activeTheme.colors.gutterBg,
                borderColor: activeTheme.colors.gutterBorder,
                color: activeTheme.colors.gutterText
              }}
            >
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
              style={{ 
                backgroundColor: activeTheme.colors.bg,
                color: '#F1F5F9'
              }}
              className={`flex-1 p-2.5 font-mono text-xs leading-relaxed resize-none focus:outline-none selection:bg-indigo-500/30 border-none ${
                wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre overflow-x-auto'
              }`}
            />
          </div>
        ) : (
          <div className="p-1.5">
            {tokenizedLines.map((tokens, lineIdx) => (
              <div
                key={lineIdx}
                className="flex items-start hover:bg-[#15181E]/40 pl-1 rounded-xs"
              >
                <div 
                  className="w-9 shrink-0 text-right pr-2 select-none text-[11px] font-mono py-0.5"
                  style={{ color: activeTheme.colors.gutterText }}
                >
                  {lineIdx + 1}
                </div>
                <div className={`flex-1 py-0.5 pr-3 ${wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'}`}>
                  {tokens.length === 0 ? (
                    <span>&nbsp;</span>
                  ) : (
                    tokens.map((token, tokIdx) => (
                      <span key={tokIdx} className={getTokenClasses(token.type, activeTheme)}>
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
