import React, { useState, useRef, useEffect } from 'react';
import { 
  EDITOR_THEMES, 
  EditorTheme, 
  getEditorTheme, 
  saveEditorTheme 
} from '../lib/shaderEditorThemes';
import { 
  Palette, 
  Check, 
  ChevronDown, 
  Sliders, 
  Eye, 
  Zap, 
  Sparkles,
  Layers
} from 'lucide-react';

interface EditorThemeSelectorProps {
  currentThemeId: string;
  onThemeChange: (themeId: string) => void;
  compact?: boolean;
  showPreviewModal?: boolean;
  className?: string;
}

export const EditorThemeSelector: React.FC<EditorThemeSelectorProps> = ({
  currentThemeId,
  onThemeChange,
  compact = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentTheme = getEditorTheme(currentThemeId);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const categories = ['All', 'High Contrast', 'IDE Classic', 'Vibrant', 'Eye Safe'];

  const filteredThemes = activeCategory === 'All' 
    ? EDITOR_THEMES 
    : EDITOR_THEMES.filter(t => t.category === activeCategory);

  const handleSelectTheme = (themeId: string) => {
    saveEditorTheme(themeId);
    onThemeChange(themeId);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      
      {/* Trigger Button */}
      <button
        id="btn-editor-theme-dropdown"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-md transition cursor-pointer border ${
          compact
            ? 'px-2 py-1 text-[11px] bg-[#0E1117] hover:bg-[#161B24] border-[#1F2633] text-slate-200'
            : 'px-2.5 py-1.5 text-xs bg-[#12151C] hover:bg-[#1A1F29] border-[#252C3B] text-slate-200 shadow-xs'
        }`}
        title="Code Editor Theming: Switch HLSL & ShaderLab color contrast themes tailored for CBUFFER and SRP macros"
      >
        <Palette className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        
        {/* Color preview dots */}
        <div className="flex items-center space-x-1 shrink-0">
          <span 
            className="w-2 h-2 rounded-full border border-black/40" 
            style={{ backgroundColor: currentTheme.swatch.cbuffer }}
            title="CBUFFER accent"
          />
          <span 
            className="w-2 h-2 rounded-full border border-black/40" 
            style={{ backgroundColor: currentTheme.swatch.srpMacro }}
            title="SRP Macro accent"
          />
          <span 
            className="w-2 h-2 rounded-full border border-black/40" 
            style={{ backgroundColor: currentTheme.swatch.uniform }}
            title="Uniform register accent"
          />
        </div>

        <span className="font-mono truncate max-w-[130px] font-medium">
          {currentTheme.name.split(' (')[0]}
        </span>

        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-80 sm:w-96 z-50 bg-[#0E121A] border border-[#232B3A] rounded-xl shadow-2xl p-2.5 text-slate-200 animate-in fade-in zoom-in-95 duration-100 font-sans">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1A2230]">
            <div className="flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-indigo-400" />
              <div>
                <h4 className="text-xs font-bold text-slate-100">HLSL Editor Theming</h4>
                <p className="text-[10px] text-slate-400">High-contrast token palettes for CBUFFER & SRP macros</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              {EDITOR_THEMES.length} Themes
            </span>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center space-x-1 mb-2.5 overflow-x-auto scrollbar-none pb-0.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition whitespace-nowrap cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-[#151B26] text-slate-400 hover:text-slate-200 hover:bg-[#1E2636]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Theme List */}
          <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin">
            {filteredThemes.map((theme) => {
              const isSelected = theme.id === currentThemeId;
              return (
                <div
                  key={theme.id}
                  id={`theme-option-${theme.id}`}
                  onClick={() => handleSelectTheme(theme.id)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer text-left group ${
                    isSelected
                      ? 'bg-[#151C2A] border-indigo-500/60 ring-1 ring-indigo-500/30 shadow-md'
                      : 'bg-[#0B0E14] hover:bg-[#121722] border-[#1A2230] hover:border-[#28354A]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span 
                        className="w-3 h-3 rounded-full border border-black/50 shrink-0 shadow-xs" 
                        style={{ backgroundColor: theme.colors.bg }}
                      />
                      <span className={`text-xs font-semibold truncate ${isSelected ? 'text-indigo-200' : 'text-slate-200 group-hover:text-white'}`}>
                        {theme.name}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#18202E] text-slate-300 border border-[#232D3F]">
                        {theme.badge}
                      </span>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-2">
                    {theme.description}
                  </p>

                  {/* Micro Sample Token Swatch Bar */}
                  <div 
                    className="p-1.5 rounded border flex items-center justify-between text-[10px] font-mono"
                    style={{ 
                      backgroundColor: theme.colors.bg, 
                      borderColor: theme.colors.cardBorder 
                    }}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span className={theme.tokenClasses.structural} style={{ color: theme.swatch.cbuffer }}>
                        CBUFFER_START
                      </span>
                      <span className={theme.tokenClasses.type} style={{ color: theme.swatch.type }}>
                        float4
                      </span>
                      <span className={theme.tokenClasses.uniform} style={{ color: theme.swatch.uniform }}>
                        _Color
                      </span>
                      <span className={theme.tokenClasses['srp-function']} style={{ color: theme.swatch.srpMacro }}>
                        Transform()
                      </span>
                    </div>

                    <span className="text-[9px] text-slate-500 font-sans shrink-0 pl-1">
                      {theme.category}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="mt-2.5 pt-2 border-t border-[#1A2230] flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              Tuned for 16-byte CBUFFER alignment
            </span>
            <span className="font-mono text-slate-500">Persistent auto-save</span>
          </div>

        </div>
      )}

    </div>
  );
};
