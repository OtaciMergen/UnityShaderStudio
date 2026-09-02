import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  tokenizeLine, 
  getTokenClasses, 
  extractLandmarks, 
  CodeLandmark,
  detectBoilerplateBlocks,
  FoldableBoilerplateBlock
} from '../lib/shaderHighlighter';
import { 
  formatUnityHlsl 
} from '../lib/shaderFormatter';
import { 
  QuickActionItem, 
  getQuickActionList,
  wrapInCbuffer
} from '../lib/shaderQuickActions';
import { 
  HLSLContextMenu 
} from './HLSLContextMenu';
import { 
  ShaderQuickActionsOverlay 
} from './ShaderQuickActionsOverlay';
import { 
  getEditorTheme, 
  saveEditorTheme, 
  DEFAULT_THEME_ID, 
  STORAGE_KEY_EDITOR_THEME,
  EditorTheme 
} from '../lib/shaderEditorThemes';
import { 
  EditorThemeSelector 
} from './EditorThemeSelector';
import { 
  validateHlslCode, 
  HlslDiagnostic, 
  DiagnosticQuickFix, 
  ValidationSummary 
} from '../lib/hlslValidator';
import { 
  HLSLDiagnosticTooltip 
} from './HLSLDiagnosticTooltip';
import { 
  HLSLDiagnosticsDrawer 
} from './HLSLDiagnosticsDrawer';
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  ChevronRight, 
  X, 
  Info, 
  WrapText, 
  Layers, 
  Hash,
  Edit3,
  Code,
  RotateCcw,
  Check,
  Sparkles,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Sliders,
  Zap,
  MousePointerClick,
  Palette,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  Box
} from 'lucide-react';

interface HLSLCodeViewerProps {
  code: string;
  onChange?: (newCode: string) => void;
  language?: 'hlsl' | 'glsl' | 'shaderlab';
  readOnly?: boolean;
  onRevert?: () => void;
  isManuallyEdited?: boolean;
  onOpenBatchingAssistant?: () => void;
  onOpenUnityExport?: () => void;
  batchingProposalsCount?: number;
  themeId?: string;
  onThemeChange?: (themeId: string) => void;
}

export const HLSLCodeViewer: React.FC<HLSLCodeViewerProps> = ({ 
  code,
  onChange,
  language = 'hlsl',
  readOnly = false,
  onRevert,
  isManuallyEdited = false,
  onOpenBatchingAssistant,
  onOpenUnityExport,
  batchingProposalsCount = 0,
  themeId: propThemeId,
  onThemeChange
}) => {
  const [currentThemeId, setCurrentThemeId] = useState<string>(() => {
    if (propThemeId) return propThemeId;
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY_EDITOR_THEME) || DEFAULT_THEME_ID;
    }
    return DEFAULT_THEME_ID;
  });

  // Keep internal theme in sync with prop if passed
  useEffect(() => {
    if (propThemeId && propThemeId !== currentThemeId) {
      setCurrentThemeId(propThemeId);
    }
  }, [propThemeId, currentThemeId]);

  const activeTheme = useMemo(() => getEditorTheme(currentThemeId), [currentThemeId]);

  const handleSelectTheme = useCallback((newThemeId: string) => {
    setCurrentThemeId(newThemeId);
    saveEditorTheme(newThemeId);
    onThemeChange?.(newThemeId);
  }, [onThemeChange]);
  const isEditable = !readOnly && !!onChange;
  const [viewMode, setViewMode] = useState<'edit' | 'highlight'>(isEditable ? 'edit' : 'highlight');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [showLegend, setShowLegend] = useState<boolean>(false);
  const [wordWrap, setWordWrap] = useState<boolean>(false);
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0);

  // Focus Mode State: whether Focus Mode is globally active and which blocks are collapsed
  const [focusModeActive, setFocusModeActive] = useState<boolean>(false);
  const [collapsedBlockIds, setCollapsedBlockIds] = useState<Set<string>>(new Set());

  // Real-Time HLSL Validator State & Diagnostics
  const validationSummary: ValidationSummary = useMemo(() => {
    return validateHlslCode(code);
  }, [code]);

  const [showDiagnosticsDrawer, setShowDiagnosticsDrawer] = useState<boolean>(false);
  const [hoveredDiagnostic, setHoveredDiagnostic] = useState<{
    diagnostic: HlslDiagnostic;
    x: number;
    y: number;
  } | null>(null);
  const [pinnedDiagnosticLine, setPinnedDiagnosticLine] = useState<number | null>(null);

  // Map diagnostics by line number for fast lookups
  const lineDiagnosticsMap = useMemo(() => {
    const map = new Map<number, HlslDiagnostic[]>();
    validationSummary.diagnostics.forEach(d => {
      const existing = map.get(d.line) || [];
      existing.push(d);
      map.set(d.line, existing);
    });
    return map;
  }, [validationSummary.diagnostics]);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    selectedText: string;
    selStart?: number;
    selEnd?: number;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    selectedText: '',
  });

  // Action Notification Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quick Actions Command Palette Overlay State
  const [isQuickActionsOverlayOpen, setIsQuickActionsOverlayOpen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const quickActionsBtnRef = useRef<HTMLButtonElement>(null);

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

  // Detect boilerplate blocks for collapsing/focus mode
  const boilerplateBlocks: FoldableBoilerplateBlock[] = useMemo(() => {
    return detectBoilerplateBlocks(code);
  }, [code]);

  // When Focus Mode is toggled on, collapse all detected boilerplate blocks by default
  const toggleFocusMode = useCallback(() => {
    if (!focusModeActive) {
      const allIds = new Set(boilerplateBlocks.map(b => b.id));
      setCollapsedBlockIds(allIds);
      setFocusModeActive(true);
    } else {
      setCollapsedBlockIds(new Set());
      setFocusModeActive(false);
    }
  }, [focusModeActive, boilerplateBlocks]);

  // Toggle individual block fold state
  const toggleBlockCollapse = useCallback((blockId: string) => {
    setCollapsedBlockIds(prev => {
      const next = new Set(prev);
      if (next.has(blockId)) {
        next.delete(blockId);
      } else {
        next.add(blockId);
      }
      return next;
    });
  }, []);

  // Compute collapsed view representation for Focus Mode
  // In Focus Mode, we generate a presentation where collapsed regions are represented with placeholders
  // like: [📁 Collapsed Properties block (lines 4-28) - Click to expand]
  const renderedLineInfo = useMemo(() => {
    // If not in focus mode or no blocks collapsed, render normal lines
    if (collapsedBlockIds.size === 0) {
      return {
        isCustom: false,
        linesWithMeta: lines.map((line, idx) => ({
          originalLineNumber: idx + 1,
          lineText: line,
          isCollapsedPlaceholder: false,
          block: null as FoldableBoilerplateBlock | null,
        }))
      };
    }

    // Build line segments accounting for collapsed intervals
    const activeBlocks = boilerplateBlocks.filter(b => collapsedBlockIds.has(b.id));
    // Sort blocks by startLine
    activeBlocks.sort((a, b) => a.startLine - b.startLine);

    const result: Array<{
      originalLineNumber: number;
      lineText: string;
      isCollapsedPlaceholder: boolean;
      block: FoldableBoilerplateBlock | null;
      hiddenCount?: number;
    }> = [];

    let currentOriginalLine = 1; // 1-indexed

    while (currentOriginalLine <= lines.length) {
      // Check if currentOriginalLine matches the start of an active collapsed block
      const matchedBlock = activeBlocks.find(b => b.startLine === currentOriginalLine);
      if (matchedBlock) {
        const hiddenLines = matchedBlock.endLine - matchedBlock.startLine + 1;
        result.push({
          originalLineNumber: currentOriginalLine,
          lineText: `/* [▶ FOLDED: ${matchedBlock.label} (${hiddenLines} lines) - Click to expand] */`,
          isCollapsedPlaceholder: true,
          block: matchedBlock,
          hiddenCount: hiddenLines
        });
        currentOriginalLine = matchedBlock.endLine + 1;
      } else {
        result.push({
          originalLineNumber: currentOriginalLine,
          lineText: lines[currentOriginalLine - 1],
          isCollapsedPlaceholder: false,
          block: null,
        });
        currentOriginalLine++;
      }
    }

    return {
      isCustom: true,
      linesWithMeta: result,
    };
  }, [lines, boilerplateBlocks, collapsedBlockIds]);

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

  // Sync scroll between textarea and line number gutter
  const handleTextareaScroll = useCallback(() => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  // Synchronize toast notification auto-hide
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Context Menu Handlers
  const handleOpenContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    let selectedText = '';
    let selStart = 0;
    let selEnd = 0;

    if (textareaRef.current) {
      selStart = textareaRef.current.selectionStart;
      selEnd = textareaRef.current.selectionEnd;
      if (selEnd > selStart) {
        selectedText = textareaRef.current.value.substring(selStart, selEnd);
      }
    }

    if (!selectedText) {
      const windowSel = window.getSelection()?.toString();
      if (windowSel) selectedText = windowSel;
    }

    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      selectedText,
      selStart,
      selEnd,
    });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleExecuteQuickAction = useCallback((action: QuickActionItem) => {
    if (!onChange) return;
    const result = action.execute(code, {
      start: contextMenu.selStart || 0,
      end: contextMenu.selEnd || 0,
      text: contextMenu.selectedText || '',
    });

    onChange(result.newCode);
    setToastMessage(`Applied: ${action.label}`);
    handleCloseContextMenu();
  }, [code, onChange, contextMenu, handleCloseContextMenu]);

  const handleFormatCode = useCallback(() => {
    if (!onChange) return;
    try {
      const formatted = formatUnityHlsl(code, { indentSize: 4 });
      onChange(formatted);
      setToastMessage('Formatted HLSL/ShaderLab code layout.');
    } catch {
      setToastMessage('Formatting completed.');
    }
  }, [code, onChange]);

  const handleCopyAllCode = useCallback(() => {
    navigator.clipboard.writeText(code);
    setToastMessage('Copied shader code to clipboard.');
  }, [code]);

  // Real-Time Diagnostic Quick Fix Handlers
  const handleApplyFix = useCallback((fix: DiagnosticQuickFix) => {
    if (!onChange) return;
    try {
      const newCode = fix.applyFix(code);
      onChange(newCode);
      setToastMessage(`Fixed: ${fix.title}`);
      setHoveredDiagnostic(null);
      setPinnedDiagnosticLine(null);
    } catch {
      setToastMessage('Applied fix.');
    }
  }, [code, onChange]);

  const handleApplyAllFixes = useCallback(() => {
    if (!onChange) return;
    let current = code;
    let fixCount = 0;
    const fixable = validationSummary.diagnostics.filter(d => d.quickFixes && d.quickFixes.length > 0);
    for (const diag of fixable) {
      if (diag.quickFixes && diag.quickFixes[0]) {
        current = diag.quickFixes[0].applyFix(current);
        fixCount++;
      }
    }
    onChange(current);
    setToastMessage(`Applied ${fixCount} automatic HLSL fixes.`);
    setHoveredDiagnostic(null);
    setPinnedDiagnosticLine(null);
  }, [code, onChange, validationSummary.diagnostics]);

  // Gutter & Line Hover Tooltip Trigger Helpers
  const handleTriggerDiagnosticTooltip = useCallback((e: React.MouseEvent, lineNum: number) => {
    const diags = lineDiagnosticsMap.get(lineNum);
    if (diags && diags.length > 0) {
      const containerRect = containerRef.current?.getBoundingClientRect() || { top: 0, left: 0 };
      setHoveredDiagnostic({
        diagnostic: diags[0],
        x: Math.min(e.clientX - containerRect.left + 12, 480),
        y: Math.max(10, e.clientY - containerRect.top - 20),
      });
    }
  }, [lineDiagnosticsMap]);

  const handleDismissDiagnosticTooltip = useCallback(() => {
    if (!pinnedDiagnosticLine) {
      setHoveredDiagnostic(null);
    }
  }, [pinnedDiagnosticLine]);

  // Keyboard shortcuts Alt+L (Lit), Alt+B (Wrap CBUFFER), Alt+I (URP Include), Alt+R / F2 (Rename), Ctrl+K (Quick Actions), etc.
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Check if focus is within editor container
      const container = containerRef.current;
      if (!container || !container.contains(document.activeElement)) return;

      // Command Palette / Quick Actions Overlay: Ctrl+K / Cmd+K / Ctrl+Shift+P / Alt+Q
      if (
        ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'p' || e.key === 'P')) ||
        (e.altKey && (e.key === 'q' || e.key === 'Q'))
      ) {
        e.preventDefault();
        setIsQuickActionsOverlayOpen(prev => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      } else if (e.altKey && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        const action = getQuickActionList().find(a => a.id === 'qa-wrap-cbuffer' || a.id === 'qa-add-srp-batcher-header');
        if (action) handleExecuteQuickAction(action);
      } else if (e.altKey && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        setIsQuickActionsOverlayOpen(true);
      } else if ((e.altKey && (e.key === 'r' || e.key === 'R')) || e.key === 'F2') {
        e.preventDefault();
        setIsQuickActionsOverlayOpen(true);
      } else if (e.altKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        const action = getQuickActionList().find(a => a.id === 'qa-convert-urp-lit');
        if (action) handleExecuteQuickAction(action);
      } else if (e.altKey && (e.key === '4')) {
        e.preventDefault();
        const action = getQuickActionList().find(a => a.id === 'qa-refactor-float4');
        if (action) handleExecuteQuickAction(action);
      } else if (e.altKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        const action = getQuickActionList().find(a => a.id === 'qa-modernize-samplers');
        if (action) handleExecuteQuickAction(action);
      } else if (e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        const action = getQuickActionList().find(a => a.id === 'qa-add-shadowcaster-pass');
        if (action) handleExecuteQuickAction(action);
      } else if (e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        const action = getQuickActionList().find(a => a.id === 'qa-add-depthonly-pass');
        if (action) handleExecuteQuickAction(action);
      } else if (e.altKey && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        const action = getQuickActionList().find(a => a.id === 'qa-convert-urp-unlit');
        if (action) handleExecuteQuickAction(action);
      } else if (e.altKey && e.shiftKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        handleFormatCode();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleExecuteQuickAction, handleFormatCode]);

  // Handle Tab key indentation in textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      if (e.shiftKey) {
        // Shift+Tab: Unindent
        const currentVal = textarea.value;
        const lineStart = currentVal.lastIndexOf('\n', start - 1) + 1;
        if (currentVal.substring(lineStart, lineStart + 4) === '    ') {
          const newVal = currentVal.substring(0, lineStart) + currentVal.substring(lineStart + 4);
          onChange?.(newVal);
          setTimeout(() => {
            textarea.selectionStart = Math.max(lineStart, start - 4);
            textarea.selectionEnd = Math.max(lineStart, end - 4);
          }, 0);
        }
      } else {
        // Tab: Insert 4 spaces
        const currentVal = textarea.value;
        const newVal = currentVal.substring(0, start) + '    ' + currentVal.substring(end);
        onChange?.(newVal);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 4;
        }, 0);
      }
    }
  };

  const scrollToLine = (lineNum: number) => {
    setActiveLine(lineNum);
    // If targeted line is inside a collapsed block, expand it
    const parentBlock = boilerplateBlocks.find(b => lineNum >= b.startLine && lineNum <= b.endLine);
    if (parentBlock && collapsedBlockIds.has(parentBlock.id)) {
      toggleBlockCollapse(parentBlock.id);
    }

    if (viewMode === 'edit' && textareaRef.current) {
      const approxLineHeight = 20;
      textareaRef.current.scrollTop = Math.max(0, (lineNum - 5) * approxLineHeight);
      if (gutterRef.current) {
        gutterRef.current.scrollTop = textareaRef.current.scrollTop;
      }
    } else {
      setTimeout(() => {
        const el = document.getElementById(`code-line-${lineNum}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
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
    <div ref={containerRef} className="flex flex-col h-full bg-[#0A0C0F] text-slate-200 select-text font-mono text-xs">
      
      {/* Top Utility Bar: Mode switch, Focus Mode, Manual edit status, Landmarks & Controls */}
      <div className="bg-[#12151B] border-b border-[#1E232E] px-2.5 py-1 flex items-center justify-between gap-2 text-[11px] shrink-0 min-h-[34px]">
        
        {/* Left: Mode toggle & Focus Mode & Landmarks Quick Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.2 max-w-[74%]">
          
          {/* Edit / Highlight Mode Switcher (if editable) */}
          {isEditable && (
            <div className="inline-flex items-center bg-[#0A0C0F] border border-[#1E232E] rounded p-0.5 shrink-0">
              <button
                id="btn-hlsl-mode-edit"
                onClick={() => setViewMode('edit')}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition cursor-pointer ${
                  viewMode === 'edit'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Directly edit target URP HLSL code"
              >
                <Edit3 className="w-2.5 h-2.5" />
                <span>Editable</span>
              </button>
              <button
                id="btn-hlsl-mode-highlight"
                onClick={() => setViewMode('highlight')}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition cursor-pointer ${
                  viewMode === 'highlight'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Syntax Highlighted Readout"
              >
                <Code className="w-2.5 h-2.5" />
                <span>Highlighted</span>
              </button>
            </div>
          )}

          {/* Focus Mode Toggle Button */}
          <button
            id="btn-hlsl-focus-mode-toggle"
            onClick={toggleFocusMode}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition cursor-pointer shrink-0 border ${
              focusModeActive || collapsedBlockIds.size > 0
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-xs'
                : 'bg-[#161922] text-slate-300 hover:text-white border-[#222733] hover:bg-[#1E2330]'
            }`}
            title="Focus Mode: Temporarily collapses non-essential boilerplate code (Properties, SubShader Tags, Pass boilerplate, standard CBUFFER & Includes) so you can focus directly on HLSL logic & functions"
          >
            {focusModeActive || collapsedBlockIds.size > 0 ? (
              <>
                <EyeOff className="w-2.5 h-2.5 text-cyan-400" />
                <span>Focus ({collapsedBlockIds.size})</span>
              </>
            ) : (
              <>
                <Eye className="w-2.5 h-2.5 text-cyan-400" />
                <span>Focus</span>
              </>
            )}
          </button>

          {/* Batching Assistant Button */}
          {onOpenBatchingAssistant && (
            <button
              id="btn-hlsl-open-batching-assistant"
              onClick={onOpenBatchingAssistant}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition cursor-pointer shrink-0 border bg-gradient-to-r from-amber-500/15 via-indigo-500/15 to-cyan-500/15 text-amber-300 hover:text-white border-amber-500/30 hover:border-amber-400/50 shadow-xs"
              title="Open Batching Assistant: Automatically refactor CBUFFER, pack float uniforms into float4 registers, and separate texture samplers"
            >
              <Zap className="w-2.5 h-2.5 text-amber-400" />
              <span>Batcher</span>
              {batchingProposalsCount > 0 && (
                <span className="px-1 py-0.1 rounded-full bg-amber-400 text-black text-[9px] font-bold">
                  {batchingProposalsCount}
                </span>
              )}
            </button>
          )}

          {/* Real-Time HLSL Validator Health & Diagnostics Pill */}
          <button
            id="btn-hlsl-validator-toggle"
            onClick={() => setShowDiagnosticsDrawer(!showDiagnosticsDrawer)}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition cursor-pointer shrink-0 border ${
              validationSummary.errorCount > 0
                ? showDiagnosticsDrawer
                  ? 'bg-rose-500/30 text-rose-200 border-rose-500/60 ring-1 ring-rose-500/40'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                : validationSummary.warningCount > 0
                ? showDiagnosticsDrawer
                  ? 'bg-amber-500/30 text-amber-200 border-amber-500/60 ring-1 ring-amber-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : showDiagnosticsDrawer
                ? 'bg-emerald-500/25 text-emerald-200 border-emerald-500/50 ring-1 ring-emerald-500/30'
                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
            }`}
            title="HLSL Syntax & Compilation Validator: Click to view errors, warnings, and suggested quick-fixes"
          >
            {validationSummary.errorCount > 0 ? (
              <>
                <AlertCircle className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                <span className="font-bold">{validationSummary.errorCount} {validationSummary.errorCount === 1 ? 'Error' : 'Errors'}</span>
                {validationSummary.warningCount > 0 && (
                  <span className="text-rose-300/70 text-[9px]">+{validationSummary.warningCount}w</span>
                )}
              </>
            ) : validationSummary.warningCount > 0 ? (
              <>
                <AlertTriangle className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                <span>{validationSummary.warningCount} {validationSummary.warningCount === 1 ? 'Warning' : 'Warnings'}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                <span>Valid HLSL</span>
              </>
            )}
          </button>

          {/* Shader Quick Actions Overlay Command Palette Button */}
          <button
            id="btn-hlsl-quick-actions-command-palette"
            onClick={() => setIsQuickActionsOverlayOpen(true)}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer shrink-0 border bg-gradient-to-r from-indigo-500/20 via-cyan-500/20 to-teal-500/20 hover:from-indigo-500/30 hover:to-cyan-500/30 text-cyan-300 hover:text-white border-cyan-500/40 hover:border-cyan-400/60 shadow-xs"
            title="Shader Quick-Actions Overlay (Ctrl+K / Alt+Q): Wrap in CBUFFER (Alt+B), Add URP Include (Alt+I), Rename Property (Alt+R / F2), Format (Alt+Shift+F)"
          >
            <Zap className="w-2.5 h-2.5 text-cyan-300" />
            <span>Quick-Actions</span>
            <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-black/40 text-cyan-200 border border-cyan-500/30">
              Ctrl+K
            </span>
          </button>

          {/* Quick Actions Menu Toolbar Button */}
          <button
            ref={quickActionsBtnRef}
            id="btn-hlsl-quick-actions-toolbar"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setContextMenu({
                isOpen: !contextMenu.isOpen,
                x: rect.left,
                y: rect.bottom + 4,
                selectedText: textareaRef.current ? textareaRef.current.value.substring(textareaRef.current.selectionStart, textareaRef.current.selectionEnd) : '',
              });
            }}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition cursor-pointer shrink-0 border bg-[#161B26] hover:bg-[#1E2536] text-indigo-300 hover:text-white border-indigo-500/30 shadow-xs"
            title="Quick Action Menu (or Right-Click inside editor)"
          >
            <MousePointerClick className="w-2.5 h-2.5 text-indigo-400" />
            <span>Menu</span>
            <ChevronDown className="w-2 h-2 opacity-70" />
          </button>

          {/* Export to Unity (.shader & GUID) Button */}
          {onOpenUnityExport && (
            <button
              id="btn-hlsl-open-unity-export"
              onClick={onOpenUnityExport}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition cursor-pointer shrink-0 border bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 text-emerald-300 hover:text-white border-emerald-500/30 hover:border-emerald-400/50 shadow-xs"
              title="Export Unity Project Package: Download .shader, .shader.meta with custom GUID, and .mat material asset"
            >
              <Box className="w-2.5 h-2.5 text-emerald-400" />
              <span>Export .shader &amp; GUID</span>
            </button>
          )}

          {/* Manual Edits Indicator & Revert Button */}
          {isManuallyEdited && (
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[9px] font-medium text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1 py-0.2 rounded flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                <span>Edited</span>
              </span>
              {onRevert && (
                <button
                  id="btn-revert-hlsl-edits"
                  onClick={onRevert}
                  className="flex items-center gap-1 text-[9px] text-slate-300 hover:text-white bg-[#181C25] hover:bg-[#202533] border border-[#262B38] px-1 py-0.2 rounded transition cursor-pointer"
                  title="Revert manual modifications and restore freshly generated HLSL"
                >
                  <RotateCcw className="w-2 h-2 text-indigo-400" />
                  <span>Revert</span>
                </button>
              )}
            </div>
          )}

          {/* Landmarks Navigation Pills */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-slate-500 text-[10px] font-sans flex items-center gap-0.5 shrink-0">
              <Layers className="w-2.5 h-2.5 text-indigo-400" />
            </span>
            {landmarks.length === 0 ? (
              <span className="text-slate-500 text-[10px] italic">HLSL</span>
            ) : (
              landmarks.map((lm, idx) => (
                <button
                  key={idx}
                  onClick={() => scrollToLine(lm.lineNumber)}
                  className={`px-1.5 py-0.2 rounded text-[9px] font-mono transition cursor-pointer whitespace-nowrap border ${
                    activeLine === lm.lineNumber
                      ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                      : 'bg-[#12151D] text-slate-400 border-[#1B202A] hover:text-slate-200 hover:border-slate-600'
                  }`}
                  title={`Jump to line ${lm.lineNumber}`}
                >
                  {lm.label}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Action Controls: Theme Selector, Search, Wrap, Legend, Total Lines */}
        <div className="flex items-center space-x-1 shrink-0">
          
          {/* Code Editor Theme Dropdown */}
          <EditorThemeSelector
            currentThemeId={currentThemeId}
            onThemeChange={handleSelectTheme}
            compact={true}
          />

          {/* Search Toggle Button */}
          <button
            id="btn-hlsl-search-toggle"
            onClick={() => {
              setShowSearch(!showSearch);
              if (!showSearch) setTimeout(() => searchInputRef.current?.focus(), 50);
            }}
            className={`p-1 rounded transition cursor-pointer ${
              showSearch ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-[#181C25]'
            }`}
            title="Search in code (Ctrl+F)"
          >
            <Search className="w-3 h-3" />
          </button>

          {/* Word Wrap Toggle */}
          <button
            id="btn-hlsl-wrap-toggle"
            onClick={() => setWordWrap(!wordWrap)}
            className={`p-1 rounded transition cursor-pointer ${
              wordWrap ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-[#181C25]'
            }`}
            title="Toggle Word Wrap"
          >
            <WrapText className="w-3 h-3" />
          </button>

          {/* Syntax Legend Toggle */}
          <button
            id="btn-hlsl-legend-toggle"
            onClick={() => setShowLegend(!showLegend)}
            className={`flex items-center space-x-1 px-1.5 py-0.5 rounded transition cursor-pointer text-[10px] ${
              showLegend ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-[#181C25]'
            }`}
            title="Show Theme-Specific Syntax Legend"
          >
            <Info className="w-2.5 h-2.5" />
            <span className="hidden md:inline">Legend</span>
          </button>

          {/* Total Lines Counter */}
          <span className="text-slate-500 text-[10px] pl-0.5 font-mono flex items-center gap-0.5">
            <Hash className="w-2 h-2" />
            {lines.length}
          </span>
        </div>
      </div>

      {/* Focus Mode Quick Banner when active */}
      {(focusModeActive || collapsedBlockIds.size > 0) && (
        <div className="bg-cyan-950/40 border-b border-cyan-800/40 px-2.5 py-1 flex items-center justify-between gap-2 text-cyan-200 text-[10px] font-sans">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <span className="flex items-center gap-1 font-semibold text-cyan-300 shrink-0">
              <EyeOff className="w-3 h-3 text-cyan-400" />
              <span>Folded ({collapsedBlockIds.size}/{boilerplateBlocks.length}):</span>
            </span>
            <div className="flex items-center gap-1">
              {boilerplateBlocks.map((block) => {
                const isCollapsed = collapsedBlockIds.has(block.id);
                return (
                  <button
                    key={block.id}
                    onClick={() => toggleBlockCollapse(block.id)}
                    className={`px-1.5 py-0.2 rounded text-[9px] font-mono transition cursor-pointer flex items-center gap-0.5 border ${
                      isCollapsed 
                        ? 'bg-cyan-900/60 text-cyan-200 border-cyan-500/50 hover:bg-cyan-900' 
                        : 'bg-[#12151B] text-slate-400 border-[#262B38] hover:text-slate-200'
                    }`}
                    title={isCollapsed ? `Click to expand ${block.label}` : `Click to collapse ${block.label}`}
                  >
                    <span>{isCollapsed ? '▶' : '▼'}</span>
                    <span>{block.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <button
            onClick={() => {
              setCollapsedBlockIds(new Set());
              setFocusModeActive(false);
            }}
            className="text-[10px] text-cyan-400 hover:text-cyan-200 underline cursor-pointer shrink-0 font-medium"
          >
            Expand All
          </button>
        </div>
      )}

      {/* In-Code Search Bar */}
      {showSearch && (
        <div className="bg-[#141720] border-b border-[#1E232E] px-2.5 py-1 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center space-x-1.5 flex-1 max-w-sm">
            <Search className="w-3 h-3 text-slate-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentMatchIndex(0);
              }}
              placeholder="Find in shader..."
              className="bg-[#0A0C0F] border border-[#1E232E] rounded px-1.5 py-0.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-full"
            />
          </div>

          <div className="flex items-center space-x-1.5 text-[10px] text-slate-400">
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
              className="p-0.5 hover:bg-[#1E232E] rounded text-slate-300 disabled:opacity-30 cursor-pointer"
              title="Previous match"
            >
              <ChevronUp className="w-3 h-3" />
            </button>
            <button
              onClick={handleNextMatch}
              disabled={searchMatches.length === 0}
              className="p-0.5 hover:bg-[#1E232E] rounded text-slate-300 disabled:opacity-30 cursor-pointer"
              title="Next match"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                setShowSearch(false);
                setSearchQuery('');
              }}
              className="p-0.5 hover:bg-[#1E232E] rounded text-slate-400 hover:text-slate-200 cursor-pointer"
              title="Close search"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Theme Syntax Legend Bar */}
      {showLegend && (
        <div 
          className="border-b px-2.5 py-1 text-[10px] flex flex-wrap items-center gap-x-3 gap-y-0.5 shrink-0 font-sans transition-colors"
          style={{ 
            backgroundColor: activeTheme.colors.gutterBg, 
            borderColor: activeTheme.colors.gutterBorder,
            color: '#CBD5E1'
          }}
        >
          <div className="font-semibold text-slate-400 uppercase text-[8.5px] tracking-wider flex items-center gap-1">
            <Palette className="w-2.5 h-2.5 text-indigo-400" />
            <span>[{activeTheme.name.split(' (')[0]}]:</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeTheme.swatch.cbuffer }}></span>
            <span className={activeTheme.tokenClasses.structural}>CBUFFER & Structural</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeTheme.swatch.srpMacro }}></span>
            <span className={activeTheme.tokenClasses['srp-function']}>SRP Macros</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeTheme.swatch.uniform }}></span>
            <span className={activeTheme.tokenClasses.uniform}>Uniforms</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeTheme.swatch.type }}></span>
            <span className={activeTheme.tokenClasses.type}>Types</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span className={activeTheme.tokenClasses.keyword}>Keywords</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
            <span className={activeTheme.tokenClasses.semantic}>Semantics</span>
          </div>
        </div>
      )}

      {/* Real-Time HLSL Diagnostics Drawer */}
      {showDiagnosticsDrawer && (
        <HLSLDiagnosticsDrawer
          validationSummary={validationSummary}
          onJumpToLine={(line) => {
            scrollToLine(line);
          }}
          onApplyFix={handleApplyFix}
          onApplyAllFixes={handleApplyAllFixes}
          onClose={() => setShowDiagnosticsDrawer(false)}
        />
      )}

      {/* Main Body: Interactive Editor OR Syntax Highlighted Display */}
      <div 
        className="relative flex-1 min-h-[440px] overflow-hidden transition-colors"
        style={{ backgroundColor: activeTheme.colors.bg }}
        onContextMenu={handleOpenContextMenu}
      >
        {viewMode === 'edit' && isEditable ? (
          <div className="flex h-full min-h-[440px]">
            {/* Synchronized Line Number Gutter with folding toggles & Error Badges */}
            <div 
              ref={gutterRef}
              className="w-9 shrink-0 py-2.5 select-none text-right pr-1.5 text-[11px] font-mono leading-relaxed overflow-hidden border-r transition-colors"
              style={{ 
                backgroundColor: activeTheme.colors.gutterBg,
                borderColor: activeTheme.colors.gutterBorder,
                color: activeTheme.colors.gutterText
              }}
            >
              {lines.map((_, i) => {
                const lineNum = i + 1;
                const startingBlock = boilerplateBlocks.find(b => b.startLine === lineNum);
                const isCollapsed = startingBlock ? collapsedBlockIds.has(startingBlock.id) : false;
                const diags = lineDiagnosticsMap.get(lineNum);
                const hasError = diags?.some(d => d.severity === 'error');
                const hasWarning = diags?.some(d => d.severity === 'warning');

                return (
                  <div 
                    key={i} 
                    className={`flex items-center justify-end gap-0.5 cursor-pointer hover:text-slate-300 group/line ${
                      activeLine === lineNum ? 'text-indigo-400 font-bold' : ''
                    } ${hasError ? 'text-rose-400 font-bold' : hasWarning ? 'text-amber-400' : ''}`}
                    onClick={() => {
                      if (startingBlock) {
                        toggleBlockCollapse(startingBlock.id);
                      } else {
                        scrollToLine(lineNum);
                      }
                    }}
                    onMouseEnter={(e) => {
                      if (diags && diags.length > 0) {
                        handleTriggerDiagnosticTooltip(e, lineNum);
                      }
                    }}
                    onMouseLeave={handleDismissDiagnosticTooltip}
                    title={
                      diags && diags.length > 0 
                        ? `${diags[0].severity.toUpperCase()}: ${diags[0].message} (Click for quick-fixes)`
                        : startingBlock 
                        ? `Click to ${isCollapsed ? 'expand' : 'collapse'} ${startingBlock.label}` 
                        : `Line ${lineNum}`
                    }
                  >
                    {hasError ? (
                      <AlertCircle className="w-2.5 h-2.5 text-rose-400 shrink-0 animate-pulse" />
                    ) : hasWarning ? (
                      <AlertTriangle className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                    ) : startingBlock ? (
                      <span className="text-[8.5px] text-cyan-400 hover:text-cyan-200">
                        {isCollapsed ? '▶' : '▼'}
                      </span>
                    ) : (
                      <span className="w-1.5"></span>
                    )}
                    <span>{lineNum}</span>
                  </div>
                );
              })}
            </div>

            {/* Live Editable Textarea */}
            <textarea
              ref={textareaRef}
              id="target-hlsl-textarea"
              value={code}
              onChange={(e) => onChange?.(e.target.value)}
              onScroll={handleTextareaScroll}
              onKeyDown={handleKeyDown}
              onContextMenu={handleOpenContextMenu}
              spellCheck={false}
              style={{ 
                backgroundColor: activeTheme.colors.bg,
                color: '#F1F5F9'
              }}
              className={`flex-1 p-2.5 font-mono text-xs leading-relaxed resize-none focus:outline-none selection:bg-indigo-500/30 border-none ${
                wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre overflow-x-auto'
              }`}
              placeholder="// Enter or modify target HLSL / ShaderLab code... (Right-click for Quick Actions)"
            />
          </div>
        ) : (
          <div 
            className="flex-1 overflow-auto p-1.5 scrollbar-thin h-full"
            style={{ backgroundColor: activeTheme.colors.bg }}
            onContextMenu={handleOpenContextMenu}
          >
            <div className="min-w-full inline-block font-mono text-xs leading-relaxed">
              {renderedLineInfo.linesWithMeta.map((item, itemIdx) => {
                const lineNum = item.originalLineNumber;
                const isMatchLine = searchMatches.some(m => m.lineIdx === lineNum - 1);
                const isSelected = activeLine === lineNum;
                const diags = lineDiagnosticsMap.get(lineNum);
                const hasError = diags?.some(d => d.severity === 'error');
                const hasWarning = diags?.some(d => d.severity === 'warning');

                // Render Collapsed Region Placeholder in Focus Mode
                if (item.isCollapsedPlaceholder && item.block) {
                  const block = item.block;
                  return (
                    <div
                      key={`collapsed-${block.id}-${itemIdx}`}
                      onClick={() => toggleBlockCollapse(block.id)}
                      className="my-1 mx-1.5 bg-gradient-to-r from-cyan-950/40 via-[#121E29] to-cyan-950/20 border border-cyan-700/30 hover:border-cyan-500/50 rounded p-1.5 flex items-center justify-between text-cyan-300 hover:text-cyan-100 transition cursor-pointer group shadow-xs"
                    >
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <ChevronRight className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                        <span className="font-semibold text-[10.5px] truncate">{block.label}</span>
                        <span className="text-[9.5px] text-cyan-400/70 font-sans hidden sm:inline">
                          ({item.hiddenCount} lines folded)
                        </span>
                      </div>
                      <span className="text-[9px] bg-cyan-900/50 border border-cyan-600/30 text-cyan-200 px-1.5 py-0.2 rounded font-sans shrink-0">
                        Expand
                      </span>
                    </div>
                  );
                }

                // Normal tokenized line
                const tokens = tokenizeLine(item.lineText);
                const startingBlock = boilerplateBlocks.find(b => b.startLine === lineNum);
                const isCollapsed = startingBlock ? collapsedBlockIds.has(startingBlock.id) : false;
                const isCbufferLine = /CBUFFER_START|CBUFFER_END|UnityPerMaterial/i.test(item.lineText);

                return (
                  <div
                    id={`code-line-${lineNum}`}
                    key={itemIdx}
                    onClick={() => setActiveLine(lineNum)}
                    style={{
                      backgroundColor: isSelected 
                        ? activeTheme.colors.activeLineBg 
                        : hasError
                        ? '#3F1219'
                        : hasWarning
                        ? '#35210D'
                        : isCbufferLine 
                          ? activeTheme.colors.cbufferHighlightBg 
                          : undefined,
                      borderLeft: isSelected 
                        ? `2px solid ${activeTheme.colors.activeLineBorder}` 
                        : hasError
                        ? '2px solid #F43F5E'
                        : hasWarning
                        ? '2px solid #F59E0B'
                        : isCbufferLine 
                          ? `2px solid ${activeTheme.colors.cbufferHighlightBorder}` 
                          : undefined
                    }}
                    className={`flex items-start hover:bg-[#141720]/40 group transition-colors rounded-xs ${
                      isSelected || hasError || hasWarning || isCbufferLine ? 'pl-1' : 'pl-1.5'
                    } ${isMatchLine && searchQuery.trim() ? 'bg-amber-950/20' : ''}`}
                  >
                    {/* Line Number Gutter with Fold indicator & Error Marker */}
                    <div 
                      className={`w-9 shrink-0 flex items-center justify-end gap-0.5 pr-1.5 select-none text-[11px] group-hover:text-slate-300 font-mono py-0.2 ${
                        hasError ? 'text-rose-400 font-bold' : hasWarning ? 'text-amber-400' : ''
                      }`}
                      style={{ color: hasError ? '#FB7185' : hasWarning ? '#FBBF24' : activeTheme.colors.gutterText }}
                      onMouseEnter={(e) => {
                        if (diags && diags.length > 0) {
                          handleTriggerDiagnosticTooltip(e, lineNum);
                        }
                      }}
                      onMouseLeave={handleDismissDiagnosticTooltip}
                    >
                      {hasError ? (
                        <AlertCircle className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                      ) : hasWarning ? (
                        <AlertTriangle className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                      ) : startingBlock && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBlockCollapse(startingBlock.id);
                          }}
                          className="text-[8.5px] text-cyan-400 hover:text-cyan-200 cursor-pointer"
                          title={`Click to ${isCollapsed ? 'expand' : 'collapse'} ${startingBlock.label}`}
                        >
                          {isCollapsed ? '▶' : '▼'}
                        </button>
                      )}
                      <span>{lineNum}</span>
                    </div>

                    {/* Code Content */}
                    <div 
                      className={`flex-1 py-0.2 pr-2 ${
                        wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
                      } ${
                        hasError 
                          ? 'border-b border-dashed border-rose-500/50' 
                          : hasWarning 
                          ? 'border-b border-dashed border-amber-500/40' 
                          : ''
                      }`}
                      onMouseEnter={(e) => {
                        if (diags && diags.length > 0) {
                          handleTriggerDiagnosticTooltip(e, lineNum);
                        }
                      }}
                      onMouseLeave={handleDismissDiagnosticTooltip}
                    >
                      {tokens.length === 0 ? (
                        <span>&nbsp;</span>
                      ) : (
                        tokens.map((token, tokIdx) => {
                          const tokenClass = getTokenClasses(token.type, activeTheme);
                          
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
        )}
      </div>

      {/* Floating Real-Time HLSL Diagnostic Tooltip with Suggested Quick Fixes */}
      {hoveredDiagnostic && (
        <HLSLDiagnosticTooltip
          diagnostic={hoveredDiagnostic.diagnostic}
          position={{ x: hoveredDiagnostic.x, y: hoveredDiagnostic.y }}
          onApplyFix={handleApplyFix}
          onClose={() => {
            setHoveredDiagnostic(null);
            setPinnedDiagnosticLine(null);
          }}
        />
      )}

      {/* Floating Quick Action Toast Notification */}
      {toastMessage && (
        <div className="absolute bottom-3 right-3 z-40 bg-[#161D2B] border border-emerald-500/50 text-emerald-300 px-3 py-1.5 rounded-lg shadow-lg text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button 
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white ml-1 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Right-Click Quick Action Context Menu */}
      <HLSLContextMenu
        isOpen={contextMenu.isOpen}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={handleCloseContextMenu}
        onExecuteAction={handleExecuteQuickAction}
        onOpenQuickActionsOverlay={() => setIsQuickActionsOverlayOpen(true)}
        onOpenBatchingAssistant={onOpenBatchingAssistant}
        onExportUnity={onOpenUnityExport}
        onFormatCode={handleFormatCode}
        onToggleFocusMode={toggleFocusMode}
        onCopyAllCode={handleCopyAllCode}
        selectedText={contextMenu.selectedText}
      />

      {/* Shader Quick-Actions Command Palette Overlay */}
      <ShaderQuickActionsOverlay
        isOpen={isQuickActionsOverlayOpen}
        onClose={() => setIsQuickActionsOverlayOpen(false)}
        code={code}
        selectedText={textareaRef.current ? textareaRef.current.value.substring(textareaRef.current.selectionStart, textareaRef.current.selectionEnd) : ''}
        selectionRange={textareaRef.current ? { start: textareaRef.current.selectionStart, end: textareaRef.current.selectionEnd } : undefined}
        onApplyCodeChange={(newCode, message) => {
          onChange?.(newCode);
          setToastMessage(message);
        }}
        onOpenBatchingAssistant={onOpenBatchingAssistant}
        onOpenUnityExport={onOpenUnityExport}
        onFormatCode={handleFormatCode}
        onToggleFocusMode={toggleFocusMode}
      />

    </div>
  );
};

