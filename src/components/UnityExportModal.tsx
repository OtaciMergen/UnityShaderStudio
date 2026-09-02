import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  RefreshCw, 
  FileCode, 
  FileText, 
  FolderArchive, 
  Sparkles, 
  Box, 
  Layers, 
  Info,
  CheckCircle2,
  Sliders
} from 'lucide-react';
import { TargetPipeline, ExtractedProperty, UnityVersion } from '../types';
import { 
  generateUnityGuid, 
  isValidUnityGuid, 
  generateShaderMetaContent, 
  generateMaterialAssetContent,
  generateMaterialMetaContent,
  extractShaderInfoFromCode,
  setShaderLabName,
  downloadTextFile,
  exportUnityAssetZip
} from '../lib/unityExport';

interface UnityExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  shaderCode: string;
  targetPipeline: TargetPipeline;
  unityVersion?: UnityVersion;
  properties?: ExtractedProperty[];
  onUpdateShaderCode?: (updatedCode: string) => void;
}

export const UnityExportModal: React.FC<UnityExportModalProps> = ({
  isOpen,
  onClose,
  shaderCode,
  targetPipeline,
  unityVersion = '6000',
  properties = [],
  onUpdateShaderCode,
}) => {
  // Extract initial shader info
  const initialInfo = useMemo(() => {
    return extractShaderInfoFromCode(shaderCode, targetPipeline);
  }, [shaderCode, targetPipeline]);

  const [guid, setGuid] = useState<string>(() => generateUnityGuid());
  const [shaderLabName, setShaderLabNameState] = useState<string>(initialInfo.fullShaderName);
  const [fileName, setFileName] = useState<string>(initialInfo.fileName);
  const [includeMaterial, setIncludeMaterial] = useState<boolean>(true);
  const [includeReadme, setIncludeReadme] = useState<boolean>(true);
  const [activePreviewTab, setActivePreviewTab] = useState<'shader' | 'meta' | 'material'>('shader');

  const [copiedGuid, setCopiedGuid] = useState<boolean>(false);
  const [copiedContent, setCopiedContent] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);

  // Sync state when initialInfo changes
  useEffect(() => {
    if (isOpen) {
      setShaderLabNameState(initialInfo.fullShaderName);
      setFileName(initialInfo.fileName);
    }
  }, [isOpen, initialInfo]);

  // Compute live current shader code with customized ShaderLab name if changed
  const currentWorkingShaderCode = useMemo(() => {
    if (shaderLabName !== initialInfo.fullShaderName && targetPipeline !== 'compute') {
      return setShaderLabName(shaderCode, shaderLabName);
    }
    return shaderCode;
  }, [shaderCode, shaderLabName, initialInfo.fullShaderName, targetPipeline]);

  // Live meta content
  const metaContent = useMemo(() => {
    return generateShaderMetaContent(guid, targetPipeline);
  }, [guid, targetPipeline]);

  // Live material content
  const materialContent = useMemo(() => {
    const baseName = fileName.replace(/\.(shader|hlsl|compute)$/i, '');
    return generateMaterialAssetContent({
      shaderGuid: guid,
      shaderName: shaderLabName,
      materialName: `${baseName}_Material`,
      properties,
    });
  }, [guid, shaderLabName, fileName, properties]);

  if (!isOpen) return null;

  const handleRegenerateGuid = () => {
    setGuid(generateUnityGuid());
  };

  const handleCopyGuid = () => {
    navigator.clipboard.writeText(guid);
    setCopiedGuid(true);
    setTimeout(() => setCopiedGuid(false), 2000);
  };

  const handleCopyActiveContent = () => {
    let contentToCopy = currentWorkingShaderCode;
    if (activePreviewTab === 'meta') contentToCopy = metaContent;
    if (activePreviewTab === 'material') contentToCopy = materialContent;

    navigator.clipboard.writeText(contentToCopy);
    setCopiedContent(true);
    setTimeout(() => setCopiedContent(false), 2000);
  };

  const handleDownloadShader = () => {
    downloadTextFile(fileName, currentWorkingShaderCode);
    if (onUpdateShaderCode && currentWorkingShaderCode !== shaderCode) {
      onUpdateShaderCode(currentWorkingShaderCode);
    }
    setDownloadSuccess('Downloaded .shader file');
    setTimeout(() => setDownloadSuccess(null), 2500);
  };

  const handleDownloadMeta = () => {
    downloadTextFile(`${fileName}.meta`, metaContent, 'text/yaml');
    setDownloadSuccess('Downloaded .meta file');
    setTimeout(() => setDownloadSuccess(null), 2500);
  };

  const handleExportZip = async () => {
    try {
      setIsExportingZip(true);
      await exportUnityAssetZip({
        shaderCode: currentWorkingShaderCode,
        shaderGuid: guid,
        fileName,
        shaderLabName,
        targetPipeline,
        unityVersion: `Unity ${unityVersion}`,
        properties,
        includeMaterial,
        includeReadme,
        includeMetaFiles: true,
      });

      if (onUpdateShaderCode && currentWorkingShaderCode !== shaderCode) {
        onUpdateShaderCode(currentWorkingShaderCode);
      }

      setDownloadSuccess('Exported Unity Package (.zip)');
      setTimeout(() => setDownloadSuccess(null), 2500);
    } catch (err) {
      console.error('Failed to export ZIP package:', err);
    } finally {
      setIsExportingZip(false);
    }
  };

  const isGuidValid = isValidUnityGuid(guid);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        id="unity-export-modal"
        className="relative w-full max-w-4xl bg-[#0F1117] border border-[#232736] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#141722] border-b border-[#232736]">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 rounded-lg border border-indigo-500/30 text-indigo-400">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">
                  Export Unity Shader & GUID Package
                </h2>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Ready to Import
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                  {targetPipeline.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Exports production-ready Unity ShaderLab with native <code className="text-cyan-300">.meta</code> GUID preservation for instant project drop-in.
              </p>
            </div>
          </div>

          <button
            id="btn-close-unity-export"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          
          {/* Unity GUID Generation Banner */}
          <div className="bg-[#151926] border border-[#2A3147] rounded-lg p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-200 font-semibold text-xs">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Unity Asset Database GUID (32-Char Hex)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="btn-regenerate-guid"
                  onClick={handleRegenerateGuid}
                  className="flex items-center gap-1 px-2 py-1 bg-[#1E2336] hover:bg-[#283049] text-slate-300 hover:text-white rounded border border-[#2D3652] transition cursor-pointer text-[11px]"
                  title="Generate a new random 32-character Unity GUID"
                >
                  <RefreshCw className="w-3 h-3 text-cyan-400" />
                  <span>Regenerate GUID</span>
                </button>
                <button
                  id="btn-copy-guid"
                  onClick={handleCopyGuid}
                  className="flex items-center gap-1 px-2 py-1 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 hover:text-cyan-200 rounded border border-cyan-500/40 transition cursor-pointer text-[11px]"
                >
                  {copiedGuid ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedGuid ? 'Copied' : 'Copy GUID'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 bg-[#0A0C11] border border-[#2A3147] rounded px-3 py-1.5 font-mono text-cyan-300 text-xs tracking-wider flex items-center justify-between">
                <span>{guid}</span>
                {isGuidValid ? (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-sans">
                    <CheckCircle2 className="w-3 h-3" /> Valid Unity Hex GUID
                  </span>
                ) : (
                  <span className="text-[10px] text-rose-400 font-sans">
                    Invalid format
                  </span>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Unity uses this static 128-bit hash inside <code className="text-slate-300 font-mono">{fileName}.meta</code> to link materials, scene objects, and prefabs permanently without broken shader dependencies.
            </p>
          </div>

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* File Name */}
            <div className="bg-[#141722] border border-[#232736] rounded-lg p-3 space-y-1.5">
              <label className="block text-[11px] font-medium text-slate-300 flex items-center justify-between">
                <span>Export File Name</span>
                <span className="text-[10px] text-slate-500">Assets/Shaders/</span>
              </label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full bg-[#0B0D13] border border-[#232736] focus:border-indigo-500 focus:outline-hidden rounded px-2.5 py-1.5 font-mono text-slate-200 text-xs"
                placeholder="MyShader.shader"
              />
            </div>

            {/* ShaderLab Path */}
            <div className="bg-[#141722] border border-[#232736] rounded-lg p-3 space-y-1.5">
              <label className="block text-[11px] font-medium text-slate-300 flex items-center justify-between">
                <span>ShaderLab Name & Menu Category</span>
                <span className="text-[10px] text-indigo-400 font-mono">Shader &quot;...&quot;</span>
              </label>
              <input
                type="text"
                value={shaderLabName}
                onChange={(e) => setShaderLabNameState(e.target.value)}
                className="w-full bg-[#0B0D13] border border-[#232736] focus:border-indigo-500 focus:outline-hidden rounded px-2.5 py-1.5 font-mono text-slate-200 text-xs"
                placeholder="Custom/Universal/MyShader"
              />
            </div>
          </div>

          {/* Package Options Toggles */}
          <div className="bg-[#141722] border border-[#232736] rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeMaterial}
                  onChange={(e) => setIncludeMaterial(e.target.checked)}
                  className="rounded bg-[#0B0D13] border-slate-700 text-indigo-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-slate-300 text-xs flex items-center gap-1">
                  <Layers className="w-3 h-3 text-indigo-400" />
                  Include Pre-Configured Material (<code className="text-slate-400 font-mono">.mat</code> + <code className="text-slate-400 font-mono">.mat.meta</code>)
                </span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeReadme}
                  onChange={(e) => setIncludeReadme(e.target.checked)}
                  className="rounded bg-[#0B0D13] border-slate-700 text-indigo-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-slate-300 text-xs flex items-center gap-1">
                  <FileText className="w-3 h-3 text-cyan-400" />
                  Include Unity Quick-Import Guide
                </span>
              </label>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Info className="w-3 h-3 text-amber-400 shrink-0" />
              <span>Compatible with Unity {unityVersion} &amp; Universal Render Pipeline</span>
            </div>
          </div>

          {/* Live Preview Tabs */}
          <div className="border border-[#232736] rounded-lg overflow-hidden flex flex-col bg-[#0B0D13]">
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#141722] border-b border-[#232736]">
              <div className="flex items-center space-x-1">
                <button
                  id="tab-preview-shader"
                  onClick={() => setActivePreviewTab('shader')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
                    activePreviewTab === 'shader'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>{fileName}</span>
                </button>

                <button
                  id="tab-preview-meta"
                  onClick={() => setActivePreviewTab('meta')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
                    activePreviewTab === 'meta'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{fileName}.meta (GUID YAML)</span>
                </button>

                {includeMaterial && (
                  <button
                    id="tab-preview-material"
                    onClick={() => setActivePreviewTab('material')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
                      activePreviewTab === 'material'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>{fileName.replace(/\.[^.]+$/, '')}_Material.mat</span>
                  </button>
                )}
              </div>

              <button
                id="btn-copy-preview-content"
                onClick={handleCopyActiveContent}
                className="flex items-center gap-1 px-2 py-0.5 bg-[#1E2336] hover:bg-[#283049] text-slate-300 hover:text-white rounded border border-[#2D3652] transition cursor-pointer text-[11px]"
              >
                {copiedContent ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedContent ? 'Copied' : 'Copy File Content'}</span>
              </button>
            </div>

            {/* Code Box */}
            <div className="p-3 font-mono text-[11px] leading-relaxed max-h-56 overflow-y-auto text-slate-300 selection:bg-indigo-500/30">
              <pre className="whitespace-pre">
                {activePreviewTab === 'shader' && currentWorkingShaderCode}
                {activePreviewTab === 'meta' && metaContent}
                {activePreviewTab === 'material' && materialContent}
              </pre>
            </div>
          </div>
        </div>

        {/* Modal Footer with Direct Actions */}
        <div className="flex flex-wrap items-center justify-between px-5 py-3.5 bg-[#141722] border-t border-[#232736] gap-3">
          <div className="flex items-center gap-2">
            {downloadSuccess && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium animate-in fade-in">
                <Check className="w-3.5 h-3.5" /> {downloadSuccess}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Download Individual .shader */}
            <button
              id="btn-download-individual-shader"
              onClick={handleDownloadShader}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1E2336] hover:bg-[#283049] text-slate-200 hover:text-white rounded-lg border border-[#2E3752] transition cursor-pointer font-medium text-xs shadow-xs"
              title="Download only the .shader file"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Download {fileName}</span>
            </button>

            {/* Download Companion .meta */}
            <button
              id="btn-download-individual-meta"
              onClick={handleDownloadMeta}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1E2336] hover:bg-[#283049] text-slate-200 hover:text-white rounded-lg border border-[#2E3752] transition cursor-pointer font-medium text-xs shadow-xs"
              title="Download only the .meta file with GUID"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>Download .meta</span>
            </button>

            {/* Primary Action: Export Complete Unity Asset Package (ZIP) */}
            <button
              id="btn-export-unity-package-zip"
              onClick={handleExportZip}
              disabled={isExportingZip}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold rounded-lg shadow-md shadow-indigo-500/20 transition cursor-pointer text-xs disabled:opacity-50"
              title="Export complete folder structure with .shader, .meta, and .mat ready to drop into Unity Assets"
            >
              <FolderArchive className="w-4 h-4" />
              <span>{isExportingZip ? 'Packing ZIP...' : 'Export Unity Package (.zip)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
