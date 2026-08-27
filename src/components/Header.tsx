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

  return (
    <>
      <header className="border-b border-[#23272F] bg-[#16181D] text-slate-100 sticky top-0 z-30 shadow-sm backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Title */}
          <div className="flex items-center space-x-2.5 flex-shrink-0">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center shadow-sm flex-shrink-0">
              <Code2 className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base text-slate-100 tracking-tight whitespace-nowrap">
                Uni<span className="text-indigo-400">Shader</span> Studio
              </span>
              <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 whitespace-nowrap hidden sm:inline-block">
                Unity URP / HDRP Suite
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-1.5 flex-shrink-0">
            <button
              id="tab-btn-converter"
              onClick={() => setActiveTab('converter')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'converter'
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E232B] border border-transparent'
              }`}
            >
              <Zap className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Converter</span>
            </button>

            <button
              id="tab-btn-search"
              onClick={() => setActiveTab('search')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'search'
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E232B] border border-transparent'
              }`}
            >
              <Search className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Matrix & Refs</span>
            </button>

            <button
              id="tab-btn-custom-node"
              onClick={() => setActiveTab('custom-node')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'custom-node'
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E232B] border border-transparent'
              }`}
            >
              <Layers className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Node Studio</span>
            </button>

            <button
              id="tab-btn-performance"
              onClick={() => setActiveTab('performance')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'performance'
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E232B] border border-transparent'
              }`}
            >
              <Gauge className="w-3.5 h-3.5 flex-shrink-0" />
              <span>SRP Profiler</span>
            </button>

            <button
              id="tab-btn-preview"
              onClick={() => setActiveTab('preview')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'preview'
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E232B] border border-transparent'
              }`}
            >
              <Eye className="w-3.5 h-3.5 flex-shrink-0" />
              <span>3D Preview</span>
            </button>

            <button
              id="tab-btn-tutorials"
              onClick={() => setActiveTab('tutorials')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'tutorials'
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E232B] border border-transparent'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Tutorials</span>
            </button>

            <button
              id="tab-btn-docs"
              onClick={() => setActiveTab('docs')}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'docs'
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E232B] border border-transparent'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Docs</span>
            </button>
          </nav>

          {/* Quick Target Selectors */}
          <div className="hidden lg:flex items-center space-x-2 pl-2 border-l border-[#23272F] flex-shrink-0">
            <div className="flex items-center space-x-1 bg-[#121418] p-1 rounded-md border border-[#23272F] text-xs">
              <span className="text-slate-400 px-1 text-[11px] font-medium flex items-center gap-1">
                <Cpu className="w-3 h-3 text-indigo-400" /> Pipeline:
              </span>
              <select
                id="header-pipeline-select"
                value={targetPipeline}
                onChange={(e) => setTargetPipeline(e.target.value as TargetPipeline)}
                aria-label="Target Render Pipeline"
                className="bg-[#1A1D21] text-slate-200 rounded px-1.5 py-0.5 font-mono text-[11px] border border-[#2D343F] focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="urp">URP</option>
                <option value="hdrp">HDRP</option>
                <option value="shadergraph">Shader Graph</option>
                <option value="srp_core">SRP Core</option>
                <option value="compute">Compute</option>
              </select>
            </div>

            <div className="flex items-center space-x-1 bg-[#121418] p-1 rounded-md border border-[#23272F] text-xs">
              <span className="text-slate-400 px-1 text-[11px] font-medium">Unity:</span>
              <select
                id="header-unity-version-select"
                value={unityVersion}
                onChange={(e) => setUnityVersion(e.target.value as UnityVersion)}
                aria-label="Target Unity Version"
                className="bg-[#1A1D21] text-slate-200 rounded px-1.5 py-0.5 font-mono text-[11px] border border-[#2D343F] focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="6000">Unity 6</option>
                <option value="2023">2023.3</option>
                <option value="2022">2022.3</option>
              </select>
            </div>

            {/* GitHub Repo & Open Source Link */}
            <div className="flex items-center space-x-1 pl-1">
              <a
                id="header-github-repo-link"
                href="https://github.com/berkaysert/unishader-studio"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-[#1E232B] hover:bg-[#282F3A] text-slate-200 rounded-md border border-[#2D343F] hover:border-slate-500 text-xs font-medium transition cursor-pointer shadow-xs"
                title="View Open Source Code on GitHub"
              >
                <Github className="w-3.5 h-3.5 text-slate-300" />
                <span className="hidden xl:inline">GitHub</span>
                <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
              </a>

              <button
                id="btn-open-license-info"
                onClick={() => setIsLicenseModalOpen(true)}
                className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-md hover:bg-[#1E232B] border border-transparent hover:border-[#2D343F] transition cursor-pointer"
                title="Open Source & MIT License Details"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </header>

    {/* Open Source & License Modal */}
    {isLicenseModalOpen && (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-[#14171D] border border-[#2D343F] rounded-xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in duration-200 text-slate-200">
          <div className="flex items-center justify-between border-b border-[#23272F] pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Open Source & Licensing</h3>
                <p className="text-xs text-slate-400">UniShader Studio is 100% Free & Open Source Software</p>
              </div>
            </div>
            <button
              onClick={() => setIsLicenseModalOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-[#1F242D] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3 text-xs leading-relaxed">
            <div className="bg-[#0C0E12] border border-[#23272F] rounded-lg p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> License: MIT License
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] border border-emerald-500/20">
                  Permissive
                </span>
              </div>
              <p className="text-slate-300">
                UniShader Studio is distributed under the standard <strong>MIT License</strong>. You are completely free to use, modify, distribute, fork, and integrate all generated HLSL/ShaderLab code and shader algorithms into personal, commercial, and studio game releases without royalty or restriction.
              </p>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-semibold text-slate-200">What the MIT License grants:</h4>
              <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                <li><strong className="text-slate-300">Commercial Use:</strong> Freely ship converted shaders in commercial Unity titles.</li>
                <li><strong className="text-slate-300">Modification & Customization:</strong> Adapt AST transpilers, HLSL emitters, and preview meshes.</li>
                <li><strong className="text-slate-300">Distribution:</strong> Share packaged code and Unity Custom Function nodes across teams.</li>
                <li><strong className="text-slate-300">No Copyleft Burden:</strong> Your proprietary game code remains 100% private.</li>
              </ul>
            </div>

            <div className="bg-[#191D24] p-3 rounded-lg border border-[#282E39] flex items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <Github className="w-4 h-4 text-slate-300 shrink-0" />
                <span className="font-mono text-[11px] text-slate-300">github.com/berkaysert/unishader-studio</span>
              </div>
              <a
                href="https://github.com/berkaysert/unishader-studio"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <span>Repository</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-[#23272F]">
            <button
              onClick={() => setIsLicenseModalOpen(false)}
              className="px-4 py-1.5 bg-[#1E232B] hover:bg-[#282F3A] text-slate-200 text-xs font-medium rounded border border-[#2D343F] cursor-pointer"
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
