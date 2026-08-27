import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  tokenizeLine, 
  getTokenClasses, 
  extractLandmarks, 
  CodeLandmark 
} from '../lib/shaderHighlighter';
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Info, 
  WrapText, 
  Layers, 
  Hash
} from 'lucide-react';

interface HLSLCodeViewerProps {
  code: string;
  language?: 'hlsl' | 'glsl' | 'shaderlab';
}

export const HLSLCodeViewer: React.FC<HLSLCodeViewerProps> = ({ 
  code
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [showLegend, setShowLegend] = useState<boolean>(false);
  const [wordWrap, setWordWrap] = useState<boolean>(false);
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Split code into lines & tokenize
  const lines = useMemo(() => {
    return code.split('\n');
  }, [code]);

  const tokenizedLines = useMemo(() => {
    return lines.map(line => tokenizeLine(line));
  }, [lines]);

  // Extract structural landmarks
  const landmarks: CodeLandmark[] = useMemo(() => {
    return extractLandmarks(code);
  }, [code]);

  // Find search query matches (matching line indices)
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const matches: { lineIdx: number; charIdx: number }[] = [];
    lines.forEach((line, lineIdx) => {
      let pos = 0;
      const lower = line.toLowerCase();
      while ((pos = lower.indexOf(q, pos)) !== -1) {
        matches.push({ lineIdx, charIdx: pos });
        pos += q.length;
      }
    });
    return matches;
  }, [lines, searchQuery]);

  // Keyboard shortcut Ctrl+F / Cmd+F to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        const container = containerRef.current;
        if (container && container.contains(document.activeElement)) {
          e.preventDefault();
          setShowSearch(true);
          setTimeout(() => searchInputRef.current?.focus(), 50);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const scrollToLine = (lineNum: number) => {
    setActiveLine(lineNum);
    const el = document.getElementById(`code-line-${lineNum}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleNextMatch = () => {
    if (searchMatches.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % searchMatches.length;
    setCurrentMatchIndex(nextIdx);
    scrollToLine(searchMatches[nextIdx].lineIdx + 1);
  };

  const handlePrevMatch = () => {
    if (searchMatches.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    setCurrentMatchIndex(prevIdx);
    scrollToLine(searchMatches[prevIdx].lineIdx + 1);
  };

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-[#0A0C0E] text-slate-200 select-text font-mono text-xs">
      
      {/* Top Utility Bar: Landmarks & Controls */}
      <div className="bg-[#111317] border-b border-[#23272F] px-3 py-1.5 flex items-center justify-between gap-2 text-[11px] shrink-0">
        
        {/* Landmarks Quick Bar */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5 max-w-[65%]">
          <span className="text-slate-500 text-[10px] font-sans flex items-center gap-1 mr-1 shrink-0">
            <Layers className="w-3 h-3 text-indigo-400" />
            <span className="hidden sm:inline">Blocks:</span>
          </span>
          {landmarks.length === 0 ? (
            <span className="text-slate-500 text-[10px] italic">HLSL Block</span>
          ) : (
            landmarks.map((lm, idx) => (
              <button
                key={idx}
                onClick={() => scrollToLine(lm.lineNumber)}
                className={`px-1.5 py-0.5 rounded text-[10px] transition cursor-pointer whitespace-nowrap border ${
                  activeLine === lm.lineNumber
                    ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                    : 'bg-[#181B20] text-slate-400 border-[#262B34] hover:text-slate-200 hover:border-slate-600'
                }`}
                title={`Jump to line ${lm.lineNumber}`}
              >
                {lm.label}
              </button>
            ))
          )}
        </div>

        {/* Action Controls: Search, Wrap, Legend */}
        <div className="flex items-center space-x-1.5 shrink-0">
          
          {/* Search Toggle Button */}
          <button
            onClick={() => {
              setShowSearch(!showSearch);
              if (!showSearch) setTimeout(() => searchInputRef.current?.focus(), 50);
            }}
            className={`p-1 rounded transition cursor-pointer ${
              showSearch ? 'bg-indigo-600/30 text-indigo-300' : 'text-slate-400 hover:text-slate-200 hover:bg-[#1A1D22]'
            }`}
            title="Search in code (Ctrl+F)"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* Word Wrap Toggle */}
          <button
            onClick={() => setWordWrap(!wordWrap)}
            className={`p-1 rounded transition cursor-pointer ${
              wordWrap ? 'bg-indigo-600/30 text-indigo-300' : 'text-slate-400 hover:text-slate-200 hover:bg-[#1A1D22]'
            }`}
            title="Toggle Word Wrap"
          >
            <WrapText className="w-3.5 h-3.5" />
          </button>

          {/* Syntax Legend Toggle */}
          <button
            onClick={() => setShowLegend(!showLegend)}
            className={`flex items-center space-x-1 px-1.5 py-0.5 rounded transition cursor-pointer text-[10px] ${
              showLegend ? 'bg-indigo-600/30 text-indigo-300' : 'text-slate-400 hover:text-slate-200 hover:bg-[#1A1D22]'
            }`}
            title="Show Syntax Legend"
          >
            <Info className="w-3 h-3" />
            <span className="hidden md:inline">Syntax</span>
          </button>

          {/* Total Lines Counter */}
          <span className="text-slate-500 text-[10px] pl-1 font-mono flex items-center gap-0.5">
            <Hash className="w-2.5 h-2.5" />
            {lines.length}
          </span>
        </div>
      </div>

      {/* In-Code Search Bar */}
      {showSearch && (
        <div className="bg-[#16191F] border-b border-[#23272F] px-3 py-1.5 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center space-x-2 flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentMatchIndex(0);
              }}
              placeholder="Find in shader..."
              className="bg-[#0D0F12] border border-[#2A2F3A] rounded px-2 py-0.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-full"
            />
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
            {searchQuery.trim() && (
              <span>
                {searchMatches.length > 0
                  ? `${currentMatchIndex + 1} of ${searchMatches.length}`
                  : 'No matches'}
              </span>
            )}

            <button
              onClick={handlePrevMatch}
              disabled={searchMatches.length === 0}
              className="p-1 hover:bg-[#23272F] rounded text-slate-300 disabled:opacity-30 cursor-pointer"
              title="Previous match"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleNextMatch}
              disabled={searchMatches.length === 0}
              className="p-1 hover:bg-[#23272F] rounded text-slate-300 disabled:opacity-30 cursor-pointer"
              title="Next match"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setShowSearch(false);
                setSearchQuery('');
              }}
              className="p-1 hover:bg-[#23272F] rounded text-slate-400 hover:text-slate-200 cursor-pointer"
              title="Close search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Syntax Legend Bar */}
      {showLegend && (
        <div className="bg-[#12141A] border-b border-[#23272F] px-3.5 py-2 text-[11px] flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-300 shrink-0 font-sans">
          <div className="font-semibold text-slate-400 uppercase text-[9px] tracking-wider">Syntax Legend:</div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-fuchsia-400"></span>
            <span className="text-fuchsia-400 font-mono font-semibold">Structural Blocks</span>
            <span className="text-slate-500 text-[10px]">(Shader, Pass, CBUFFER)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-pink-400"></span>
            <span className="text-pink-400 font-mono">#pragma / #include</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span className="text-amber-400 font-mono">Keywords</span>
            <span className="text-slate-500 text-[10px]">(struct, return, if)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-300"></span>
            <span className="text-cyan-300 font-mono">Types & Structs</span>
            <span className="text-slate-500 text-[10px]">(float4, Varyings)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-emerald-400 font-mono">Uniforms & Properties</span>
            <span className="text-slate-500 text-[10px]">(_BaseMap, _Time)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-300"></span>
            <span className="text-orange-300 font-mono">Semantics</span>
            <span className="text-slate-500 text-[10px]">(SV_Target, POSITION)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-300"></span>
            <span className="text-indigo-300 font-mono">SRP Helpers</span>
            <span className="text-slate-500 text-[10px]">(TransformObjectToHClip)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-lime-300"></span>
            <span className="text-lime-300 font-mono">Strings</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-500"></span>
            <span className="text-slate-500 font-mono italic">Comments</span>
          </div>
        </div>
      )}

      {/* Code Display Area with Line Numbers and Syntax Tokens */}
      <div className="flex-1 overflow-auto p-2 scrollbar-thin">
        <div className="min-w-full inline-block font-mono text-xs leading-relaxed">
          {tokenizedLines.map((tokens, lineIdx) => {
            const lineNum = lineIdx + 1;
            const isMatchLine = searchMatches.some(m => m.lineIdx === lineIdx);
            const isSelected = activeLine === lineNum;

            return (
              <div
                id={`code-line-${lineNum}`}
                key={lineIdx}
                onClick={() => setActiveLine(lineNum)}
                className={`flex items-start hover:bg-[#15181E] group transition-colors rounded-xs ${
                  isSelected ? 'bg-indigo-950/40 border-l-2 border-indigo-500 pl-1' : 'pl-1.5'
                } ${isMatchLine && searchQuery.trim() ? 'bg-amber-950/20' : ''}`}
              >
                {/* Line Number Gutter */}
                <div className="w-10 shrink-0 text-right pr-3 text-slate-600 select-none text-[11px] group-hover:text-slate-400 font-mono py-0.5">
                  {lineNum}
                </div>

                {/* Code Content */}
                <div className={`flex-1 py-0.5 pr-4 ${wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'}`}>
                  {tokens.length === 0 ? (
                    <span>&nbsp;</span>
                  ) : (
                    tokens.map((token, tokIdx) => {
                      const tokenClass = getTokenClasses(token.type);
                      
                      // Highlight search terms if present
                      if (searchQuery.trim() && token.text.toLowerCase().includes(searchQuery.toLowerCase())) {
                        return (
                          <span
                            key={tokIdx}
                            className={`${tokenClass} bg-amber-500/30 text-amber-200 rounded-xs px-0.5`}
                          >
                            {token.text}
                          </span>
                        );
                      }

                      return (
                        <span key={tokIdx} className={tokenClass}>
                          {token.text}
                        </span>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
