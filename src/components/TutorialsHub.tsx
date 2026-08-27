import React, { useState, useMemo } from 'react';
import { 
  GraduationCap, 
  Search, 
  ExternalLink, 
  BookOpen, 
  Video, 
  FileText, 
  Code2, 
  Layers, 
  Compass, 
  Bookmark, 
  BookmarkCheck, 
  Sparkles, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  Tag, 
  User, 
  Globe, 
  Award, 
  CheckCircle2, 
  ArrowRight,
  Filter,
  Flame,
  RotateCcw
} from 'lucide-react';
import { TUTORIAL_RESOURCES, LEARNING_ROADMAPS } from '../data/tutorialsData';
import { TutorialResource, TutorialCategory, LearningRoadmap } from '../types';
import { HLSLCodeViewer } from './HLSLCodeViewer';

interface TutorialsHubProps {
  onOpenDocTopic?: (topicId: string) => void;
  onSelectPreset?: (presetId: string) => void;
}

export const TutorialsHub: React.FC<TutorialsHubProps> = ({
  onOpenDocTopic,
  onSelectPreset
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'browse' | 'roadmaps' | 'bookmarks'>('browse');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedSnippetId, setExpandedSnippetId] = useState<string | null>(null);

  // Bookmarks stored in local state
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('shader_converter_bookmarks');
      return saved ? JSON.parse(saved) : ['learnopengl-main', 'catlike-coding-custom-srp', 'inigo-quilez-articles'];
    } catch {
      return ['learnopengl-main', 'catlike-coding-custom-srp', 'inigo-quilez-articles'];
    }
  });

  const toggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarkedIds(prev => {
      const next = prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id];
      try {
        localStorage.setItem('shader_converter_bookmarks', JSON.stringify(next));
      } catch {
        // ignore local storage errors
      }
      return next;
    });
  };

  // Filtered resources
  const filteredResources = useMemo(() => {
    return TUTORIAL_RESOURCES.filter(res => {
      // Category filter
      if (selectedCategory !== 'all' && res.category !== selectedCategory) {
        return false;
      }

      // Level filter
      if (selectedLevel !== 'all' && res.level !== selectedLevel) {
        return false;
      }

      // Format filter
      if (selectedFormat !== 'all' && res.format !== selectedFormat) {
        return false;
      }

      // Sub-tab bookmarks filter
      if (activeSubTab === 'bookmarks' && !bookmarkedIds.includes(res.id)) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = res.title.toLowerCase().includes(q);
        const matchesAuthor = res.author.toLowerCase().includes(q);
        const matchesWebsite = res.websiteOrSource.toLowerCase().includes(q);
        const matchesSummary = res.summary.toLowerCase().includes(q);
        const matchesTopics = res.keyTopics.some(t => t.toLowerCase().includes(q));
        return matchesTitle || matchesAuthor || matchesWebsite || matchesSummary || matchesTopics;
      }

      return true;
    });
  }, [selectedCategory, selectedLevel, selectedFormat, activeSubTab, bookmarkedIds, searchQuery]);

  const resetFilters = () => {
    setSelectedCategory('all');
    setSelectedLevel('all');
    setSelectedFormat('all');
    setSearchQuery('');
  };

  const getFormatIcon = (format: TutorialResource['format']) => {
    switch (format) {
      case 'Video Series':
        return <Video className="w-3.5 h-3.5 text-rose-400" />;
      case 'Academic Paper':
        return <GraduationCap className="w-3.5 h-3.5 text-amber-400" />;
      case 'Interactive Tool':
        return <Code2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'Interactive Book':
        return <BookOpen className="w-3.5 h-3.5 text-indigo-400" />;
      case 'Article / Blog':
      default:
        return <FileText className="w-3.5 h-3.5 text-cyan-400" />;
    }
  };

  const getLevelBadgeClass = (level: TutorialResource['level']) => {
    switch (level) {
      case 'Beginner':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Intermediate':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'Advanced':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Research':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Banner */}
      <div className="bg-[#16181D] border border-[#23272F] rounded-lg p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <GraduationCap className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-100">
              Shader & Graphics Learning Library
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1.5 max-w-3xl leading-relaxed">
            Curated, authoritative collection of the graphics programming industry's finest tutorials, interactive textbooks, video courses, technical blogs, and SIGGRAPH research papers across OpenGL foundations, Unity Universal Render Pipeline (URP/SRP), procedural math, and physically based rendering.
          </p>
        </div>

        {/* Navigation Mode Switcher */}
        <div className="flex items-center space-x-1.5 bg-[#101216] p-1.5 rounded-lg border border-[#23272F] shrink-0 self-start md:self-auto">
          <button
            onClick={() => setActiveSubTab('browse')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              activeSubTab === 'browse'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1A1D22]'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Browse Library ({TUTORIAL_RESOURCES.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('roadmaps')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              activeSubTab === 'roadmaps'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1A1D22]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Learning Roadmaps ({LEARNING_ROADMAPS.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('bookmarks')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              activeSubTab === 'bookmarks'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1A1D22]'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Saved ({bookmarkedIds.length})</span>
          </button>
        </div>
      </div>

      {/* ROADMAPS VIEW */}
      {activeSubTab === 'roadmaps' && (
        <div className="space-y-6">
          <div className="bg-[#121418] border border-[#23272F] rounded-lg p-4 text-xs text-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Structured step-by-step pathways designed to guide you from foundational GPU math to production URP shader authoring.</span>
            </div>
            <button 
              onClick={() => setActiveSubTab('browse')}
              className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              Browse All Resources <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {LEARNING_ROADMAPS.map((roadmap) => (
              <div 
                key={roadmap.id} 
                className="bg-[#16181D] border border-[#23272F] rounded-xl overflow-hidden shadow-sm hover:border-[#2F3542] transition"
              >
                {/* Roadmap Header */}
                <div className="p-5 bg-[#191C22] border-b border-[#23272F] flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      {roadmap.title}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      {roadmap.description}
                    </p>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0 text-xs">
                    <span className="px-2.5 py-1 rounded bg-[#0E1013] border border-[#272B35] text-slate-300 font-mono">
                      ⏱ {roadmap.estimatedWeeks}
                    </span>
                    <span className="px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-medium">
                      {roadmap.steps.length} Milestones
                    </span>
                  </div>
                </div>

                {/* Steps List */}
                <div className="p-5 space-y-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Recommended Study Path:
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {roadmap.steps.map((step) => {
                      const linkedResources = TUTORIAL_RESOURCES.filter(r => step.resourceIds.includes(r.id));

                      return (
                        <div 
                          key={step.stepNumber} 
                          className="bg-[#111317] border border-[#23272F] rounded-lg p-4 flex flex-col justify-between space-y-3"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center space-x-2">
                              <span className="w-5 h-5 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center text-[10px] font-bold">
                                {step.stepNumber}
                              </span>
                              <h3 className="text-xs font-semibold text-slate-200">
                                {step.title}
                              </h3>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed pl-7">
                              {step.description}
                            </p>
                          </div>

                          {/* Linked Resources */}
                          <div className="pt-2 border-t border-[#1C2028] pl-7 space-y-1.5">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">Primary Reference:</span>
                            <div className="flex flex-col space-y-1">
                              {linkedResources.map(r => (
                                <a
                                  key={r.id}
                                  href={r.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-between text-xs text-indigo-400 hover:text-indigo-300 hover:underline bg-[#161920] px-2.5 py-1.5 rounded border border-[#242933] transition"
                                >
                                  <span className="truncate pr-2 font-medium">{r.title} ({r.author})</span>
                                  <ExternalLink className="w-3 h-3 shrink-0" />
                                </a>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BROWSE & BOOKMARKS VIEW */}
      {(activeSubTab === 'browse' || activeSubTab === 'bookmarks') && (
        <div className="space-y-5">
          
          {/* Controls Bar: Search & Category Chips */}
          <div className="bg-[#16181D] border border-[#23272F] rounded-lg p-4 space-y-3.5 shadow-sm">
            
            {/* Search Input and Level/Format Dropdowns */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by topic, keyword, author, or publication (e.g. URP, PBR, Inigo Quilez, Depth, GGX, Cel Shading)..."
                  className="w-full pl-9 pr-4 py-2 bg-[#0A0C0E] text-slate-200 placeholder-slate-500 rounded-md text-xs border border-[#2D343F] focus:outline-none focus:border-indigo-500 font-sans"
                />
              </div>

              {/* Filters Group */}
              <div className="flex items-center space-x-2 shrink-0">
                {/* Level Filter */}
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  aria-label="Difficulty Level"
                  className="bg-[#0A0C0E] text-slate-200 text-xs rounded-md px-3 py-2 border border-[#2D343F] focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="all">All Levels</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Research">Research / Academic</option>
                </select>

                {/* Format Filter */}
                <select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  aria-label="Content Format"
                  className="bg-[#0A0C0E] text-slate-200 text-xs rounded-md px-3 py-2 border border-[#2D343F] focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="all">All Formats</option>
                  <option value="Article / Blog">Article / Blog</option>
                  <option value="Interactive Book">Interactive Book</option>
                  <option value="Academic Paper">Academic Paper</option>
                  <option value="Video Series">Video Series</option>
                  <option value="Interactive Tool">Interactive Tool</option>
                </select>

                {(selectedCategory !== 'all' || selectedLevel !== 'all' || selectedFormat !== 'all' || searchQuery) && (
                  <button
                    onClick={resetFilters}
                    className="p-2 bg-[#0A0C0E] border border-[#2D343F] rounded-md text-slate-400 hover:text-slate-200 hover:border-slate-500 transition cursor-pointer"
                    title="Reset Filters"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 pt-0.5">
              <span className="text-slate-400 text-[11px] font-medium mr-1 flex items-center gap-1 shrink-0">
                <Filter className="w-3 h-3 text-indigo-400" /> Category:
              </span>

              {[
                { id: 'all', label: 'All Resources' },
                { id: 'opengl_foundations', label: 'OpenGL Foundations' },
                { id: 'unity_urp_srp', label: 'Unity URP & SRP HLSL' },
                { id: 'procedural_math', label: 'Math, SDFs & Raymarching' },
                { id: 'stylized_vfx', label: 'Stylized VFX & NPR' },
                { id: 'academic_papers', label: 'Academic Papers & PBR' },
                { id: 'interactive_sandboxes', label: 'Interactive Sandboxes' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-md text-xs transition cursor-pointer whitespace-nowrap border ${
                    selectedCategory === cat.id
                      ? 'bg-indigo-600 text-white border-indigo-500 font-medium'
                      : 'bg-[#101216] text-slate-400 border-[#23272F] hover:text-slate-200 hover:bg-[#1A1D22]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

          </div>

          {/* Results Count & Subheading */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              Showing <strong className="text-slate-200">{filteredResources.length}</strong> {activeSubTab === 'bookmarks' ? 'bookmarked' : 'curated'} resources
            </span>
            {activeSubTab === 'bookmarks' && (
              <span className="text-[11px] text-slate-400">
                Tip: Click the bookmark icon on any tutorial card to save it for later.
              </span>
            )}
          </div>

          {/* Tutorial Cards Grid */}
          {filteredResources.length === 0 ? (
            <div className="bg-[#16181D] border border-[#23272F] rounded-lg p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#1F232B] flex items-center justify-center mx-auto text-slate-500">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">No matching tutorials found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Try clearing your search terms or relaxing category and level filter criteria.
              </p>
              <button
                onClick={resetFilters}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-500 transition cursor-pointer font-medium"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredResources.map((resource) => {
                const isBookmarked = bookmarkedIds.includes(resource.id);
                const isSnippetExpanded = expandedSnippetId === resource.id;

                return (
                  <div
                    key={resource.id}
                    className="bg-[#16181D] border border-[#23272F] rounded-lg overflow-hidden shadow-sm hover:border-[#333A46] transition flex flex-col justify-between"
                  >
                    
                    {/* Card Content Top */}
                    <div className="p-5 space-y-3.5">
                      
                      {/* Top Header: Badge, Level, Format, Bookmark */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {resource.highlightBadge && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1">
                              <Award className="w-2.5 h-2.5" />
                              {resource.highlightBadge}
                            </span>
                          )}

                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${getLevelBadgeClass(resource.level)}`}>
                            {resource.level}
                          </span>

                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#101216] text-slate-300 border border-[#262B34] flex items-center gap-1">
                            {getFormatIcon(resource.format)}
                            <span>{resource.format}</span>
                          </span>
                        </div>

                        {/* Bookmark Button */}
                        <button
                          onClick={(e) => toggleBookmark(resource.id, e)}
                          className={`p-1.5 rounded transition cursor-pointer ${
                            isBookmarked 
                              ? 'text-indigo-400 hover:text-indigo-300 bg-indigo-600/10' 
                              : 'text-slate-500 hover:text-slate-300 hover:bg-[#1E232B]'
                          }`}
                          title={isBookmarked ? 'Remove Bookmark' : 'Save Tutorial Bookmark'}
                        >
                          {isBookmarked ? <BookmarkCheck className="w-4 h-4 fill-indigo-400/20" /> : <Bookmark className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Title & Author */}
                      <div>
                        <h3 className="text-sm font-bold text-slate-100 hover:text-indigo-300 transition">
                          <a href={resource.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-1.5 group">
                            <span>{resource.title}</span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 shrink-0 mt-0.5" />
                          </a>
                        </h3>
                        <div className="flex items-center space-x-2 text-xs text-slate-400 mt-1 font-mono">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            {resource.author}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-400">
                            <Globe className="w-3 h-3 text-slate-400" />
                            {resource.websiteOrSource}
                          </span>
                        </div>
                      </div>

                      {/* Summary Text */}
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {resource.summary}
                      </p>

                      {/* Key Topics Tags */}
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
                          Key Coverage:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {resource.keyTopics.map((topic, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-[#0F1114] text-slate-300 rounded text-[10px] border border-[#23272F]"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Optional Code Snippet Expansion */}
                      {resource.conceptSnippet && (
                        <div className="pt-1">
                          <button
                            onClick={() => setExpandedSnippetId(isSnippetExpanded ? null : resource.id)}
                            className="flex items-center justify-between w-full px-2.5 py-1.5 rounded bg-[#101216] border border-[#23272F] text-[11px] text-slate-300 hover:text-slate-100 hover:border-slate-600 transition cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5 font-mono text-indigo-300">
                              <Code2 className="w-3.5 h-3.5" />
                              {resource.conceptSnippet.title}
                            </span>
                            {isSnippetExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>

                          {isSnippetExpanded && (
                            <div className="mt-2 space-y-2">
                              <div className="h-44 overflow-hidden rounded border border-[#23272F]">
                                <HLSLCodeViewer code={resource.conceptSnippet.code} />
                              </div>
                              <p className="text-[11px] text-slate-400 italic bg-[#0F1114] p-2 rounded border border-[#1E232B]">
                                💡 {resource.conceptSnippet.note}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                    </div>

                    {/* Card Footer: External Link Action */}
                    <div className="px-5 py-3 bg-[#111317] border-t border-[#23272F] flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400 truncate max-w-[50%]">
                        Source: {resource.websiteOrSource}
                      </span>

                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1.5 px-3 py-1 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 hover:border-indigo-500 rounded text-xs font-medium transition cursor-pointer"
                      >
                        <span>Open Tutorial</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

    </div>
  );
};
