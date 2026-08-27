import React from 'react';

export type TokenType =
  | 'comment'
  | 'string'
  | 'preprocessor'
  | 'structural'
  | 'keyword'
  | 'type'
  | 'semantic'
  | 'srp-function'
  | 'uniform'
  | 'number'
  | 'operator'
  | 'punctuation'
  | 'identifier'
  | 'plain';

export interface CodeToken {
  text: string;
  type: TokenType;
}

// Regex collections for shader languages
const STRUCTURAL_BLOCKS = new Set([
  'Shader',
  'SubShader',
  'Pass',
  'Tags',
  'Properties',
  'LOD',
  'ZWrite',
  'ZTest',
  'Blend',
  'BlendOp',
  'Cull',
  'ColorMask',
  'Stencil',
  'Comp',
  'PassFront',
  'PassBack',
  'Fail',
  'ZFail',
  'Ref',
  'ReadMask',
  'WriteMask',
  'HLSLPROGRAM',
  'ENDHLSL',
  'CGPROGRAM',
  'ENDCG',
  'HLSLINCLUDE',
  'ENDHLSLINCLUDE',
  'CBUFFER_START',
  'CBUFFER_END',
  'UnityPerMaterial',
  'UnityPerDraw',
  'UnityPerCamera',
]);

const PREPROCESSOR_KEYWORDS = new Set([
  '#include',
  '#pragma',
  '#define',
  '#undef',
  '#if',
  '#ifdef',
  '#ifndef',
  '#elif',
  '#else',
  '#endif',
  '#error',
  '#warning',
  '#line',
]);

const HLSL_KEYWORDS = new Set([
  'struct',
  'return',
  'if',
  'else',
  'for',
  'while',
  'do',
  'switch',
  'case',
  'default',
  'break',
  'continue',
  'discard',
  'in',
  'out',
  'inout',
  'const',
  'static',
  'uniform',
  'varying',
  'attribute',
  'layout',
  'precision',
  'highp',
  'mediump',
  'lowp',
  'inline',
  'extern',
  'volatile',
  'register',
  'packoffset',
  'true',
  'false',
]);

const TYPES = new Set([
  'void',
  'bool',
  'bool2',
  'bool3',
  'bool4',
  'int',
  'int2',
  'int3',
  'int4',
  'uint',
  'uint2',
  'uint3',
  'uint4',
  'float',
  'float2',
  'float3',
  'float4',
  'half',
  'half2',
  'half3',
  'half4',
  'fixed',
  'fixed2',
  'fixed3',
  'fixed4',
  'double',
  'double2',
  'double3',
  'double4',
  'float2x2',
  'float3x3',
  'float4x4',
  'half2x2',
  'half3x3',
  'half4x4',
  'matrix',
  'vector',
  'sampler',
  'sampler2D',
  'sampler3D',
  'samplerCUBE',
  'sampler2DShadow',
  'sampler2DArray',
  'TEXTURE2D',
  'TEXTURE2D_X',
  'TEXTURE2D_ARRAY',
  'TEXTURECUBE',
  'TEXTURE3D',
  'SAMPLER',
  'SamplerState',
  'SamplerComparisonState',
  'Texture2D',
  'Texture2DArray',
  'TextureCube',
  'Texture3D',
  'RWTexture2D',
  'RWStructuredBuffer',
  'StructuredBuffer',
  'ByteAddressBuffer',
  'Attributes',
  'Varyings',
  'InputData',
  'SurfaceData',
  'Light',
  'BRDFData',
  'appdata',
  'v2f',
  '2D',
  'Color',
  'Float',
  'Vector',
  'Range',
  'Cube',
]);

const SEMANTICS = new Set([
  'POSITION',
  'NORMAL',
  'TANGENT',
  'BINORMAL',
  'COLOR',
  'COLOR0',
  'COLOR1',
  'TEXCOORD',
  'TEXCOORD0',
  'TEXCOORD1',
  'TEXCOORD2',
  'TEXCOORD3',
  'TEXCOORD4',
  'TEXCOORD5',
  'TEXCOORD6',
  'TEXCOORD7',
  'SV_POSITION',
  'SV_Target',
  'SV_Target0',
  'SV_Target1',
  'SV_Target2',
  'SV_Target3',
  'SV_Depth',
  'SV_Coverage',
  'SV_InstanceID',
  'SV_VertexID',
  'SV_PrimitiveID',
  'SV_DispatchThreadID',
  'SV_GroupID',
  'SV_GroupThreadID',
  'SV_GroupIndex',
  'VFACE',
  'VPOS',
]);

const SRP_FUNCTIONS = new Set([
  'TransformObjectToHClip',
  'TransformObjectToWorld',
  'TransformObjectToWorldNormal',
  'TransformObjectToWorldDir',
  'TransformWorldToObject',
  'TransformWorldToObjectNormal',
  'TransformWorldToObjectDir',
  'TransformWorldToHClip',
  'TransformWorldToView',
  'TransformObjectToWorldTangent',
  'GetMainLight',
  'GetAdditionalLight',
  'GetAdditionalLightsCount',
  'UniversalFragmentPBR',
  'UniversalFragmentBlinnPhong',
  'SampleSH',
  'SAMPLE_TEXTURE2D',
  'SAMPLE_TEXTURE2D_LOD',
  'SAMPLE_TEXTURE2D_BIAS',
  'SAMPLE_TEXTURE2D_GRAD',
  'SAMPLE_TEXTURE2D_SHADOW',
  'SAMPLE_TEXTURE2D_ARRAY',
  'SAMPLE_TEXTURECUBE',
  'SAMPLE_TEXTURECUBE_LOD',
  'SAMPLE_TEXTURE3D',
  'ComputeFogFactor',
  'ComputeFogIntensity',
  'MixFog',
  'MixFogColor',
  'AlphaDiscard',
  'Alpha',
  'Clip',
  'InitializeInputData',
  'InitializeSurfaceData',
  'GetObjectToWorldMatrix',
  'GetWorldToObjectMatrix',
  'GetWorldToViewMatrix',
  'GetViewToProjectionMatrix',
  'GetCameraPositionWS',
  'GetWorldSpaceViewDir',
  'GetWorldSpaceNormalizeViewDir',
  'UnityObjectToClipPos',
  'UnityObjectToWorldNormal',
  'UnityObjectToWorldDir',
  'UnityWorldToObjectDir',
  'ShadeSH9',
  'dot',
  'cross',
  'normalize',
  'length',
  'distance',
  'reflect',
  'refract',
  'mul',
  'lerp',
  'clamp',
  'saturate',
  'step',
  'smoothstep',
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'atan2',
  'pow',
  'exp',
  'exp2',
  'log',
  'log2',
  'sqrt',
  'rsqrt',
  'abs',
  'sign',
  'floor',
  'ceil',
  'round',
  'frac',
  'mod',
  'fmod',
  'min',
  'max',
  'ddx',
  'ddy',
  'fwidth',
  'all',
  'any',
  'isfinite',
  'isinf',
  'isnan',
]);

/**
 * Tokenizes a line of HLSL / ShaderLab / GLSL code.
 */
export function tokenizeLine(line: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  let i = 0;
  const len = line.length;

  while (i < len) {
    // 1. Single-line comment
    if (line[i] === '/' && line[i + 1] === '/') {
      tokens.push({
        text: line.slice(i),
        type: 'comment',
      });
      break;
    }

    // 2. Preprocessor directive (#include, #pragma, etc.)
    if (line[i] === '#') {
      const rest = line.slice(i);
      const match = rest.match(/^#[a-zA-Z_]+/);
      if (match) {
        tokens.push({
          text: match[0],
          type: 'preprocessor',
        });
        i += match[0].length;
        continue;
      }
    }

    // 3. String literals ("...", '...')
    if (line[i] === '"' || line[i] === "'") {
      const quote = line[i];
      let str = quote;
      i++;
      while (i < len && line[i] !== quote) {
        if (line[i] === '\\' && i + 1 < len) {
          str += line[i] + line[i + 1];
          i += 2;
        } else {
          str += line[i];
          i++;
        }
      }
      if (i < len) {
        str += line[i];
        i++;
      }
      tokens.push({
        text: str,
        type: 'string',
      });
      continue;
    }

    // 4. Numbers (e.g., 0.5f, 1.0, 100, 0x1A, .5)
    if (
      /[0-9]/.test(line[i]) ||
      (line[i] === '.' && i + 1 < len && /[0-9]/.test(line[i + 1]))
    ) {
      let num = '';
      while (i < len && /[0-9a-fA-FxX._fFhH]/.test(line[i])) {
        num += line[i];
        i++;
      }
      tokens.push({
        text: num,
        type: 'number',
      });
      continue;
    }

    // 5. Identifiers (keywords, types, uniforms, semantics, variables)
    if (/[a-zA-Z_]/.test(line[i])) {
      let word = '';
      while (i < len && /[a-zA-Z0-9_]/.test(line[i])) {
        word += line[i];
        i++;
      }

      let type: TokenType = 'plain';

      if (STRUCTURAL_BLOCKS.has(word)) {
        type = 'structural';
      } else if (PREPROCESSOR_KEYWORDS.has('#' + word)) {
        type = 'preprocessor';
      } else if (TYPES.has(word)) {
        type = 'type';
      } else if (SEMANTICS.has(word.toUpperCase())) {
        type = 'semantic';
      } else if (SRP_FUNCTIONS.has(word)) {
        type = 'srp-function';
      } else if (HLSL_KEYWORDS.has(word)) {
        type = 'keyword';
      } else if (
        word.startsWith('_') ||
        word.startsWith('unity_') ||
        word.startsWith('gl_') ||
        word.startsWith('iTime') ||
        word.startsWith('iResolution') ||
        word.startsWith('iMouse')
      ) {
        type = 'uniform';
      } else if (/^[A-Z][a-zA-Z0-9]*$/.test(word) && word.length > 2) {
        // Potential Custom Struct or Class name (e.g. CustomData, MeshAttributes)
        type = 'type';
      } else {
        type = 'identifier';
      }

      tokens.push({
        text: word,
        type,
      });
      continue;
    }

    // 6. Whitespace
    if (/\s/.test(line[i])) {
      let ws = '';
      while (i < len && /\s/.test(line[i])) {
        ws += line[i];
        i++;
      }
      tokens.push({
        text: ws,
        type: 'plain',
      });
      continue;
    }

    // 7. Operators and punctuation
    const char = line[i];
    let opType: TokenType = 'punctuation';
    if (/[+\-*/%=&|<>!^~?]/.test(char)) {
      opType = 'operator';
    }

    tokens.push({
      text: char,
      type: opType,
    });
    i++;
  }

  return tokens;
}

/**
 * Returns the Tailwind CSS classes for a given token type.
 */
export function getTokenClasses(type: TokenType): string {
  switch (type) {
    case 'structural':
      return 'text-fuchsia-400 font-semibold';
    case 'preprocessor':
      return 'text-pink-400 font-medium';
    case 'keyword':
      return 'text-amber-400 font-medium';
    case 'type':
      return 'text-cyan-300 font-medium';
    case 'semantic':
      return 'text-orange-300 font-mono font-medium';
    case 'srp-function':
      return 'text-indigo-300 font-medium';
    case 'uniform':
      return 'text-emerald-400 font-medium';
    case 'string':
      return 'text-lime-300';
    case 'number':
      return 'text-sky-300';
    case 'comment':
      return 'text-slate-500 italic';
    case 'operator':
      return 'text-slate-400';
    case 'punctuation':
      return 'text-slate-500';
    case 'identifier':
      return 'text-slate-200';
    case 'plain':
    default:
      return 'text-slate-200';
  }
}

/**
 * Parses structural landmarks (Shader, Pass, CBUFFER, Vertex, Frag) for quick navigation.
 */
export interface CodeLandmark {
  lineNumber: number;
  label: string;
  type: 'shader' | 'subshader' | 'pass' | 'cbuffer' | 'vertex' | 'fragment' | 'properties';
}

export function extractLandmarks(code: string): CodeLandmark[] {
  const lines = code.split('\n');
  const landmarks: CodeLandmark[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    if (/^Shader\s+"([^"]+)"/i.test(line)) {
      const match = line.match(/^Shader\s+"([^"]+)"/i);
      landmarks.push({
        lineNumber: lineNum,
        label: `Shader: ${match ? match[1].split('/').pop() : ''}`,
        type: 'shader',
      });
    } else if (/^Properties\b/i.test(line)) {
      landmarks.push({
        lineNumber: lineNum,
        label: 'Properties { ... }',
        type: 'properties',
      });
    } else if (/^SubShader\b/i.test(line)) {
      landmarks.push({
        lineNumber: lineNum,
        label: 'SubShader',
        type: 'subshader',
      });
    } else if (/^Pass\b/i.test(line)) {
      landmarks.push({
        lineNumber: lineNum,
        label: 'Pass',
        type: 'pass',
      });
    } else if (/^CBUFFER_START\(([^)]+)\)/i.test(line)) {
      const match = line.match(/^CBUFFER_START\(([^)]+)\)/i);
      landmarks.push({
        lineNumber: lineNum,
        label: `CBUFFER: ${match ? match[1] : 'UnityPerMaterial'}`,
        type: 'cbuffer',
      });
    } else if (/#pragma\s+vertex\s+([a-zA-Z0-9_]+)/i.test(line)) {
      const match = line.match(/#pragma\s+vertex\s+([a-zA-Z0-9_]+)/i);
      landmarks.push({
        lineNumber: lineNum,
        label: `Vert: ${match ? match[1] : 'vert'}()`,
        type: 'vertex',
      });
    } else if (/#pragma\s+fragment\s+([a-zA-Z0-9_]+)/i.test(line)) {
      const match = line.match(/#pragma\s+fragment\s+([a-zA-Z0-9_]+)/i);
      landmarks.push({
        lineNumber: lineNum,
        label: `Frag: ${match ? match[1] : 'frag'}()`,
        type: 'fragment',
      });
    }
  }

  return landmarks;
}
