import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Search, 
  Clock, 
  Tag, 
  CheckCircle2, 
  Copy, 
  Check, 
  ArrowRight,
  ExternalLink,
  Layers,
  ChevronRight
} from 'lucide-react';
import { DOCUMENTATION_CHAPTERS } from '../data/documentationGuides';
import { DocChapter } from '../types';

interface DocumentationViewerProps {
  initialTopicId?: string;
  onSelectTopic?: (topicId: string) => void;
}

export const DocumentationViewer: React.FC<DocumentationViewerProps> = ({ initialTopicId, onSelectTopic }) => {
  const [selectedChapter, setSelectedChapter] = useState<DocChapter>(() => {
    if (initialTopicId) {
      const found = DOCUMENTATION_CHAPTERS.find(c => c.id === initialTopicId);
      if (found) return found;
    }
    return DOCUMENTATION_CHAPTERS[0];
  });

  useEffect(() => {
    if (initialTopicId) {
      const found = DOCUMENTATION_CHAPTERS.find(c => c.id === initialTopicId);
      if (found) {
        setSelectedChapter(found);
      }
    }
  }, [initialTopicId]);

  const [searchFilter, setSearchFilter] = useState<string>('');
  const [copiedBlock, setCopiedBlock] = useState<string | null>(null);

  const filteredChapters = DOCUMENTATION_CHAPTERS.filter(ch => {
    const q = searchFilter.toLowerCase();
    return (
      ch.title.toLowerCase().includes(q) ||
      ch.summary.toLowerCase().includes(q) ||
      ch.category.toLowerCase().includes(q) ||
      ch.tags.some(t => t.toLowerCase().includes(q))
    );
  });

  const handleCopyCode = (code: string, blockId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedBlock(blockId);
    setTimeout(() => setCopiedBlock(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      
      {/* Top Banner */}
      <div className="bg-[#16181D] border border-[#23272F] rounded-lg p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span>Unity Scriptable Render Pipeline Migration Manual</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            In-depth engineering documentation on SRP Batcher constant buffers, Reversed-Z depth, separated samplers, and custom nodes.
          </p>
        </div>

        <div className="text-xs font-mono text-slate-400 bg-[#0A0C0E] px-2.5 py-1 rounded border border-[#2D343F]">
          5 Core Architecture Guides
        </div>
      </div>

      {/* Main Grid: Left Navigation, Right Article Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT: Chapters Sidebar (4 Cols) */}
        <div className="lg:col-span-4 bg-[#16181D] border border-[#23272F] rounded-lg overflow-hidden shadow-sm space-y-3 p-3">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter documentation guides..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#0A0C0E] text-slate-200 placeholder-slate-500 rounded text-xs border border-[#2D343F] focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Chapter List */}
          <div className="space-y-1">
            {filteredChapters.map(chapter => (
              <button
                key={chapter.id}
                onClick={() => setSelectedChapter(chapter)}
                className={`w-full text-left p-2.5 rounded transition flex flex-col space-y-1 cursor-pointer ${
                  selectedChapter.id === chapter.id
                    ? 'bg-indigo-600/10 border border-indigo-500/30 text-indigo-300'
                    : 'hover:bg-[#121418] border border-transparent text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-medium uppercase text-indigo-400">{chapter.category}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{chapter.readTime}</span>
                  </span>
                </div>
                <div className="font-medium text-xs text-slate-100 leading-snug">
                  {chapter.title}
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {chapter.summary}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT: Article Content Viewer (8 Cols) */}
        <div className="lg:col-span-8 bg-[#16181D] border border-[#23272F] rounded-lg p-5 sm:p-6 shadow-sm space-y-5">
          
          {/* Article Header */}
          <div className="border-b border-[#23272F] pb-4 space-y-2.5">
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-medium uppercase text-[10px] border border-indigo-500/20">
                {selectedChapter.category}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{selectedChapter.readTime}</span>
              </span>
            </div>

            <h1 className="text-lg font-semibold text-white tracking-tight leading-snug">
              {selectedChapter.title}
            </h1>

            <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed">
              {selectedChapter.summary}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {selectedChapter.tags.map(t => (
                <span key={t} className="text-[10px] bg-[#0A0C0E] text-slate-400 px-2 py-0.5 rounded border border-[#23272F] flex items-center gap-1">
                  <Tag className="w-2.5 h-2.5 text-indigo-400" />
                  <span>{t}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Article Markdown Body */}
          <div className="space-y-3.5 text-xs sm:text-[13px] text-slate-300 leading-relaxed">
            {renderMarkdown(selectedChapter.contentMarkdown, handleCopyCode, copiedBlock)}
          </div>

        </div>

      </div>

    </div>
  );
};

// Simple Markdown Renderer for technical documentation
function renderMarkdown(
  md: string, 
  onCopy: (code: string, id: string) => void, 
  copiedId: string | null
) {
  const lines = md.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLanguage = '';
  let blockIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        const fullCode = codeBuffer.join('\n');
        const bId = `code-block-${blockIndex++}`;
        elements.push(
          <div key={bId} className="my-2.5 rounded overflow-hidden border border-[#23272F] bg-[#0A0C0E]">
            <div className="bg-[#1A1D21] px-3 py-1 border-b border-[#23272F] flex items-center justify-between text-xs text-slate-400 font-mono">
              <span className="text-[11px]">{codeLanguage || 'code'}</span>
              <button
                onClick={() => onCopy(fullCode, bId)}
                className="flex items-center space-x-1 hover:text-slate-200 transition cursor-pointer text-[11px]"
              >
                {copiedId === bId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedId === bId ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-3 font-mono text-xs text-slate-200 overflow-x-auto">
              <code>{fullCode}</code>
            </pre>
          </div>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLanguage = line.replace('```', '').trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-xs font-semibold text-slate-100 pt-3 pb-1 border-b border-[#23272F]">
          {line.replace('### ', '')}
        </h3>
      );
    } else if (line.startsWith('---')) {
      elements.push(<hr key={i} className="border-[#23272F] my-3" />);
    } else if (line.startsWith('|')) {
      // Simple table rendering
      elements.push(
        <div key={i} className="font-mono text-xs text-slate-300 py-0.5">
          {line}
        </div>
      );
    } else if (line.trim().startsWith('- ')) {
      elements.push(
        <div key={i} className="flex items-start space-x-2 pl-2">
          <span className="text-indigo-400 font-bold">•</span>
          <span className="text-slate-300 text-xs">{line.replace(/^- /, '')}</span>
        </div>
      );
    } else if (line.trim().length > 0) {
      elements.push(
        <p key={i} className="text-slate-300 text-xs sm:text-[13px] leading-relaxed">
          {line}
        </p>
      );
    }
  }

  return elements;
}
