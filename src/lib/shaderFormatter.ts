import jsBeautify from 'js-beautify';

export interface ShaderFormatOptions {
  indentSize?: number;
  indentWithTabs?: boolean;
  braceStyle?: 'collapse' | 'expand';
  preserveNewlines?: boolean;
  maxPreserveNewlines?: number;
}

/**
 * Formats Unity ShaderLab & HLSL code according to Unity's standard conventions.
 * Uses js-beautify for C-style HLSL code blocks while maintaining strict ShaderLab structural indentation.
 */
export function formatUnityHlsl(rawCode: string, options: ShaderFormatOptions = {}): string {
  if (!rawCode || rawCode.trim() === '') {
    return rawCode;
  }

  const indentSize = options.indentSize ?? 4;
  const indentChar = options.indentWithTabs ? '\t' : ' '.repeat(indentSize);
  const maxPreserveNewlines = options.maxPreserveNewlines ?? 2;

  // Check if the code is a complete ShaderLab file or pure HLSL
  const isShaderLab = /^\s*(Shader\s+"[^"]+"|SubShader|Pass)\b/m.test(rawCode);

  if (!isShaderLab) {
    // Pure HLSL / GLSL snippet: format directly with C-style rules
    return formatHlslBlock(rawCode, 0, indentChar, options);
  }

  // It's a ShaderLab file with embedded HLSLPROGRAM / CGPROGRAM blocks
  const lines = rawCode.split('\n');
  const formattedLines: string[] = [];
  let indentLevel = 0;
  let inHlslBlock = false;
  let hlslBuffer: string[] = [];
  let hlslStartTag = '';

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Check for start of HLSL / CG program block
    if (/^(HLSLPROGRAM|CGPROGRAM|HLSLINCLUDE|CGINCLUDE)\b/i.test(trimmed)) {
      inHlslBlock = true;
      hlslStartTag = trimmed;
      hlslBuffer = [];
      formattedLines.push(indentChar.repeat(indentLevel) + trimmed);
      continue;
    }

    // Check for end of HLSL / CG program block
    if (/^(ENDHLSL|ENDCG)\b/i.test(trimmed)) {
      if (inHlslBlock) {
        // Format the buffered HLSL code with current indentLevel + 1
        const formattedHlsl = formatHlslBlock(hlslBuffer.join('\n'), indentLevel + 1, indentChar, options);
        if (formattedHlsl.trim()) {
          formattedLines.push(formattedHlsl);
        }
        inHlslBlock = false;
        hlslBuffer = [];
      }
      formattedLines.push(indentChar.repeat(indentLevel) + trimmed);
      continue;
    }

    // If we are inside an HLSL block, buffer the lines
    if (inHlslBlock) {
      hlslBuffer.push(rawLine);
      continue;
    }

    // Handle empty lines outside HLSL
    if (trimmed === '') {
      if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] !== '') {
        formattedLines.push('');
      }
      continue;
    }

    // Handle closing braces decrease indent before line
    const leadingCloseBraces = (trimmed.match(/^(\s*\})+/) || [''])[0].replace(/\s/g, '').length;
    if (leadingCloseBraces > 0) {
      indentLevel = Math.max(0, indentLevel - leadingCloseBraces);
    }

    // Format ShaderLab property / statement line
    formattedLines.push(indentChar.repeat(indentLevel) + cleanShaderLabLine(trimmed));

    // Handle opening braces increase indent after line
    // Count net opening minus closing if not leading
    const openBraces = (trimmed.match(/\{/g) || []).length;
    const closeBraces = (trimmed.match(/\}/g) || []).length;
    const netBraces = openBraces - (closeBraces - leadingCloseBraces);
    if (netBraces > 0) {
      indentLevel += netBraces;
    }
  }

  // In case the file ended while in an HLSL block
  if (inHlslBlock && hlslBuffer.length > 0) {
    const formattedHlsl = formatHlslBlock(hlslBuffer.join('\n'), indentLevel + 1, indentChar, options);
    if (formattedHlsl.trim()) {
      formattedLines.push(formattedHlsl);
    }
  }

  return cleanSuccessiveBlankLines(formattedLines.join('\n'), maxPreserveNewlines);
}

/**
 * Formats a block of HLSL C-style code
 */
function formatHlslBlock(
  hlslText: string,
  baseIndentLevel: number,
  indentChar: string,
  options: ShaderFormatOptions
): string {
  if (!hlslText.trim()) return '';

  const beautifyOptions: jsBeautify.JSBeautifyOptions = {
    indent_size: options.indentSize ?? 4,
    indent_char: options.indentWithTabs ? '\t' : ' ',
    brace_style: options.braceStyle === 'expand' ? 'expand' : 'collapse',
    preserve_newlines: options.preserveNewlines ?? true,
    max_preserve_newlines: options.maxPreserveNewlines ?? 2,
    space_after_anon_function: true,
    space_after_named_function: false,
    space_before_conditional: true,
    unescape_strings: false,
    jslint_happy: false,
    keep_array_indentation: false,
  };

  // Pre-process HLSL macros and preprocessor directives so js-beautify doesn't mangle them
  const preprocessed = preprocessHlslDirectives(hlslText);

  // Run js-beautify (using JS/C-style formatter)
  let formatted = jsBeautify.js_beautify(preprocessed, beautifyOptions);

  // Post-process HLSL specific structures (CBUFFER, pragmas, structs, semantics)
  formatted = postprocessHlslDirectives(formatted);

  // Apply base indentation offset
  if (baseIndentLevel > 0) {
    const prefix = indentChar.repeat(baseIndentLevel);
    formatted = formatted
      .split('\n')
      .map(line => (line.trim() === '' ? '' : prefix + line))
      .join('\n');
  }

  return formatted;
}

/**
 * Pre-process directives so beautifier recognizes CBUFFER and macro syntax
 */
function preprocessHlslDirectives(code: string): string {
  let result = code;

  // Standardize CBUFFER_START/END
  result = result.replace(/CBUFFER_START\s*\(\s*([A-Za-z0-9_]+)\s*\)/g, 'CBUFFER_START($1) {');
  result = result.replace(/CBUFFER_END/g, '} CBUFFER_END;');

  // Ensure #pragma and #include have newline before and after if inline
  result = result.replace(/([^\n])\s*(#(?:pragma|include|define|if|ifdef|ifndef|elif|else|endif))/g, '$1\n$2');

  return result;
}

/**
 * Post-process and restore clean Unity conventions
 */
function postprocessHlslDirectives(code: string): string {
  let result = code;

  // Restore CBUFFER_START & CBUFFER_END to Unity standard syntax
  result = result.replace(/CBUFFER_START\s*\(\s*([A-Za-z0-9_]+)\s*\)\s*\{/g, 'CBUFFER_START($1)');
  result = result.replace(/\}\s*CBUFFER_END;?/g, 'CBUFFER_END');

  // Fix Texture2D and SamplerState syntax spacing
  result = result.replace(/Texture2D\s*<([^>]+)>\s*/g, 'Texture2D ');
  result = result.replace(/SamplerState\s+sampler_([A-Za-z0-9_]+)\s*;/g, 'SamplerState sampler_$1;');

  // Fix Unity semantics capitalization and spacing (e.g., : SV_Target, : POSITION)
  result = result.replace(/\s*:\s*(SV_Target\d*|POSITION|NORMAL|TANGENT|TEXCOORD\d*|COLOR\d*|SV_POSITION|SV_VertexID|SV_InstanceID)/gi, ' : $1');

  // Standardize #pragma directives
  result = result.replace(/#\s*pragma\s+/g, '#pragma ');
  result = result.replace(/#\s*include\s+/g, '#include ');

  // Fix struct declaration trailing semicolon
  result = result.replace(/struct\s+([A-Za-z0-9_]+)\s*\{([^}]*)\}\s*([A-Za-z0-9_]*);?/g, (match, name, body) => {
    return `struct ${name}\n{\n${body}\n};`;
  });

  return result;
}

/**
 * Clean and normalize a single ShaderLab line
 */
function cleanShaderLabLine(line: string): string {
  // Normalize colons and equals spacing in ShaderLab properties
  let cleaned = line;
  if (/^_[A-Za-z0-9_]+\s*\(/.test(cleaned)) {
    cleaned = cleaned.replace(/\s*=\s*/, ' = ');
  }
  // Tags { "RenderType" = "Opaque" "RenderPipeline" = "UniversalPipeline" }
  if (/^"([^"]+)"\s*=\s*"([^"]+)"/.test(cleaned)) {
    cleaned = cleaned.replace(/"\s*=\s*"/g, '" = "');
  }
  return cleaned;
}

/**
 * Reduces multiple blank lines to at most maxBlankLines
 */
function cleanSuccessiveBlankLines(text: string, maxBlankLines: number): string {
  const maxConsecutive = maxBlankLines + 1;
  const regex = new RegExp(`\\n{${maxConsecutive},}`, 'g');
  return text.replace(regex, '\n'.repeat(maxBlankLines + 1)).trimEnd() + '\n';
}
