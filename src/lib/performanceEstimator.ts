import { PerformanceEstimation } from '../types';

/**
 * High-precision Performance Impact & SRP Batcher Estimation Engine for Unity URP & HDRP shaders.
 */
export function estimateShaderPerformance(hlslCode: string): PerformanceEstimation {
  if (!hlslCode || hlslCode.trim().length === 0) {
    return createEmptyEstimation();
  }

  // --- 1. SRP BATCHER ANALYSIS ---
  const cbufferMatch = hlslCode.match(/CBUFFER_START\s*\(\s*UnityPerMaterial\s*\)([\s\S]*?)CBUFFER_END/);
  const cbufferFound = !!cbufferMatch;
  const cbufferContent = cbufferMatch ? cbufferMatch[1] : '';

  // Extract variables inside CBUFFER
  const cbufferVars: Array<{ type: string; name: string; size: number }> = [];
  if (cbufferFound) {
    const varLines = cbufferContent.split('\n');
    for (const line of varLines) {
      const cleanLine = line.trim().replace(/\/\/.*$/, '');
      if (!cleanLine || cleanLine.startsWith('#')) continue;
      
      const match = cleanLine.match(/\b(float4x4|float4|float3|float2|float|half4|half3|half2|half|int4|int3|int2|int|uint4|uint3|uint2|uint|fixed4|fixed3|fixed2|fixed)\s+([A-Za-z0-9_]+)\s*(?:\[\d+\])?\s*;/);
      if (match) {
        const type = match[1];
        const name = match[2];
        const size = getTypeByteSize(type);
        cbufferVars.push({ type, name, size });
      }
    }
  }

  // Calculate CBUFFER size and 16-byte alignment packing
  let rawByteSize = 0;
  let currentRegisterByteOffset = 0;
  let paddingBytes = 0;

  for (const v of cbufferVars) {
    const varSize = v.size;
    // HLSL constant buffer 16-byte boundary rule:
    // A single variable cannot straddle a 16-byte boundary unless it's an array or struct
    const remainingInRegister = 16 - (currentRegisterByteOffset % 16);
    if (remainingInRegister < 16 && varSize > remainingInRegister) {
      // Must jump to next 16-byte register
      const pad = remainingInRegister;
      paddingBytes += pad;
      currentRegisterByteOffset += pad;
    }
    currentRegisterByteOffset += varSize;
    rawByteSize += varSize;
  }

  // Pad total buffer size to multiple of 16 bytes
  const totalAlignmentRemainder = currentRegisterByteOffset % 16;
  if (totalAlignmentRemainder > 0) {
    const endPad = 16 - totalAlignmentRemainder;
    paddingBytes += endPad;
    currentRegisterByteOffset += endPad;
  }

  const finalCbufferSize = cbufferFound ? currentRegisterByteOffset : 0;
  const packingEfficiency = finalCbufferSize > 0 
    ? Math.round(((finalCbufferSize - paddingBytes) / finalCbufferSize) * 100) 
    : 0;

  // Check for loose uniforms outside CBUFFER (excluding textures, samplers, and Unity system vars)
  const looseVariables: string[] = [];
  const linesWithoutCbuffer = hlslCode.replace(/CBUFFER_START[\s\S]*?CBUFFER_END/g, '');
  const looseUniformRegex = /\b(?:uniform\s+)?(float4x4|float4|float3|float2|float|half4|half3|half2|half|int|fixed4)\s+(_[A-Za-z0-9_]+)\s*;/g;
  let looseMatch;
  while ((looseMatch = looseUniformRegex.exec(linesWithoutCbuffer)) !== null) {
    const varName = looseMatch[2];
    // Exclude textures, ST vectors, or Unity built-in names if mapped
    if (!varName.startsWith('unity_') && !varName.startsWith('gl_') && !varName.endsWith('_ST') && !varName.endsWith('_TexelSize')) {
      if (!cbufferVars.some(v => v.name === varName)) {
        looseVariables.push(varName);
      }
    }
  }

  // Check passes and geometry shaders
  const hasGeometryShader = /#pragma\s+geometry\s+/.test(hlslCode) || /#pragma\s+geom\s+/.test(hlslCode);
  const hasTessellation = /#pragma\s+hull\s+/.test(hlslCode) || /#pragma\s+domain\s+/.test(hlslCode);
  const hasCombinedSampler = /\bsampler2D\s+/.test(hlslCode);
  const hasSeparatedSamplers = /\bTEXTURE2D\s*\(/.test(hlslCode) && /\bSAMPLER\s*\(/.test(hlslCode);

  const passMatches = hlslCode.match(/Pass\s*\{/g);
  const totalPasses = passMatches ? passMatches.length : 1;

  // Check list items
  const checkItems: Array<{
    id: string;
    title: string;
    passed: boolean;
    impact: 'high' | 'medium' | 'low';
    description: string;
    recommendation?: string;
  }> = [];

  // Check 1: CBUFFER UnityPerMaterial
  checkItems.push({
    id: 'cbuffer_presence',
    title: 'UnityPerMaterial Constant Buffer',
    passed: cbufferFound,
    impact: 'high',
    description: cbufferFound
      ? `All material uniforms are declared in CBUFFER_START(UnityPerMaterial) (${cbufferVars.length} parameters, ${finalCbufferSize} bytes).`
      : 'Missing CBUFFER_START(UnityPerMaterial) wrapper. Unity cannot batch this shader and will incur CPU draw-call submission overhead.',
    recommendation: cbufferFound ? undefined : 'Enclose all float, vector, color, and matrix properties in CBUFFER_START(UnityPerMaterial) ... CBUFFER_END.',
  });

  // Check 2: Loose variables
  const hasNoLooseVars = looseVariables.length === 0;
  checkItems.push({
    id: 'no_loose_uniforms',
    title: 'No Loose Global Uniforms',
    passed: hasNoLooseVars,
    impact: 'high',
    description: hasNoLooseVars
      ? 'No unbuffered loose material uniforms detected outside CBUFFER.'
      : `Found ${looseVariables.length} unbuffered variable(s) outside CBUFFER (${looseVariables.slice(0, 3).join(', ')}${looseVariables.length > 3 ? '...' : ''}). This breaks SRP Batching.`,
    recommendation: hasNoLooseVars ? undefined : 'Move all non-texture material variables into the UnityPerMaterial CBUFFER.',
  });

  // Check 3: Geometry & Tessellation
  const hasNoGeom = !hasGeometryShader && !hasTessellation;
  checkItems.push({
    id: 'no_geometry_shaders',
    title: 'No Geometry / Hull / Domain Stages',
    passed: hasNoGeom,
    impact: 'high',
    description: hasNoGeom
      ? 'No geometry or tessellation stages found. Compatible with fast hardware vertex pipelines and SRP Batching.'
      : 'Geometry or Tessellation shaders are used, which disables the SRP Batcher for this shader pass.',
    recommendation: hasNoGeom ? undefined : 'Convert geometry generation to compute shaders or VFX Graph for SRP Batcher compatibility.',
  });

  // Check 4: Texture Sampler Separation
  const samplersCompliant = hasSeparatedSamplers || !hasCombinedSampler;
  checkItems.push({
    id: 'sampler_state_separation',
    title: 'Modern Texture2D & SamplerState Separation',
    passed: samplersCompliant,
    impact: 'medium',
    description: samplersCompliant
      ? 'Texture objects and sampler states are separated (TEXTURE2D + SAMPLER), conserving descriptor slots.'
      : 'Legacy sampler2D syntax detected. Modern SRP targets require TEXTURE2D(tex) and SAMPLER(sampler_tex).',
    recommendation: samplersCompliant ? undefined : 'Enable "Texture2D + Sampler" toggle or replace sampler2D with TEXTURE2D and SAMPLER macros.',
  });

  // Check 5: Packing Alignment
  const isWellPacked = packingEfficiency >= 75 || cbufferVars.length <= 2;
  checkItems.push({
    id: 'memory_alignment',
    title: '16-Byte Vector Packing Efficiency',
    passed: isWellPacked,
    impact: 'low',
    description: isWellPacked
      ? `Buffer layout is efficiently aligned (${packingEfficiency}% density, ${paddingBytes} padding bytes).`
      : `Suboptimal 16-byte packing (${paddingBytes} wasted padding bytes). Reorder properties (float4 first, then float2, float) to pack tighter.`,
    recommendation: isWellPacked ? undefined : 'Group float4/color properties together at the top, then pair float3 + float, and float2 + float2.',
  });

  // Calculate overall score (0 - 100)
  let srpScore = 100;
  if (!cbufferFound) srpScore -= 60;
  if (!hasNoLooseVars) srpScore -= Math.min(25, looseVariables.length * 10);
  if (!hasNoGeom) srpScore -= 30;
  if (!samplersCompliant) srpScore -= 10;
  if (!isWellPacked && cbufferFound) srpScore -= 5;
  srpScore = Math.max(0, Math.min(100, srpScore));

  const isCompatible = srpScore >= 80 && cbufferFound && hasNoLooseVars && hasNoGeom;
  const passesBatchable = isCompatible ? totalPasses : 0;

  // --- 2. SHADER VARIANTS & PRAGMA MULTI_COMPILE ANALYSIS ---
  const pragmaRegex = /#pragma\s+(multi_compile|shader_feature|multi_compile_local|shader_feature_local|multi_compile_fog|multi_compile_instancing|multi_compile_shadowcaster|multi_compile_fragment|multi_compile_vertex)\s*([^\n\r]*)/g;
  const pragmas: PerformanceEstimation['variants']['pragmas'] = [];
  let totalRawVariants = 1;
  let estimatedPlayerBuildVariants = 1;
  let totalKeywordsSet = new Set<string>();

  let pragmaMatch;
  while ((pragmaMatch = pragmaRegex.exec(hlslCode)) !== null) {
    const rawType = pragmaMatch[1];
    const argsStr = pragmaMatch[2].trim();
    const rawDirective = `#pragma ${rawType} ${argsStr}`;

    let keywords: string[] = [];
    let isLocal = rawType.includes('local');
    let type: PerformanceEstimation['variants']['pragmas'][0]['type'] = 'multi_compile';

    if (rawType === 'multi_compile_fog') {
      type = 'system';
      keywords = ['FOG_OFF', 'FOG_LINEAR', 'FOG_EXP', 'FOG_EXP2'];
    } else if (rawType === 'multi_compile_instancing') {
      type = 'system';
      keywords = ['INSTANCING_OFF', 'INSTANCING_ON', 'PROCEDURAL_INSTANCING_ON'];
    } else if (rawType === 'multi_compile_shadowcaster') {
      type = 'system';
      keywords = ['SHADOWS_OFF', 'SHADOWS_ON'];
    } else {
      keywords = argsStr.split(/\s+/).filter(k => k.length > 0);
      if (rawType.startsWith('shader_feature')) {
        type = isLocal ? 'shader_feature_local' : 'shader_feature';
      } else {
        type = isLocal ? 'multi_compile_local' : 'multi_compile';
      }
    }

    // Include the blank keyword '_' if present or implied
    const hasUnderscore = keywords.includes('_');
    const effectiveCount = Math.max(1, keywords.length);

    keywords.forEach(k => {
      if (k !== '_') totalKeywordsSet.add(k);
    });

    let rec: string | undefined = undefined;
    if (type === 'multi_compile' && !isLocal && keywords.some(k => !k.startsWith('_MAIN_LIGHT') && !k.startsWith('_ADDITIONAL_LIGHT'))) {
      rec = 'Consider replacing with shader_feature_local to strip unused variants in release builds.';
    }

    pragmas.push({
      type,
      rawDirective,
      keywords,
      count: effectiveCount,
      isLocal,
      scope: isLocal ? 'material' : 'global',
      recommendation: rec,
    });

    // Compound variant math
    totalRawVariants *= effectiveCount;

    // For player build estimate: shader_feature items are stripped per material (typically 1-2 active)
    if (type.startsWith('shader_feature')) {
      estimatedPlayerBuildVariants *= Math.min(effectiveCount, 2);
    } else {
      estimatedPlayerBuildVariants *= effectiveCount;
    }
  }

  // Account for multiple passes
  if (totalPasses > 1) {
    totalRawVariants = Math.max(totalRawVariants, totalRawVariants * (totalPasses * 0.8));
    estimatedPlayerBuildVariants = Math.max(estimatedPlayerBuildVariants, estimatedPlayerBuildVariants * (totalPasses * 0.7));
  }

  totalRawVariants = Math.max(1, Math.round(totalRawVariants));
  estimatedPlayerBuildVariants = Math.max(1, Math.round(estimatedPlayerBuildVariants));

  // Stripped counts per platform
  const strippedVariantsMobile = Math.max(1, Math.round(estimatedPlayerBuildVariants * 0.6));
  const strippedVariantsDesktop = estimatedPlayerBuildVariants;

  // Memory & Compile Time Impact
  // Average compiled shader variant binary size is ~12-18 KB in Vulkan/DX12/Metal
  const memoryFootprintKb = Math.round(estimatedPlayerBuildVariants * 14.5);
  // Average compilation time per variant on modern 8-core CPU ~ 0.04s
  const estimatedCompileTimeSec = Number((estimatedPlayerBuildVariants * 0.045).toFixed(2));

  let riskLevel: PerformanceEstimation['variants']['riskLevel'] = 'minimal';
  if (totalRawVariants > 1024 || pragmas.length >= 8) {
    riskLevel = 'critical';
  } else if (totalRawVariants > 256 || pragmas.length >= 5) {
    riskLevel = 'high';
  } else if (totalRawVariants > 32) {
    riskLevel = 'moderate';
  }

  const variantSuggestions: string[] = [];
  if (pragmas.some(p => p.type === 'multi_compile' && !p.isLocal)) {
    variantSuggestions.push('Use shader_feature_local for material-only keywords to keep player build stripped.');
  }
  if (totalRawVariants > 128) {
    variantSuggestions.push('High variant count detected. Consider removing unused shadow cascade or lighting fallback branches.');
  }
  if (pragmas.length === 0) {
    variantSuggestions.push('No multi_compile directives detected. Single-variant shader compiles instantly.');
  }

  // --- 3. GPU INSTRUCTION & PRECISION METRICS ---
  // Arithmetic Instruction Scanner
  const mathMatches = hlslCode.match(/\b(mul|dot|cross|normalize|sin|cos|tan|asin|acos|atan|atan2|pow|exp|exp2|log|log2|sqrt|rsqrt|abs|sign|floor|ceil|round|frac|fmod|step|smoothstep|clamp|saturate|lerp|min|max|ddx|ddy|ddx_fine|ddy_fine)\s*\(/g);
  const mathCount = mathMatches ? mathMatches.length : 0;
  const basicOps = (hlslCode.match(/[\+\-\*\/]/g) || []).length;
  const estimatedFragmentAlu = Math.round(mathCount * 1.5 + basicOps * 0.4 + 12);
  const estimatedVertexAlu = Math.round(estimatedFragmentAlu * 0.35 + 8);

  // Texture Fetch Scanner
  const texFetchMatches = hlslCode.match(/\b(SAMPLE_TEXTURE2D|SAMPLE_TEXTURE2D_LOD|SAMPLE_TEXTURE2D_BIAS|SAMPLE_TEXTURE2D_GRAD|SAMPLE_TEXTURECUBE|SAMPLE_TEXTURECUBE_LOD|SAMPLE_DEPTH|tex2D|tex2Dlod|texCUBE)\s*\(/g);
  const textureFetchCount = texFetchMatches ? texFetchMatches.length : 1;

  // ALU to TEX ratio
  const aluToTexRatio = Number((estimatedFragmentAlu / Math.max(1, textureFetchCount)).toFixed(1));

  // Precision check: count 'half' vs 'float' in code
  const halfCount = (hlslCode.match(/\b(half|half2|half3|half4)\b/g) || []).length;
  const floatCount = (hlslCode.match(/\b(float|float2|float3|float4)\b/g) || []).length;
  const totalPrecisionVars = Math.max(1, halfCount + floatCount);
  const precisionFP16Percent = Math.round((halfCount / totalPrecisionVars) * 100);
  const precisionFP32Percent = 100 - precisionFP16Percent;

  // Mobile Thermal & Bandwidth Impact
  let thermalImpactMobile: PerformanceEstimation['gpuMetrics']['thermalImpactMobile'] = 'very_low';
  if (estimatedFragmentAlu > 120 || textureFetchCount > 6) {
    thermalImpactMobile = 'extreme';
  } else if (estimatedFragmentAlu > 70 || textureFetchCount > 4) {
    thermalImpactMobile = 'high';
  } else if (estimatedFragmentAlu > 35 || textureFetchCount > 2) {
    thermalImpactMobile = 'moderate';
  } else if (estimatedFragmentAlu > 15) {
    thermalImpactMobile = 'low';
  }

  let bandwidthRating: PerformanceEstimation['gpuMetrics']['bandwidthRating'] = 'low';
  if (textureFetchCount > 4 || precisionFP32Percent > 80) {
    bandwidthRating = 'high';
  } else if (textureFetchCount > 2 || precisionFP32Percent > 50) {
    bandwidthRating = 'medium';
  }

  // --- 4. ACTIONABLE RECOMMENDATIONS ---
  const recommendations: PerformanceEstimation['recommendations'] = [];

  if (!cbufferFound) {
    recommendations.push({
      id: 'fix_cbuffer',
      type: 'srp',
      severity: 'critical',
      title: 'Wrap properties in UnityPerMaterial CBUFFER',
      description: 'Without UnityPerMaterial, Unity will break the batch and issue a separate SetPassCall / uniform buffer upload per GameObject.',
      actionLabel: 'Inject CBUFFER',
    });
  }

  if (looseVariables.length > 0) {
    recommendations.push({
      id: 'fix_loose_vars',
      type: 'srp',
      severity: 'critical',
      title: `Move ${looseVariables.length} loose variable(s) into CBUFFER`,
      description: `Variables like ${looseVariables[0]} bypass the SRP Batcher and force uniform re-upload every frame.`,
    });
  }

  if (precisionFP32Percent > 60) {
    recommendations.push({
      id: 'optimize_precision',
      type: 'precision',
      severity: 'warning',
      title: 'Promote FP32 (float) to FP16 (half) for Mobile GPUs',
      description: `${precisionFP32Percent}% of variables use full 32-bit float. Using half for colors, normals, and lighting cuts register pressure on Mali/Adreno GPUs by 50%.`,
    });
  }

  if (pragmas.some(p => p.type === 'multi_compile' && !p.isLocal)) {
    recommendations.push({
      id: 'optimize_variants',
      type: 'variant',
      severity: 'info',
      title: 'Convert multi_compile to shader_feature_local',
      description: 'Local shader features do not consume global keyword slots and are automatically stripped from builds if unused on materials.',
    });
  }

  if (paddingBytes >= 8) {
    recommendations.push({
      id: 'repack_cbuffer',
      type: 'srp',
      severity: 'info',
      title: 'Optimize CBUFFER vector packing',
      description: `${paddingBytes} bytes of padding detected inside UnityPerMaterial. Group float4s together to maximize GPU cache lines.`,
    });
  }

  return {
    srpBatcher: {
      score: srpScore,
      isCompatible,
      cbufferFound,
      cbufferSize: finalCbufferSize,
      cbufferAlignmentPadding: paddingBytes,
      packingEfficiency,
      unbufferedVariables: looseVariables,
      passesBatchable,
      totalPasses,
      checkItems,
      estimatedDrawCallReduction: isCompatible ? 'Up to 90% (1 GPU buffer bind per material batch)' : '0% (Standard 1 Draw Call per instance)',
    },
    variants: {
      totalRawVariants,
      estimatedPlayerBuildVariants,
      strippedVariantsMobile,
      strippedVariantsDesktop,
      keywordsCount: totalKeywordsSet.size,
      pragmas,
      memoryFootprintKb,
      estimatedCompileTimeSec,
      riskLevel,
      suggestions: variantSuggestions,
    },
    gpuMetrics: {
      estimatedVertexAlu,
      estimatedFragmentAlu,
      textureFetchCount,
      aluToTexRatio,
      precisionFP16Percent,
      precisionFP32Percent,
      thermalImpactMobile,
      bandwidthRating,
    },
    recommendations,
  };
}

function getTypeByteSize(type: string): number {
  switch (type) {
    case 'float4x4': return 64;
    case 'float4':
    case 'half4':
    case 'fixed4':
    case 'int4':
    case 'uint4': return 16;
    case 'float3':
    case 'half3':
    case 'fixed3':
    case 'int3 past':
    case 'int3':
    case 'uint3': return 12;
    case 'float2':
    case 'half2':
    case 'fixed2':
    case 'int2':
    case 'uint2': return 8;
    case 'float':
    case 'half':
    case 'fixed':
    case 'int':
    case 'uint': return 4;
    default: return 4;
  }
}

function createEmptyEstimation(): PerformanceEstimation {
  return {
    srpBatcher: {
      score: 0,
      isCompatible: false,
      cbufferFound: false,
      cbufferSize: 0,
      cbufferAlignmentPadding: 0,
      packingEfficiency: 0,
      unbufferedVariables: [],
      passesBatchable: 0,
      totalPasses: 1,
      checkItems: [],
      estimatedDrawCallReduction: '0%',
    },
    variants: {
      totalRawVariants: 0,
      estimatedPlayerBuildVariants: 0,
      strippedVariantsMobile: 0,
      strippedVariantsDesktop: 0,
      keywordsCount: 0,
      pragmas: [],
      memoryFootprintKb: 0,
      estimatedCompileTimeSec: 0,
      riskLevel: 'minimal',
      suggestions: [],
    },
    gpuMetrics: {
      estimatedVertexAlu: 0,
      estimatedFragmentAlu: 0,
      textureFetchCount: 0,
      aluToTexRatio: 0,
      precisionFP16Percent: 0,
      precisionFP32Percent: 0,
      thermalImpactMobile: 'very_low',
      bandwidthRating: 'low',
    },
    recommendations: [],
  };
}
