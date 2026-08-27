import React, { useRef, useEffect, useState, useMemo } from 'react';
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
  Upload,
  FileCode,
  Zap,
  Cpu,
  Activity,
  Gauge,
  Monitor,
  Smartphone,
  HardDrive,
  Info,
  Check,
  FileUp,
  X
} from 'lucide-react';
import { TargetPipeline, ShaderPreset } from '../types';
import { SHADER_PRESETS } from '../data/shaderPresets';
import { transpileUrpToWebgl, ExtractedUniform } from '../lib/urpToWebglTranspiler';
import { estimateShaderPerformance } from '../lib/performanceEstimator';

interface ShaderPreviewCanvasProps {
  glslCode: string;
  targetPipeline: TargetPipeline;
  onSelectPreset?: (preset: ShaderPreset) => void;
}

// Built-in URP HLSL templates for quick upload/testing
const URP_SAMPLE_TEMPLATES = [
  {
    name: 'URP Lit PBR Surface (HLSL)',
    description: 'Unity 6 / 2022.3 URP Lit shader with CBUFFER_START(UnityPerMaterial), _BaseColor, _Metallic, and _Smoothness.',
    code: `Shader "Custom/URP_PreviewLitPBR"
{
    Properties
    {
        _BaseColor ("Base Color", Color) = (0.2, 0.6, 0.95, 1.0)
        _Metallic ("Metallic", Range(0, 1)) = 0.8
        _Smoothness ("Smoothness", Range(0, 1)) = 0.65
        _Speed ("Animation Speed", Float) = 1.0
        _GlowPower ("Glow / Rim Power", Range(0.5, 8.0)) = 2.5
    }
    SubShader
    {
        Tags { "RenderType" = "Opaque" "RenderPipeline" = "UniversalPipeline" }
        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode" = "UniversalForward" }
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            struct Attributes
            {
                float4 positionOS : POSITION;
                float3 normalOS : NORMAL;
                float2 uv : TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float3 normalWS : TEXCOORD0;
                float3 positionWS : TEXCOORD1;
                float2 uv : TEXCOORD2;
            };

            CBUFFER_START(UnityPerMaterial)
                half4 _BaseColor;
                half _Metallic;
                half _Smoothness;
                float _Speed;
                float _GlowPower;
            CBUFFER_END

            Varyings vert(Attributes input)
            {
                Varyings output;
                output.positionCS = TransformObjectToHClip(input.positionOS.xyz);
                output.normalWS = TransformObjectToWorldNormal(input.normalOS);
                output.positionWS = input.positionOS.xyz;
                output.uv = input.uv;
                return output;
            }

            half4 frag(Varyings input) : SV_Target
            {
                float3 N = normalize(input.normalWS);
                float3 V = normalize(-input.positionWS);
                float3 L = normalize(float3(cos(_Time.y * _Speed), 1.5, sin(_Time.y * _Speed)));
                
                float NdotL = max(0.0, dot(N, L));
                float fresnel = pow(1.0 - max(0.0, dot(N, V)), _GlowPower);
                
                half3 albedo = _BaseColor.rgb;
                half3 diffuse = albedo * NdotL;
                half3 rimGlow = half3(0.4, 0.8, 1.0) * fresnel;
                
                return half4(diffuse + rimGlow, _BaseColor.a);
            }
            ENDHLSL
        }
    }
}`
  },
  {
    name: 'URP Cyber Hologram Shield (HLSL)',
    description: 'Sci-fi energy shield with dynamic scanlines, fresnel rim lighting, and pulse interference.',
    code: `Shader "Custom/URP_HologramShield"
{
    Properties
    {
        _HoloColor ("Holo Tint", Color) = (0.0, 0.85, 1.0, 1.0)
        _RimPower ("Fresnel Rim", Range(0.5, 8.0)) = 3.2
        _ScanlineDensity ("Scanline Density", Range(5, 100)) = 45.0
        _Speed ("Pulse Speed", Float) = 2.0
    }
    SubShader
    {
        Tags { "RenderType" = "Transparent" "Queue" = "Transparent" "RenderPipeline" = "UniversalPipeline" }
        Pass
        {
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float3 normalWS : TEXCOORD0;
                float3 positionWS : TEXCOORD1;
                float2 uv : TEXCOORD2;
            };

            CBUFFER_START(UnityPerMaterial)
                half4 _HoloColor;
                float _RimPower;
                float _ScanlineDensity;
                float _Speed;
            CBUFFER_END

            half4 frag(Varyings input) : SV_Target
            {
                float3 N = normalize(input.normalWS);
                float3 V = normalize(-input.positionWS);
                float fresnel = pow(1.0 - max(0.0, dot(N, V)), _RimPower);
                
                float scanline = sin(input.uv.y * _ScanlineDensity + _Time.y * _Speed * 3.0) * 0.5 + 0.5;
                scanline = pow(scanline, 2.5);
                
                float3 rgb = _HoloColor.rgb * (fresnel * 2.0 + scanline * 0.8);
                float alpha = saturate(fresnel * 1.5 + scanline * 0.4);
                return half4(rgb, alpha);
            }
            ENDHLSL
        }
    }
}`
  }
];

export const ShaderPreviewCanvas: React.FC<ShaderPreviewCanvasProps> = ({
  glslCode: initialGlslCode,
  targetPipeline,
  onSelectPreset
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileUploadInputRef = useRef<HTMLInputElement | null>(null);

  // Filter presets to ONLY include reliable WebGL procedural & PBR shaders (exclude legacy built-in shaders)
  const previewCompatiblePresets = useMemo(() => {
    return SHADER_PRESETS.filter(p => p.category !== 'Built-in RP Legacy' && p.sourceFormat !== 'builtin_cg');
  }, []);

  // Active Code States
  const [localGlslCode, setLocalGlslCode] = useState<string>(() => {
    // If initial is a legacy shader, fallback to first pure WebGL preset
    if (initialGlslCode.includes('Shader "Custom/Legacy') || initialGlslCode.includes('CGPROGRAM')) {
      return previewCompatiblePresets[0]?.glslCode || '';
    }
    return initialGlslCode;
  });

  const [rawUploadedHlsl, setRawUploadedHlsl] = useState<string>('');
  const [editorMode, setEditorMode] = useState<'glsl' | 'urpHlsl'>('glsl');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [geometryType, setGeometryType] = useState<'fullscreen' | 'sphere' | 'torus' | 'cube' | 'plane'>('sphere');
  const [glError, setGlError] = useState<string | null>(null);
  const [fps, setFps] = useState<number>(60);
  const [frameTimeMs, setFrameTimeMs] = useState<number>(16.6);
  const [gpuDrawTimeMs, setGpuDrawTimeMs] = useState<number>(1.2);
  const [showCodeEditor, setShowCodeEditor] = useState<boolean>(false);
  const [showProfilerPanel, setShowProfilerPanel] = useState<boolean>(true);
  const [showUniformControls, setShowUniformControls] = useState<boolean>(true);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [showDivergenceModal, setShowDivergenceModal] = useState<boolean>(false);
  const [showDivergenceBanner, setShowDivergenceBanner] = useState<boolean>(true);

  // Dynamic Uniforms extracted from Custom URP HLSL or default set
  const [customUniforms, setCustomUniforms] = useState<ExtractedUniform[]>([]);
  const [uniformValues, setUniformValues] = useState<Record<string, any>>({
    _Speed: 1.0,
    _GlowPower: 2.5,
    _CellScale: 8.0,
    _Metallic: 0.85,
    _Roughness: 0.25,
    _Smoothness: 0.75,
    _RimPower: 3.0,
    _ScanlineDensity: 40.0,
    _BaseColor: '#3b82f6',
    _HoloColor: '#00d9ff'
  });

  // Synchronize when initialGlslCode changes from outside
  useEffect(() => {
    if (initialGlslCode && !initialGlslCode.includes('Shader "Custom/Legacy') && !initialGlslCode.includes('CGPROGRAM')) {
      setLocalGlslCode(initialGlslCode);
    }
  }, [initialGlslCode]);

  // Orbit camera state
  const rotRef = useRef<{ x: number; y: number }>({ x: 0.3, y: 0.4 });
  const zoomRef = useRef<number>(2.8);
  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const animFrameIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(performance.now());
  const lastTimeSnapshotRef = useRef<number>(0);

  // Convert hex color to vec4
  const hexToVec4 = (hex: string): [number, number, number, number] => {
    const cleanHex = String(hex).replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255 || 0.2;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255 || 0.5;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255 || 0.9;
    return [r, g, b, 1.0];
  };

  // Static Profiler Analysis computed from active shader code
  const profilerStats = useMemo(() => {
    const codeToAnalyze = rawUploadedHlsl || localGlslCode;
    const perf = estimateShaderPerformance(codeToAnalyze);

    // Calculate static instruction heuristics
    const aluMathCount = (codeToAnalyze.match(/(\+|\-|\*|\/|dot|cross|normalize|length|mix|lerp|clamp|saturate|pow|sin|cos|sqrt|inversesqrt)/g) || []).length;
    const trigCount = (codeToAnalyze.match(/(sin|cos|tan|asin|acos|atan|atan2|exp|log|pow)/g) || []).length;
    const textureSampleCount = (codeToAnalyze.match(/(texture2D|SAMPLE_TEXTURE2D|Sample|tex2D)/g) || []).length;
    const branchCount = (codeToAnalyze.match(/(if\s*\(|for\s*\(|while\s*\()/g) || []).length;

    // Precision distribution
    const fp16Matches = (codeToAnalyze.match(/\b(half|half2|half3|half4|fixed|fixed2|fixed3|fixed4|mediump)\b/g) || []).length;
    const fp32Matches = (codeToAnalyze.match(/\b(float|float2|float3|float4|highp)\b/g) || []).length;
    const totalPrecisionTokens = fp16Matches + fp32Matches || 1;
    const fp16Ratio = Math.round((fp16Matches / totalPrecisionTokens) * 100);
    const fp32Ratio = 100 - fp16Ratio;

    // Estimated GPU frame time latencies across platforms
    const baseGpuWeight = Math.max(1, aluMathCount * 0.015 + trigCount * 0.04 + textureSampleCount * 0.12 + branchCount * 0.08);
    const mobileLatencyMs = (baseGpuWeight * 0.45).toFixed(2);
    const midTierLatencyMs = (baseGpuWeight * 0.14).toFixed(2);
    const highTierLatencyMs = (baseGpuWeight * 0.03).toFixed(2);

    return {
      aluMathCount: Math.max(12, aluMathCount),
      trigCount,
      textureSampleCount,
      branchCount,
      fp16Ratio,
      fp32Ratio,
      srpScore: perf.srpBatcher.score,
      isSrpBatchable: perf.srpBatcher.isCompatible,
      cbufferSize: perf.srpBatcher.cbufferSize,
      cbufferPadding: perf.srpBatcher.cbufferAlignmentPadding,
      mobileLatencyMs,
      midTierLatencyMs,
      highTierLatencyMs,
      recommendations: perf.recommendations
    };
  }, [localGlslCode, rawUploadedHlsl]);

  // Handle Custom URP HLSL / Shader Upload
  const handleUploadCustomShader = (fileContent: string, fileName: string) => {
    try {
      setRawUploadedHlsl(fileContent);
      setEditorMode('urpHlsl');

      // Transpile URP HLSL to WebGL GLSL
      const transpiled = transpileUrpToWebgl(fileContent);
      setLocalGlslCode(transpiled.webglGlsl);

      if (transpiled.uniforms.length > 0) {
        setCustomUniforms(transpiled.uniforms);
        const newValues = { ...uniformValues };
        transpiled.uniforms.forEach(u => {
          newValues[u.name] = u.defaultValue;
        });
        setUniformValues(newValues);
      }

      setUploadSuccessMessage(`Successfully parsed "${fileName}" (${transpiled.uniforms.length} properties detected)`);
      setTimeout(() => setUploadSuccessMessage(null), 5000);
      setGlError(null);
    } catch (err: any) {
      setGlError(`Failed to parse custom URP shader: ${err.message || 'Unknown error'}`);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        handleUploadCustomShader(content, file.name);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Compile and run WebGL shader loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get WebGL Context
    const gl = (
      canvas.getContext('webgl2', { antialias: true, alpha: false, preserveDrawingBuffer: false }) ||
      canvas.getContext('webgl', { antialias: true, alpha: false, preserveDrawingBuffer: false }) ||
      canvas.getContext('experimental-webgl')
    ) as WebGLRenderingContext | null;

    if (!gl) {
      setGlError('WebGL is not supported or hardware acceleration is disabled in your browser.');
      return;
    }

    // Enable extensions
    gl.getExtension('OES_standard_derivatives');
    gl.getExtension('EXT_shader_texture_lod');

    setGlError(null);

    // Vertex Shader
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

    // Preprocess fragment shader
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

    // Matrix & System Uniform locations
    const uMvpLoc = gl.getUniformLocation(program, 'u_mvp');
    const uModelLoc = gl.getUniformLocation(program, 'u_model');
    const uCameraPosLoc = gl.getUniformLocation(program, 'u_cameraPos');
    const uTimeLoc = gl.getUniformLocation(program, '_Time');
    const uScreenParamsLoc = gl.getUniformLocation(program, '_ScreenParams');
    
    // Configurable Uniform locations map
    const uniformLocs: Record<string, WebGLUniformLocation | null> = {};
    const commonUniformNames = [
      '_BaseColor', '_HoloColor', '_WaterColor', '_Color',
      '_Speed', '_GlowPower', '_CellScale', '_Metallic', '_Roughness',
      '_Smoothness', '_RimPower', '_ScanlineDensity', '_Distortion', '_CausticSpeed'
    ];

    commonUniformNames.forEach(name => {
      uniformLocs[name] = gl.getUniformLocation(program!, name);
    });

    // Also register custom parsed uniforms
    customUniforms.forEach(u => {
      if (!uniformLocs[u.name]) {
        uniformLocs[u.name] = gl.getUniformLocation(program!, u.name);
      }
    });

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
      const frameDeltaMs = now - lastRenderTime;
      lastRenderTime = now;

      // Handle Auto-Rotation
      if (autoRotate && isPlaying && geometryType !== 'fullscreen') {
        rotRef.current.y += delta * 0.4;
      }

      // Handle Resize
      const displayWidth = Math.max(1, canvas.clientWidth || 800);
      const displayHeight = Math.max(1, canvas.clientHeight || 560);
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, displayWidth, displayHeight);
      }

      // Calculate time
      const speedVal = uniformValues._Speed || 1.0;
      if (isPlaying) {
        lastTimeSnapshotRef.current = ((now - startTimeRef.current) / 1000) * speedVal;
      }
      const elapsedSeconds = lastTimeSnapshotRef.current;

      const drawStart = performance.now();

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

      // Set Uniform Values
      Object.entries(uniformValues).forEach(([name, val]) => {
        const loc = uniformLocs[name];
        if (!loc) return;

        if (typeof val === 'string' && val.startsWith('#')) {
          const col = hexToVec4(val);
          gl.uniform4f(loc, col[0], col[1], col[2], col[3]);
        } else if (typeof val === 'number') {
          gl.uniform1f(loc, val);
        } else if (Array.isArray(val)) {
          if (val.length === 4) gl.uniform4f(loc, val[0], val[1], val[2], val[3]);
          else if (val.length === 3) gl.uniform3f(loc, val[0], val[1], val[2]);
          else if (val.length === 2) gl.uniform2f(loc, val[0], val[1]);
        }
      });

      // Draw Elements
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.drawElements(gl.TRIANGLES, meshData.indices.length, gl.UNSIGNED_SHORT, 0);

      const drawEnd = performance.now();
      setGpuDrawTimeMs(Math.max(0.2, Math.round((drawEnd - drawStart) * 100) / 100));

      // Calculate FPS & Frame Time
      frameCount++;
      if (now - lastFpsUpdate > 400) {
        const measuredFps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
        setFps(measuredFps);
        setFrameTimeMs(Math.round((1000 / Math.max(1, measuredFps)) * 10) / 10);
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
  }, [localGlslCode, geometryType, isPlaying, uniformValues, autoRotate, customUniforms]);

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

  // Mesh stats based on active geometry
  const meshStats = useMemo(() => {
    switch (geometryType) {
      case 'fullscreen':
      case 'plane':
        return { triangles: 2, vertices: 4, submeshes: 1 };
      case 'sphere':
        return { triangles: 2048, vertices: 1089, submeshes: 1 };
      case 'torus':
        return { triangles: 2048, vertices: 1089, submeshes: 1 };
      case 'cube':
        return { triangles: 12, vertices: 24, submeshes: 1 };
      default:
        return { triangles: 2048, vertices: 1089, submeshes: 1 };
    }
  }, [geometryType]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      
      {/* Hidden File Input for Custom URP HLSL Upload */}
      <input
        type="file"
        ref={fileUploadInputRef}
        onChange={handleFileInputChange}
        accept=".hlsl,.shader,.glsl,.frag,.vert,.txt"
        className="hidden"
      />

      {/* Workbench Header & Actions Toolbar */}
      <div className="bg-[#16181D] border border-[#23272F] rounded-lg p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Compass className="w-4 h-4 text-indigo-400" />
            <span>Interactive 3D WebGL Shader Workbench & Profiler</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time evaluation engine for procedural Unity URP HLSL shaders, 3D orbital mesh projection, uniform tuning, and static GPU instruction profiling.
          </p>
        </div>

        {/* Action Controls & Upload */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          
          {/* UPLOAD CUSTOM URP HLSL BUTTON */}
          <button
            id="btn-upload-urp-hlsl"
            onClick={() => fileUploadInputRef.current?.click()}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold shadow-sm transition cursor-pointer"
            title="Upload custom Unity .hlsl or .shader file to 3D Preview"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload URP HLSL</span>
          </button>

          {/* Quick Preset Selector (Only Real WebGL Shaders) */}
          <div className="relative">
            <select
              id="preset-quick-select"
              defaultValue=""
              onChange={(e) => {
                const found = previewCompatiblePresets.find(p => p.id === e.target.value);
                if (found) {
                  setLocalGlslCode(found.glslCode);
                  setRawUploadedHlsl('');
                  setEditorMode('glsl');
                  if (found.recommendedGeometry) {
                    setGeometryType(found.recommendedGeometry);
                  }
                  if (onSelectPreset) onSelectPreset(found);
                }
              }}
              className="bg-[#0A0C0E] text-xs text-slate-200 border border-[#2D343F] rounded px-2.5 py-1.5 pr-6 cursor-pointer focus:outline-none focus:border-indigo-500 appearance-none"
            >
              <option value="" disabled>Load Pure Shader Preset...</option>
              {previewCompatiblePresets.map(p => (
                <option key={p.id} value={p.id}>{p.title} ({p.category})</option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>

          {/* Geometry Select */}
          <div className="flex items-center bg-[#0A0C0E] rounded p-0.5 border border-[#2D343F] text-xs">
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
            <button
              id="mesh-quad"
              onClick={() => setGeometryType('fullscreen')}
              className={`px-2 py-1 rounded text-xs transition cursor-pointer ${geometryType === 'fullscreen' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
              title="Fullscreen Quad (2D Raymarching / Screen UVs)"
            >
              Quad 2D
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
              title="Toggle Auto Orbit Rotation"
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

          {/* Toggle Profiler & Telemetry Panel */}
          <button
            id="btn-toggle-profiler"
            onClick={() => setShowProfilerPanel(!showProfilerPanel)}
            className={`flex items-center space-x-1 px-2 py-1.5 rounded border text-xs font-medium transition cursor-pointer ${showProfilerPanel ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm' : 'bg-[#1E232B] border-[#2D343F] text-slate-400'}`}
            title="Toggle Live Profiler Statistics"
          >
            <Gauge className="w-3.5 h-3.5 text-indigo-300" />
            <span>Profiler</span>
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
            title="Toggle Live HLSL / GLSL Code Drawer"
          >
            <Code2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* URP to WebGL Transpilation & Approximate Results Banner */}
      {showDivergenceBanner && (
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-lg p-3.5 text-xs text-amber-200/95 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-300">
                Notice: 3D Preview operates via URP HLSL to WebGL GLSL Transpilation (Approximate Simulation)
              </span>
              <p className="text-[11px] text-amber-200/80 mt-0.5 leading-relaxed">
                This preview transpiles Unity Universal Render Pipeline (URP) shaders into browser WebGL. Because WebGL lacks native Unity engine features (Forward+ clustered lighting, depth prepasses, cascaded shadow maps, and custom SRP passes), visual and performance results are <strong>approximations and may produce false or divergent output</strong> compared to in-engine Unity rendering.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0 self-end sm:self-center">
            <button
              id="btn-open-divergence-modal"
              onClick={() => setShowDivergenceModal(true)}
              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded border border-amber-500/40 text-[11px] font-medium transition cursor-pointer flex items-center gap-1"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Why Results Differ</span>
            </button>
            <button
              id="btn-dismiss-divergence-banner"
              onClick={() => setShowDivergenceBanner(false)}
              className="p-1 text-amber-400 hover:text-amber-200 rounded transition cursor-pointer"
              title="Dismiss Notice"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Upload Success Banner */}
      {uploadSuccessMessage && (
        <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-lg p-3 text-xs text-emerald-200 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{uploadSuccessMessage}</span>
          </div>
          <button onClick={() => setUploadSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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

          {/* Top Right Emulation Badge */}
          <div className="absolute top-3 right-3 pointer-events-auto flex items-center gap-1.5">
            <button
              onClick={() => setShowDivergenceModal(true)}
              className="px-2.5 py-1 rounded bg-amber-950/80 hover:bg-amber-900/90 border border-amber-500/40 text-[10px] font-mono text-amber-200 backdrop-blur-sm flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              title="Click for details on URP-to-WebGL conversion approximations"
            >
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span>URP ➔ WebGL Transpiled (Approximate)</span>
              <Info className="w-2.5 h-2.5 text-amber-300" />
            </button>
          </div>

          {/* Live Telemetry HUD Overlay (Top Left) */}
          <div className="absolute top-3 left-3 pointer-events-none flex flex-col space-y-1.5">
            <div className="px-2.5 py-1 rounded bg-[#121418]/90 border border-[#23272F] text-[11px] font-mono text-slate-300 backdrop-blur-sm flex items-center gap-2 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>FPS: <strong className={fps >= 55 ? 'text-emerald-400' : fps >= 30 ? 'text-amber-400' : 'text-rose-400'}>{fps}</strong></span>
              <span className="text-slate-600">|</span>
              <span>Frame: <strong className="text-indigo-300">{frameTimeMs} ms</strong></span>
              <span className="text-slate-600">|</span>
              <span>GPU Draw: <strong className="text-slate-200">{gpuDrawTimeMs} ms</strong></span>
            </div>
            
            <div className="px-2.5 py-1 rounded bg-[#121418]/90 border border-[#23272F] text-[10px] font-mono text-slate-400 backdrop-blur-sm flex items-center gap-2">
              <span>Mesh: <strong className="text-indigo-300">{geometryType.toUpperCase()}</strong></span>
              <span className="text-slate-600">&bull;</span>
              <span>{meshStats.triangles.toLocaleString()} Tris</span>
              <span className="text-slate-600">&bull;</span>
              <span>{meshStats.vertices.toLocaleString()} Verts</span>
              <span className="text-slate-600">&bull;</span>
              <span>1 SRP Draw Call</span>
            </div>
          </div>

          {/* Error Banner */}
          {glError && (
            <div className="absolute inset-x-4 bottom-4 bg-rose-950/95 border border-rose-500/50 rounded-lg p-3.5 text-xs text-rose-200 backdrop-blur-md shadow-lg flex items-start space-x-2.5 z-20">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 overflow-auto max-h-36 flex-1">
                <div className="font-semibold text-rose-300">WebGL Shader Compilation / Transpilation Issue:</div>
                <pre className="font-mono text-[11px] whitespace-pre-wrap text-rose-200/90">{glError}</pre>
                <p className="text-[10px] text-rose-300/80">Click the Code Drawer icon to inspect and adjust the GLSL shader code.</p>
              </div>
            </div>
          )}

        </div>

        {/* Live Code Drawer & URP Importer (when opened) */}
        {showCodeEditor && (
          <div className="lg:col-span-5 bg-[#121418] border border-[#23272F] rounded-lg flex flex-col h-[560px] overflow-hidden shadow-md">
            
            {/* Drawer Header with Mode Tabs */}
            <div className="px-3.5 py-2.5 bg-[#16181D] border-b border-[#23272F] flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setEditorMode('glsl')}
                  className={`px-2 py-0.5 rounded text-xs font-semibold transition cursor-pointer ${editorMode === 'glsl' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Compiled WebGL
                </button>
                <button
                  onClick={() => setEditorMode('urpHlsl')}
                  className={`px-2 py-0.5 rounded text-xs font-semibold transition cursor-pointer ${editorMode === 'urpHlsl' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  URP HLSL Input
                </button>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Live Auto-Compile</span>
            </div>

            {/* Template Quick Loader inside Drawer */}
            <div className="px-3 py-1.5 bg-[#0E1013] border-b border-[#23272F] flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Sample Template:</span>
              <div className="flex items-center space-x-1">
                {URP_SAMPLE_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleUploadCustomShader(tmpl.code, tmpl.name)}
                    className="px-2 py-0.5 rounded bg-[#1A1D21] hover:bg-[#252A33] text-indigo-300 text-[10px] font-medium border border-[#2D343F] cursor-pointer transition"
                  >
                    {tmpl.name.split(' ')[1]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 p-2 bg-[#0A0C0E]">
              <textarea
                value={editorMode === 'urpHlsl' ? (rawUploadedHlsl || localGlslCode) : localGlslCode}
                onChange={(e) => {
                  const val = e.target.value;
                  if (editorMode === 'urpHlsl') {
                    setRawUploadedHlsl(val);
                    const transpiled = transpileUrpToWebgl(val);
                    setLocalGlslCode(transpiled.webglGlsl);
                    if (transpiled.uniforms.length > 0) {
                      setCustomUniforms(transpiled.uniforms);
                    }
                  } else {
                    setLocalGlslCode(val);
                  }
                }}
                className="w-full h-full bg-transparent text-slate-200 font-mono text-[11px] leading-relaxed p-2 focus:outline-none resize-none selection:bg-indigo-500/30"
                spellCheck={false}
                placeholder="// Paste or edit URP HLSL / GLSL shader code..."
              />
            </div>

            <div className="px-3 py-2 bg-[#16181D] border-t border-[#23272F] flex items-center justify-between text-[11px] text-slate-400">
              <span>Edits compile automatically</span>
              <button
                onClick={() => {
                  setLocalGlslCode(previewCompatiblePresets[0].glslCode);
                  setRawUploadedHlsl('');
                  setCustomUniforms([]);
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
              >
                Reset to Default Preset
              </button>
            </div>
          </div>
        )}

      </div>

      {/* COMPREHENSIVE PROFILER STATISTICS PANEL */}
      {showProfilerPanel && (
        <div className="bg-[#16181D] border border-[#23272F] rounded-lg p-5 shadow-sm space-y-4">
          
          {/* Profiler Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#23272F] pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Gauge className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                  Unity SRP & GPU Profiler Telemetry
                </h3>
                <p className="text-[11px] text-slate-400">
                  Static analysis & live GPU execution metrics for the active shader
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-xs font-mono">
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#0A0C0E] border border-[#23272F]">
                <span className="text-slate-400">SRP Batcher:</span>
                <span className={`font-bold ${profilerStats.isSrpBatchable ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {profilerStats.isSrpBatchable ? 'COMPLIANT' : 'PARTIAL'} ({profilerStats.srpScore}%)
                </span>
              </div>
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#0A0C0E] border border-[#23272F]">
                <span className="text-slate-400">CBUFFER:</span>
                <span className="text-indigo-300 font-bold">{profilerStats.cbufferSize} Bytes</span>
              </div>
            </div>
          </div>

          {/* Key Metric Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            
            {/* FPS & Target */}
            <div className="bg-[#0A0C0E] p-3 rounded border border-[#23272F] space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-medium">Real-Time FPS</span>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-lg font-bold text-emerald-400 font-mono">{fps}</span>
                <span className="text-[10px] text-slate-500">/ 60 Hz</span>
              </div>
              <div className="w-full bg-[#1A1D21] h-1 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full" style={{ width: `${Math.min(100, (fps / 60) * 100)}%` }} />
              </div>
            </div>

            {/* Frame Latency */}
            <div className="bg-[#0A0C0E] p-3 rounded border border-[#23272F] space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-medium">Frame Latency</span>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-lg font-bold text-indigo-300 font-mono">{frameTimeMs}</span>
                <span className="text-[10px] text-slate-500">ms</span>
              </div>
              <span className="text-[10px] text-slate-400 block truncate">GPU Draw: {gpuDrawTimeMs} ms</span>
            </div>

            {/* ALU Math Instructions */}
            <div className="bg-[#0A0C0E] p-3 rounded border border-[#23272F] space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-medium">ALU Math Ops</span>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-lg font-bold text-slate-100 font-mono">{profilerStats.aluMathCount}</span>
                <span className="text-[10px] text-slate-500">instr</span>
              </div>
              <span className="text-[10px] text-slate-400 block truncate">{profilerStats.trigCount} Trig/Exp ops</span>
            </div>

            {/* Texture Samplers */}
            <div className="bg-[#0A0C0E] p-3 rounded border border-[#23272F] space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-medium">Texture Fetches</span>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-lg font-bold text-slate-100 font-mono">{profilerStats.textureSampleCount}</span>
                <span className="text-[10px] text-slate-500">samplers</span>
              </div>
              <span className="text-[10px] text-slate-400 block truncate">Separated States</span>
            </div>

            {/* Geometry Complexity */}
            <div className="bg-[#0A0C0E] p-3 rounded border border-[#23272F] space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-medium">Mesh Triangles</span>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-lg font-bold text-indigo-300 font-mono">{meshStats.triangles.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500">tris</span>
              </div>
              <span className="text-[10px] text-slate-400 block truncate">{meshStats.vertices.toLocaleString()} Vertices</span>
            </div>

            {/* Precision Breakdown */}
            <div className="bg-[#0A0C0E] p-3 rounded border border-[#23272F] space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-medium">FP16 / Half Precision</span>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-lg font-bold text-emerald-400 font-mono">{profilerStats.fp16Ratio}%</span>
                <span className="text-[10px] text-slate-500">FP16</span>
              </div>
              <span className="text-[10px] text-slate-400 block truncate">{profilerStats.fp32Ratio}% FP32 Float</span>
            </div>

          </div>

          {/* Multi-Platform GPU Target Frame Time Estimator */}
          <div className="bg-[#0A0C0E] p-3.5 rounded border border-[#23272F] space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                Target Hardware Latency Estimations (1080p Fullscreen Fill):
              </span>
              <span className="text-[10px] font-mono text-slate-400">Theoretical GPU cost per frame</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Mobile Tier */}
              <div className="p-2.5 rounded bg-[#121418] border border-[#23272F] flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Smartphone className="w-4 h-4 text-slate-400" />
                  <div>
                    <div className="text-xs font-medium text-slate-200">Mobile Tier</div>
                    <div className="text-[10px] text-slate-400">Mali-G78 / Adreno 660</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold font-mono text-emerald-400">~{profilerStats.mobileLatencyMs} ms</span>
                  <div className="text-[9px] text-slate-500">{(1000 / Math.max(1, parseFloat(profilerStats.mobileLatencyMs) * 10)).toFixed(0)} FPS budget</div>
                </div>
              </div>

              {/* Mid-tier PC / Laptop */}
              <div className="p-2.5 rounded bg-[#121418] border border-[#23272F] flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Monitor className="w-4 h-4 text-slate-400" />
                  <div>
                    <div className="text-xs font-medium text-slate-200">Mid-Tier / Laptop</div>
                    <div className="text-[10px] text-slate-400">Apple Silicon / GTX 1650</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold font-mono text-indigo-300">~{profilerStats.midTierLatencyMs} ms</span>
                  <div className="text-[9px] text-slate-500">{(1000 / Math.max(1, parseFloat(profilerStats.midTierLatencyMs) * 10)).toFixed(0)} FPS budget</div>
                </div>
              </div>

              {/* High-end Desktop */}
              <div className="p-2.5 rounded bg-[#121418] border border-[#23272F] flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="text-xs font-medium text-slate-200">High-End / Console</div>
                    <div className="text-[10px] text-slate-400">RTX 4070 / PS5 @ 4K</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold font-mono text-amber-300">~{profilerStats.highTierLatencyMs} ms</span>
                  <div className="text-[9px] text-slate-500">{(1000 / Math.max(1, parseFloat(profilerStats.highTierLatencyMs) * 10)).toFixed(0)} FPS budget</div>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

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
            <span className="text-[11px] text-slate-400 font-mono">Bound to CBUFFER variables & GLSL uniforms</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* Render Custom Parsed Uniforms if present */}
            {customUniforms.length > 0 ? (
              customUniforms.map((u) => {
                const val = uniformValues[u.name] ?? u.defaultValue;
                if (u.type === 'color') {
                  return (
                    <div key={u.name} className="space-y-1.5 bg-[#0A0C0E] p-2.5 rounded border border-[#23272F]">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">{u.displayName} ({u.name})</span>
                        <span className="font-mono text-indigo-400 font-semibold">{val}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={val}
                          onChange={(e) => setUniformValues({ ...uniformValues, [u.name]: e.target.value })}
                          className="w-8 h-6 bg-transparent border-0 rounded cursor-pointer"
                        />
                        <span className="text-[11px] font-mono text-slate-400">Click to pick tint</span>
                      </div>
                    </div>
                  );
                }

                const min = u.min ?? 0.0;
                const max = u.max ?? 5.0;
                const step = u.step ?? 0.05;

                return (
                  <div key={u.name} className="space-y-1.5 bg-[#0A0C0E] p-2.5 rounded border border-[#23272F]">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">{u.displayName} ({u.name})</span>
                      <span className="font-mono text-indigo-400 font-semibold">{typeof val === 'number' ? val.toFixed(2) : val}</span>
                    </div>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      value={typeof val === 'number' ? val : parseFloat(val) || 0}
                      onChange={(e) => setUniformValues({ ...uniformValues, [u.name]: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-[#23272F] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                );
              })
            ) : (
              <>
                {/* Standard Speed */}
                <div className="space-y-1.5 bg-[#0A0C0E] p-2.5 rounded border border-[#23272F]">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Animation Speed (_Speed)</span>
                    <span className="font-mono text-indigo-400 font-semibold">{(uniformValues._Speed || 1.0).toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="3.0"
                    step="0.05"
                    value={uniformValues._Speed || 1.0}
                    onChange={(e) => setUniformValues({ ...uniformValues, _Speed: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-[#23272F] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Glow / Intensity */}
                <div className="space-y-1.5 bg-[#0A0C0E] p-2.5 rounded border border-[#23272F]">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Glow / Rim (_GlowPower)</span>
                    <span className="font-mono text-indigo-400 font-semibold">{(uniformValues._GlowPower || 2.5).toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="8.0"
                    step="0.1"
                    value={uniformValues._GlowPower || 2.5}
                    onChange={(e) => setUniformValues({ ...uniformValues, _GlowPower: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-[#23272F] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Cell / Frequency Scale */}
                <div className="space-y-1.5 bg-[#0A0C0E] p-2.5 rounded border border-[#23272F]">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Pattern Scale (_CellScale)</span>
                    <span className="font-mono text-indigo-400 font-semibold">{(uniformValues._CellScale || 8.0).toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="32.0"
                    step="0.5"
                    value={uniformValues._CellScale || 8.0}
                    onChange={(e) => setUniformValues({ ...uniformValues, _CellScale: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-[#23272F] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Base Color Tint */}
                <div className="space-y-1.5 bg-[#0A0C0E] p-2.5 rounded border border-[#23272F]">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Base Tint (_BaseColor)</span>
                    <span className="font-mono text-indigo-400 font-semibold">{uniformValues._BaseColor || '#3b82f6'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={uniformValues._BaseColor || '#3b82f6'}
                      onChange={(e) => setUniformValues({ ...uniformValues, _BaseColor: e.target.value })}
                      className="w-8 h-6 bg-transparent border-0 rounded cursor-pointer"
                    />
                    <span className="text-[11px] font-mono text-slate-400">Click to pick tint</span>
                  </div>
                </div>

                {/* Metallic */}
                <div className="space-y-1.5 bg-[#0A0C0E] p-2.5 rounded border border-[#23272F]">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Metallic (_Metallic)</span>
                    <span className="font-mono text-indigo-400 font-semibold">{(uniformValues._Metallic || 0.85).toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.02"
                    value={uniformValues._Metallic || 0.85}
                    onChange={(e) => setUniformValues({ ...uniformValues, _Metallic: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-[#23272F] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Roughness */}
                <div className="space-y-1.5 bg-[#0A0C0E] p-2.5 rounded border border-[#23272F]">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Roughness (_Roughness)</span>
                    <span className="font-mono text-indigo-400 font-semibold">{(uniformValues._Roughness || 0.25).toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.02"
                    max="1.0"
                    step="0.02"
                    value={uniformValues._Roughness || 0.25}
                    onChange={(e) => setUniformValues({ ...uniformValues, _Roughness: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-[#23272F] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Rim Power */}
                <div className="space-y-1.5 bg-[#0A0C0E] p-2.5 rounded border border-[#23272F]">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Fresnel Rim (_RimPower)</span>
                    <span className="font-mono text-indigo-400 font-semibold">{(uniformValues._RimPower || 3.0).toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="8.0"
                    step="0.2"
                    value={uniformValues._RimPower || 3.0}
                    onChange={(e) => setUniformValues({ ...uniformValues, _RimPower: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-[#23272F] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Scanline Density */}
                <div className="space-y-1.5 bg-[#0A0C0E] p-2.5 rounded border border-[#23272F]">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Hologram Lines (_ScanlineDensity)</span>
                    <span className="font-mono text-indigo-400 font-semibold">{(uniformValues._ScanlineDensity || 40.0).toFixed(0)}</span>
                  </div>
                  <input
                    type="range"
                    min="5.0"
                    max="120.0"
                    step="1.0"
                    value={uniformValues._ScanlineDensity || 40.0}
                    onChange={(e) => setUniformValues({ ...uniformValues, _ScanlineDensity: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-[#23272F] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* Why Results Differ / Transpilation Approximation Modal */}
      {showDivergenceModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#16181D] border border-[#2D343F] rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#23272F] pb-3">
              <div className="flex items-center space-x-2.5 text-amber-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-semibold text-slate-100">
                  URP ➔ WebGL Transpilation & Simulation Limits
                </h3>
              </div>
              <button
                onClick={() => setShowDivergenceModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-[#23272F] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Explanation Content */}
            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <div className="bg-amber-950/30 border border-amber-500/30 rounded-lg p-3 text-amber-200">
                <strong>Important:</strong> The 3D viewport evaluates shaders by client-side transpiling Unity Universal Render Pipeline (URP) HLSL into WebGL 1.0/2.0 GLSL. This allows rapid in-browser prototyping, but <strong>is an approximation and does not execute Unity's native C++ rendering pipeline</strong>.
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-100 uppercase tracking-wider text-indigo-400">
                  Key Causes of Visual & Performance Differences:
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  
                  {/* Lighting & Clustering */}
                  <div className="bg-[#0E1013] border border-[#23272F] p-3 rounded-lg space-y-1.5">
                    <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      <span>Lighting & Shadows</span>
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      Unity URP uses <strong>Forward+ clustered lighting grids</strong>, cascaded shadow maps, light cookies, and Spherical Harmonics (SH) probes. WebGL simulates a single directional light with an ambient term.
                    </p>
                  </div>

                  {/* Multi-Pass & SRP */}
                  <div className="bg-[#0E1013] border border-[#23272F] p-3 rounded-lg space-y-1.5">
                    <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      <span>SRP Render Passes</span>
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      SubShader passes such as <code>DepthOnly</code>, <code>ShadowCaster</code>, <code>DepthNormals</code>, and custom <code>ScriptableRenderPass</code> features are bypassed in single-draw WebGL mode.
                    </p>
                  </div>

                  {/* Textures & Samplers */}
                  <div className="bg-[#0E1013] border border-[#23272F] p-3 rounded-lg space-y-1.5">
                    <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      <span>Samplers & Textures</span>
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      <code>TEXTURE2D</code>, <code>SAMPLER(sampler_state)</code>, and texture arrays are polyfilled to standard 2D sampler lookups. Mip biases and anisotropic filtering match browser defaults.
                    </p>
                  </div>

                  {/* Post-Processing & HDR */}
                  <div className="bg-[#0E1013] border border-[#23272F] p-3 rounded-lg space-y-1.5">
                    <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      <span>HDR & Tonemapping</span>
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      Unity Volume stacks (ACES tonemapping, Bloom, Screen-Space Ambient Occlusion) are not active in WebGL. Colors render in standard sRGB without HDR backbuffer grading.
                    </p>
                  </div>

                </div>

                <div className="bg-[#0E1013] border border-[#23272F] p-3 rounded-lg space-y-1.5">
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                    <span>GPU Profiler Projections</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    The telemetry profiler calculates static instruction complexity (ALU arithmetic, trig/transcendental cycles, sampler counts, and register pressure). Real GPU frame times inside the Unity Player will depend on target hardware driver compiler optimizations, tile-based deferral (TBDR), and dynamic resolution scaling.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-[#23272F] pt-3 flex justify-end">
              <button
                onClick={() => setShowDivergenceModal(false)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold shadow-sm transition cursor-pointer"
              >
                I Understand
              </button>
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

  // Helper to check if a uniform is already declared in cleanCode
  const isUniformDeclared = (name: string): boolean => {
    const reg = new RegExp(`\\buniform\\s+[^;]*\\b${name}\\b`, 'i');
    return reg.test(cleanCode);
  };

  // Helper to check if a varying is already declared in cleanCode
  const isVaryingDeclared = (name: string): boolean => {
    const reg = new RegExp(`\\bvarying\\s+[^;]*\\b${name}\\b`, 'i');
    return reg.test(cleanCode);
  };

  // List of standard uniforms supported by the WebGL preview runtime
  const standardUniforms: Array<{ name: string; type: string }> = [
    { name: '_Time', type: 'vec4' },
    { name: '_ScreenParams', type: 'vec4' },
    { name: '_BaseColor', type: 'vec4' },
    { name: '_HoloColor', type: 'vec4' },
    { name: '_WaterColor', type: 'vec4' },
    { name: '_Color', type: 'vec4' },
    { name: '_Speed', type: 'float' },
    { name: '_GlowPower', type: 'float' },
    { name: '_CellScale', type: 'float' },
    { name: '_Metallic', type: 'float' },
    { name: '_Roughness', type: 'float' },
    { name: '_Smoothness', type: 'float' },
    { name: '_RimPower', type: 'float' },
    { name: '_ScanlineDensity', type: 'float' },
    { name: '_CausticSpeed', type: 'float' },
    { name: '_Distortion', type: 'float' },
    { name: '_AberrationSpread', type: 'float' },
    { name: '_VignetteStrength', type: 'float' },
  ];

  // Only inject uniforms that aren't already declared in the source code
  const injectedUniforms = standardUniforms
    .filter(u => !isUniformDeclared(u.name))
    .map(u => `uniform ${u.type} ${u.name};`)
    .join('\n    ');

  // List of standard vertex varyings
  const standardVaryings: Array<{ name: string; type: string }> = [
    { name: 'v_uv', type: 'vec2' },
    { name: 'v_normal', type: 'vec3' },
    { name: 'v_positionWS', type: 'vec3' },
  ];

  const injectedVaryings = standardVaryings
    .filter(v => !isVaryingDeclared(v.name))
    .map(v => `varying ${v.type} ${v.name};`)
    .join('\n    ');

  const header = `
    #ifdef GL_ES
    precision highp float;
    precision highp int;
    #endif

    // Preprocessor & Compatibility Macros with guards
    #ifndef iTime
    #define iTime (_Time.y)
    #endif
    #ifndef iResolution
    #define iResolution (_ScreenParams.xyz)
    #endif
    #ifndef iTimeDelta
    #define iTimeDelta (0.016666)
    #endif
    #ifndef iFrame
    #define iFrame (int(_Time.y * 60.0))
    #endif
    #ifndef iMouse
    #define iMouse (vec4(_ScreenParams.xy * 0.5, 0.0, 0.0))
    #endif

    // HLSL to GLSL Fallback Types & Functions with guards
    #ifndef float2
    #define float2 vec2
    #endif
    #ifndef float3
    #define float3 vec3
    #endif
    #ifndef float4
    #define float4 vec4
    #endif
    #ifndef half
    #define half float
    #endif
    #ifndef half2
    #define half2 vec2
    #endif
    #ifndef half3
    #define half3 vec3
    #endif
    #ifndef half4
    #define half4 vec4
    #endif
    #ifndef fixed
    #define fixed float
    #endif
    #ifndef fixed2
    #define fixed2 vec2
    #endif
    #ifndef fixed3
    #define fixed3 vec3
    #endif
    #ifndef fixed4
    #define fixed4 vec4
    #endif
    #ifndef float4x4
    #define float4x4 mat4
    #endif
    #ifndef float3x3
    #define float3x3 mat3
    #endif
    #ifndef lerp
    #define lerp(a, b, t) mix(a, b, t)
    #endif
    #ifndef frac
    #define frac(x) fract(x)
    #endif
    #ifndef saturate
    #define saturate(x) clamp(x, 0.0, 1.0)
    #endif
    #ifndef atan2
    #define atan2(y, x) atan(y, x)
    #endif
    #ifndef rsqrt
    #define rsqrt(x) inversesqrt(x)
    #endif
    #ifndef fmod
    #define fmod(x, y) mod(x, y)
    #endif
    #ifndef mul
    #define mul(a, b) ((a) * (b))
    #endif

    // Dynamically Injected Non-Duplicate Standard Uniforms
    ${injectedUniforms}

    // Dynamically Injected Non-Duplicate Varyings
    ${injectedVaryings}
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
