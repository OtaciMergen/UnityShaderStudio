import React, { useState, useMemo } from 'react';
import { 
  Layers, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Download, 
  FileCode, 
  CheckCircle2, 
  Sparkles,
  HelpCircle,
  Cpu,
  ArrowRight
} from 'lucide-react';
import { CustomNodePort, CustomNodeDefinition } from '../types';

export const CustomNodeStudio: React.FC = () => {
  const [functionName, setFunctionName] = useState<string>('CustomShadingEffect');
  const [mode, setMode] = useState<'file' | 'string'>('file');
  const [precisionSupport, setPrecisionSupport] = useState<'both' | 'float_only'>('both');
  const [description, setDescription] = useState<string>('Performs custom procedural distortion and rim lighting calculation.');
  const [copiedHlsl, setCopiedHlsl] = useState<boolean>(false);
  const [copiedSetupGuide, setCopiedSetupGuide] = useState<boolean>(false);

  // Initial Ports
  const [ports, setPorts] = useState<CustomNodePort[]>([
    { id: '1', name: 'PositionWS', type: 'Vector3', direction: 'input', defaultValue: 'float3(0,0,0)', description: 'World space position' },
    { id: '2', name: 'NormalWS', type: 'Vector3', direction: 'input', defaultValue: 'float3(0,1,0)', description: 'World space normal' },
    { id: '3', name: 'UV', type: 'Vector2', direction: 'input', defaultValue: 'float2(0,0)', description: 'Texture coordinates' },
    { id: '4', name: 'Intensity', type: 'Float', direction: 'input', defaultValue: '1.0', description: 'Effect multiplier' },
    { id: '5', name: 'OutColor', type: 'Vector4', direction: 'output', description: 'Evaluated RGBA color' },
    { id: '6', name: 'OutNormal', type: 'Vector3', direction: 'output', description: 'Perturbed normal vector' },
  ]);

  // Function Body HLSL logic
  const [bodyCode, setBodyCode] = useState<string>(`// Calculate procedural wave offset
float wave = sin(dot(PositionWS.xz, float2(3.0, 3.0)) + _Time.y * 2.0);
float3 perturbedNormal = normalize(NormalWS + float3(wave * 0.1, 0.0, wave * 0.1));

// Calculate fresnel rim factor
float3 viewDir = normalize(GetWorldSpaceNormalizeViewDir(PositionWS));
float fresnel = pow(1.0 - saturate(dot(perturbedNormal, viewDir)), 3.0);

// Assign outputs
OutColor = float4(lerp(float3(0.1, 0.4, 0.9), float3(1.0, 0.3, 0.7), wave * 0.5 + 0.5) * Intensity + fresnel * 0.8, 1.0);
OutNormal = perturbedNormal;`);

  const inputPorts = useMemo(() => ports.filter(p => p.direction === 'input'), [ports]);
  const outputPorts = useMemo(() => ports.filter(p => p.direction === 'output'), [ports]);

  const addPort = (direction: 'input' | 'output') => {
    const newId = String(Date.now());
    const count = ports.filter(p => p.direction === direction).length + 1;
    const newPort: CustomNodePort = {
      id: newId,
      name: direction === 'input' ? `InputParam${count}` : `OutputParam${count}`,
      type: 'Float',
      direction,
      defaultValue: direction === 'input' ? '0.0' : undefined,
    };
    setPorts([...ports, newPort]);
  };

  const removePort = (id: string) => {
    setPorts(ports.filter(p => p.id !== id));
  };

  const updatePort = (id: string, updates: Partial<CustomNodePort>) => {
    setPorts(ports.map(p => (p.id === id ? { ...p, ...updates } : p)));
  };

  // Generate the .hlsl Include File
  const generatedHlsl = useMemo(() => {
    const guardName = `${functionName.toUpperCase()}_INCLUDED`;

    // Map types to HLSL types for float and half
    const mapType = (t: string, prec: 'float' | 'half') => {
      if (t === 'Float') return prec;
      if (t === 'Vector2') return `${prec}2`;
      if (t === 'Vector3') return `${prec}3`;
      if (t === 'Vector4') return `${prec}4`;
      if (t === 'Matrix4x4') return `${prec}4x4`;
      if (t === 'Boolean') return 'bool';
      if (t === 'Texture2D') return 'UnityTexture2D';
      if (t === 'SamplerState') return 'UnitySamplerState';
      return prec;
    };

    // Float signature params
    const floatParams = [
      ...inputPorts.map(p => `    ${mapType(p.type, 'float')} ${p.name}`),
      ...outputPorts.map(p => `    out ${mapType(p.type, 'float')} ${p.name}`),
    ].join(',\n');

    // Half signature params
    const halfParams = [
      ...inputPorts.map(p => `    ${mapType(p.type, 'half')} ${p.name}`),
      ...outputPorts.map(p => `    out ${mapType(p.type, 'half')} ${p.name}`),
    ].join(',\n');

    // Call float from half
    const halfCallArgs = [
      ...inputPorts.map(p => `${mapType(p.type, 'float')}(${p.name})`),
      ...outputPorts.map(p => `_out_${p.name}`),
    ].join(', ');

    const halfTempVars = outputPorts
      .map(p => `    ${mapType(p.type, 'float')} _out_${p.name};`)
      .join('\n');

    const halfAssignments = outputPorts
      .map(p => `    ${p.name} = ${mapType(p.type, 'half')}(_out_${p.name});`)
      .join('\n');

    return `// ============================================================================
// Unity Shader Graph Custom Function Node Include File
// Generated for Unity 2022.3 LTS, Unity 2023, and Unity 6 (6000 LTS)
// Description: ${description}
// ============================================================================

#ifndef ${guardName}
#define ${guardName}

// ----------------------------------------------------------------------------
// Single-Precision (Float) Function Signature
// ----------------------------------------------------------------------------
void ${functionName}_float(
${floatParams}
)
{
    // Initialize default outputs
${outputPorts.map(p => `    ${p.name} = (${mapType(p.type, 'float')})0;`).join('\n')}

    #if defined(SHADERGRAPH_PREVIEW)
        // Preview fallback inside Shader Graph editor window
        ${outputPorts.length > 0 ? `${outputPorts[0].name} = (${mapType(outputPorts[0].type, 'float')})1.0;` : ''}
    #else
        // Custom computation logic
        ${bodyCode.split('\n').join('\n        ')}
    #endif
}

// ----------------------------------------------------------------------------
// Half-Precision (Half) Function Signature (Overload for Mobile GPUs)
// ----------------------------------------------------------------------------
void ${functionName}_half(
${halfParams}
)
{
${halfTempVars}
    ${functionName}_float(${halfCallArgs});
${halfAssignments}
}

#endif // ${guardName}
`;
  }, [functionName, description, inputPorts, outputPorts, bodyCode]);

  const setupGuideText = `Unity Shader Graph Custom Function Setup Guide:
1. Save the generated code as "${functionName}.hlsl" in your Unity Project Assets folder (e.g. Assets/Shaders/${functionName}.hlsl).
2. Open your Shader Graph (URP or HDRP Lit/Unlit).
3. Right-click canvas -> Create Node -> Search for "Custom Function".
4. In the Node Settings Inspector (Gear Icon on top-right of node):
   - Type: File
   - Source: Drag your ${functionName}.hlsl asset here
   - Name: ${functionName} (DO NOT include _float or _half suffix)
5. Add Inputs:
${inputPorts.map(p => `   [+] Name: "${p.name}", Type: ${p.type}`).join('\n')}
6. Add Outputs:
${outputPorts.map(p => `   [+] Name: "${p.name}", Type: ${p.type}`).join('\n')}`;

  const handleCopyHlsl = () => {
    navigator.clipboard.writeText(generatedHlsl);
    setCopiedHlsl(true);
    setTimeout(() => setCopiedHlsl(false), 2000);
  };

  const handleCopySetupGuide = () => {
    navigator.clipboard.writeText(setupGuideText);
    setCopiedSetupGuide(true);
    setTimeout(() => setCopiedSetupGuide(false), 2000);
  };

  const handleDownloadHlsl = () => {
    const blob = new Blob([generatedHlsl], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${functionName}.hlsl`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      
      {/* Top Banner */}
      <div className="bg-[#16181D] border border-[#23272F] rounded-lg p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Shader Graph Custom Function Node Studio</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Visually design Custom Function Nodes with automatic <code className="text-indigo-300 font-mono">_float</code> and <code className="text-indigo-300 font-mono">_half</code> dual-precision overloading for modern Unity URP and HDRP.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyHlsl}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#1E232B] hover:bg-[#282F3A] text-slate-300 text-xs font-medium rounded border border-[#2D343F] transition cursor-pointer"
          >
            {copiedHlsl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedHlsl ? 'Copied HLSL' : 'Copy .hlsl Code'}</span>
          </button>

          <button
            onClick={handleDownloadHlsl}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded shadow-sm transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download {functionName}.hlsl</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Configuration & Ports, Right Code & Schematic */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT: Node Settings & Ports Definition (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Function Meta Box */}
          <div className="bg-[#16181D] border border-[#23272F] rounded-lg p-3.5 space-y-3 shadow-sm">
            <div className="text-xs font-medium text-slate-200 uppercase tracking-wider border-b border-[#23272F] pb-2">
              Node Configuration
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Function Name (Base Identifier)</label>
                <input
                  type="text"
                  value={functionName}
                  onChange={(e) => setFunctionName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  placeholder="EvaluateCustomShader"
                  className="w-full bg-[#0A0C0E] text-slate-200 font-mono rounded px-2.5 py-1.5 border border-[#2D343F] focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Description / Summary</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the node function..."
                  className="w-full bg-[#0A0C0E] text-slate-200 rounded px-2.5 py-1.5 border border-[#2D343F] focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Node Mode</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as any)}
                    className="w-full bg-[#0A0C0E] text-slate-200 rounded px-2.5 py-1.5 border border-[#2D343F] focus:outline-none focus:border-indigo-500 text-xs cursor-pointer"
                  >
                    <option value="file">File (.hlsl Include)</option>
                    <option value="string">String (Inline Code)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Precision Support</label>
                  <select
                    value={precisionSupport}
                    onChange={(e) => setPrecisionSupport(e.target.value as any)}
                    className="w-full bg-[#0A0C0E] text-slate-200 rounded px-2.5 py-1.5 border border-[#2D343F] focus:outline-none focus:border-indigo-500 text-xs cursor-pointer"
                  >
                    <option value="both">Dual (_float & _half)</option>
                    <option value="float_only">Float Only</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Input & Output Ports Builder */}
          <div className="bg-[#16181D] border border-[#23272F] rounded-lg p-3.5 space-y-3.5 shadow-sm">
            
            {/* Input Ports */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-[#23272F] pb-1.5">
                <span className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>Input Ports ({inputPorts.length})</span>
                </span>
                <button
                  onClick={() => addPort('input')}
                  className="flex items-center space-x-1 text-[11px] font-medium text-indigo-400 hover:text-indigo-300 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Input</span>
                </button>
              </div>

              <div className="space-y-1.5">
                {inputPorts.map(port => (
                  <div key={port.id} className="bg-[#121418] p-2 rounded border border-[#23272F] text-xs flex items-center space-x-2">
                    <input
                      type="text"
                      value={port.name}
                      onChange={(e) => updatePort(port.id, { name: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                      className="w-1/3 bg-[#0A0C0E] text-slate-200 font-mono px-2 py-1 rounded border border-[#2D343F] text-[11px]"
                    />
                    <select
                      value={port.type}
                      onChange={(e) => updatePort(port.id, { type: e.target.value as any })}
                      className="w-1/3 bg-[#0A0C0E] text-indigo-300 px-2 py-1 rounded border border-[#2D343F] text-[11px] cursor-pointer"
                    >
                      <option value="Float">Float</option>
                      <option value="Vector2">Vector2</option>
                      <option value="Vector3">Vector3</option>
                      <option value="Vector4">Vector4</option>
                      <option value="Matrix4x4">Matrix4x4</option>
                      <option value="Boolean">Boolean</option>
                      <option value="Texture2D">Texture2D</option>
                      <option value="SamplerState">SamplerState</option>
                    </select>
                    <input
                      type="text"
                      value={port.defaultValue || ''}
                      onChange={(e) => updatePort(port.id, { defaultValue: e.target.value })}
                      placeholder="Default"
                      className="w-1/4 bg-[#0A0C0E] text-slate-400 font-mono px-2 py-1 rounded border border-[#2D343F] text-[10px]"
                    />
                    <button
                      onClick={() => removePort(port.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                      title="Remove input"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Output Ports */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between border-b border-[#23272F] pb-1.5">
                <span className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                  <span>Output Ports ({outputPorts.length})</span>
                </span>
                <button
                  onClick={() => addPort('output')}
                  className="flex items-center space-x-1 text-[11px] font-medium text-indigo-400 hover:text-indigo-300 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Output</span>
                </button>
              </div>

              <div className="space-y-1.5">
                {outputPorts.map(port => (
                  <div key={port.id} className="bg-[#121418] p-2 rounded border border-[#23272F] text-xs flex items-center space-x-2">
                    <input
                      type="text"
                      value={port.name}
                      onChange={(e) => updatePort(port.id, { name: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                      className="w-1/2 bg-[#0A0C0E] text-slate-200 font-mono px-2 py-1 rounded border border-[#2D343F] text-[11px]"
                    />
                    <select
                      value={port.type}
                      onChange={(e) => updatePort(port.id, { type: e.target.value as any })}
                      className="w-1/2 bg-[#0A0C0E] text-indigo-300 px-2 py-1 rounded border border-[#2D343F] text-[11px] cursor-pointer"
                    >
                      <option value="Float">Float</option>
                      <option value="Vector2">Vector2</option>
                      <option value="Vector3">Vector3</option>
                      <option value="Vector4">Vector4</option>
                      <option value="Matrix4x4">Matrix4x4</option>
                      <option value="Boolean">Boolean</option>
                    </select>
                    <button
                      onClick={() => removePort(port.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                      title="Remove output"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Node Schematic Diagram Box */}
          <div className="bg-[#16181D] border border-[#23272F] rounded-lg p-3.5 shadow-sm space-y-3">
            <div className="text-xs font-medium text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Shader Graph Visual Node Schematic</span>
            </div>

            {/* Visual Node Box */}
            <div className="bg-[#0A0C0E] border border-[#23272F] rounded-lg overflow-hidden shadow-md">
              <div className="bg-[#1A1D21] border-b border-[#23272F] px-3 py-1.5 flex items-center justify-between text-slate-200 font-medium text-xs">
                <span>Custom Function: {functionName}</span>
                <span className="text-[10px] bg-[#121418] border border-[#2D343F] px-1.5 py-0.5 rounded text-indigo-300 font-mono">
                  {precisionSupport === 'both' ? '_float / _half' : '_float'}
                </span>
              </div>

              <div className="p-3 grid grid-cols-2 gap-4 text-xs font-mono">
                {/* Inputs */}
                <div className="space-y-1.5">
                  {inputPorts.map(p => (
                    <div key={p.id} className="flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span className="text-slate-200 font-medium text-[11px]">{p.name}</span>
                      <span className="text-[10px] text-slate-500">({p.type})</span>
                    </div>
                  ))}
                </div>

                {/* Outputs */}
                <div className="space-y-1.5 text-right">
                  {outputPorts.map(p => (
                    <div key={p.id} className="flex items-center justify-end space-x-1.5">
                      <span className="text-[10px] text-slate-500">({p.type})</span>
                      <span className="text-slate-200 font-medium text-[11px]">{p.name}</span>
                      <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Setup Instructions Copy */}
            <button
              onClick={handleCopySetupGuide}
              className="w-full py-2 bg-[#1E232B] hover:bg-[#282F3A] text-slate-300 text-xs font-medium rounded border border-[#2D343F] flex items-center justify-center space-x-1.5 transition cursor-pointer"
            >
              {copiedSetupGuide ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-indigo-400" />}
              <span>{copiedSetupGuide ? 'Copied Guide' : 'Copy Shader Graph Wiring Guide'}</span>
            </button>
          </div>

        </div>

        {/* RIGHT: HLSL Code Editor & Include Output (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Custom Logic Editor */}
          <div className="bg-[#16181D] border border-[#23272F] rounded-lg overflow-hidden shadow-sm">
            <div className="bg-[#1A1D21] px-3.5 py-2 border-b border-[#23272F] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-mono text-xs font-medium text-slate-200">Custom HLSL Function Body</span>
              </div>
              <span className="text-[11px] text-slate-400">Evaluation logic</span>
            </div>

            <textarea
              value={bodyCode}
              onChange={(e) => setBodyCode(e.target.value)}
              placeholder="// Write your custom HLSL math and logic..."
              spellCheck={false}
              className="w-full h-44 p-3.5 bg-[#0A0C0E] text-slate-200 font-mono text-xs leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500/50 selection:bg-indigo-500/30"
            />
          </div>

          {/* Generated .hlsl Include File Display */}
          <div className="bg-[#16181D] border border-[#23272F] rounded-lg overflow-hidden shadow-sm">
            <div className="bg-[#1A1D21] px-3.5 py-2 border-b border-[#23272F] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="font-mono text-xs font-medium text-slate-200">Generated File: {functionName}.hlsl</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopyHlsl}
                  className="flex items-center space-x-1 px-2.5 py-1 bg-[#1E232B] hover:bg-[#282F3A] text-slate-300 text-xs font-medium rounded border border-[#2D343F] transition cursor-pointer"
                >
                  {copiedHlsl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedHlsl ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <pre className="p-3.5 font-mono text-xs leading-relaxed text-slate-300 bg-[#0A0C0E] overflow-auto max-h-[460px] select-text">
              <code>{generatedHlsl}</code>
            </pre>
          </div>

        </div>

      </div>

    </div>
  );
};
