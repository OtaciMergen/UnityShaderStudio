export interface ConversionMappingItem {
  id: string;
  sourceName: string;
  sourceCategory: 'Math Function' | 'Texture & Sampler' | 'Matrix & Coordinate' | 'Built-in Variable & Uniform' | 'Light & Shadow' | 'Preprocessor & Macro' | 'Type & Semantic';
  sourceLanguage: 'GLSL' | 'Built-in CG / ShaderLab' | 'Both';
  urpEquivalent: string;
  urpInclude?: string;
  urpFieldOrSignature: string;
  description: string;
  exampleBefore: string;
  exampleAfter: string;
  notes: string;
  docTopicId?: string;
  glslDocRef?: {
    title: string;
    url?: string;
    section?: string;
  };
  urpDocRef?: {
    title: string;
    url?: string;
    section?: string;
  };
  academicOrOfficialRef?: {
    title: string;
    type: 'Unity Manual' | 'SIGGRAPH Paper' | 'Academic Paper' | 'Engineering Blog';
    author?: string;
    url?: string;
  };
}

export const CONVERSION_MAPPINGS: ConversionMappingItem[] = [
  // --- GLSL -> URP Functions & Fields ---
  {
    id: 'glsl_mix_lerp',
    sourceName: 'mix(x, y, a)',
    sourceCategory: 'Math Function',
    sourceLanguage: 'GLSL',
    urpEquivalent: 'lerp(x, y, a)',
    urpFieldOrSignature: 'T lerp(T x, T y, T a)',
    description: 'Linear interpolation between two scalars or vectors with identical component count: x * (1 - a) + y * a.',
    exampleBefore: 'vec3 color = mix(colA, colB, factor);',
    exampleAfter: 'float3 color = lerp(colA, colB, factor);',
    notes: 'Hardware accelerated in 1 cycle via fused multiply-add (FMA) on all modern GPUs (Metal, Vulkan, DX12).',
    docTopicId: 'glsl_urp_intrinsics',
    glslDocRef: {
      title: 'OpenGL GLSL 4.60 Specification §8.3: mix()',
      url: 'https://registry.khronos.org/OpenGL-Refpages/gl4/html/mix.xhtml',
      section: 'Section 8.3 Common Functions'
    },
    urpDocRef: {
      title: 'HLSL Core Intrinsics: lerp()',
      url: 'https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-lerp',
      section: 'HLSL Intrinsic Functions'
    }
  },
  {
    id: 'glsl_fract_frac',
    sourceName: 'fract(x)',
    sourceCategory: 'Math Function',
    sourceLanguage: 'GLSL',
    urpEquivalent: 'frac(x)',
    urpFieldOrSignature: 'T frac(T x)',
    description: 'Computes fractional part: x - floor(x).',
    exampleBefore: 'vec2 gridUV = fract(uv * 10.0);',
    exampleAfter: 'float2 gridUV = frac(uv * 10.0);',
    notes: 'Essential for procedural UV grids, noise sampling, and hash functions.',
    docTopicId: 'glsl_urp_intrinsics',
    glslDocRef: {
      title: 'OpenGL GLSL 4.60 Specification §8.3: fract()',
      url: 'https://registry.khronos.org/OpenGL-Refpages/gl4/html/fract.xhtml',
      section: 'Section 8.3 Common Functions'
    },
    urpDocRef: {
      title: 'HLSL Core Intrinsics: frac()',
      url: 'https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-frac',
      section: 'HLSL Intrinsic Functions'
    }
  },
  {
    id: 'glsl_mod_fmod',
    sourceName: 'mod(x, y)',
    sourceCategory: 'Math Function',
    sourceLanguage: 'GLSL',
    urpEquivalent: 'x - y * floor(x / y) or frac(x / y) * y',
    urpFieldOrSignature: 'T fmod(T x, T y) [Note: Truncates towards 0!]',
    description: 'Calculates the modulus or remainder. Critical difference: GLSL uses Euclidean floor(), while HLSL fmod() truncates toward zero.',
    exampleBefore: 'float periodic = mod(time, 2.0);',
    exampleAfter: 'float periodic = time - 2.0 * floor(time / 2.0); // Exact GLSL mod',
    notes: 'Using HLSL fmod() directly on negative coordinates will cause mirroring artifacts.',
    docTopicId: 'glsl_urp_intrinsics',
    glslDocRef: {
      title: 'OpenGL GLSL Reference: mod()',
      url: 'https://registry.khronos.org/OpenGL-Refpages/gl4/html/mod.xhtml',
      section: 'Section 8.3 Common Functions'
    },
    urpDocRef: {
      title: 'HLSL Intrinsic: fmod() vs Euclidean Modulo',
      url: 'https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-fmod',
      section: 'HLSL Math Functions'
    },
    academicOrOfficialRef: {
      title: 'The Book of Shaders: Algorithmic Drawing (Patricio Gonzalez Vivo & Jen Lowe)',
      type: 'Engineering Blog',
      author: 'Patricio Gonzalez Vivo',
      url: 'https://thebookofshaders.com/05/'
    }
  },
  {
    id: 'glsl_inversesqrt_rsqrt',
    sourceName: 'inversesqrt(x)',
    sourceCategory: 'Math Function',
    sourceLanguage: 'GLSL',
    urpEquivalent: 'rsqrt(x)',
    urpFieldOrSignature: 'T rsqrt(T x)',
    description: 'Calculates reciprocal square root 1.0 / sqrt(x).',
    exampleBefore: 'vec3 n = v * inversesqrt(dot(v, v));',
    exampleAfter: 'float3 n = v * rsqrt(dot(v, v));',
    notes: 'Implemented via dedicated fast GPU hardware instructions (e.g. RSQ / VRCP).',
    docTopicId: 'glsl_urp_intrinsics',
    glslDocRef: {
      title: 'OpenGL GLSL 4.60 Specification: inversesqrt()',
      url: 'https://registry.khronos.org/OpenGL-Refpages/gl4/html/inversesqrt.xhtml',
      section: 'Section 8.2 Exponential Functions'
    },
    urpDocRef: {
      title: 'HLSL Core Intrinsics: rsqrt()',
      url: 'https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-rsqrt',
      section: 'HLSL Intrinsic Functions'
    }
  },
  {
    id: 'glsl_atan_atan2',
    sourceName: 'atan(y, x)',
    sourceCategory: 'Math Function',
    sourceLanguage: 'GLSL',
    urpEquivalent: 'atan2(y, x)',
    urpFieldOrSignature: 'T atan2(T y, T x)',
    description: 'Calculates 2-argument arc-tangent returning angle in radians in range [-PI, PI].',
    exampleBefore: 'float angle = atan(uv.y, uv.x);',
    exampleAfter: 'float angle = atan2(uv.y, uv.x);',
    notes: 'GLSL supports overloaded atan(y, x) or atan(y_over_x). In HLSL, 2 arguments require atan2(y, x).',
    docTopicId: 'glsl_urp_intrinsics',
    glslDocRef: {
      title: 'OpenGL GLSL 4.60 Specification: atan()',
      url: 'https://registry.khronos.org/OpenGL-Refpages/gl4/html/atan.xhtml',
      section: 'Section 8.1 Angle and Trigonometry Functions'
    },
    urpDocRef: {
      title: 'HLSL Core Intrinsics: atan2()',
      url: 'https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-atan2',
      section: 'HLSL Trigonometry Functions'
    }
  },
  {
    id: 'glsl_matrixCompMult',
    sourceName: 'matrixCompMult(A, B)',
    sourceCategory: 'Matrix & Coordinate',
    sourceLanguage: 'GLSL',
    urpEquivalent: 'A * B',
    urpFieldOrSignature: 'matrix * matrix',
    description: 'Component-wise multiplication of two matrices. (In HLSL, operator * is component-wise; mul() is algebraic multiplication).',
    exampleBefore: 'mat4 result = matrixCompMult(m1, m2);',
    exampleAfter: 'float4x4 result = m1 * m2;',
    notes: 'Algebraic matrix product in GLSL is m1 * m2, whereas in HLSL it is mul(m1, m2). Component-wise is inverted!',
    docTopicId: 'matrix_and_vector_math',
    glslDocRef: {
      title: 'OpenGL GLSL 4.60 Specification: matrixCompMult()',
      url: 'https://registry.khronos.org/OpenGL-Refpages/gl4/html/matrixCompMult.xhtml',
      section: 'Section 8.6 Matrix Functions'
    },
    urpDocRef: {
      title: 'HLSL Matrix Operations & mul()',
      url: 'https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-mul',
      section: 'HLSL Matrix Multiplication'
    }
  },
  {
    id: 'glsl_dFdx_ddx',
    sourceName: 'dFdx(p), dFdy(p)',
    sourceCategory: 'Math Function',
    sourceLanguage: 'GLSL',
    urpEquivalent: 'ddx(p), ddy(p)',
    urpFieldOrSignature: 'T ddx(T p), T ddy(T p)',
    description: 'Screen-space partial derivatives computed using 2x2 GPU quad pixels (finite differencing).',
    exampleBefore: 'vec3 normal = normalize(cross(dFdx(pos), dFdy(pos)));',
    exampleAfter: 'float3 normal = normalize(cross(ddx(pos), ddy(pos)));',
    notes: 'Used to compute procedural flat normals, screen-space anti-aliasing (fwidth), and MIP levels without tangent vectors.',
    docTopicId: 'glsl_urp_intrinsics',
    glslDocRef: {
      title: 'OpenGL GLSL 4.60 Specification: dFdx() / dFdy()',
      url: 'https://registry.khronos.org/OpenGL-Refpages/gl4/html/dFdx.xhtml',
      section: 'Section 8.12 Derivative Functions'
    },
    urpDocRef: {
      title: 'HLSL Core Intrinsics: ddx() / ddy()',
      url: 'https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-ddx',
      section: 'HLSL Screen Space Derivatives'
    }
  },
  {
    id: 'glsl_texture_Sample',
    sourceName: 'texture(sampler2D, uv)',
    sourceCategory: 'Texture & Sampler',
    sourceLanguage: 'GLSL',
    urpEquivalent: 'tex.Sample(sampler_tex, uv)',
    urpFieldOrSignature: 'float4 Texture2D::Sample(SamplerState s, float2 uv)',
    description: 'Samples a 2D texture at normalized UV coordinates with hardware filtering.',
    exampleBefore: 'uniform sampler2D _MainTex;\nvec4 c = texture(_MainTex, uv);',
    exampleAfter: 'Texture2D _BaseMap;\nSamplerState sampler_BaseMap;\nfloat4 c = _BaseMap.Sample(sampler_BaseMap, uv);',
    notes: 'Unity URP strictly decouples Texture2D memory from SamplerState descriptors to conserve bind slots.',
    docTopicId: 'texture_sampler_separation',
    glslDocRef: {
      title: 'OpenGL GLSL 4.60 Specification: texture()',
      url: 'https://registry.khronos.org/OpenGL-Refpages/gl4/html/texture.xhtml',
      section: 'Section 8.7 Texture Lookup Functions'
    },
    urpDocRef: {
      title: 'Unity URP Sampler State Macros (Core.hlsl)',
      url: 'https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@latest/index.html?subfolder=/manual/writing-custom-shaders-urp.html',
      section: 'Texture2D & SamplerState Declarations'
    }
  },
  {
    id: 'glsl_textureLod_SampleLevel',
    sourceName: 'textureLod(sampler2D, uv, lod)',
    sourceCategory: 'Texture & Sampler',
    sourceLanguage: 'GLSL',
    urpEquivalent: 'tex.SampleLevel(sampler_tex, uv, lod)',
    urpFieldOrSignature: 'float4 Texture2D::SampleLevel(SamplerState s, float2 uv, float lod)',
    description: 'Samples a texture at an explicit MIP map level without screen quad derivative calculations.',
    exampleBefore: 'vec4 rough = textureLod(_EnvMap, uv, roughness * 8.0);',
    exampleAfter: 'float4 rough = _EnvMap.SampleLevel(sampler_EnvMap, uv, roughness * 8.0);',
    notes: 'Safe for vertex shaders and dynamic loop branches where screen-space derivatives (ddx/ddy) are undefined.',
    docTopicId: 'texture_sampler_separation',
    glslDocRef: {
      title: 'OpenGL GLSL 4.60 Specification: textureLod()',
      url: 'https://registry.khronos.org/OpenGL-Refpages/gl4/html/textureLod.xhtml',
      section: 'Section 8.7 Texture Lookup Functions'
    },
    urpDocRef: {
      title: 'SAMPLE_TEXTURE2D_LOD Macro in URP Core.hlsl',
      url: 'https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@latest/index.html?subfolder=/manual/writing-custom-shaders-urp.html',
      section: 'Explicit LOD Sampling'
    }
  },

  // --- Built-in CG / Legacy -> URP Functions & Fields ---
  {
    id: 'builtin_transform_obj_to_clip',
    sourceName: 'UnityObjectToClipPos(pos)',
    sourceCategory: 'Matrix & Coordinate',
    sourceLanguage: 'Built-in CG / ShaderLab',
    urpEquivalent: 'TransformObjectToHClip(positionOS)',
    urpInclude: 'Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl',
    urpFieldOrSignature: 'float4 TransformObjectToHClip(float3 positionOS)',
    description: 'Transforms object-space vertex position to homogeneous clip-space (SV_POSITION) with GPU instancing support.',
    exampleBefore: 'o.pos = UnityObjectToClipPos(v.vertex);',
    exampleAfter: 'output.positionCS = TransformObjectToHClip(input.positionOS.xyz);',
    notes: 'Separates world and view-projection transforms to enable SRP Batcher and GPU Instancer caching.',
    docTopicId: 'srp_batcher_cbuffer',
    urpDocRef: {
      title: 'Unity Universal Render Pipeline: Core.hlsl Coordinate Transforms',
      url: 'https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@latest/index.html?subfolder=/manual/writing-custom-shaders-urp.html',
      section: 'TransformObjectToHClip'
    },
    academicOrOfficialRef: {
      title: 'SRP Batcher: Speed up your rendering (Unity Technologies Blog)',
      type: 'Engineering Blog',
      author: 'Unity Graphics Team',
      url: 'https://blog.unity.com/engine-platform/srp-batcher-speed-up-your-rendering'
    }
  },
  {
    id: 'builtin_transform_obj_to_world',
    sourceName: 'mul(unity_ObjectToWorld, v.vertex)',
    sourceCategory: 'Matrix & Coordinate',
    sourceLanguage: 'Built-in CG / ShaderLab',
    urpEquivalent: 'TransformObjectToWorld(positionOS)',
    urpInclude: 'Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl',
    urpFieldOrSignature: 'float3 TransformObjectToWorld(float3 positionOS)',
    description: 'Transforms vertex or point from local object space into 3D world space.',
    exampleBefore: 'float3 worldPos = mul(unity_ObjectToWorld, v.vertex).xyz;',
    exampleAfter: 'float3 worldPos = TransformObjectToWorld(input.positionOS.xyz);',
    notes: 'Directly reading unity_ObjectToWorld in SRP can break GPU instancing macros.',
    docTopicId: 'matrix_and_vector_math',
    urpDocRef: {
      title: 'URP Space Transformation Functions',
      url: 'https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@latest/index.html?subfolder=/manual/writing-custom-shaders-urp.html',
      section: 'TransformObjectToWorld'
    }
  },
  {
    id: 'builtin_transform_obj_to_world_normal',
    sourceName: 'UnityObjectToWorldNormal(v.normal)',
    sourceCategory: 'Matrix & Coordinate',
    sourceLanguage: 'Built-in CG / ShaderLab',
    urpEquivalent: 'TransformObjectToWorldNormal(normalOS)',
    urpInclude: 'Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl',
    urpFieldOrSignature: 'float3 TransformObjectToWorldNormal(float3 normalOS, bool doNormalize = true)',
    description: 'Transforms surface normal vector from object space to world space using inverse-transpose matrix.',
    exampleBefore: 'o.worldNormal = UnityObjectToWorldNormal(v.normal);',
    exampleAfter: 'output.normalWS = TransformObjectToWorldNormal(input.normalOS);',
    notes: 'Prevents non-uniform scaling distortions on normals.',
    docTopicId: 'matrix_and_vector_math',
    urpDocRef: {
      title: 'URP Normal Transformation Functions',
      url: 'https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@latest/index.html?subfolder=/manual/writing-custom-shaders-urp.html',
      section: 'TransformObjectToWorldNormal'
    }
  },
  {
    id: 'builtin_transform_obj_to_world_dir',
    sourceName: 'UnityObjectToWorldDir(v.tangent.xyz)',
    sourceCategory: 'Matrix & Coordinate',
    sourceLanguage: 'Built-in CG / ShaderLab',
    urpEquivalent: 'TransformObjectToWorldDir(dirOS)',
    urpInclude: 'Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl',
    urpFieldOrSignature: 'float3 TransformObjectToWorldDir(float3 dirOS, bool doNormalize = true)',
    description: 'Transforms direction vector (tangent, bitangent) from object space to world space.',
    exampleBefore: 'o.tangentWS = UnityObjectToWorldDir(v.tangent.xyz);',
    exampleAfter: 'output.tangentWS = TransformObjectToWorldDir(input.tangentOS.xyz);',
    notes: 'Maintains unit length normalization.',
    docTopicId: 'matrix_and_vector_math',
    urpDocRef: {
      title: 'URP Direction Transformations',
      url: 'https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@latest/index.html?subfolder=/manual/writing-custom-shaders-urp.html',
      section: 'TransformObjectToWorldDir'
    }
  },
  {
    id: 'builtin_transform_world_to_hclip',
    sourceName: 'mul(UNITY_MATRIX_VP, float4(posWS, 1.0))',
    sourceCategory: 'Matrix & Coordinate',
    sourceLanguage: 'Built-in CG / ShaderLab',
    urpEquivalent: 'TransformWorldToHClip(positionWS)',
    urpInclude: 'Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl',
    urpFieldOrSignature: 'float4 TransformWorldToHClip(float3 positionWS)',
    description: 'Transforms 3D world space coordinate into homogeneous clip space.',
    exampleBefore: 'float4 clipPos = mul(UNITY_MATRIX_VP, float4(posWS, 1.0));',
    exampleAfter: 'float4 clipPos = TransformWorldToHClip(posWS);',
    notes: 'Includes GPU stereo eye pass matrix selection for VR/XR single-pass instancing.',
    docTopicId: 'clip_space_depth',
    urpDocRef: {
      title: 'URP Clip Space & Reversed-Z Pipeline',
      url: 'https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@latest/index.html?subfolder=/manual/writing-custom-shaders-urp.html',
      section: 'TransformWorldToHClip'
    }
  },
  {
    id: 'builtin_world_space_camera_pos',
    sourceName: '_WorldSpaceCameraPos',
    sourceCategory: 'Built-in Variable & Uniform',
    sourceLanguage: 'Built-in CG / ShaderLab',
    urpEquivalent: 'GetCameraPositionWS() or _WorldSpaceCameraPos',
    urpInclude: 'Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl',
    urpFieldOrSignature: 'float3 GetCameraPositionWS()',
    description: 'World-space 3D coordinates of current rendering camera. (In XR / VR, GetCameraPositionWS() returns per-eye center).',
    exampleBefore: 'float3 viewDir = normalize(_WorldSpaceCameraPos - worldPos);',
    exampleAfter: 'float3 viewDir = normalize(GetCameraPositionWS() - worldPos); // or GetWorldSpaceNormalizeViewDir(worldPos)',
    notes: 'Use GetWorldSpaceNormalizeViewDir(worldPos) for an optimized 1-line view vector calculation.',
    docTopicId: 'builtin_to_urp_migration',
    urpDocRef: {
      title: 'Unity URP Camera Functions (Core.hlsl)',
      url: 'https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@latest/index.html?subfolder=/manual/writing-custom-shaders-urp.html',
      section: 'GetCameraPositionWS'
    }
  },
  {
    id: 'builtin_view_direction',
    sourceName: 'WorldSpaceViewDir(v.vertex) / ObjSpaceViewDir()',
    sourceCategory: 'Matrix & Coordinate',
    sourceLanguage: 'Built-in CG / ShaderLab',
    urpEquivalent: 'GetWorldSpaceViewDir(positionWS) / GetWorldSpaceNormalizeViewDir(positionWS)',
    urpInclude: 'Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl',
    urpFieldOrSignature: 'float3 GetWorldSpaceNormalizeViewDir(float3 positionWS)',
    description: 'Computes normalized vector pointing from surface point towards camera position in world space.',
    exampleBefore: 'float3 viewDir = normalize(UnityWorldSpaceViewDir(worldPos));',
    exampleAfter: 'float3 viewDir = GetWorldSpaceNormalizeViewDir(input.positionWS);',
    notes: 'Handles Reversed-Z near clipping plane precision correctly.',
    docTopicId: 'matrix_and_vector_math',
    urpDocRef: {
      title: 'URP View Direction Helper Functions',
      url: 'https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@latest/index.html?subfolder=/manual/writing-custom-shaders-urp.html',
      section: 'GetWorldSpaceNormalizeViewDir'
    }
  },
  {
    id: 'builtin_tex2d_sample',
    sourceName: 'tex2D(_MainTex, i.uv)',
    sourceCategory: 'Texture & Sampler',
    sourceLanguage: 'Built-in CG / ShaderLab',
    urpEquivalent: 'SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, input.uv)',
    urpInclude: 'Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl',
    urpFieldOrSignature: 'SAMPLE_TEXTURE2D(textureName, samplerName, coord2)',
    description: 'Cross-platform texture sampling macro supporting D3D, Vulkan, Metal, GLES, and WebGL.',
    exampleBefore: 'sampler2D _MainTex;\nfixed4 col = tex2D(_MainTex, i.uv);',
    exampleAfter: 'TEXTURE2D(_BaseMap);\nSAMPLER(sampler_BaseMap);\nhalf4 col = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, input.uv);',
    notes: 'Using SAMPLE_TEXTURE2D allows sharing samplers (e.g. sampler_LinearClamp) across multiple textures to save hardware texture units.',
    docTopicId: 'texture_sampler_separation',
    urpDocRef: {
      title: 'Separated Sampler States in SRP',
      url: 'https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@latest/index.html?subfolder=/manual/writing-custom-shaders-urp.html',
      section: 'SAMPLE_TEXTURE2D'
    }
  },
  {
    id: 'builtin_tex2dlod_sample',
    sourceName: 'tex2Dlod(_MainTex, float4(uv, 0, lod))',
    sourceCategory: 'Texture & Sampler',
    sourceLanguage: 'Built-in CG / ShaderLab',
    urpEquivalent: 'SAMPLE_TEXTURE2D_LOD(_BaseMap, sampler_BaseMap, uv, lod)',
    urpInclude: 'Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl',
    urpFieldOrSignature: 'SAMPLE_TEXTURE2D_LOD(textureName, samplerName, coord2, lod)',
    description: 'Explicit MIP-level texture sampling macro.',
    exampleBefore: 'fixed4 col = tex2Dlod(_MainTex, float4(i.uv, 0, 2.0));',
    exampleAfter: 'half4 col = SAMPLE_TEXTURE2D_LOD(_BaseMap, sampler_BaseMap, input.uv, 2.0);',
    notes: 'Safe for vertex programs and raymarching loops.',
    docTopicId: 'texture_sampler_separation',
    urpDocRef: {
      title: 'SAMPLE_TEXTURE2D_LOD in URP Core.hlsl',
      url: 'https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@latest/index.html?subfolder=/manual/writing-custom-shaders-urp.html',
      section: 'Explicit Texture LOD'
    }
  },
  {
    id: 'builtin_tex2dproj_sample',
    sourceName: 'tex2Dproj(_MainTex, uvProj)',
    sourceCategory: 'Texture & Sampler',
    sourceLanguage: 'Built-in CG / ShaderLab',
    urpEquivalent: 'SAMPLE_TEXTURE2D_PROJ(_BaseMap, sampler_BaseMap, uvProj)',
    urpInclude: 'Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl',
    urpFieldOrSignature: 'SAMPLE_TEXTURE2D_PROJ(textureName, samplerName, coord4)',
    description: 'Projective texture sampling (divides uv.xy by uv.w prior to lookup).',
    exampleBefore: 'fixed4 col = tex2Dproj(_GrabTexture, i.screenPos);',
    exampleAfter: 'half4 col = SAMPLE_TEXTURE2D_PROJ(_CameraOpaqueTexture, sampler_CameraOpaqueTexture, input.screenPos);',
    notes: 'Used for screen refraction, water caustics, and decal projections.',
    docTopicId: 'texture_sampler_separation',
    urpDocRef: {
      title: 'Projective Texture Sampling in URP',
      url: 'https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@latest/index.html?subfolder=/manual/writing-custom-shaders-urp.html',
      section: 'SAMPLE_TEXTURE2D_PROJ'
    }
  },
  {
    id: 'builtin_tex2d_st_scale_offset',
    sourceName: 'TRANSFORM_TEX(v.uv, _MainTex)',
    sourceCategory: 'Texture & Sampler',
    sourceLanguage: 'Built-in CG / ShaderLab',
    urpEquivalent: 'TRANSFORM_TEX(input.uv, _BaseMap)',
    urpInclude: 'Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl',
    urpFieldOrSignature: 'TRANSFORM_TEX(texCoord, name) -> (texCoord.xy * name##_ST.xy + name##_ST.zw)',
    description: 'Applies material inspector UV Tiling (xy) and Offset (zw) to coordinates.',
    exampleBefore: 'o.uv = TRANSFORM_TEX(v.uv, _MainTex);',
    exampleAfter: 'output.uv = TRANSFORM_TEX(input.uv, _BaseMap);',
    notes: '_BaseMap_ST float4 must reside inside CBUFFER_START(UnityPerMaterial) to preserve SRP Batcher batching.',
    docTopicId: 'srp_batcher_cbuffer',
    urpDocRef: {
      title: 'TRANSFORM_TEX & UnityPerMaterial CBUFFER',
      url: 'https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@latest/index.html?subfolder=/manual/writing-custom-shaders-urp.html',
      section: 'Tiling & Offset'
    }
  },

  // --- Lighting & Shadow Systems ---
  {
    id: 'builtin_light_pos0',
    sourceName: '_WorldSpaceLightPos0',
    sourceCategory: 'Light & Shadow',
    sourceLanguage: 'Built-in CG / ShaderLab',
    urpEquivalent: 'GetMainLight().direction / _MainLightPosition.xyz',
    urpInclude: 'Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl',
    urpFieldOrSignature: 'Light GetMainLight() -> struct Light { float3 direction; half3 color; half distanceAttenuation; half shadowAttenuation; }',
    description: 'Main directional light direction in world space. (In Built-in, w=0 for directional, w=1 for point).',
    exampleBefore: 'float3 lightDir = normalize(_WorldSpaceLightPos0.xyz);',
    exampleAfter: 'Light mainLight = GetMainLight();\nfloat3 lightDir = mainLight.direction;',
    notes: 'URP Single-pass Forward handles up to 8 additional lights (point/spot) per object without multi-pass drawcall spikes.',
    docTopicId: 'urp_lighting_shadows',
    urpDocRef: {
      title: 'Universal Render Pipeline: Real-Time Lighting Architecture',
      url: 'https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@latest/index.html?subfolder=/manual/urp-shaders/urp-shader-built-in-lighting.html',
      section: 'GetMainLight'
    },
    academicOrOfficialRef: {
      title: 'Universal Render Pipeline: Real-Time Lighting Architecture',
      type: 'Unity Manual',
      url: 'https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@latest/index.html?subfolder=/manual/lighting-in-universal-render-pipeline.html'
    }
  },
  {
    id: 'builtin_light_color0',
    sourceName: '_LightColor0',
    sourceCategory: 'Light & Shadow',
    sourceLanguage: 'Built-in CG / ShaderLab',
    urpEquivalent: 'GetMainLight().color / _MainLightColor.rgb',
    urpInclude: 'Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl',
    urpFieldOrSignature: 'half3 Light::color',
    description: 'Linear RGB color and intensity of the primary directional light.',
    exampleBefore: 'fixed3 lightCol = _LightColor0.rgb;',
    exampleAfter: 'Light mainLight = GetMainLight();\nhalf3 lightColor = mainLight.color;',
    notes: 'In URP, light.color already contains light intensity multiplication in linear HDR color space.',
    docTopicId: 'urp_lighting_shadows',
    urpDocRef: {
      title: 'Light.color in Universal Render Pipeline',
      url: 'https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@latest/index.html?subfolder=/manual/urp-shaders/urp-shader-built-in-lighting.html',
      section: 'Main Light Color'
    }
  },
  {
    id: 'builtin_shadow_attenuation',
    sourceName: 'UNITY_SHADOW_ATTENUATION(i, i.worldPos)',
    sourceCategory: 'Light & Shadow',
    sourceLanguage: 'Built-in CG / ShaderLab',
    urpEquivalent: 'GetMainLight(shadowCoord).shadowAttenuation',
    urpInclude: 'Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl',
    urpFieldOrSignature: 'Light GetMainLight(float4 shadowCoord) -> light.shadowAttenuation',
    description: 'Cascaded shadow map sampling with soft shadow filtering (PCF) and screen-space shadow support.',
    exampleBefore: 'UNITY_LIGHTING_COORDS(3, 4)\nfixed atten = UNITY_SHADOW_ATTENUATION(i, i.worldPos);',
    exampleAfter: 'float4 shadowCoord = TransformWorldToShadowCoord(input.positionWS);\nLight light = GetMainLight(shadowCoord);\nhalf shadowAtten = light.shadowAttenuation;',
    notes: 'Requires #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE.',
    docTopicId: 'urp_lighting_shadows',
    urpDocRef: {
      title: 'URP Real-Time Cascaded Shadows (Shadows.hlsl)',
      url: 'https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@latest/index.html?subfolder=/manual/shadows-in-urp.html',
      section: 'TransformWorldToShadowCoord'
    }
  },
  {
    id: 'builtin_additional_lights',
    sourceName: 'Built-in ForwardAdd Pass (Multi-pass)',
    sourceCategory: 'Light & Shadow',
    sourceLanguage: 'Built-in CG / ShaderLab',
    urpEquivalent: 'GetAdditionalLightsCount() & GetAdditionalLight(i, posWS)',
    urpInclude: 'Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl',
    urpFieldOrSignature: 'uint GetAdditionalLightsCount(); Light GetAdditionalLight(uint i, float3 positionWS);',
    description: 'Single-pass loop evaluating clustered or per-object spot & point lights in a single shader pass.',
    exampleBefore: '// Built-in required an entire second ForwardAdd pass with Blend One One',
    exampleAfter: 'uint pixelLightCount = GetAdditionalLightsCount();\nfor (uint i = 0u; i < pixelLightCount; ++i) {\n    Light addLight = GetAdditionalLight(i, input.positionWS);\n    diffuse += LightingLambert(addLight.color, addLight.direction, normalWS);\n}',
    notes: 'Reduces draw call count by N times for scenes with multiple point and spot lights.',
    docTopicId: 'urp_lighting_shadows',
    urpDocRef: {
      title: 'Clustered Additional Lights in URP',
      url: 'https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@latest/index.html?subfolder=/manual/urp-shaders/urp-shader-built-in-lighting.html',
      section: 'GetAdditionalLight'
    }
  },

  // --- Depth, Fog & Screen-Space ---
  {
    id: 'builtin_camera_depth_texture',
    sourceName: '_CameraDepthTexture (tex2Dproj)',
    sourceCategory: 'Built-in Variable & Uniform',
    sourceLanguage: 'Built-in CG / ShaderLab',
    urpEquivalent: 'SampleSceneDepth(uv) / LoadSceneDepth(pixelCoord)',
    urpInclude: 'Packages/com.unity.render-pipelines.universal/ShaderLibrary/DeclareDepthTexture.hlsl',
    urpFieldOrSignature: 'float SampleSceneDepth(float2 uv)',
    description: 'Samples the scene depth buffer in screen space. Handles API-specific depth ranges automatically.',
    exampleBefore: 'float sceneZ = LinearEyeDepth(SAMPLE_DEPTH_TEXTURE_PROJ(_CameraDepthTexture, UNITY_PROJ_COORD(i.screenPos)));',
    exampleAfter: 'float rawDepth = SampleSceneDepth(input.positionCS.xy / _ScaledScreenParams.xy);\nfloat linearEyeDepth = LinearEyeDepth(rawDepth, _ZBufferParams);',
    notes: 'In URP, depth texture usage requires enabling Depth Texture on the Universal Render Pipeline Asset.',
    docTopicId: 'clip_space_depth',
    urpDocRef: {
      title: 'DeclareDepthTexture.hlsl in URP',
      url: 'https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@latest/index.html?subfolder=/manual/writing-custom-shaders-urp.html',
      section: 'SampleSceneDepth'
    }
  },
  {
    id: 'builtin_screen_color_grab',
    sourceName: 'GrabPass { "_GrabTexture" }',
    sourceCategory: 'Built-in Variable & Uniform',
    sourceLanguage: 'Built-in CG / ShaderLab',
    urpEquivalent: 'SampleSceneColor(uv)',
    urpInclude: 'Packages/com.unity.render-pipelines.universal/ShaderLibrary/DeclareOpaqueTexture.hlsl',
    urpFieldOrSignature: 'half4 SampleSceneColor(float2 uv)',
    description: 'Samples the opaque scene color behind transparent glass, water, or heat haze.',
    exampleBefore: 'sampler2D _GrabTexture;\nfixed4 grabCol = tex2Dproj(_GrabTexture, i.grabPos);',
    exampleAfter: 'float2 screenUV = input.positionCS.xy / _ScaledScreenParams.xy;\nhalf3 sceneColor = SampleSceneColor(screenUV + refractionOffset);',
    notes: 'GrabPass is completely deprecated in URP. Use Opaque Color Texture (Camera Opaque Texture) which renders once per frame with 0 runtime GPU stalls.',
    docTopicId: 'builtin_to_urp_migration',
    urpDocRef: {
      title: 'DeclareOpaqueTexture.hlsl & Camera Opaque Texture',
      url: 'https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@latest/index.html?subfolder=/manual/camera-opaque-texture.html',
      section: 'SampleSceneColor'
    },
    academicOrOfficialRef: {
      title: 'Migrating from Built-in GrabPass to URP Opaque Texture',
      type: 'Unity Manual',
      url: 'https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@latest/index.html?subfolder=/manual/camera-opaque-texture.html'
    }
  },
  {
    id: 'builtin_fog_mix',
    sourceName: 'UNITY_TRANSFER_FOG(o, o.vertex) & UNITY_APPLY_FOG(i.fogCoord, col)',
    sourceCategory: 'Built-in Variable & Uniform',
    sourceLanguage: 'Built-in CG / ShaderLab',
    urpEquivalent: 'ComputeFogFactor(positionCS.z) & MixFog(color.rgb, fogFactor)',
    urpInclude: 'Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl',
    urpFieldOrSignature: 'float ComputeFogFactor(float z); half3 MixFog(half3 fragColor, float fogFactor);',
    description: 'Computes fog attenuation in vertex pass and blends global atmospheric scene fog in fragment pass.',
    exampleBefore: '// Vertex: UNITY_TRANSFER_FOG(o, o.pos);\n// Fragment: UNITY_APPLY_FOG(i.fogCoord, col);',
    exampleAfter: '// Vertex: output.fogFactor = ComputeFogFactor(output.positionCS.z);\n// Fragment: finalCol.rgb = MixFog(finalCol.rgb, input.fogFactor);',
    notes: 'Automatically supports Linear, Exponential, and Exp2 fog settings without manual branching.',
    docTopicId: 'builtin_to_urp_migration',
    urpDocRef: {
      title: 'Fog Computation in URP Core.hlsl',
      url: 'https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@latest/index.html?subfolder=/manual/writing-custom-shaders-urp.html',
      section: 'ComputeFogFactor & MixFog'
    }
  },
  {
    id: 'builtin_unity_time',
    sourceName: '_Time / _SinTime / _CosTime',
    sourceCategory: 'Built-in Variable & Uniform',
    sourceLanguage: 'Both',
    urpEquivalent: '_Time (float4(t/20, t, t*2, t*3))',
    urpInclude: 'Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl',
    urpFieldOrSignature: 'float4 _Time; float4 _SinTime; float4 _CosTime; float4 unity_DeltaTime;',
    description: 'Global elapsed frame time vectors provided by Unity engine.',
    exampleBefore: 'float t = _Time.y;',
    exampleAfter: 'float t = _Time.y; // identical in URP Core.hlsl',
    notes: 'Provided in global constant buffer (UnityPerFrame / UnityPerCamera). Do NOT redefine inside UnityPerMaterial.',
    docTopicId: 'srp_batcher_cbuffer',
    urpDocRef: {
      title: 'Global Shader Variables & Per-Frame Constants',
      url: 'https://docs.unity3d.com/Manual/SL-UnityShaderVariables.html',
      section: 'Unity Time Variables'
    }
  },
  {
    id: 'builtin_screen_params',
    sourceName: '_ScreenParams',
    sourceCategory: 'Built-in Variable & Uniform',
    sourceLanguage: 'Both',
    urpEquivalent: '_ScreenParams & _ScaledScreenParams',
    urpInclude: 'Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl',
    urpFieldOrSignature: 'float4 _ScreenParams; float4 _ScaledScreenParams;',
    description: 'Screen dimensions: x = width, y = height, z = 1 + 1/width, w = 1 + 1/height.',
    exampleBefore: 'vec2 uv = gl_FragCoord.xy / _ScreenParams.xy;',
    exampleAfter: 'float2 uv = input.positionCS.xy / _ScaledScreenParams.xy;',
    notes: '_ScaledScreenParams accounts for Dynamic Resolution Scaling (DRS) and render scale factors (FSR/DLSS).',
    docTopicId: 'clip_space_depth',
    urpDocRef: {
      title: 'Dynamic Resolution & Screen Parameters in URP',
      url: 'https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@latest/index.html?subfolder=/manual/writing-custom-shaders-urp.html',
      section: 'Screen & Viewport Variables'
    }
  },

  // --- Types & Semantics ---
  {
    id: 'type_vec_float',
    sourceName: 'vec2, vec3, vec4, mat2, mat3, mat4',
    sourceCategory: 'Type & Semantic',
    sourceLanguage: 'GLSL',
    urpEquivalent: 'float2 / half2, float3 / half3, float4 / half4, float2x2, float3x3, float4x4',
    urpFieldOrSignature: 'typedef vector<float, N> floatN; typedef vector<half, N> halfN;',
    description: 'Vector and matrix data types in HLSL.',
    exampleBefore: 'vec3 color = vec3(1.0, 0.5, 0.0);',
    exampleAfter: 'half3 color = half3(1.0, 0.5, 0.0); // half on mobile saves 50% ALU register space',
    notes: 'Always use half / half3 / half4 for color, lighting, and normal calculations on mobile (Apple Silicon, Mali, Adreno).',
    docTopicId: 'glsl_urp_intrinsics',
    glslDocRef: {
      title: 'OpenGL GLSL 4.60 Specification §4.1: Basic Types',
      url: 'https://registry.khronos.org/OpenGL/specs/gl/GLSLangSpec.4.60.pdf',
      section: 'Section 4.1 Data Types'
    },
    urpDocRef: {
      title: 'HLSL Data Types (scalar, vector, matrix, half)',
      url: 'https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-data-types',
      section: 'HLSL Data Types'
    }
  },
  {
    id: 'semantic_gl_fragcoord_sv_position',
    sourceName: 'gl_FragCoord',
    sourceCategory: 'Type & Semantic',
    sourceLanguage: 'GLSL',
    urpEquivalent: 'input.positionCS : SV_POSITION (pixel coords in frag)',
    urpFieldOrSignature: 'float4 positionCS : SV_POSITION',
    description: 'Window pixel coordinate (xy in pixel units, z in depth [0,1], w in 1/w).',
    exampleBefore: 'vec2 p = gl_FragCoord.xy;',
    exampleAfter: 'float2 p = input.positionCS.xy; // SV_POSITION in fragment input',
    notes: 'In fragment stage, SV_POSITION coordinates are pixel coordinates in range [0, ScreenWidth/Height].',
    docTopicId: 'clip_space_depth',
    glslDocRef: {
      title: 'OpenGL GLSL Specification: gl_FragCoord',
      url: 'https://registry.khronos.org/OpenGL-Refpages/gl4/html/gl_FragCoord.xhtml',
      section: 'Section 7.1 Built-in Variables'
    },
    urpDocRef: {
      title: 'HLSL SV_POSITION Semantic & Clip Space',
      url: 'https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-semantics',
      section: 'System-Value Semantics'
    }
  },
  {
    id: 'semantic_gl_fragcolor_sv_target',
    sourceName: 'gl_FragColor / out vec4 fragColor',
    sourceCategory: 'Type & Semantic',
    sourceLanguage: 'GLSL',
    urpEquivalent: ': SV_Target / SV_Target0',
    urpFieldOrSignature: 'half4 frag(Varyings input) : SV_Target',
    description: 'Fragment shader render target output semantic.',
    exampleBefore: 'void main() { gl_FragColor = vec4(1.0); }',
    exampleAfter: 'half4 frag(Varyings input) : SV_Target {\n    return half4(1, 1, 1, 1);\n}',
    notes: 'Multiple Render Targets (MRT) use : SV_Target0, : SV_Target1, etc.',
    docTopicId: 'builtin_to_urp_migration',
    urpDocRef: {
      title: 'SV_Target Semantic & Multiple Render Targets (MRT)',
      url: 'https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/dx-graphics-hlsl-semantics',
      section: 'SV_Target Output Semantics'
    }
  },
  {
    id: 'pragma_multi_compile_local',
    sourceName: '#pragma multi_compile / #pragma shader_feature',
    sourceCategory: 'Preprocessor & Macro',
    sourceLanguage: 'Built-in CG / ShaderLab',
    urpEquivalent: '#pragma multi_compile_local / #pragma shader_feature_local',
    urpFieldOrSignature: '#pragma multi_compile_local _ _FEATURE_ON',
    description: 'Restricts keyword scope to the specific shader rather than consuming global 384/4096 keyword budget.',
    exampleBefore: '#pragma shader_feature _METALLIC_ON',
    exampleAfter: '#pragma shader_feature_local _METALLIC_ON',
    notes: 'Prevents Unity Project Keyword Explosion and drops build time substantially.',
    docTopicId: 'builtin_to_urp_migration',
    urpDocRef: {
      title: 'Shader Keywords & Stripping in Unity SRP (Unity Documentation)',
      url: 'https://docs.unity3d.com/Manual/shader-keywords.html',
      section: 'Local vs Global Keywords'
    },
    academicOrOfficialRef: {
      title: 'Shader Keywords & Stripping in Unity SRP (Unity Documentation)',
      type: 'Unity Manual',
      url: 'https://docs.unity3d.com/Manual/shader-keywords.html'
    }
  }
];
