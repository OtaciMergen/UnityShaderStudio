import React, { useState } from 'react';
import { HlslDiagnostic, DiagnosticQuickFix, ValidationSummary } from '../lib/hlslValidator';
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  Sparkles, 
  Check, 
  ChevronRight, 
  X, 
  Wrench,
  CheckCircle2,
  Filter
} from 'lucide-react';

interface HLSLDiagnosticsDrawerProps {
  validationSummary?: ValidationSummary;
  summary?: ValidationSummary;
  onJumpToLine: (line: number) => void;
  onApplyFix: (fix: DiagnosticQuickFix) => void;
  onApplyAllFixes: () => void;
  onClose: () => void;
  activeLine?: number | null;
}

export const HLSLDiagnosticsDrawer: React.FC<HLSLDiagnosticsDrawerProps> = ({
  validationSummary,
  summary,
  onJumpToLine,
  onApplyFix,
  onApplyAllFixes,
  onClose,
  activeLine,
}) => {
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all');

  const resolvedSummary: ValidationSummary = validationSummary || summary || {
    diagnostics: [],
    errorCount: 0,
    warningCount: 0,
    infoCount: 0,
    isValid: true,
  };

  const { diagnostics = [], errorCount = 0, warningCount = 0, infoCount = 0, isValid = true } = resolvedSummary;

  const fixableCount = diagnostics.filter(d => d.quickFixes && d.quickFixes.length > 0).length;

  const filteredDiagnostics = diagnostics.filter(d => {
    if (filter === 'all') return true;
    return d.severity === filter;
  });

  return (
    <div className="border-b border-[#1E232E] bg-[#0C0F15] text-slate-200 font-sans text-xs shrink-0 shadow-lg max-h-60 flex flex-col">
      {/* Top Header */}
      <div className="px-3 py-1.5 bg-[#121620] border-b border-[#1E232E] flex items-center justify-between gap-2 shrink-0">
        
        {/* Left: Summary and Filter Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none py-0.5">
          <div className="flex items-center space-x-1.5 font-semibold text-slate-300">
            {isValid ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : errorCount > 0 ? (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            )}
            <span>HLSL Real-Time Diagnostics:</span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-1 bg-[#090B10] border border-[#1E232E] rounded p-0.5">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer flex items-center gap-1 ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>All</span>
              <span className="opacity-80">({diagnostics.length})</span>
            </button>

            <button
              onClick={() => setFilter('error')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer flex items-center gap-1 ${
                filter === 'error'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-400 hover:text-rose-200'
              }`}
            >
              <AlertCircle className="w-2.5 h-2.5" />
              <span>Errors</span>
              <span className="opacity-80 font-bold">({errorCount})</span>
            </button>

            <button
              onClick={() => setFilter('warning')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer flex items-center gap-1 ${
                filter === 'warning'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-400 hover:text-amber-200'
              }`}
            >
              <AlertTriangle className="w-2.5 h-2.5" />
              <span>Warnings</span>
              <span className="opacity-80">({warningCount})</span>
            </button>
          </div>
        </div>

        {/* Right: Quick Fix All & Close */}
        <div className="flex items-center space-x-1.5 shrink-0">
          {fixableCount > 0 && (
            <button
              onClick={onApplyAllFixes}
              className="flex items-center space-x-1 px-2.5 py-0.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-[10.5px] rounded shadow-xs transition cursor-pointer"
              title="Apply all automatic code fixes sequentially"
            >
              <Sparkles className="w-3 h-3 text-emerald-200" />
              <span>Fix All ({fixableCount})</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1 hover:bg-[#1E232E] rounded text-slate-400 hover:text-slate-200 transition cursor-pointer"
            title="Close diagnostics drawer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Diagnostics List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
        {filteredDiagnostics.length === 0 ? (
          <div className="py-4 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-1">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            <span className="text-slate-300 font-medium">No HLSL syntax or semantic errors detected.</span>
            <span className="text-[11px] text-slate-500">ShaderLab structure, CBUFFER alignment, and SRP macros are valid.</span>
          </div>
        ) : (
          filteredDiagnostics.map((diag) => {
            const isError = diag.severity === 'error';
            const isWarning = diag.severity === 'warning';
            const isActive = activeLine === diag.line;

            const borderStyle = isError
              ? 'border-rose-900/40 hover:border-rose-600/50 bg-rose-950/20'
              : isWarning
              ? 'border-amber-900/40 hover:border-amber-600/50 bg-amber-950/20'
              : 'border-cyan-900/40 hover:border-cyan-600/50 bg-cyan-950/20';

            return (
              <div
                key={diag.id}
                onClick={() => onJumpToLine(diag.line)}
                className={`p-2 rounded border transition cursor-pointer flex items-start justify-between gap-2 text-xs group ${borderStyle} ${
                  isActive ? 'ring-1 ring-indigo-500 shadow-xs' : ''
                }`}
              >
                {/* Left icon and message */}
                <div className="flex items-start space-x-2 min-w-0 flex-1">
                  <div className="mt-0.5 shrink-0">
                    {isError ? (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                    ) : isWarning ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Info className="w-3.5 h-3.5 text-cyan-400" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center space-x-1.5 flex-wrap">
                      <span className="font-semibold text-slate-100 text-[11px]">
                        {diag.message}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#141822] text-indigo-300 border border-[#222836]">
                        Line {diag.line}
                      </span>
                      <span className="text-[9px] font-mono text-slate-500">
                        [{diag.code}]
                      </span>
                    </div>

                    <p className="text-[10.5px] text-slate-400 leading-normal line-clamp-2">
                      {diag.explanation}
                    </p>

                    {diag.suggestedFix && (
                      <div className="text-[10px] font-mono text-emerald-400/90 pt-0.5 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                        <span className="truncate">Fix: {diag.suggestedFix}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Quick Fix Buttons & Jump Arrow */}
                <div className="flex items-center space-x-1 shrink-0">
                  {diag.quickFixes && diag.quickFixes.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onApplyFix(diag.quickFixes![0]);
                      }}
                      className="px-2 py-0.5 bg-emerald-600/80 hover:bg-emerald-500 text-white rounded text-[10px] font-medium transition flex items-center gap-1 shadow-xs cursor-pointer"
                      title="Apply this suggested fix directly"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Fix</span>
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onJumpToLine(diag.line);
                    }}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-[#1E232E] transition cursor-pointer"
                    title={`Jump to line ${diag.line}`}
                  >
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
