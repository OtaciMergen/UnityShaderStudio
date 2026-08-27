import React, { useState } from 'react';
import { Header } from './components/Header';
import { ConverterWorkbench } from './components/ConverterWorkbench';
import { FunctionSearchMatrix } from './components/FunctionSearchMatrix';
import { CustomNodeStudio } from './components/CustomNodeStudio';
import { ShaderPreviewCanvas } from './components/ShaderPreviewCanvas';
import { DocumentationViewer } from './components/DocumentationViewer';
import { PerformanceImpactEstimator } from './components/PerformanceImpactEstimator';
import { MatrixAndReferencesHub } from './components/MatrixAndReferencesHub';
import { TutorialsHub } from './components/TutorialsHub';
import { TargetPipeline, UnityVersion, ShaderPreset } from './types';
import { SHADER_PRESETS } from './data/shaderPresets';
import { Zap, Code2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'converter' | 'search' | 'custom-node' | 'performance' | 'docs' | 'preview' | 'tutorials'>('converter');
  const [targetPipeline, setTargetPipeline] = useState<TargetPipeline>('urp');
  const [unityVersion, setUnityVersion] = useState<UnityVersion>('6000');
  const [activePreset, setActivePreset] = useState<ShaderPreset | null>(SHADER_PRESETS[0]);
  const [previewGlsl, setPreviewGlsl] = useState<string>(SHADER_PRESETS[0].glslCode);
  const [selectedDocTopic, setSelectedDocTopic] = useState<string | undefined>(undefined);

  const handlePreviewShader = (glsl: string, pipeline: TargetPipeline) => {
    setPreviewGlsl(glsl);
    setTargetPipeline(pipeline);
    setActiveTab('preview');
  };

  const handleLoadPresetFromHub = (presetId: string) => {
    const found = SHADER_PRESETS.find(p => p.id === presetId);
    if (found) {
      setActivePreset(found);
      setPreviewGlsl(found.glslCode);
      if (found.targetPipeline) {
        setTargetPipeline(found.targetPipeline);
      }
      setActiveTab('converter');
    }
  };

  const handleOpenDocTopic = (topicId?: string) => {
    if (topicId) {
      setSelectedDocTopic(topicId);
    }
    setActiveTab('docs');
  };

  return (
    <div className="min-h-screen bg-[#0F1113] text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* Top Navigation & App Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        targetPipeline={targetPipeline}
        setTargetPipeline={setTargetPipeline}
        unityVersion={unityVersion}
        setUnityVersion={setUnityVersion}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-12">
        {activeTab === 'converter' && (
          <ConverterWorkbench
            targetPipeline={targetPipeline}
            setTargetPipeline={setTargetPipeline}
            unityVersion={unityVersion}
            setUnityVersion={setUnityVersion}
            activePreset={activePreset}
            setActivePreset={setActivePreset}
            onPreviewShader={handlePreviewShader}
          />
        )}

        {activeTab === 'search' && (
          <MatrixAndReferencesHub
            onLoadShaderPreset={handleLoadPresetFromHub}
            onOpenDocTopic={handleOpenDocTopic}
          />
        )}

        {activeTab === 'custom-node' && (
          <CustomNodeStudio />
        )}

        {activeTab === 'performance' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#23272F] pb-4">
              <div>
                <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Zap className="w-5 h-5" />
                  </span>
                  SRP Batcher Compatibility & Shader Variant Impact Estimator
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Static analysis profiler for Unity URP & HDRP shaders: measures CBUFFER byte alignment, draw call batchability, keyword variant explosion risk, and GPU instruction workloads.
                </p>
              </div>
            </div>

            <PerformanceImpactEstimator
              hlslCode={previewGlsl}
              isEmbedded={false}
            />
          </div>
        )}

        {activeTab === 'preview' && (
          <ShaderPreviewCanvas
            glslCode={previewGlsl}
            targetPipeline={targetPipeline}
            onSelectPreset={(preset) => {
              setActivePreset(preset);
              setPreviewGlsl(preset.glslCode);
              if (preset.targetPipeline) {
                setTargetPipeline(preset.targetPipeline);
              }
            }}
          />
        )}

        {activeTab === 'docs' && (
          <DocumentationViewer
            initialTopicId={selectedDocTopic}
            onSelectTopic={() => setActiveTab('converter')}
          />
        )}

        {activeTab === 'tutorials' && (
          <TutorialsHub
            onOpenDocTopic={handleOpenDocTopic}
            onSelectPreset={handleLoadPresetFromHub}
          />
        )}
      </main>

      {/* Global Footer */}
      <footer className="border-t border-[#23272F] bg-[#16181D] py-5 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2.5">
            <Code2 className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold text-slate-200 text-xs">UniShader Studio</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400 text-[11px]">GLSL & Built-in to Unity SRP (2022.3, 2023.3 & Unity 6)</span>
          </div>

          <div className="flex items-center space-x-4 text-[11px]">
            <button onClick={() => setActiveTab('converter')} className="text-slate-400 hover:text-indigo-400 transition cursor-pointer">
              Converter
            </button>
            <button onClick={() => setActiveTab('search')} className="text-slate-400 hover:text-indigo-400 transition cursor-pointer">
              Function Matrix
            </button>
            <button onClick={() => setActiveTab('custom-node')} className="text-slate-400 hover:text-indigo-400 transition cursor-pointer">
              Custom Node Studio
            </button>
            <button onClick={() => setActiveTab('preview')} className="text-slate-400 hover:text-indigo-400 transition cursor-pointer">
              3D WebGL Preview
            </button>
            <button onClick={() => setActiveTab('tutorials')} className="text-slate-400 hover:text-indigo-400 transition cursor-pointer">
              Tutorials & Papers
            </button>
            <button onClick={() => setActiveTab('docs')} className="text-slate-400 hover:text-indigo-400 transition cursor-pointer">
              SRP Documentation
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}
