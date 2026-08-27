import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Copy, 
  Check, 
  ArrowRight, 
  FileText, 
  BookOpen, 
  ExternalLink, 
  Filter, 
  Cpu, 
  Sparkles,
  Layers,
  Code2,
  Bookmark,
  CheckCircle2,
  Zap,
  Info,
  FileCode
} from 'lucide-react';
import { CONVERSION_MAPPINGS, ConversionMappingItem } from '../data/conversionMappings';

interface ConversionTableViewerProps {
  onSelectPreset?: (presetId: string) => void;
  onOpenDocTopic?: (topicId: string) => void;
}

export const ConversionTableViewer: React.FC<ConversionTableViewerProps> = ({
  onSelectPreset,
  onOpenDocTopic
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'All' | 'GLSL' | 'Built-in CG / ShaderLab'>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [selectedItem, setSelectedItem] = useState<ConversionMappingItem>(CONVERSION_MAPPINGS[0]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = [
    'All',
    'Math Function',
    'Matrix & Coordinate',
    'Texture & Sampler',
    'Built-in Variable & Uniform',
    'Light & Shadow',
    'Type & Semantic',
    'Preprocessor & Macro',
  ];

  const filteredMappings = useMemo(() => {
    return CONVERSION_MAPPINGS.filter(item => {
      const matchesSource = 
        sourceFilter === 'All' || 
        item.sourceLanguage === sourceFilter || 
        item.sourceLanguage === 'Both';
      
      const matchesCategory = 
        categoryFilter === 'All' || 
        item.sourceCategory === categoryFilter;

      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesSource && matchesCategory;

      const matchesSearch = 
        item.sourceName.toLowerCase().includes(q) ||
        item.urpEquivalent.toLowerCase().includes(q) ||
        item.urpFieldOrSignature.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.notes.toLowerCase().includes(q) ||
        (item.urpInclude && item.urpInclude.toLowerCase().includes(q));

      return matchesSource && matchesCategory && matchesSearch;
    });
  }, [searchQuery, sourceFilter, categoryFilter]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Filter Controls */}
      <div className="bg-[#16181D] border border-[#23272F] rounded-lg p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Code2 className="w-5 h-5 text-indigo-400" />
              <h2 className="text-sm font-semibold text-slate-100">
                GLSL & Unity Built-in → URP Conversion Matrix & Field Reference
              </h2>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                {CONVERSION_MAPPINGS.length} Signatures
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Direct lookup table mapping OpenGL GLSL functions and legacy Unity Built-in CG variables to modern Universal Render Pipeline (URP 14/17 & Unity 6) HLSL constructs.
            </p>
          </div>

          {/* Quick Source Filter Tabs */}
          <div className="flex items-center space-x-1 bg-[#121418] p-1 rounded-md border border-[#23272F]">
            <button
              id="filter-source-all"
              onClick={() => setSourceFilter('All')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                sourceFilter === 'All'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Sources ({CONVERSION_MAPPINGS.length})
            </button>
            <button
              id="filter-source-glsl"
              onClick={() => setSourceFilter('GLSL')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                sourceFilter === 'GLSL'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              GLSL → URP
            </button>
            <button
              id="filter-source-builtin"
              onClick={() => setSourceFilter('Built-in CG / ShaderLab')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                sourceFilter === 'Built-in CG / ShaderLab'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Built-in CG → URP
            </button>
          </div>
        </div>

        {/* Search & Category Bar */}
        <div className="mt-4 pt-3 border-t border-[#23272F] flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              id="conversion-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search functions (e.g. UnityObjectToClipPos, mix, tex2D, _WorldSpaceLightPos0, mod, TransformWorldToHClip)..."
              className="w-full bg-[#1A1D21] border border-[#2D343F] rounded-md pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded text-[11px] whitespace-nowrap transition-colors cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-[#23272F] text-slate-100 border border-indigo-500/40 font-medium'
                    : 'bg-[#1A1D21] text-slate-400 border border-[#2D343F] hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Dual-Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Table List */}
        <div className="lg:col-span-5 bg-[#16181D] border border-[#23272F] rounded-lg flex flex-col h-[650px] shadow-sm">
          <div className="p-3 border-b border-[#23272F] flex items-center justify-between bg-[#1A1D21]/70">
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Mapping Definitions ({filteredMappings.length})
            </span>
            <span className="text-[11px] text-slate-400">Click item for deep-dive</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#23272F]/60">
            {filteredMappings.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No conversion definitions match &ldquo;{searchQuery}&rdquo;.
              </div>
            ) : (
              filteredMappings.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                return (
                  <div
                    key={item.id}
                    id={`mapping-row-${item.id}`}
                    onClick={() => setSelectedItem(item)}
                    className={`p-3 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-950/30 border-l-2 border-indigo-500'
                        : 'hover:bg-[#1E232B] border-l-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono text-xs font-semibold text-slate-200 truncate">
                        {item.sourceName}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-medium ${
                          item.sourceLanguage === 'GLSL'
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                            : item.sourceLanguage === 'Built-in CG / ShaderLab'
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                            : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                        }`}
                      >
                        {item.sourceLanguage === 'Built-in CG / ShaderLab' ? 'Built-in' : item.sourceLanguage}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-mono text-indigo-300 truncate">
                      <ArrowRight className="w-3 h-3 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{item.urpEquivalent}</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
                      <span>{item.sourceCategory}</span>
                      {item.urpInclude && (
                        <span className="truncate max-w-[140px] text-slate-500">
                          {item.urpInclude.split('/').pop()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Deep Dive Details */}
        <div className="lg:col-span-7 bg-[#16181D] border border-[#23272F] rounded-lg p-5 flex flex-col h-[650px] overflow-y-auto shadow-sm space-y-5">
          {selectedItem ? (
            <>
              {/* Header Details */}
              <div className="border-b border-[#23272F] pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    {selectedItem.sourceCategory}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Origin: <strong className="text-slate-200">{selectedItem.sourceLanguage}</strong>
                  </span>
                </div>

                <div className="mt-3 flex items-baseline gap-2">
                  <h3 className="text-base font-bold font-mono text-slate-100">
                    {selectedItem.sourceName}
                  </h3>
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                  <span className="text-base font-bold font-mono text-indigo-400">
                    {selectedItem.urpEquivalent}
                  </span>
                </div>

                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  {selectedItem.description}
                </p>
              </div>

              {/* URP Include & Signature */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-indigo-400" /> URP 14/17 & Unity 6 Signature
                  </span>
                  {selectedItem.urpInclude && (
                    <span className="text-[10px] font-mono text-slate-400">
                      Required Header
                    </span>
                  )}
                </div>

                {selectedItem.urpInclude && (
                  <div className="bg-[#0D0F12] p-2.5 rounded border border-[#2D343F] font-mono text-xs text-emerald-400 flex items-center justify-between">
                    <span>#include &quot;{selectedItem.urpInclude}&quot;</span>
                    <button
                      onClick={() => handleCopy(`#include "${selectedItem.urpInclude}"`, 'include')}
                      className="text-slate-400 hover:text-slate-200 cursor-pointer p-1"
                      title="Copy include directive"
                    >
                      {copiedId === 'include' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}

                <div className="bg-[#0D0F12] p-2.5 rounded border border-[#2D343F] font-mono text-xs text-indigo-300">
                  {selectedItem.urpFieldOrSignature}
                </div>
              </div>

              {/* Side by Side Code Comparison */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-amber-400" /> Migration Syntax Comparison
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Before */}
                  <div className="bg-[#0D0F12] border border-[#2D343F] rounded-md p-3">
                    <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#23272F] text-[10px] font-medium text-slate-400">
                      <span className="text-amber-400">Before ({selectedItem.sourceLanguage})</span>
                    </div>
                    <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {selectedItem.exampleBefore}
                    </pre>
                  </div>

                  {/* After */}
                  <div className="bg-[#0D0F12] border border-indigo-500/30 rounded-md p-3 relative group">
                    <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#23272F] text-[10px] font-medium text-slate-400">
                      <span className="text-emerald-400 font-semibold">After (URP HLSL)</span>
                      <button
                        onClick={() => handleCopy(selectedItem.exampleAfter, 'after_code')}
                        className="text-slate-400 hover:text-slate-200 cursor-pointer flex items-center gap-1"
                        title="Copy URP HLSL Snippet"
                      >
                        {copiedId === 'after_code' ? (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Copied
                          </span>
                        ) : (
                          <span className="text-[10px] flex items-center gap-0.5">
                            <Copy className="w-3 h-3" /> Copy
                          </span>
                        )}
                      </button>
                    </div>
                    <pre className="text-xs font-mono text-indigo-300 whitespace-pre-wrap leading-relaxed">
                      {selectedItem.exampleAfter}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Engineering Notes */}
              <div className="bg-[#12151B] border border-[#23272F] rounded-md p-3 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                  <Info className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Pipeline & Compiler Notes</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  {selectedItem.notes}
                </p>
              </div>

              {/* Related SRP Architecture Documentation Guide */}
              {selectedItem.docTopicId && onOpenDocTopic && (
                <div className="bg-emerald-950/20 border border-emerald-500/25 rounded-md p-3 text-xs flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-400" /> Related SRP Architecture Guide
                    </span>
                    <p className="text-[11px] text-slate-300">
                      Topic: <span className="font-mono text-emerald-300">{selectedItem.docTopicId.replace(/_/g, ' ')}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => onOpenDocTopic(selectedItem.docTopicId!)}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-medium transition cursor-pointer flex-shrink-0"
                  >
                    <span>Read Guide</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Official Spec & Manual References (GLSL & URP) */}
              {(selectedItem.glslDocRef || selectedItem.urpDocRef) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {selectedItem.glslDocRef && (
                    <div className="bg-[#12151B] border border-[#23272F] rounded-md p-2.5 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-rose-400 font-medium flex items-center gap-1 text-[11px]">
                          <FileCode className="w-3 h-3 text-rose-400" /> GLSL Reference Spec
                        </span>
                        {selectedItem.glslDocRef.section && (
                          <span className="text-[10px] text-slate-400 font-mono">{selectedItem.glslDocRef.section}</span>
                        )}
                      </div>
                      <p className="text-slate-300 text-[11px] font-medium">{selectedItem.glslDocRef.title}</p>
                      {selectedItem.glslDocRef.url && (
                        <a
                          href={selectedItem.glslDocRef.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 mt-0.5"
                        >
                          <span>Khronos GLSL Documentation</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}

                  {selectedItem.urpDocRef && (
                    <div className="bg-[#12151B] border border-[#23272F] rounded-md p-2.5 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-400 font-medium flex items-center gap-1 text-[11px]">
                          <BookOpen className="w-3 h-3 text-emerald-400" /> Unity URP Reference
                        </span>
                        {selectedItem.urpDocRef.section && (
                          <span className="text-[10px] text-slate-400 font-mono">{selectedItem.urpDocRef.section}</span>
                        )}
                      </div>
                      <p className="text-slate-300 text-[11px] font-medium">{selectedItem.urpDocRef.title}</p>
                      {selectedItem.urpDocRef.url && (
                        <a
                          href={selectedItem.urpDocRef.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 mt-0.5"
                        >
                          <span>Unity Manual / HLSL Guide</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Academic or Official Citation (if available) */}
              {selectedItem.academicOrOfficialRef && (
                <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-md p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-indigo-300 font-semibold flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-400" /> Official Source / Reference
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {selectedItem.academicOrOfficialRef.type}
                    </span>
                  </div>
                  <p className="text-slate-300 font-medium">
                    {selectedItem.academicOrOfficialRef.title}
                  </p>
                  {selectedItem.academicOrOfficialRef.author && (
                    <p className="text-[11px] text-slate-400">
                      Author: {selectedItem.academicOrOfficialRef.author}
                    </p>
                  )}
                  {selectedItem.academicOrOfficialRef.url && (
                    <a
                      href={selectedItem.academicOrOfficialRef.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 mt-1"
                    >
                      <span>Read Documentation</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
              Select a signature from the list to view its complete translation details.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
