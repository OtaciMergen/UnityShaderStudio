import React from 'react';
import { HlslDiagnostic, DiagnosticQuickFix } from '../lib/hlslValidator';
import { AlertCircle, AlertTriangle, Info, Sparkles, Check, ArrowRight, X } from 'lucide-react';

interface HLSLDiagnosticTooltipProps {
  diagnostic: HlslDiagnostic;
  onApplyFix?: (fix: DiagnosticQuickFix) => void;
  onClose?: () => void;
  onJumpToLine?: (line: number) => void;
  position?: { x: number; y: number };
  isFloating?: boolean;
}

export const HLSLDiagnosticTooltip: React.FC<HLSLDiagnosticTooltipProps> = ({
  diagnostic,
  onApplyFix,
  onClose,
  onJumpToLine,
  position,
  isFloating = false,
}) => {
  const isError = diagnostic.severity === 'error';
  const isWarning = diagnostic.severity === 'warning';

  const severityIcon = isError ? (
    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
  ) : isWarning ? (
    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
  ) : (
    <Info className="w-4 h-4 text-cyan-400 shrink-0" />
  );

  const borderClass = isError
    ? 'border-rose-500/40 shadow-rose-950/40'
    : isWarning
    ? 'border-amber-500/40 shadow-amber-950/40'
    : 'border-cyan-500/40 shadow-cyan-950/40';

  const bgHeaderClass = isError
    ? 'bg-rose-950/60 text-rose-200 border-rose-800/40'
    : isWarning
    ? 'bg-amber-950/60 text-amber-200 border-amber-800/40'
    : 'bg-cyan-950/60 text-cyan-200 border-cyan-800/40';

  const badgeClass = isError
    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
    : isWarning
    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
    : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';

  const style: React.CSSProperties = isFloating && position ? {
    position: 'absolute',
    left: `${Math.max(10, position.x)}px`,
    top: `${position.y}px`,
    zIndex: 50,
    maxWidth: '420px',
  } : {
    maxWidth: '100%',
  };

  return (
    <div 
      style={style}
      className={`rounded-lg bg-[#0E121A] border ${borderClass} shadow-xl text-slate-200 font-sans text-xs overflow-hidden backdrop-blur-md animate-in fade-in zoom-in-95 duration-150`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className={`px-3 py-1.5 border-b flex items-center justify-between gap-2 ${bgHeaderClass}`}>
        <div className="flex items-center space-x-1.5 min-w-0">
          {severityIcon}
          <span className="font-semibold text-xs tracking-tight truncate">
            {isError ? 'HLSL Compilation Error' : isWarning ? 'HLSL Warning' : 'Suggestion'}
          </span>
          <span className={`px-1.5 py-0.2 text-[9.5px] font-mono font-bold rounded border uppercase ${badgeClass}`}>
            Line {diagnostic.line}
          </span>
          <span className="text-[9.5px] font-mono text-slate-400 hidden sm:inline truncate">
            [{diagnostic.code}]
          </span>
        </div>

        <div className="flex items-center space-x-1 shrink-0">
          {onJumpToLine && (
            <button
              onClick={() => onJumpToLine(diagnostic.line)}
              className="text-[10px] text-slate-300 hover:text-white underline cursor-pointer px-1 py-0.5 rounded hover:bg-white/10"
              title="Jump to line"
            >
              Go to line
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-white/10 transition cursor-pointer"
              title="Close tooltip"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {/* Main message */}
        <p className="font-medium text-slate-100 text-[11.5px] leading-snug">
          {diagnostic.message}
        </p>

        {/* Detailed explanation */}
        {diagnostic.explanation && (
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {diagnostic.explanation}
          </p>
        )}

        {/* Offending text snippet if present */}
        {diagnostic.offendingText && (
          <div className="bg-[#080A0E] border border-[#1E232E] rounded px-2 py-1 font-mono text-[10.5px] text-rose-300 overflow-x-auto">
            <span className="text-slate-500 select-none mr-2">Line {diagnostic.line}:</span>
            <span>{diagnostic.offendingText}</span>
          </div>
        )}

        {/* Suggested Fix code diff preview */}
        {diagnostic.suggestedFix && (
          <div className="bg-[#0A0D14] border border-emerald-900/30 rounded p-2 text-[11px] font-mono">
            <div className="text-[10px] font-sans font-semibold text-emerald-400 mb-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Suggested Fix:</span>
            </div>
            <div className="text-emerald-300 bg-emerald-950/40 border border-emerald-800/40 rounded px-1.5 py-0.5 overflow-x-auto whitespace-pre">
              {diagnostic.suggestedFix}
            </div>
          </div>
        )}

        {/* Quick Fix Action Buttons */}
        {diagnostic.quickFixes && diagnostic.quickFixes.length > 0 && onApplyFix && (
          <div className="pt-1 flex flex-wrap gap-1.5">
            {diagnostic.quickFixes.map((fix) => (
              <button
                key={fix.id}
                onClick={() => onApplyFix(fix)}
                className="flex items-center space-x-1.5 px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-[10.5px] rounded shadow-xs transition cursor-pointer"
                title="Apply fix directly to shader source"
              >
                <Sparkles className="w-3 h-3 text-emerald-200" />
                <span>Fix: {fix.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
