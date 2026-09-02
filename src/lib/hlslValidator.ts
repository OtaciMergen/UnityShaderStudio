/**
 * Real-Time HLSL & ShaderLab Syntax & Semantic Validator
 * 
 * Inspects HLSL and ShaderLab source code for:
 * - Missing semicolons on statements, structs, CBUFFERs, return values
 * - Undefined legacy CG built-in macros (UNITY_MATRIX_MVP, UnityObjectToClipPos, tex2D, etc.)
 * - GLSL remnants (vec2/3/4, mat4, mix, fract, mod, atan 2-arg, gl_FragColor)
 * - Mismatched braces, parentheses, and block directives (HLSLPROGRAM / ENDHLSL)
 * - CBUFFER / SRP Batcher violations (textures in CBUFFER, missing CBUFFER_END)
 * - Entry point & semantic validation (#pragma vertex/fragment matching, SV_Target, SV_POSITION)
 * - Texture & Sampler separation compliance
 * - Missing URP Core / Lighting include headers
 */

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface DiagnosticQuickFix {
  id: string;
  title: string;
  description?: string;
  applyFix: (fullCode: string) => string;
}

export interface HlslDiagnostic {
  id: string;
  line: number; // 1-indexed
  columnStart?: number;
  columnEnd?: number;
  severity: DiagnosticSeverity;
  code: string;
  message: string;
  explanation: string;
  offendingText?: string;
  suggestedFix?: string;
  quickFixes?: DiagnosticQuickFix[];
}

export interface ValidationSummary {
  diagnostics: HlslDiagnostic[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
  isValid: boolean;
}

/**
 * Remove multi-line and single-line comments for pure token scanning
 * while keeping line count and newline offsets intact.
 */
function stripCommentsPreserveLines(code: string): string {
  let result = '';
  let inSingleComment = false;
  let inMultiComment = false;
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const next = i + 1 < code.length ? code[i + 1] : '';

    if (inSingleComment) {
      if (char === '\n') {
        inSingleComment = false;
        result += '\n';
      } else {
        result += ' ';
      }
    } else if (inMultiComment) {
      if (char === '*' && next === '/') {
        inMultiComment = false;
        result += '  ';
        i++;
      } else if (char === '\n') {
        result += '\n';
      } else {
        result += ' ';
      }
    } else if (inString) {
      if (char === stringChar && code[i - 1] !== '\\') {
        inString = false;
      }
      result += char;
    } else {
      if (char === '/' && next === '/') {
        inSingleComment = true;
        result += '  ';
        i++;
      } else if (char === '/' && next === '*') {
        inMultiComment = true;
        result += '  ';
        i++;
      } else if (char === '"' || char === "'") {
        inString = true;
        stringChar = char;
        result += char;
      } else {
        result += char;
      }
    }
  }

  return result;
}

/**
 * Run comprehensive HLSL syntax and semantic validation
 */
export function validateHlslCode(code: string): ValidationSummary {
  if (!code || !code.trim()) {
    return {
      diagnostics: [],
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      isValid: true,
    };
  }

  const diagnostics: HlslDiagnostic[] = [];
  const lines = code.split('\n');
  const strippedCode = stripCommentsPreserveLines(code);
  const strippedLines = strippedCode.split('\n');

  // =========================================================================
  // 1. Structural Checks: Braces, Parentheses, Brackets, Blocks
  // =========================================================================
  validateBracketBalance(code, lines, diagnostics);
  validateShaderLabBlocks(code, lines, diagnostics);

  // =========================================================================
  // 2. Pragmas and Function Entry Points
  // =========================================================================
  validatePragmaEntryPoints(code, lines, strippedCode, diagnostics);

  // =========================================================================
  // 3. Includes & Core Libraries
  // =========================================================================
  validateIncludesAndDependencies(code, lines, diagnostics);

  // =========================================================================
  // 4. Line-by-Line Checks: Semicolons, Legacy CG, GLSL Types, Structs, CBUFFER
  // =========================================================================
  let insideStruct = false;
  let structName = '';
  let insideCbuffer = false;
  let cbufferStartLine = 0;
  let insideProperties = false;
  let insideHlslProgram = false;

  for (let idx = 0; idx < lines.length; idx++) {
    const lineNum = idx + 1;
    const rawLine = lines[idx];
    const strippedLine = strippedLines[idx].trim();

    // Track ShaderLab / HLSL block state
    if (/\bHLSLPROGRAM\b|\bCGPROGRAM\b/.test(strippedLine)) {
      insideHlslProgram = true;
    }
    if (/\bENDHLSL\b|\bENDCG\b/.test(strippedLine)) {
      insideHlslProgram = false;
    }
    if (/\bProperties\b\s*\{?/.test(strippedLine)) {
      insideProperties = true;
    }
    if (insideProperties && /^\s*\}\s*$/.test(strippedLine)) {
      insideProperties = false;
    }

    // Track struct definition
    const structMatch = strippedLine.match(/\bstruct\s+([A-Za-z0-9_]+)/);
    if (structMatch) {
      insideStruct = true;
      structName = structMatch[1];
    }

    // Track CBUFFER
    if (/\bCBUFFER_START\s*\(/i.test(strippedLine)) {
      insideCbuffer = true;
      cbufferStartLine = lineNum;

      // Check: Semicolon after CBUFFER_START(...) macro
      if (/\bCBUFFER_START\s*\([^)]*\)\s*;/.test(strippedLine)) {
        diagnostics.push({
          id: `diag-cbuffer-semi-${lineNum}`,
          line: lineNum,
          severity: 'error',
          code: 'HLSL_CBUFFER_SEMI',
          message: 'Syntax Error: Semicolon after CBUFFER_START macro',
          explanation: 'The CBUFFER_START(name) macro defines a struct header and must not end with a semicolon in HLSL/DXC.',
          offendingText: strippedLine,
          suggestedFix: strippedLine.replace(/;\s*$/, ''),
          quickFixes: [
            {
              id: `fix-cbuffer-semi-${lineNum}`,
              title: 'Remove trailing semicolon from CBUFFER_START',
              applyFix: (src) => {
                const srcLines = src.split('\n');
                if (srcLines[lineNum - 1]) {
                  srcLines[lineNum - 1] = srcLines[lineNum - 1].replace(/(CBUFFER_START\s*\([^)]*\))\s*;/, '$1');
                }
                return srcLines.join('\n');
              }
            }
          ]
        });
      }

      // Check: CBUFFER missing UnityPerMaterial in standard URP
      if (!/CBUFFER_START\s*\(\s*UnityPerMaterial\s*\)/i.test(strippedLine) && /RenderPipeline.*Universal/i.test(code)) {
        diagnostics.push({
          id: `diag-cbuffer-name-${lineNum}`,
          line: lineNum,
          severity: 'warning',
          code: 'SRP_CBUFFER_NAME',
          message: 'Non-standard CBUFFER block name (Expected UnityPerMaterial)',
          explanation: 'Universal Render Pipeline SRP Batcher requires material properties to be declared in CBUFFER_START(UnityPerMaterial).',
          suggestedFix: 'CBUFFER_START(UnityPerMaterial)',
          quickFixes: [
            {
              id: `fix-cbuffer-name-${lineNum}`,
              title: 'Change CBUFFER name to UnityPerMaterial',
              applyFix: (src) => {
                const srcLines = src.split('\n');
                if (srcLines[lineNum - 1]) {
                  srcLines[lineNum - 1] = srcLines[lineNum - 1].replace(/CBUFFER_START\s*\([^)]+\)/i, 'CBUFFER_START(UnityPerMaterial)');
                }
                return srcLines.join('\n');
              }
            }
          ]
        });
      }
    }

    if (/\bCBUFFER_END\b/i.test(strippedLine)) {
      insideCbuffer = false;
      // Check: Semicolon missing after CBUFFER_END
      if (!/CBUFFER_END\s*;/.test(strippedLine)) {
        diagnostics.push({
          id: `diag-cbuffer-end-semi-${lineNum}`,
          line: lineNum,
          severity: 'error',
          code: 'HLSL_CBUFFER_END_SEMI',
          message: 'Missing semicolon after CBUFFER_END',
          explanation: 'In HLSL/DX11/DX12, CBUFFER_END must terminate with a semicolon (CBUFFER_END;).',
          suggestedFix: 'CBUFFER_END;',
          quickFixes: [
            {
              id: `fix-cbuffer-end-semi-${lineNum}`,
              title: 'Add semicolon: CBUFFER_END;',
              applyFix: (src) => {
                const srcLines = src.split('\n');
                if (srcLines[lineNum - 1]) {
                  srcLines[lineNum - 1] = srcLines[lineNum - 1].replace(/CBUFFER_END(?!\s*;)/, 'CBUFFER_END;');
                }
                return srcLines.join('\n');
              }
            }
          ]
        });
      }
    }

    // Check: Textures or Samplers declared inside CBUFFER
    if (insideCbuffer) {
      if (/\b(TEXTURE2D|Texture2D|sampler2D|SAMPLER|SamplerState|TextureCube|TEXTURECUBE)\b/.test(strippedLine)) {
        diagnostics.push({
          id: `diag-cbuffer-tex-${lineNum}`,
          line: lineNum,
          severity: 'error',
          code: 'SRP_TEXTURE_IN_CBUFFER',
          message: 'Invalid texture or sampler declaration inside CBUFFER',
          explanation: 'Constant Buffers (CBUFFER) can only contain uniform data (floats, vectors, matrices). Textures and Samplers must be declared outside of CBUFFER in global register space.',
          suggestedFix: '// Move texture declaration outside CBUFFER_START...CBUFFER_END;',
        });
      }
    }

    // Check struct close
    if (insideStruct && /^\s*\}\s*;?\s*$/.test(strippedLine)) {
      insideStruct = false;
      if (!/;\s*$/.test(strippedLine)) {
        diagnostics.push({
          id: `diag-struct-semi-${lineNum}`,
          line: lineNum,
          severity: 'error',
          code: 'HLSL_STRUCT_SEMI',
          message: `Missing semicolon after struct '${structName}' declaration`,
          explanation: `In HLSL/C++, struct declarations must end with a semicolon after the closing brace: '};'.`,
          suggestedFix: '};',
          quickFixes: [
            {
              id: `fix-struct-semi-${lineNum}`,
              title: 'Add semicolon after struct closing brace',
              applyFix: (src) => {
                const srcLines = src.split('\n');
                if (srcLines[lineNum - 1]) {
                  srcLines[lineNum - 1] = srcLines[lineNum - 1].replace(/\}\s*$/, '};');
                }
                return srcLines.join('\n');
              }
            }
          ]
        });
      }
    }

    // If inside struct body, check field semantics & missing semicolons
    if (insideStruct && !/^\s*struct\b/.test(strippedLine) && !/^\s*\{\s*$/.test(strippedLine) && !/^\s*\}\s*;?\s*$/.test(strippedLine)) {
      validateStructField(rawLine, lineNum, structName, diagnostics);
    }

    // Semicolon checks for standard statements in HLSLPROGRAM
    if (insideHlslProgram && !insideProperties) {
      validateStatementSemicolon(rawLine, strippedLine, lineNum, diagnostics);
    }

    // Legacy CG / Built-in Pipeline Macros
    validateLegacyCgMacros(rawLine, lineNum, diagnostics);

    // GLSL remnants
    validateGlslSyntax(rawLine, lineNum, diagnostics);

    // Legacy Texture Sampling functions
    validateLegacyTextureSampling(rawLine, lineNum, diagnostics);

    // Preprocessor trailing semicolons
    validatePreprocessorDirectives(rawLine, strippedLine, lineNum, diagnostics);
  }

  // Check if CBUFFER was left unclosed
  if (insideCbuffer) {
    diagnostics.push({
      id: `diag-cbuffer-unclosed-${cbufferStartLine}`,
      line: cbufferStartLine,
      severity: 'error',
      code: 'HLSL_CBUFFER_UNCLOSED',
      message: 'Unclosed CBUFFER: Missing matching CBUFFER_END;',
      explanation: 'Every CBUFFER_START(...) must have a corresponding CBUFFER_END; to close the constant buffer definition.',
      suggestedFix: 'CBUFFER_END;',
      quickFixes: [
        {
          id: 'fix-cbuffer-close',
          title: 'Insert CBUFFER_END; before function definitions',
          applyFix: (src) => {
            return src.replace(/(CBUFFER_START[\s\S]*?)((\n\s*(?:struct|float4|void|half4)\b)|$)/, '$1\nCBUFFER_END;\n$2');
          }
        }
      ]
    });
  }

  // Sort diagnostics by line number ascending, then severity
  diagnostics.sort((a, b) => {
    if (a.line !== b.line) return a.line - b.line;
    const severityOrder = { error: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  const errorCount = diagnostics.filter(d => d.severity === 'error').length;
  const warningCount = diagnostics.filter(d => d.severity === 'warning').length;
  const infoCount = diagnostics.filter(d => d.severity === 'info').length;

  return {
    diagnostics,
    errorCount,
    warningCount,
    infoCount,
    isValid: errorCount === 0,
  };
}

/**
 * Validates bracket/brace/parenthesis pairing across the code
 */
function validateBracketBalance(code: string, lines: string[], diagnostics: HlslDiagnostic[]) {
  const stack: Array<{ char: string; line: number; col: number }> = [];
  const stripped = stripCommentsPreserveLines(code);

  let currentLine = 1;
  let currentCol = 1;

  for (let i = 0; i < stripped.length; i++) {
    const ch = stripped[i];

    if (ch === '\n') {
      currentLine++;
      currentCol = 1;
      continue;
    }

    if (ch === '{' || ch === '(' || ch === '[') {
      stack.push({ char: ch, line: currentLine, col: currentCol });
    } else if (ch === '}' || ch === ')' || ch === ']') {
      if (stack.length === 0) {
        diagnostics.push({
          id: `diag-unmatched-close-${currentLine}-${currentCol}`,
          line: currentLine,
          columnStart: currentCol,
          severity: 'error',
          code: 'HLSL_UNMATCHED_BRACKET',
          message: `Unexpected closing '${ch}' with no matching open bracket`,
          explanation: `Found a closing '${ch}' that has no corresponding open bracket. This will cause fatal compiler syntax errors.`,
        });
      } else {
        const top = stack.pop()!;
        const expected = top.char === '{' ? '}' : top.char === '(' ? ')' : ']';
        if (ch !== expected) {
          diagnostics.push({
            id: `diag-mismatched-bracket-${currentLine}-${currentCol}`,
            line: currentLine,
            columnStart: currentCol,
            severity: 'error',
            code: 'HLSL_MISMATCHED_BRACKET',
            message: `Mismatched bracket: Expected '${expected}' but found '${ch}' (opened at line ${top.line})`,
            explanation: `An open bracket '${top.char}' at line ${top.line} was closed with '${ch}' instead of '${expected}'.`,
          });
        }
      }
    }

    currentCol++;
  }

  // Unclosed brackets remaining on stack
  while (stack.length > 0) {
    const unclosed = stack.pop()!;
    const matchingClose = unclosed.char === '{' ? '}' : unclosed.char === '(' ? ')' : ']';
    diagnostics.push({
      id: `diag-unclosed-bracket-${unclosed.line}-${unclosed.col}`,
      line: unclosed.line,
      columnStart: unclosed.col,
      severity: 'error',
      code: 'HLSL_UNCLOSED_BRACKET',
      message: `Unclosed '${unclosed.char}': Missing matching '${matchingClose}'`,
      explanation: `The opening '${unclosed.char}' on line ${unclosed.line} is never closed before the end of the file.`,
      suggestedFix: `Add '${matchingClose}' to close the block.`,
    });
  }
}

/**
 * Validates ShaderLab envelope and Pass structure
 */
function validateShaderLabBlocks(code: string, lines: string[], diagnostics: HlslDiagnostic[]) {
  const hasShaderLab = /^\s*Shader\s+"[^"]*"/m.test(code);
  if (!hasShaderLab) return; // Pure HLSL file, skip ShaderLab check

  const hlslprogramCount = (code.match(/\bHLSLPROGRAM\b/g) || []).length;
  const endhlslCount = (code.match(/\bENDHLSL\b/g) || []).length;

  if (hlslprogramCount > endhlslCount) {
    // Find last line with HLSLPROGRAM
    let lastHlslProgramLine = 1;
    lines.forEach((l, idx) => {
      if (/\bHLSLPROGRAM\b/.test(l)) lastHlslProgramLine = idx + 1;
    });

    diagnostics.push({
      id: `diag-unclosed-hlslprogram-${lastHlslProgramLine}`,
      line: lastHlslProgramLine,
      severity: 'error',
      code: 'SHADERLAB_UNCLOSED_HLSLPROGRAM',
      message: 'Unclosed HLSLPROGRAM block: Missing ENDHLSL directive',
      explanation: 'Every HLSLPROGRAM block inside a ShaderLab Pass must be closed with an ENDHLSL directive.',
      suggestedFix: 'ENDHLSL',
      quickFixes: [
        {
          id: 'fix-add-endhlsl',
          title: 'Append ENDHLSL to close pass',
          applyFix: (src) => src + '\n            ENDHLSL\n        }\n    }\n}'
        }
      ]
    });
  }

  const cgprogramCount = (code.match(/\bCGPROGRAM\b/g) || []).length;
  const endcgCount = (code.match(/\bENDCG\b/g) || []).length;

  if (cgprogramCount > 0) {
    // Flag CGPROGRAM in SRP
    let cgLine = 1;
    lines.forEach((l, idx) => {
      if (/\bCGPROGRAM\b/.test(l)) cgLine = idx + 1;
    });

    diagnostics.push({
      id: `diag-cgprogram-srp-${cgLine}`,
      line: cgLine,
      severity: 'warning',
      code: 'SRP_CGPROGRAM_DEPRECATED',
      message: 'Deprecated CGPROGRAM block in Universal Render Pipeline',
      explanation: 'Unity Scriptable Render Pipelines (URP & HDRP) recommend HLSLPROGRAM ... ENDHLSL blocks with modern HLSL syntax instead of legacy CGPROGRAM blocks.',
      suggestedFix: 'HLSLPROGRAM',
      quickFixes: [
        {
          id: 'fix-convert-to-hlslprogram',
          title: 'Replace CGPROGRAM/ENDCG with HLSLPROGRAM/ENDHLSL',
          applyFix: (src) => src.replace(/\bCGPROGRAM\b/g, 'HLSLPROGRAM').replace(/\bENDCG\b/g, 'ENDHLSL')
        }
      ]
    });
  }
}

/**
 * Validates #pragma vertex / #pragma fragment entry points against declared functions
 */
function validatePragmaEntryPoints(code: string, lines: string[], strippedCode: string, diagnostics: HlslDiagnostic[]) {
  const vertPragmaMatch = code.match(/#pragma\s+vertex\s+([A-Za-z0-9_]+)/);
  const fragPragmaMatch = code.match(/#pragma\s+fragment\s+([A-Za-z0-9_]+)/);

  if (vertPragmaMatch) {
    const vertName = vertPragmaMatch[1];
    // Check if function definition exists: e.g. Varyings vert(Attributes input) or void vert(...)
    const vertFuncRegex = new RegExp(`\\b(?:Varyings|v2f|float4|void|VertexOutput)\\s+${vertName}\\s*\\(`, 'm');
    if (!vertFuncRegex.test(strippedCode)) {
      // Find line of pragma
      let pragmaLine = 1;
      lines.forEach((l, idx) => {
        if (new RegExp(`#pragma\\s+vertex\\s+${vertName}`).test(l)) pragmaLine = idx + 1;
      });

      diagnostics.push({
        id: `diag-missing-vert-func-${pragmaLine}`,
        line: pragmaLine,
        severity: 'error',
        code: 'HLSL_UNDEFINED_ENTRY_POINT',
        message: `Undefined vertex entry point: function '${vertName}' not found`,
        explanation: `#pragma vertex ${vertName} declares '${vertName}' as the vertex shader entry point, but no function definition '${vertName}(...)' exists in this HLSL block.`,
        suggestedFix: `Varyings ${vertName}(Attributes input) { ... }`,
      });
    }
  }

  if (fragPragmaMatch) {
    const fragName = fragPragmaMatch[1];
    const fragFuncRegex = new RegExp(`\\b(?:half4|float4|void|FragmentOutput)\\s+${fragName}\\s*\\(`, 'm');
    if (!fragFuncRegex.test(strippedCode)) {
      let pragmaLine = 1;
      lines.forEach((l, idx) => {
        if (new RegExp(`#pragma\\s+fragment\\s+${fragName}`).test(l)) pragmaLine = idx + 1;
      });

      diagnostics.push({
        id: `diag-missing-frag-func-${pragmaLine}`,
        line: pragmaLine,
        severity: 'error',
        code: 'HLSL_UNDEFINED_ENTRY_POINT',
        message: `Undefined fragment entry point: function '${fragName}' not found`,
        explanation: `#pragma fragment ${fragName} declares '${fragName}' as the fragment shader entry point, but no function definition '${fragName}(...)' exists in this HLSL block.`,
        suggestedFix: `half4 ${fragName}(Varyings input) : SV_Target { ... }`,
      });
    }
  }
}

/**
 * Validates URP include paths and common missing headers
 */
function validateIncludesAndDependencies(code: string, lines: string[], diagnostics: HlslDiagnostic[]) {
  const hasTransformToHClip = /\bTransformObjectToHClip\b|\bTransformObjectToWorld\b|\bGetVertexPositionInputs\b/.test(code);
  const hasCoreInclude = /#include\s+"Packages\/com\.unity\.render-pipelines\.universal\/ShaderLibrary\/Core\.hlsl"/.test(code);

  if (hasTransformToHClip && !hasCoreInclude && !/ShaderLibrary\/Core\.hlsl/.test(code)) {
    // Find first function usage line
    let usageLine = 1;
    lines.forEach((l, idx) => {
      if (/\bTransformObjectToHClip\b|\bGetVertexPositionInputs\b/.test(l) && usageLine === 1) {
        usageLine = idx + 1;
      }
    });

    diagnostics.push({
      id: `diag-missing-core-hlsl-${usageLine}`,
      line: usageLine,
      severity: 'error',
      code: 'HLSL_MISSING_INCLUDE',
      message: 'Missing URP Core.hlsl include for transform functions',
      explanation: 'Functions like TransformObjectToHClip require including "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl".',
      suggestedFix: '#include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"',
      quickFixes: [
        {
          id: 'fix-add-core-include',
          title: 'Add #include Core.hlsl header',
          applyFix: (src) => {
            return src.replace(/(HLSLPROGRAM[\s\S]*?)(struct|TEXTURE2D|CBUFFER_START)/, '$1#include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"\n\n            $2');
          }
        }
      ]
    });
  }
}

/**
 * Validates struct member declarations for missing semantics and semicolons
 */
function validateStructField(rawLine: string, lineNum: number, structName: string, diagnostics: HlslDiagnostic[]) {
  const trimmed = rawLine.trim();
  if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) return;

  // Pattern: type name [: SEMANTIC] ;
  const typeMatch = trimmed.match(/^(float[1-4]?|half[1-4]?|int[1-4]?|uint[1-4]?|min16float[1-4]?)\s+([A-Za-z0-9_]+)/);
  if (!typeMatch) return;

  const fieldType = typeMatch[1];
  const fieldName = typeMatch[2];

  // Check missing semicolon
  if (!trimmed.endsWith(';')) {
    diagnostics.push({
      id: `diag-struct-field-semi-${lineNum}`,
      line: lineNum,
      severity: 'error',
      code: 'HLSL_MISSING_SEMICOLON',
      message: `Missing semicolon on struct field '${fieldName}'`,
      explanation: `Struct member '${fieldType} ${fieldName}' must end with a semicolon.`,
      suggestedFix: `${trimmed};`,
      quickFixes: [
        {
          id: `fix-field-semi-${lineNum}`,
          title: `Add semicolon to '${fieldName}'`,
          applyFix: (src) => {
            const srcLines = src.split('\n');
            if (srcLines[lineNum - 1]) {
              srcLines[lineNum - 1] = srcLines[lineNum - 1].replace(/\s*$/, ';');
            }
            return srcLines.join('\n');
          }
        }
      ]
    });
  }

  // Check missing semantic in Attributes / Varyings / v2f / appdata structs
  const isIoStruct = /Attributes|appdata|Varyings|v2f|VertexInput|VertexOutput/i.test(structName);
  if (isIoStruct && !trimmed.includes(':')) {
    let suggestedSemantic = ': TEXCOORD0';
    if (/pos|position/i.test(fieldName)) {
      suggestedSemantic = /Varyings|v2f|Output/i.test(structName) ? ': SV_POSITION' : ': POSITION';
    } else if (/normal/i.test(fieldName)) {
      suggestedSemantic = ': NORMAL';
    } else if (/tangent/i.test(fieldName)) {
      suggestedSemantic = ': TANGENT';
    } else if (/uv|texcoord/i.test(fieldName)) {
      suggestedSemantic = ': TEXCOORD0';
    } else if (/color/i.test(fieldName)) {
      suggestedSemantic = ': COLOR';
    }

    diagnostics.push({
      id: `diag-struct-missing-semantic-${lineNum}`,
      line: lineNum,
      severity: 'warning',
      code: 'HLSL_MISSING_SEMANTIC',
      message: `Missing HLSL semantic on '${structName}.${fieldName}'`,
      explanation: `Shader I/O struct fields in '${structName}' require hardware binding semantics (e.g. ${suggestedSemantic}) to pass data between pipeline stages.`,
      suggestedFix: `${fieldType} ${fieldName} ${suggestedSemantic};`,
      quickFixes: [
        {
          id: `fix-add-semantic-${lineNum}`,
          title: `Add semantic '${suggestedSemantic}'`,
          applyFix: (src) => {
            const srcLines = src.split('\n');
            if (srcLines[lineNum - 1]) {
              srcLines[lineNum - 1] = srcLines[lineNum - 1].replace(new RegExp(`(\\b${fieldName}\\b)\\s*;?`), `$1 ${suggestedSemantic};`);
            }
            return srcLines.join('\n');
          }
        }
      ]
    });
  }
}

/**
 * Validates semicolons in regular HLSL statement lines (assignments, return, variable declarations)
 */
function validateStatementSemicolon(rawLine: string, strippedLine: string, lineNum: number, diagnostics: HlslDiagnostic[]) {
  if (!strippedLine) return;
  // Ignore preprocessors, comments, opening/closing braces, control statements (if, for, while), labels
  if (
    strippedLine.startsWith('#') ||
    strippedLine.startsWith('//') ||
    strippedLine.startsWith('/*') ||
    strippedLine.startsWith('*') ||
    strippedLine.startsWith('{') ||
    strippedLine.endsWith('{') ||
    strippedLine.endsWith('}') ||
    /^\s*\}\s*else\s*\{?\s*$/.test(strippedLine) ||
    /^\s*(if|else|for|while|switch|case|default)\b/.test(strippedLine) ||
    /^\s*CBUFFER_START\b/i.test(strippedLine) ||
    /^\s*Pass\b/i.test(strippedLine) ||
    /^\s*SubShader\b/i.test(strippedLine) ||
    /^\s*Tags\b/i.test(strippedLine) ||
    /^\s*HLSLPROGRAM\b/i.test(strippedLine) ||
    /^\s*ENDHLSL\b/i.test(strippedLine) ||
    /^\s*Properties\b/i.test(strippedLine)
  ) {
    return;
  }

  // Function headers don't have semicolons (e.g. float4 frag(...) : SV_Target)
  if (/\b(?:float[1-4]?|half[1-4]?|void|Varyings)\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*(?::\s*[A-Za-z0-9_]+)?\s*$/.test(strippedLine)) {
    return;
  }

  // Check variable declarations: float4 col = ... or return ... or x = ...
  const isAssignment = /^\s*[A-Za-z0-9_.]+\s*(\+=|-=|\*=|\/=|%=|=)\s*.+/.test(strippedLine);
  const isReturn = /^\s*return\b.+/.test(strippedLine);
  const isVarDecl = /^\s*(float[1-4]?|half[1-4]?|int[1-4]?|uint[1-4]?|bool[1-4]?|float[2-4]x[2-4]|Texture2D|SAMPLER|TEXTURE2D)\s+[A-Za-z0-9_]+/.test(strippedLine);

  if ((isAssignment || isReturn || isVarDecl) && !strippedLine.endsWith(';') && !strippedLine.endsWith(',')) {
    diagnostics.push({
      id: `diag-missing-statement-semi-${lineNum}`,
      line: lineNum,
      severity: 'error',
      code: 'HLSL_MISSING_SEMICOLON',
      message: 'Missing semicolon at end of statement',
      explanation: 'HLSL statements must end with a semicolon (;).',
      offendingText: strippedLine,
      suggestedFix: `${rawLine.trimEnd()};`,
      quickFixes: [
        {
          id: `fix-statement-semi-${lineNum}`,
          title: 'Add semicolon to end of line',
          applyFix: (src) => {
            const srcLines = src.split('\n');
            if (srcLines[lineNum - 1]) {
              srcLines[lineNum - 1] = srcLines[lineNum - 1].replace(/\s*$/, ';');
            }
            return srcLines.join('\n');
          }
        }
      ]
    });
  }
}

/**
 * Validates legacy Built-in CG matrices, variables, and macros
 */
function validateLegacyCgMacros(rawLine: string, lineNum: number, diagnostics: HlslDiagnostic[]) {
  // UNITY_MATRIX_MVP
  if (/\bUNITY_MATRIX_MVP\b/.test(rawLine)) {
    diagnostics.push({
      id: `diag-legacy-mvp-${lineNum}`,
      line: lineNum,
      severity: 'error',
      code: 'HLSL_LEGACY_MACRO_MVP',
      message: 'Undefined legacy macro: UNITY_MATRIX_MVP',
      explanation: 'UNITY_MATRIX_MVP is deprecated in Universal Render Pipeline. Use TransformObjectToHClip(positionOS) or mul(GetWorldToHClipMatrix(), mul(GetObjectToWorldMatrix(), pos)).',
      suggestedFix: 'TransformObjectToHClip(v.positionOS.xyz)',
      quickFixes: [
        {
          id: `fix-legacy-mvp-${lineNum}`,
          title: 'Replace with TransformObjectToHClip',
          applyFix: (src) => src.replace(/\bmul\s*\(\s*UNITY_MATRIX_MVP\s*,\s*([A-Za-z0-9_.]+)\s*\)/g, 'TransformObjectToHClip($1.xyz)')
        }
      ]
    });
  }

  // UnityObjectToClipPos
  if (/\bUnityObjectToClipPos\b/.test(rawLine)) {
    diagnostics.push({
      id: `diag-legacy-objtoclip-${lineNum}`,
      line: lineNum,
      severity: 'error',
      code: 'HLSL_LEGACY_FUNC_CLIPPOS',
      message: 'Undefined legacy function: UnityObjectToClipPos',
      explanation: 'UnityObjectToClipPos is from the Built-in Render Pipeline (UnityCG.cginc). In URP, use TransformObjectToHClip(pos).',
      suggestedFix: 'TransformObjectToHClip(...)',
      quickFixes: [
        {
          id: `fix-legacy-clip-${lineNum}`,
          title: 'Replace UnityObjectToClipPos with TransformObjectToHClip',
          applyFix: (src) => src.replace(/\bUnityObjectToClipPos\b/g, 'TransformObjectToHClip')
        }
      ]
    });
  }

  // unity_ObjectToWorld / unity_WorldToObject
  if (/\bunity_ObjectToWorld\b/.test(rawLine)) {
    diagnostics.push({
      id: `diag-legacy-objtoworld-${lineNum}`,
      line: lineNum,
      severity: 'warning',
      code: 'HLSL_LEGACY_MATRIX_OBJ2WORLD',
      message: 'Legacy matrix: unity_ObjectToWorld',
      explanation: 'In modern URP, prefer GetObjectToWorldMatrix() or TransformObjectToWorld(pos) for SRP Batcher safety.',
      suggestedFix: 'GetObjectToWorldMatrix()',
      quickFixes: [
        {
          id: `fix-legacy-obj2world-${lineNum}`,
          title: 'Replace with GetObjectToWorldMatrix()',
          applyFix: (src) => src.replace(/\bunity_ObjectToWorld\b/g, 'GetObjectToWorldMatrix()')
        }
      ]
    });
  }

  // UNITY_TRANSFER_FOG
  if (/\bUNITY_TRANSFER_FOG\b/.test(rawLine)) {
    diagnostics.push({
      id: `diag-legacy-fog-transfer-${lineNum}`,
      line: lineNum,
      severity: 'error',
      code: 'HLSL_LEGACY_FOG_TRANSFER',
      message: 'Undefined legacy macro: UNITY_TRANSFER_FOG',
      explanation: 'Legacy fog macros are not defined in URP. In URP, compute fog factor with ComputeFogFactor(positionCS.z) and mix with MixFog().',
      suggestedFix: 'o.fogFactor = ComputeFogFactor(o.positionCS.z);',
      quickFixes: [
        {
          id: `fix-legacy-fog-${lineNum}`,
          title: 'Replace with ComputeFogFactor',
          applyFix: (src) => src.replace(/UNITY_TRANSFER_FOG\s*\([^,]+,\s*([^)]+)\);?/, 'o.fogFactor = ComputeFogFactor($1.z);')
        }
      ]
    });
  }

  // UNITY_APPLY_FOG
  if (/\bUNITY_APPLY_FOG\b/.test(rawLine)) {
    diagnostics.push({
      id: `diag-legacy-fog-apply-${lineNum}`,
      line: lineNum,
      severity: 'error',
      code: 'HLSL_LEGACY_FOG_APPLY',
      message: 'Undefined legacy macro: UNITY_APPLY_FOG',
      explanation: 'Legacy UNITY_APPLY_FOG is undefined in URP. Use color.rgb = MixFog(color.rgb, input.fogFactor); from Core.hlsl.',
      suggestedFix: 'color.rgb = MixFog(color.rgb, input.fogFactor);',
      quickFixes: [
        {
          id: `fix-legacy-apply-fog-${lineNum}`,
          title: 'Replace with MixFog',
          applyFix: (src) => src.replace(/UNITY_APPLY_FOG\s*\([^,]+,\s*([^)]+)\);?/, '$1.rgb = MixFog($1.rgb, input.fogFactor);')
        }
      ]
    });
  }
}

/**
 * Validates GLSL keywords and types that cause HLSL compilation failure
 */
function validateGlslSyntax(rawLine: string, lineNum: number, diagnostics: HlslDiagnostic[]) {
  // vec2, vec3, vec4
  const vecMatch = rawLine.match(/\b(vec[234]|ivec[234]|uvec[234]|bvec[234])\b/);
  if (vecMatch) {
    const glslType = vecMatch[1];
    const hlslType = glslType
      .replace(/^vec/, 'float')
      .replace(/^ivec/, 'int')
      .replace(/^uvec/, 'uint')
      .replace(/^bvec/, 'bool');

    diagnostics.push({
      id: `diag-glsl-vec-${lineNum}`,
      line: lineNum,
      severity: 'error',
      code: 'HLSL_GLSL_TYPE_VEC',
      message: `GLSL vector type '${glslType}' invalid in HLSL`,
      explanation: `HLSL uses '${hlslType}' instead of GLSL's '${glslType}'.`,
      suggestedFix: hlslType,
      quickFixes: [
        {
          id: `fix-glsl-vec-${lineNum}`,
          title: `Replace '${glslType}' with '${hlslType}'`,
          applyFix: (src) => src.replace(new RegExp(`\\b${glslType}\\b`, 'g'), hlslType)
        }
      ]
    });
  }

  // mat2, mat3, mat4
  const matMatch = rawLine.match(/\b(mat[234])\b/);
  if (matMatch) {
    const glslMat = matMatch[1];
    const n = glslMat.replace('mat', '');
    const hlslMat = `float${n}x${n}`;

    diagnostics.push({
      id: `diag-glsl-mat-${lineNum}`,
      line: lineNum,
      severity: 'error',
      code: 'HLSL_GLSL_TYPE_MAT',
      message: `GLSL matrix type '${glslMat}' invalid in HLSL`,
      explanation: `HLSL uses '${hlslMat}' instead of GLSL's '${glslMat}'.`,
      suggestedFix: hlslMat,
      quickFixes: [
        {
          id: `fix-glsl-mat-${lineNum}`,
          title: `Replace '${glslMat}' with '${hlslMat}'`,
          applyFix: (src) => src.replace(new RegExp(`\\b${glslMat}\\b`, 'g'), hlslMat)
        }
      ]
    });
  }

  // fract -> frac
  if (/\bfract\s*\(/.test(rawLine)) {
    diagnostics.push({
      id: `diag-glsl-fract-${lineNum}`,
      line: lineNum,
      severity: 'error',
      code: 'HLSL_GLSL_FUNC_FRACT',
      message: "GLSL function 'fract()' is 'frac()' in HLSL",
      explanation: "HLSL's intrinsic fractional function is named 'frac()'.",
      suggestedFix: 'frac(...)',
      quickFixes: [
        {
          id: `fix-glsl-fract-${lineNum}`,
          title: 'Replace fract with frac',
          applyFix: (src) => src.replace(/\bfract\s*\(/g, 'frac(')
        }
      ]
    });
  }

  // mix -> lerp
  if (/\bmix\s*\(/.test(rawLine)) {
    diagnostics.push({
      id: `diag-glsl-mix-${lineNum}`,
      line: lineNum,
      severity: 'error',
      code: 'HLSL_GLSL_FUNC_MIX',
      message: "GLSL function 'mix()' is 'lerp()' in HLSL",
      explanation: "HLSL's linear interpolation intrinsic is 'lerp(a, b, t)'.",
      suggestedFix: 'lerp(...)',
      quickFixes: [
        {
          id: `fix-glsl-mix-${lineNum}`,
          title: 'Replace mix with lerp',
          applyFix: (src) => src.replace(/\bmix\s*\(/g, 'lerp(')
        }
      ]
    });
  }

  // mod(x, y)
  if (/\bmod\s*\(/.test(rawLine)) {
    diagnostics.push({
      id: `diag-glsl-mod-${lineNum}`,
      line: lineNum,
      severity: 'warning',
      code: 'HLSL_GLSL_FUNC_MOD',
      message: "GLSL function 'mod()' differs in HLSL (fmod / %)",
      explanation: "HLSL uses 'fmod(x, y)' or remainder operator '%', but note fmod handles negative numbers differently from GLSL mod. Use (x - y * floor(x / y)) for exact GLSL parity.",
      suggestedFix: 'fmod(x, y)',
      quickFixes: [
        {
          id: `fix-glsl-mod-${lineNum}`,
          title: 'Replace mod() with fmod()',
          applyFix: (src) => src.replace(/\bmod\s*\(/g, 'fmod(')
        }
      ]
    });
  }

  // gl_FragColor
  if (/\bgl_FragColor\b/.test(rawLine)) {
    diagnostics.push({
      id: `diag-glsl-fragcolor-${lineNum}`,
      line: lineNum,
      severity: 'error',
      code: 'HLSL_GLSL_FRAGCOLOR',
      message: "GLSL output 'gl_FragColor' is invalid in HLSL",
      explanation: 'HLSL fragment shaders return a float4 or half4 with the : SV_Target semantic (e.g. return col;).',
      suggestedFix: 'return col; // with : SV_Target',
    });
  }
}

/**
 * Validates legacy texture sampling functions (tex2D, tex2Dlod, texture, texture2D)
 */
function validateLegacyTextureSampling(rawLine: string, lineNum: number, diagnostics: HlslDiagnostic[]) {
  // tex2D(_MainTex, uv)
  const tex2dMatch = rawLine.match(/\btex2D\s*\(\s*([A-Za-z0-9_]+)\s*,\s*([^)]+)\)/);
  if (tex2dMatch) {
    const texName = tex2dMatch[1];
    const uvName = tex2dMatch[2];
    const samplerName = `sampler_${texName.replace(/^_/, '')}`;

    diagnostics.push({
      id: `diag-legacy-tex2d-${lineNum}`,
      line: lineNum,
      severity: 'warning',
      code: 'HLSL_LEGACY_TEX2D',
      message: `Legacy tex2D() sampler: prefer SAMPLE_TEXTURE2D(${texName}, ${samplerName}, ${uvName})`,
      explanation: 'Modern URP and DirectX/Vulkan/Metal pipelines use separated texture and sampler states via SAMPLE_TEXTURE2D for better hardware efficiency.',
      suggestedFix: `SAMPLE_TEXTURE2D(${texName}, ${samplerName}, ${uvName})`,
      quickFixes: [
        {
          id: `fix-tex2d-modern-${lineNum}`,
          title: `Convert to SAMPLE_TEXTURE2D(${texName}, ...)`,
          applyFix: (src) => {
            return src.replace(new RegExp(`\\btex2D\\s*\\(\\s*${texName}\\s*,\\s*([^)]+)\\)`, 'g'), `SAMPLE_TEXTURE2D(${texName}, ${samplerName}, $1)`);
          }
        }
      ]
    });
  }

  // GLSL texture(tex, uv) or texture2D(tex, uv)
  const glslTexMatch = rawLine.match(/\b(texture2D|texture)\s*\(\s*([A-Za-z0-9_]+)\s*,\s*([^)]+)\)/);
  if (glslTexMatch) {
    const fnName = glslTexMatch[1];
    const texName = glslTexMatch[2];
    const uvName = glslTexMatch[3];
    const samplerName = `sampler_${texName.replace(/^_/, '')}`;

    diagnostics.push({
      id: `diag-glsl-tex-${lineNum}`,
      line: lineNum,
      severity: 'error',
      code: 'HLSL_GLSL_TEXTURE_CALL',
      message: `GLSL function '${fnName}()' is invalid in HLSL`,
      explanation: `HLSL uses SAMPLE_TEXTURE2D(${texName}, ${samplerName}, ${uvName}) instead of GLSL's ${fnName}().`,
      suggestedFix: `SAMPLE_TEXTURE2D(${texName}, ${samplerName}, ${uvName})`,
      quickFixes: [
        {
          id: `fix-glsl-tex-${lineNum}`,
          title: `Replace ${fnName} with SAMPLE_TEXTURE2D`,
          applyFix: (src) => {
            return src.replace(new RegExp(`\\b${fnName}\\s*\\(\\s*${texName}\\s*,\\s*([^)]+)\\)`, 'g'), `SAMPLE_TEXTURE2D(${texName}, ${samplerName}, $1)`);
          }
        }
      ]
    });
  }
}

/**
 * Validates preprocessor directives for accidental trailing semicolons
 */
function validatePreprocessorDirectives(rawLine: string, strippedLine: string, lineNum: number, diagnostics: HlslDiagnostic[]) {
  if (/^#(include|pragma|define|if|ifdef|ifndef|elif|else|endif)\b.*;\s*$/.test(strippedLine)) {
    diagnostics.push({
      id: `diag-preprocessor-semi-${lineNum}`,
      line: lineNum,
      severity: 'error',
      code: 'HLSL_PREPROCESSOR_SEMI',
      message: 'Syntax Error: Semicolon after preprocessor directive',
      explanation: 'Preprocessor directives (e.g. #include, #pragma, #define) must not end with a semicolon.',
      suggestedFix: strippedLine.replace(/;\s*$/, ''),
      quickFixes: [
        {
          id: `fix-preprocessor-semi-${lineNum}`,
          title: 'Remove semicolon from directive',
          applyFix: (src) => {
            const srcLines = src.split('\n');
            if (srcLines[lineNum - 1]) {
              srcLines[lineNum - 1] = srcLines[lineNum - 1].replace(/;\s*$/, '');
            }
            return srcLines.join('\n');
          }
        }
      ]
    });
  }
}
