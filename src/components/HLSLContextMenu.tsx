import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  QuickActionItem, 
  getQuickActionList 
} from '../lib/shaderQuickActions';
import { 
  Sun, 
  Layers, 
  Zap, 
  Maximize2, 
  Sliders, 
  Sparkles, 
  EyeOff, 
  FileCode, 
  Compass, 
  Search, 
  Check, 
  ExternalLink,
  Cpu,
  Eye,
  AlignLeft,
  Copy,
  Terminal,
  Box,
  FolderArchive
} from 'lucide-react';

interface HLSLContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  onClose: () => void;
  onExecuteAction: (action: QuickActionItem) => void;
  onOpenQuickActionsOverlay?: () => void;
  onOpenBatchingAssistant?: () => void;
  onExportUnity?: () => void;
  onFormatCode?: () => void;
  onToggleFocusMode?: () => void;
  onCopyAllCode?: () => void;
  selectedText?: string;
}

export const HLSLContextMenu: React.FC<HLSLContextMenuProps> = ({
  isOpen,
  x,
  y,
  onClose,
  onExecuteAction,
  onOpenQuickActionsOverlay,
  onOpenBatchingAssistant,
  onExportUnity,
  onFormatCode,
  onToggleFocusMode,
  onCopyAllCode,
  selectedText,
}) => {
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [hoveredActionId, setHoveredActionId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const actions = useMemo(() => getQuickActionList(), []);

  // Filter actions based on search input
  const filteredActions = useMemo(() => {
    if (!searchFilter.trim()) return actions;
    const q = searchFilter.toLowerCase();
    return actions.filter(
      a => a.label.toLowerCase().includes(q) || 
           a.description.toLowerCase().includes(q) ||
           a.category.toLowerCase().includes(q)
    );
  }, [actions, searchFilter]);

  // Adjust menu position to avoid overflowing viewport
  const [adjustedPos, setAdjustedPos] = useState<{ top: number; left: number }>({ top: y, left: x });

  useEffect(() => {
    if (isOpen) {
      setSearchFilter('');
      setHoveredActionId(null);
      const menuWidth = 320;
      const menuHeight = 440;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      let left = x;
      let top = y;

      if (left + menuWidth > windowWidth - 16) {
        left = Math.max(16, windowWidth - menuWidth - 16);
      }
      if (top + menuHeight > windowHeight - 16) {
        top = Math.max(16, windowHeight - menuHeight - 16);
      }

      setAdjustedPos({ top, left });
      setTimeout(() => searchInputRef.current?.focus(), 40);
    }
  }, [isOpen, x, y]);

  // Click outside and Esc key listeners
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('mousedown', handleOutsideClick);
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const renderIcon = (name: string) => {
    switch (name) {
      case 'Sun': return <Sun className="w-3.5 h-3.5 text-amber-400" />;
      case 'Layers': return <Layers className="w-3.5 h-3.5 text-indigo-400" />;
      case 'Zap': return <Zap className="w-3.5 h-3.5 text-amber-400" />;
      case 'Maximize2': return <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />;
      case 'Sliders': return <Sliders className="w-3.5 h-3.5 text-indigo-400" />;
      case 'Sparkles': return <Sparkles className="w-3.5 h-3.5 text-pink-400" />;
      case 'EyeOff': return <EyeOff className="w-3.5 h-3.5 text-emerald-400" />;
      case 'FileCode': return <FileCode className="w-3.5 h-3.5 text-cyan-400" />;
      case 'Compass': return <Compass className="w-3.5 h-3.5 text-indigo-400" />;
      default: return <Terminal className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const categories = [
    { key: 'convert', label: 'Pipeline Conversion' },
    { key: 'batching', label: 'SRP Batcher & Uniforms' },
    { key: 'refactor', label: 'HLSL Refactoring' },
    { key: 'insert', label: 'Passes & Snippets' },
  ];

  return (
    <div
      ref={menuRef}
      id="hlsl-quick-action-context-menu"
      style={{ top: `${adjustedPos.top}px`, left: `${adjustedPos.left}px` }}
      className="fixed z-50 w-80 bg-[#0F131C] border border-[#232D42] rounded-xl shadow-2xl shadow-black/80 flex flex-col overflow-hidden text-slate-200 font-sans text-xs animate-in fade-in zoom-in-95 duration-100 backdrop-blur-md"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Menu Header with Search */}
      <div className="bg-[#141A26] border-b border-[#232D42] px-3 py-2.5 space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shadow-xs">
              ⚡
            </div>
            <span className="font-bold text-white text-xs tracking-tight">Quick Actions</span>
          </div>
          {selectedText && (
            <span className="text-[10px] text-cyan-400 bg-cyan-950/60 border border-cyan-800/50 px-1.5 py-0.2 rounded font-mono">
              Selection Active
            </span>
          )}
        </div>

        {/* Quick search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search action or shortcut..."
            className="w-full pl-8 pr-2.5 py-1 bg-[#0A0D14] border border-[#232D42] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Main Actions Scrollable Area */}
      <div className="max-h-72 overflow-y-auto p-1.5 space-y-1.5 scrollbar-thin">
        
        {/* Top Direct Utility Shortcuts if no active search filter */}
        {!searchFilter.trim() && (
          <div className="pb-1.5 mb-1.5 border-b border-[#1E2536] space-y-1 px-1">
            {onOpenQuickActionsOverlay && (
              <button
                id="ctx-btn-quick-actions-overlay"
                onClick={() => {
                  onClose();
                  onOpenQuickActionsOverlay();
                }}
                className="w-full flex items-center justify-between p-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/35 text-indigo-200 text-[11px] font-semibold transition cursor-pointer text-left shadow-xs"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Zap className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                  <span className="truncate">Shader Quick-Actions Overlay</span>
                </div>
                <span className="text-[10px] font-mono px-1 py-0.2 bg-[#0E121B] text-cyan-300 rounded border border-[#252C3D]">
                  Ctrl+K
                </span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-1">
              {onOpenBatchingAssistant && (
                <button
                  id="ctx-btn-batching-assistant"
                  onClick={() => {
                    onClose();
                    onOpenBatchingAssistant();
                  }}
                  className="flex items-center gap-1.5 p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-semibold transition cursor-pointer text-left"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">Batching Assistant</span>
                </button>
              )}

              {onExportUnity && (
                <button
                  id="ctx-btn-export-unity"
                  onClick={() => {
                    onClose();
                    onExportUnity();
                  }}
                  className="flex items-center gap-1.5 p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold transition cursor-pointer text-left"
                >
                  <Box className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">Export .shader</span>
                </button>
              )}

              {onFormatCode && (
                <button
                  id="ctx-btn-format-code"
                  onClick={() => {
                    onClose();
                    onFormatCode();
                  }}
                  className="flex items-center gap-1.5 p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[11px] font-semibold transition cursor-pointer text-left"
                >
                  <AlignLeft className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="truncate">Format HLSL</span>
                </button>
              )}

              {onToggleFocusMode && (
                <button
                  id="ctx-btn-toggle-focus"
                  onClick={() => {
                    onClose();
                    onToggleFocusMode();
                  }}
                  className="flex items-center gap-1.5 p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[11px] font-semibold transition cursor-pointer text-left"
                >
                  <Eye className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate">Toggle Focus</span>
                </button>
              )}

              {onCopyAllCode && (
                <button
                  id="ctx-btn-copy-all"
                  onClick={() => {
                    onClose();
                    onCopyAllCode();
                  }}
                  className="col-span-2 flex items-center justify-center gap-1.5 p-1.5 rounded-lg bg-[#161C28] hover:bg-[#202738] border border-[#283348] text-slate-300 hover:text-white text-[11px] font-medium transition cursor-pointer text-center"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Copy All Code</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Grouped Actions List */}
        {filteredActions.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500">
            No matching action found for &ldquo;{searchFilter}&rdquo;
          </div>
        ) : searchFilter.trim() ? (
          // Flattened list when searching
          <div className="space-y-0.5">
            {filteredActions.map((action) => (
              <button
                key={action.id}
                id={`ctx-item-${action.id}`}
                onClick={() => {
                  onClose();
                  onExecuteAction(action);
                }}
                onMouseEnter={() => setHoveredActionId(action.id)}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-indigo-600/30 hover:text-white transition cursor-pointer text-left group"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="p-1 rounded bg-[#161B28] group-hover:bg-indigo-500/40 shrink-0">
                    {renderIcon(action.iconName)}
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-medium text-slate-200 group-hover:text-white truncate">
                      {action.label}
                    </div>
                  </div>
                </div>
                {action.shortcut && (
                  <span className="text-[10px] font-mono text-slate-400 group-hover:text-indigo-200 bg-[#161B28] px-1.5 py-0.5 rounded border border-[#232D42]">
                    {action.shortcut}
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : (
          // Categorized Groups
          categories.map((cat) => {
            const catActions = actions.filter((a) => a.category === cat.key);
            if (catActions.length === 0) return null;

            return (
              <div key={cat.key} className="space-y-0.5">
                <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  {cat.label}
                </div>
                {catActions.map((action) => (
                  <button
                    key={action.id}
                    id={`ctx-item-${action.id}`}
                    onClick={() => {
                      onClose();
                      onExecuteAction(action);
                    }}
                    onMouseEnter={() => setHoveredActionId(action.id)}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-indigo-600/30 hover:text-white transition cursor-pointer text-left group"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="p-1 rounded bg-[#161B28] group-hover:bg-indigo-500/40 shrink-0">
                        {renderIcon(action.iconName)}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-medium text-slate-200 group-hover:text-white truncate">
                          {action.label}
                        </div>
                      </div>
                    </div>
                    {action.shortcut && (
                      <span className="text-[10px] font-mono text-slate-400 group-hover:text-indigo-200 bg-[#161B28] px-1.5 py-0.5 rounded border border-[#232D42]">
                        {action.shortcut}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info / Hovered Action Description */}
      <div className="bg-[#121620] border-t border-[#232D42] px-3 py-2 text-[11px] text-slate-400 min-h-[36px] flex items-center shrink-0">
        {hoveredActionId ? (
          <span className="text-slate-300 leading-tight">
            {actions.find(a => a.id === hoveredActionId)?.description}
          </span>
        ) : (
          <span className="text-slate-500 text-[10px]">
            Tip: Right-click anywhere inside the HLSL editor to trigger shortcuts.
          </span>
        )}
      </div>
    </div>
  );
};
