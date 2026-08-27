import React, { useState, useMemo } from 'react';
import { 
  Copy, 
  Check, 
  Code2, 
  GitCompare, 
  Table, 
  Layers, 
  Sparkles, 
  Search, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  FileCode,
  Tag,
  Sliders
} from 'lucide-react';
import { ChangedPartItem, TargetPipeline, UnityVersion } from '../types';
import { HLSLCodeViewer } from './HLSLCodeViewer';

interface ChangedPartsViewerProps {
  changedCodeOnly: string;
  changedParts: ChangedPartItem[];
  fullConvertedCode: string;
  sourceCode: string;
  pipeline: TargetPipeline;
  unityVersion: UnityVersion;
  onSwitchToFullCode?: () => void;
}

export const ChangedPartsViewer: React.FC<ChangedPartsViewerProps> = ({
  changedCodeOnly,
  changedParts,
  fullConvertedCode,
  sourceCode,
  pipeline,
  unityVersion,
  onSwitchToFullCode
}) => {
  const [subView, setSubView] = useState<'snippet' | 'diff_cards' | 'matrix'>('snippet');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [copiedSnippet, setCopiedSnippet] = useState<boolean>(false);
  const [copiedRowId, setCopiedRowId] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    changedParts.forEach(p => set.add(p.category));
    return ['All', ...Array.from(set)];
  }, [changedParts]);

  const filteredParts = useMemo(() => {
    return changedParts.filter(part => {
      const matchesCat = categoryFilter === 'All' || part.category === categoryFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        part.sourceSnippet.toLowerCase().includes(q) ||
        part.convertedSnippet.toLowerCase().includes(q) ||
        part.explanation.toLowerCase().includes(q) ||
        part.category.toLowerCase().includes(q);

      return matchesCat && matchesSearch;
    });
  }, [changedParts, categoryFilter, searchQuery]);

  const handleCopySnippet = async () => {
    try {
      await navigator.clipboard.writeText(changedCodeOnly);
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    } catch (err) {
      console.error('Failed to copy changed snippet:', err);
    }
  };

  const handleCopyRow = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedRowId(id);
      setTimeout(() => setCopiedRowId(null), 1500);
    } catch (err) {
      console.error('Failed to copy row:', err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0C0E] text-slate-200">
      
      {/* Top Header & Sub-View Switcher */}
      <div className="bg-[#111317] border-b border-[#23272F] px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
        
        {/* Left: View Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none py-0.5">
          <button
            id="btn-changed-view-snippet"
            onClick={() => setSubView('snippet')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              subView === 'snippet'
                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                : 'bg-[#181B20] text-slate-400 hover:text-slate-200 border border-[#262B34]'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Pure Converted Logic</span>
          </button>

          <button
            id="btn-changed-view-cards"
            onClick={() => setSubView('diff_cards')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              subView === 'diff_cards'
                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                : 'bg-[#181B20] text-slate-400 hover:text-slate-200 border border-[#262B34]'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5 text-amber-400" />
            <span>Before / After Diffs</span>
            <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 text-[10px] rounded-full font-mono">
              {changedParts.length}
            </span>
          </button>

          <button
            id="btn-changed-view-matrix"
            onClick={() => setSubView('matrix')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              subView === 'matrix'
                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                : 'bg-[#181B20] text-slate-400 hover:text-slate-200 border border-[#262B34]'
            }`}
          >
            <Table className="w-3.5 h-3.5 text-cyan-400" />
            <span>Changes Matrix</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            id="btn-copy-changed-snippet"
            onClick={handleCopySnippet}
            className="flex items-center space-x-1 px-2.5 py-1 bg-[#1E232B] hover:bg-[#282F3A] text-slate-200 text-xs font-medium rounded border border-[#2D343F] hover:border-slate-500 transition cursor-pointer shadow-xs"
            title="Copy only the converted functions and logic without ShaderLab boilerplate"
          >
            {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-indigo-400" />}
            <span>{copiedSnippet ? 'Snippet Copied!' : 'Copy Changed Logic'}</span>
          </button>

          {onSwitchToFullCode && (
            <button
              onClick={onSwitchToFullCode}
              className="text-[11px] text-indigo-300 hover:text-indigo-200 hover:underline px-1.5 py-1 cursor-pointer"
            >
              View Full Shader &rarr;
            </button>
          )}
        </div>
      </div>

      {/* Sub-View 1: Pure Converted Logic Code Viewer */}
      {subView === 'snippet' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="bg-[#14171D] border-b border-[#23272F] px-3.5 py-1.5 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Showing <strong>isolated converted HLSL functions, CBUFFER, and texture samplers</strong> (no outer ShaderLab boilerplate)
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              Target: {pipeline.toUpperCase()} &bull; Unity {unityVersion}
            </span>
          </div>
          <div className="flex-1 min-h-0">
            <HLSLCodeViewer code={changedCodeOnly || '// No converted logic found'} />
          </div>
        </div>
      )}

      {/* Sub-View 2: Before / After Diff Cards */}
      {subView === 'diff_cards' && (
        <div className="flex-1 flex flex-col min-h-0 p-4 space-y-3 overflow-y-auto scrollbar-thin">
          
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111317] p-2.5 rounded-lg border border-[#23272F]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search modified functions, macros, or variables..."
                className="w-full bg-[#0D0F12] border border-[#2A2F3A] rounded pl-8 pr-2 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer whitespace-nowrap ${
                    categoryFilter === cat
                      ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50'
                      : 'bg-[#181B20] text-slate-400 hover:text-slate-200 border border-[#262B34]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          {filteredParts.length === 0 ? (
            <div className="p-8 text-center bg-[#111317] rounded-lg border border-[#23272F] text-slate-400 text-xs">
              No changed parts match the selected filter.
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredParts.map((part) => (
                <div 
                  key={part.id} 
                  className="bg-[#12151B] border border-[#23272F] hover:border-[#353C49] rounded-lg p-3.5 transition shadow-xs space-y-2.5"
                >
                  {/* Card Header: Category & Reason */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-mono text-[10px] font-semibold">
                      {part.category}
                    </span>
                    <button
                      onClick={() => handleCopyRow(part.id, part.convertedSnippet)}
                      className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-[#1A1E26] text-[10px] flex items-center gap-1 cursor-pointer"
                      title="Copy converted snippet"
                    >
                      {copiedRowId === part.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400" />
                          <span>Copy HLSL</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Side-by-Side Diff Block */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {/* Before: Source */}
                    <div className="bg-[#161214] border border-rose-500/25 rounded p-2.5 font-mono text-xs text-rose-200 overflow-x-auto scrollbar-thin">
                      <div className="text-[10px] font-sans font-semibold text-rose-400/80 mb-1 uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                        Source (Original)
                      </div>
                      <pre className="whitespace-pre-wrap break-words">{part.sourceSnippet}</pre>
                    </div>

                    {/* After: Converted */}
                    <div className="bg-[#0E1714] border border-emerald-500/30 rounded p-2.5 font-mono text-xs text-emerald-200 overflow-x-auto scrollbar-thin">
                      <div className="text-[10px] font-sans font-semibold text-emerald-400/80 mb-1 uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        Target HLSL ({pipeline.toUpperCase()})
                      </div>
                      <pre className="whitespace-pre-wrap break-words">{part.convertedSnippet}</pre>
                    </div>
                  </div>

                  {/* Explanation Footer */}
                  <div className="text-[11px] text-slate-400 bg-[#161921] px-2.5 py-1.5 rounded border border-[#222733] flex items-start gap-1.5">
                    <Zap className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                    <span>{part.explanation}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* Sub-View 3: Changes Matrix Table */}
      {subView === 'matrix' && (
        <div className="flex-1 flex flex-col min-h-0 p-4 space-y-3 overflow-y-auto scrollbar-thin">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium text-slate-200">Full Changes & Transpilation Ledger</span>
            <span>{changedParts.length} conversions recorded</span>
          </div>

          <div className="border border-[#23272F] rounded-lg overflow-hidden bg-[#111317]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#16181F] text-slate-400 border-b border-[#23272F]">
                <tr>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Original Expression</th>
                  <th className="px-3 py-2">URP HLSL Replacement</th>
                  <th className="px-3 py-2">Rationale & Rule</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#23272F] font-mono text-slate-300">
                {changedParts.map((part) => (
                  <tr key={part.id} className="hover:bg-[#151821] transition">
                    <td className="px-3 py-2 font-sans">
                      <span className="px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 text-[10px] font-medium border border-indigo-500/25">
                        {part.category}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-rose-300 font-mono text-[11px] max-w-[200px] truncate" title={part.sourceSnippet}>
                      {part.sourceSnippet}
                    </td>
                    <td className="px-3 py-2 text-emerald-300 font-mono text-[11px] max-w-[220px] truncate" title={part.convertedSnippet}>
                      {part.convertedSnippet}
                    </td>
                    <td className="px-3 py-2 font-sans text-slate-400 text-[11px] max-w-[300px]">
                      {part.explanation}
                    </td>
                    <td className="px-3 py-2 text-right font-sans">
                      <button
                        onClick={() => handleCopyRow(part.id, part.convertedSnippet)}
                        className="px-2 py-0.5 rounded bg-[#1C2028] hover:bg-[#252A36] text-slate-300 text-[10px] cursor-pointer"
                        title="Copy HLSL snippet"
                      >
                        {copiedRowId === part.id ? 'Copied' : 'Copy'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
