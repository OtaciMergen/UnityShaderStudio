import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, 
  Copy, 
  Check, 
  Download, 
  FileCode, 
  Sliders, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Upload, 
  RefreshCw, 
  FileArchive, 
  SplitSquareVertical,
  Activity,
  Layers,
  ShieldCheck,
  Gauge,
  TrendingDown,
  AlignLeft,
  GraduationCap,
  BookOpen,
  ExternalLink,
  Maximize2,
  Columns,
  Sidebar
} from 'lucide-react';
import { 
  TargetPipeline, 
  UnityVersion, 
  SurfaceType, 
  SourceFormat,
  TranspileOptions, 
  TranspileResult,
  ShaderPreset 
} from '../types';
import { transpileGlslToUnity } from '../lib/shaderTranspiler';
import { formatUnityHlsl } from '../lib/shaderFormatter';
import { SHADER_PRESETS } from '../data/shaderPresets';
import { PerformanceImpactEstimator } from './PerformanceImpactEstimator';
import { HLSLCodeViewer } from './HLSLCodeViewer';
import { SourceCodeEditor } from './SourceCodeEditor';
import JSZip from 'jszip';

interface ConverterWorkbenchProps {
  targetPipeline: TargetPipeline;
  setTargetPipeline: (pipeline: TargetPipeline) => void;
  unityVersion: UnityVersion;
  setUnityVersion: (ver: UnityVersion) => void;
  activePreset: ShaderPreset | null;
  setActivePreset: (preset: ShaderPreset | null) => void;
  onPreviewShader: (glsl: string, pipeline: TargetPipeline) => void;
}

export const ConverterWorkbench: React.FC<ConverterWorkbenchProps> = ({
  targetPipeline,
  setTargetPipeline,
  unityVersion,
  setUnityVersion,
  activePreset,
  setActivePreset,
  onPreviewShader,
}) => {
  // Conversion Mode & Source Format (Default: GLSL to Unity URP / SRP)
  const [conversionMode, setConversionMode] = useState<'builtin_to_urp' | 'glsl_to_srp'>('glsl_to_srp');
  const [sourceFormat, setSourceFormat] = useState<SourceFormat>('glsl');

  // Source code state (default to active preset or first GLSL preset)
  const [sourceCode, setSourceCode] = useState<string>(
    activePreset ? activePreset.glslCode : SHADER_PRESETS[0].glslCode
  );

  // Conversion Options
  const [surfaceType, setSurfaceType] = useState<SurfaceType>('unlit');
  const [srpBatcher, setSrpBatcher] = useState<boolean>(true);
  const [clipSpaceCorrection, setClipSpaceCorrection] = useState<boolean>(true);
  const [samplerSeparation, setSamplerSeparation] = useState<boolean>(true);
  const [remapLegacyTextureNames, setRemapLegacyTextureNames] = useState<boolean>(true);
  const [convertFogMacros, setConvertFogMacros] = useState<boolean>(true);
  const [generateShadowCaster, setGenerateShadowCaster] = useState<boolean>(true);
  const [customShaderName, setCustomShaderName] = useState<string>('Custom/MigratedShader');

  // Output & Diagnostics State
  const [transpileResult, setTranspileResult] = useState<TranspileResult | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [formattedSuccess, setFormattedSuccess] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'code' | 'performance' | 'properties' | 'annotations'>('code');
  const [layoutMode, setLayoutMode] = useState<'split' | 'wide' | 'full'>('split');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Switch conversion mode
  const handleSelectConversionMode = (mode: 'builtin_to_urp' | 'glsl_to_srp') => {
    setConversionMode(mode);
    if (mode === 'builtin_to_urp') {
      setTargetPipeline('urp');
      setSourceFormat('builtin_cg');
      const builtinPreset = SHADER_PRESETS.find(p => p.category === 'Built-in RP Legacy');
      if (builtinPreset) {
        setActivePreset(builtinPreset);
        setSourceCode(builtinPreset.glslCode);
      }
    } else {
      setSourceFormat('glsl');
      const glslPreset = SHADER_PRESETS.find(p => p.category === '3D Surface');
      if (glslPreset) {
        setActivePreset(glslPreset);
        setSourceCode(glslPreset.glslCode);
      }
    }
  };

  // Run local transpilation whenever code or options change
  useEffect(() => {
    runLocalTranspilation();
  }, [
    sourceCode,
    sourceFormat,
    targetPipeline,
    unityVersion,
    surfaceType,
    srpBatcher,
    clipSpaceCorrection,
    samplerSeparation,
    remapLegacyTextureNames,
    convertFogMacros,
    generateShadowCaster,
    customShaderName,
  ]);

  // Sync when active preset changes
  useEffect(() => {
    if (activePreset) {
      setSourceCode(activePreset.glslCode);
      if (activePreset.targetPipeline) {
        setTargetPipeline(activePreset.targetPipeline);
      }
      if (activePreset.category === 'Built-in RP Legacy') {
        setConversionMode('builtin_to_urp');
        setSourceFormat('builtin_cg');
      } else {
        setConversionMode('glsl_to_srp');
        setSourceFormat('glsl');
      }
    }
  }, [activePreset]);

  const runLocalTranspilation = () => {
    try {
      const options: TranspileOptions = {
        targetPipeline,
        sourceFormat,
        unityVersion,
        surfaceType,
        srpBatcher,
        clipSpaceCorrection,
        samplerSeparation,
        includeInspectorProperties: true,
        functionPrecision: 'both',
        customShaderName,
        remapLegacyTextureNames,
        convertFogMacros,
        generateShadowCaster,
      };

      const result = transpileGlslToUnity(sourceCode, options);
      setTranspileResult(result);
      setErrorMessage(null);
    } catch (err: any) {
      console.error('Transpile error:', err);
      setErrorMessage(err.message || 'Transpilation error');
    }
  };

  const handleCopyCode = () => {
    if (!transpileResult?.convertedCode) return;
    navigator.clipboard.writeText(transpileResult.convertedCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleFormatConvertedCode = () => {
    if (!transpileResult?.convertedCode) return;
    try {
      const formatted = formatUnityHlsl(transpileResult.convertedCode, { indentSize: 4 });
      setTranspileResult({
        ...transpileResult,
        convertedCode: formatted,
      });
      setFormattedSuccess(true);
      setTimeout(() => setFormattedSuccess(false), 2000);
    } catch (err) {
      console.error('Format error:', err);
    }
  };

  const handleDownloadFile = () => {
    if (!transpileResult?.convertedCode) return;
    let filename = 'MigratedShader.shader';
    if (targetPipeline === 'shadergraph' || targetPipeline === 'srp_core') {
      filename = 'MigratedShader.hlsl';
    } else if (targetPipeline === 'compute') {
      filename = 'MigratedCompute.compute';
    }

    const blob = new Blob([transpileResult.convertedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export full Unity package ZIP
  const handleExportZip = async () => {
    if (!transpileResult?.convertedCode) return;
    const zip = new JSZip();
    const folder = zip.folder('Unity_Migrated_Shaders');

    // Main shader file
    const ext = targetPipeline === 'compute' ? '.compute' : (targetPipeline === 'shadergraph' || targetPipeline === 'srp_core' ? '.hlsl' : '.shader');
    folder?.file(`MigratedShader${ext}`, transpileResult.convertedCode);

    // If shader graph, also include Custom Function hlsl include and instructions
    if (transpileResult.shaderGraphNode) {
      folder?.file('GlslConvertedNode.hlsl', transpileResult.shaderGraphNode.hlslBody);
      folder?.file(
        'ShaderGraph_Node_Setup.txt',
        `Unity Shader Graph Custom Function Node Instructions:
1. Open your Shader Graph in Unity (URP or HDRP).
2. Right click -> Create Node -> Custom Function.
3. In the Node Inspector:
   - Type: File
   - Source: GlslConvertedNode.hlsl
   - Name: GlslConvertedNode
4. Inputs:
${transpileResult.shaderGraphNode.inputs.map(i => `   - ${i.name} (${i.type})`).join('\n')}
5. Outputs:
${transpileResult.shaderGraphNode.outputs.map(o => `   - ${o.name} (${o.type})`).join('\n')}`
      );
    }

    // Material properties description
    if (transpileResult.properties.length > 0) {
      folder?.file(
        'Properties_Reference.json',
        JSON.stringify(transpileResult.properties, null, 2)
      );
    }

    // README
    folder?.file(
      'README.md',
      `# Converted Unity SRP Shader
- **Target Pipeline**: ${targetPipeline.toUpperCase()} (Unity ${unityVersion})
- **SRP Batcher Compliant**: ${transpileResult.srpBatcherCompliant ? 'Yes (100%)' : 'No'}
- **Surface Mode**: ${surfaceType}

### Installation:
1. Drag the folder into your Unity Project \`Assets/\` folder.
2. In Unity Editor, right-click the shader -> Create -> Material.
3. Assign the material to your 3D Mesh or Fullscreen Blit renderer.`
    );

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Unity_${targetPipeline.toUpperCase()}_ShaderBundle.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setSourceCode(text);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      
      {/* Primary Conversion Mode Selector Bar */}
      <div className="bg-[#16181D] border border-[#23272F] rounded-lg p-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">Mode:</span>
          <div className="inline-flex rounded-md bg-[#0E1013] p-1 border border-[#23272F]">
            <button
              id="mode-builtin-to-urp"
              onClick={() => handleSelectConversionMode('builtin_to_urp')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                conversionMode === 'builtin_to_urp'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Unity Built-in Renderer ➔ Unity URP</span>
            </button>
            <button
              id="mode-glsl-to-srp"
              onClick={() => handleSelectConversionMode('glsl_to_srp')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                conversionMode === 'glsl_to_srp'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>OpenGL GLSL ➔ Unity URP / HDRP</span>
            </button>
          </div>
        </div>

        {/* Quick Format & Preset Selectors */}
        <div className="flex items-center space-x-2 flex-wrap">
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] font-medium text-slate-400">Preset:</span>
            <select
              id="preset-select"
              aria-label="Preset Shader Selection"
              value={activePreset?.id || ''}
              onChange={(e) => {
                const found = SHADER_PRESETS.find(p => p.id === e.target.value);
                if (found) setActivePreset(found);
              }}
              className="bg-[#0A0C0E] text-indigo-300 font-mono text-xs rounded px-2.5 py-1.5 border border-[#2D343F] focus:outline-none focus:border-indigo-500 cursor-pointer max-w-[240px]"
            >
              <option value="" disabled>Select Preset...</option>
              {conversionMode === 'builtin_to_urp' ? (
                <>
                  <optgroup label="Built-in RP Legacy Presets">
                    {SHADER_PRESETS.filter(p => p.category === 'Built-in RP Legacy').map(preset => (
                      <option key={preset.id} value={preset.id}>{preset.title}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Other GLSL Presets">
                    {SHADER_PRESETS.filter(p => p.category !== 'Built-in RP Legacy').map(preset => (
                      <option key={preset.id} value={preset.id}>{preset.title}</option>
                    ))}
                  </optgroup>
                </>
              ) : (
                SHADER_PRESETS.map(preset => (
                  <option key={preset.id} value={preset.id}>
                    [{preset.category}] {preset.title}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Upload Button */}
          <button
            id="btn-upload-shader"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#1E232B] hover:bg-[#282F3A] text-slate-300 text-xs font-medium rounded border border-[#2D343F] transition cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload {conversionMode === 'builtin_to_urp' ? 'Built-in .shader' : 'GLSL'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".shader,.cginc,.glsl,.frag,.vert,.compute,.txt,.hlsl"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            id="btn-recompile"
            onClick={runLocalTranspilation}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded shadow-sm transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-compile</span>
          </button>

          <button
            id="btn-export-zip"
            onClick={handleExportZip}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#1E232B] hover:bg-[#282F3A] text-slate-300 text-xs font-medium rounded border border-[#2D343F] transition cursor-pointer"
          >
            <FileArchive className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export Unity ZIP</span>
          </button>
        </div>
      </div>

      {/* Compiler Settings Drawer */}
      <div className="bg-[#16181D] border border-[#23272F] rounded-lg p-4 text-xs text-slate-300">
        <div className="flex items-center justify-between mb-3 border-b border-[#23272F] pb-2.5">
          <div className="flex items-center space-x-2 font-medium text-slate-200">
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              {conversionMode === 'builtin_to_urp' 
                ? 'Built-in RP to URP Migration Parameters' 
                : 'Pipeline & Transpiler Target Settings'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-slate-400">SRP Batcher Status:</span>
            {transpileResult?.srpBatcherCompliant ? (
              <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> 100% SRP Batcher Compliant
              </span>
            ) : (
              <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                <Info className="w-3 h-3" /> Constant Buffer Optimized
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Target Pipeline */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Target Pipeline</label>
            <select
              value={targetPipeline}
              onChange={(e) => setTargetPipeline(e.target.value as TargetPipeline)}
              className="w-full bg-[#0A0C0E] text-slate-200 rounded px-2.5 py-1.5 border border-[#2D343F] focus:outline-none focus:border-indigo-500 font-mono text-xs cursor-pointer"
            >
              <option value="urp">Universal RP (URP)</option>
              <option value="hdrp">High Definition RP (HDRP)</option>
              <option value="shadergraph">Shader Graph Node (.hlsl)</option>
              <option value="srp_core">SRP Core Common</option>
              <option value="compute">Compute Shader (.compute)</option>
            </select>
          </div>

          {/* Unity Version */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Unity Version</label>
            <select
              value={unityVersion}
              onChange={(e) => setUnityVersion(e.target.value as UnityVersion)}
              className="w-full bg-[#0A0C0E] text-slate-200 rounded px-2.5 py-1.5 border border-[#2D343F] focus:outline-none focus:border-indigo-500 font-mono text-xs cursor-pointer"
            >
              <option value="6000">Unity 6 (6000 LTS)</option>
              <option value="2023">Unity 2023.3</option>
              <option value="2022">Unity 2022.3 LTS</option>
            </select>
          </div>

          {/* Surface Mode */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Surface Mode</label>
            <select
              value={surfaceType}
              onChange={(e) => setSurfaceType(e.target.value as SurfaceType)}
              className="w-full bg-[#0A0C0E] text-slate-200 rounded px-2.5 py-1.5 border border-[#2D343F] focus:outline-none focus:border-indigo-500 font-mono text-xs cursor-pointer"
            >
              <option value="unlit">Unlit Opaque</option>
              <option value="lit_pbr">Lit (PBR / GGX)</option>
              <option value="transparent">Transparent (Alpha)</option>
              <option value="additive">Additive Blend</option>
              <option value="alphatest">Alpha-Test Cutout</option>
            </select>
          </div>

          {/* Shader Name */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">ShaderLab Path</label>
            <input
              type="text"
              value={customShaderName}
              onChange={(e) => setCustomShaderName(e.target.value)}
              placeholder="Custom/MigratedURPShader"
              className="w-full bg-[#0A0C0E] text-slate-200 rounded px-2.5 py-1.5 border border-[#2D343F] focus:outline-none focus:border-indigo-500 font-mono text-xs"
            />
          </div>

          {/* SRP Batcher Toggle */}
          <div className="flex items-center pt-5">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={srpBatcher}
                onChange={(e) => setSrpBatcher(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-[#0A0C0E] border-[#2D343F] text-indigo-600 focus:ring-0 cursor-pointer"
              />
              <span className="text-[11px] text-slate-300 font-medium">SRP Batcher (CBUFFER)</span>
            </label>
          </div>

          {/* Built-in specific toggles or sampler toggle */}
          {conversionMode === 'builtin_to_urp' ? (
            <div className="flex items-center pt-5">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remapLegacyTextureNames}
                  onChange={(e) => setRemapLegacyTextureNames(e.target.checked)}
                  className="w-3.5 h-3.5 rounded bg-[#0A0C0E] border-[#2D343F] text-indigo-600 focus:ring-0 cursor-pointer"
                />
                <span className="text-[11px] text-slate-300 font-medium">_MainTex ➔ _BaseMap</span>
              </label>
            </div>
          ) : (
            <div className="flex items-center pt-5">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={samplerSeparation}
                  onChange={(e) => setSamplerSeparation(e.target.checked)}
                  className="w-3.5 h-3.5 rounded bg-[#0A0C0E] border-[#2D343F] text-indigo-600 focus:ring-0 cursor-pointer"
                />
                <span className="text-[11px] text-slate-300 font-medium">Texture2D + Sampler</span>
              </label>
            </div>
          )}
        </div>

        {/* Additional Built-in RP to URP Quick Toggles */}
        {conversionMode === 'builtin_to_urp' && (
          <div className="mt-3 pt-3 border-t border-[#23272F] flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
            <span className="font-semibold text-indigo-300 flex items-center gap-1">
              <Zap className="w-3 h-3 text-indigo-400" /> URP Auto-Fixes:
            </span>
            <label className="flex items-center space-x-1.5 cursor-pointer hover:text-slate-200">
              <input
                type="checkbox"
                checked={convertFogMacros}
                onChange={(e) => setConvertFogMacros(e.target.checked)}
                className="w-3 h-3 rounded bg-[#0A0C0E] border-[#2D343F] text-indigo-600 focus:ring-0 cursor-pointer"
              />
              <span>Migrate Legacy Fog Macros (UNITY_TRANSFER_FOG ➔ MixFog)</span>
            </label>
            <label className="flex items-center space-x-1.5 cursor-pointer hover:text-slate-200">
              <input
                type="checkbox"
                checked={generateShadowCaster}
                onChange={(e) => setGenerateShadowCaster(e.target.checked)}
                className="w-3 h-3 rounded bg-[#0A0C0E] border-[#2D343F] text-indigo-600 focus:ring-0 cursor-pointer"
              />
              <span>Auto-Inject ShadowCaster Pass</span>
            </label>
          </div>
        )}
      </div>

      {/* Academic Citation Banner (if preset is selected and has academic citation) */}
      {activePreset?.academicCitation && (
        <div className="bg-[#121620] border border-indigo-500/25 rounded-lg p-3.5 text-xs text-slate-200 flex items-start justify-between gap-3">
          <div className="flex items-start space-x-2.5">
            <GraduationCap className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-indigo-300">
                  Academic Citation & Shader Theory:
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {activePreset.academicCitation.year} &bull; {activePreset.academicCitation.venue}
                </span>
              </div>
              <p className="text-slate-300 font-medium text-[11px]">
                &ldquo;{activePreset.academicCitation.paperTitle}&rdquo; &mdash; <span className="text-slate-400">{activePreset.academicCitation.authors}</span>
              </p>
            </div>
          </div>
          {activePreset.academicCitation.url && (
            <a
              href={activePreset.academicCitation.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#1A1E27] hover:bg-[#232735] text-indigo-300 border border-indigo-500/30 text-[11px] font-medium transition cursor-pointer flex-shrink-0"
            >
              <span>View Paper</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="bg-[#1C1418] border border-rose-500/30 rounded-lg p-3 text-xs text-rose-300 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Dual Editor Area (Source <-> Unity Target HLSL) */}
      <div className={`grid gap-4 items-stretch ${
        layoutMode === 'split' ? 'grid-cols-1 lg:grid-cols-2' :
        layoutMode === 'wide' ? 'grid-cols-1 lg:grid-cols-12' :
        'grid-cols-1'
      }`}>
        
        {/* LEFT: Source Code Editor with Line Numbers and Highlighting */}
        <div className={`flex flex-col bg-[#16181D] border border-[#23272F] rounded-lg overflow-hidden shadow-sm ${
          layoutMode === 'full' ? 'hidden' :
          layoutMode === 'wide' ? 'lg:col-span-4' :
          ''
        }`}>
          <SourceCodeEditor
            code={sourceCode}
            onChange={setSourceCode}
            title={conversionMode === 'builtin_to_urp' 
              ? 'Source: Unity Built-in RP' 
              : 'Source: OpenGL / GLSL'}
            placeholder={conversionMode === 'builtin_to_urp'
              ? '// Paste your Unity Built-in ShaderLab / CGPROGRAM / Surface Shader code here...'
              : '// Paste your OpenGL / GLSL code block here...'}
          />
        </div>

        {/* RIGHT: Converted Unity Shader & Diagnostics */}
        <div className={`flex flex-col bg-[#16181D] border border-[#23272F] rounded-lg overflow-hidden shadow-sm min-w-0 ${
          layoutMode === 'full' ? 'w-full' :
          layoutMode === 'wide' ? 'lg:col-span-8' :
          ''
        }`}>
          
          {/* Header with Navigation Tabs & Layout Switches */}
          <div className="bg-[#1A1D21] px-3 py-1.5 border-b border-[#23272F] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none py-0.5">
              <button
                id="view-tab-code"
                onClick={() => setViewMode('code')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                  viewMode === 'code'
                    ? 'bg-indigo-600/15 text-indigo-300 font-semibold border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Target {targetPipeline.toUpperCase()} HLSL
              </button>

              <button
                id="view-tab-performance"
                onClick={() => setViewMode('performance')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  viewMode === 'performance'
                    ? 'bg-indigo-600/15 text-indigo-300 font-semibold border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Gauge className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>SRP & Profiler</span>
                <span className={`px-1.5 py-0.2 text-[10px] rounded font-mono font-bold shrink-0 ${
                  (transpileResult?.performance?.srpBatcher.score || 0) >= 80 
                    ? 'bg-emerald-500/20 text-emerald-300' 
                    : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {transpileResult?.performance?.srpBatcher.score || 0}%
                </span>
              </button>

              <button
                id="view-tab-properties"
                onClick={() => setViewMode('properties')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                  viewMode === 'properties'
                    ? 'bg-indigo-600/15 text-indigo-300 font-semibold border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Properties</span>
                <span className="px-1.5 py-0.2 bg-[#121418] text-[10px] rounded text-slate-400">
                  {transpileResult?.properties.length || 0}
                </span>
              </button>

              <button
                id="view-tab-annotations"
                onClick={() => setViewMode('annotations')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                  viewMode === 'annotations'
                    ? 'bg-indigo-600/15 text-indigo-300 font-semibold border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Conversions</span>
                <span className="px-1.5 py-0.2 bg-[#121418] text-[10px] rounded text-slate-400">
                  {transpileResult?.annotations.length || 0}
                </span>
              </button>
            </div>

            {/* Actions: Layout Controls + Copy + Format + Download */}
            <div className="flex items-center space-x-1.5 shrink-0">
              
              {/* Layout Width Toggles */}
              <div className="hidden sm:inline-flex items-center bg-[#0E1013] border border-[#23272F] rounded p-0.5 mr-1" title="Adjust Editor Widths">
                <button
                  id="btn-layout-split"
                  onClick={() => setLayoutMode('split')}
                  className={`p-1 rounded text-xs transition cursor-pointer ${
                    layoutMode === 'split' ? 'bg-indigo-600/30 text-indigo-300' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="50/50 Dual Split"
                >
                  <Columns className="w-3.5 h-3.5" />
                </button>
                <button
                  id="btn-layout-wide"
                  onClick={() => setLayoutMode('wide')}
                  className={`p-1 rounded text-xs transition cursor-pointer ${
                    layoutMode === 'wide' ? 'bg-indigo-600/30 text-indigo-300' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Wide Target (65% width)"
                >
                  <Sidebar className="w-3.5 h-3.5 rotate-180" />
                </button>
                <button
                  id="btn-layout-full"
                  onClick={() => setLayoutMode('full')}
                  className={`p-1 rounded text-xs transition cursor-pointer ${
                    layoutMode === 'full' ? 'bg-indigo-600/30 text-indigo-300' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Maximize Target (100% full width)"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                id="btn-format-converted-code"
                onClick={handleFormatConvertedCode}
                className="flex items-center space-x-1 px-2 py-1 bg-[#1E232B] hover:bg-[#282F3A] text-slate-300 text-xs font-medium rounded border border-[#2D343F] transition cursor-pointer"
                title="Format HLSL code with Unity standard indentation & naming conventions"
              >
                {formattedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <AlignLeft className="w-3.5 h-3.5 text-indigo-400" />}
                <span className="hidden md:inline">{formattedSuccess ? 'Formatted' : 'Format'}</span>
              </button>

              <button
                id="btn-copy-code"
                onClick={handleCopyCode}
                className="flex items-center space-x-1 px-2 py-1 bg-[#1E232B] hover:bg-[#282F3A] text-slate-300 text-xs font-medium rounded border border-[#2D343F] transition cursor-pointer"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                id="btn-download-file"
                onClick={handleDownloadFile}
                className="flex items-center space-x-1 px-2 py-1 bg-[#1E232B] hover:bg-[#282F3A] text-slate-300 text-xs font-medium rounded border border-[#2D343F] transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </button>
            </div>
          </div>

          {/* Body Content based on View Mode */}
          <div className="relative flex-1 min-h-[460px] overflow-hidden bg-[#0A0C0E]">
            {viewMode === 'code' && (
              <HLSLCodeViewer 
                code={transpileResult?.convertedCode || '// Compiling...'} 
              />
            )}

            {/* Performance Impact & SRP Batcher Estimation View */}
            {viewMode === 'performance' && (
              <div className="p-4 bg-[#0A0C0E]">
                <PerformanceImpactEstimator
                  estimation={transpileResult?.performance}
                  hlslCode={transpileResult?.convertedCode || ''}
                  isEmbedded={true}
                />
              </div>
            )}

            {/* Properties View */}
            {viewMode === 'properties' && (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-medium text-slate-200">Extracted Material Properties & SRP CBUFFER</span>
                  <span>{transpileResult?.properties.length} properties detected</span>
                </div>

                {transpileResult?.properties.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No uniform parameters found in GLSL code.</p>
                ) : (
                  <div className="border border-[#23272F] rounded overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#1A1D21] text-slate-400 border-b border-[#23272F]">
                        <tr>
                          <th className="px-3 py-2">ShaderLab Property</th>
                          <th className="px-3 py-2">GLSL Uniform</th>
                          <th className="px-3 py-2">Type</th>
                          <th className="px-3 py-2">Default</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#23272F] font-mono text-slate-300 bg-[#0A0C0E]">
                        {transpileResult?.properties.map((prop, idx) => (
                          <tr key={idx} className="hover:bg-[#121418]">
                            <td className="px-3 py-2 text-indigo-300 font-medium">{prop.name}</td>
                            <td className="px-3 py-2 text-slate-400">{prop.glslName}</td>
                            <td className="px-3 py-2 text-slate-300">{prop.type}</td>
                            <td className="px-3 py-2 text-emerald-400">{prop.defaultValue}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Generated CBuffer Snippet */}
                <div className="mt-4">
                  <div className="text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Generated Constant Buffer Block (UnityPerMaterial):</span>
                  </div>
                  <pre className="bg-[#121418] border border-[#23272F] rounded p-3 text-xs font-mono text-emerald-300 overflow-x-auto">
                    {transpileResult?.cbufferCode}
                  </pre>
                </div>
              </div>
            )}

            {/* Annotations View */}
            {viewMode === 'annotations' && (
              <div className="p-4 space-y-3">
                <div className="text-xs font-medium text-slate-200 mb-2">
                  Transformation Log & AST Migration Breakdown ({transpileResult?.annotations.length} operations)
                </div>

                <div className="space-y-2">
                  {transpileResult?.annotations.map((ann, idx) => (
                    <div key={idx} className="bg-[#121418] border border-[#23272F] rounded p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 font-mono">
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[11px]">{ann.from}</span>
                          <span className="text-slate-500">➔</span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[11px] font-medium">{ann.to}</span>
                        </div>
                        <span className="text-[10px] uppercase font-medium text-slate-400 px-1.5 py-0.5 bg-[#1A1D21] rounded">
                          {ann.category}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] pt-1">{ann.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
