/**
 * HLSL & ShaderLab Syntax Highlighting Themes
 * 
 * Specifically calibrated for HLSL readability, SRP Batcher CBUFFER inspection,
 * and high-contrast SRP macro recognition across various developer lighting conditions.
 */

import { TokenType } from './shaderHighlighter';

export interface EditorTheme {
  id: string;
  name: string;
  category: 'High Contrast' | 'IDE Classic' | 'Vibrant' | 'Eye Safe';
  description: string;
  badge: string;
  colors: {
    bg: string;
    gutterBg: string;
    gutterText: string;
    gutterBorder: string;
    activeLineBg: string;
    activeLineBorder: string;
    selectionBg: string;
    cursorColor: string;
    cbufferHighlightBg: string;
    cbufferHighlightBorder: string;
    cardBorder: string;
  };
  tokenClasses: Record<TokenType, string>;
  swatch: {
    bg: string;
    cbuffer: string;
    srpMacro: string;
    uniform: string;
    type: string;
  };
}

export const EDITOR_THEMES: EditorTheme[] = [
  {
    id: 'srp-pro-contrast',
    name: 'SRP Pro High-Contrast (Obsidian)',
    category: 'High Contrast',
    description: 'Ultra-vibrant neon tokens on deep obsidian. Specifically tuned for CBUFFER packing audits and SRP macro clarity.',
    badge: 'Recommended',
    colors: {
      bg: '#090B0F',
      gutterBg: '#0D1016',
      gutterText: '#4B5563',
      gutterBorder: '#1A212D',
      activeLineBg: 'rgba(99, 102, 241, 0.15)',
      activeLineBorder: '#6366F1',
      selectionBg: 'rgba(99, 102, 241, 0.35)',
      cursorColor: '#818CF8',
      cbufferHighlightBg: 'rgba(244, 63, 94, 0.08)',
      cbufferHighlightBorder: 'rgba(244, 63, 94, 0.35)',
      cardBorder: '#1E2636',
    },
    tokenClasses: {
      structural: 'text-rose-400 font-bold drop-shadow-xs',
      preprocessor: 'text-pink-400 font-semibold',
      keyword: 'text-amber-400 font-semibold',
      type: 'text-cyan-300 font-medium',
      semantic: 'text-orange-400 font-mono font-bold',
      'srp-function': 'text-indigo-300 font-semibold',
      uniform: 'text-emerald-300 font-medium',
      string: 'text-lime-300',
      number: 'text-sky-300 font-mono',
      comment: 'text-slate-500 italic',
      operator: 'text-slate-300',
      punctuation: 'text-slate-400',
      identifier: 'text-slate-100',
      plain: 'text-slate-100',
    },
    swatch: {
      bg: '#090B0F',
      cbuffer: '#FB7185',
      srpMacro: '#818CF8',
      uniform: '#34D399',
      type: '#67E8F9',
    },
  },
  {
    id: 'unity-dark-modern',
    name: 'Unity 6 Dark Modern',
    category: 'IDE Classic',
    description: 'Faithfully matches Unity Editor 6 and Visual Studio Code Unity HLSL extension color harmonies.',
    badge: 'Unity Standard',
    colors: {
      bg: '#181A1F',
      gutterBg: '#1C1E24',
      gutterText: '#5C6370',
      gutterBorder: '#282C34',
      activeLineBg: 'rgba(97, 175, 239, 0.12)',
      activeLineBorder: '#61AFEF',
      selectionBg: 'rgba(97, 175, 239, 0.28)',
      cursorColor: '#61AFEF',
      cbufferHighlightBg: 'rgba(198, 120, 221, 0.08)',
      cbufferHighlightBorder: 'rgba(198, 120, 221, 0.3)',
      cardBorder: '#282C34',
    },
    tokenClasses: {
      structural: 'text-purple-400 font-semibold',
      preprocessor: 'text-pink-400 font-medium',
      keyword: 'text-amber-300 font-medium',
      type: 'text-teal-300 font-medium',
      semantic: 'text-orange-300 font-mono font-medium',
      'srp-function': 'text-blue-400 font-medium',
      uniform: 'text-teal-400 font-medium',
      string: 'text-emerald-300',
      number: 'text-amber-200 font-mono',
      comment: 'text-slate-500 italic',
      operator: 'text-slate-400',
      punctuation: 'text-slate-400',
      identifier: 'text-slate-200',
      plain: 'text-slate-200',
    },
    swatch: {
      bg: '#181A1F',
      cbuffer: '#C678DD',
      srpMacro: '#61AFEF',
      uniform: '#56B6C2',
      type: '#4EC9B0',
    },
  },
  {
    id: 'vulkan-cyberpunk',
    name: 'Vulkan / DX12 Matrix (OLED Black)',
    category: 'Vibrant',
    description: 'Pure pitch-black OLED background with fluorescent green uniforms, hot magenta CBUFFERs, and electric cyan primitives.',
    badge: 'OLED / Matrix',
    colors: {
      bg: '#04060A',
      gutterBg: '#080C12',
      gutterText: '#374151',
      gutterBorder: '#111827',
      activeLineBg: 'rgba(16, 185, 129, 0.15)',
      activeLineBorder: '#10B981',
      selectionBg: 'rgba(16, 185, 129, 0.3)',
      cursorColor: '#10B981',
      cbufferHighlightBg: 'rgba(236, 72, 153, 0.1)',
      cbufferHighlightBorder: 'rgba(236, 72, 153, 0.4)',
      cardBorder: '#131B28',
    },
    tokenClasses: {
      structural: 'text-fuchsia-400 font-bold',
      preprocessor: 'text-rose-400 font-semibold',
      keyword: 'text-emerald-400 font-semibold',
      type: 'text-cyan-400 font-medium',
      semantic: 'text-yellow-400 font-mono font-bold',
      'srp-function': 'text-purple-400 font-semibold',
      uniform: 'text-lime-400 font-medium',
      string: 'text-green-300',
      number: 'text-cyan-300 font-mono',
      comment: 'text-slate-600 italic',
      operator: 'text-slate-400',
      punctuation: 'text-slate-500',
      identifier: 'text-slate-100',
      plain: 'text-slate-100',
    },
    swatch: {
      bg: '#04060A',
      cbuffer: '#E879F9',
      srpMacro: '#C084FC',
      uniform: '#A3E635',
      type: '#22D3EE',
    },
  },
  {
    id: 'monokai-shader',
    name: 'Monokai Pro Shader Forge',
    category: 'Vibrant',
    description: 'Punchy espresso base with glowing hot pink CBUFFER declarations, sky-blue SRP macros, and golden keywords.',
    badge: 'Classic Pop',
    colors: {
      bg: '#141216',
      gutterBg: '#1B181E',
      gutterText: '#665C6C',
      gutterBorder: '#27232B',
      activeLineBg: 'rgba(255, 97, 136, 0.12)',
      activeLineBorder: '#FF6188',
      selectionBg: 'rgba(255, 97, 136, 0.28)',
      cursorColor: '#FF6188',
      cbufferHighlightBg: 'rgba(255, 97, 136, 0.1)',
      cbufferHighlightBorder: 'rgba(255, 97, 136, 0.4)',
      cardBorder: '#27232B',
    },
    tokenClasses: {
      structural: 'text-pink-500 font-bold',
      preprocessor: 'text-pink-400 font-medium',
      keyword: 'text-amber-300 font-medium',
      type: 'text-cyan-300 font-medium',
      semantic: 'text-orange-400 font-mono font-medium',
      'srp-function': 'text-sky-400 font-semibold',
      uniform: 'text-lime-300 font-medium',
      string: 'text-yellow-200',
      number: 'text-purple-300 font-mono',
      comment: 'text-stone-500 italic',
      operator: 'text-pink-400',
      punctuation: 'text-stone-400',
      identifier: 'text-stone-100',
      plain: 'text-stone-100',
    },
    swatch: {
      bg: '#141216',
      cbuffer: '#FF6188',
      srpMacro: '#78DCE8',
      uniform: '#A9DC76',
      type: '#78DCE8',
    },
  },
  {
    id: 'nordic-frost',
    name: 'Nordic Arctic Glacier',
    category: 'Eye Safe',
    description: 'Calm arctic navy canvas with frosty cyan types, mint green registers, and soft aurora purple CBUFFER definitions.',
    badge: 'Eye Comfort',
    colors: {
      bg: '#0F141C',
      gutterBg: '#141B26',
      gutterText: '#4C566A',
      gutterBorder: '#222C3D',
      activeLineBg: 'rgba(136, 192, 208, 0.12)',
      activeLineBorder: '#88C0D0',
      selectionBg: 'rgba(136, 192, 208, 0.25)',
      cursorColor: '#88C0D0',
      cbufferHighlightBg: 'rgba(180, 142, 173, 0.08)',
      cbufferHighlightBorder: 'rgba(180, 142, 173, 0.3)',
      cardBorder: '#1E2738',
    },
    tokenClasses: {
      structural: 'text-purple-300 font-bold',
      preprocessor: 'text-indigo-300 font-medium',
      keyword: 'text-amber-200 font-medium',
      type: 'text-cyan-300 font-medium',
      semantic: 'text-orange-300 font-mono font-medium',
      'srp-function': 'text-sky-300 font-semibold',
      uniform: 'text-emerald-300 font-medium',
      string: 'text-teal-200',
      number: 'text-indigo-200 font-mono',
      comment: 'text-slate-500 italic',
      operator: 'text-slate-400',
      punctuation: 'text-slate-400',
      identifier: 'text-slate-200',
      plain: 'text-slate-200',
    },
    swatch: {
      bg: '#0F141C',
      cbuffer: '#B48EAD',
      srpMacro: '#88C0D0',
      uniform: '#A3BE8C',
      type: '#81A1C1',
    },
  },
  {
    id: 'solarized-srp',
    name: 'Solarized Dark Studio',
    category: 'Eye Safe',
    description: 'Precision laboratory palette with warm solarized amber keywords and crisp teal uniform registers.',
    badge: 'Precision Lab',
    colors: {
      bg: '#001E26',
      gutterBg: '#042833',
      gutterText: '#586E75',
      gutterBorder: '#0A3B49',
      activeLineBg: 'rgba(38, 139, 210, 0.15)',
      activeLineBorder: '#268BD2',
      selectionBg: 'rgba(38, 139, 210, 0.3)',
      cursorColor: '#2AA198',
      cbufferHighlightBg: 'rgba(220, 50, 47, 0.08)',
      cbufferHighlightBorder: 'rgba(220, 50, 47, 0.3)',
      cardBorder: '#0B3F4F',
    },
    tokenClasses: {
      structural: 'text-rose-400 font-bold',
      preprocessor: 'text-orange-400 font-medium',
      keyword: 'text-yellow-400 font-medium',
      type: 'text-teal-300 font-medium',
      semantic: 'text-amber-400 font-mono font-medium',
      'srp-function': 'text-sky-400 font-semibold',
      uniform: 'text-cyan-300 font-medium',
      string: 'text-emerald-300',
      number: 'text-violet-300 font-mono',
      comment: 'text-slate-500 italic',
      operator: 'text-teal-400',
      punctuation: 'text-slate-400',
      identifier: 'text-slate-200',
      plain: 'text-slate-200',
    },
    swatch: {
      bg: '#001E26',
      cbuffer: '#DC322F',
      srpMacro: '#268BD2',
      uniform: '#2AA198',
      type: '#859900',
    },
  },
];

export const DEFAULT_THEME_ID = 'srp-pro-contrast';
export const STORAGE_KEY_EDITOR_THEME = 'unishader_editor_theme_id';

/**
 * Returns theme object by ID with fallback to default
 */
export function getEditorTheme(themeId?: string): EditorTheme {
  if (!themeId) {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_EDITOR_THEME) : null;
    return EDITOR_THEMES.find(t => t.id === saved) || EDITOR_THEMES[0];
  }
  return EDITOR_THEMES.find(t => t.id === themeId) || EDITOR_THEMES[0];
}

/**
 * Saves preferred theme ID to localStorage
 */
export function saveEditorTheme(themeId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_EDITOR_THEME, themeId);
  }
}
