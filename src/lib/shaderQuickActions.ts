/**
 * Shader Quick Actions & Conversion Shortcuts Engine
 * 
 * Provides automated transformations for HLSL/ShaderLab code:
 * - Convert to URP Lit (UniversalForward PBR Lighting pass)
 * - Convert to URP Unlit
 * - Add SRP Batcher Header & CBUFFER_START(UnityPerMaterial)
 * - Refactor scalar uniforms to 16-byte aligned float4 vector registers
 * - Reorder CBUFFER for zero-padding 16-byte alignment
 * - Modernize legacy sampler2D to separated TEXTURE2D & SAMPLER
 * - Modernize fixed/fixed4 precision types
 * - Add ShadowCaster and DepthOnly passes
 */

export interface QuickActionItem {
  id: string;
  label: string;
  category: 'convert' | 'batching' | 'refactor' | 'insert' | 'utility';
  description: string;
  iconName: string;
  shortcut?: string;
  execute: (code: string, selection?: { start: number; end: number; text: string }) => {
    newCode: string;
    message: string;
    newSelection?: { start: number; end: number };
  };
}

/**
 * Converts shader to URP Lit PBR workflow
 */
export function convertToUrpLit(code: string): string {
  // If already full ShaderLab, adapt or replace Pass
  const hasShaderLab = /^\s*Shader\s+"([^"]+)"/m.test(code);
  const shaderName = code.match(/^\s*Shader\s+"([^"]+)"/m)?.[1] || "Custom/URPLitShader";

  const urpLitTemplate = `Shader "${shaderName}"
{
    Properties
    {
        _BaseMap ("Base Texture", 2D) = "white" {}
        _BaseColor ("Base Color", Color) = (1, 1, 1, 1)
        _Metallic ("Metallic", Range(0, 1)) = 0.0
        _Smoothness ("Smoothness", Range(0, 1)) = 0.5
        _BumpMap ("Normal Map", 2D) = "bump" {}
        _BumpScale ("Normal Scale", Float) = 1.0
        _EmissionColor ("Emission Color", Color) = (0, 0, 0, 1)
    }

    SubShader
    {
        Tags 
        { 
            "RenderType" = "Opaque" 
            "RenderPipeline" = "UniversalPipeline" 
            "Queue" = "Geometry" 
        }
        LOD 300

        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode" = "UniversalForward" }

            HLSLPROGRAM
            #pragma target 3.5
            #pragma vertex vert
            #pragma fragment frag

            // Universal Pipeline keywords
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE
            #pragma multi_compile _ _ADDITIONAL_LIGHTS_VERTEX _ADDITIONAL_LIGHTS
            #pragma multi_compile_fragment _ _SHADOWS_SOFT
            #pragma multi_compile_fog

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

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
                float3 positionWS   : TEXCOORD0;
                float3 normalWS     : TEXCOORD1;
                float2 uv           : TEXCOORD2;
            };

            TEXTURE2D(_BaseMap);
            SAMPLER(sampler_BaseMap);
            TEXTURE2D(_BumpMap);
            SAMPLER(sampler_BumpMap);

            // SRP Batcher Uniform Buffer (16-byte aligned)
            CBUFFER_START(UnityPerMaterial)
                float4 _BaseColor;
                float4 _EmissionColor;
                float4 _BaseMap_ST;
                float _Metallic;
                float _Smoothness;
                float _BumpScale;
            CBUFFER_END

            Varyings vert(Attributes input)
            {
                Varyings output = (Varyings)0;
                VertexPositionInputs vertexInput = GetVertexPositionInputs(input.positionOS.xyz);
                VertexNormalInputs normalInput = GetVertexNormalInputs(input.normalOS, input.tangentOS);

                output.positionCS = vertexInput.positionCS;
                output.positionWS = vertexInput.positionWS;
                output.normalWS = normalInput.normalWS;
                output.uv = TRANSFORM_TEX(input.uv, _BaseMap);
                return output;
            }

            half4 frag(Varyings input) : SV_Target
            {
                // Albedo sample & Material Setup
                half4 albedo = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, input.uv) * _BaseColor;

                // Standard URP Lighting Setup
                InputData inputData = (InputData)0;
                inputData.positionWS = input.positionWS;
                inputData.normalWS = normalize(input.normalWS);
                inputData.viewDirectionWS = GetWorldSpaceNormalizeViewDir(input.positionWS);
                inputData.shadowCoord = TransformWorldToShadowCoord(input.positionWS);

                SurfaceData surfaceData = (SurfaceData)0;
                surfaceData.albedo = albedo.rgb;
                surfaceData.metallic = _Metallic;
                surfaceData.smoothness = _Smoothness;
                surfaceData.emission = _EmissionColor.rgb;
                surfaceData.alpha = albedo.a;

                half4 finalColor = UniversalFragmentPBR(inputData, surfaceData);
                return finalColor;
            }
            ENDHLSL
        }

        // Shadow Caster Pass
        Pass
        {
            Name "ShadowCaster"
            Tags { "LightMode" = "ShadowCaster" }

            ZWrite On
            ZTest LEqual
            ColorMask 0

            HLSLPROGRAM
            #pragma target 3.5
            #pragma vertex ShadowPassVertex
            #pragma fragment ShadowPassFragment

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

            struct Attributes
            {
                float4 positionOS   : POSITION;
                float3 normalOS     : NORMAL;
            };

            struct Varyings
            {
                float4 positionCS   : SV_POSITION;
            };

            float3 _LightDirection;

            Varyings ShadowPassVertex(Attributes input)
            {
                Varyings output;
                float3 positionWS = TransformObjectToWorld(input.positionOS.xyz);
                float3 normalWS = TransformObjectToWorldNormal(input.normalOS);
                output.positionCS = TransformWorldToHClip(ApplyShadowBias(positionWS, normalWS, _LightDirection));
                return output;
            }

            half4 ShadowPassFragment(Varyings input) : SV_TARGET
            {
                return 0;
            }
            ENDHLSL
        }
    }
}`;

  return urpLitTemplate;
}

/**
 * Converts shader to URP Unlit workflow
 */
export function convertToUrpUnlit(code: string): string {
  const shaderName = code.match(/^\s*Shader\s+"([^"]+)"/m)?.[1] || "Custom/URPUnlitShader";

  return `Shader "${shaderName}"
{
    Properties
    {
        _BaseMap ("Texture", 2D) = "white" {}
        _BaseColor ("Color", Color) = (1, 1, 1, 1)
        _Cutoff ("Alpha Cutoff", Range(0, 1)) = 0.5
    }

    SubShader
    {
        Tags 
        { 
            "RenderType" = "Opaque" 
            "RenderPipeline" = "UniversalPipeline" 
            "Queue" = "Geometry" 
        }

        Pass
        {
            Name "Unlit"
            Tags { "LightMode" = "SRPDefaultUnlit" }

            HLSLPROGRAM
            #pragma target 3.0
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile_fog

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            struct Attributes
            {
                float4 positionOS   : POSITION;
                float2 uv           : TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionCS   : SV_POSITION;
                float2 uv           : TEXCOORD0;
            };

            TEXTURE2D(_BaseMap);
            SAMPLER(sampler_BaseMap);

            CBUFFER_START(UnityPerMaterial)
                float4 _BaseColor;
                float4 _BaseMap_ST;
                float _Cutoff;
            CBUFFER_END

            Varyings vert(Attributes input)
            {
                Varyings output = (Varyings)0;
                output.positionCS = TransformObjectToHClip(input.positionOS.xyz);
                output.uv = TRANSFORM_TEX(input.uv, _BaseMap);
                return output;
            }

            half4 frag(Varyings input) : SV_Target
            {
                half4 col = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, input.uv) * _BaseColor;
                return col;
            }
            ENDHLSL
        }
    }
}`;
}

/**
 * Encloses all loose uniforms in CBUFFER_START(UnityPerMaterial)
 */
export function addSrpBatcherHeader(code: string): string {
  if (/CBUFFER_START\s*\(\s*UnityPerMaterial\s*\)/i.test(code)) {
    return code; // Already has CBUFFER
  }

  // Find all loose uniforms
  const looseUniformRegex = /\b(?:uniform\s+)?(float4x4|float4|float3|float2|float|half4|half3|half2|half|int4|int3|int2|int|uint4|uint3|uint2|uint|fixed4|fixed3|fixed2|fixed)\s+(_[A-Za-z0-9_]+)\s*;/g;
  const matches: { full: string; type: string; name: string }[] = [];
  let m;

  while ((m = looseUniformRegex.exec(code)) !== null) {
    const type = m[1];
    const name = m[2];
    if (!name.startsWith('unity_') && !name.startsWith('gl_')) {
      matches.push({ full: m[0], type, name });
    }
  }

  let declarations = '';
  if (matches.length > 0) {
    declarations = matches.map(v => `    ${v.type} ${v.name};`).join('\n');
  } else {
    declarations = `    float4 _BaseColor;\n    float4 _BaseMap_ST;`;
  }

  const cbufferBlock = `// SRP Batcher Uniform Constant Buffer (16-byte aligned)\nCBUFFER_START(UnityPerMaterial)\n${declarations}\nCBUFFER_END\n`;

  let updated = code;
  for (const match of matches) {
    updated = updated.replace(match.full, '');
  }

  // Insert before struct Attributes or Varyings or vert function
  const insertIndex = updated.indexOf('struct Attributes') !== -1
    ? updated.indexOf('struct Attributes')
    : updated.indexOf('struct Varyings') !== -1
      ? updated.indexOf('struct Varyings')
      : updated.indexOf('vert(') !== -1
        ? updated.indexOf('vert(')
        : updated.indexOf('Pass');

  if (insertIndex !== -1) {
    return updated.slice(0, insertIndex) + cbufferBlock + '\n' + updated.slice(insertIndex);
  }

  return cbufferBlock + '\n' + updated;
}

/**
 * Refactors scalar float/half variables into 16-byte aligned float4 registers
 */
export function refactorToFloat4(code: string, selectedText?: string): string {
  let targetVars: string[] = [];

  if (selectedText && selectedText.trim().length > 0) {
    const varRegex = /\b(?:float|half)\s+(_[A-Za-z0-9_]+)\s*;/g;
    let vm;
    while ((vm = varRegex.exec(selectedText)) !== null) {
      targetVars.push(vm[1]);
    }
  }

  if (targetVars.length === 0) {
    // Auto-detect loose or cbuffer scalar floats
    const scalarRegex = /\b(?:float|half)\s+(_[A-Za-z0-9_]+)\s*;/g;
    let sm;
    while ((sm = scalarRegex.exec(code)) !== null) {
      if (!sm[1].endsWith('_ST') && !sm[1].endsWith('_TexelSize') && !sm[1].startsWith('unity_')) {
        targetVars.push(sm[1]);
      }
    }
  }

  if (targetVars.length === 0) {
    // Nothing to refactor; provide a sample packed register
    const sampleBlock = `    // Packed 16-byte float4 register\n    float4 _CustomParams; // x: _Speed, y: _Intensity, z: _Scale, w: _Extra\n    #define _Speed (_CustomParams.x)\n    #define _Intensity (_CustomParams.y)\n    #define _Scale (_CustomParams.z)\n    #define _Extra (_CustomParams.w)\n`;
    if (code.includes('CBUFFER_START(UnityPerMaterial)')) {
      return code.replace('CBUFFER_START(UnityPerMaterial)', `CBUFFER_START(UnityPerMaterial)\n${sampleBlock}`);
    }
    return sampleBlock + '\n' + code;
  }

  // Pack up to 4 variables into _PackedParams
  const group = targetVars.slice(0, 4);
  const packedName = '_PackedParams';
  const components = ['x', 'y', 'z', 'w'];
  const componentDocs = group.map((name, i) => `${components[i]}: ${name}`).join(', ');

  const packedDeclaration = `    // Packed 16-byte aligned vector register\n    float4 ${packedName}; // (${componentDocs})\n` +
    group.map((name, i) => `    #define ${name} (${packedName}.${components[i]})`).join('\n');

  let updated = code;
  for (const name of group) {
    const declRegex = new RegExp(`^\\s*(?:float|half)\\s+${name}\\s*;.*$`, 'm');
    updated = updated.replace(declRegex, '');
  }

  if (updated.includes('CBUFFER_START(UnityPerMaterial)')) {
    updated = updated.replace(/CBUFFER_START\s*\(\s*UnityPerMaterial\s*\)([\s\S]*?)CBUFFER_END/, (m, inner) => {
      return `CBUFFER_START(UnityPerMaterial)${inner.trimEnd()}\n\n${packedDeclaration}\nCBUFFER_END`;
    });
  } else {
    updated = `CBUFFER_START(UnityPerMaterial)\n${packedDeclaration}\nCBUFFER_END\n\n` + updated;
  }

  return updated;
}

/**
 * Reorders variables inside CBUFFER for zero padding
 */
export function reorderCbufferAlignment(code: string): string {
  const cbufferMatch = code.match(/CBUFFER_START\s*\(\s*UnityPerMaterial\s*\)([\s\S]*?)CBUFFER_END/);
  if (!cbufferMatch) return code;

  const content = cbufferMatch[1];
  const lines = content.split('\n');
  const vars: { type: string; name: string; full: string; size: number }[] = [];

  const TYPE_SIZES: Record<string, number> = {
    float4x4: 64, matrix: 64,
    float4: 16, half4: 16, int4: 16, uint4: 16, fixed4: 16,
    float3: 12, half3: 12, int3: 12, uint3: 12, fixed3: 12,
    float2: 8, half2: 8, int2: 8, uint2: 8, fixed2: 8,
    float: 4, half: 4, int: 4, uint: 4, fixed: 4,
  };

  for (const line of lines) {
    const clean = line.trim();
    if (!clean || clean.startsWith('//') || clean.startsWith('#')) continue;
    const match = clean.match(/\b(float4x4|float4|float3|float2|float|half4|half3|half2|half|int4|int3|int2|int|uint4|uint3|uint2|uint|fixed4|fixed3|fixed2|fixed)\s+([A-Za-z0-9_]+)\s*(?:\[\d+\])?\s*;/);
    if (match) {
      vars.push({
        type: match[1],
        name: match[2],
        full: line,
        size: TYPE_SIZES[match[1]] || 16,
      });
    }
  }

  if (vars.length <= 1) return code;

  vars.sort((a, b) => b.size - a.size);
  const sortedCode = vars.map(v => `    ${v.type} ${v.name};`).join('\n');

  return code.replace(/CBUFFER_START\s*\(\s*UnityPerMaterial\s*\)([\s\S]*?)CBUFFER_END/, () => {
    return `CBUFFER_START(UnityPerMaterial)\n    // Zero-padding 16-byte aligned layout\n${sortedCode}\nCBUFFER_END`;
  });
}

/**
 * Modernizes legacy sampler2D and tex2D
 */
export function modernizeSamplers(code: string): string {
  let updated = code;
  // Replace sampler2D declarations
  updated = updated.replace(/\bsampler2D\s+([A-Za-z0-9_]+)\s*;/g, (m, texName) => {
    const sName = texName.startsWith('_') ? `sampler${texName}` : `sampler_${texName}`;
    return `TEXTURE2D(${texName});\nSAMPLER(${sName});`;
  });
  // Replace tex2D(tex, uv) calls
  updated = updated.replace(/\btex2D\s*\(\s*([A-Za-z0-9_]+)\s*,\s*([^)]+)\)/g, (m, texName, uvExpr) => {
    const sName = texName.startsWith('_') ? `sampler${texName}` : `sampler_${texName}`;
    return `SAMPLE_TEXTURE2D(${texName}, ${sName}, ${uvExpr.trim()})`;
  });
  return updated;
}

/**
 * Modernizes fixed/fixed4 precision
 */
export function modernizeFixedTypes(code: string): string {
  return code
    .replace(/\bfixed4\b/g, 'half4')
    .replace(/\bfixed3\b/g, 'half3')
    .replace(/\bfixed2\b/g, 'half2')
    .replace(/\bfixed\b/g, 'half');
}

/**
 * Injects URP ShadowCaster Pass if missing
 */
export function addShadowCasterPass(code: string): string {
  if (/LightMode\s*=\s*"ShadowCaster"/i.test(code)) {
    return code; // already present
  }

  const shadowPass = `
        // Standard URP Shadow Caster Pass
        Pass
        {
            Name "ShadowCaster"
            Tags { "LightMode" = "ShadowCaster" }

            ZWrite On
            ZTest LEqual
            ColorMask 0

            HLSLPROGRAM
            #pragma target 3.0
            #pragma vertex ShadowPassVertex
            #pragma fragment ShadowPassFragment

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Shadows.hlsl"

            struct Attributes
            {
                float4 positionOS   : POSITION;
                float3 normalOS     : NORMAL;
            };

            struct Varyings
            {
                float4 positionCS   : SV_POSITION;
            };

            float3 _LightDirection;

            Varyings ShadowPassVertex(Attributes input)
            {
                Varyings output;
                float3 positionWS = TransformObjectToWorld(input.positionOS.xyz);
                float3 normalWS = TransformObjectToWorldNormal(input.normalOS);
                output.positionCS = TransformWorldToHClip(ApplyShadowBias(positionWS, normalWS, _LightDirection));
                return output;
            }

            half4 ShadowPassFragment(Varyings input) : SV_TARGET
            {
                return 0;
            }
            ENDHLSL
        }
`;

  const lastPassIndex = code.lastIndexOf('ENDHLSL');
  if (lastPassIndex !== -1) {
    const passClose = code.indexOf('}', lastPassIndex);
    if (passClose !== -1) {
      return code.slice(0, passClose + 1) + '\n' + shadowPass + code.slice(passClose + 1);
    }
  }

  return code + '\n' + shadowPass;
}

/**
 * Injects URP DepthOnly Pass if missing
 */
export function addDepthOnlyPass(code: string): string {
  if (/LightMode\s*=\s*"DepthOnly"/i.test(code)) {
    return code;
  }

  const depthPass = `
        // URP Depth Prepass & SSAO support
        Pass
        {
            Name "DepthOnly"
            Tags { "LightMode" = "DepthOnly" }

            ZWrite On
            ColorMask R

            HLSLPROGRAM
            #pragma target 3.0
            #pragma vertex DepthOnlyVertex
            #pragma fragment DepthOnlyFragment

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            struct Attributes
            {
                float4 positionOS   : POSITION;
            };

            struct Varyings
            {
                float4 positionCS   : SV_POSITION;
            };

            Varyings DepthOnlyVertex(Attributes input)
            {
                Varyings output = (Varyings)0;
                output.positionCS = TransformObjectToHClip(input.positionOS.xyz);
                return output;
            }

            half4 DepthOnlyFragment(Varyings input) : SV_TARGET
            {
                return 0;
            }
            ENDHLSL
        }
`;

  const lastPassIndex = code.lastIndexOf('ENDHLSL');
  if (lastPassIndex !== -1) {
    const passClose = code.indexOf('}', lastPassIndex);
    if (passClose !== -1) {
      return code.slice(0, passClose + 1) + '\n' + depthPass + code.slice(passClose + 1);
    }
  }

  return code + '\n' + depthPass;
}

/**
 * Injects Texture2D & Sampler declaration snippet
 */
export function insertTextureSamplerPair(code: string): string {
  const snippet = `TEXTURE2D(_DetailTex);\nSAMPLER(sampler_DetailTex);\n`;
  if (code.includes('CBUFFER_START')) {
    const idx = code.indexOf('CBUFFER_START');
    return code.slice(0, idx) + snippet + '\n' + code.slice(idx);
  }
  return snippet + '\n' + code;
}

/**
 * Injects World Coordinates & Normal transform snippet
 */
export function insertWorldTransform(code: string): string {
  const snippet = `
// Universal Space Transforms
float3 positionWS = TransformObjectToWorld(input.positionOS.xyz);
float3 normalWS = TransformObjectToWorldNormal(input.normalOS);
float3 viewDirWS = GetWorldSpaceNormalizeViewDir(positionWS);
`;
  return code + '\n' + snippet;
}

/**
 * Standard URP Library Include Definitions
 */
export interface UrpIncludeDefinition {
  id: string;
  name: string;
  path: string;
  description: string;
  statement: string;
}

export const URP_INCLUDES: UrpIncludeDefinition[] = [
  {
    id: 'core',
    name: 'Core.hlsl',
    path: 'Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl',
    description: 'TransformObjectToHClip, TransformObjectToWorld, standard types, and math routines.',
    statement: '#include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"',
  },
  {
    id: 'lighting',
    name: 'Lighting.hlsl',
    path: 'Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl',
    description: 'GetMainLight(), GetAdditionalLight(), UniversalFragmentPBR, and BRDF shading.',
    statement: '#include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"',
  },
  {
    id: 'depth',
    name: 'DeclareDepthTexture.hlsl',
    path: 'Packages/com.unity.render-pipelines.universal/ShaderLibrary/DeclareDepthTexture.hlsl',
    description: 'SampleSceneDepth() and LinearEyeDepth() for water depth & soft particles.',
    statement: '#include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/DeclareDepthTexture.hlsl"',
  },
  {
    id: 'normals',
    name: 'DeclareNormalsTexture.hlsl',
    path: 'Packages/com.unity.render-pipelines.universal/ShaderLibrary/DeclareNormalsTexture.hlsl',
    description: 'SampleSceneNormals() for screen-space edge detection and ambient occlusion.',
    statement: '#include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/DeclareNormalsTexture.hlsl"',
  },
  {
    id: 'shadows',
    name: 'Shadows.hlsl',
    path: 'Packages/com.unity.render-pipelines.universal/ShaderLibrary/Shadows.hlsl',
    description: 'Main light cascade shadows and additional light shadow sampling.',
    statement: '#include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Shadows.hlsl"',
  },
  {
    id: 'surface_input',
    name: 'SurfaceInput.hlsl',
    path: 'Packages/com.unity.render-pipelines.universal/ShaderLibrary/SurfaceInput.hlsl',
    description: 'Standard URP SurfaceData and InputData unpacking helper functions.',
    statement: '#include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/SurfaceInput.hlsl"',
  },
];

/**
 * Checks if a specific URP include is present in code
 */
export function isUrpIncludePresent(code: string, includePathOrName: string): boolean {
  return code.includes(includePathOrName);
}

/**
 * Injects a specific URP include into the shader code
 */
export function addUrpInclude(code: string, includeId: string = 'core'): { newCode: string; added: boolean; message: string } {
  const inc = URP_INCLUDES.find(i => i.id === includeId || i.name.toLowerCase() === includeId.toLowerCase()) || URP_INCLUDES[0];
  
  if (code.includes(inc.path) || code.includes(inc.name)) {
    return {
      newCode: code,
      added: false,
      message: `${inc.name} is already included in this shader.`,
    };
  }

  const includeStatement = `            ${inc.statement}\n`;

  // Find optimal injection point: after HLSLPROGRAM, after existing #includes, or before CBUFFER
  if (code.includes('HLSLPROGRAM')) {
    const hlslIdx = code.indexOf('HLSLPROGRAM');
    const lineBreakAfterHlsl = code.indexOf('\n', hlslIdx);
    if (lineBreakAfterHlsl !== -1) {
      const newCode = code.slice(0, lineBreakAfterHlsl + 1) + includeStatement + code.slice(lineBreakAfterHlsl + 1);
      return {
        newCode,
        added: true,
        message: `Injected ${inc.name} into HLSL block.`,
      };
    }
  }

  // Fallback: prepend to code
  return {
    newCode: inc.statement + '\n' + code,
    added: true,
    message: `Added ${inc.name}.`,
  };
}

/**
 * Wraps selection or loose material parameters in CBUFFER_START(UnityPerMaterial) ... CBUFFER_END
 */
export function wrapInCbuffer(code: string, selectedText?: string): { newCode: string; message: string } {
  if (selectedText && selectedText.trim().length > 0) {
    const trimmed = selectedText.trim();
    // Check if already in CBUFFER
    if (trimmed.includes('CBUFFER_START') && trimmed.includes('CBUFFER_END')) {
      return { newCode: code, message: 'Selection is already enclosed in CBUFFER.' };
    }

    const cbufferBlock = `CBUFFER_START(UnityPerMaterial)\n    ${trimmed.split('\n').join('\n    ')}\nCBUFFER_END`;
    const newCode = code.replace(selectedText, cbufferBlock);
    return {
      newCode,
      message: 'Wrapped selected code in CBUFFER_START(UnityPerMaterial).',
    };
  }

  // If no selection, run addSrpBatcherHeader to automatically find & wrap all loose uniforms
  const refactored = addSrpBatcherHeader(code);
  return {
    newCode: refactored,
    message: 'Wrapped loose material parameters in CBUFFER_START(UnityPerMaterial) for SRP Batching.',
  };
}

/**
 * Renames an identifier / property throughout the entire shader with word boundaries
 */
export function renameShaderSymbol(
  code: string,
  oldName: string,
  newName: string
): { newCode: string; count: number; message: string } {
  const cleanOld = oldName.trim();
  const cleanNew = newName.trim();

  if (!cleanOld || !cleanNew) {
    return { newCode: code, count: 0, message: 'Please provide both original and replacement names.' };
  }

  if (cleanOld === cleanNew) {
    return { newCode: code, count: 0, message: 'Original and replacement names are identical.' };
  }

  const escaped = cleanOld.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'g');

  const matches = code.match(regex);
  const count = matches ? matches.length : 0;

  if (count === 0) {
    return {
      newCode: code,
      count: 0,
      message: `Identifier "${cleanOld}" not found in shader code.`,
    };
  }

  const newCode = code.replace(regex, cleanNew);
  return {
    newCode,
    count,
    message: `Renamed "${cleanOld}" to "${cleanNew}" (${count} occurrences updated).`,
  };
}

/**
 * Injects GPU Instancing Buffer boilerplate
 */
export function insertGpuInstancingBlock(code: string): string {
  if (code.includes('UNITY_INSTANCING_BUFFER_START')) {
    return code;
  }

  const instancingBlock = `
            #pragma multi_compile_instancing

            UNITY_INSTANCING_BUFFER_START(Props)
                UNITY_DEFINE_INSTANCED_PROP(float4, _BaseColor)
            UNITY_INSTANCING_BUFFER_END(Props)
`;

  if (code.includes('CBUFFER_END')) {
    const idx = code.indexOf('CBUFFER_END') + 'CBUFFER_END'.length;
    return code.slice(0, idx) + '\n' + instancingBlock + code.slice(idx);
  }

  if (code.includes('HLSLPROGRAM')) {
    const idx = code.indexOf('HLSLPROGRAM') + 'HLSLPROGRAM'.length;
    return code.slice(0, idx) + '\n' + instancingBlock + code.slice(idx);
  }

  return instancingBlock + '\n' + code;
}

/**
 * Returns list of all available Quick Actions
 */
export function getQuickActionList(): QuickActionItem[] {
  return [
    {
      id: 'qa-wrap-cbuffer',
      label: 'Wrap in CBUFFER (UnityPerMaterial)',
      category: 'batching',
      description: 'Encloses selected variables or loose uniforms into CBUFFER_START(UnityPerMaterial) for 100% SRP Batcher compatibility.',
      iconName: 'Zap',
      shortcut: 'Alt+B',
      execute: (code, sel) => {
        const res = wrapInCbuffer(code, sel?.text);
        return {
          newCode: res.newCode,
          message: res.message,
        };
      },
    },
    {
      id: 'qa-add-urp-include',
      label: 'Add URP Core Include (Core.hlsl)',
      category: 'insert',
      description: 'Injects Core.hlsl with TransformObjectToHClip and coordinate space transformation math.',
      iconName: 'FileCode',
      shortcut: 'Alt+I',
      execute: (code) => {
        const res = addUrpInclude(code, 'core');
        return {
          newCode: res.newCode,
          message: res.message,
        };
      },
    },
    {
      id: 'qa-add-lighting-include',
      label: 'Add URP Lighting Include (Lighting.hlsl)',
      category: 'insert',
      description: 'Injects Lighting.hlsl for GetMainLight(), GetAdditionalLight(), and UniversalFragmentPBR.',
      iconName: 'Sun',
      execute: (code) => {
        const res = addUrpInclude(code, 'lighting');
        return {
          newCode: res.newCode,
          message: res.message,
        };
      },
    },
    {
      id: 'qa-add-depth-include',
      label: 'Add Scene Depth Include (DeclareDepthTexture.hlsl)',
      category: 'insert',
      description: 'Injects DeclareDepthTexture.hlsl to enable SampleSceneDepth() for water/volumetrics.',
      iconName: 'Layers',
      execute: (code) => {
        const res = addUrpInclude(code, 'depth');
        return {
          newCode: res.newCode,
          message: res.message,
        };
      },
    },
    {
      id: 'qa-convert-urp-lit',
      label: 'Convert to URP Lit (PBR Forward)',
      category: 'convert',
      description: 'Transforms shader structure into a full UniversalForward PBR Lit shader with Lighting.hlsl integration.',
      iconName: 'Sun',
      shortcut: 'Alt+L',
      execute: (code) => ({
        newCode: convertToUrpLit(code),
        message: 'Converted shader to Universal Render Pipeline Lit (PBR) layout.',
      }),
    },
    {
      id: 'qa-convert-urp-unlit',
      label: 'Convert to URP Unlit',
      category: 'convert',
      description: 'Generates a clean, performant URP Unlit shader with SRP Batcher constant buffer.',
      iconName: 'Layers',
      shortcut: 'Alt+U',
      execute: (code) => ({
        newCode: convertToUrpUnlit(code),
        message: 'Converted shader to URP Unlit layout.',
      }),
    },
    {
      id: 'qa-refactor-float4',
      label: 'Refactor to float4 (16-Byte Alignment)',
      category: 'refactor',
      description: 'Packs multiple scalar floats into a single float4 vector register with component alias macros.',
      iconName: 'Maximize2',
      shortcut: 'Alt+4',
      execute: (code, sel) => ({
        newCode: refactorToFloat4(code, sel?.text),
        message: 'Packed scalar float uniforms into 16-byte aligned float4 register.',
      }),
    },
    {
      id: 'qa-reorder-cbuffer',
      label: 'Reorder CBUFFER (Zero-Padding Sort)',
      category: 'refactor',
      description: 'Sorts constant buffer variables by alignment tier to eliminate dead padding holes.',
      iconName: 'Sliders',
      execute: (code) => ({
        newCode: reorderCbufferAlignment(code),
        message: 'Reordered constant buffer variables for zero-padding 16-byte alignment.',
      }),
    },
    {
      id: 'qa-modernize-samplers',
      label: 'Modernize Samplers (TEXTURE2D & SAMPLER)',
      category: 'refactor',
      description: 'Converts legacy sampler2D and tex2D() to separated TEXTURE2D / SAMPLER macros.',
      iconName: 'Layers',
      shortcut: 'Alt+M',
      execute: (code) => ({
        newCode: modernizeSamplers(code),
        message: 'Separated Texture2D and SamplerState constructs.',
      }),
    },
    {
      id: 'qa-modernize-fixed',
      label: 'Modernize Precision (fixed4 → half4)',
      category: 'refactor',
      description: 'Replaces legacy fixed precision keywords with modern half and float types.',
      iconName: 'Sparkles',
      execute: (code) => ({
        newCode: modernizeFixedTypes(code),
        message: 'Modernized fixed/fixed4 precision types to half/half4.',
      }),
    },
    {
      id: 'qa-add-gpu-instancing',
      label: 'Add GPU Instancing Buffer',
      category: 'batching',
      description: 'Injects UNITY_INSTANCING_BUFFER_START(Props) and #pragma multi_compile_instancing.',
      iconName: 'Box',
      execute: (code) => ({
        newCode: insertGpuInstancingBlock(code),
        message: 'Injected GPU Instancing buffer declarations.',
      }),
    },
    {
      id: 'qa-add-shadowcaster-pass',
      label: 'Add ShadowCaster Pass',
      category: 'insert',
      description: 'Injects a standard Universal Pipeline ShadowCaster pass for shadow maps.',
      iconName: 'EyeOff',
      shortcut: 'Alt+S',
      execute: (code) => ({
        newCode: addShadowCasterPass(code),
        message: 'Injected Universal Pipeline ShadowCaster pass.',
      }),
    },
    {
      id: 'qa-add-depthonly-pass',
      label: 'Add DepthOnly Pass',
      category: 'insert',
      description: 'Injects DepthOnly pass for depth prepass and Screen-Space Ambient Occlusion (SSAO).',
      iconName: 'Layers',
      shortcut: 'Alt+D',
      execute: (code) => ({
        newCode: addDepthOnlyPass(code),
        message: 'Injected Universal Pipeline DepthOnly pass.',
      }),
    },
    {
      id: 'qa-insert-texture-sampler',
      label: 'Insert TEXTURE2D / SAMPLER pair',
      category: 'insert',
      description: 'Inserts modern Texture2D declaration and SamplerState pair.',
      iconName: 'FileCode',
      execute: (code) => ({
        newCode: insertTextureSamplerPair(code),
        message: 'Inserted modern TEXTURE2D and SAMPLER declaration.',
      }),
    },
    {
      id: 'qa-insert-world-transform',
      label: 'Insert World Space Transforms',
      category: 'insert',
      description: 'Inserts TransformObjectToWorld, TransformObjectToWorldNormal, and ViewDir calculation.',
      iconName: 'Compass',
      execute: (code) => ({
        newCode: insertWorldTransform(code),
        message: 'Inserted World Space transform helper functions.',
      }),
    },
  ];
}
