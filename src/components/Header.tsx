import React, { useState } from 'react';
import { 
  Zap, 
  Search, 
  Layers, 
  BookOpen, 
  Eye, 
  Code2, 
  Cpu,
  Gauge,
  GraduationCap,
  Github,
  ExternalLink,
  ShieldCheck,
  X
} from 'lucide-react';
import { TargetPipeline, UnityVersion } from '../types';

interface HeaderProps {
  activeTab: 'converter' | 'search' | 'custom-node' | 'performance' | 'docs' | 'preview' | 'tutorials';
  setActiveTab: (tab: 'converter' | 'search' | 'custom-node' | 'performance' | 'docs' | 'preview' | 'tutorials') => void;
  targetPipeline: TargetPipeline;
  setTargetPipeline: (pipeline: TargetPipeline) => void;
  unityVersion: UnityVersion;
  setUnityVersion: (ver: UnityVersion) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  targetPipeline,
  setTargetPipeline,
  unityVersion,
  setUnityVersion,
}) => {
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);

  const navItems = [
    { id: 'converter', label: 'Converter', icon: Zap },
    { id: 'search', label: 'Matrix & Refs', icon: Search },
    { id: 'custom-node', label: 'Node Studio', icon: Layers },
    { id: 'performance', label: 'SRP Profiler', icon: Gauge },
    { id: 'preview', label: '3D Preview', icon: Eye },
    { id: 'tutorials', label: 'Tutorials', icon: GraduationCap },
    { id: 'docs', label: 'Docs', icon: BookOpen },
  ] as const;

  return (
    <>
      <header className="border-b border-[#1E232E] bg-[#0E1015]/95 backdrop-blur-md text-slate-100 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="flex items-center justify-between h-14 gap-2">
            
            {/* Logo */}
            <div className="flex items-center space-x-2.5 flex-shrink-0">
              <div className="h-7 w-7 rounded-md bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shadow-xs">
                <Code2 className="h-3.5 w-3.5 text-indigo-400" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-slate-100">
                  Uni<span className="text-indigo-400">Shader</span>
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 hidden md:inline-block">
                  v1.2
                </span>
              </div>
            </div>

            {/* Navigation Tabs (Minimalist Segmented Nav) */}
            <nav className="flex items-center space-x-1 overflow-x-auto scrollbar-none py-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`tab-btn-${item.id}`}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/30 shadow-xs font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#161920] border border-transparent'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Quick Actions & Links */}
            <div className="flex items-center space-x-1.5 flex-shrink-0">
              <a
                id="header-github-repo-link"
                href="https://github.com/OtaciMergen/UnityShaderStudio"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 px-2 py-1 bg-[#161920] hover:bg-[#1F242D] text-slate-300 rounded-md border border-[#23272F] hover:border-slate-600 text-xs font-medium transition cursor-pointer shadow-xs"
                title="View Open Source Code on GitHub"
              >
                <Github className="w-3.5 h-3.5 text-slate-300" />
                <span className="hidden lg:inline text-[11px]">GitHub</span>
              </a>

              <button
                id="btn-open-license-info"
                onClick={() => setIsLicenseModalOpen(true)}
                className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-md hover:bg-[#161920] border border-transparent hover:border-[#23272F] transition cursor-pointer"
                title="MIT License & Open Source Terms"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Open Source & License Modal */}
      {isLicenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#12151B] border border-[#262C38] rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl animate-in fade-in duration-150 text-slate-200">
            <div className="flex items-center justify-between border-b border-[#202530] pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Open Source & Licensing</h3>
                  <p className="text-[11px] text-slate-400">UniShader Studio is 100% Free & Open Source</p>
                </div>
              </div>
              <button
                onClick={() => setIsLicenseModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-[#1C2028] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <div className="bg-[#0A0C0E] border border-[#1F242E] rounded-lg p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1.5 text-xs">
                    <ShieldCheck className="w-3.5 h-3.5" /> MIT License
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] border border-emerald-500/20">
                    Permissive
                  </span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  You are completely free to use, modify, distribute, fork, and integrate all generated HLSL/ShaderLab code and shader algorithms into personal, commercial, and studio game releases without royalty.
                </p>
              </div>

              <div className="space-y-1 text-[11px]">
                <h4 className="font-semibold text-slate-200">Permissions granted:</h4>
                <ul className="list-disc list-inside space-y-0.5 text-slate-400 pl-1">
                  <li><strong className="text-slate-300">Commercial Use:</strong> Freely ship shaders in commercial Unity titles.</li>
                  <li><strong className="text-slate-300">Modification:</strong> Adapt AST transpilers, HLSL emitters, and preview meshes.</li>
                  <li><strong className="text-slate-300">No Copyleft:</strong> Your proprietary game code remains private.</li>
                </ul>
              </div>

              <div className="bg-[#161920] p-2.5 rounded-lg border border-[#23272F] flex items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <Github className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  <span className="font-mono text-[10px] text-slate-300 truncate">github.com/OtaciMergen/UnityShaderStudio</span>
                </div>
                <a
                  href="https://github.com/OtaciMergen/UnityShaderStudio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <span>Repository</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#202530]">
              <button
                onClick={() => setIsLicenseModalOpen(false)}
                className="px-3 py-1 bg-[#1A1D24] hover:bg-[#232731] text-slate-200 text-xs font-medium rounded border border-[#2B313D] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
