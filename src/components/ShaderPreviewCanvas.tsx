import React, { useRef, useEffect, useState } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Maximize2, 
  Box, 
  Circle, 
  Sliders, 
  AlertTriangle,
  Compass,
  CheckCircle2,
  Code2,
  Eye,
  RefreshCw,
  Sparkles,
  Layers,
  ChevronDown,
  Volume2
} from 'lucide-react';
import { TargetPipeline, ShaderPreset } from '../types';
import { SHADER_PRESETS } from '../data/shaderPresets';

interface ShaderPreviewCanvasProps {
  glslCode: string;
  targetPipeline: TargetPipeline;
  onSelectPreset?: (preset: ShaderPreset) => void;
}

export const ShaderPreviewCanvas: React.FC<ShaderPreviewCanvasProps> = ({
  glslCode: initialGlslCode,
  targetPipeline,
  onSelectPreset
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [localGlslCode, setLocalGlslCode] = useState<string>(initialGlslCode);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [geometryType, setGeometryType] = useState<'fullscreen' | 'sphere' | 'torus' | 'cube' | 'plane'>('fullscreen');
  const [glError, setGlError] = useState<string | null>(null);
  const [fps, setFps] = useState<number>(60);
  const [showCodeEditor, setShowCodeEditor] = useState<boolean>(false);
  const [showUniformControls, setShowUniformControls] = useState<boolean>(true);

  // Shader Uniform Parameters
  const [speed, setSpeed] = useState<number>(1.0);
  const [glowPower, setGlowPower] = useState<number>(2.5);
  const [cellScale, setCellScale] = useState<number>(8.0);
  const [metallic, setMetallic] = useState<number>(0.85);
  const [roughness, setRoughness] = useState<number>(0.25);
  const [rimPower, setRimPower] = useState<number>(3.0);
  const [scanlineDensity, setScanlineDensity] = useState<number>(40.0);
  const [baseColor, setBaseColor] = useState<string>('#3b82f6'); // default blue tint

  // Synchronize when initialGlslCode changes from outside
  useEffect(() => {
    setLocalGlslCode(initialGlslCode);
  }, [initialGlslCode]);

  // Rotation and zoom state
  const rotRef = useRef<{ x: number; y: number }>({ x: 0.3, y: 0.4 });
  const zoomRef = useRef<number>(2.8);
  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const animFrameIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(performance.now());
  const pausedTimeRef = useRef<number>(0);
  const lastTimeSnapshotRef = useRef<number>(0);

  // Convert hex color to vec4
  const hexToVec4 = (hex: string): [number, number, number, number] => {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255 || 0.2;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255 || 0.5;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255 || 0.9;
    return [r, g, b, 1.0];
  };

  // Compile and run WebGL shader loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get WebGL Context with fallback
    const gl = (
      canvas.getContext('webgl2', { antialias: true, alpha: false, preserveDrawingBuffer: false }) ||
      canvas.getContext('webgl', { antialias: true, alpha: false, preserveDrawingBuffer: false }) ||
      canvas.getContext('experimental-webgl')
    ) as WebGLRenderingContext | null;

    if (!gl) {
      setGlError('WebGL is not supported or hardware acceleration is disabled in your browser.');
      return;
    }

    // Enable standard derivatives extension for WebGL 1
    gl.getExtension('OES_standard_derivatives');
    gl.getExtension('EXT_shader_texture_lod');

    setGlError(null);

    // Vertex Shader based on geometry mode
    const vsSource = `
      precision highp float;
      attribute vec3 a_position;
      attribute vec3 a_normal;
      attribute vec2 a_uv;

      uniform mat4 u_mvp;
      uniform mat4 u_model;
      uniform vec3 u_cameraPos;

      varying vec2 v_uv;
      varying vec3 v_normal;
      varying vec3 v_positionWS;

      void main() {
        v_uv = a_uv;
        v_normal = mat3(u_model) * a_normal;
        v_positionWS = (u_model * vec4(a_position, 1.0)).xyz;
        gl_Position = u_mvp * vec4(a_position, 1.0);
      }
    `;

    // Preprocess fragment shader to ensure flawless compilation across WebGL 1 & 2
    const preparedFsSource = prepareWebGLShaderSource(localGlslCode);

    // Compile Shaders
    function createShader(glCtx: WebGLRenderingContext, type: number, source: string) {
      const shader = glCtx.createShader(type);
      if (!shader) return null;
      glCtx.shaderSource(shader, source);
      glCtx.compileShader(shader);
      if (!glCtx.getShaderParameter(shader, glCtx.COMPILE_STATUS)) {
        const info = glCtx.getShaderInfoLog(shader);
        glCtx.deleteShader(shader);
        throw new Error(info || 'Shader compilation failed');
      }
      return shader;
    }

    let program: WebGLProgram | null = null;
    let vs: WebGLShader | null = null;
    let fs: WebGLShader | null = null;

    try {
      vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
      fs = createShader(gl, gl.FRAGMENT_SHADER, preparedFsSource);
      if (!vs || !fs) return;

      program = gl.createProgram();
      if (!program) return;
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || 'Program link error');
      }
    } catch (err: any) {
      setGlError(err.message || 'Shader compilation failed in WebGL');
      return;
    }

    gl.useProgram(program);

    // Build Geometry Meshes
    const meshData = generateGeometry(geometryType);

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(meshData.positions), gl.STATIC_DRAW);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(meshData.normals), gl.STATIC_DRAW);

    const uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(meshData.uvs), gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(meshData.indices), gl.STATIC_DRAW);

    // Attributes
    const aPosLoc = gl.getAttribLocation(program, 'a_position');
    const aNormLoc = gl.getAttribLocation(program, 'a_normal');
    const aUvLoc = gl.getAttribLocation(program, 'a_uv');

    // Uniform locations
    const uMvpLoc = gl.getUniformLocation(program, 'u_mvp');
    const uModelLoc = gl.getUniformLocation(program, 'u_model');
    const uCameraPosLoc = gl.getUniformLocation(program, 'u_cameraPos');
    const uTimeLoc = gl.getUniformLocation(program, '_Time');
    const uScreenParamsLoc = gl.getUniformLocation(program, '_ScreenParams');
    const uBaseColorLoc = gl.getUniformLocation(program, '_BaseColor');
    
    // Configurable Uniforms
    const uSpeedLoc = gl.getUniformLocation(program, '_Speed');
    const uGlowLoc = gl.getUniformLocation(program, '_GlowPower');
    const uCellScaleLoc = gl.getUniformLocation(program, '_CellScale');
    const uMetallicLoc = gl.getUniformLocation(program, '_Metallic');
    const uRoughnessLoc = gl.getUniformLocation(program, '_Roughness');
    const uRimPowerLoc = gl.getUniformLocation(program, '_RimPower');
    const uScanlineLoc = gl.getUniformLocation(program, '_ScanlineDensity');

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let frameCount = 0;
    let lastFpsUpdate = performance.now();
    let lastRenderTime = performance.now();

    // Render loop
    const render = (now: number) => {
      if (!canvas || !gl || !program) return;

      const delta = (now - lastRenderTime) / 1000;
      lastRenderTime = now;

      // Handle Auto-Rotation if enabled
      if (autoRotate && isPlaying && geometryType !== 'fullscreen') {
        rotRef.current.y += delta * 0.4;
      }

      // Handle Resize safely
      const displayWidth = Math.max(1, canvas.clientWidth || 800);
      const displayHeight = Math.max(1, canvas.clientHeight || 560);
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, displayWidth, displayHeight);
      }

      // Calculate time
      if (isPlaying) {
        lastTimeSnapshotRef.current = ((now - startTimeRef.current) / 1000) * speed;
      }
      const elapsedSeconds = lastTimeSnapshotRef.current;

      gl.clearColor(0.03, 0.05, 0.08, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.useProgram(program);

      // Bind attributes
      if (aPosLoc >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
        gl.enableVertexAttribArray(aPosLoc);
        gl.vertexAttribPointer(aPosLoc, 3, gl.FLOAT, false, 0, 0);
      }

      if (aNormLoc >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.enableVertexAttribArray(aNormLoc);
        gl.vertexAttribPointer(aNormLoc, 3, gl.FLOAT, false, 0, 0);
      }

      if (aUvLoc >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
        gl.enableVertexAttribArray(aUvLoc);
        gl.vertexAttribPointer(aUvLoc, 2, gl.FLOAT, false, 0, 0);
      }

      // Set Matrix transformations
      const aspect = displayWidth / (displayHeight || 1);
      let mvp: Float32Array;
      let modelMat: Float32Array;
      const cameraPos = [0, 0, zoomRef.current];

      if (geometryType === 'fullscreen') {
        mvp = createIdentityMatrix();
        modelMat = createIdentityMatrix();
      } else {
        const proj = createPerspectiveMatrix(45 * (Math.PI / 180), aspect, 0.1, 100.0);
        const view = createLookAtMatrix(cameraPos, [0, 0, 0], [0, 1, 0]);
        modelMat = createRotationMatrix(rotRef.current.x, rotRef.current.y);
        const vp = multiplyMatrices(proj, view);
        mvp = multiplyMatrices(vp, modelMat);
      }

      if (uMvpLoc) gl.uniformMatrix4fv(uMvpLoc, false, mvp);
      if (uModelLoc) gl.uniformMatrix4fv(uModelLoc, false, modelMat);
      if (uCameraPosLoc) gl.uniform3f(uCameraPosLoc, cameraPos[0], cameraPos[1], cameraPos[2]);

      // Set global time & screen params
      if (uTimeLoc) gl.uniform4f(uTimeLoc, elapsedSeconds / 20.0, elapsedSeconds, elapsedSeconds * 2.0, elapsedSeconds * 3.0);
      if (uScreenParamsLoc) gl.uniform4f(uScreenParamsLoc, displayWidth, displayHeight, 1.0 + 1.0 / displayWidth, 1.0 + 1.0 / displayHeight);

      // Set Configurable Uniforms
      const colVec = hexToVec4(baseColor);
      if (uBaseColorLoc) gl.uniform4f(uBaseColorLoc, colVec[0], colVec[1], colVec[2], colVec[3]);
      if (uSpeedLoc) gl.uniform1f(uSpeedLoc, speed);
      if (uGlowLoc) gl.uniform1f(uGlowLoc, glowPower);
      if (uCellScaleLoc) gl.uniform1f(uCellScaleLoc, cellScale);
      if (uMetallicLoc) gl.uniform1f(uMetallicLoc, metallic);
      if (uRoughnessLoc) gl.uniform1f(uRoughnessLoc, roughness);
      if (uRimPowerLoc) gl.uniform1f(uRimPowerLoc, rimPower);
      if (uScanlineLoc) gl.uniform1f(uScanlineLoc, scanlineDensity);

      // Draw Elements
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.drawElements(gl.TRIANGLES, meshData.indices.length, gl.UNSIGNED_SHORT, 0);

      // Calculate FPS
      frameCount++;
      if (now - lastFpsUpdate > 500) {
        setFps(Math.round((frameCount * 1000) / (now - lastFpsUpdate)));
        frameCount = 0;
        lastFpsUpdate = now;
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (posBuffer) gl.deleteBuffer(posBuffer);
      if (normalBuffer) gl.deleteBuffer(normalBuffer);
      if (uvBuffer) gl.deleteBuffer(uvBuffer);
      if (indexBuffer) gl.deleteBuffer(indexBuffer);
      if (vs) gl.deleteShader(vs);
      if (fs) gl.deleteShader(fs);
      if (program) gl.deleteProgram(program);
    };
  }, [localGlslCode, geometryType, isPlaying, speed, glowPower, cellScale, metallic, roughness, rimPower, scanlineDensity, baseColor, autoRotate]);

  // Mouse Interaction handlers for 3D Orbit
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;

    rotRef.current.y += dx * 0.01;
    rotRef.current.x += dy * 0.01;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    zoomRef.current = Math.max(1.2, Math.min(8.0, zoomRef.current + e.deltaY * 0.005));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      
      {/* Workbench Header */}
      <div className="bg-[#16181D] border border-[#23272F] rounded-lg p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Compass className="w-4 h-4 text-indigo-400" />
            <span>Interactive 3D WebGL Shader Workbench</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time WebGL evaluation engine supporting procedural raymarching, 3D meshes, orbital cameras, and dynamic material properties.
          </p>
        </div>

        {/* Geometry, Preset & Playback Controls */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          
          {/* Preset Selector Quick Load */}
          <div className="relative">
            <select
              id="preset-quick-select"
              defaultValue=""
              onChange={(e) => {
                const found = SHADER_PRESETS.find(p => p.id === e.target.value);
                if (found) {
                  setLocalGlslCode(found.glslCode);
                  if (onSelectPreset) onSelectPreset(found);
                }
              }}
              className="bg-[#0A0C0E] text-xs text-slate-200 border border-[#2D343F] rounded px-2.5 py-1 pr-6 cursor-pointer focus:outline-none focus:border-indigo-500 appearance-none"
            >
              <option value="" disabled>Load Famous Shader Preset...</option>
              {SHADER_PRESETS.map(p => (
                <option key={p.id} value={p.id}>{p.title} ({p.category})</option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2 pointer-events-none" />
          </div>

          {/* Geometry Select */}
          <div className="flex items-center bg-[#0A0C0E] rounded p-0.5 border border-[#2D343F] text-xs">
            <button
              id="mesh-quad"
              onClick={() => setGeometryType('fullscreen')}
              className={`px-2 py-1 rounded text-xs transition cursor-pointer ${geometryType === 'fullscreen' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
              title="Fullscreen Quad (2D Raymarching / Screen UVs)"
            >
              Quad 2D
            </button>
            <button
              id="mesh-sphere"
              onClick={() => setGeometryType('sphere')}
              className={`px-2 py-1 rounded text-xs transition cursor-pointer ${geometryType === 'sphere' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
              title="3D Sphere Mesh"
            >
              Sphere
            </button>
            <button
              id="mesh-torus"
              onClick={() => setGeometryType('torus')}
              className={`px-2 py-1 rounded text-xs transition cursor-pointer ${geometryType === 'torus' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
              title="3D Torus Mesh"
            >
              Torus
            </button>
            <button
              id="mesh-cube"
              onClick={() => setGeometryType('cube')}
              className={`px-2 py-1 rounded text-xs transition cursor-pointer ${geometryType === 'cube' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
              title="3D Cube Mesh"
            >
              Cube
            </button>
          </div>

          {/* Play/Pause */}
          <button
            id="btn-play-pause"
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 bg-[#1E232B] hover:bg-[#282F3A] text-slate-200 rounded border border-[#2D343F] transition cursor-pointer"
            title={isPlaying ? 'Pause Shader Animation' : 'Play Shader Animation'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
          </button>

          {/* Auto-Rotation Toggle */}
          {geometryType !== 'fullscreen' && (
            <button
              id="btn-auto-rotate"
              onClick={() => setAutoRotate(!autoRotate)}
              className={`p-1.5 rounded border transition cursor-pointer ${autoRotate ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300' : 'bg-[#1E232B] border-[#2D343F] text-slate-400'}`}
              title="Toggle Auto Rotation"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} style={{ animationDuration: '8s' }} />
            </button>
          )}

          {/* Reset Orbit */}
          <button
            id="btn-reset-orbit"
            onClick={() => {
              rotRef.current = { x: 0.3, y: 0.4 };
              zoomRef.current = 2.8;
            }}
            className="p-1.5 bg-[#1E232B] hover:bg-[#282F3A] text-slate-200 rounded border border-[#2D343F] transition cursor-pointer"
            title="Reset Orbit & Camera"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Toggle Uniform Sliders */}
          <button
            id="btn-toggle-sliders"
            onClick={() => setShowUniformControls(!showUniformControls)}
            className={`p-1.5 rounded border transition cursor-pointer ${showUniformControls ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-[#1E232B] border-[#2D343F] text-slate-400'}`}
            title="Toggle Material Properties"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {/* Toggle Live Code Drawer */}
          <button
            id="btn-toggle-code"
            onClick={() => setShowCodeEditor(!showCodeEditor)}
            className={`p-1.5 rounded border transition cursor-pointer ${showCodeEditor ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-[#1E232B] border-[#2D343F] text-slate-400'}`}
            title="Toggle Live GLSL Code Drawer"
          >
            <Code2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Viewport & Interactive Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Canvas Viewport */}
        <div className={`relative bg-[#0A0C0E] border border-[#23272F] rounded-lg overflow-hidden shadow-md flex items-center justify-center ${showCodeEditor ? 'lg:col-span-7 h-[560px]' : 'lg:col-span-12 h-[580px]'}`}>
          
          {/* Canvas */}
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            className="w-full h-full cursor-grab active:cursor-grabbing block"
          />

          {/* Viewport Overlay Info */}
          <div className="absolute top-3 left-3 pointer-events-none flex flex-col space-y-1">
            <div className="px-2 py-0.5 rounded bg-[#121418]/90 border border-[#23272F] text-[10px] font-mono text-slate-300 backdrop-blur-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              FPS: <span className="text-emerald-400 font-semibold">{fps}</span>
            </div>
            <div className="px-2 py-0.5 rounded bg-[#121418]/90 border border-[#23272F] text-[10px] font-mono text-slate-400 backdrop-blur-sm">
              Mesh: <span className="text-indigo-300">{geometryType.toUpperCase()}</span> {geometryType !== 'fullscreen' ? '| Drag to Orbit | Scroll to Zoom' : '| Screen-Space Quad'}
            </div>
          </div>

          {/* Error Banner */}
          {glError && (
            <div className="absolute inset-x-4 bottom-4 bg-rose-950/95 border border-rose-500/50 rounded-lg p-3 text-xs text-rose-200 backdrop-blur-md shadow-lg flex items-start space-x-2.5 z-20">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 overflow-auto max-h-36 flex-1">
                <div className="font-semibold text-rose-300">WebGL Shader Compilation Issue:</div>
                <pre className="font-mono text-[11px] whitespace-pre-wrap text-rose-200/90">{glError}</pre>
                <p className="text-[10px] text-rose-300/80">Click the Code Drawer icon to inspect and adjust the GLSL shader code.</p>
              </div>
            </div>
          )}

        </div>

        {/* Live Code Drawer (when opened) */}
        {showCodeEditor && (
          <div className="lg:col-span-5 bg-[#121418] border border-[#23272F] rounded-lg flex flex-col h-[560px] overflow-hidden shadow-md">
            <div className="px-3.5 py-2.5 bg-[#16181D] border-b border-[#23272F] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs font-semibold text-slate-200">Live GLSL Source</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">WebGL 1/2 Preprocessed</span>
            </div>

            <div className="flex-1 p-2 bg-[#0A0C0E]">
              <textarea
                value={localGlslCode}
                onChange={(e) => setLocalGlslCode(e.target.value)}
                className="w-full h-full bg-transparent text-slate-200 font-mono text-[11px] leading-relaxed p-2 focus:outline-none resize-none selection:bg-indigo-500/30"
                spellCheck={false}
              />
            </div>

            <div className="px-3 py-2 bg-[#16181D] border-t border-[#23272F] flex items-center justify-between text-[11px] text-slate-400">
              <span>Edits compile automatically</span>
              <button
                onClick={() => setLocalGlslCode(initialGlslCode)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
              >
                Reset to Initial Code
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Interactive Material & Uniform Sliders Panel */}
      {showUniformControls && (
        <div className="bg-[#16181D] border border-[#23272F] rounded-lg p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#23272F] pb-2.5">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Uniform Properties & Material Parameters
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Bound to _Speed, _GlowPower, _CellScale, _BaseColor, etc.</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* Speed */}
            <div className="space-y-1.5 bg-[#0A0C0E] p-2.5 rounded border border-[#23272F]">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Animation Speed (_Speed)</span>
                <span className="font-mono text-indigo-400 font-semibold">{speed.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="3.0"
                step="0.05"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#23272F] rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Glow / Intensity */}
            <div className="space-y-1.5 bg-[#0A0C0E] p-2.5 rounded border border-[#23272F]">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Glow / Intensity (_GlowPower)</span>
                <span className="font-mono text-indigo-400 font-semibold">{glowPower.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="8.0"
                step="0.1"
                value={glowPower}
                onChange={(e) => setGlowPower(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#23272F] rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Cell / Frequency Scale */}
            <div className="space-y-1.5 bg-[#0A0C0E] p-2.5 rounded border border-[#23272F]">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Pattern Scale (_CellScale)</span>
                <span className="font-mono text-indigo-400 font-semibold">{cellScale.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="32.0"
                step="0.5"
                value={cellScale}
                onChange={(e) => setCellScale(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#23272F] rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Base Color Tint */}
            <div className="space-y-1.5 bg-[#0A0C0E] p-2.5 rounded border border-[#23272F]">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Base Tint (_BaseColor)</span>
                <span className="font-mono text-indigo-400 font-semibold">{baseColor}</span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={baseColor}
                  onChange={(e) => setBaseColor(e.target.value)}
                  className="w-8 h-6 bg-transparent border-0 rounded cursor-pointer"
                />
                <span className="text-[11px] font-mono text-slate-400">Click to pick tint</span>
              </div>
            </div>

            {/* Metallic */}
            <div className="space-y-1.5 bg-[#0A0C0E] p-2.5 rounded border border-[#23272F]">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Metallic (_Metallic)</span>
                <span className="font-mono text-indigo-400 font-semibold">{metallic.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.02"
                value={metallic}
                onChange={(e) => setMetallic(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#23272F] rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Roughness */}
            <div className="space-y-1.5 bg-[#0A0C0E] p-2.5 rounded border border-[#23272F]">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Roughness (_Roughness)</span>
                <span className="font-mono text-indigo-400 font-semibold">{roughness.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.02"
                max="1.0"
                step="0.02"
                value={roughness}
                onChange={(e) => setRoughness(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#23272F] rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Rim Power */}
            <div className="space-y-1.5 bg-[#0A0C0E] p-2.5 rounded border border-[#23272F]">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Fresnel Rim (_RimPower)</span>
                <span className="font-mono text-indigo-400 font-semibold">{rimPower.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="8.0"
                step="0.2"
                value={rimPower}
                onChange={(e) => setRimPower(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#23272F] rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Scanline Density */}
            <div className="space-y-1.5 bg-[#0A0C0E] p-2.5 rounded border border-[#23272F]">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Hologram Lines (_ScanlineDensity)</span>
                <span className="font-mono text-indigo-400 font-semibold">{scanlineDensity.toFixed(0)}</span>
              </div>
              <input
                type="range"
                min="5.0"
                max="120.0"
                step="1.0"
                value={scanlineDensity}
                onChange={(e) => setScanlineDensity(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#23272F] rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

// ==========================================
// Robust WebGL Preprocessor
// ==========================================

function prepareWebGLShaderSource(rawCode: string): string {
  // Strip existing #version directive if present to avoid WebGL version conflicts
  let cleanCode = rawCode.replace(/#version\s+[^\n]+/g, '');

  const hasMainImage = cleanCode.includes('mainImage');
  const hasVoidMain = cleanCode.includes('void main(') || cleanCode.includes('void main (');

  const header = `
    #ifdef GL_ES
    precision highp float;
    precision highp int;
    #endif

    // Preprocessor & Compatibility Macros
    #define iTime (_Time.y)
    #define iResolution (_ScreenParams.xyz)
    #define iTimeDelta (0.016666)
    #define iFrame (int(_Time.y * 60.0))
    #define iMouse (vec4(_ScreenParams.xy * 0.5, 0.0, 0.0))

    // HLSL to GLSL Fallback Types
    #define float2 vec2
    #define float3 vec3
    #define float4 vec4
    #define half float
    #define half2 vec2
    #define half3 vec3
    #define half4 vec4
    #define fixed float
    #define fixed2 vec2
    #define fixed3 vec3
    #define fixed4 vec4
    #define float4x4 mat4
    #define float3x3 mat3
    #define lerp(a, b, t) mix(a, b, t)
    #define frac(x) fract(x)
    #define saturate(x) clamp(x, 0.0, 1.0)
    #define atan2(y, x) atan(y, x)
    #define rsqrt(x) inversesqrt(x)
    #define fmod(x, y) mod(x, y)
    #define mul(a, b) ((a) * (b))

    // Built-in Standard Uniforms
    uniform vec4 _Time;
    uniform vec4 _ScreenParams;
    uniform vec4 _BaseColor;
    uniform float _Speed;
    uniform float _GlowPower;
    uniform float _CellScale;
    uniform float _Metallic;
    uniform float _Roughness;
    uniform float _RimPower;
    uniform float _ScanlineDensity;

    varying vec2 v_uv;
    varying vec3 v_normal;
    varying vec3 v_positionWS;
  `;

  if (hasMainImage && !hasVoidMain) {
    return `
      ${header}

      ${cleanCode}

      void main() {
        vec4 fragColor = vec4(0.0);
        vec2 fragCoord = v_uv * _ScreenParams.xy;
        mainImage(fragColor, fragCoord);
        gl_FragColor = fragColor;
      }
    `;
  }

  if (hasVoidMain) {
    return `
      ${header}

      ${cleanCode}
    `;
  }

  // Fallback if user just entered expressions
  return `
    ${header}

    ${cleanCode}

    void main() {
      gl_FragColor = vec4(v_uv, 0.5 + 0.5 * sin(_Time.y), 1.0);
    }
  `;
}

// ==========================================
// Geometry Generators & Matrix Math
// ==========================================

function generateGeometry(type: 'fullscreen' | 'sphere' | 'torus' | 'cube' | 'plane') {
  if (type === 'fullscreen' || type === 'plane') {
    return {
      positions: [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0],
      normals: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
      uvs: [0, 0, 1, 0, 1, 1, 0, 1],
      indices: [0, 1, 2, 0, 2, 3],
    };
  }

  if (type === 'cube') {
    return {
      positions: [
        // Front
        -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1,
        // Back
        -1, -1, -1, -1, 1, -1, 1, 1, -1, 1, -1, -1,
        // Top
        -1, 1, -1, -1, 1, 1, 1, 1, 1, 1, 1, -1,
        // Bottom
        -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1,
        // Right
        1, -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1,
        // Left
        -1, -1, -1, -1, -1, 1, -1, 1, 1, -1, 1, -1,
      ],
      normals: [
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
        0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
        0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
        0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
        1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
        -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
      ],
      uvs: [
        0, 0, 1, 0, 1, 1, 0, 1,
        0, 0, 1, 0, 1, 1, 0, 1,
        0, 0, 1, 0, 1, 1, 0, 1,
        0, 0, 1, 0, 1, 1, 0, 1,
        0, 0, 1, 0, 1, 1, 0, 1,
        0, 0, 1, 0, 1, 1, 0, 1,
      ],
      indices: [
        0, 1, 2, 0, 2, 3,
        4, 5, 6, 4, 6, 7,
        8, 9, 10, 8, 10, 11,
        12, 13, 14, 12, 14, 15,
        16, 17, 18, 16, 18, 19,
        20, 21, 22, 20, 22, 23,
      ],
    };
  }

  if (type === 'sphere') {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const latBands = 32;
    const longBands = 32;
    const radius = 1.25;

    for (let lat = 0; lat <= latBands; lat++) {
      const theta = (lat * Math.PI) / latBands;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      for (let lon = 0; lon <= longBands; lon++) {
        const phi = (lon * 2 * Math.PI) / longBands;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        const x = cosPhi * sinTheta;
        const y = cosTheta;
        const z = sinPhi * sinTheta;
        const u = 1 - lon / longBands;
        const v = 1 - lat / latBands;

        normals.push(x, y, z);
        uvs.push(u, v);
        positions.push(radius * x, radius * y, radius * z);
      }
    }

    for (let lat = 0; lat < latBands; lat++) {
      for (let lon = 0; lon < longBands; lon++) {
        const first = lat * (longBands + 1) + lon;
        const second = first + longBands + 1;
        indices.push(first, second, first + 1);
        indices.push(second, second + 1, first + 1);
      }
    }

    return { positions, normals, uvs, indices };
  }

  // Torus
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const radialSegments = 32;
  const tubularSegments = 32;
  const radius = 1.0;
  const tube = 0.42;

  for (let j = 0; j <= radialSegments; j++) {
    for (let i = 0; i <= tubularSegments; i++) {
      const u = (i / tubularSegments) * Math.PI * 2;
      const v = (j / radialSegments) * Math.PI * 2;

      const x = (radius + tube * Math.cos(v)) * Math.cos(u);
      const y = (radius + tube * Math.cos(v)) * Math.sin(u);
      const z = tube * Math.sin(v);

      const nx = Math.cos(v) * Math.cos(u);
      const ny = Math.cos(v) * Math.sin(u);
      const nz = Math.sin(v);

      positions.push(x, z, y);
      normals.push(nx, nz, ny);
      uvs.push(i / tubularSegments, j / radialSegments);
    }
  }

  for (let j = 1; j <= radialSegments; j++) {
    for (let i = 1; i <= tubularSegments; i++) {
      const a = (tubularSegments + 1) * j + i - 1;
      const b = (tubularSegments + 1) * (j - 1) + i - 1;
      const c = (tubularSegments + 1) * (j - 1) + i;
      const d = (tubularSegments + 1) * j + i;

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  return { positions, normals, uvs, indices };
}

function createIdentityMatrix(): Float32Array {
  const m = new Float32Array(16);
  m[0] = 1; m[5] = 1; m[10] = 1; m[15] = 1;
  return m;
}

function createPerspectiveMatrix(fovy: number, aspect: number, near: number, far: number): Float32Array {
  const f = 1.0 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  const m = new Float32Array(16);
  m[0] = f / aspect;
  m[5] = f;
  m[10] = (far + near) * nf;
  m[11] = -1;
  m[14] = 2 * far * near * nf;
  return m;
}

function createLookAtMatrix(eye: number[], center: number[], up: number[]): Float32Array {
  let z0 = eye[0] - center[0];
  let z1 = eye[1] - center[1];
  let z2 = eye[2] - center[2];
  let len = 1 / Math.hypot(z0, z1, z2);
  z0 *= len; z1 *= len; z2 *= len;

  let x0 = up[1] * z2 - up[2] * z1;
  let x1 = up[2] * z0 - up[0] * z2;
  let x2 = up[0] * z1 - up[1] * z0;
  len = 1 / Math.hypot(x0, x1, x2);
  x0 *= len; x1 *= len; x2 *= len;

  const y0 = z1 * x2 - z2 * x1;
  const y1 = z2 * x0 - z0 * x2;
  const y2 = z0 * x1 - z1 * x0;

  const m = new Float32Array(16);
  m[0] = x0; m[1] = y0; m[2] = z0; m[3] = 0;
  m[4] = x1; m[5] = y1; m[6] = z1; m[7] = 0;
  m[8] = x2; m[9] = y2; m[10] = z2; m[11] = 0;
  m[12] = -(x0 * eye[0] + x1 * eye[1] + x2 * eye[2]);
  m[13] = -(y0 * eye[0] + y1 * eye[1] + y2 * eye[2]);
  m[14] = -(z0 * eye[0] + z1 * eye[1] + z2 * eye[2]);
  m[15] = 1;
  return m;
}

function createRotationMatrix(rotX: number, rotY: number): Float32Array {
  const cosX = Math.cos(rotX);
  const sinX = Math.sin(rotX);
  const cosY = Math.cos(rotY);
  const sinY = Math.sin(rotY);

  const m = new Float32Array(16);
  m[0] = cosY;
  m[1] = sinX * sinY;
  m[2] = -cosX * sinY;
  m[3] = 0;

  m[4] = 0;
  m[5] = cosX;
  m[6] = sinX;
  m[7] = 0;

  m[8] = sinY;
  m[9] = -sinX * cosY;
  m[10] = cosX * cosY;
  m[11] = 0;

  m[12] = 0;
  m[13] = 0;
  m[14] = 0;
  m[15] = 1;
  return m;
}

function multiplyMatrices(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(16);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      out[j * 4 + i] =
        a[i] * b[j * 4] +
        a[4 + i] * b[j * 4 + 1] +
        a[8 + i] * b[j * 4 + 2] +
        a[12 + i] * b[j * 4 + 3];
    }
  }
  return out;
}
