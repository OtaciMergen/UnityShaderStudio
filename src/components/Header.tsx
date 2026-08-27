import React from 'react';
import { 
  Zap, 
  Search, 
  Layers, 
  BookOpen, 
  Eye, 
  Code2, 
  Cpu,
  Gauge
} from 'lucide-react';
import { TargetPipeline, UnityVersion } from '../types';

interface HeaderProps {
  activeTab: 'converter' | 'search' | 'custom-node' | 'performance' | 'docs' | 'preview';
  setActiveTab: (tab: 'converter' | 'search' | 'custom-node' | 'performance' | 'docs' | 'preview') => void;
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
  return (
    <header className="border-b border-[#23272F] bg-[#16181D] text-slate-100 sticky top-0 z-30 shadow-sm backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Title */}
          <div className="flex items-center space-x-2.5 flex-shrink-0">
            <div className="h-8 w-8 rounded-lg bg-[#1E232B] border border-[#2D343F] flex items-center justify-center shadow-sm flex-shrink-0">
              <Code2 className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-base text-slate-100 tracking-tight whitespace-nowrap">Shader Converter</span>
              <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 whitespace-nowrap hidden sm:inline-block">
                GLSL / Built-in ➔ URP
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
          </div>

        </div>
      </div>
    </header>
  );
};
