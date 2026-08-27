import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Search, 
  ExternalLink, 
  Copy, 
  Check, 
  Sparkles, 
  GraduationCap, 
  Layers, 
  ArrowRight,
  Bookmark,
  Share2,
  FileCode2,
  Cpu,
  Compass,
  Filter
} from 'lucide-react';
import { ACADEMIC_REFERENCES, AcademicReference } from '../data/academicReferences';
import { SHADER_PRESETS } from '../data/shaderPresets';

interface AcademicReferenceTreeProps {
  onLoadShaderPreset?: (presetId: string) => void;
  onOpenDocTopic?: (topicId: string) => void;
}

export const AcademicReferenceTree: React.FC<AcademicReferenceTreeProps> = ({
  onLoadShaderPreset,
  onOpenDocTopic
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeReference, setActiveReference] = useState<AcademicReference>(ACADEMIC_REFERENCES[0]);
  const [copiedBibtex, setCopiedBibtex] = useState(false);

  const categories = [
    'All',
    'PBR & Lighting',
    'Raymarching & SDF',
    'Noise & Procedural',
    'Post-Processing & Bloom',
    'Atmospheric & Volumetrics',
    'Unity Engine & SRP',
  ];

  const filteredReferences = useMemo(() => {
    return ACADEMIC_REFERENCES.filter(item => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesCategory;

      const matchesSearch = 
        item.title.toLowerCase().includes(q) ||
        item.author.toLowerCase().includes(q) ||
        item.publication.toLowerCase().includes(q) ||
        item.abstract.toLowerCase().includes(q) ||
        item.impactOnRealtimeGraphics.toLowerCase().includes(q) ||
        item.keyContributions.some(c => c.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  const handleCopyBibtex = (bib: string) => {
    navigator.clipboard.writeText(bib);
    setCopiedBibtex(true);
    setTimeout(() => setCopiedBibtex(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#16181D] border border-[#23272F] rounded-lg p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-400" />
              <h2 className="text-sm font-semibold text-slate-100">
                Academic Papers, Graphics Guides & Shader Reference Tree
              </h2>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                Peer-Reviewed Research & SIGGRAPH
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Curated tree of foundational computer graphics publications (Cook-Torrance, GGX, Sphere Tracing, Simplex Noise, Jimenez Bloom, Karis Split-Sum) linked directly to runnable shader presets and URP migration guides.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span className="bg-[#121418] px-3 py-1.5 rounded border border-[#23272F]">
              {ACADEMIC_REFERENCES.length} Peer-Reviewed Citations
            </span>
          </div>
        </div>

        {/* Search and Category Filter Bar */}
        <div className="mt-4 pt-4 border-t border-[#23272F] flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              id="academic-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search papers, authors (Cook, Walter, Quilez, Perlin, Jimenez, Karis), or topics..."
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
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded text-[11px] whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 font-medium'
                    : 'bg-[#1A1D21] text-slate-400 border border-[#2D343F] hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Dual-Pane Knowledge Tree */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Tree Column */}
        <div className="lg:col-span-5 bg-[#16181D] border border-[#23272F] rounded-lg flex flex-col h-[700px] shadow-sm">
          <div className="p-3 border-b border-[#23272F] flex items-center justify-between bg-[#1A1D21]/70">
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-indigo-400" /> Research Papers & Guides ({filteredReferences.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#23272F]/60">
            {filteredReferences.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No academic references found for &ldquo;{searchQuery}&rdquo;.
              </div>
            ) : (
              filteredReferences.map((ref) => {
                const isSelected = activeReference?.id === ref.id;
                return (
                  <div
                    key={ref.id}
                    id={`ref-tree-node-${ref.id}`}
                    onClick={() => setActiveReference(ref)}
                    className={`p-3.5 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-950/30 border-l-2 border-indigo-500'
                        : 'hover:bg-[#1E232B] border-l-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#23272F] text-indigo-300 font-medium">
                        {ref.category}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {ref.year}
                      </span>
                    </div>

                    <h4 className="text-xs font-semibold text-slate-200 line-clamp-2 mt-1">
                      {ref.title}
                    </h4>

                    <p className="text-[11px] text-slate-400 mt-1 truncate">
                      {ref.author}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-[#23272F]/40 text-[10px] text-slate-500">
                      <span className="truncate max-w-[200px]">{ref.publication}</span>
                      <span className="text-indigo-400 font-mono">
                        {ref.recommendedShaderPresets.length} Shaders Linked
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Reference Inspection Panel */}
        <div className="lg:col-span-7 bg-[#16181D] border border-[#23272F] rounded-lg p-5 flex flex-col h-[700px] overflow-y-auto shadow-sm space-y-5">
          {activeReference ? (
            <>
              {/* Header Info */}
              <div className="border-b border-[#23272F] pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                    {activeReference.category}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Year: <strong className="text-slate-200">{activeReference.year}</strong>
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-100 mt-2">
                  {activeReference.title}
                </h3>

                <p className="text-xs text-indigo-300 font-medium mt-1">
                  {activeReference.author} &mdash; <span className="text-slate-400">{activeReference.publication}</span>
                </p>

                {activeReference.doiOrUrl && (
                  <div className="mt-3">
                    <a
                      href={activeReference.doiOrUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 text-xs font-medium hover:bg-indigo-600/25 transition-colors"
                    >
                      <span>Access Publication / Original Paper</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>

              {/* Abstract */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Paper Abstract & Core Methodology
                </span>
                <p className="text-xs text-slate-300 leading-relaxed bg-[#0D0F12] border border-[#2D343F] p-3.5 rounded-md">
                  {activeReference.abstract}
                </p>
              </div>

              {/* Key Mathematical & Algorithmic Contributions */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Key Formulations & Contributions
                </span>
                <div className="space-y-2">
                  {activeReference.keyContributions.map((contrib, idx) => (
                    <div
                      key={idx}
                      className="bg-[#12151B] border border-[#23272F] p-2.5 rounded-md flex items-start gap-2 text-xs"
                    >
                      <span className="text-indigo-400 font-mono font-bold text-[11px] mt-0.5">
                        0{idx + 1}.
                      </span>
                      <span className="text-slate-300 font-mono leading-relaxed">
                        {contrib}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Impact on Real-Time Unity SRP Graphics */}
              <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-md p-3.5 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-300 font-semibold">
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Real-World Impact on Unity URP / HDRP & Real-Time Shaders</span>
                </div>
                <p className="text-slate-300 leading-relaxed pt-1">
                  {activeReference.impactOnRealtimeGraphics}
                </p>
              </div>

              {/* Recommended Famous Shaders Linked */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FileCode2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Famous Shaders Implementing This Theory ({activeReference.recommendedShaderPresets.length})</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeReference.recommendedShaderPresets.map((presetId) => {
                    const preset = SHADER_PRESETS.find(p => p.id === presetId);
                    if (!preset) return null;

                    return (
                      <div
                        key={preset.id}
                        className="bg-[#0D0F12] border border-[#2D343F] hover:border-indigo-500/40 p-3 rounded-md transition-colors flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                            <span>{preset.category}</span>
                            <span className="text-emerald-400 font-medium">URP Ready</span>
                          </div>
                          <h5 className="text-xs font-semibold text-slate-200">
                            {preset.title}
                          </h5>
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                            {preset.description}
                          </p>
                        </div>

                        {onLoadShaderPreset && (
                          <button
                            onClick={() => onLoadShaderPreset(preset.id)}
                            className="mt-3 w-full py-1.5 px-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-medium rounded border border-indigo-500/30 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                          >
                            <span>Transpile in Workbench</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* BibTeX Citation */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 font-mono">
                    BibTeX Reference
                  </span>
                  <button
                    onClick={() => handleCopyBibtex(activeReference.bibtex)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedBibtex ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Copied BibTeX
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Copy className="w-3 h-3" /> Copy BibTeX
                      </span>
                    )}
                  </button>
                </div>
                <pre className="bg-[#0A0C0E] border border-[#23272F] p-3 rounded text-[11px] font-mono text-slate-400 overflow-x-auto whitespace-pre leading-relaxed">
                  {activeReference.bibtex}
                </pre>
              </div>

            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
              Select a research paper from the tree to view abstract, contributions, and runnable shader links.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
