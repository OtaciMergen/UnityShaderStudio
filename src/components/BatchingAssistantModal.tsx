import React, { useState, useMemo } from 'react';
import { 
  BatchingScanReport, 
  BatchingRefactoringStep,
  scanAndGenerateBatchingProposals 
} from '../lib/batchingAssistant';
import { 
  Sparkles, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  X, 
  ArrowRight, 
  Layers, 
  Check, 
  Cpu, 
  RefreshCw, 
  ShieldCheck, 
  Sliders, 
  Database,
  ChevronDown,
  ChevronUp,
  FileCode,
  RotateCcw
} from 'lucide-react';

interface BatchingAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentHlslCode: string;
  onApplyRefactoredCode: (newCode: string, appliedMessage: string) => void;
}

export const BatchingAssistantModal: React.FC<BatchingAssistantModalProps> = ({
  isOpen,
  onClose,
  currentHlslCode,
  onApplyRefactoredCode,
}) => {
  const [activeCode, setActiveCode] = useState<string>(currentHlslCode);
  const [appliedStepIds, setAppliedStepIds] = useState<Set<string>>(new Set());
  const [expandedStepIds, setExpandedStepIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<'all' | 'critical' | 'warning' | 'optimization'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync active code when modal opens or currentHlslCode changes
  React.useEffect(() => {
    setActiveCode(currentHlslCode);
    setAppliedStepIds(new Set());
  }, [currentHlslCode, isOpen]);

  // Generate current scan report
  const scanReport: BatchingScanReport = useMemo(() => {
    return scanAndGenerateBatchingProposals(activeCode);
  }, [activeCode]);

  // Expand first proposal by default
  React.useEffect(() => {
    if (scanReport.proposals.length > 0 && expandedStepIds.size === 0) {
      setExpandedStepIds(new Set([scanReport.proposals[0].id]));
    }
  }, [scanReport.proposals]);

  if (!isOpen) return null;

  const toggleExpand = (id: string) => {
    setExpandedStepIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleApplySingleStep = (step: BatchingRefactoringStep) => {
    try {
      const transformedCode = step.apply(activeCode);
      setActiveCode(transformedCode);
      setAppliedStepIds(prev => new Set(prev).add(step.id));
      onApplyRefactoredCode(transformedCode, `Applied refactoring: ${step.title}`);
      showToast(`Applied: "${step.title}"`);
    } catch (err) {
      console.error('Failed to apply refactoring step:', err);
    }
  };

  const handleApplyAllSteps = () => {
    try {
      let updated = activeCode;
      const newlyApplied = new Set(appliedStepIds);
      for (const step of scanReport.proposals) {
        if (!newlyApplied.has(step.id)) {
          updated = step.apply(updated);
          newlyApplied.add(step.id);
        }
      }
      setActiveCode(updated);
      setAppliedStepIds(newlyApplied);
      onApplyRefactoredCode(updated, `Applied all ${scanReport.proposals.length} batching optimizations`);
      showToast(`Successfully applied all ${scanReport.proposals.length} batching refactoring steps!`);
    } catch (err) {
      console.error('Failed to apply all steps:', err);
    }
  };

  const handleResetToOriginal = () => {
    setActiveCode(currentHlslCode);
    setAppliedStepIds(new Set());
    onApplyRefactoredCode(currentHlslCode, 'Reverted all Batching Assistant modifications');
    showToast('Reverted shader back to original code state');
  };

  const filteredProposals = scanReport.proposals.filter(p => {
    if (activeFilter === 'all') return true;
    return p.severity === activeFilter;
  });

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        id="batching-assistant-modal"
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0D1016] border border-[#232B3A] rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-200"
      >
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-[#121722] via-[#141B28] to-[#121722] border-b border-[#232B3A] px-5 py-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">SRP Batching Assistant</h2>
                <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Auto-Refactor Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated 16-byte alignment packing, CBUFFER enclosing, and sampler separation for peak GPU throughput.
              </p>
            </div>
          </div>

          <button 
            id="btn-close-batching-assistant"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#181E2C] hover:bg-[#232B3E] text-slate-400 hover:text-white transition cursor-pointer border border-[#263147]"
            title="Close Assistant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toast Notification Banner */}
        {toastMessage && (
          <div className="bg-emerald-950/80 border-b border-emerald-500/40 px-5 py-2 text-xs text-emerald-200 flex items-center justify-between animate-in slide-in-from-top duration-150">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </span>
            <button onClick={() => setToastMessage(null)} className="text-emerald-400 hover:text-white text-[11px]">Dismiss</button>
          </div>
        )}

        {/* Health & Metrics Dashboard Summary */}
        <div className="bg-[#0A0C10] border-b border-[#1E232E] px-5 py-3.5 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Health Score */}
            <div className="bg-[#121620] border border-[#1F2636] rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Batcher Compatibility</span>
                <ShieldCheck className={`w-3.5 h-3.5 ${scanReport.isBatcherCompatible ? 'text-emerald-400' : 'text-amber-400'}`} />
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-xl font-bold font-mono ${
                  scanReport.overallHealthScore >= 80 ? 'text-emerald-400' : scanReport.overallHealthScore >= 50 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {scanReport.overallHealthScore}%
                </span>
                <span className="text-[10px] text-slate-400">
                  {scanReport.isBatcherCompatible ? 'Ready' : 'Issues Found'}
                </span>
              </div>
            </div>

            {/* CBUFFER Size & Packing */}
            <div className="bg-[#121620] border border-[#1F2636] rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>CBUFFER Size</span>
                <Database className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold font-mono text-indigo-300">
                  {scanReport.cbufferByteSize} <span className="text-xs font-normal text-slate-400">bytes</span>
                </span>
                <span className="text-[10px] text-slate-400">({scanReport.packingEfficiency}% packed)</span>
              </div>
            </div>

            {/* Alignment Padding */}
            <div className="bg-[#121620] border border-[#1F2636] rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Alignment Padding</span>
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-xl font-bold font-mono ${scanReport.paddingBytes === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {scanReport.paddingBytes} <span className="text-xs font-normal text-slate-400">bytes</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  {scanReport.paddingBytes === 0 ? 'Zero waste' : 'Can eliminate'}
                </span>
              </div>
            </div>

            {/* Actionable Refactors */}
            <div className="bg-[#121620] border border-[#1F2636] rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Active Proposals</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold font-mono text-cyan-300">
                  {scanReport.totalProposals}
                </span>
                <span className="text-[10px] text-slate-400">
                  {appliedStepIds.size > 0 ? `${appliedStepIds.size} applied` : 'Ready to apply'}
                </span>
              </div>
            </div>
          </div>

          {/* Filter Chips */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#1A202C] text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px] mr-1">Filter Proposals:</span>
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer ${
                  activeFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-[#161B26] text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({scanReport.totalProposals})
              </button>
              {scanReport.criticalCount > 0 && (
                <button
                  onClick={() => setActiveFilter('critical')}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer flex items-center gap-1 ${
                    activeFilter === 'critical' ? 'bg-rose-600 text-white' : 'bg-rose-950/40 text-rose-300 border border-rose-800/40'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>Critical ({scanReport.criticalCount})</span>
                </button>
              )}
              {scanReport.warningsCount > 0 && (
                <button
                  onClick={() => setActiveFilter('warning')}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer flex items-center gap-1 ${
                    activeFilter === 'warning' ? 'bg-amber-600 text-white' : 'bg-amber-950/40 text-amber-300 border border-amber-800/40'
                  }`}
                >
                  <span>Warnings ({scanReport.warningsCount})</span>
                </button>
              )}
              {scanReport.optimizationsCount > 0 && (
                <button
                  onClick={() => setActiveFilter('optimization')}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer flex items-center gap-1 ${
                    activeFilter === 'optimization' ? 'bg-cyan-600 text-white' : 'bg-cyan-950/40 text-cyan-300 border border-cyan-800/40'
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  <span>Optimizations ({scanReport.optimizationsCount})</span>
                </button>
              )}
            </div>

            {scanReport.totalProposals > 0 && (
              <button
                id="btn-apply-all-proposals-top"
                onClick={handleApplyAllSteps}
                className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Apply All ({scanReport.totalProposals})</span>
              </button>
            )}
          </div>
        </div>

        {/* Proposals List Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#0A0C0F] scrollbar-thin">
          {scanReport.totalProposals === 0 ? (
            <div className="bg-[#121620] border border-[#1E2536] rounded-2xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/30">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white">Shader is 100% SRP Batcher Optimized!</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                All material properties are enclosed in `CBUFFER_START(UnityPerMaterial)`, 16-byte alignment packing is zero-waste, and texture samplers are fully separated.
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#182030] text-emerald-300 rounded-full text-xs font-mono border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Zero CPU Draw Call State Breakages</span>
              </div>
            </div>
          ) : (
            filteredProposals.map((step) => {
              const isExpanded = expandedStepIds.has(step.id);
              const isApplied = appliedStepIds.has(step.id);

              return (
                <div 
                  key={step.id}
                  id={`refactor-step-${step.id}`}
                  className={`border rounded-xl transition-all overflow-hidden ${
                    isApplied 
                      ? 'bg-[#0E1715] border-emerald-800/40' 
                      : step.severity === 'critical'
                        ? 'bg-[#161218] border-rose-900/50 hover:border-rose-700/60'
                        : step.severity === 'warning'
                          ? 'bg-[#161413] border-amber-900/50 hover:border-amber-700/60'
                          : 'bg-[#111622] border-[#222D42] hover:border-[#324262]'
                  }`}
                >
                  {/* Step Header */}
                  <div 
                    onClick={() => toggleExpand(step.id)}
                    className="p-4 flex items-start justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-start space-x-3 min-w-0">
                      <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                        isApplied 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                          : step.severity === 'critical'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            : step.severity === 'warning'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                              : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                      }`}>
                        {isApplied ? <Check className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-semibold text-white tracking-tight truncate">
                            {step.title}
                          </h4>

                          <span className={`text-[9px] uppercase font-bold px-2 py-0.2 rounded-full border ${
                            step.severity === 'critical'
                              ? 'bg-rose-950/60 text-rose-300 border-rose-700/50'
                              : step.severity === 'warning'
                                ? 'bg-amber-950/60 text-amber-300 border-amber-700/50'
                                : 'bg-cyan-950/60 text-cyan-300 border-cyan-700/50'
                          }`}>
                            {step.severity}
                          </span>

                          {step.savingsDescription && (
                            <span className="text-[10px] bg-emerald-950/60 text-emerald-300 border border-emerald-700/50 px-2 py-0.2 rounded-full font-medium">
                              {step.savingsDescription}
                            </span>
                          )}

                          {isApplied && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.2 rounded-full font-bold flex items-center gap-1 border border-emerald-500/30">
                              <Check className="w-3 h-3" />
                              <span>Applied</span>
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 leading-relaxed">
                          {step.impactDescription}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        id={`btn-apply-step-${step.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplySingleStep(step);
                        }}
                        disabled={isApplied}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          isApplied
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/50 cursor-default opacity-80'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                        }`}
                      >
                        {isApplied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Applied</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5" />
                            <span>Apply Fix</span>
                          </>
                        )}
                      </button>

                      <div className="p-1 text-slate-400 hover:text-slate-200">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Diff and Explanation */}
                  {isExpanded && (
                    <div className="border-t border-[#1C2333] p-4 bg-[#080A0E] space-y-3">
                      <div className="text-xs text-slate-300 bg-[#121622] border border-[#1E2536] p-3 rounded-lg flex items-start gap-2">
                        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{step.explanation}</span>
                      </div>

                      {/* Before vs After Code Diff Preview */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[11px]">
                        {/* Before */}
                        <div className="border border-rose-900/40 rounded-lg overflow-hidden bg-[#100B0D]">
                          <div className="bg-rose-950/40 border-b border-rose-900/40 px-3 py-1 text-[10px] text-rose-300 font-sans font-semibold flex items-center justify-between">
                            <span>Before (Unoptimized)</span>
                            <span className="text-rose-400/70">HLSL</span>
                          </div>
                          <pre className="p-3 text-rose-200/90 overflow-x-auto whitespace-pre leading-relaxed scrollbar-none">
                            {step.beforeSnippet}
                          </pre>
                        </div>

                        {/* After */}
                        <div className="border border-emerald-900/40 rounded-lg overflow-hidden bg-[#09110D]">
                          <div className="bg-emerald-950/40 border-b border-emerald-900/40 px-3 py-1 text-[10px] text-emerald-300 font-sans font-semibold flex items-center justify-between">
                            <span>After (Refactored & Aligned)</span>
                            <span className="text-emerald-400/70">HLSL</span>
                          </div>
                          <pre className="p-3 text-emerald-200/90 overflow-x-auto whitespace-pre leading-relaxed scrollbar-none">
                            {step.afterSnippet}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="bg-[#121722] border-t border-[#232B3A] px-5 py-3.5 flex items-center justify-between gap-3 shrink-0 text-xs">
          <div className="flex items-center gap-2">
            {appliedStepIds.size > 0 && (
              <button
                id="btn-revert-batching-assistant"
                onClick={handleResetToOriginal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#181E2C] hover:bg-[#202738] text-slate-300 hover:text-white rounded-lg border border-[#2B354C] transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                <span>Revert to Original</span>
              </button>
            )}
            <span className="text-slate-400 text-[11px] hidden sm:inline">
              Refactorings are immediately reflected in the active editor.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-close-batching-modal-footer"
              onClick={onClose}
              className="px-4 py-1.5 bg-[#1A202C] hover:bg-[#242C3C] text-slate-300 hover:text-white font-medium rounded-lg border border-[#2E374A] transition cursor-pointer"
            >
              Done
            </button>
            {scanReport.totalProposals > 0 && (
              <button
                id="btn-apply-all-modal-footer"
                onClick={handleApplyAllSteps}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold rounded-lg shadow-md transition cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Apply All Refactors ({scanReport.totalProposals})</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
