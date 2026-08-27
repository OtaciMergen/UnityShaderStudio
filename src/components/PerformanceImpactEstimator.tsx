import React, { useState, useRef, useEffect } from 'react';
import {
  Zap,
  Layers,
  Cpu,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  TrendingDown,
  Clock,
  HardDrive,
  Flame,
  ArrowRight,
  Sparkles,
  Info,
  Sliders,
  Copy,
  Check,
  FileCode,
  Smartphone,
  Monitor,
  Upload,
  FileUp,
  RotateCcw,
  AlignLeft,
  Trash2,
  Code2,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';
import { PerformanceEstimation } from '../types';
import { estimateShaderPerformance } from '../lib/performanceEstimator';
import { formatUnityHlsl } from '../lib/shaderFormatter';

interface PerformanceImpactEstimatorProps {
  estimation?: PerformanceEstimation;
  hlslCode?: string;
  onApplyOptimization?: (optimizedCode: string) => void;
  isEmbedded?: boolean;
}

const PERFORMANCE_TEST_PRESETS = [
  {
    name: 'URP Lit (SRP Batch Ready - 100% Score)',
    description: 'Perfect CBUFFER_START(UnityPerMaterial) encapsulation, 0 loose uniforms, local shader_features.',
    code: `Shader "Custom/URP_PerformanceLit"
{
    Properties
    {
        _BaseMap ("Albedo", 2D) = "white" {}
        _BaseColor ("Color", Color) = (1, 1, 1, 1)
        _Metallic ("Metallic", Range(0, 1)) = 0.5
        _Smoothness ("Smoothness", Range(0, 1)) = 0.5
    }
    SubShader
    {
        Tags { "RenderType" = "Opaque" "RenderPipeline" = "UniversalPipeline" }
        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode" = "UniversalForward" }
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile_local _ _ALPHATEST_ON
            #pragma multi_compile_fragment _ _MAIN_LIGHT_SHADOWS
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            struct Attributes
            {
                float4 positionOS : POSITION;
                float2 uv : TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float2 uv : TEXCOORD0;
            };

            Texture2D _BaseMap;
            SamplerState sampler_BaseMap;

            CBUFFER_START(UnityPerMaterial)
                float4 _BaseMap_ST;
                half4 _BaseColor;
                half _Metallic;
                half _Smoothness;
            CBUFFER_END

            Varyings vert(Attributes input)
            {
                Varyings output;
                output.positionCS = TransformObjectToHClip(input.positionOS.xyz);
                output.uv = input.uv * _BaseMap_ST.xy + _BaseMap_ST.zw;
                return output;
            }

            half4 frag(Varyings input) : SV_Target
            {
                half4 col = _BaseMap.Sample(sampler_BaseMap, input.uv) * _BaseColor;
                return col;
            }
            ENDHLSL
        }
    }
}`,
  },
  {
    name: 'Legacy Shader (Loose Uniforms & Non-SRP - 45% Score)',
    description: 'Contains loose uniforms outside constant buffers, causing frequent GPU constant buffer swaps.',
    code: `Shader "Legacy/HeavyUnbatchedShader"
{
    Properties
    {
        _MainTex ("Texture", 2D) = "white" {}
        _Color ("Tint", Color) = (1, 1, 1, 1)
        _SpecColor ("Specular", Color) = (1, 1, 1, 1)
        _Emission ("Emission", Color) = (0, 0, 0, 0)
    }
    SubShader
    {
        Tags { "RenderType" = "Opaque" }
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            #include "UnityCG.cginc"

            sampler2D _MainTex;
            // Loose unbuffered uniforms break SRP Batcher!
            float4 _Color;
            float4 _SpecColor;
            float4 _Emission;
            float _Glossiness;
            float _ReflectionStrength;

            struct v2f {
                float4 pos : SV_POSITION;
                float2 uv : TEXCOORD0;
            };

            v2f vert(appdata_base v) {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                o.uv = v.texcoord;
                return o;
            }

            float4 frag(v2f i) : SV_Target {
                float4 col = tex2D(_MainTex, i.uv) * _Color;
                return col;
            }
            ENDCG
        }
    }
}`,
  },
  {
    name: 'Multi-Compile Variant Explosion (High Risk)',
    description: 'Multiple global #pragma multi_compile directives causing combinatorial permutation explosion.',
    code: `Shader "Custom/VariantExplosionTest"
{
    Properties
    {
        _BaseMap ("Texture", 2D) = "white" {}
        _Color ("Color", Color) = (1, 1, 1, 1)
    }
    SubShader
    {
        Tags { "RenderType" = "Opaque" "RenderPipeline" = "UniversalPipeline" }
        Pass
        {
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            // 5 multi_compile directives = 2^5 = 32 raw variants in pass
            #pragma multi_compile _ SHADOWS_SCREEN SHADOWS_DEPTH
            #pragma multi_compile _ LIGHTMAP_ON DYNAMICLIGHTMAP_ON
            #pragma multi_compile _ DIRLIGHTMAP_COMBINED
            #pragma multi_compile _ FOG_LINEAR FOG_EXP FOG_EXP2
            #pragma multi_compile _ VERTEXLIGHT_ON
            #pragma multi_compile _ _ADDITIONAL_LIGHTS_VERTEX _ADDITIONAL_LIGHTS

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            Texture2D _BaseMap;
            SamplerState sampler_BaseMap;

            CBUFFER_START(UnityPerMaterial)
                float4 _Color;
            CBUFFER_END

            struct Attributes { float4 pos : POSITION; float2 uv : TEXCOORD0; };
            struct Varyings { float4 posCS : SV_POSITION; float2 uv : TEXCOORD0; };

            Varyings vert(Attributes v) {
                Varyings o;
                o.posCS = TransformObjectToHClip(v.pos.xyz);
                o.uv = v.uv;
                return o;
            }

            half4 frag(Varyings i) : SV_Target {
                return _BaseMap.Sample(sampler_BaseMap, i.uv) * (half4)_Color;
            }
            ENDHLSL
        }
    }
}`,
  },
  {
    name: 'Mobile Fast Half Precision (95% FP16)',
    description: 'Heavily optimized for mobile GPUs with half4 / half precision registers and low ALU count.',
    code: `Shader "Mobile/FastFP16Opaque"
{
    Properties
    {
        _MainTex ("Albedo", 2D) = "white" {}
        _TintColor ("Tint", Color) = (1, 1, 1, 1)
    }
    SubShader
    {
        Tags { "RenderType" = "Opaque" "RenderPipeline" = "UniversalPipeline" }
        Pass
        {
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma shader_feature_local _FADE_ON

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            Texture2D _MainTex;
            SamplerState sampler_MainTex;

            CBUFFER_START(UnityPerMaterial)
                half4 _TintColor;
                float4 _MainTex_ST;
            CBUFFER_END

            struct Attributes {
                float4 positionOS : POSITION;
                float2 uv : TEXCOORD0;
            };

            struct Varyings {
                float4 positionCS : SV_POSITION;
                half2 uv : TEXCOORD0;
            };

            Varyings vert(Attributes v) {
                Varyings o;
                o.positionCS = TransformObjectToHClip(v.positionOS.xyz);
                o.uv = (half2)(v.uv * _MainTex_ST.xy + _MainTex_ST.zw);
                return o;
            }

            half4 frag(Varyings i) : SV_Target {
                half4 albedo = _MainTex.Sample(sampler_MainTex, i.uv);
                return albedo * _TintColor;
            }
            ENDHLSL
        }
    }
}`,
  }
];

export const PerformanceImpactEstimator: React.FC<PerformanceImpactEstimatorProps> = ({
  estimation: initialEstimation,
  hlslCode = '',
  onApplyOptimization,
  isEmbedded = false,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'srp' | 'variants' | 'gpu' | 'recommendations'>('srp');
  const [customHlsl, setCustomHlsl] = useState<string>(hlslCode || PERFORMANCE_TEST_PRESETS[0].code);
  const [simulatedPlatform, setSimulatedPlatform] = useState<'mobile' | 'desktop' | 'console'>('mobile');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [isCodeWindowOpen, setIsCodeWindowOpen] = useState<boolean>(!isEmbedded);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [formatSuccess, setFormatSuccess] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with prop when hlslCode updates from parent workbench
  useEffect(() => {
    if (hlslCode && hlslCode.trim() !== '') {
      setCustomHlsl(hlslCode);
      setUploadedFileName(null);
    }
  }, [hlslCode]);

  // Compute live estimation from active custom shader code
  const currentEstimation: PerformanceEstimation = estimateShaderPerformance(customHlsl);

  const { srpBatcher, variants, gpuMetrics, recommendations } = currentEstimation;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  // Format code in the performance editor
  const handleFormatCode = () => {
    try {
      const formatted = formatUnityHlsl(customHlsl, { indentSize: 4 });
      setCustomHlsl(formatted);
      setFormatSuccess(true);
      setTimeout(() => setFormatSuccess(false), 2000);
    } catch (e) {
      console.error('Format failed:', e);
    }
  };

  // Handle file upload
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setCustomHlsl(content);
        setUploadedFileName(file.name);
      }
    };
    reader.readAsText(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Color helpers
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 60) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'minimal':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Minimal Risk</span>;
      case 'moderate':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20">Moderate Risk</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">High Build Risk</span>;
      case 'critical':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">Combinatorial Explosion Risk</span>;
      default:
        return null;
    }
  };

  const getThermalBadge = (thermal: string) => {
    switch (thermal) {
      case 'very_low':
      case 'low':
        return <span className="text-emerald-400 font-semibold flex items-center gap-1"><Flame className="w-3.5 h-3.5 text-emerald-400" /> Cool (60-120 FPS Target)</span>;
      case 'moderate':
        return <span className="text-amber-400 font-semibold flex items-center gap-1"><Flame className="w-3.5 h-3.5 text-amber-400" /> Balanced Load</span>;
      case 'high':
      case 'extreme':
        return <span className="text-rose-400 font-semibold flex items-center gap-1"><Flame className="w-3.5 h-3.5 text-rose-400" /> Heavy / Thermal Throttling Risk</span>;
      default:
        return null;
    }
  };

  const lineCount = customHlsl ? customHlsl.split('\n').length : 0;
  const byteSize = customHlsl ? new Blob([customHlsl]).size : 0;

  return (
    <div className={`space-y-4 min-w-0 ${isEmbedded ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'}`}>
      
      {/* SECTION 1: Interactive Code Window & Upload Toolbar (Collapsible / Mini in Embedded Mode) */}
      {!isEmbedded ? (
        <div className="bg-[#16181D] border border-[#23272F] rounded-lg overflow-hidden shadow-sm">
          <div className="bg-[#1A1D21] px-4 py-3 border-b border-[#23272F] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <div className="p-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Code2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-200">Shader Code & Performance Profiling Sandbox</span>
                <span className="ml-2 text-[11px] font-mono text-slate-400">
                  {uploadedFileName ? (
                    <span className="text-indigo-300 font-medium bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                      File: {uploadedFileName}
                    </span>
                  ) : (
                    <span>{lineCount} lines ({Math.round(byteSize / 10.24) / 100} KB)</span>
                  )}
                </span>
              </div>
            </div>

            {/* Action Buttons & Presets */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                accept=".shader,.hlsl,.glsl,.frag,.vert,.cginc,.txt"
                className="hidden"
              />

              {/* Upload Button */}
              <button
                id="btn-upload-perf-shader"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-1.5 px-2.5 py-1 bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 border border-indigo-500/30 rounded text-xs font-medium transition cursor-pointer"
                title="Upload shader file (.shader, .hlsl, .glsl, .cginc)"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Shader</span>
              </button>

              {/* Format Code Button */}
              <button
                id="btn-format-perf-code"
                onClick={handleFormatCode}
                className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#1E232B] hover:bg-[#282F3A] text-slate-300 border border-[#2D343F] rounded text-xs font-medium transition cursor-pointer"
                title="Format HLSL code to Unity conventions"
              >
                {formatSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <AlignLeft className="w-3.5 h-3.5" />}
                <span>{formatSuccess ? 'Formatted' : 'Format Code'}</span>
              </button>

              {/* Preset Selector */}
              <select
                id="select-perf-preset"
                onChange={(e) => {
                  const selected = PERFORMANCE_TEST_PRESETS.find(p => p.name === e.target.value);
                  if (selected) {
                    setCustomHlsl(selected.code);
                    setUploadedFileName(null);
                  }
                }}
                className="px-2 py-1 bg-[#0E1013] border border-[#23272F] text-slate-300 rounded text-xs focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                defaultValue=""
              >
                <option value="" disabled>Load Preset Shader...</option>
                {PERFORMANCE_TEST_PRESETS.map((p, idx) => (
                  <option key={idx} value={p.name}>{p.name}</option>
                ))}
              </select>

              {/* Reset to Default */}
              {hlslCode && hlslCode !== customHlsl && (
                <button
                  id="btn-reset-workbench-code"
                  onClick={() => {
                    setCustomHlsl(hlslCode);
                    setUploadedFileName(null);
                  }}
                  className="flex items-center space-x-1 px-2 py-1 bg-[#1E232B] hover:bg-[#282F3A] text-slate-300 border border-[#2D343F] rounded text-xs transition cursor-pointer"
                  title="Reset to Transpiled Workbench HLSL"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              )}

              {/* Clear Button */}
              <button
                id="btn-clear-perf-code"
                onClick={() => {
                  setCustomHlsl('');
                  setUploadedFileName(null);
                }}
                className="p-1 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                title="Clear code window"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {/* Collapse/Expand Toggle */}
              <button
                id="btn-toggle-code-window"
                onClick={() => setIsCodeWindowOpen(!isCodeWindowOpen)}
                className="flex items-center space-x-1 px-2 py-1 bg-[#1E232B] hover:bg-[#282F3A] text-slate-400 hover:text-slate-200 border border-[#2D343F] rounded text-xs transition cursor-pointer"
              >
                {isCodeWindowOpen ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Hide Editor</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Show Editor</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Collapsible Textarea / Code Window */}
          {isCodeWindowOpen && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={handleDrop}
              className={`relative transition-colors ${
                isDraggingOver ? 'bg-indigo-950/20 border-2 border-dashed border-indigo-500' : 'bg-[#0A0C0E]'
              }`}
            >
              {isDraggingOver && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0C0E]/90 z-10 pointer-events-none">
                  <FileUp className="w-10 h-10 text-indigo-400 animate-bounce mb-2" />
                  <span className="text-sm font-semibold text-slate-200">Drop Shader File Here to Profile</span>
                  <span className="text-xs text-slate-400 mt-1">Supports .shader, .hlsl, .glsl, .cginc</span>
                </div>
              )}

              <textarea
                id="perf-hlsl-editor-textarea"
                value={customHlsl}
                onChange={(e) => {
                  setCustomHlsl(e.target.value);
                  setUploadedFileName(null);
                }}
                placeholder="// Paste, type, or upload any Unity HLSL / ShaderLab code here to instantly test SRP Batcher compliance, variants, and GPU metrics..."
                spellCheck={false}
                className="w-full h-56 p-4 bg-[#0A0C0E] text-slate-200 font-mono text-xs leading-relaxed resize-y focus:outline-none focus:ring-1 focus:ring-indigo-500/50 selection:bg-indigo-500/30"
              />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[#121620] border border-indigo-500/25 rounded-lg px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-slate-200">Live Static Profile</span>
            <span className="text-slate-400 text-[11px] font-mono">({lineCount} lines HLSL analyzed)</span>
          </div>
          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
            <span className="px-1.5 py-0.5 rounded bg-[#1A1D21] border border-[#2D343F] text-indigo-300 font-mono">
              UnityPerMaterial: {srpBatcher.cbufferSize}B
            </span>
            <span className="px-1.5 py-0.5 rounded bg-[#1A1D21] border border-[#2D343F] text-emerald-300 font-mono">
              FP16: {gpuMetrics.precisionFP16Percent}%
            </span>
          </div>
        </div>
      )}

      {/* SECTION 2: Top Level Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
        
        {/* CARD 1: SRP Batcher Score */}
        <div className="bg-[#16181D] border border-[#23272F] rounded-lg p-3.5 relative overflow-hidden shadow-sm flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 min-w-0">
              <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-200 truncate">SRP Batcher</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold border shrink-0 ${getScoreColor(srpBatcher.score)}`}>
              {srpBatcher.score} / 100
            </span>
          </div>

          <div className="my-2.5 flex flex-wrap items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-slate-100 font-mono">
              {srpBatcher.isCompatible ? 'Batch Ready' : 'Incompatible'}
            </span>
            <span className="text-[11px] text-slate-400 truncate">
              {srpBatcher.passesBatchable}/{srpBatcher.totalPasses} Passes Batchable
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-[#0A0C0E] rounded-full h-1.5 overflow-hidden border border-[#23272F]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                srpBatcher.score >= 85 ? 'bg-emerald-500' : srpBatcher.score >= 60 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${srpBatcher.score}%` }}
            />
          </div>

          <div className="mt-2.5 text-[11px] text-slate-400 flex items-center justify-between gap-2">
            <span className="truncate">Draw Call Overhead:</span>
            <span className="text-emerald-400 font-medium shrink-0">{srpBatcher.estimatedDrawCallReduction}</span>
          </div>
        </div>

        {/* CARD 2: Shader Variants Multiplier */}
        <div className="bg-[#16181D] border border-[#23272F] rounded-lg p-3.5 relative overflow-hidden shadow-sm flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 min-w-0">
              <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-200 truncate">Shader Variants</span>
            </div>
            {getRiskBadge(variants.riskLevel)}
          </div>

          <div className="my-2.5 flex flex-wrap items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-bold text-slate-100 font-mono">
              {variants.totalRawVariants.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-400 truncate">
              Raw Combos (~{variants.estimatedPlayerBuildVariants} in Build)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#0E1013] p-1.5 rounded border border-[#23272F]">
            <div className="flex items-center justify-between text-slate-400 min-w-0">
              <span className="truncate">RAM:</span>
              <span className="text-slate-200 font-mono font-medium shrink-0">~{variants.memoryFootprintKb}KB</span>
            </div>
            <div className="flex items-center justify-between text-slate-400 min-w-0">
              <span className="truncate">Compile:</span>
              <span className="text-slate-200 font-mono font-medium shrink-0">~{variants.estimatedCompileTimeSec}s</span>
            </div>
          </div>

          <div className="mt-2.5 text-[11px] text-slate-400 flex items-center justify-between gap-2">
            <span className="truncate">Active Keywords:</span>
            <span className="text-indigo-300 font-mono shrink-0">{variants.keywordsCount}</span>
          </div>
        </div>

        {/* CARD 3: GPU ALU & Mobile Precision */}
        <div className="bg-[#16181D] border border-[#23272F] rounded-lg p-3.5 relative overflow-hidden shadow-sm flex flex-col justify-between min-w-0 sm:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 min-w-0">
              <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                <Cpu className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-200 truncate">GPU Load & FP16</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono font-medium shrink-0">
              ALU:TEX {gpuMetrics.aluToTexRatio}:1
            </span>
          </div>

          <div className="my-2.5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-xl sm:text-2xl font-bold text-slate-100 font-mono">
                ~{gpuMetrics.estimatedFragmentAlu}
              </span>
              <span className="text-[11px] text-slate-400 ml-1">Frag ALU</span>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-mono text-emerald-400 font-bold">
                {gpuMetrics.precisionFP16Percent}% FP16
              </span>
            </div>
          </div>

          {/* Half vs Float precision bar */}
          <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full"
              style={{ width: `${gpuMetrics.precisionFP16Percent}%` }}
              title={`FP16 Half: ${gpuMetrics.precisionFP16Percent}%`}
            />
            <div
              className="bg-sky-500 h-full"
              style={{ width: `${gpuMetrics.precisionFP32Percent}%` }}
              title={`FP32 Float: ${gpuMetrics.precisionFP32Percent}%`}
            />
          </div>

          <div className="mt-2.5 text-[11px] text-slate-400 flex items-center justify-between gap-2">
            <span className="truncate">Mobile Thermal:</span>
            <div className="shrink-0">{getThermalBadge(gpuMetrics.thermalImpactMobile)}</div>
          </div>
        </div>

      </div>

      {/* SECTION 3: Sub-Navigation Tabs */}
      <div className="bg-[#16181D] border border-[#23272F] rounded-lg p-1 flex flex-wrap sm:flex-nowrap items-center gap-1 text-xs font-medium overflow-x-auto scrollbar-none">
        <button
          id="btn-subtab-srp"
          onClick={() => setActiveSubTab('srp')}
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded transition cursor-pointer whitespace-nowrap ${
            activeSubTab === 'srp'
              ? 'bg-indigo-600 text-white shadow-sm font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E232B]'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span>SRP Batcher & CBUFFER</span>
          <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded font-mono ${srpBatcher.isCompatible ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
            {srpBatcher.score}%
          </span>
        </button>

        <button
          id="btn-subtab-variants"
          onClick={() => setActiveSubTab('variants')}
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded transition cursor-pointer whitespace-nowrap ${
            activeSubTab === 'variants'
              ? 'bg-indigo-600 text-white shadow-sm font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E232B]'
          }`}
        >
          <Layers className="w-3.5 h-3.5 shrink-0" />
          <span>Variants Matrix</span>
          <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">
            {variants.totalRawVariants}
          </span>
        </button>

        <button
          id="btn-subtab-gpu"
          onClick={() => setActiveSubTab('gpu')}
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded transition cursor-pointer whitespace-nowrap ${
            activeSubTab === 'gpu'
              ? 'bg-indigo-600 text-white shadow-sm font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E232B]'
          }`}
        >
          <Cpu className="w-3.5 h-3.5 shrink-0" />
          <span>GPU Hardware Profiler</span>
        </button>

        <button
          id="btn-subtab-recommendations"
          onClick={() => setActiveSubTab('recommendations')}
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded transition cursor-pointer whitespace-nowrap ${
            activeSubTab === 'recommendations'
              ? 'bg-indigo-600 text-white shadow-sm font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E232B]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Optimizations</span>
          {recommendations.length > 0 && (
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
              {recommendations.length}
            </span>
          )}
        </button>
      </div>

      {/* SUB-TAB 1: SRP Batcher Deep Checklist & CBUFFER Memory Layout */}
      {activeSubTab === 'srp' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          
          {/* Left Column: Checklist of Passing/Failing Criteria */}
          <div className="xl:col-span-2 bg-[#16181D] border border-[#23272F] rounded-lg p-4 space-y-3 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#23272F] pb-3">
              <div>
                <h3 className="text-xs sm:text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                  SRP Batcher Compatibility Checklist
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Unity SRP Batcher requires strict constant buffer encapsulation to persist material state in VRAM.
                </p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-md font-mono font-bold shrink-0 ${getScoreColor(srpBatcher.score)}`}>
                Score: {srpBatcher.score} / 100
              </span>
            </div>

            <div className="space-y-2.5">
              {srpBatcher.checkItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border flex items-start space-x-2.5 transition-colors min-w-0 ${
                    item.passed
                      ? 'bg-[#0E1317] border-emerald-500/20'
                      : 'bg-[#181114] border-rose-500/20'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {item.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-slate-200 break-words">{item.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono uppercase shrink-0 ${
                        item.impact === 'high' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        item.impact === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-slate-700/30 text-slate-400'
                      }`}>
                        {item.impact} impact
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 break-words">{item.description}</p>
                    {item.recommendation && (
                      <div className="mt-2 text-[11px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded p-2 flex items-start gap-1.5 break-words">
                        <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                        <span><strong>Fix:</strong> {item.recommendation}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: CBUFFER Memory Packing Inspector */}
          <div className="bg-[#16181D] border border-[#23272F] rounded-lg p-4 space-y-3 flex flex-col justify-between min-w-0">
            <div>
              <div className="flex items-center justify-between border-b border-[#23272F] pb-3">
                <h3 className="text-xs sm:text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-purple-400 shrink-0" />
                  UnityPerMaterial Layout
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {srpBatcher.cbufferSize} Bytes
                </span>
              </div>

              <div className="mt-3 space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Packing Density:</span>
                  <span className="font-mono text-emerald-400 font-bold">{srpBatcher.packingEfficiency}%</span>
                </div>
                <div className="w-full bg-[#0A0C0E] rounded-full h-1.5 overflow-hidden border border-[#23272F]">
                  <div
                    className="bg-purple-500 h-full rounded-full"
                    style={{ width: `${srpBatcher.packingEfficiency}%` }}
                  />
                </div>

                <div className="bg-[#0E1013] border border-[#23272F] rounded-md p-2.5 text-xs space-y-1.5">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Total GPU Buffer:</span>
                    <span className="font-mono text-slate-200">{srpBatcher.cbufferSize} bytes</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Wasted Padding:</span>
                    <span className={`font-mono ${srpBatcher.cbufferAlignmentPadding > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {srpBatcher.cbufferAlignmentPadding} bytes
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Hardware Alignment:</span>
                    <span className="text-emerald-400 font-medium">16-Byte Boundary OK</span>
                  </div>
                </div>

                {srpBatcher.unbufferedVariables.length > 0 && (
                  <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-md">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-300">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>Loose Uniforms Found ({srpBatcher.unbufferedVariables.length})</span>
                    </div>
                    <ul className="mt-1 space-y-0.5 text-[11px] font-mono text-rose-200 list-disc list-inside break-words">
                      {srpBatcher.unbufferedVariables.map((v, i) => (
                        <li key={i}>{v}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="text-[11px] text-slate-400 bg-[#0A0C0E] p-2.5 rounded border border-[#23272F] mt-3">
              💡 <strong>SRP Batcher Rule:</strong> GameObjects sharing this shader render in a persistent GPU draw call without swapping constant buffers on the CPU.
            </div>
          </div>

        </div>
      )}

      {/* SUB-TAB 2: Shader Variants Explorer */}
      {activeSubTab === 'variants' && (
        <div className="space-y-4 min-w-0">
          
          {/* Variant Simulation Controls */}
          <div className="bg-[#16181D] border border-[#23272F] rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400 shrink-0" />
                Target Platform Stripping Simulator
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Build pipeline strips unneeded keywords and features per platform tier.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400">Platform:</span>
              <div className="inline-flex rounded-md bg-[#0A0C0E] p-0.5 border border-[#23272F]">
                <button
                  onClick={() => setSimulatedPlatform('mobile')}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
                    simulatedPlatform === 'mobile' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Smartphone className="w-3 h-3" />
                  <span>Mobile</span>
                </button>
                <button
                  onClick={() => setSimulatedPlatform('desktop')}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
                    simulatedPlatform === 'desktop' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Monitor className="w-3 h-3" />
                  <span>PC / Console</span>
                </button>
              </div>
            </div>
          </div>

          {/* Variants Grid Table */}
          <div className="bg-[#16181D] border border-[#23272F] rounded-lg overflow-hidden shadow-sm">
            <div className="bg-[#1A1D21] px-3.5 py-2.5 border-b border-[#23272F] flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">Pragma Directives & Keyword Permutations</span>
              <span className="text-xs font-mono text-purple-400">
                {variants.pragmas.length} Directives Detected
              </span>
            </div>

            {variants.pragmas.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto mb-2 opacity-80" />
                <p className="font-semibold text-slate-200">Zero #pragma multi_compile directives detected</p>
                <p className="text-[11px] mt-1 text-slate-400">This shader compiles as a clean, single-variant monolithic pass (0ms variant explosion risk).</p>
              </div>
            ) : (
              <div className="divide-y divide-[#23272F]">
                {variants.pragmas.map((pragma, idx) => (
                  <div key={idx} className="p-3.5 hover:bg-[#1C1F26] transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-slate-100 break-all">
                          {pragma.rawDirective}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono uppercase ${
                          pragma.type.includes('local') ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-sky-500/10 text-sky-300 border border-sky-500/20'
                        }`}>
                          {pragma.type}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono text-purple-300 font-semibold">
                          x{pragma.count} Variants
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {pragma.keywords.map((kw, kIdx) => (
                        <span
                          key={kIdx}
                          className="px-1.5 py-0.5 bg-[#0A0C0E] border border-[#23272F] rounded text-[10px] font-mono text-slate-300"
                        >
                          {kw === '_' ? '<default/off>' : kw}
                        </span>
                      ))}
                    </div>

                    {pragma.recommendation && (
                      <div className="mt-2 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded p-2 flex items-center justify-between break-words">
                        <span>💡 {pragma.recommendation}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Estimation Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
            <div className="bg-[#16181D] border border-[#23272F] rounded-lg p-3.5 min-w-0">
              <div className="text-xs text-slate-400">Total Raw Combinations:</div>
              <div className="text-lg sm:text-xl font-bold font-mono text-slate-100 mt-1">{variants.totalRawVariants.toLocaleString()} variants</div>
              <p className="text-[11px] text-slate-400 mt-1">Full Cartesian product in editor.</p>
            </div>
            <div className="bg-[#16181D] border border-[#23272F] rounded-lg p-3.5 min-w-0">
              <div className="text-xs text-slate-400">Player Build Variants:</div>
              <div className="text-lg sm:text-xl font-bold font-mono text-emerald-400 mt-1">
                ~{simulatedPlatform === 'mobile' ? variants.strippedVariantsMobile : variants.strippedVariantsDesktop} variants
              </div>
              <p className="text-[11px] text-slate-400 mt-1">After Unity build keyword stripping.</p>
            </div>
            <div className="bg-[#16181D] border border-[#23272F] rounded-lg p-3.5 min-w-0 sm:col-span-2 xl:col-span-1">
              <div className="text-xs text-slate-400">Binary Size Impact:</div>
              <div className="text-lg sm:text-xl font-bold font-mono text-purple-400 mt-1">~{variants.memoryFootprintKb} KB</div>
              <p className="text-[11px] text-slate-400 mt-1">Compiled binary footprint in VRAM.</p>
            </div>
          </div>

        </div>
      )}

      {/* SUB-TAB 3: Mobile & Console Hardware Profiler */}
      {activeSubTab === 'gpu' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 min-w-0">
          
          <div className="xl:col-span-2 bg-[#16181D] border border-[#23272F] rounded-lg p-4 space-y-3 min-w-0">
            <div className="border-b border-[#23272F] pb-3">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-amber-400 shrink-0" />
                GPU Instruction Density & Register Profiler
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Estimates hardware instruction workload on Metal, Qualcomm Adreno, ARM Mali, and DX12.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-[#0E1013] border border-[#23272F] p-2.5 rounded-md min-w-0">
                <span className="text-[10px] text-slate-400 block truncate">Fragment ALU</span>
                <span className="text-base sm:text-lg font-bold font-mono text-slate-100 truncate block">~{gpuMetrics.estimatedFragmentAlu} ops</span>
              </div>
              <div className="bg-[#0E1013] border border-[#23272F] p-2.5 rounded-md min-w-0">
                <span className="text-[10px] text-slate-400 block truncate">Vertex ALU</span>
                <span className="text-base sm:text-lg font-bold font-mono text-slate-100 truncate block">~{gpuMetrics.estimatedVertexAlu} ops</span>
              </div>
              <div className="bg-[#0E1013] border border-[#23272F] p-2.5 rounded-md min-w-0">
                <span className="text-[10px] text-slate-400 block truncate">Texture Fetches</span>
                <span className="text-base sm:text-lg font-bold font-mono text-indigo-300 truncate block">~{gpuMetrics.textureFetchCount} reads</span>
              </div>
              <div className="bg-[#0E1013] border border-[#23272F] p-2.5 rounded-md min-w-0">
                <span className="text-[10px] text-slate-400 block truncate">ALU:TEX Ratio</span>
                <span className="text-base sm:text-lg font-bold font-mono text-purple-300 truncate block">{gpuMetrics.aluToTexRatio} : 1</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-semibold text-slate-300">Mobile Precision Breakdown (FP16 vs FP32):</h4>
              <div className="bg-[#0E1013] border border-[#23272F] p-3 rounded-md space-y-2.5">
                <div className="flex flex-wrap justify-between text-xs gap-1">
                  <span className="text-emerald-400 font-medium">FP16 Half: {gpuMetrics.precisionFP16Percent}%</span>
                  <span className="text-sky-400 font-medium">FP32 Float: {gpuMetrics.precisionFP32Percent}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden flex">
                  <div className="bg-emerald-500 h-full" style={{ width: `${gpuMetrics.precisionFP16Percent}%` }} />
                  <div className="bg-sky-500 h-full" style={{ width: `${gpuMetrics.precisionFP32Percent}%` }} />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed break-words">
                  On mobile GPUs (ARM Mali, Qualcomm Adreno, Apple GPU), using <code>half</code> / <code>half3</code> for colors and UVs doubles vector register capacity and lowers memory bandwidth by 50%.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#16181D] border border-[#23272F] rounded-lg p-4 space-y-3 min-w-0">
            <div className="border-b border-[#23272F] pb-3">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-200">Target Hardware Budget</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Estimated performance ceilings.</p>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-[#0E1013] border border-[#23272F]">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-slate-200">Mobile 60fps Target:</span>
                  <span className="text-emerald-400 font-bold">16.6ms</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {gpuMetrics.estimatedFragmentAlu < 50 ? 'Extremely lightweight. Perfect for mobile scenes.' : 'Moderate cost. Suitable for hero objects or main shaders.'}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-[#0E1013] border border-[#23272F]">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-slate-200">Bandwidth Rating:</span>
                  <span className={`font-bold ${gpuMetrics.bandwidthRating === 'low' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {gpuMetrics.bandwidthRating.toUpperCase()}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Low texture bandwidth overhead ensures sustained frame rates without thermal throttling.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* SUB-TAB 4: Actionable Fixes & Optimization Engine */}
      {activeSubTab === 'recommendations' && (
        <div className="bg-[#16181D] border border-[#23272F] rounded-lg p-4 space-y-3 min-w-0">
          <div className="flex items-center justify-between border-b border-[#23272F] pb-3">
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                Automated Performance Optimizations
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Targeted recommendations to achieve 100% SRP Batcher compliance and minimize build variants.
              </p>
            </div>
            <span className="text-xs font-mono text-amber-400 shrink-0">
              {recommendations.length} Fixes
            </span>
          </div>

          {recommendations.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">
              <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto mb-2 opacity-80" />
              <p className="font-semibold text-slate-200">No performance bottlenecks detected!</p>
              <p className="text-[11px] mt-1 text-slate-400">Your shader is fully optimized with 100% SRP Batcher compliance and zero wasted variant overhead.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className={`p-3 rounded-lg border flex items-start justify-between gap-3 min-w-0 ${
                    rec.severity === 'critical' ? 'bg-[#181114] border-rose-500/20' :
                    rec.severity === 'warning' ? 'bg-[#18150E] border-amber-500/20' :
                    'bg-[#101419] border-sky-500/20'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono uppercase font-bold shrink-0 ${
                        rec.severity === 'critical' ? 'bg-rose-500/20 text-rose-300' :
                        rec.severity === 'warning' ? 'bg-amber-500/20 text-amber-300' :
                        'bg-sky-500/20 text-sky-300'
                      }`}>
                        {rec.severity}
                      </span>
                      <span className="text-xs font-semibold text-slate-200 truncate">{rec.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed break-words">{rec.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
