import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Copy, 
  Check, 
  BookOpen, 
  Cpu, 
  Sparkles, 
  ExternalLink, 
  Sliders, 
  CheckCircle2,
  Zap,
  Info,
  ArrowRight,
  FileCode
} from 'lucide-react';
import { SHADING_DICTIONARY } from '../data/shadingDictionary';
import { ShadingFunctionEntry } from '../types';

interface FunctionSearchMatrixProps {
  onOpenDocTopic?: (topicId: string) => void;
}

export const FunctionSearchMatrix: React.FC<FunctionSearchMatrixProps> = ({ onOpenDocTopic }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeEntry, setActiveEntry] = useState<ShadingFunctionEntry>(SHADING_DICTIONARY[0]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const categories = [
    'All',
    'Math',
    'Trigonometry',
    'Vectors',
    'Matrices',
    'Texturing',
    'Derivatives',
    'Bitwise',
    'Compute',
    'Unity SRP',
  ];

  const filteredEntries = useMemo(() => {
    return SHADING_DICTIONARY.filter(item => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesCategory;

      const matchesSearch =
        item.name.toLowerCase().includes(q) ||
        item.glsl.toLowerCase().includes(q) ||
        item.hlsl.toLowerCase().includes(q) ||
        item.cg.toLowerCase().includes(q) ||
        item.wgsl.toLowerCase().includes(q) ||
        item.msl.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      
      {/* Top Banner & Search Input */}
      <div className="bg-[#16181D] border border-[#23272F] rounded-lg p-4 shadow-sm space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Search className="w-4 h-4 text-indigo-400" />
              <span>Cross-Language Shading Function & Matrix Reference</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Interactive lookup matrix comparing built-ins across GLSL (OpenGL/WebGL), HLSL (Unity URP/HDRP), CG, WGSL, and Apple Metal.
            </p>
          </div>
          <div className="text-xs font-mono text-slate-400 bg-[#0A0C0E] px-2.5 py-1 rounded border border-[#2D343F]">
            <span className="text-indigo-400 font-semibold">{SHADING_DICTIONARY.length}</span> functions indexed
          </div>
        </div>

        {/* Search Bar & Category Filter */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search functions (e.g. mix, lerp, mod, texture, TransformObjectToHClip, dFdx)..."
              className="w-full pl-9 pr-3.5 py-1.5 bg-[#0A0C0E] text-slate-200 placeholder-slate-500 rounded text-xs border border-[#2D343F] focus:outline-none focus:border-indigo-500 font-mono shadow-inner"
            />
          </div>

          <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1.5 rounded text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white font-medium shadow-sm'
                    : 'bg-[#0A0C0E] text-slate-400 hover:text-slate-200 border border-[#23272F]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Left Table, Right Deep Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT: Multi-Language Matrix Table (7 Cols) */}
        <div className="lg:col-span-7 bg-[#16181D] border border-[#23272F] rounded-lg overflow-hidden shadow-sm">
          <div className="bg-[#1A1D21] px-3.5 py-2.5 border-b border-[#23272F] flex items-center justify-between">
            <span className="text-xs font-medium text-slate-200 uppercase tracking-wider">
              Search Results ({filteredEntries.length})
            </span>
            <span className="text-[11px] text-slate-400">Click any row for syntax breakdown</span>
          </div>

          <div className="divide-y divide-[#23272F] max-h-[620px] overflow-y-auto">
            {filteredEntries.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No matching functions found for "{searchQuery}".
              </div>
            ) : (
              filteredEntries.map(entry => (
                <div
                  key={entry.id}
                  onClick={() => setActiveEntry(entry)}
                  className={`p-3 cursor-pointer transition flex flex-col space-y-2 ${
                    activeEntry.id === entry.id
                      ? 'bg-indigo-600/10 border-l-2 border-indigo-500'
                      : 'hover:bg-[#121418] border-l-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-200">{entry.name}</span>
                    <span className="text-[10px] uppercase font-medium text-slate-400 bg-[#1A1D21] px-2 py-0.5 rounded border border-[#23272F]">
                      {entry.category}
                    </span>
                  </div>

                  {/* Language Badges Comparison */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                    <div className="bg-[#0A0C0E] p-1.5 rounded border border-[#23272F]">
                      <span className="text-[9px] uppercase font-medium text-rose-400 block">GLSL (OpenGL)</span>
                      <span className="text-slate-200 truncate block text-[11px]">{entry.glsl}</span>
                    </div>

                    <div className="bg-[#0A0C0E] p-1.5 rounded border border-[#23272F]">
                      <span className="text-[9px] uppercase font-medium text-emerald-400 block">HLSL (Unity SRP)</span>
                      <span className="text-emerald-300 font-medium truncate block text-[11px]">{entry.hlsl}</span>
                    </div>

                    <div className="bg-[#0A0C0E] p-1.5 rounded border border-[#23272F] hidden sm:block">
                      <span className="text-[9px] uppercase font-medium text-indigo-400 block">WGSL (WebGPU)</span>
                      <span className="text-slate-300 truncate block text-[11px]">{entry.wgsl}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Deep Inspector Card (5 Cols) */}
        <div className="lg:col-span-5 bg-[#16181D] border border-[#23272F] rounded-lg overflow-hidden shadow-sm sticky top-20">
          <div className="bg-[#1A1D21] px-3.5 py-2.5 border-b border-[#23272F] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-xs font-medium text-slate-200">Function Inspector</span>
            </div>
            <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {activeEntry.category}
            </span>
          </div>

          <div className="p-4 space-y-3.5 max-h-[620px] overflow-y-auto text-xs">
            {/* Title & Description */}
            <div>
              <h3 className="text-sm font-semibold text-white">{activeEntry.name}</h3>
              <p className="text-slate-300 text-xs mt-1 leading-relaxed">{activeEntry.description}</p>
            </div>

            {/* Syntax Comparison Box */}
            <div className="space-y-2">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Syntax Signatures</span>
              
              <div className="space-y-1.5 font-mono text-xs">
                {/* GLSL */}
                <div className="bg-[#0A0C0E] p-2.5 rounded border border-[#23272F] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-rose-400 font-medium block uppercase">GLSL / WebGL</span>
                    <span className="text-slate-200 text-[11px]">{activeEntry.glsl}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(activeEntry.glsl, 'glsl')}
                    className="p-1 hover:bg-[#1E232B] text-slate-400 hover:text-slate-200 rounded transition cursor-pointer"
                    title="Copy GLSL signature"
                  >
                    {copiedKey === 'glsl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* HLSL */}
                <div className="bg-[#0A0C0E] p-2.5 rounded border border-[#23272F] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-emerald-400 font-medium block uppercase">HLSL / Unity SRP</span>
                    <span className="text-emerald-300 font-medium text-[11px]">{activeEntry.hlsl}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(activeEntry.hlsl, 'hlsl')}
                    className="p-1 hover:bg-[#1E232B] text-slate-400 hover:text-slate-200 rounded transition cursor-pointer"
                    title="Copy HLSL signature"
                  >
                    {copiedKey === 'hlsl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* WGSL */}
                <div className="bg-[#0A0C0E] p-2.5 rounded border border-[#23272F] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-indigo-400 font-medium block uppercase">WGSL (WebGPU)</span>
                    <span className="text-slate-300 text-[11px]">{activeEntry.wgsl}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(activeEntry.wgsl, 'wgsl')}
                    className="p-1 hover:bg-[#1E232B] text-slate-400 hover:text-slate-200 rounded transition cursor-pointer"
                    title="Copy WGSL signature"
                  >
                    {copiedKey === 'wgsl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* MSL Metal */}
                <div className="bg-[#0A0C0E] p-2.5 rounded border border-[#23272F] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-sky-400 font-medium block uppercase">MSL (Apple Metal)</span>
                    <span className="text-slate-300 text-[11px]">{activeEntry.msl}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(activeEntry.msl, 'msl')}
                    className="p-1 hover:bg-[#1E232B] text-slate-400 hover:text-slate-200 rounded transition cursor-pointer"
                    title="Copy MSL signature"
                  >
                    {copiedKey === 'msl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Parameters & Return Type */}
            <div className="bg-[#121418] p-2.5 rounded border border-[#23272F] space-y-1.5">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-medium block">Parameters:</span>
                <span className="text-slate-200 font-mono text-[11px]">{activeEntry.parameters}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-medium block">Return Type:</span>
                <span className="text-emerald-400 font-mono text-[11px] font-semibold">{activeEntry.returnType}</span>
              </div>
            </div>

            {/* Side-by-Side Usage Examples */}
            <div className="space-y-2">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Usage Examples</span>
              
              <div className="space-y-2">
                <div className="bg-[#0A0C0E] p-2.5 rounded border border-[#23272F]">
                  <span className="text-[10px] text-rose-400 font-medium uppercase block mb-1">GLSL Example:</span>
                  <pre className="font-mono text-[11px] text-slate-300 overflow-x-auto">{activeEntry.exampleGlsl}</pre>
                </div>

                <div className="bg-[#0A0C0E] p-2.5 rounded border border-[#23272F]">
                  <span className="text-[10px] text-emerald-400 font-medium uppercase block mb-1">Unity HLSL Example:</span>
                  <pre className="font-mono text-[11px] text-emerald-300 font-medium overflow-x-auto">{activeEntry.exampleHlsl}</pre>
                </div>
              </div>
            </div>

            {/* Architectural & Mobile GPU Caveats */}
            {activeEntry.mobileCaveats && (
              <div className="bg-[#16181D] border border-amber-500/25 rounded p-3 space-y-1">
                <div className="flex items-center space-x-1.5 text-amber-300 font-medium">
                  <Cpu className="w-3.5 h-3.5 text-amber-400" />
                  <span>Mobile & Console GPU Note:</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">{activeEntry.mobileCaveats}</p>
              </div>
            )}

            {/* General Notes */}
            {activeEntry.notes && (
              <div className="bg-[#121418] p-2.5 rounded border border-[#23272F] text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center space-x-1 text-slate-300 font-medium">
                  <Info className="w-3 h-3 text-indigo-400" />
                  <span>Technical Notes:</span>
                </div>
                <p>{activeEntry.notes}</p>
              </div>
            )}

            {/* Related SRP Architecture Documentation Guide */}
            {activeEntry.docTopicId && onOpenDocTopic && (
              <div className="bg-emerald-950/20 border border-emerald-500/25 rounded-md p-3 text-xs flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-400" /> Related SRP Architecture Guide
                  </span>
                  <p className="text-[11px] text-slate-300">
                    Topic: <span className="font-mono text-emerald-300">{activeEntry.docTopicId.replace(/_/g, ' ')}</span>
                  </p>
                </div>
                <button
                  onClick={() => onOpenDocTopic(activeEntry.docTopicId!)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-medium transition cursor-pointer flex-shrink-0"
                >
                  <span>Read Guide</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Official Spec & Reference Links */}
            {(activeEntry.glslDocRef || activeEntry.urpDocRef) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {activeEntry.glslDocRef && (
                  <div className="bg-[#12151B] border border-[#23272F] rounded-md p-2.5 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-rose-400 font-medium flex items-center gap-1 text-[11px]">
                        <FileCode className="w-3 h-3 text-rose-400" /> GLSL Reference Spec
                      </span>
                      {activeEntry.glslDocRef.section && (
                        <span className="text-[10px] text-slate-400 font-mono">{activeEntry.glslDocRef.section}</span>
                      )}
                    </div>
                    <p className="text-slate-300 text-[11px] font-medium">{activeEntry.glslDocRef.title}</p>
                    {activeEntry.glslDocRef.url && (
                      <a
                        href={activeEntry.glslDocRef.url}
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

                {activeEntry.urpDocRef && (
                  <div className="bg-[#12151B] border border-[#23272F] rounded-md p-2.5 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-400 font-medium flex items-center gap-1 text-[11px]">
                        <BookOpen className="w-3 h-3 text-emerald-400" /> Unity URP Reference
                      </span>
                      {activeEntry.urpDocRef.section && (
                        <span className="text-[10px] text-slate-400 font-mono">{activeEntry.urpDocRef.section}</span>
                      )}
                    </div>
                    <p className="text-slate-300 text-[11px] font-medium">{activeEntry.urpDocRef.title}</p>
                    {activeEntry.urpDocRef.url && (
                      <a
                        href={activeEntry.urpDocRef.url}
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

          </div>
        </div>

      </div>

    </div>
  );
};
