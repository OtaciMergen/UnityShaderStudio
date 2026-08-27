import React, { useState, useEffect, useMemo } from 'react';
import { ShaderSnippet, SnippetCategory } from '../types';
import { BUILTIN_SHADER_SNIPPETS } from '../data/shaderSnippets';
import {
  Search,
  BookOpen,
  Plus,
  Copy,
  Check,
  Trash2,
  Edit2,
  Sparkles,
  Layers,
  Palette,
  Compass,
  Zap,
  Tag,
  ArrowUpRight,
  Code2,
  FileDown,
  FileUp,
  X,
  Sliders,
  Maximize2,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  LayoutGrid,
  ListFilter
} from 'lucide-react';

const STORAGE_KEY = 'unishader_custom_snippets';

interface ShaderSnippetLibraryProps {
  onInsertCode: (snippetCode: string, mode: 'prepend' | 'append' | 'replace') => void;
  activeSourceCode: string;
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_METADATA: Record<SnippetCategory, { label: string; icon: React.FC<{ className?: string }>; color: string }> = {
  noise: { label: 'Noise Functions', icon: Sparkles, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  sdf: { label: 'Signed Distance Fields (SDF)', icon: Compass, color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' },
  blending: { label: 'Color Blending', icon: Layers, color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10' },
  color: { label: 'Color & Tonemapping', icon: Palette, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  uv_math: { label: 'UV & Procedural Math', icon: Sliders, color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
  lighting: { label: 'Lighting & VFX', icon: Zap, color: 'text-rose-400 border-rose-500/30 bg-rose-500/10' },
  custom: { label: 'My Custom Snippets', icon: Code2, color: 'text-sky-400 border-sky-500/30 bg-sky-500/10' },
};

export const ShaderSnippetLibrary: React.FC<ShaderSnippetLibraryProps> = ({
  onInsertCode,
  activeSourceCode,
  isOpen,
  onClose,
}) => {
  // Local state for custom snippets
  const [customSnippets, setCustomSnippets] = useState<ShaderSnippet[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<SnippetCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  
  // Selection and preview
  const [selectedSnippetId, setSelectedSnippetId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [insertedFeedback, setInsertedFeedback] = useState<string | null>(null);

  // New / Edit Snippet Modal
  const [isEditorModalOpen, setIsEditorModalOpen] = useState<boolean>(false);
  const [editingSnippet, setEditingSnippet] = useState<Partial<ShaderSnippet> | null>(null);

  // View mode and category expansion
  const [viewMode, setViewMode] = useState<'categories' | 'flat'>('categories');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const toggleCategoryCollapse = (catKey: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [catKey]: !prev[catKey]
    }));
  };

  const expandAllCategories = () => {
    setCollapsedCategories({});
  };

  const collapseAllCategories = () => {
    const allCollapsed: Record<string, boolean> = {};
    (Object.keys(CATEGORY_METADATA) as SnippetCategory[]).forEach(cat => {
      allCollapsed[cat] = true;
    });
    setCollapsedCategories(allCollapsed);
  };

  // Load custom snippets on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setCustomSnippets(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to load custom shader snippets from localStorage', e);
    }
  }, []);

  // Save custom snippets to localStorage whenever modified
  const saveCustomSnippets = (updated: ShaderSnippet[]) => {
    setCustomSnippets(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to persist custom snippets to localStorage', e);
    }
  };

  // Combine built-in and custom snippets
  const allSnippets = useMemo(() => {
    return [...customSnippets, ...BUILTIN_SHADER_SNIPPETS];
  }, [customSnippets]);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    allSnippets.forEach(snip => {
      snip.tags.forEach(t => tagSet.add(t.toLowerCase()));
    });
    return Array.from(tagSet).sort();
  }, [allSnippets]);

  // Filtered snippets
  const filteredSnippets = useMemo(() => {
    return allSnippets.filter(snip => {
      // Category filter
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'custom') {
          if (!snip.isCustom) return false;
        } else if (snip.category !== selectedCategory) {
          return false;
        }
      }

      // Tag filter
      if (selectedTag && !snip.tags.some(t => t.toLowerCase() === selectedTag.toLowerCase())) {
        return false;
      }

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = snip.title.toLowerCase().includes(q);
        const matchesDesc = snip.description.toLowerCase().includes(q);
        const matchesCode = snip.code.toLowerCase().includes(q);
        const matchesTags = snip.tags.some(t => t.toLowerCase().includes(q));
        const matchesAuthor = snip.author ? snip.author.toLowerCase().includes(q) : false;
        return matchesTitle || matchesDesc || matchesCode || matchesTags || matchesAuthor;
      }

      return true;
    });
  }, [allSnippets, selectedCategory, selectedTag, searchQuery]);

  // Group filtered snippets by category in defined order
  const CATEGORY_ORDER: SnippetCategory[] = ['custom', 'noise', 'sdf', 'blending', 'color', 'uv_math', 'lighting'];

  const snippetsByCategory = useMemo(() => {
    const map: Record<string, ShaderSnippet[]> = {};
    
    // Initialize groups
    CATEGORY_ORDER.forEach(cat => {
      map[cat] = [];
    });

    // Populate
    filteredSnippets.forEach(snippet => {
      const cat = snippet.isCustom ? 'custom' : snippet.category;
      if (!map[cat]) {
        map[cat] = [];
      }
      map[cat].push(snippet);
    });

    return map;
  }, [filteredSnippets]);

  // Active selected snippet
  const currentSnippet = useMemo(() => {
    if (!selectedSnippetId) {
      return filteredSnippets[0] || allSnippets[0] || null;
    }
    return allSnippets.find(s => s.id === selectedSnippetId) || filteredSnippets[0] || null;
  }, [selectedSnippetId, allSnippets, filteredSnippets]);

  // Actions
  const handleCopy = (snippet: ShaderSnippet) => {
    navigator.clipboard.writeText(snippet.code);
    setCopiedId(snippet.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInsert = (snippet: ShaderSnippet, mode: 'prepend' | 'append' | 'replace') => {
    onInsertCode(snippet.code, mode);
    setInsertedFeedback(`${snippet.title} (${mode === 'prepend' ? 'inserted at top' : mode === 'append' ? 'appended' : 'loaded'})`);
    setTimeout(() => setInsertedFeedback(null), 2500);
  };

  const handleSaveActiveCode = () => {
    setEditingSnippet({
      id: 'custom-' + Date.now(),
      title: 'My Custom Shader Utility',
      category: 'custom',
      description: 'Extracted GLSL routine from current workbench editor.',
      code: activeSourceCode || '// Write your GLSL function here',
      tags: ['custom', 'glsl', 'utility'],
      isCustom: true,
      author: 'User',
      createdAt: new Date().toLocaleDateString(),
    });
    setIsEditorModalOpen(true);
  };

  const handleCreateNewSnippet = () => {
    setEditingSnippet({
      id: 'custom-' + Date.now(),
      title: '',
      category: 'noise',
      description: '',
      code: `// Custom GLSL Function\nvec3 myCustomRoutine(vec2 uv) {\n    return vec3(uv, 0.5);\n}`,
      tags: ['custom'],
      isCustom: true,
      author: 'User',
      createdAt: new Date().toLocaleDateString(),
    });
    setIsEditorModalOpen(true);
  };

  const handleEditSnippet = (snippet: ShaderSnippet) => {
    setEditingSnippet({ ...snippet });
    setIsEditorModalOpen(true);
  };

  const handleDeleteSnippet = (snippetId: string) => {
    if (confirm('Are you sure you want to delete this custom snippet?')) {
      const next = customSnippets.filter(s => s.id !== snippetId);
      saveCustomSnippets(next);
      if (selectedSnippetId === snippetId) {
        setSelectedSnippetId(null);
      }
    }
  };

  const handleSaveSnippetForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSnippet || !editingSnippet.title?.trim() || !editingSnippet.code?.trim()) {
      return;
    }

    const finalSnippet: ShaderSnippet = {
      id: editingSnippet.id || 'custom-' + Date.now(),
      title: editingSnippet.title.trim(),
      category: editingSnippet.category || 'custom',
      description: editingSnippet.description?.trim() || 'Custom GLSL shader routine',
      code: editingSnippet.code,
      tags: Array.isArray(editingSnippet.tags) ? editingSnippet.tags : ['custom'],
      isCustom: true,
      author: editingSnippet.author || 'User',
      createdAt: editingSnippet.createdAt || new Date().toLocaleDateString(),
      usageExample: editingSnippet.usageExample,
    };

    const exists = customSnippets.some(s => s.id === finalSnippet.id);
    let next: ShaderSnippet[];
    if (exists) {
      next = customSnippets.map(s => s.id === finalSnippet.id ? finalSnippet : s);
    } else {
      next = [finalSnippet, ...customSnippets];
    }

    saveCustomSnippets(next);
    setSelectedSnippetId(finalSnippet.id);
    setIsEditorModalOpen(false);
    setEditingSnippet(null);
  };

  // Export custom snippets as JSON
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(customSnippets, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `unishader_snippets_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import custom snippets from JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          const valid = parsed.map(item => ({
            ...item,
            id: item.id || 'imported-' + Math.random().toString(36).substring(2, 9),
            isCustom: true,
          }));
          saveCustomSnippets([...valid, ...customSnippets]);
          alert(`Successfully imported ${valid.length} shader snippet(s)!`);
        }
      } catch (err) {
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-[#121418] border border-[#2D343F] rounded-xl max-w-6xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Top Header */}
        <div className="bg-[#1A1D24] px-4 py-3 border-b border-[#23272F] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-100">GLSL Shader Snippet Library</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {allSnippets.length} Modular Functions
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Browse, preview, and inject common noise algorithms, signed distance fields, and color math directly into the converter
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="btn-save-active-editor-code"
              onClick={handleSaveActiveCode}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold shadow-sm transition cursor-pointer"
              title="Save current GLSL code from workbench as a reusable snippet"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Save Current Code</span>
            </button>

            <button
              id="btn-create-new-snippet"
              onClick={handleCreateNewSnippet}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-[#1E232B] hover:bg-[#282F3A] text-slate-300 text-xs font-medium rounded border border-[#2D343F] transition cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden md:inline">New Custom Snippet</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-[#23272F] transition cursor-pointer"
              title="Close Snippet Library"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feedback Alert if Inserted */}
        {insertedFeedback && (
          <div className="bg-emerald-950/80 border-b border-emerald-500/30 px-4 py-2 text-xs text-emerald-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{insertedFeedback} &mdash; check active GLSL workbench!</span>
            </div>
          </div>
        )}

        {/* Search & Category Filter Toolbar */}
        <div className="bg-[#16181D] px-4 py-2.5 border-b border-[#23272F] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
          
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search noise, SDF, blending, formulas, tags..."
              className="w-full bg-[#0A0C0E] text-slate-200 text-xs pl-8 pr-8 py-1.5 rounded-lg border border-[#2D343F] focus:outline-none focus:border-indigo-500 font-sans placeholder:text-slate-600"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Buttons */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => { setSelectedCategory('all'); setSelectedTag(null); }}
              className={`px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                selectedCategory === 'all' && !selectedTag
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'bg-[#0E1013] text-slate-400 hover:text-slate-200 border border-[#23272F]'
              }`}
            >
              All ({allSnippets.length})
            </button>

            {(Object.keys(CATEGORY_METADATA) as SnippetCategory[]).map(catKey => {
              const meta = CATEGORY_METADATA[catKey];
              const Icon = meta.icon;
              const count = catKey === 'custom'
                ? customSnippets.length
                : allSnippets.filter(s => s.category === catKey).length;

              if (catKey === 'custom' && customSnippets.length === 0) {
                return null;
              }

              return (
                <button
                  key={catKey}
                  onClick={() => { setSelectedCategory(catKey); setSelectedTag(null); }}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                    selectedCategory === catKey
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'bg-[#0E1013] text-slate-400 hover:text-slate-200 border border-[#23272F]'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{meta.label.split(' ')[0]}</span>
                  <span className="text-[10px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Import / Export JSON tools */}
          <div className="hidden lg:flex items-center space-x-1.5 border-l border-[#23272F] pl-3">
            <label
              className="p-1.5 rounded bg-[#0E1013] hover:bg-[#1E232B] text-slate-400 hover:text-slate-200 border border-[#23272F] transition cursor-pointer"
              title="Import Snippets (JSON)"
            >
              <FileUp className="w-3.5 h-3.5" />
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>
            <button
              onClick={handleExportJSON}
              className="p-1.5 rounded bg-[#0E1013] hover:bg-[#1E232B] text-slate-400 hover:text-slate-200 border border-[#23272F] transition cursor-pointer"
              title="Export Custom Snippets as JSON backup"
            >
              <FileDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Popular Tags Quick Filters */}
        {allTags.length > 0 && (
          <div className="bg-[#0E1013] px-4 py-1.5 border-b border-[#23272F] flex items-center space-x-1.5 overflow-x-auto scrollbar-none shrink-0 text-[11px]">
            <span className="text-slate-500 font-medium flex items-center gap-1 shrink-0">
              <Tag className="w-3 h-3" /> Filter by Tag:
            </span>
            {selectedTag && (
              <button
                onClick={() => setSelectedTag(null)}
                className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-medium flex items-center gap-1 cursor-pointer"
              >
                <span>#{selectedTag}</span>
                <X className="w-2.5 h-2.5" />
              </button>
            )}
            {allTags.slice(0, 14).map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono transition cursor-pointer whitespace-nowrap ${
                  selectedTag === tag
                    ? 'bg-indigo-600 text-white'
                    : 'bg-[#181B22] text-slate-400 hover:text-slate-200 border border-[#282F3A]'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* Main Content Area: 2-Column Split (Snippet List vs Detailed Code Preview) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 overflow-hidden bg-[#0A0C0E]">
          
          {/* Left Column: Snippet Catalog Cards (md:col-span-5) */}
          <div className="md:col-span-5 border-r border-[#23272F] flex flex-col h-full overflow-y-auto p-3 space-y-2.5 bg-[#0D0F13]">
            {/* View Mode & Expand Controls Header */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pb-1 border-b border-[#1C2028]">
              <div className="flex items-center space-x-2">
                <span>{filteredSnippets.length} snippets</span>
                {customSnippets.length > 0 && (
                  <span className="text-sky-400 font-medium bg-sky-500/10 px-1.5 py-0.2 rounded border border-sky-500/20 text-[10px]">
                    {customSnippets.length} custom
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-1">
                {viewMode === 'categories' && (
                  <div className="flex items-center space-x-1 mr-1">
                    <button
                      onClick={expandAllCategories}
                      className="px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-slate-200 hover:bg-[#1A1D24] rounded transition cursor-pointer"
                      title="Expand all categories"
                    >
                      Expand All
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      onClick={collapseAllCategories}
                      className="px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-slate-200 hover:bg-[#1A1D24] rounded transition cursor-pointer"
                      title="Collapse all categories"
                    >
                      Collapse
                    </button>
                  </div>
                )}

                <div className="bg-[#121418] p-0.5 rounded border border-[#23272F] flex items-center">
                  <button
                    onClick={() => setViewMode('categories')}
                    className={`p-1 rounded text-[10px] font-medium transition cursor-pointer flex items-center space-x-1 ${
                      viewMode === 'categories'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Group by Category (Noise, SDF, Lighting, etc.)"
                  >
                    <FolderOpen className="w-3 h-3" />
                    <span className="hidden sm:inline">Categories</span>
                  </button>
                  <button
                    onClick={() => setViewMode('flat')}
                    className={`p-1 rounded text-[10px] font-medium transition cursor-pointer flex items-center space-x-1 ${
                      viewMode === 'flat'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Flat List View"
                  >
                    <LayoutGrid className="w-3 h-3" />
                    <span className="hidden sm:inline">List</span>
                  </button>
                </div>
              </div>
            </div>

            {filteredSnippets.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-2">
                <Code2 className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-slate-400 text-xs">No snippets match your filter or search.</p>
                <button
                  onClick={() => { setSearchQuery(''); setSelectedCategory('all'); setSelectedTag(null); }}
                  className="px-3 py-1 bg-[#1E232B] hover:bg-[#282F3A] text-indigo-400 text-xs rounded border border-[#2D343F] cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            ) : viewMode === 'categories' ? (
              /* Categorized Sections */
              <div className="space-y-3">
                {CATEGORY_ORDER.map(catKey => {
                  const snippetsInCat = snippetsByCategory[catKey] || [];
                  if (snippetsInCat.length === 0) return null;

                  const meta = CATEGORY_METADATA[catKey];
                  const Icon = meta.icon;
                  const isCollapsed = !!collapsedCategories[catKey];

                  return (
                    <div key={catKey} className="rounded-lg border border-[#20242D] bg-[#101217] overflow-hidden">
                      {/* Category Header */}
                      <button
                        onClick={() => toggleCategoryCollapse(catKey)}
                        className="w-full px-3 py-2 bg-[#14171E] hover:bg-[#181C24] flex items-center justify-between transition cursor-pointer border-b border-[#1C2028]"
                      >
                        <div className="flex items-center space-x-2">
                          <div className={`p-1 rounded ${meta.color}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-semibold text-slate-200">
                            {meta.label}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#1F242E] text-slate-400 border border-[#2A313E]">
                            {snippetsInCat.length}
                          </span>
                        </div>

                        <div className="flex items-center text-slate-400">
                          {isCollapsed ? (
                            <ChevronRight className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </div>
                      </button>

                      {/* Category Items */}
                      {!isCollapsed && (
                        <div className="p-2 space-y-2">
                          {snippetsInCat.map(snippet => {
                            const isSelected = currentSnippet?.id === snippet.id;

                            return (
                              <div
                                key={snippet.id}
                                onClick={() => setSelectedSnippetId(snippet.id)}
                                className={`p-2.5 rounded-md border transition cursor-pointer text-left relative group ${
                                  isSelected
                                    ? 'bg-[#181D26] border-indigo-500/60 shadow-sm ring-1 ring-indigo-500/20'
                                    : 'bg-[#12151B] border-[#222630] hover:bg-[#171A22] hover:border-[#2D3442]'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300 transition">
                                    {snippet.title}
                                  </h4>

                                  {snippet.isCustom && (
                                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30 shrink-0">
                                      Custom
                                    </span>
                                  )}
                                </div>

                                <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                                  {snippet.description}
                                </p>

                                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-[#1A1E26] text-[10px]">
                                  <div className="flex items-center space-x-1 overflow-hidden">
                                    {snippet.tags.slice(0, 3).map(t => (
                                      <span key={t} className="px-1.5 py-0.2 rounded bg-[#1B1F27] text-slate-400 font-mono text-[9px]">
                                        #{t}
                                      </span>
                                    ))}
                                  </div>

                                  <span className="text-slate-500 font-mono text-[10px]">
                                    {snippet.code.split('\n').length} lines
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Flat List Mode */
              <div className="space-y-2">
                {filteredSnippets.map((snippet) => {
                  const isSelected = currentSnippet?.id === snippet.id;
                  const meta = CATEGORY_METADATA[snippet.category] || CATEGORY_METADATA.custom;
                  const Icon = meta.icon;

                  return (
                    <div
                      key={snippet.id}
                      onClick={() => setSelectedSnippetId(snippet.id)}
                      className={`p-3 rounded-lg border transition cursor-pointer text-left relative group ${
                        isSelected
                          ? 'bg-[#181D26] border-indigo-500/50 shadow-md ring-1 ring-indigo-500/20'
                          : 'bg-[#121418] border-[#23272F] hover:bg-[#16181F] hover:border-[#2D343F]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <div className={`p-1 rounded ${meta.color}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <h4 className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300 transition">
                            {snippet.title}
                          </h4>
                        </div>

                        {snippet.isCustom && (
                          <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30">
                            Custom
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                        {snippet.description}
                      </p>

                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#1C2028] text-[10px]">
                        <div className="flex items-center space-x-1 overflow-hidden">
                          {snippet.tags.slice(0, 3).map(t => (
                            <span key={t} className="px-1.5 py-0.5 rounded bg-[#1B1F27] text-slate-400 font-mono">
                              #{t}
                            </span>
                          ))}
                        </div>

                        <span className="text-slate-500 font-mono">
                          {snippet.code.split('\n').length} lines
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Code Inspection, Full Preview & Insertion Bar (md:col-span-7) */}
          <div className="md:col-span-7 flex flex-col h-full overflow-hidden bg-[#0A0C0E]">
            {currentSnippet ? (
              <div className="flex flex-col h-full overflow-hidden">
                
                {/* Detail Header */}
                <div className="p-4 bg-[#14161C] border-b border-[#23272F] space-y-2 shrink-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${
                          CATEGORY_METADATA[currentSnippet.category]?.color || 'text-slate-400 border-slate-700 bg-slate-800'
                        }`}>
                          {CATEGORY_METADATA[currentSnippet.category]?.label || currentSnippet.category}
                        </span>
                        {currentSnippet.author && (
                          <span className="text-[11px] text-slate-400">
                            by <span className="text-slate-300 font-medium">{currentSnippet.author}</span>
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-slate-100">{currentSnippet.title}</h3>
                    </div>

                    {/* Actions for custom snippet */}
                    <div className="flex items-center space-x-1.5">
                      {currentSnippet.isCustom && (
                        <>
                          <button
                            onClick={() => handleEditSnippet(currentSnippet)}
                            className="p-1.5 rounded bg-[#1C2028] hover:bg-[#252B37] text-slate-300 text-xs border border-[#2D343F] transition cursor-pointer"
                            title="Edit Custom Snippet"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSnippet(currentSnippet.id)}
                            className="p-1.5 rounded bg-[#1C2028] hover:bg-rose-950/80 text-rose-400 text-xs border border-[#2D343F] transition cursor-pointer"
                            title="Delete Snippet"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => handleCopy(currentSnippet)}
                        className="flex items-center space-x-1 px-2.5 py-1.5 rounded bg-[#1E232B] hover:bg-[#282F3A] text-slate-300 text-xs font-medium border border-[#2D343F] transition cursor-pointer"
                        title="Copy GLSL Code"
                      >
                        {copiedId === currentSnippet.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-semibold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {currentSnippet.description}
                  </p>

                  {/* Usage Example if present */}
                  {currentSnippet.usageExample && (
                    <div className="bg-[#0A0C0E] border border-[#23272F] rounded p-2 text-xs flex items-center gap-2 font-mono text-indigo-300">
                      <span className="text-slate-500 select-none text-[11px]">Usage:</span>
                      <code>{currentSnippet.usageExample}</code>
                    </div>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {currentSnippet.tags.map(t => (
                      <span key={t} className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#1B1F28] text-slate-400 border border-[#242A36]">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Code Window with Line Numbers */}
                <div className="flex-1 overflow-auto bg-[#07090B] font-mono text-xs p-3">
                  <div className="space-y-0.5 leading-relaxed text-slate-300">
                    {currentSnippet.code.split('\n').map((line, idx) => (
                      <div key={idx} className="flex items-start hover:bg-[#12151B] py-0.2 rounded-xs">
                        <span className="w-8 shrink-0 select-none text-right pr-3 text-slate-600 text-[10px]">
                          {idx + 1}
                        </span>
                        <span className="whitespace-pre flex-1 text-indigo-100/90">{line}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Quick Insertion Toolbar */}
                <div className="p-3 bg-[#14161C] border-t border-[#23272F] flex flex-wrap items-center justify-between gap-2 shrink-0">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                    <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400" />
                    Insert into GLSL Editor:
                  </span>

                  <div className="flex items-center space-x-2">
                    <button
                      id="btn-insert-snippet-prepend"
                      onClick={() => handleInsert(currentSnippet, 'prepend')}
                      className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded border border-indigo-500/40 text-xs font-semibold transition cursor-pointer shadow-sm"
                      title="Insert function declarations at the top of your GLSL source code"
                    >
                      Prepend at Top
                    </button>

                    <button
                      id="btn-insert-snippet-append"
                      onClick={() => handleInsert(currentSnippet, 'append')}
                      className="px-3 py-1.5 bg-[#1E232B] hover:bg-[#282F3A] text-slate-300 rounded border border-[#2D343F] text-xs font-medium transition cursor-pointer"
                      title="Append to bottom of active GLSL source code"
                    >
                      Append at Bottom
                    </button>

                    <button
                      id="btn-insert-snippet-replace"
                      onClick={() => {
                        if (confirm('Replace active source code in the editor with this snippet?')) {
                          handleInsert(currentSnippet, 'replace');
                        }
                      }}
                      className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 rounded border border-amber-500/40 text-xs font-semibold transition cursor-pointer"
                      title="Replace current GLSL code with this snippet"
                    >
                      Load as Active Code
                    </button>
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
                Select a snippet to inspect and insert.
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Save / Edit Custom Snippet Modal Form */}
      {isEditorModalOpen && editingSnippet && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveSnippetForm}
            className="bg-[#16181D] border border-[#2D343F] rounded-xl max-w-xl w-full p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#23272F] pb-2.5">
              <div className="flex items-center space-x-2">
                <Code2 className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-slate-100">
                  {editingSnippet.id?.startsWith('custom-') && customSnippets.some(s => s.id === editingSnippet.id)
                    ? 'Edit Custom Snippet'
                    : 'Save Custom GLSL Snippet'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => { setIsEditorModalOpen(false); setEditingSnippet(null); }}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Snippet Title *</label>
                <input
                  type="text"
                  required
                  value={editingSnippet.title || ''}
                  onChange={(e) => setEditingSnippet({ ...editingSnippet, title: e.target.value })}
                  placeholder="e.g. 2D Simplex Distortion, Fast Hue Shift, Organic SDF"
                  className="w-full bg-[#0A0C0E] border border-[#2D343F] rounded px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Category</label>
                  <select
                    value={editingSnippet.category || 'custom'}
                    onChange={(e) => setEditingSnippet({ ...editingSnippet, category: e.target.value as SnippetCategory })}
                    className="w-full bg-[#0A0C0E] border border-[#2D343F] rounded px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="custom">Custom Utility</option>
                    <option value="noise">Noise Functions</option>
                    <option value="sdf">Signed Distance Fields (SDF)</option>
                    <option value="blending">Color Blending</option>
                    <option value="color">Color & Tonemapping</option>
                    <option value="uv_math">UV & Procedural Math</option>
                    <option value="lighting">Lighting & VFX</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={Array.isArray(editingSnippet.tags) ? editingSnippet.tags.join(', ') : ''}
                    onChange={(e) => setEditingSnippet({
                      ...editingSnippet,
                      tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                    })}
                    placeholder="noise, procedural, fast"
                    className="w-full bg-[#0A0C0E] border border-[#2D343F] rounded px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={editingSnippet.description || ''}
                  onChange={(e) => setEditingSnippet({ ...editingSnippet, description: e.target.value })}
                  placeholder="Brief summary of what this GLSL algorithm does..."
                  className="w-full bg-[#0A0C0E] border border-[#2D343F] rounded px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Usage Example (Optional)</label>
                <input
                  type="text"
                  value={editingSnippet.usageExample || ''}
                  onChange={(e) => setEditingSnippet({ ...editingSnippet, usageExample: e.target.value })}
                  placeholder="e.g. vec3 c = myCustomRoutine(uv);"
                  className="w-full bg-[#0A0C0E] border border-[#2D343F] rounded px-3 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">GLSL Code *</label>
                <textarea
                  required
                  rows={8}
                  value={editingSnippet.code || ''}
                  onChange={(e) => setEditingSnippet({ ...editingSnippet, code: e.target.value })}
                  placeholder="// Paste or write GLSL code here..."
                  className="w-full bg-[#0A0C0E] border border-[#2D343F] rounded p-2.5 text-slate-200 font-mono text-xs leading-relaxed focus:outline-none focus:border-indigo-500 resize-y"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#23272F]">
              <button
                type="button"
                onClick={() => { setIsEditorModalOpen(false); setEditingSnippet(null); }}
                className="px-3 py-1.5 rounded bg-[#1E232B] hover:bg-[#282F3A] text-slate-300 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
              >
                Save Snippet
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
