/**
 * Core type definitions for GLSL to Unity SRP Shader Converter
 */

export type TargetPipeline = 'urp' | 'hdrp' | 'shadergraph' | 'compute' | 'srp_core';

export type SourceFormat = 'glsl' | 'builtin_cg' | 'shadertoy' | 'auto';

export type UnityVersion = '6000' | '2023' | '2022';

export type SurfaceType = 'unlit' | 'lit_pbr' | 'transparent' | 'additive' | 'alphatest';

export interface TranspileOptions {
  targetPipeline: TargetPipeline;
  sourceFormat?: SourceFormat;
  unityVersion: UnityVersion;
  surfaceType: SurfaceType;
  srpBatcher: boolean;
  clipSpaceCorrection: boolean;
  samplerSeparation: boolean;
  includeInspectorProperties: boolean;
  functionPrecision: 'both' | 'float' | 'half';
  customShaderName: string;
  remapLegacyTextureNames?: boolean; // _MainTex -> _BaseMap, _Color -> _BaseColor
  convertFogMacros?: boolean; // UNITY_TRANSFER_FOG -> MixFog
  generateShadowCaster?: boolean;
}

export interface ExtractedProperty {
  name: string;
  glslName: string;
  type: 'Color' | 'Float' | 'Range' | 'Vector' | '2D' | 'Int';
  defaultValue: string;
  displayName: string;
  rangeMin?: number;
  rangeMax?: number;
}

export interface ConversionAnnotation {
  from: string;
  to: string;
  category: 'type' | 'function' | 'matrix' | 'texture' | 'coordinate' | 'buffer' | 'structure';
  explanation: string;
  lineNumber?: number;
}

export interface PerformanceEstimation {
  srpBatcher: {
    score: number; // 0 to 100
    isCompatible: boolean;
    cbufferFound: boolean;
    cbufferSize: number; // in bytes
    cbufferAlignmentPadding: number; // padding bytes
    packingEfficiency: number; // 0 to 100%
    unbufferedVariables: string[];
    passesBatchable: number;
    totalPasses: number;
    checkItems: Array<{
      id: string;
      title: string;
      passed: boolean;
      impact: 'high' | 'medium' | 'low';
      description: string;
      recommendation?: string;
    }>;
    estimatedDrawCallReduction: string;
  };
  variants: {
    totalRawVariants: number;
    estimatedPlayerBuildVariants: number;
    strippedVariantsMobile: number;
    strippedVariantsDesktop: number;
    keywordsCount: number;
    pragmas: Array<{
      type: 'multi_compile' | 'shader_feature' | 'multi_compile_local' | 'shader_feature_local' | 'system';
      rawDirective: string;
      keywords: string[];
      count: number;
      isLocal: boolean;
      scope: 'material' | 'global' | 'pass';
      recommendation?: string;
    }>;
    memoryFootprintKb: number;
    estimatedCompileTimeSec: number;
    riskLevel: 'minimal' | 'moderate' | 'high' | 'critical';
    suggestions: string[];
  };
  gpuMetrics: {
    estimatedVertexAlu: number;
    estimatedFragmentAlu: number;
    textureFetchCount: number;
    aluToTexRatio: number;
    precisionFP16Percent: number;
    precisionFP32Percent: number;
    thermalImpactMobile: 'very_low' | 'low' | 'moderate' | 'high' | 'extreme';
    bandwidthRating: 'low' | 'medium' | 'high';
  };
  recommendations: Array<{
    id: string;
    type: 'srp' | 'variant' | 'precision' | 'bandwidth';
    severity: 'info' | 'warning' | 'critical';
    title: string;
    description: string;
    actionLabel?: string;
  }>;
}

export interface ChangedPartItem {
  id: string;
  category: 'Function' | 'Type' | 'Texture & Sampler' | 'SRP CBUFFER' | 'Lighting & Math' | 'Pass Structure' | 'Preprocessor & Macro';
  sourceSnippet: string;
  convertedSnippet: string;
  explanation: string;
  lineNumber?: number;
}

export interface TranspileResult {
  convertedCode: string;
  changedCodeOnly: string;
  changedParts: ChangedPartItem[];
  changedLineNumbers?: number[];
  pipeline: TargetPipeline;
  unityVersion: UnityVersion;
  properties: ExtractedProperty[];
  annotations: ConversionAnnotation[];
  warnings: string[];
  srpBatcherCompliant: boolean;
  cbufferCode: string;
  performance?: PerformanceEstimation;
  shaderGraphNode?: {
    functionName: string;
    inputs: Array<{ name: string; type: string }>;
    outputs: Array<{ name: string; type: string }>;
    hlslBody: string;
  };
}

export interface ShadingFunctionEntry {
  id: string;
  name: string;
  category: 'Math' | 'Trigonometry' | 'Vectors' | 'Matrices' | 'Texturing' | 'Derivatives' | 'Bitwise' | 'Compute' | 'Unity SRP';
  glsl: string;
  hlsl: string;
  cg: string;
  wgsl: string;
  msl: string;
  description: string;
  parameters: string;
  returnType: string;
  exampleGlsl: string;
  exampleHlsl: string;
  notes: string;
  mobileCaveats?: string;
  introducedIn?: string;
  docTopicId?: string;
  glslDocRef?: {
    title: string;
    url?: string;
    section?: string;
  };
  urpDocRef?: {
    title: string;
    url?: string;
    section?: string;
  };
}

export interface CustomNodePort {
  id: string;
  name: string;
  type: 'Float' | 'Vector2' | 'Vector3' | 'Vector4' | 'Matrix4x4' | 'Texture2D' | 'SamplerState' | 'Boolean';
  direction: 'input' | 'output';
  defaultValue?: string;
  description?: string;
}

export interface CustomNodeDefinition {
  functionName: string;
  description: string;
  mode: 'file' | 'string';
  ports: CustomNodePort[];
  bodyCode: string;
  precisionSupport: 'both' | 'float_only';
}

export interface ShaderPreset {
  id: string;
  title: string;
  category: '3D Surface' | 'Raymarching' | 'Procedural Noise' | 'Post-Processing' | 'VFX / Hologram' | 'Compute' | 'Built-in RP Legacy';
  description: string;
  glslCode: string;
  targetPipeline: TargetPipeline;
  sourceFormat?: SourceFormat;
  defaultUniforms?: Record<string, number | number[]>;
  recommendedGeometry?: 'sphere' | 'torus' | 'cube' | 'plane' | 'fullscreen';
  academicCitation?: {
    paperTitle: string;
    authors: string;
    venue: string;
    year: number;
    url?: string;
    doi?: string;
  };
  referenceIds?: string[];
}

export interface DocChapter {
  id: string;
  title: string;
  category: string;
  readTime: string;
  summary: string;
  tags: string[];
  contentMarkdown: string;
}

export type TutorialCategory = 
  | 'opengl_foundations' 
  | 'unity_urp_srp' 
  | 'procedural_math' 
  | 'academic_papers' 
  | 'stylized_vfx' 
  | 'interactive_sandboxes';

export interface TutorialResource {
  id: string;
  title: string;
  author: string;
  websiteOrSource: string;
  url: string;
  category: TutorialCategory;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Research';
  format: 'Article / Blog' | 'Interactive Book' | 'Academic Paper' | 'Video Series' | 'Interactive Tool';
  summary: string;
  keyTopics: string[];
  recommendedPrerequisites?: string[];
  conceptSnippet?: {
    title: string;
    language: 'glsl' | 'hlsl';
    code: string;
    note: string;
  };
  highlightBadge?: string;
}

export interface LearningRoadmap {
  id: string;
  title: string;
  targetAudience: string;
  estimatedWeeks: string;
  description: string;
  steps: Array<{
    stepNumber: number;
    title: string;
    resourceIds: string[];
    description: string;
  }>;
}

export type SnippetCategory = 
  | 'noise' 
  | 'sdf' 
  | 'blending' 
  | 'color' 
  | 'uv_math' 
  | 'lighting' 
  | 'custom';

export interface ShaderSnippet {
  id: string;
  title: string;
  category: SnippetCategory;
  description: string;
  code: string;
  tags: string[];
  isCustom?: boolean;
  author?: string;
  createdAt?: string;
  usageExample?: string;
}

