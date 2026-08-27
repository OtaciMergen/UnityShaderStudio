import React, { useState } from 'react';
import { 
  Table, 
  Layers, 
  GraduationCap, 
  Code2, 
  BookOpen, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { ConversionTableViewer } from './ConversionTableViewer';
import { FunctionSearchMatrix } from './FunctionSearchMatrix';
import { AcademicReferenceTree } from './AcademicReferenceTree';

interface MatrixAndReferencesHubProps {
  onLoadShaderPreset?: (presetId: string) => void;
  onOpenDocTopic?: (topicId: string) => void;
}

export const MatrixAndReferencesHub: React.FC<MatrixAndReferencesHubProps> = ({
  onLoadShaderPreset,
  onOpenDocTopic
}) => {
  const [subTab, setSubTab] = useState<'conversion_table' | 'cross_matrix' | 'academic_tree'>('conversion_table');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Segmented Sub-Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#23272F] pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Code2 className="w-5 h-5" />
            </span>
            Shading Language Conversion & Academic Reference Hub
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Complete architectural matrix translating OpenGL GLSL and Unity Built-in CG to Universal Render Pipeline (URP 14/17 & Unity 6), backed by SIGGRAPH academic research citations.
          </p>
        </div>

        {/* Sub-Tabs */}
        <div className="flex items-center space-x-1.5 bg-[#16181D] p-1.5 rounded-lg border border-[#23272F]">
          <button
            id="subtab-conversion-table"
            onClick={() => setSubTab('conversion_table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              subTab === 'conversion_table'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E232B]'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>GLSL & Built-in → URP Table</span>
          </button>

          <button
            id="subtab-academic-tree"
            onClick={() => setSubTab('academic_tree')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              subTab === 'academic_tree'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E232B]'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Academic Reference Tree & Papers</span>
          </button>

          <button
            id="subtab-cross-matrix"
            onClick={() => setSubTab('cross_matrix')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              subTab === 'cross_matrix'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E232B]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Multi-Language Matrix</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab Content Views */}
      <div>
        {subTab === 'conversion_table' && (
          <ConversionTableViewer
            onSelectPreset={onLoadShaderPreset}
            onOpenDocTopic={onOpenDocTopic}
          />
        )}

        {subTab === 'academic_tree' && (
          <AcademicReferenceTree
            onLoadShaderPreset={onLoadShaderPreset}
            onOpenDocTopic={onOpenDocTopic}
          />
        )}

        {subTab === 'cross_matrix' && (
          <FunctionSearchMatrix
            onOpenDocTopic={onOpenDocTopic}
          />
        )}
      </div>

    </div>
  );
};
