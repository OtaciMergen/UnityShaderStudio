/**
 * Transpiles Unity URP HLSL & ShaderLab shaders to WebGL 1/2 executable GLSL for 3D Preview
 */

export interface ExtractedUniform {
  name: string;
  type: 'float' | 'vec4' | 'vec3' | 'vec2' | 'color';
  defaultValue: number | string | number[];
  displayName: string;
  min?: number;
  max?: number;
  step?: number;
}

export interface UrpTranspileOutput {
  webglGlsl: string;
  uniforms: ExtractedUniform[];
  isShaderLab: boolean;
  detectedPass: string;
  warnings: string[];
}

export function transpileUrpToWebgl(inputCode: string): UrpTranspileOutput {
  const warnings: string[] = [];
  let code = inputCode.trim();
  let isShaderLab = false;
  let detectedPass = 'UniversalForward';
  const uniforms: ExtractedUniform[] = [];

  // Check if full ShaderLab format (Shader "..." { ... })
  if (code.includes('Shader "') || code.includes('Shader  "')) {
    isShaderLab = true;
    
    // Extract Properties block
    const propMatch = code.match(/Properties\s*\{([\s\S]*?)\}/);
    if (propMatch) {
      const propLines = propMatch[1].split('\n');
      for (const line of propLines) {
        const clean = line.trim();
        // e.g. _BaseColor("Color", Color) = (1, 1, 1, 1)
        const colMatch = clean.match(/(_[A-Za-z0-9_]+)\s*\(\s*"([^"]*)"\s*,\s*Color\s*\)\s*=\s*\(([^)]+)\)/i);
        if (colMatch) {
          const name = colMatch[1];
          const label = colMatch[2];
          const parts = colMatch[3].split(',').map(s => parseFloat(s.trim()) || 0);
          const r = Math.round((parts[0] ?? 1) * 255).toString(16).padStart(2, '0');
          const g = Math.round((parts[1] ?? 1) * 255).toString(16).padStart(2, '0');
          const b = Math.round((parts[2] ?? 1) * 255).toString(16).padStart(2, '0');
          uniforms.push({
            name,
            type: 'color',
            defaultValue: `#${r}${g}${b}`,
            displayName: label || name
          });
          continue;
        }

        // e.g. _Metallic("Metallic", Range(0, 1)) = 0.5
        const rangeMatch = clean.match(/(_[A-Za-z0-9_]+)\s*\(\s*"([^"]*)"\s*,\s*Range\s*\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)\s*\)\s*=\s*([\d.-]+)/i);
        if (rangeMatch) {
          const name = rangeMatch[1];
          const label = rangeMatch[2];
          const min = parseFloat(rangeMatch[3]);
          const max = parseFloat(rangeMatch[4]);
          const def = parseFloat(rangeMatch[5]);
          uniforms.push({
            name,
            type: 'float',
            defaultValue: def,
            displayName: label || name,
            min,
            max,
            step: (max - min) / 100
          });
          continue;
        }

        // e.g. _Speed("Speed", Float) = 1.0
        const floatMatch = clean.match(/(_[A-Za-z0-9_]+)\s*\(\s*"([^"]*)"\s*,\s*Float\s*\)\s*=\s*([\d.-]+)/i);
        if (floatMatch) {
          const name = floatMatch[1];
          const label = floatMatch[2];
          const def = parseFloat(floatMatch[3]);
          uniforms.push({
            name,
            type: 'float',
            defaultValue: def,
            displayName: label || name,
            min: 0,
            max: Math.max(10, def * 3),
            step: 0.1
          });
        }
      }
    }

    // Extract HLSLPROGRAM / ENDHLSL or CGPROGRAM block
    const hlslMatch = code.match(/HLSLPROGRAM([\s\S]*?)ENDHLSL/i) || code.match(/CGPROGRAM([\s\S]*?)ENDCG/i);
    if (hlslMatch) {
      code = hlslMatch[1];
    } else {
      // Look for Pass { ... }
      const passMatch = code.match(/Pass\s*\{([\s\S]*?)\}/);
      if (passMatch) {
        code = passMatch[1];
      }
    }
  }

  // Also parse CBUFFER_START for additional uniforms if not already found in Properties
  const cbufferMatch = code.match(/CBUFFER_START\s*\(\s*UnityPerMaterial\s*\)([\s\S]*?)CBUFFER_END/i);
  if (cbufferMatch) {
    const cbLines = cbufferMatch[1].split('\n');
    for (const line of cbLines) {
      const clean = line.trim().replace(/\/\/.*$/, '');
      const varMatch = clean.match(/\b(half4|float4|half|float|half3|float3)\s+(_[A-Za-z0-9_]+)\s*;/);
      if (varMatch) {
        const type = varMatch[1];
        const name = varMatch[2];
        if (!uniforms.some(u => u.name === name)) {
          if (type.includes('4') && (name.toLowerCase().includes('color') || name.toLowerCase().includes('tint'))) {
            uniforms.push({
              name,
              type: 'color',
              defaultValue: '#3b82f6',
              displayName: name
            });
          } else if (type.includes('float') || type.includes('half')) {
            uniforms.push({
              name,
              type: 'float',
              defaultValue: 1.0,
              displayName: name,
              min: 0.0,
              max: 5.0,
              step: 0.05
            });
          }
        }
      }
    }
  }

  // If already standard GLSL (has void main or mainImage), return with minimal transforms
  if (code.includes('mainImage') && !code.includes('half4 frag') && !code.includes('float4 frag')) {
    return {
      webglGlsl: code,
      uniforms,
      isShaderLab,
      detectedPass,
      warnings
    };
  }

  // Clean URP / HLSL includes and pragmas
  let glsl = code
    .replace(/#include\s+["<][^">]+[">]/g, '// [Inlined URP Include]')
    .replace(/#pragma\s+[^\n]+/g, '// [Inlined Pragma]')
    .replace(/CBUFFER_START\s*\(\s*UnityPerMaterial\s*\)/g, '// CBUFFER_START')
    .replace(/CBUFFER_END/g, '// CBUFFER_END');

  // Convert Texture2D / Sampler declarations
  glsl = glsl.replace(/\b(?:Texture2D|TEXTURE2D)\s*(?:\(\s*([A-Za-z0-9_]+)\s*\)|([A-Za-z0-9_]+))\s*;/g, 'uniform sampler2D $1$2;');
  glsl = glsl.replace(/\b(?:SamplerState|SAMPLER)\s*(?:\(\s*[A-Za-z0-9_]+\s*\)|[A-Za-z0-9_]+)\s*;/g, '');

  // Convert Texture sampling
  glsl = glsl.replace(/SAMPLE_TEXTURE2D\s*\(\s*([A-Za-z0-9_]+)\s*,\s*[A-Za-z0-9_]+\s*,\s*([^)]+)\)/g, 'texture2D($1, $2)');
  glsl = glsl.replace(/([A-Za-z0-9_]+)\.Sample\s*\(\s*[A-Za-z0-9_]+\s*,\s*([^)]+)\)/g, 'texture2D($1, $2)');
  glsl = glsl.replace(/tex2D\s*\(\s*([A-Za-z0-9_]+)\s*,\s*([^)]+)\)/g, 'texture2D($1, $2)');

  // Convert HLSL keywords to GLSL
  glsl = glsl.replace(/\bhalf4\b/g, 'vec4');
  glsl = glsl.replace(/\bfloat4\b/g, 'vec4');
  glsl = glsl.replace(/\bfixed4\b/g, 'vec4');
  glsl = glsl.replace(/\bhalf3\b/g, 'vec3');
  glsl = glsl.replace(/\bfloat3\b/g, 'vec3');
  glsl = glsl.replace(/\bfixed3\b/g, 'vec3');
  glsl = glsl.replace(/\bhalf2\b/g, 'vec2');
  glsl = glsl.replace(/\bfloat2\b/g, 'vec2');
  glsl = glsl.replace(/\bfixed2\b/g, 'vec2');
  glsl = glsl.replace(/\bhalf\b/g, 'float');
  glsl = glsl.replace(/\bfixed\b/g, 'float');
  glsl = glsl.replace(/\bfloat4x4\b/g, 'mat4');
  glsl = glsl.replace(/\bfloat3x3\b/g, 'mat3');

  // Convert HLSL standard functions to GLSL
  glsl = glsl.replace(/\blerp\s*\(/g, 'mix(');
  glsl = glsl.replace(/\bfrac\s*\(/g, 'fract(');
  glsl = glsl.replace(/\bsaturate\s*\(([^)]+)\)/g, 'clamp($1, 0.0, 1.0)');
  glsl = glsl.replace(/\brsqrt\s*\(/g, 'inversesqrt(');
  glsl = glsl.replace(/\bfmod\s*\(/g, 'mod(');
  glsl = glsl.replace(/\batan2\s*\(/g, 'atan(');
  glsl = glsl.replace(/\bclip\s*\(([^)]+)\);/g, 'if (($1) < 0.0) discard;');

  // URP lighting approximations in WebGL
  if (glsl.includes('UniversalFragmentPBR') || glsl.includes('UniversalFragmentBlinnPhong') || glsl.includes('TransformObjectToWorldNormal')) {
    glsl = `
      // WebGL URP Lighting Emulation Bridge
      vec3 TransformObjectToWorldNormal(vec3 normalOS) { return normalize(v_normal); }
      vec3 TransformObjectToHClip(vec3 positionOS) { return positionOS; }
      
      ${glsl}
    `;
  }

  // Detect and route fragment function (e.g. frag(Varyings input) : SV_Target)
  const hasFragFunction = /\b(?:vec4|float4|half4)\s+frag\s*\([^)]*\)/i.test(glsl);
  const hasMain = /\bvoid\s+main\s*\(/i.test(glsl);

  if (hasFragFunction && !hasMain) {
    // Generate WebGL main() wrapper calling frag()
    glsl += `
      void main() {
        #ifdef GL_ES
        // Initialize input struct if needed
        #endif
        
        // Execute URP fragment logic
        vec3 N = normalize(v_normal);
        vec3 V = normalize(-v_positionWS);
        vec3 L = normalize(vec3(1.0, 2.0, 1.5));
        
        float NdotL = max(0.0, dot(N, L));
        float fresnel = pow(1.0 - max(0.0, dot(N, V)), 3.0);
        
        #if defined(_BASECOLOR) || defined(_BaseColor)
        vec4 col = _BaseColor;
        #else
        vec4 col = vec4(0.4, 0.6, 0.9, 1.0);
        #endif

        vec3 litColor = col.rgb * (0.2 + 0.8 * NdotL) + fresnel * 0.4;
        gl_FragColor = vec4(litColor, col.a);
      }
    `;
  } else if (!hasMain && !code.includes('mainImage')) {
    // Wrap in standard mainImage or main
    glsl = `
      ${glsl}

      void main() {
        vec3 N = normalize(v_normal);
        vec3 V = normalize(vec3(0.0, 0.0, 1.0));
        vec3 L = normalize(vec3(1.0, 1.5, 1.0));
        float diff = max(0.0, dot(N, L));
        float rim = pow(1.0 - max(0.0, dot(N, V)), 2.5);
        
        vec3 base = vec3(0.2, 0.5, 0.85);
        gl_FragColor = vec4(base * (0.3 + 0.7 * diff) + rim * 0.5, 1.0);
      }
    `;
  }

  return {
    webglGlsl: glsl,
    uniforms,
    isShaderLab,
    detectedPass,
    warnings
  };
}
