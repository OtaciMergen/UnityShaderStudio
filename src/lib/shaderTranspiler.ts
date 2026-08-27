import {
  TranspileOptions,
  TranspileResult,
  ExtractedProperty,
  ConversionAnnotation,
  SourceFormat,
  ChangedPartItem,
} from '../types';
import { estimateShaderPerformance } from './performanceEstimator';
import { formatUnityHlsl } from './shaderFormatter';

/**
 * Strips all Pass blocks with LightMode or Name = "ShadowCaster"
 */
export function stripShadowCasterPasses(code: string): string {
  let i = 0;
  let output = '';
  while (i < code.length) {
    const match = code.slice(i).match(/^Pass\s*\{/i);
    if (match) {
      const passStartIndex = i;
      let depth = 0;
      let passEndIndex = -1;
      for (let j = passStartIndex; j < code.length; j++) {
        if (code[j] === '{') depth++;
        else if (code[j] === '}') {
          depth--;
          if (depth === 0) {
            passEndIndex = j + 1;
            break;
          }
        }
      }
      if (passEndIndex !== -1) {
        const passBlock = code.slice(passStartIndex, passEndIndex);
        if (/["']ShadowCaster["']/i.test(passBlock) || /LightMode\s*=\s*["']ShadowCaster["']/i.test(passBlock)) {
          // Skip adding this pass to output
          i = passEndIndex;
          continue;
        } else {
          output += passBlock;
          i = passEndIndex;
          continue;
        }
      }
    }
    output += code[i];
    i++;
  }
  return output;
}

/**
 * Extract only the pure converted HLSL logic without surrounding ShaderLab boilerplate
 */
export function extractChangedCodeOnly(
  convertedCode: string,
  sourceCode: string,
  cbufferCode: string,
  annotations: ConversionAnnotation[],
  options: TranspileOptions
): string {
  // If converted code contains HLSLPROGRAM ... ENDHLSL, extract that core block
  const hlslMatches = Array.from(convertedCode.matchAll(/HLSLPROGRAM([\s\S]*?)ENDHLSL/g));
  if (hlslMatches.length > 0) {
    const mainHlsl = hlslMatches[0][1].trim();
    return `// ============================================================================
// CONVERTED HLSL LOGIC (Changed Parts Only)
// Target: ${options.targetPipeline.toUpperCase()} (Unity ${options.unityVersion})
// ============================================================================

${mainHlsl}`;
  }

  return convertedCode;
}

/**
 * Build structured Changed Parts items list comparing Source vs Converted
 */
export function buildChangedPartsList(
  annotations: ConversionAnnotation[],
  sourceCode: string,
  convertedCode: string,
  properties: ExtractedProperty[],
  cbufferCode: string,
  options: TranspileOptions
): ChangedPartItem[] {
  const parts: ChangedPartItem[] = [];

  // 1. CBUFFER SRP Batcher Block
  if (cbufferCode && cbufferCode.trim()) {
    parts.push({
      id: 'srp-cbuffer',
      category: 'SRP CBUFFER',
      sourceSnippet: properties.map(p => `${p.glslName} (${p.type})`).join('\n') || '// Bare global uniforms',
      convertedSnippet: cbufferCode.trim(),
      explanation: 'Packed material properties into UnityPerMaterial constant buffer for SRP Batcher draw-call batching.',
    });
  }

  // 2. Texture & Sampler declarations
  const texDecls = convertedCode.match(/TEXTURE2D\([^)]+\);\s*SAMPLER\([^)]+\);/g);
  if (texDecls && texDecls.length > 0) {
    parts.push({
      id: 'tex-samplers',
      category: 'Texture & Sampler',
      sourceSnippet: 'sampler2D / uniform sampler2D',
      convertedSnippet: texDecls.join('\n'),
      explanation: 'Separated combined legacy texture samplers into modern Texture2D and SamplerState declarations.',
    });
  }

  // 3. Shadow Pass handling
  if (options.generateShadowCaster === false) {
    parts.push({
      id: 'shadow-pass-removed',
      category: 'Pass Structure',
      sourceSnippet: 'Pass { ... "ShadowCaster" ... }',
      convertedSnippet: '// ShadowCaster Pass Excluded / Removed',
      explanation: 'Removed ShadowCaster pass to reduce vertex shader calculations and minimize shader variant build times.',
    });
  } else if (convertedCode.includes('"ShadowCaster"')) {
    parts.push({
      id: 'shadow-pass-added',
      category: 'Pass Structure',
      sourceSnippet: '// No URP Shadow Pass in source',
      convertedSnippet: 'Pass { Name "ShadowCaster" Tags { "LightMode" = "ShadowCaster" } ... }',
      explanation: 'Injected URP ShadowCaster pass with ApplyShadowBias() for real-time directional shadow casting.',
    });
  }

  // 4. Map from annotations
  annotations.forEach((ann, idx) => {
    let cat: ChangedPartItem['category'] = 'Function';
    if (ann.category === 'type') cat = 'Type';
    else if (ann.category === 'texture') cat = 'Texture & Sampler';
    else if (ann.category === 'buffer') cat = 'SRP CBUFFER';
    else if (ann.category === 'structure') cat = 'Pass Structure';
    else if (ann.category === 'coordinate') cat = 'Lighting & Math';
    else if (ann.category === 'matrix') cat = 'Lighting & Math';

    parts.push({
      id: `ann-${idx}-${ann.from.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_')}`,
      category: cat,
      sourceSnippet: ann.from,
      convertedSnippet: ann.to,
      explanation: ann.explanation,
      lineNumber: ann.lineNumber,
    });
  });

  return parts;
}

/**
 * Detect if shader code is Unity Built-in CG / ShaderLab
 */
export function isBuiltinShader(code: string): boolean {
  const c = code.trim();
  return (
    c.includes('CGPROGRAM') ||
    c.includes('CGINCLUDE') ||
    c.includes('UnityCG.cginc') ||
    c.includes('Lighting.cginc') ||
    c.includes('AutoLight.cginc') ||
    c.includes('UnityObjectToClipPos') ||
    c.includes('UnityObjectToWorldNormal') ||
    c.includes('_WorldSpaceLightPos0') ||
    c.includes('_LightColor0') ||
    c.includes('appdata_base') ||
    c.includes('appdata_full') ||
    c.includes('v2f') ||
    c.includes('v2f_img') ||
    c.includes('#pragma surface') ||
    c.includes('UNITY_MATRIX_MVP') ||
    c.includes('unity_ObjectToWorld') ||
    c.includes('_Object2World') ||
    c.includes('fixed4') ||
    c.includes('fixed3') ||
    c.includes('fixed2') ||
    c.includes('fixed') ||
    (c.includes('Shader "') && !c.includes('"RenderPipeline" = "UniversalPipeline"'))
  );
}

/**
 * Master Shader Transpiler (Supports GLSL, Shadertoy, and Unity Built-in CG/ShaderLab -> URP/HDRP)
 */
export function transpileGlslToUnity(
  sourceCode: string,
  options: TranspileOptions
): TranspileResult {
  const rawCode = sourceCode.trim();
  const format: SourceFormat = options.sourceFormat || 'auto';

  const isBuiltin = format === 'builtin_cg' || (format === 'auto' && isBuiltinShader(rawCode));

  let result: TranspileResult;
  if (isBuiltin) {
    result = transpileBuiltinToUrp(rawCode, options);
  } else {
    result = transpileGlslOrShadertoy(rawCode, options);
  }

  // Beautify and format according to Unity standard indentation and naming conventions
  try {
    result.convertedCode = formatUnityHlsl(result.convertedCode);
  } catch (fmtErr) {
    console.warn('Auto-format skipped due to parser error:', fmtErr);
  }

  // Populate changedCodeOnly and structured changedParts
  result.changedCodeOnly = extractChangedCodeOnly(result.convertedCode, rawCode, result.cbufferCode, result.annotations, options);
  result.changedParts = buildChangedPartsList(result.annotations, rawCode, result.convertedCode, result.properties, result.cbufferCode, options);

  // Calculate high-precision performance, SRP Batcher and variant estimation
  result.performance = estimateShaderPerformance(result.convertedCode);
  result.srpBatcherCompliant = result.performance.srpBatcher.isCompatible;

  return result;
}

/**
 * Transpile Unity Built-in Render Pipeline (CG / ShaderLab / Surface Shader) to Universal Render Pipeline (URP)
 */
export function transpileBuiltinToUrp(
  sourceCg: string,
  options: TranspileOptions
): TranspileResult {
  const annotations: ConversionAnnotation[] = [];
  const warnings: string[] = [];
  const properties: ExtractedProperty[] = [];

  const rawCode = sourceCg.trim();
  const remapTextures = options.remapLegacyTextureNames !== false;
  const isSurfaceShader = rawCode.includes('#pragma surface');

  // 1. Extract Properties from Properties block or global declarations
  extractBuiltinProperties(rawCode, properties, annotations, remapTextures);

  // 2. Handle Surface Shaders specially (since #pragma surface is completely unsupported in URP)
  if (isSurfaceShader) {
    return convertSurfaceShaderToUrp(rawCode, properties, options, annotations, warnings);
  }

  // 3. Transform Built-in CG / HLSL tokens to URP Core & Lighting HLSL
  let converted = rawCode;

  // Replace CGPROGRAM / ENDCG with HLSLPROGRAM / ENDHLSL
  if (converted.includes('CGPROGRAM')) {
    converted = converted.replace(/CGPROGRAM/g, 'HLSLPROGRAM');
    converted = converted.replace(/ENDCG/g, 'ENDHLSL');
    annotations.push({
      from: 'CGPROGRAM ... ENDCG',
      to: 'HLSLPROGRAM ... ENDHLSL',
      category: 'structure',
      explanation: 'Replaced legacy CgFX block with modern HLSLPROGRAM / ENDHLSL block required by Scriptable Render Pipelines.',
    });
  }

  // SubShader Tags: Add "RenderPipeline" = "UniversalPipeline"
  if (converted.includes('SubShader')) {
    if (!converted.includes('"RenderPipeline" = "UniversalPipeline"')) {
      converted = converted.replace(
        /SubShader\s*\{(?:\s*Tags\s*\{([^}]*)\})?/i,
        (match, tagsContent) => {
          if (tagsContent) {
            return `SubShader\n    {\n        Tags { "RenderPipeline" = "UniversalPipeline" ${tagsContent.trim()} }`;
          }
          return `SubShader\n    {\n        Tags { "RenderPipeline" = "UniversalPipeline" "RenderType"="Opaque" "Queue"="Geometry" }`;
        }
      );
      annotations.push({
        from: 'Tags { "RenderType"="Opaque" }',
        to: 'Tags { "RenderPipeline" = "UniversalPipeline" ... }',
        category: 'structure',
        explanation: 'Injected UniversalPipeline render pipeline tag so URP recognizes and executes the SubShader.',
      });
    }
  }

  // Pass Tags: Replace ForwardBase with UniversalForward
  if (converted.includes('"LightMode"') || converted.includes('"lightmode"')) {
    converted = converted.replace(/"LightMode"\s*=\s*"ForwardBase"/gi, '"LightMode" = "UniversalForward"');
    converted = converted.replace(/"LightMode"\s*=\s*"Vertex"/gi, '"LightMode" = "UniversalForward"');
    converted = converted.replace(/"LightMode"\s*=\s*"VertexLM"/gi, '"LightMode" = "UniversalForward"');
    annotations.push({
      from: 'Tags { "LightMode" = "ForwardBase" }',
      to: 'Tags { "LightMode" = "UniversalForward" }',
      category: 'structure',
      explanation: "Mapped Built-in 'ForwardBase' pass to URP's single-pass 'UniversalForward' rendering pass.",
    });
  }

  // Pass: ForwardAdd warning
  if (converted.includes('"ForwardAdd"')) {
    warnings.push(
      "Built-in 'ForwardAdd' pass detected: URP handles all additional lights in a single forward pass per object. You should remove the separate ForwardAdd pass to avoid multi-pass overhead."
    );
  }

  // Include Files Replacement
  const includeReplacements: Array<{ from: RegExp; to: string; desc: string }> = [
    {
      from: /#include\s*["<]UnityCG\.cginc[">]/g,
      to: '#include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"',
      desc: 'UnityCG.cginc -> Universal Core.hlsl',
    },
    {
      from: /#include\s*["<]Lighting\.cginc[">]/g,
      to: '#include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"',
      desc: 'Lighting.cginc -> Universal Lighting.hlsl',
    },
    {
      from: /#include\s*["<]AutoLight\.cginc[">]/g,
      to: '#include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"\n            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Shadows.hlsl"',
      desc: 'AutoLight.cginc -> Universal Lighting.hlsl & Shadows.hlsl',
    },
    {
      from: /#include\s*["<]UnityShaderVariables\.cginc[">]/g,
      to: '#include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"',
      desc: 'UnityShaderVariables.cginc -> Universal Core.hlsl',
    },
    {
      from: /#include\s*["<]HLSLSupport\.cginc[">]/g,
      to: '#include "Packages/com.unity.render-pipelines.core/ShaderLibrary/Common.hlsl"',
      desc: 'HLSLSupport.cginc -> Core Common.hlsl',
    },
  ];

  includeReplacements.forEach(inc => {
    if (inc.from.test(converted)) {
      converted = converted.replace(inc.from, inc.to);
      annotations.push({
        from: inc.desc.split(' -> ')[0],
        to: inc.desc.split(' -> ')[1],
        category: 'include' as any,
        explanation: `Replaced legacy Built-in include '${inc.desc.split(' -> ')[0]}' with official modern URP package library.`,
      });
    }
  });

  // Type Mappings: fixed -> half
  const fixedMap: Array<{ regex: RegExp; hlsl: string }> = [
    { regex: /\bfixed4\b/g, hlsl: 'half4' },
    { regex: /\bfixed3\b/g, hlsl: 'half3' },
    { regex: /\bfixed2\b/g, hlsl: 'half2' },
    { regex: /\bfixed\b/g, hlsl: 'half' },
  ];
  fixedMap.forEach(f => {
    if (f.regex.test(converted)) {
      converted = converted.replace(f.regex, f.hlsl);
      annotations.push({
        from: f.regex.source.replace(/\\b/g, ''),
        to: f.hlsl,
        category: 'type',
        explanation: `Converted obsolete 11-bit 'fixed' type to IEEE half-precision 'half'.`,
      });
    }
  });

  // Transformation & Coordinate System Functions
  const transformMap: Array<{ from: RegExp; to: string; orig: string; repl: string; exp: string }> = [
    {
      from: /\bUnityObjectToClipPos\s*\(\s*([^)]+?)\s*\)/g,
      to: 'TransformObjectToHClip($1.xyz)',
      orig: 'UnityObjectToClipPos(v.vertex)',
      repl: 'TransformObjectToHClip(v.vertex.xyz)',
      exp: 'Replaced legacy matrix concatenation UnityObjectToClipPos with URP optimized vertex transformation helper.',
    },
    {
      from: /\bUnityObjectToWorldNormal\s*\(\s*([^)]+?)\s*\)/g,
      to: 'TransformObjectToWorldNormal($1)',
      orig: 'UnityObjectToWorldNormal(v.normal)',
      repl: 'TransformObjectToWorldNormal(v.normal)',
      exp: 'Transformed object space normal to world space with non-uniform scaling compensation.',
    },
    {
      from: /\bUnityObjectToWorldDir\s*\(\s*([^)]+?)\s*\)/g,
      to: 'TransformObjectToWorldDir($1)',
      orig: 'UnityObjectToWorldDir(dir)',
      repl: 'TransformObjectToWorldDir(dir)',
      exp: 'Converted object space direction vector to world space.',
    },
    {
      from: /\bUnityWorldToObjectDir\s*\(\s*([^)]+?)\s*\)/g,
      to: 'TransformWorldToObjectDir($1)',
      orig: 'UnityWorldToObjectDir(dir)',
      repl: 'TransformWorldToObjectDir(dir)',
      exp: 'Converted world direction vector to object space.',
    },
    {
      from: /\bUnityWorldToClipPos\s*\(\s*([^)]+?)\s*\)/g,
      to: 'TransformWorldToHClip($1)',
      orig: 'UnityWorldToClipPos(pos)',
      repl: 'TransformWorldToHClip(pos)',
      exp: 'Replaced UnityWorldToClipPos with TransformWorldToHClip.',
    },
    {
      from: /\bUnityViewToClipPos\s*\(\s*([^)]+?)\s*\)/g,
      to: 'TransformViewToHClip($1)',
      orig: 'UnityViewToClipPos(pos)',
      repl: 'TransformViewToHClip(pos)',
      exp: 'Replaced UnityViewToClipPos with TransformViewToHClip.',
    },
  ];

  transformMap.forEach(tm => {
    if (tm.from.test(converted)) {
      converted = converted.replace(tm.from, tm.to);
      annotations.push({
        from: tm.orig,
        to: tm.repl,
        category: 'matrix',
        explanation: tm.exp,
      });
    }
  });

  // Matrix Replacements
  const matrixMap: Array<{ from: RegExp; to: string; orig: string; repl: string }> = [
    { from: /\bUNITY_MATRIX_MVP\b/g, to: 'GetWorldToHClipMatrix()', orig: 'UNITY_MATRIX_MVP', repl: 'GetWorldToHClipMatrix()' },
    { from: /\bUNITY_MATRIX_MV\b/g, to: 'mul(GetWorldToViewMatrix(), GetObjectToWorldMatrix())', orig: 'UNITY_MATRIX_MV', repl: 'mul(V, M)' },
    { from: /\bUNITY_MATRIX_V\b/g, to: 'GetWorldToViewMatrix()', orig: 'UNITY_MATRIX_V', repl: 'GetWorldToViewMatrix()' },
    { from: /\bUNITY_MATRIX_P\b/g, to: 'GetViewToHClipMatrix()', orig: 'UNITY_MATRIX_P', repl: 'GetViewToHClipMatrix()' },
    { from: /\bUNITY_MATRIX_VP\b/g, to: 'GetWorldToHClipMatrix()', orig: 'UNITY_MATRIX_VP', repl: 'GetWorldToHClipMatrix()' },
    { from: /\bunity_ObjectToWorld\b/g, to: 'GetObjectToWorldMatrix()', orig: 'unity_ObjectToWorld', repl: 'GetObjectToWorldMatrix()' },
    { from: /\b_Object2World\b/g, to: 'GetObjectToWorldMatrix()', orig: '_Object2World', repl: 'GetObjectToWorldMatrix()' },
    { from: /\bunity_WorldToObject\b/g, to: 'GetWorldToObjectMatrix()', orig: 'unity_WorldToObject', repl: 'GetWorldToObjectMatrix()' },
    { from: /\b_World2Object\b/g, to: 'GetWorldToObjectMatrix()', orig: '_World2Object', repl: 'GetWorldToObjectMatrix()' },
    { from: /\bUNITY_MATRIX_IT_MV\b/g, to: 'GetWorldToObjectMatrix()', orig: 'UNITY_MATRIX_IT_MV', repl: 'GetWorldToObjectMatrix()' },
  ];

  matrixMap.forEach(mm => {
    if (mm.from.test(converted)) {
      converted = converted.replace(mm.from, mm.to);
      annotations.push({
        from: mm.orig,
        to: mm.repl,
        category: 'matrix',
        explanation: `Mapped Built-in matrix constant '${mm.orig}' to URP access helper '${mm.repl}'.`,
      });
    }
  });

  // Global Lighting & Camera Replacements
  if (/\b_WorldSpaceLightPos0\b/.test(converted)) {
    converted = converted.replace(/\b_WorldSpaceLightPos0\.xyz\b/g, 'GetMainLight().direction');
    converted = converted.replace(/\b_WorldSpaceLightPos0\b/g, 'float4(GetMainLight().direction, 0.0)');
    annotations.push({
      from: '_WorldSpaceLightPos0',
      to: 'GetMainLight().direction',
      category: 'function',
      explanation: "Mapped Built-in '_WorldSpaceLightPos0' to URP 'GetMainLight().direction'.",
    });
  }

  if (/\b_LightColor0\b/.test(converted)) {
    converted = converted.replace(/\b_LightColor0\.rgb\b/g, 'GetMainLight().color');
    converted = converted.replace(/\b_LightColor0\b/g, 'float4(GetMainLight().color, 1.0)');
    annotations.push({
      from: '_LightColor0',
      to: 'GetMainLight().color',
      category: 'function',
      explanation: "Mapped Built-in '_LightColor0' to URP 'GetMainLight().color'.",
    });
  }

  if (/\b_WorldSpaceCameraPos\b/.test(converted)) {
    converted = converted.replace(/\b_WorldSpaceCameraPos\b/g, 'GetCameraPositionWS()');
    annotations.push({
      from: '_WorldSpaceCameraPos',
      to: 'GetCameraPositionWS()',
      category: 'function',
      explanation: "Mapped Built-in '_WorldSpaceCameraPos' to URP 'GetCameraPositionWS()'.",
    });
  }

  if (/\bShadeSH9\s*\(\s*([^)]+?)\s*\)/.test(converted)) {
    converted = converted.replace(/\bShadeSH9\s*\(\s*float4\s*\(\s*([^,]+?)\s*,\s*[^)]+?\s*\)\s*\)/g, 'SampleSH($1)');
    converted = converted.replace(/\bShadeSH9\s*\(\s*([^)]+?)\s*\)/g, 'SampleSH($1.xyz)');
    annotations.push({
      from: 'ShadeSH9(normal)',
      to: 'SampleSH(normalWS)',
      category: 'function',
      explanation: 'Mapped spherical harmonics ambient evaluation ShadeSH9 to URP SampleSH.',
    });
  }

  // Fog Migration
  if (/\bUNITY_FOG_COORDS\b/.test(converted)) {
    converted = converted.replace(/\bUNITY_FOG_COORDS\s*\(\s*([0-9]+)\s*\)/g, 'float fogFactor : TEXCOORD$1;');
    annotations.push({
      from: 'UNITY_FOG_COORDS(idx)',
      to: 'float fogFactor : TEXCOORDidx',
      category: 'coordinate',
      explanation: 'Replaced legacy fog coordinate macro with single scalar fog factor in Varyings struct.',
    });
  }
  if (/\bUNITY_TRANSFER_FOG\b/.test(converted)) {
    converted = converted.replace(/\bUNITY_TRANSFER_FOG\s*\(\s*([a-zA-Z0-9_]+)\s*,\s*([a-zA-Z0-9_]+)(?:\.vertex|\.pos|\.position)?\s*\)/g, '$1.fogFactor = ComputeFogFactor($1.positionCS.z);');
    annotations.push({
      from: 'UNITY_TRANSFER_FOG(o, o.vertex)',
      to: 'o.fogFactor = ComputeFogFactor(o.positionCS.z)',
      category: 'function',
      explanation: 'Calculates fog distance factor in vertex shader using URP ComputeFogFactor.',
    });
  }
  if (/\bUNITY_APPLY_FOG\b/.test(converted)) {
    converted = converted.replace(/\bUNITY_APPLY_FOG\s*\(\s*([a-zA-Z0-9_]+)(?:\.fogCoord)?\s*,\s*([a-zA-Z0-9_]+)\s*\)/g, '$2.rgb = MixFog($2.rgb, $1.fogFactor);');
    annotations.push({
      from: 'UNITY_APPLY_FOG(i.fogCoord, col)',
      to: 'col.rgb = MixFog(col.rgb, i.fogFactor)',
      category: 'function',
      explanation: 'Applies atmospheric and volumetric fog using URP MixFog.',
    });
  }

  // Texture Remapping (_MainTex -> _BaseMap, _Color -> _BaseColor)
  if (remapTextures) {
    converted = converted.replace(/\b_MainTex\b/g, '_BaseMap');
    converted = converted.replace(/\b_Color\b/g, '_BaseColor');
    annotations.push({
      from: '_MainTex / _Color',
      to: '_BaseMap / _BaseColor',
      category: 'texture',
      explanation: 'Standardized legacy _MainTex and _Color identifiers to modern URP _BaseMap and _BaseColor conventions.',
    });
  }

  // Texture Sampling: tex2D -> SAMPLE_TEXTURE2D
  const tex2dRegex = /\btex2D\s*\(\s*([a-zA-Z0-9_]+)\s*,\s*([^)]+?)\s*\)/g;
  if (tex2dRegex.test(converted)) {
    converted = converted.replace(tex2dRegex, (match, texName, uvCoord) => {
      return `SAMPLE_TEXTURE2D(${texName}, sampler${texName}, ${uvCoord})`;
    });
    annotations.push({
      from: 'tex2D(tex, uv)',
      to: 'SAMPLE_TEXTURE2D(tex, sampler_tex, uv)',
      category: 'texture',
      explanation: 'Separated combined legacy texture samplers into modern D3D11/Metal/Vulkan Texture2D and SamplerState pairs.',
    });
  }

  // tex2Dproj -> SAMPLE_TEXTURE2D_PROJ
  if (/\btex2Dproj\s*\(/g.test(converted)) {
    converted = converted.replace(/\btex2Dproj\s*\(\s*([a-zA-Z0-9_]+)\s*,\s*([^)]+?)\s*\)/g, 'SAMPLE_TEXTURE2D_PROJ($1, sampler$1, $2)');
  }
  // tex2Dlod -> SAMPLE_TEXTURE2D_LOD
  if (/\btex2Dlod\s*\(/g.test(converted)) {
    converted = converted.replace(/\btex2Dlod\s*\(\s*([a-zA-Z0-9_]+)\s*,\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/g, 'SAMPLE_TEXTURE2D_LOD($1, sampler$1, $2, $3)');
  }
  // texCUBE -> SAMPLE_TEXTURECUBE
  if (/\btexCUBE\s*\(/g.test(converted)) {
    converted = converted.replace(/\btexCUBE\s*\(\s*([a-zA-Z0-9_]+)\s*,\s*([^)]+?)\s*\)/g, 'SAMPLE_TEXTURECUBE($1, sampler$1, $2)');
  }

  // Replace legacy sampler declarations: sampler2D _BaseMap; -> TEXTURE2D(_BaseMap); SAMPLER(sampler_BaseMap);
  converted = converted.replace(
    /sampler2D\s+([a-zA-Z0-9_]+)\s*;/g,
    'TEXTURE2D($1);\nSAMPLER(sampler$1);'
  );
  converted = converted.replace(
    /samplerCUBE\s+([a-zA-Z0-9_]+)\s*;/g,
    'TEXTURECUBE($1);\nSAMPLERCUBE(sampler$1);'
  );

  // Wrap bare uniform variables into SRP Batcher CBUFFER if not already wrapped
  let cbufferCode = '';
  if (options.srpBatcher) {
    cbufferCode = generateCBuffer(properties);
    converted = wrapPropertiesInCBuffer(converted, properties, cbufferCode);
  }

  // Add missing URP ShadowCaster pass if requested and if not present
  if (options.generateShadowCaster === false) {
    converted = stripShadowCasterPasses(converted);
    annotations.push({
      from: 'ShadowCaster Pass',
      to: '// Excluded (Shadow Pass Removed)',
      category: 'structure',
      explanation: 'ShadowCaster pass removed as requested to streamline shader and reduce variant count.',
    });
  } else if (converted.includes('SubShader') && !converted.includes('"ShadowCaster"')) {
    const shadowCasterPass = `
        // --------------------------------------------------
        // URP Shadow Caster Pass (Auto-generated)
        // --------------------------------------------------
        Pass
        {
            Name "ShadowCaster"
            Tags { "LightMode" = "ShadowCaster" }

            ZWrite On
            ZTest LEqual
            ColorMask 0
            Cull Back

            HLSLPROGRAM
            #pragma target 3.5
            #pragma vertex ShadowPassVertex
            #pragma fragment ShadowPassFragment

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Shadows.hlsl"

            struct ShadowAttributes
            {
                float4 positionOS   : POSITION;
                float3 normalOS     : NORMAL;
            };

            struct ShadowVaryings
            {
                float4 positionCS   : SV_POSITION;
            };

            ShadowVaryings ShadowPassVertex(ShadowAttributes input)
            {
                ShadowVaryings output;
                float3 positionWS = TransformObjectToWorld(input.positionOS.xyz);
                float3 normalWS = TransformObjectToWorldNormal(input.normalOS);
                output.positionCS = TransformWorldToHClip(ApplyShadowBias(positionWS, normalWS, _LightDirection));
                return output;
            }

            half4 ShadowPassFragment(ShadowVaryings input) : SV_TARGET
            {
                return 0;
            }
            ENDHLSL
        }`;

    // Insert before the last closing brace of SubShader
    const lastSubShaderClose = converted.lastIndexOf('}');
    if (lastSubShaderClose !== -1) {
      // Find the second to last closing brace
      const subShaderIdx = converted.lastIndexOf('}', lastSubShaderClose - 1);
      if (subShaderIdx !== -1) {
        converted = converted.substring(0, subShaderIdx) + shadowCasterPass + '\n    ' + converted.substring(subShaderIdx);
        annotations.push({
          from: 'Missing ShadowCaster Pass',
          to: 'Pass { Name "ShadowCaster" ... }',
          category: 'structure',
          explanation: 'Generated standard URP ShadowCaster pass with shadow bias compensation for dynamic directional lights.',
        });
      }
    }
  }

  // Update Fallback
  if (converted.includes('FallBack "Diffuse"') || converted.includes('Fallback "Diffuse"')) {
    converted = converted.replace(/Fall?back\s+"Diffuse"/gi, 'FallBack "Hidden/Universal Render Pipeline/FallbackError"');
  }

  return {
    convertedCode: converted,
    changedCodeOnly: '',
    changedParts: [],
    pipeline: 'urp',
    unityVersion: options.unityVersion,
    properties,
    annotations,
    warnings,
    srpBatcherCompliant: options.srpBatcher && properties.some(p => p.type !== '2D'),
    cbufferCode,
  };
}

/**
 * Convert Legacy Unity Surface Shader to full URP Vertex/Fragment HLSL
 */
function convertSurfaceShaderToUrp(
  source: string,
  properties: ExtractedProperty[],
  options: TranspileOptions,
  annotations: ConversionAnnotation[],
  warnings: string[]
): TranspileResult {
  const remap = options.remapLegacyTextureNames !== false;
  const shaderNameMatch = source.match(/Shader\s+"([^"]+)"/);
  const shaderName = shaderNameMatch ? `${shaderNameMatch[1]}_URP` : (options.customShaderName || 'Custom/Surface_URP');

  annotations.push({
    from: '#pragma surface surf Standard/BlinnPhong',
    to: 'Complete URP Vertex + Fragment HLSL Pass',
    category: 'structure',
    explanation: 'URP does not support Built-in #pragma surface code generation. Converted into complete explicit URP PBR forward pass.',
  });

  const cbufferCode = generateCBuffer(properties);

  const textureDecls = properties
    .filter(p => p.type === '2D')
    .map(p => `TEXTURE2D(${p.name});\nSAMPLER(sampler${p.name});`)
    .join('\n');

  // Format properties block
  let propsBlock = properties
    .map(p => `        ${p.name}("${p.displayName}", ${p.type}) = ${p.defaultValue}`)
    .join('\n');
  if (!propsBlock) {
    propsBlock = `        _BaseMap("Albedo", 2D) = "white" {}\n        _BaseColor("Color", Color) = (1,1,1,1)\n        _Metallic("Metallic", Range(0,1)) = 0.0\n        _Smoothness("Smoothness", Range(0,1)) = 0.5`;
  }

  const shadowPass = options.generateShadowCaster !== false ? `
        // Shadow Caster Pass for URP dynamic shadows
        Pass
        {
            Name "ShadowCaster"
            Tags { "LightMode" = "ShadowCaster" }

            ZWrite On
            ZTest LEqual
            ColorMask 0
            Cull Back

            HLSLPROGRAM
            #pragma target 3.5
            #pragma vertex ShadowPassVertex
            #pragma fragment ShadowPassFragment

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Shadows.hlsl"

            struct ShadowAttributes
            {
                float4 positionOS : POSITION;
                float3 normalOS   : NORMAL;
            };

            struct ShadowVaryings
            {
                float4 positionCS : SV_POSITION;
            };

            ShadowVaryings ShadowPassVertex(ShadowAttributes input)
            {
                ShadowVaryings output;
                float3 positionWS = TransformObjectToWorld(input.positionOS.xyz);
                float3 normalWS = TransformObjectToWorldNormal(input.normalOS);
                output.positionCS = TransformWorldToHClip(ApplyShadowBias(positionWS, normalWS, _LightDirection));
                return output;
            }

            half4 ShadowPassFragment(ShadowVaryings input) : SV_TARGET
            {
                return 0;
            }
            ENDHLSL
        }` : '';

  const generatedShader = `Shader "${shaderName}"
{
    Properties
    {
${propsBlock}
    }

    SubShader
    {
        Tags 
        { 
            "RenderPipeline" = "UniversalPipeline"
            "RenderType" = "Opaque" 
            "Queue" = "Geometry"
        }
        LOD 300

        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode" = "UniversalForward" }

            ZWrite On
            ZTest LEqual
            Cull Back

            HLSLPROGRAM
            #pragma target 3.5
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile_fog
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE
            #pragma multi_compile _ _ADDITIONAL_LIGHTS_VERTEX _ADDITIONAL_LIGHTS
            #pragma multi_compile _ _SHADOWS_SOFT

            // --------------------------------------------------
            // URP Core & PBR Lighting Libraries
            // --------------------------------------------------
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

            // --------------------------------------------------
            // Texture & Sampler State
            // --------------------------------------------------
${textureDecls ? `            ${textureDecls}\n` : '            TEXTURE2D(_BaseMap);\n            SAMPLER(sampler_BaseMap);\n'}
            // --------------------------------------------------
            // SRP Batcher CBUFFER (100% SRP Batcher Compliant)
            // --------------------------------------------------
            ${cbufferCode.split('\n').join('\n            ')}

            struct Attributes
            {
                float4 positionOS   : POSITION;
                float3 normalOS     : NORMAL;
                float4 tangentOS    : TANGENT;
                float2 uv           : TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionCS   : SV_POSITION;
                float2 uv           : TEXCOORD0;
                float3 positionWS   : TEXCOORD1;
                float3 normalWS     : TEXCOORD2;
                float fogFactor     : TEXCOORD3;
            };

            Varyings vert(Attributes input)
            {
                Varyings output;
                
                VertexPositionInputs posInputs = GetVertexPositionInputs(input.positionOS.xyz);
                VertexNormalInputs normInputs = GetVertexNormalInputs(input.normalOS, input.tangentOS);

                output.positionCS = posInputs.positionCS;
                output.positionWS = posInputs.positionWS;
                output.normalWS   = normInputs.normalWS;
                output.uv         = input.uv;
                output.fogFactor  = ComputeFogFactor(output.positionCS.z);

                return output;
            }

            half4 frag(Varyings input) : SV_Target
            {
                // Surface Albedo & Color
                half4 albedo = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, input.uv) * _BaseColor;

                // Setup URP InputData for standard PBR lighting
                InputData inputData = (InputData)0;
                inputData.positionWS = input.positionWS;
                inputData.normalWS = normalize(input.normalWS);
                inputData.viewDirectionWS = GetWorldSpaceNormalizeViewDir(input.positionWS);
                inputData.fogCoord = InitializeInputDataFog(float4(input.positionWS, 1.0), input.fogFactor);
                inputData.normalizedScreenSpaceUV = GetNormalizedScreenSpaceUV(input.positionCS);
                inputData.shadowMask = half4(1, 1, 1, 1);

                // Setup SurfaceData (PBR parameters)
                SurfaceData surfaceData = (SurfaceData)0;
                surfaceData.albedo = albedo.rgb;
                surfaceData.alpha = albedo.a;
                surfaceData.metallic = _Metallic;
                surfaceData.smoothness = _Smoothness;
                surfaceData.normalTS = half3(0, 0, 1);
                surfaceData.occlusion = 1.0;

                // Evaluate Universal PBR Lighting (Main Light + Additional Lights + Global Illumination SH)
                half4 finalColor = UniversalFragmentPBR(inputData, surfaceData);
                finalColor.rgb = MixFog(finalColor.rgb, inputData.fogCoord);

                return finalColor;
            }
            ENDHLSL
        }
${shadowPass}
    }
    FallBack "Hidden/Universal Render Pipeline/FallbackError"
}`;

  return {
    convertedCode: generatedShader,
    changedCodeOnly: '',
    changedParts: [],
    pipeline: 'urp',
    unityVersion: options.unityVersion,
    properties,
    annotations,
    warnings,
    srpBatcherCompliant: true,
    cbufferCode,
  };
}

/**
 * Extract properties from Unity Built-in shader code
 */
function extractBuiltinProperties(
  code: string,
  properties: ExtractedProperty[],
  annotations: ConversionAnnotation[],
  remap: boolean
): void {
  // Find Properties block: Properties { ... }
  const propsMatch = code.match(/Properties\s*\{([^}]+)\}/);
  if (!propsMatch) {
    // If no Properties block, extract bare uniform variables: float4 _Color; sampler2D _MainTex; etc.
    extractUniforms(code, properties, annotations);
    return;
  }

  const propsBody = propsMatch[1];
  // Regex for ShaderLab property: _PropName ("Display Name", Type) = defaultValue
  const propRegex = /([a-zA-Z0-9_]+)\s*\(\s*"([^"]*)"\s*,\s*([a-zA-Z0-9_]+)(?:\s*\([^)]*\))?\s*\)\s*=\s*([^;\n]+)/g;
  let match;

  while ((match = propRegex.exec(propsBody)) !== null) {
    let propName = match[1].trim();
    let displayName = match[2].trim();
    const typeStr = match[3].trim().toLowerCase();
    const defaultValue = match[4].trim();

    if (remap) {
      if (propName === '_MainTex') propName = '_BaseMap';
      if (propName === '_Color') propName = '_BaseColor';
    }

    let pType: ExtractedProperty['type'] = 'Float';
    if (typeStr === 'color') pType = 'Color';
    else if (typeStr === 'vector') pType = 'Vector';
    else if (typeStr === '2d' || typeStr === 'cube') pType = '2D';
    else if (typeStr === 'int' || typeStr === 'integer') pType = 'Int';
    else if (typeStr === 'range' || typeStr === 'float') pType = 'Float';

    properties.push({
      name: propName,
      glslName: propName,
      type: pType,
      defaultValue,
      displayName,
    });

    annotations.push({
      from: `Built-in Property ${match[1]} (${match[3]})`,
      to: `${propName} (${pType}) in CBUFFER_START(UnityPerMaterial)`,
      category: 'buffer',
      explanation: `Extracted material property '${propName}' for SRP Batcher layout.`,
    });
  }
}

/**
 * Wrap standalone variable declarations into SRP CBUFFER
 */
function wrapPropertiesInCBuffer(
  code: string,
  properties: ExtractedProperty[],
  cbufferCode: string
): string {
  if (!cbufferCode || cbufferCode.includes('// No material')) return code;

  // Check if CBUFFER already exists in code
  if (code.includes('CBUFFER_START(UnityPerMaterial)')) {
    return code;
  }

  // Remove duplicate bare variable declarations that are now inside the CBUFFER
  let result = code;
  properties.forEach(p => {
    if (p.type !== '2D') {
      const bareDeclRegex = new RegExp(`(?:float|half|fixed|int)[1-4]?\\s+${p.name}\\s*;`, 'g');
      result = result.replace(bareDeclRegex, `/* ${p.name} allocated inside UnityPerMaterial CBUFFER */`);
    }
  });

  // Inject CBUFFER right before vertex/fragment struct declarations or right after includes
  const includeMatch = result.search(/#include\s*["<][^">]+[">]/);
  if (includeMatch !== -1) {
    const afterInclude = result.indexOf('\n', includeMatch);
    result = result.substring(0, afterInclude + 1) + '\n            ' + cbufferCode.split('\n').join('\n            ') + '\n' + result.substring(afterInclude + 1);
  }

  return result;
}

/**
 * Transpile standard GLSL or Shadertoy to modern Unity SRP
 */
function transpileGlslOrShadertoy(
  rawCode: string,
  options: TranspileOptions
): TranspileResult {
  const annotations: ConversionAnnotation[] = [];
  const warnings: string[] = [];
  const properties: ExtractedProperty[] = [];

  const isShadertoy = rawCode.includes('mainImage') || rawCode.includes('iTime') || rawCode.includes('iResolution');
  const isCompute = rawCode.includes('layout(local_size') || rawCode.includes('gl_GlobalInvocationID') || rawCode.includes('imageStore');
  const isCustomFunctionNode = options.targetPipeline === 'shadergraph';

  // 1. Extract Uniforms & Variables
  extractUniforms(rawCode, properties, annotations);

  // 2. Perform core language token replacements
  let transformedCode = replaceGlslKeywordsAndFunctions(rawCode, annotations, warnings);

  // 3. Handle coordinate and clip space adaptations
  transformedCode = adaptCoordinateSystem(transformedCode, options, annotations);

  // 4. Handle matrix multiplications
  transformedCode = adaptMatrixMultiplications(transformedCode, annotations);

  // 5. Wrap into Pipeline-Specific Structure
  let finalShaderCode = '';
  let cbufferCode = '';

  if (options.srpBatcher) {
    cbufferCode = generateCBuffer(properties);
  }

  switch (options.targetPipeline) {
    case 'urp':
      finalShaderCode = generateUrpShader(transformedCode, properties, options, cbufferCode, isShadertoy);
      break;
    case 'hdrp':
      finalShaderCode = generateHdrpShader(transformedCode, properties, options, cbufferCode, isShadertoy);
      break;
    case 'shadergraph':
      finalShaderCode = generateShaderGraphHlsl(transformedCode, options, annotations);
      break;
    case 'compute':
      finalShaderCode = generateComputeShader(transformedCode, properties, options);
      break;
    case 'srp_core':
      finalShaderCode = generateSrpCoreInclude(transformedCode, options);
      break;
  }

  // 6. Generate Shader Graph helper specs if requested
  const shaderGraphNode = isCustomFunctionNode
    ? extractShaderGraphNodeInfo(transformedCode, options)
    : undefined;

  return {
    convertedCode: finalShaderCode,
    changedCodeOnly: '',
    changedParts: [],
    pipeline: options.targetPipeline,
    unityVersion: options.unityVersion,
    properties,
    annotations,
    warnings,
    srpBatcherCompliant: options.srpBatcher && properties.some(p => p.type !== '2D'),
    cbufferCode,
    shaderGraphNode,
  };
}

/**
 * Extract GLSL uniforms and map them to Unity ShaderLab Properties
 */
function extractUniforms(
  code: string,
  properties: ExtractedProperty[],
  annotations: ConversionAnnotation[]
): void {
  // Regex for standard GLSL uniforms: uniform vec4 _Color; uniform float _Speed; uniform sampler2D _MainTex;
  const uniformRegex = /uniform\s+([a-zA-Z0-9_]+)\s+([a-zA-Z0-9_]+)\s*(?:=\s*([^;]+))?\s*;/g;
  let match;

  while ((match = uniformRegex.exec(code)) !== null) {
    const glslType = match[1];
    const varName = match[2];
    const explicitDefault = match[3]?.trim();

    // Map GLSL type to Unity Property type
    let unityType: ExtractedProperty['type'] = 'Float';
    let defaultValue = '1.0';
    let displayName = varName.replace(/^[u_]+/, '').replace(/([A-Z])/g, ' $1').trim();
    if (!displayName) displayName = varName;

    if (glslType === 'float' || glslType === 'int') {
      unityType = glslType === 'int' ? 'Int' : 'Float';
      defaultValue = explicitDefault || '1.0';
    } else if (glslType === 'vec4') {
      if (varName.toLowerCase().includes('color') || varName.toLowerCase().includes('tint')) {
        unityType = 'Color';
        defaultValue = explicitDefault || '(1, 1, 1, 1)';
      } else {
        unityType = 'Vector';
        defaultValue = explicitDefault || '(0, 0, 0, 0)';
      }
    } else if (glslType === 'vec3') {
      unityType = 'Vector';
      defaultValue = explicitDefault || '(0, 0, 0, 0)';
    } else if (glslType === 'vec2') {
      unityType = 'Vector';
      defaultValue = explicitDefault || '(1, 1, 0, 0)';
    } else if (glslType === 'sampler2D' || glslType === 'sampler2DShadow') {
      unityType = '2D';
      defaultValue = '"white" {}';
    }

    // Ensure Unity naming convention with leading underscore
    const unityPropName = varName.startsWith('_') ? varName : `_${varName}`;

    properties.push({
      name: unityPropName,
      glslName: varName,
      type: unityType,
      defaultValue,
      displayName,
    });

    annotations.push({
      from: `uniform ${glslType} ${varName}`,
      to: `${unityPropName} ("${displayName}", ${unityType})`,
      category: 'buffer',
      explanation: `Converted GLSL uniform '${varName}' to Unity Material Property and grouped into SRP Batcher CBUFFER.`,
    });
  }

  // Handle Shadertoy implicit inputs if present
  if (code.includes('iTime') && !properties.some(p => p.glslName === 'iTime')) {
    annotations.push({
      from: 'iTime (Shadertoy uniform)',
      to: '_Time.y (Unity Built-in Vector)',
      category: 'buffer',
      explanation: "Mapped Shadertoy 'iTime' to Unity's global time vector '_Time.y'.",
    });
  }
  if (code.includes('iResolution') && !properties.some(p => p.glslName === 'iResolution')) {
    annotations.push({
      from: 'iResolution (Shadertoy uniform)',
      to: '_ScreenParams (Unity Built-in Vector)',
      category: 'buffer',
      explanation: "Mapped Shadertoy 'iResolution' to Unity's '_ScreenParams.xy'.",
    });
  }
}

/**
 * Replace GLSL types, built-in functions, and keywords with HLSL equivalents
 */
function replaceGlslKeywordsAndFunctions(
  code: string,
  annotations: ConversionAnnotation[],
  warnings: string[]
): string {
  let result = code;

  // Type Mappings
  const typeMap: Array<{ glsl: RegExp; hlsl: string; desc: string }> = [
    { glsl: /\bvec2\b/g, hlsl: 'float2', desc: 'vec2 -> float2' },
    { glsl: /\bvec3\b/g, hlsl: 'float3', desc: 'vec3 -> float3' },
    { glsl: /\bvec4\b/g, hlsl: 'float4', desc: 'vec4 -> float4' },
    { glsl: /\bivec2\b/g, hlsl: 'int2', desc: 'ivec2 -> int2' },
    { glsl: /\bivec3\b/g, hlsl: 'int3', desc: 'ivec3 -> int3' },
    { glsl: /\bivec4\b/g, hlsl: 'int4', desc: 'ivec4 -> int4' },
    { glsl: /\buvec2\b/g, hlsl: 'uint2', desc: 'uvec2 -> uint2' },
    { glsl: /\buvec3\b/g, hlsl: 'uint3', desc: 'uvec3 -> uint3' },
    { glsl: /\buvec4\b/g, hlsl: 'uint4', desc: 'uvec4 -> uint4' },
    { glsl: /\bbvec2\b/g, hlsl: 'bool2', desc: 'bvec2 -> bool2' },
    { glsl: /\bbvec3\b/g, hlsl: 'bool3', desc: 'bvec3 -> bool3' },
    { glsl: /\bbvec4\b/g, hlsl: 'bool4', desc: 'bvec4 -> bool4' },
    { glsl: /\bmat2\b/g, hlsl: 'float2x2', desc: 'mat2 -> float2x2' },
    { glsl: /\bmat3\b/g, hlsl: 'float3x3', desc: 'mat3 -> float3x3' },
    { glsl: /\bmat4\b/g, hlsl: 'float4x4', desc: 'mat4 -> float4x4' },
    { glsl: /\bmat2x2\b/g, hlsl: 'float2x2', desc: 'mat2x2 -> float2x2' },
    { glsl: /\bmat3x3\b/g, hlsl: 'float3x3', desc: 'mat3x3 -> float3x3' },
    { glsl: /\bmat4x4\b/g, hlsl: 'float4x4', desc: 'mat4x4 -> float4x4' },
  ];

  typeMap.forEach(item => {
    if (item.glsl.test(result)) {
      result = result.replace(item.glsl, item.hlsl);
      annotations.push({
        from: item.glsl.source.replace(/\\b/g, ''),
        to: item.hlsl,
        category: 'type',
        explanation: `Mapped GLSL vector/matrix type to HLSL '${item.hlsl}'.`,
      });
    }
  });

  // Math Functions Mappings
  const funcMap: Array<{ glsl: RegExp; hlsl: string; desc: string }> = [
    { glsl: /\bmix\s*\(/g, hlsl: 'lerp(', desc: 'mix() -> lerp()' },
    { glsl: /\bfract\s*\(/g, hlsl: 'frac(', desc: 'fract() -> frac()' },
    { glsl: /\binversesqrt\s*\(/g, hlsl: 'rsqrt(', desc: 'inversesqrt() -> rsqrt()' },
    { glsl: /\bdFdx\s*\(/g, hlsl: 'ddx(', desc: 'dFdx() -> ddx()' },
    { glsl: /\bdFdy\s*\(/g, hlsl: 'ddy(', desc: 'dFdy() -> ddy()' },
    { glsl: /\batan\s*\(\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/g, hlsl: 'atan2($1, $2)', desc: 'atan(y, x) -> atan2(y, x)' },
  ];

  funcMap.forEach(item => {
    if (item.glsl.test(result)) {
      result = result.replace(item.glsl, item.hlsl);
      annotations.push({
        from: item.desc.split(' -> ')[0],
        to: item.desc.split(' -> ')[1],
        category: 'function',
        explanation: `Replaced GLSL intrinsic function '${item.desc.split(' -> ')[0]}' with HLSL equivalent.`,
      });
    }
  });

  // GLSL mod(x, y) note: In GLSL mod is mathematical Euclidean (handles negatives smoothly), whereas HLSL fmod is C-style remainder.
  // We can convert mod(x, y) to (x - y * floor(x / y)) for exact behavior or fmod for simple cases.
  if (/\bmod\s*\(/g.test(result)) {
    result = result.replace(/\bmod\s*\(/g, 'fmod(');
    warnings.push(
      "Note: GLSL 'mod(x, y)' was converted to HLSL 'fmod(x, y)'. If your shader uses negative inputs, consider 'x - y * floor(x / y)' for exact GLSL Euclidean modulus behavior."
    );
    annotations.push({
      from: 'mod(x, y)',
      to: 'fmod(x, y)',
      category: 'function',
      explanation: "Converted GLSL 'mod' to HLSL 'fmod'. Note potential negative value sign difference.",
    });
  }

  // Texture Sampling: texture(sampler, uv) -> SAMPLE_TEXTURE2D(tex, sampler_tex, uv)
  // or texture2D(sampler, uv)
  const textureRegex = /\b(?:texture|texture2D)\s*\(\s*([a-zA-Z0-9_]+)\s*,\s*([^)]+?)\s*\)/g;
  if (textureRegex.test(result)) {
    result = result.replace(textureRegex, (match, texName, uvCoord) => {
      const formattedTex = texName.startsWith('_') ? texName : `_${texName}`;
      return `SAMPLE_TEXTURE2D(${formattedTex}, sampler${formattedTex}, ${uvCoord})`;
    });
    annotations.push({
      from: 'texture(sampler, uv)',
      to: 'SAMPLE_TEXTURE2D(tex, sampler_tex, uv)',
      category: 'texture',
      explanation: 'Separated combined OpenGL sampler into modern Unity SRP Texture2D + SamplerState pair.',
    });
  }

  // Texture LOD: textureLod(sampler, uv, lod) -> SAMPLE_TEXTURE2D_LOD(tex, sampler_tex, uv, lod)
  const textureLodRegex = /\b(?:textureLod|texture2DLod)\s*\(\s*([a-zA-Z0-9_]+)\s*,\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/g;
  if (textureLodRegex.test(result)) {
    result = result.replace(textureLodRegex, (match, texName, uvCoord, lod) => {
      const formattedTex = texName.startsWith('_') ? texName : `_${texName}`;
      return `SAMPLE_TEXTURE2D_LOD(${formattedTex}, sampler${formattedTex}, ${uvCoord}, ${lod})`;
    });
    annotations.push({
      from: 'textureLod(sampler, uv, lod)',
      to: 'SAMPLE_TEXTURE2D_LOD(tex, sampler_tex, uv, lod)',
      category: 'texture',
      explanation: 'Converted explicit LOD texture sampling to Unity SRP macro.',
    });
  }

  // Shadertoy Inputs Mappings
  if (/\biTime\b/.test(result)) {
    result = result.replace(/\biTime\b/g, '_Time.y');
  }
  if (/\biResolution\b/.test(result)) {
    result = result.replace(/\biResolution\.xy\b/g, '_ScreenParams.xy');
    result = result.replace(/\biResolution\b/g, 'float3(_ScreenParams.xy, 1.0)');
  }
  if (/\biMouse\b/.test(result)) {
    result = result.replace(/\biMouse\b/g, 'float4(0, 0, 0, 0) /* _iMouse placeholder */');
  }

  return result;
}

/**
 * Handle coordinate system transformations (Clip space Z [0, 1] vs [-1, 1], UV origin)
 */
function adaptCoordinateSystem(
  code: string,
  options: TranspileOptions,
  annotations: ConversionAnnotation[]
): string {
  let result = code;

  // gl_FragCoord -> input.positionCS
  if (/\bgl_FragCoord\b/.test(result)) {
    result = result.replace(/\bgl_FragCoord\b/g, 'input.positionCS');
    annotations.push({
      from: 'gl_FragCoord',
      to: 'input.positionCS',
      category: 'coordinate',
      explanation: "Mapped OpenGL 'gl_FragCoord' window coordinate to SV_POSITION / input.positionCS.",
    });
  }

  // gl_FrontFacing -> input.isFrontFace / SV_IsFrontFace
  if (/\bgl_FrontFacing\b/.test(result)) {
    result = result.replace(/\bgl_FrontFacing\b/g, 'isFrontFace');
    annotations.push({
      from: 'gl_FrontFacing',
      to: 'isFrontFace : SV_IsFrontFace',
      category: 'coordinate',
      explanation: "Mapped 'gl_FrontFacing' to HLSL SV_IsFrontFace primitive semantic.",
    });
  }

  // gl_VertexID / gl_InstanceID -> SV_VertexID / SV_InstanceID
  if (/\bgl_VertexID\b/.test(result)) {
    result = result.replace(/\bgl_VertexID\b/g, 'vertexID');
  }
  if (/\bgl_InstanceID\b/.test(result)) {
    result = result.replace(/\bgl_InstanceID\b/g, 'instanceID');
  }

  return result;
}

/**
 * Adapt Matrix and Vector multiplication expressions
 */
function adaptMatrixMultiplications(
  code: string,
  annotations: ConversionAnnotation[]
): string {
  let result = code;

  // Check for matrix * vector patterns: (u_ModelMatrix * vec4(...)) or (m * v)
  const matMulRegex = /\b([a-zA-Z0-9_]+Matrix(?:[a-zA-Z0-9_]*))\s*\*\s*([a-zA-Z0-9_]+(?:\([^)]*\))?)/g;
  if (matMulRegex.test(result)) {
    result = result.replace(matMulRegex, 'mul($1, $2)');
    annotations.push({
      from: 'matrix * vector',
      to: 'mul(matrix, vector)',
      category: 'matrix',
      explanation: "Translated GLSL matrix multiplication operator '*' to HLSL 'mul()' intrinsic.",
    });
  }

  return result;
}

/**
 * Generate SRP Batcher compliant CBUFFER_START(UnityPerMaterial)
 */
function generateCBuffer(properties: ExtractedProperty[]): string {
  const scalarAndVectorProps = properties.filter(p => p.type !== '2D');
  if (scalarAndVectorProps.length === 0) {
    return '// No material properties require CBUFFER allocation';
  }

  let cbuffer = `CBUFFER_START(UnityPerMaterial)\n`;
  scalarAndVectorProps.forEach(prop => {
    let hlslType = 'float';
    if (prop.type === 'Color') hlslType = 'float4';
    else if (prop.type === 'Vector') hlslType = 'float4';
    else if (prop.type === 'Float') hlslType = 'float';
    else if (prop.type === 'Int') hlslType = 'int';

    cbuffer += `    ${hlslType} ${prop.name};\n`;
  });
  cbuffer += `CBUFFER_END`;

  return cbuffer;
}

/**
 * Generate full modern Unity URP ShaderLab HLSL file
 */
function generateUrpShader(
  bodyCode: string,
  properties: ExtractedProperty[],
  options: TranspileOptions,
  cbufferCode: string,
  isShadertoy: boolean
): string {
  const shaderName = options.customShaderName || 'Custom/URP_ConvertedShader';

  // Format properties block
  let propsBlock = '';
  if (properties.length > 0) {
    propsBlock = properties
      .map(p => {
        if (p.type === 'Color') return `        ${p.name}("${p.displayName}", Color) = ${p.defaultValue}`;
        if (p.type === 'Vector') return `        ${p.name}("${p.displayName}", Vector) = ${p.defaultValue}`;
        if (p.type === 'Float') return `        ${p.name}("${p.displayName}", Float) = ${p.defaultValue}`;
        if (p.type === '2D') return `        ${p.name}("${p.displayName}", 2D) = ${p.defaultValue}`;
        if (p.type === 'Int') return `        ${p.name}("${p.displayName}", Int) = ${p.defaultValue}`;
        return `        ${p.name}("${p.displayName}", Float) = 1.0`;
      })
      .join('\n');
  } else {
    propsBlock = `        _BaseColor("Base Color", Color) = (1, 1, 1, 1)\n        _BaseMap("Base Map", 2D) = "white" {}`;
  }

  // Texture declarations
  const texture2DDecls = properties
    .filter(p => p.type === '2D')
    .map(p => `TEXTURE2D(${p.name});\nSAMPLER(sampler${p.name});`)
    .join('\n');

  // Surface mode tags
  let blendTags = '        ZWrite On\n        Cull Back';
  let queueTag = '"Queue"="Geometry" "RenderType"="Opaque"';

  if (options.surfaceType === 'transparent') {
    blendTags = '        Blend SrcAlpha OneMinusSrcAlpha\n        ZWrite Off\n        Cull Back';
    queueTag = '"Queue"="Transparent" "RenderType"="Transparent"';
  } else if (options.surfaceType === 'additive') {
    blendTags = '        Blend One One\n        ZWrite Off\n        Cull Off';
    queueTag = '"Queue"="Transparent" "RenderType"="Transparent"';
  } else if (options.surfaceType === 'alphatest') {
    blendTags = '        ZWrite On\n        Cull Back';
    queueTag = '"Queue"="AlphaTest" "RenderType"="TransparentCutout"';
  }

  // Clean GLSL body into HLSL function
  const processedBody = cleanBodyForFragment(bodyCode, isShadertoy);

  const shadowPass = options.generateShadowCaster !== false ? `
        // Shadow Caster Pass for dynamic URP shadow rendering
        Pass
        {
            Name "ShadowCaster"
            Tags { "LightMode" = "ShadowCaster" }

            ZWrite On
            ZTest LEqual
            ColorMask 0
            Cull Back

            HLSLPROGRAM
            #pragma target 3.5
            #pragma vertex ShadowPassVertex
            #pragma fragment ShadowPassFragment

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Shadows.hlsl"

            struct ShadowAttributes
            {
                float4 positionOS   : POSITION;
                float3 normalOS     : NORMAL;
            };

            struct ShadowVaryings
            {
                float4 positionCS   : SV_POSITION;
            };

            ShadowVaryings ShadowPassVertex(ShadowAttributes input)
            {
                ShadowVaryings output;
                float3 positionWS = TransformObjectToWorld(input.positionOS.xyz);
                float3 normalWS = TransformObjectToWorldNormal(input.normalOS);
                output.positionCS = TransformWorldToHClip(ApplyShadowBias(positionWS, normalWS, _LightDirection));
                return output;
            }

            half4 ShadowPassFragment(ShadowVaryings input) : SV_TARGET
            {
                return 0;
            }
            ENDHLSL
        }` : '';

  return `Shader "${shaderName}"
{
    Properties
    {
${propsBlock}
    }

    SubShader
    {
        Tags 
        { 
            "RenderPipeline" = "UniversalPipeline"
            ${queueTag} 
        }
        LOD 200

        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode" = "UniversalForward" }

${blendTags}

            HLSLPROGRAM
            #pragma target 3.5
            #pragma vertex vert
            #pragma fragment frag

            // --------------------------------------------------
            // Unity URP Core Includes
            // --------------------------------------------------
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

            // --------------------------------------------------
            // Texture & Sampler State Declarations
            // --------------------------------------------------
${texture2DDecls ? `            ${texture2DDecls}\n` : ''}
            // --------------------------------------------------
            // SRP Batcher CBUFFER Layout (100% SRP Batcher Compliant)
            // --------------------------------------------------
            ${cbufferCode.split('\n').join('\n            ')}

            // --------------------------------------------------
            // Vertex & Fragment Data Structures
            // --------------------------------------------------
            struct Attributes
            {
                float4 positionOS   : POSITION;
                float3 normalOS     : NORMAL;
                float4 tangentOS    : TANGENT;
                float2 uv           : TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionCS   : SV_POSITION;
                float2 uv           : TEXCOORD0;
                float3 positionWS   : TEXCOORD1;
                float3 normalWS     : TEXCOORD2;
            };

            // --------------------------------------------------
            // Vertex Shader
            // --------------------------------------------------
            Varyings vert(Attributes input)
            {
                Varyings output;
                
                // Object Space to World Space
                VertexPositionInputs positionInputs = GetVertexPositionInputs(input.positionOS.xyz);
                VertexNormalInputs normalInputs = GetVertexNormalInputs(input.normalOS, input.tangentOS);

                output.positionCS = positionInputs.positionCS;
                output.positionWS = positionInputs.positionWS;
                output.normalWS   = normalInputs.normalWS;
                output.uv         = input.uv;

                return output;
            }

            // --------------------------------------------------
            // Converted GLSL Logic & Fragment Pass
            // --------------------------------------------------
            ${processedBody.split('\n').join('\n            ')}

            ENDHLSL
        }
${shadowPass}
    }
    FallBack "Hidden/Universal Render Pipeline/FallbackError"
}`;
}

/**
 * Generate full modern Unity HDRP ShaderLab HLSL file
 */
function generateHdrpShader(
  bodyCode: string,
  properties: ExtractedProperty[],
  options: TranspileOptions,
  cbufferCode: string,
  isShadertoy: boolean
): string {
  const shaderName = options.customShaderName || 'Custom/HDRP_ConvertedShader';

  let propsBlock = properties
    .map(p => `        ${p.name}("${p.displayName}", ${p.type}) = ${p.defaultValue}`)
    .join('\n');

  if (!propsBlock) {
    propsBlock = `        _BaseColor("Base Color", Color) = (1, 1, 1, 1)`;
  }

  const processedBody = cleanBodyForFragment(bodyCode, isShadertoy);

  return `Shader "${shaderName}"
{
    Properties
    {
${propsBlock}
    }

    SubShader
    {
        Tags 
        { 
            "RenderPipeline" = "HDRenderPipeline"
            "RenderType" = "Opaque" 
            "Queue" = "Geometry"
        }
        LOD 300

        Pass
        {
            Name "ForwardOnly"
            Tags { "LightMode" = "ForwardOnly" }

            ZWrite On
            ZTest LEqual
            Cull Back

            HLSLPROGRAM
            #pragma target 4.5
            #pragma vertex vert
            #pragma fragment frag

            // --------------------------------------------------
            // Unity HDRP Includes
            // --------------------------------------------------
            #include "Packages/com.unity.render-pipelines.core/ShaderLibrary/Common.hlsl"
            #include "Packages/com.unity.render-pipelines.high-definition/Runtime/ShaderLibrary/ShaderVariables.hlsl"

            // --------------------------------------------------
            // SRP Batcher CBUFFER
            // --------------------------------------------------
            ${cbufferCode.split('\n').join('\n            ')}

            struct Attributes
            {
                float3 positionOS : POSITION;
                float3 normalOS   : NORMAL;
                float2 uv         : TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float3 positionRWS: TEXCOORD1;
                float2 uv         : TEXCOORD0;
            };

            Varyings vert(Attributes input)
            {
                Varyings output;
                float3 positionRWS = TransformObjectToWorld(input.positionOS);
                output.positionRWS = positionRWS;
                output.positionCS = TransformWorldToHClip(positionRWS);
                output.uv = input.uv;
                return output;
            }

            ${processedBody.split('\n').join('\n            ')}

            ENDHLSL
        }
    }
    FallBack "Hidden/HD Render Pipeline/FallbackError"
}`;
}

/**
 * Generate Shader Graph Custom Function .hlsl Include File
 */
function generateShaderGraphHlsl(
  bodyCode: string,
  options: TranspileOptions,
  annotations: ConversionAnnotation[]
): string {
  const funcName = 'GlslConvertedNode';

  annotations.push({
    from: 'GLSL Custom Shader Function',
    to: `void ${funcName}_float() / void ${funcName}_half()`,
    category: 'structure',
    explanation: 'Generated Shader Graph Custom Function node with dual float/half precision overloads for Unity 2022/2023/6000.',
  });

  return `// Unity Shader Graph Custom Function Include File
// Add a "Custom Function" Node in Shader Graph:
// 1. Type: File
// 2. Source: Reference this .hlsl file
// 3. Name: ${funcName}
// --------------------------------------------------

#ifndef GLSL_CONVERTED_NODE_INCLUDED
#define GLSL_CONVERTED_NODE_INCLUDED

// Internal implementation logic
${bodyCode}

// --------------------------------------------------
// Shader Graph Custom Function Entry Points
// --------------------------------------------------

// Single-Precision (Float) Overload
void ${funcName}_float(
    float3 PositionWS,
    float2 UV,
    float Time,
    float4 TintColor,
    out float4 OutColor,
    out float3 OutNormal
)
{
    // Default output bindings
    OutColor = TintColor;
    OutNormal = float3(0.0, 1.0, 0.0);

    #if defined(SHADERGRAPH_PREVIEW)
        OutColor = float4(UV, sin(Time), 1.0);
    #else
        // Evaluate converted logic
        #if defined(mainImage)
            mainImage(OutColor, UV * _ScreenParams.xy);
        #endif
    #endif
}

// Half-Precision (Half) Overload for mobile efficiency
void ${funcName}_half(
    half3 PositionWS,
    half2 UV,
    half Time,
    half4 TintColor,
    out half4 OutColor,
    out half3 OutNormal
)
{
    float4 outColorFloat;
    float3 outNormalFloat;
    ${funcName}_float(PositionWS, UV, Time, TintColor, outColorFloat, outNormalFloat);
    OutColor = half4(outColorFloat);
    OutNormal = half3(outNormalFloat);
}

#endif // GLSL_CONVERTED_NODE_INCLUDED
`;
}

/**
 * Generate Unity Compute Shader (.compute)
 */
function generateComputeShader(
  bodyCode: string,
  properties: ExtractedProperty[],
  options: TranspileOptions
): string {
  return `// Unity Compute Shader (.compute)
#pragma kernel CSMain

// Textures & Buffers
RWTexture2D<float4> Result;
RWStructuredBuffer<float4> DataBuffer;

// Uniforms
${properties.map(p => `${p.type === 'Color' || p.type === 'Vector' ? 'float4' : 'float'} ${p.name};`).join('\n')}

${bodyCode}

[numthreads(8, 8, 1)]
void CSMain(uint3 id : SV_DispatchThreadID)
{
    // id.xy represents the pixel/cell coordinates
    float2 uv = float2((id.xy + 0.5) / 512.0);

    float4 color = float4(uv.x, uv.y, 0.5 + 0.5 * sin(_Time.y), 1.0);
    Result[id.xy] = color;
}
`;
}

/**
 * Generate Cross-Pipeline SRP Core Include (.hlsl)
 */
function generateSrpCoreInclude(bodyCode: string, options: TranspileOptions): string {
  return `// Cross-Pipeline Unity SRP Core Include (.hlsl)
// Compatible with both URP and HDRP
#ifndef SRP_CORE_CONVERTED_INCLUDED
#define SRP_CORE_CONVERTED_INCLUDED

#include "Packages/com.unity.render-pipelines.core/ShaderLibrary/Common.hlsl"

${bodyCode}

#endif // SRP_CORE_CONVERTED_INCLUDED
`;
}

/**
 * Clean and structure GLSL body for Unity fragment pass
 */
function cleanBodyForFragment(code: string, isShadertoy: boolean): string {
  // If it's a Shadertoy mainImage shader
  if (isShadertoy && code.includes('mainImage')) {
    return `${code}

float4 frag(Varyings input) : SV_Target
{
    float4 fragColor = float4(0, 0, 0, 1);
    float2 fragCoord = input.uv * _ScreenParams.xy;

    mainImage(fragColor, fragCoord);

    return fragColor;
}`;
  }

  // If it already has a main() or frag()
  if (code.includes('void main(')) {
    return code.replace('void main(', 'float4 frag(Varyings input) : SV_Target\n{\n    // Original GLSL main()\n');
  }

  // Generic fallback wrapper
  return `${code}

float4 frag(Varyings input) : SV_Target
{
    float4 finalColor = float4(input.uv, 0.5, 1.0);
    return finalColor;
}`;
}

/**
 * Extract node parameters for Shader Graph preview UI
 */
function extractShaderGraphNodeInfo(code: string, options: TranspileOptions) {
  return {
    functionName: 'GlslConvertedNode',
    inputs: [
      { name: 'PositionWS', type: 'Vector3' },
      { name: 'UV', type: 'Vector2' },
      { name: 'Time', type: 'Float' },
      { name: 'TintColor', type: 'Vector4' },
    ],
    outputs: [
      { name: 'OutColor', type: 'Vector4' },
      { name: 'OutNormal', type: 'Vector3' },
    ],
    hlslBody: code,
  };
}
