/**
 * SRP Batching Assistant & Automated HLSL Refactoring Engine
 * 
 * Scans generated/edited HLSL shaders to identify SRP Batcher bottlenecks,
 * 16-byte alignment waste, unbuffered uniforms, and legacy sampler constructs,
 * and generates actionable refactoring steps with interactive diffs.
 */

export interface BatchingRefactoringStep {
  id: string;
  title: string;
  category: 'alignment' | 'cbuffer_wrap' | 'packing' | 'sampler_separation' | 'precision';
  severity: 'critical' | 'warning' | 'optimization';
  impactDescription: string;
  savingsDescription?: string;
  explanation: string;
  beforeSnippet: string;
  afterSnippet: string;
  applied: boolean;
  apply: (code: string) => string;
}

export interface BatchingScanReport {
  overallHealthScore: number; // 0-100
  isBatcherCompatible: boolean;
  totalProposals: number;
  criticalCount: number;
  warningsCount: number;
  optimizationsCount: number;
  cbufferByteSize: number;
  paddingBytes: number;
  packingEfficiency: number; // 0-100%
  proposals: BatchingRefactoringStep[];
}

interface UniformVar {
  type: string;
  name: string;
  size: number;
  originalLine: string;
}

const TYPE_SIZES: Record<string, number> = {
  float: 4,
  half: 4, // in HLSL constant buffers, half still occupies 4-byte slot
  int: 4,
  uint: 4,
  fixed: 4,
  float2: 8,
  half2: 8,
  int2: 8,
  uint2: 8,
  fixed2: 8,
  float3: 12,
  half3: 12,
  int3: 12,
  uint3: 12,
  fixed3: 12,
  float4: 16,
  half4: 16,
  int4: 16,
  uint4: 16,
  fixed4: 16,
  float4x4: 64,
  half4x4: 64,
  matrix: 64,
};

function getVarByteSize(type: string): number {
  return TYPE_SIZES[type] || 16;
}

/**
 * Scans HLSL code and creates automated refactoring proposals
 */
export function scanAndGenerateBatchingProposals(code: string): BatchingScanReport {
  if (!code || code.trim().length === 0) {
    return {
      overallHealthScore: 0,
      isBatcherCompatible: false,
      totalProposals: 0,
      criticalCount: 0,
      warningsCount: 0,
      optimizationsCount: 0,
      cbufferByteSize: 0,
      paddingBytes: 0,
      packingEfficiency: 0,
      proposals: [],
    };
  }

  const proposals: BatchingRefactoringStep[] = [];

  // 1. Check for CBUFFER presence & Loose Uniforms
  const cbufferMatch = code.match(/CBUFFER_START\s*\(\s*UnityPerMaterial\s*\)([\s\S]*?)CBUFFER_END/);
  const cbufferFound = !!cbufferMatch;
  const cbufferContent = cbufferMatch ? cbufferMatch[1] : '';

  // Extract variables inside CBUFFER
  const cbufferVars: UniformVar[] = [];
  if (cbufferFound) {
    const varLines = cbufferContent.split('\n');
    for (const line of varLines) {
      const cleanLine = line.trim().replace(/\/\/.*$/, '');
      if (!cleanLine || cleanLine.startsWith('#')) continue;
      
      const match = cleanLine.match(/\b(float4x4|float4|float3|float2|float|half4|half3|half2|half|int4|int3|int2|int|uint4|uint3|uint2|uint|fixed4|fixed3|fixed2|fixed)\s+([A-Za-z0-9_]+)\s*(?:\[\d+\])?\s*;/);
      if (match) {
        cbufferVars.push({
          type: match[1],
          name: match[2],
          size: getVarByteSize(match[1]),
          originalLine: line.trim(),
        });
      }
    }
  }

  // Find loose uniforms outside CBUFFER
  const codeWithoutCbuffer = code.replace(/CBUFFER_START[\s\S]*?CBUFFER_END/g, '');
  const looseUniformRegex = /\b(?:uniform\s+)?(float4x4|float4|float3|float2|float|half4|half3|half2|half|int4|int3|int2|int|uint4|uint3|uint2|uint|fixed4|fixed3|fixed2|fixed)\s+(_[A-Za-z0-9_]+)\s*;/g;
  
  const looseVars: UniformVar[] = [];
  let looseMatch;
  while ((looseMatch = looseUniformRegex.exec(codeWithoutCbuffer)) !== null) {
    const type = looseMatch[1];
    const name = looseMatch[2];
    if (!name.startsWith('unity_') && !name.startsWith('gl_') && !name.endsWith('_ST') && !name.endsWith('_TexelSize')) {
      if (!cbufferVars.some(v => v.name === name)) {
        looseVars.push({
          type,
          name,
          size: getVarByteSize(type),
          originalLine: looseMatch[0],
        });
      }
    }
  }

  // PROPOSAL 1: Enclose loose uniforms into CBUFFER_START(UnityPerMaterial)
  if (!cbufferFound && looseVars.length > 0) {
    const declarations = looseVars.map(v => `    ${v.type} ${v.name};`).join('\n');
    const newCbufferBlock = `CBUFFER_START(UnityPerMaterial)\n${declarations}\nCBUFFER_END`;
    
    proposals.push({
      id: 'prop-wrap-cbuffer-full',
      title: `Wrap ${looseVars.length} loose uniforms in CBUFFER_START(UnityPerMaterial)`,
      category: 'cbuffer_wrap',
      severity: 'critical',
      impactDescription: 'Enables Unity SRP Batcher for this shader by placing all material variables in GPU constant memory.',
      savingsDescription: 'Allows 100% draw-call batching across all instances sharing this shader.',
      explanation: 'Unity SRP Batcher requires all non-texture material parameters to be enclosed inside CBUFFER_START(UnityPerMaterial) ... CBUFFER_END. Unbuffered global variables force standard slow CPU state uploads.',
      beforeSnippet: looseVars.map(v => `${v.type} ${v.name};`).join('\n'),
      afterSnippet: newCbufferBlock,
      applied: false,
      apply: (srcCode: string) => {
        let updated = srcCode;
        // Remove individual loose lines
        for (const v of looseVars) {
          const regex = new RegExp(`\\b(?:uniform\\s+)?${v.type}\\s+${v.name}\\s*;`, 'g');
          updated = updated.replace(regex, '');
        }
        // Insert CBUFFER before vertex / fragment shader or after #includes
        if (/CBUFFER_START/i.test(updated)) {
          // Add to existing CBUFFER
          updated = updated.replace(/CBUFFER_START\s*\(\s*UnityPerMaterial\s*\)/, `CBUFFER_START(UnityPerMaterial)\n${declarations}`);
        } else {
          // Insert after includes/pragmas or before struct
          const insertPoint = updated.indexOf('struct Attributes') !== -1 
            ? updated.indexOf('struct Attributes') 
            : updated.indexOf('Varyings') !== -1 
              ? updated.indexOf('Varyings')
              : updated.indexOf('Pass');
          if (insertPoint !== -1) {
            updated = updated.slice(0, insertPoint) + `\n// SRP Batcher Uniform Constant Buffer\n${newCbufferBlock}\n\n` + updated.slice(insertPoint);
          } else {
            updated = `${newCbufferBlock}\n\n` + updated;
          }
        }
        return updated;
      },
    });
  } else if (cbufferFound && looseVars.length > 0) {
    // Some variables are outside existing CBUFFER
    const looseDecls = looseVars.map(v => `    ${v.type} ${v.name};`).join('\n');
    proposals.push({
      id: 'prop-move-loose-to-cbuffer',
      title: `Move ${looseVars.length} unbuffered uniform(s) into existing CBUFFER`,
      category: 'cbuffer_wrap',
      severity: 'critical',
      impactDescription: `Moves ${looseVars.map(v => v.name).join(', ')} into CBUFFER_START(UnityPerMaterial).`,
      savingsDescription: 'Eliminates SRP Batcher breakages due to loose uniform state leaks.',
      explanation: 'All material parameters must reside in the single UnityPerMaterial constant buffer.',
      beforeSnippet: looseVars.map(v => `${v.type} ${v.name};`).join('\n'),
      afterSnippet: `CBUFFER_START(UnityPerMaterial)\n    // Existing variables...\n${looseDecls}\nCBUFFER_END`,
      applied: false,
      apply: (srcCode: string) => {
        let updated = srcCode;
        for (const v of looseVars) {
          const regex = new RegExp(`\\b(?:uniform\\s+)?${v.type}\\s+${v.name}\\s*;`, 'g');
          updated = updated.replace(regex, '');
        }
        updated = updated.replace(/CBUFFER_START\s*\(\s*UnityPerMaterial\s*\)([\s\S]*?)CBUFFER_END/, (full, inner) => {
          return `CBUFFER_START(UnityPerMaterial)${inner}\n${looseDecls}\nCBUFFER_END`;
        });
        return updated;
      },
    });
  }

  // 2. Alignment & Packing Analysis for CBUFFER
  let rawByteSize = 0;
  let currentRegisterByteOffset = 0;
  let paddingBytes = 0;

  for (const v of cbufferVars) {
    const varSize = v.size;
    const remainingInRegister = 16 - (currentRegisterByteOffset % 16);
    if (remainingInRegister < 16 && varSize > remainingInRegister) {
      const pad = remainingInRegister;
      paddingBytes += pad;
      currentRegisterByteOffset += pad;
    }
    currentRegisterByteOffset += varSize;
    rawByteSize += varSize;
  }
  const remainder = currentRegisterByteOffset % 16;
  if (remainder > 0) {
    paddingBytes += (16 - remainder);
    currentRegisterByteOffset += (16 - remainder);
  }

  const finalCbufferSize = cbufferFound ? currentRegisterByteOffset : 0;
  const packingEfficiency = finalCbufferSize > 0 
    ? Math.round(((finalCbufferSize - paddingBytes) / finalCbufferSize) * 100) 
    : (cbufferFound ? 100 : 0);

  // PROPOSAL 2: Pack multiple individual scalar float / float2 / half variables into a single float4 vector register
  const scalarFloatVars = cbufferVars.filter(v => (v.type === 'float' || v.type === 'half') && !v.name.includes('Padding'));
  if (scalarFloatVars.length >= 3 && scalarFloatVars.length <= 8) {
    // E.g. _Speed, _Intensity, _Scale -> float4 _AnimationParams (x: _Speed, y: _Intensity, z: _Scale, w: _Extra)
    const targetGroup = scalarFloatVars.slice(0, 4);
    const packedName = '_PackedParams';
    const components = ['x', 'y', 'z', 'w'];
    const componentDocs = targetGroup.map((v, i) => `${components[i]}: ${v.name}`).join(', ');
    
    const beforeBlock = targetGroup.map(v => `    ${v.type} ${v.name};`).join('\n');
    const afterBlock = `    // Packed 16-byte aligned vector register\n    float4 ${packedName}; // (${componentDocs})\n` +
      targetGroup.map((v, i) => `    #define ${v.name} (${packedName}.${components[i]})`).join('\n');

    proposals.push({
      id: 'prop-pack-scalar-floats',
      title: `Pack ${targetGroup.length} float uniforms (${targetGroup.map(v => v.name).join(', ')}) into a float4 register`,
      category: 'packing',
      severity: 'optimization',
      impactDescription: `Combines ${targetGroup.length} scalar floats into one aligned float4 vector (${packedName}), eliminating alignment waste and GPU constant register fragmentation.`,
      savingsDescription: `Saves up to ${(4 - targetGroup.length % 4) * 4} padding bytes and guarantees single-slot 16-byte GPU fetch.`,
      explanation: `GPUs fetch constant buffers in 128-bit (16-byte) cache lines. Multiple scalar floats scattered across registers increase memory bandwidth pressure. Packing them into a float4 register ensures optimal hardware occupancy.`,
      beforeSnippet: beforeBlock,
      afterSnippet: afterBlock,
      applied: false,
      apply: (srcCode: string) => {
        let updated = srcCode;
        if (cbufferMatch) {
          let updatedCbuffer = cbufferContent;
          for (const v of targetGroup) {
            const regex = new RegExp(`^\\s*${v.type}\\s+${v.name}\\s*;.*$`, 'm');
            updatedCbuffer = updatedCbuffer.replace(regex, '');
          }
          // Insert packed vector and #defines at end of CBUFFER
          updatedCbuffer = `${updatedCbuffer.trimEnd()}\n\n${afterBlock}\n`;
          updated = updated.replace(/CBUFFER_START\s*\(\s*UnityPerMaterial\s*\)([\s\S]*?)CBUFFER_END/, `CBUFFER_START(UnityPerMaterial)\n${updatedCbuffer}CBUFFER_END`);
        }
        return updated;
      },
    });
  }

  // PROPOSAL 3: Reorder CBUFFER variables by alignment (matrices -> float4 -> float3+float -> float2 -> float)
  if (cbufferFound && paddingBytes > 0 && cbufferVars.length >= 3) {
    const sortedVars = [...cbufferVars].sort((a, b) => {
      // 1. float4x4 / matrix (64 bytes)
      // 2. float4 / half4 / Color (16 bytes)
      // 3. float3 / half3 (12 bytes)
      // 4. float2 / half2 (8 bytes)
      // 5. float / half / int (4 bytes)
      return b.size - a.size;
    });

    const isAlreadySorted = cbufferVars.every((v, i) => v.name === sortedVars[i]?.name);
    if (!isAlreadySorted) {
      const sortedContent = sortedVars.map(v => `    ${v.type} ${v.name};`).join('\n');
      
      proposals.push({
        id: 'prop-reorder-cbuffer',
        title: `Reorder CBUFFER variables to eliminate 16-byte alignment holes`,
        category: 'alignment',
        severity: 'warning',
        impactDescription: `Reorganizes ${cbufferVars.length} variables by alignment tier (float4x4 → float4 → float3 → float2 → float).`,
        savingsDescription: `Eliminates ${paddingBytes} bytes of dead padding and raises packing efficiency to 100%.`,
        explanation: `In HLSL constant buffers, variables cannot cross 16-byte boundaries. If a 4-byte float precedes a 16-byte float4, the compiler inserts 12 bytes of unusable padding. Sorting by size creates zero-padding packing.`,
        beforeSnippet: `CBUFFER_START(UnityPerMaterial)\n` + cbufferVars.map(v => `    ${v.type} ${v.name};`).join('\n') + `\nCBUFFER_END`,
        afterSnippet: `CBUFFER_START(UnityPerMaterial)\n    // Optimized zero-padding alignment\n${sortedContent}\nCBUFFER_END`,
        applied: false,
        apply: (srcCode: string) => {
          return srcCode.replace(/CBUFFER_START\s*\(\s*UnityPerMaterial\s*\)([\s\S]*?)CBUFFER_END/, () => {
            return `CBUFFER_START(UnityPerMaterial)\n    // Optimized 16-byte zero-padding alignment\n${sortedContent}\nCBUFFER_END`;
          });
        },
      });
    }
  }

  // PROPOSAL 4: Convert legacy sampler2D to separated TEXTURE2D and SAMPLER
  const hasLegacySampler = /\bsampler2D\s+([A-Za-z0-9_]+)\s*;/.test(code) || /\btex2D\s*\(/.test(code);
  if (hasLegacySampler) {
    const samplerMatches: string[] = [];
    const samplerRegex = /\bsampler2D\s+([A-Za-z0-9_]+)\s*;/g;
    let sMatch;
    while ((sMatch = samplerRegex.exec(code)) !== null) {
      samplerMatches.push(sMatch[1]);
    }

    const beforeSnippet = samplerMatches.map(name => `sampler2D ${name};`).join('\n') + '\n\n// Usage in fragment shader:\ntex2D(_MainTex, input.uv);';
    const afterSnippet = samplerMatches.map(name => `TEXTURE2D(${name});\nSAMPLER(sampler${name});`).join('\n') + '\n\n// Modern separated texture sampling:\nSAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv);';

    proposals.push({
      id: 'prop-separate-samplers',
      title: `Modernize ${samplerMatches.length || 1} legacy sampler2D into TEXTURE2D & SAMPLER`,
      category: 'sampler_separation',
      severity: 'warning',
      impactDescription: 'Converts legacy D3D9/OpenGL style sampler2D to modern HLSL Texture2D and SamplerState separation.',
      savingsDescription: 'Allows texture sampling sharing and prevents mobile hardware 16-sampler register cap overflow.',
      explanation: 'Modern graphics APIs (DirectX 11/12, Vulkan, Metal) decouple Texture storage from Sampler filtering states. Using separated TEXTURE2D/SAMPLER macros is required for SRP cross-platform performance.',
      beforeSnippet,
      afterSnippet,
      applied: false,
      apply: (srcCode: string) => {
        let updated = srcCode;
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
        // Replace tex2Dlod(tex, uv) calls
        updated = updated.replace(/\btex2Dlod\s*\(\s*([A-Za-z0-9_]+)\s*,\s*float4\(([^,]+),\s*([^,]+),\s*([^)]+)\)\)/g, (m, texName, u, v, lod) => {
          const sName = texName.startsWith('_') ? `sampler${texName}` : `sampler_${texName}`;
          return `SAMPLE_TEXTURE2D_LOD(${texName}, ${sName}, float2(${u}, ${v}), ${lod.trim()})`;
        });
        return updated;
      },
    });
  }

  // PROPOSAL 5: Modernize legacy 'fixed' / 'fixed4' types
  const hasFixedType = /\b(fixed|fixed2|fixed3|fixed4)\b/.test(code);
  if (hasFixedType) {
    proposals.push({
      id: 'prop-modernize-fixed-types',
      title: 'Modernize deprecated fixed/fixed4 precision types to half/half4',
      category: 'precision',
      severity: 'optimization',
      impactDescription: 'Replaces legacy fixed precision keywords with standard half and float for modern GPUs.',
      savingsDescription: 'Guarantees cross-compilation compatibility with SPIR-V, Metal Shading Language, and DXIL.',
      explanation: 'The fixed precision type was used in older fixed-function and OpenGL ES 1.x/2.0 hardware. Modern compilers treat fixed as full 16-bit or 32-bit float anyway; replacing them prevents HLSL warning diagnostic noise.',
      beforeSnippet: 'fixed4 col = fixed4(1, 0, 0, 1);\nfixed diffuse = dot(n, l);',
      afterSnippet: 'half4 col = half4(1, 0, 0, 1);\nhalf diffuse = dot(n, l);',
      applied: false,
      apply: (srcCode: string) => {
        return srcCode
          .replace(/\bfixed4\b/g, 'half4')
          .replace(/\bfixed3\b/g, 'half3')
          .replace(/\bfixed2\b/g, 'half2')
          .replace(/\bfixed\b/g, 'half');
      },
    });
  }

  // Calculate Overall Health Score (0-100)
  let healthScore = 100;
  if (!cbufferFound) healthScore -= 45;
  if (looseVars.length > 0) healthScore -= Math.min(30, looseVars.length * 10);
  if (paddingBytes > 16) healthScore -= 15;
  else if (paddingBytes > 0) healthScore -= 8;
  if (hasLegacySampler) healthScore -= 10;
  if (hasFixedType) healthScore -= 5;
  healthScore = Math.max(10, Math.min(100, healthScore));

  const criticalCount = proposals.filter(p => p.severity === 'critical').length;
  const warningsCount = proposals.filter(p => p.severity === 'warning').length;
  const optimizationsCount = proposals.filter(p => p.severity === 'optimization').length;

  return {
    overallHealthScore: healthScore,
    isBatcherCompatible: cbufferFound && looseVars.length === 0,
    totalProposals: proposals.length,
    criticalCount,
    warningsCount,
    optimizationsCount,
    cbufferByteSize: finalCbufferSize,
    paddingBytes,
    packingEfficiency,
    proposals,
  };
}
