import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Zap,
  FileCode,
  Layers,
  Sun,
  Maximize2,
  Sliders,
  Sparkles,
  EyeOff,
  Compass,
  Box,
  CornerDownLeft,
  X,
  Keyboard,
  ArrowRight,
  Check,
  Tag,
  Code2,
  FolderArchive,
  AlignLeft,
  Eye,
  CheckCircle2,
  Copy
} from 'lucide-react';
import { 
  QuickActionItem, 
  getQuickActionList, 
  URP_INCLUDES, 
  addUrpInclude, 
  wrapInCbuffer, 
  renameShaderSymbol,
  isUrpIncludePresent
} from '../lib/shaderQuickActions';

interface ShaderQuickActionsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  selectedText?: string;
  selectionRange?: { start: number; end: number };
  onApplyCodeChange: (newCode: string, message: string) => void;
  onOpenBatchingAssistant?: () => void;
  onOpenUnityExport?: () => void;
  onFormatCode?: () => void;
  onToggleFocusMode?: () => void;
}

type OverlayMode = 'list' | 'rename' | 'includes';

export const ShaderQuickActionsOverlay: React.FC<ShaderQuickActionsOverlayProps> = ({
  isOpen,
  onClose,
  code,
  selectedText = '',
  selectionRange,
  onApplyCodeChange,
  onOpenBatchingAssistant,
  onOpenUnityExport,
  onFormatCode,
  onToggleFocusMode,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState<OverlayMode>('list');

  // Rename Sub-mode state
  const [renameOldName, setRenameOldName] = useState('');
  const [renameNewName, setRenameNewName] = useState('');
  const [renameCount, setRenameCount] = useState<number>(0);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const renameOldInputRef = useRef<HTMLInputElement>(null);
  const renameNewInputRef = useRef<HTMLInputElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Available actions
  const allActions = useMemo(() => getQuickActionList(), []);

  // Filtered actions based on search query and category
  const filteredActions = useMemo(() => {
    let list = allActions;
    if (selectedCategory !== 'all') {
      list = list.filter(a => a.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        a =>
          a.label.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          (a.shortcut && a.shortcut.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allActions, selectedCategory, searchQuery]);

  // Reset selected index when filtered items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredActions]);

  // Focus management when opening or switching modes
  useEffect(() => {
    if (isOpen) {
      if (mode === 'list') {
        setTimeout(() => searchInputRef.current?.focus(), 30);
      } else if (mode === 'rename') {
        // Pre-fill with selected text or common identifier if valid
        const trimmedSel = selectedText.trim();
        if (trimmedSel && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmedSel)) {
          setRenameOldName(trimmedSel);
        } else if (!renameOldName) {
          // Check for common uniforms in code
          if (code.includes('_MainTex')) setRenameOldName('_MainTex');
          else if (code.includes('_Color')) setRenameOldName('_Color');
        }
        setTimeout(() => {
          if (renameOldName) {
            renameNewInputRef.current?.focus();
          } else {
            renameOldInputRef.current?.focus();
          }
        }, 50);
      }
    } else {
      // Reset state when closed
      setSearchQuery('');
      setSelectedCategory('all');
      setMode('list');
      setRenameOldName('');
      setRenameNewName('');
    }
  }, [isOpen, mode]);

  // Live match count calculation for Rename mode
  useEffect(() => {
    if (mode === 'rename' && renameOldName.trim()) {
      try {
        const escaped = renameOldName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped}\\b`, 'g');
        const matches = code.match(regex);
        setRenameCount(matches ? matches.length : 0);
      } catch {
        setRenameCount(0);
      }
    } else {
      setRenameCount(0);
    }
  }, [mode, renameOldName, code]);

  if (!isOpen) return null;

  // Execute a standard quick action
  const handleExecuteAction = (action: QuickActionItem) => {
    const result = action.execute(code, {
      start: selectionRange?.start || 0,
      end: selectionRange?.end || 0,
      text: selectedText,
    });
    onApplyCodeChange(result.newCode, result.message);
    onClose();
  };

  // Execute Rename Symbol
  const handleExecuteRename = () => {
    const res = renameShaderSymbol(code, renameOldName, renameNewName);
    if (res.count > 0) {
      onApplyCodeChange(res.newCode, res.message);
      onClose();
    }
  };

  // Execute Specific Include injection
  const handleInjectInclude = (includeId: string) => {
    const res = addUrpInclude(code, includeId);
    if (res.added) {
      onApplyCodeChange(res.newCode, res.message);
    }
    onClose();
  };

  // Keyboard navigation within the command palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (mode !== 'list') {
        setMode('list');
      } else {
        onClose();
      }
      return;
    }

    if (mode === 'list') {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < filteredActions.length - 1 ? prev + 1 : 0));
        // Scroll item into view
        setTimeout(() => {
          const item = listContainerRef.current?.children[selectedIndex + 1] as HTMLElement;
          item?.scrollIntoView({ block: 'nearest' });
        }, 10);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredActions.length - 1));
        setTimeout(() => {
          const item = listContainerRef.current?.children[selectedIndex - 1] as HTMLElement;
          item?.scrollIntoView({ block: 'nearest' });
        }, 10);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredActions[selectedIndex]) {
          handleExecuteAction(filteredActions[selectedIndex]);
        }
      }
    } else if (mode === 'rename') {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleExecuteRename();
      }
    }
  };

  const getActionIcon = (iconName: string) => {
    switch (iconName) {
      case 'Zap': return <Zap className="w-4 h-4 text-amber-400" />;
      case 'FileCode': return <FileCode className="w-4 h-4 text-cyan-400" />;
      case 'Sun': return <Sun className="w-4 h-4 text-yellow-400" />;
      case 'Layers': return <Layers className="w-4 h-4 text-indigo-400" />;
      case 'Maximize2': return <Maximize2 className="w-4 h-4 text-emerald-400" />;
      case 'Sliders': return <Sliders className="w-4 h-4 text-purple-400" />;
      case 'Sparkles': return <Sparkles className="w-4 h-4 text-pink-400" />;
      case 'Box': return <Box className="w-4 h-4 text-cyan-400" />;
      case 'EyeOff': return <EyeOff className="w-4 h-4 text-slate-400" />;
      case 'Compass': return <Compass className="w-4 h-4 text-teal-400" />;
      default: return <Code2 className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="shader-quick-actions-overlay"
        className="relative w-full max-w-2xl bg-[#0E1117] border border-[#262C3D] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150 ring-1 ring-white/5"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Top Header & Mode Navigation */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#131722] border-b border-[#222838]">
          <div className="flex items-center space-x-2">
            <div className="p-1 bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 rounded border border-indigo-500/30 text-indigo-400">
              <Zap className="w-4 h-4 text-cyan-300" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-tight">Shader Quick-Actions</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Command Palette
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Direct Switch to Rename Mode */}
            <button
              id="btn-switch-mode-rename"
              onClick={() => setMode(mode === 'rename' ? 'list' : 'rename')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer border ${
                mode === 'rename'
                  ? 'bg-indigo-500/25 text-indigo-200 border-indigo-500/50'
                  : 'bg-[#181C28] text-slate-300 hover:text-white border-[#2A3145] hover:bg-[#202636]'
              }`}
              title="Rename Property / Symbol across shader (Alt+R / F2)"
            >
              <Tag className="w-3 h-3 text-indigo-400" />
              <span>Rename Symbol</span>
            </button>

            {/* Direct Switch to Includes Mode */}
            <button
              id="btn-switch-mode-includes"
              onClick={() => setMode(mode === 'includes' ? 'list' : 'includes')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer border ${
                mode === 'includes'
                  ? 'bg-cyan-500/25 text-cyan-200 border-cyan-500/50'
                  : 'bg-[#181C28] text-slate-300 hover:text-white border-[#2A3145] hover:bg-[#202636]'
              }`}
              title="Browse & Inject URP Shader Libraries (Alt+I)"
            >
              <FileCode className="w-3 h-3 text-cyan-400" />
              <span>URP Includes</span>
            </button>

            <button
              id="btn-close-quick-actions"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MODE 1: Standard Quick Actions List */}
        {mode === 'list' && (
          <>
            {/* Search Input Bar */}
            <div className="flex items-center px-4 py-2.5 bg-[#10131C] border-b border-[#222838] gap-2.5">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type a command or shortcut (e.g. Wrap in CBUFFER, Add Include, Alt+B)..."
                className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-slate-500 hover:text-slate-300 text-xs px-1"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 px-4 py-2 bg-[#0C0E14] border-b border-[#1E2330] overflow-x-auto text-xs">
              {[
                { id: 'all', label: 'All Actions' },
                { id: 'batching', label: 'SRP & Batching' },
                { id: 'insert', label: 'Includes & Passes' },
                { id: 'refactor', label: 'Refactoring' },
                { id: 'convert', label: 'Pipelines' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Quick Actions Scrollable List */}
            <div
              ref={listContainerRef}
              className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[380px] divide-y divide-[#1A1F2B]/50"
            >
              {filteredActions.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No quick actions found matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                filteredActions.map((action, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={action.id}
                      onClick={() => handleExecuteAction(action)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition cursor-pointer group ${
                        isSelected
                          ? 'bg-[#1C2130] text-white border border-[#323B52]'
                          : 'text-slate-300 hover:bg-[#151924] border border-transparent'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0 pr-3">
                        <div className={`p-1.5 rounded-md ${
                          isSelected ? 'bg-indigo-500/20 text-indigo-300' : 'bg-[#151822] text-slate-400'
                        }`}>
                          {getActionIcon(action.iconName)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-100 group-hover:text-white truncate">
                              {action.label}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#131620] text-slate-400 border border-[#222735]">
                              {action.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {action.description}
                          </p>
                        </div>
                      </div>

                      {/* Shortcut & Return Badge */}
                      <div className="flex items-center space-x-2 shrink-0">
                        {action.shortcut && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold bg-[#0F121A] text-slate-300 border border-[#262C3D] shadow-2xs">
                            <Keyboard className="w-2.5 h-2.5 text-slate-500" />
                            <span>{action.shortcut}</span>
                          </span>
                        )}
                        {isSelected && (
                          <span className="hidden sm:flex items-center gap-1 text-[10px] text-cyan-400 font-mono">
                            <span>Execute</span>
                            <CornerDownLeft className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Utilities Strip */}
            <div className="p-2.5 bg-[#0A0C11] border-t border-[#1F2433] flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center space-x-2 text-slate-400 text-[11px]">
                <span>Selection:</span>
                <code className="text-cyan-300 font-mono bg-[#141722] px-1.5 py-0.5 rounded border border-[#232736]">
                  {selectedText ? `${selectedText.length} chars selected` : 'None (Full shader mode)'}
                </code>
              </div>

              <div className="flex items-center space-x-2">
                {onFormatCode && (
                  <button
                    onClick={() => {
                      onFormatCode();
                      onClose();
                    }}
                    className="flex items-center gap-1 px-2 py-1 bg-[#141824] hover:bg-[#1E2436] text-slate-300 hover:text-white rounded border border-[#262E44] transition cursor-pointer text-[11px]"
                  >
                    <AlignLeft className="w-3 h-3 text-indigo-400" />
                    <span>Format Code (Alt+Shift+F)</span>
                  </button>
                )}

                {onOpenUnityExport && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenUnityExport();
                    }}
                    className="flex items-center gap-1 px-2 py-1 bg-[#141824] hover:bg-[#1E2436] text-slate-300 hover:text-white rounded border border-[#262E44] transition cursor-pointer text-[11px]"
                  >
                    <Box className="w-3 h-3 text-emerald-400" />
                    <span>Export Unity Package</span>
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {/* MODE 2: Rename Property / Symbol */}
        {mode === 'rename' && (
          <div className="p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-indigo-400" />
                  <span>Rename Property &amp; Identifier</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Replaces an identifier everywhere in the shader (Properties block, CBUFFER, structs, and vertex/fragment routines).
                </p>
              </div>

              <button
                onClick={() => setMode('list')}
                className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-[#141824] border border-[#242A3C] transition cursor-pointer"
              >
                Back to List (Esc)
              </button>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium text-slate-300 flex items-center justify-between">
                  <span>Current Identifier</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {renameCount > 0 ? `${renameCount} occurrences found` : 'Not found in code'}
                  </span>
                </label>
                <input
                  ref={renameOldInputRef}
                  type="text"
                  value={renameOldName}
                  onChange={(e) => setRenameOldName(e.target.value)}
                  placeholder="_MainTex or _Color"
                  className="w-full bg-[#12151F] border border-[#262D3F] focus:border-indigo-500 focus:outline-hidden rounded px-3 py-2 font-mono text-slate-200 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium text-slate-300 flex items-center justify-between">
                  <span>New Replacement Name</span>
                  <span className="text-[10px] text-indigo-400 font-mono">Target</span>
                </label>
                <input
                  ref={renameNewInputRef}
                  type="text"
                  value={renameNewName}
                  onChange={(e) => setRenameNewName(e.target.value)}
                  placeholder="_BaseMap or _BaseColor"
                  className="w-full bg-[#12151F] border border-[#262D3F] focus:border-indigo-500 focus:outline-hidden rounded px-3 py-2 font-mono text-slate-200 text-xs"
                />
              </div>
            </div>

            {/* Common SRP Remap Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-400">Quick SRP Migration Presets:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { from: '_MainTex', to: '_BaseMap' },
                  { from: '_Color', to: '_BaseColor' },
                  { from: '_Glossiness', to: '_Smoothness' },
                  { from: '_SpecColor', to: '_SpecularColor' },
                  { from: '_BumpMap', to: '_NormalMap' },
                  { from: '_Shininess', to: '_Smoothness' },
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setRenameOldName(preset.from);
                      setRenameNewName(preset.to);
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-[#141824] hover:bg-[#1E2436] text-slate-300 hover:text-white border border-[#242A3C] transition cursor-pointer text-[11px] font-mono"
                  >
                    <span>{preset.from}</span>
                    <ArrowRight className="w-2.5 h-2.5 text-indigo-400" />
                    <span className="text-cyan-300">{preset.to}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Action Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-[#1F2536]">
              <span className="text-[11px] text-slate-400">
                Press <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">Enter</kbd> to apply rename
              </span>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setMode('list')}
                  className="px-3 py-1.5 text-slate-400 hover:text-slate-200 rounded text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-apply-symbol-rename"
                  onClick={handleExecuteRename}
                  disabled={!renameOldName || !renameNewName || renameCount === 0}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-lg shadow-sm transition cursor-pointer text-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Apply Rename ({renameCount})</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODE 3: URP Includes Browser & Injector */}
        {mode === 'includes' && (
          <div className="p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-cyan-400" />
                  <span>URP ShaderLibrary Includes</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Inject official Universal Render Pipeline shader packages directly into your HLSL program.
                </p>
              </div>

              <button
                onClick={() => setMode('list')}
                className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-[#141824] border border-[#242A3C] transition cursor-pointer"
              >
                Back to List (Esc)
              </button>
            </div>

            {/* Includes Grid */}
            <div className="space-y-2 max-h-[360px] overflow-y-auto">
              {URP_INCLUDES.map((inc) => {
                const isPresent = isUrpIncludePresent(code, inc.path) || isUrpIncludePresent(code, inc.name);
                return (
                  <div
                    key={inc.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[#12151F] border border-[#22283A] hover:border-[#323B52] transition"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-cyan-300">{inc.name}</span>
                        {isPresent && (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-sans">
                            <CheckCircle2 className="w-3 h-3" /> Already Included
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{inc.description}</p>
                      <code className="text-[10px] font-mono text-slate-500 block truncate mt-1">
                        {inc.statement}
                      </code>
                    </div>

                    <button
                      onClick={() => handleInjectInclude(inc.id)}
                      disabled={isPresent}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition cursor-pointer flex items-center gap-1 ${
                        isPresent
                          ? 'bg-emerald-500/10 text-emerald-400/60 border border-emerald-500/20 cursor-default'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                      }`}
                    >
                      {isPresent ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Included</span>
                        </>
                      ) : (
                        <>
                          <span>Inject Include</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
