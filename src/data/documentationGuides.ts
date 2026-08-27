import { DocChapter } from '../types';

export const DOCUMENTATION_CHAPTERS: DocChapter[] = [
  {
    id: 'srp_batcher_cbuffer',
    title: 'SRP Batcher Mastery & CBUFFER Memory Layout',
    category: 'Architecture',
    readTime: '6 min read',
    summary: 'How the Scriptable Render Pipeline Batcher eliminates CPU draw call overhead and the strict 16-byte constant buffer alignment rules required for URP & HDRP.',
    tags: ['SRP Batcher', 'CBUFFER', 'URP', 'HDRP', 'Performance'],
    contentMarkdown: `### What is the SRP Batcher?
In legacy Unity Built-in pipeline and traditional OpenGL, changing material properties between draw calls incurs high CPU-to-GPU state switching overhead.

The **SRP Batcher** speeds up CPU rendering by caching constant buffers in GPU VRAM and binding persistent buffers once per frame, rendering thousands of objects with different material values in a single mega-batch.

---

### Strict Rules for SRP Batcher Compatibility
To be 100% SRP Batcher compliant, your shader **MUST** adhere to three non-negotiable rules:

1. **All per-material properties must be inside a constant buffer named \`UnityPerMaterial\`**:
\`\`\`hlsl
CBUFFER_START(UnityPerMaterial)
    float4 _BaseColor;
    float4 _SpecColor;
    float  _Smoothness;
    float  _Metallic;
    float  _BumpScale;
CBUFFER_END
\`\`\`

2. **Every property defined in the ShaderLab \`Properties { ... }\` block must exist inside \`UnityPerMaterial\`** (except for \`Texture2D\` and \`SamplerState\` objects, which live in texture descriptor tables).

3. **Memory Packing & 16-Byte Alignment**:
HLSL constant buffers pack variables into 16-byte (4-float) vectors.
- A \`float4\` consumes 1 full 16-byte slot.
- Two \`float2\` variables pack cleanly into 1 slot.
- Four single \`float\` variables pack into 1 slot.
- Placing a \`float\` followed by a \`float4\` forces 12 bytes of padding! Always sort variables by descending size (\`float4\` -> \`float3\` -> \`float2\` -> \`float\`).

---

### Verification in Unity Inspector
When inspecting a material with an SRP-compliant shader in Unity Editor, look at the bottom of the Inspector:
\`\`\`
[✓] SRP Batcher: Compatible
\`\`\`
If you see \`[!] SRP Batcher: Not compatible - Property _MyProp is not inside UnityPerMaterial\`, check your CBUFFER declaration!`,
  },
  {
    id: 'clip_space_depth',
    title: 'Clip Space, Depth Buffer & Coordinate Systems (OpenGL vs Unity SRP)',
    category: 'Coordinate Systems',
    readTime: '8 min read',
    summary: 'Deep dive into NDC Z-depth range [0, 1] vs [-1, 1], reversed floating-point Z buffers, and texture coordinate flip handling.',
    tags: ['Clip Space', 'Depth', 'NDC', 'Reversed-Z', 'OpenGL'],
    contentMarkdown: `### Normalized Device Coordinates (NDC) Depth Differences
One of the most frequent sources of bugs when porting OpenGL GLSL to Unity is the fundamental difference in Normalized Device Coordinates (NDC) clip-space Z depth:

| Graphic API | NDC Depth Range (Z) | Near Plane Z | Far Plane Z |
| :--- | :--- | :--- | :--- |
| **OpenGL (GLSL)** | \`[-1.0, 1.0]\` | \`-1.0\` | \`1.0\` |
| **DirectX 11/12 (HLSL)** | \`[0.0, 1.0]\` | \`0.0\` | \`1.0\` |
| **Metal / Vulkan / Unity SRP** | \`[0.0, 1.0]\` | \`1.0\` (Reversed-Z) | \`0.0\` (Reversed-Z) |

---

### Why Unity Uses Reversed-Z (\`[1.0, 0.0]\`)
On modern platforms (PC, PS5, Xbox Series, iOS Metal, Android Vulkan), Unity uses **Reversed Floating-Point Z-Buffers**.
- Near Plane = \`1.0\`
- Far Plane = \`0.0\`

Because IEEE 754 floating-point numbers have much higher bit precision near \`0.0\`, reversing the depth buffer concentrates floating-point precision where geometry is distant, almost completely eliminating Z-fighting on large landscapes!

---

### Core Coordinate Functions in URP (\`Core.hlsl\`)
Instead of manually multiplying matrices like \`u_MVP * vec4(pos, 1.0)\`, always use Unity SRP intrinsics:

\`\`\`hlsl
// Transform position directly from object space to homogeneous clip space
VertexPositionInputs posInputs = GetVertexPositionInputs(input.positionOS.xyz);
output.positionCS = posInputs.positionCS;

// Get normalized [0, 1] screen UV for post-processing and depth sampling
float2 screenUV = GetNormalizedScreenSpaceUV(output.positionCS);
\`\`\`

---

### Texture V-Coordinate Inversion (\`UNITY_UV_STARTS_AT_TOP\`)
- **OpenGL**: \`UV (0, 0)\` is located at the **bottom-left** corner.
- **Direct3D / Metal / Vulkan**: \`UV (0, 0)\` is located at the **top-left** corner.

When rendering into render textures in Unity, the image can appear upside-down unless guarded:
\`\`\`hlsl
#if UNITY_UV_STARTS_AT_TOP
if (_ProjectionParams.x < 0.0)
    screenUV.y = 1.0 - screenUV.y;
#endif
\`\`\``,
  },
  {
    id: 'texture_sampler_separation',
    title: 'Texture2D & SamplerState Separation',
    category: 'Texturing',
    readTime: '5 min read',
    summary: 'Why modern rendering APIs decouple raw texture memory from sampling filtering states and how to declare them in Unity SRP.',
    tags: ['Textures', 'Samplers', 'DirectX', 'Vulkan', 'Metal'],
    contentMarkdown: `### Combined vs Separated Samplers
In classic OpenGL 2.0/3.0, texture memory and filtering/wrapping states were tightly bound into a single \`sampler2D\` handle.

Modern graphics hardware (Direct3D 11/12, Vulkan, Metal) completely separates:
1. **Texture Resource** (the raw pixel buffer and MIP levels in VRAM).
2. **Sampler State** (filtering mode: Point/Bilinear/Trilinear, and address wrap mode: Clamp/Repeat/Mirror).

This allows 1 SamplerState to sample hundreds of different textures, saving precious GPU texture descriptor slots.

---

### Declaring Textures in Unity URP & HDRP
In Unity SRP, declare textures and samplers using platform-agnostic macros:

\`\`\`hlsl
// 1. Texture and Sampler Declaration
TEXTURE2D(_BaseMap);
SAMPLER(sampler_BaseMap);

TEXTURE2D(_NormalMap);
// Note: Can reuse sampler_BaseMap for _NormalMap to save sampler slots!
\`\`\`

---

### Sampling Macros
\`\`\`hlsl
// Standard 2D sampling
float4 albedo = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, input.uv);

// Explicit LOD sampling (mandatory in vertex/compute shaders)
float4 blurred = SAMPLE_TEXTURE2D_LOD(_BaseMap, sampler_BaseMap, input.uv, 2.0);

// Explicit Derivative sampling (prevents seams in triplanar mapping)
float4 gradCol = SAMPLE_TEXTURE2D_GRAD(_BaseMap, sampler_BaseMap, input.uv, ddx(input.uv), ddy(input.uv));
\`\`\``,
  },
  {
    id: 'shadergraph_custom_nodes',
    title: 'Shader Graph Custom Function Node Guide',
    category: 'Shader Graph',
    readTime: '7 min read',
    summary: 'How to build reusable HLSL Custom Function nodes with dual float/half precision overloads for Unity 2022, 2023, and Unity 6.',
    tags: ['Shader Graph', 'Custom Function', 'Subgraphs', 'HLSL', 'Precision'],
    contentMarkdown: `### Why Use Custom Function Nodes?
Shader Graph offers a visual node workflow, but complex algorithms (raymarching loops, SDF evaluations, cryptographic hashes, fractal noise) are awkward to wire with hundreds of math nodes.

Custom Function nodes allow you to write clean HLSL code and expose it as a first-class visual node.

---

### The Precision Rule: \`_float\` and \`_half\` Overloading
In Unity 2022.2+, 2023, and Unity 6 (6000 LTS), Shader Graph requires that every custom function include file defines **BOTH** single-precision (\`_float\`) and half-precision (\`_half\`) function signatures:

\`\`\`hlsl
// MyCustomNode.hlsl

#ifndef MY_CUSTOM_NODE_INCLUDED
#define MY_CUSTOM_NODE_INCLUDED

// Single-Precision (Float) implementation
void EvaluateSDF_float(
    float3 PositionWS,
    float  Radius,
    out float Distance,
    out float4 DebugColor
)
{
    Distance = length(PositionWS) - Radius;
    DebugColor = float4(saturate(PositionWS), 1.0);
}

// Half-Precision (Half) implementation for mobile GPUs
void EvaluateSDF_half(
    half3 PositionWS,
    half  Radius,
    out half Distance,
    out half4 DebugColor
)
{
    float d;
    float4 col;
    EvaluateSDF_float(PositionWS, Radius, d, col);
    Distance = half(d);
    DebugColor = half4(col);
}

#endif // MY_CUSTOM_NODE_INCLUDED
\`\`\`

---

### Step-by-Step Setup in Shader Graph
1. Create a new **Shader Graph** (URP Lit or Unlit).
2. Right-click canvas -> **Create Node** -> search for **Custom Function**.
3. In Node Settings (Gear icon):
   - Set **Type** to \`File\`.
   - In **Source**, drag your \`.hlsl\` file from Project Assets.
   - In **Name**, enter the base function name without precision suffix (\`EvaluateSDF\`).
4. Under **Inputs**, add ports matching your parameters (\`PositionWS: Vector3\`, \`Radius: Float\`).
5. Under **Outputs**, add ports matching your \`out\` parameters (\`Distance: Float\`, \`DebugColor: Vector4\`).`,
  },
  {
    id: 'matrix_and_vector_math',
    title: 'Matrix Multiplications & Vector Orientation (GLSL vs HLSL)',
    category: 'Mathematics',
    readTime: '6 min read',
    summary: 'Row-major vs column-major matrix storage, multiplication order differences, and avoiding inverted geometry transforms.',
    tags: ['Matrices', 'Math', 'Vectors', 'Transformations'],
    contentMarkdown: `### Matrix Memory Storage vs Vector Multiplication Convention
One of the most confusing areas in graphics programming is the difference between:
1. **Memory storage order** (Row-major vs Column-major memory layout).
2. **Algebraic notation** (Row vectors \`v * M\` vs Column vectors \`M * v\`).

---

### Quick Comparison Table
| Feature | GLSL / OpenGL | HLSL / Unity SRP |
| :--- | :--- | :--- |
| **Default Storage** | Column-Major | Column-Major (in GPU registers) |
| **Vector Multiplication** | \`mat4 * vec4\` | \`mul(float4x4, float4)\` |
| **Transform Direction** | \`v_out = M * v_in\` | \`v_out = mul(M, v_in)\` (Unity standard) |
| **Matrix Indexing** | \`matrix[col][row]\` | \`matrix[row][col]\` (HLSL syntax) |

---

### Transforming Normals Correctly
When an object is non-uniformly scaled (e.g. scale \`(1, 2, 1)\`), transforming normals with the standard model matrix will distort them, causing surface lighting to break.

In GLSL:
\`\`\`glsl
mat3 normalMatrix = transpose(inverse(mat3(u_ModelMatrix)));
vec3 worldNormal = normalize(normalMatrix * a_Normal);
\`\`\`

In Unity URP:
\`\`\`hlsl
// Unity handles inverse-transpose internally via unity_WorldToObject matrix:
float3 worldNormal = TransformObjectToWorldNormal(input.normalOS);
\`\`\``,
  },
  {
    id: 'builtin_to_urp_migration',
    title: 'Migrating Unity Built-in Shaders to URP (Complete Guide)',
    category: 'SRP Migration',
    readTime: '9 min read',
    summary: 'Comprehensive migration manual for porting legacy Unity CG/ShaderLab & Surface shaders to modern URP HLSL, covering includes, lighting models, fog, shadows, and SRP Batching.',
    tags: ['Built-in RP', 'URP', 'Legacy CG', 'ShaderLab', 'Surface Shaders', 'SRP Batcher'],
    contentMarkdown: `### Overview: Why Built-in Shaders Break in URP
Unity's Universal Render Pipeline (URP) operates on a completely different rendering architecture than the legacy Built-in Render Pipeline:
- **No Multi-pass Lighting**: Built-in executed a separate forward pass per pixel light (\`ForwardAdd\`). URP executes single-pass forward shading with clustered/tiled light culling.
- **Modern Shader Libraries**: \`UnityCG.cginc\` and \`Lighting.cginc\` are obsolete. URP uses \`Core.hlsl\`, \`Lighting.hlsl\`, and \`Shadows.hlsl\`.
- **SRP Batcher Requirement**: Material uniforms must be wrapped in \`CBUFFER_START(UnityPerMaterial)\` ... \`CBUFFER_END\`.
- **Surface Shaders (\`#pragma surface\`\)**: Surface shaders are **NOT supported** by URP's compiler pipeline; they must be written as explicit vertex/fragment passes.

---

### Core Include File Replacements

| Legacy Built-in CG Include | Modern URP Package HLSL Include |
| :--- | :--- |
| \`#include "UnityCG.cginc"\` | \`#include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"\` |
| \`#include "Lighting.cginc"\` | \`#include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"\` |
| \`#include "AutoLight.cginc"\` | \`#include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Shadows.hlsl"\` |
| \`#include "UnityShaderVariables.cginc"\` | Included automatically inside \`Core.hlsl\` |

---

### Built-in Variables & Macros to URP Equivalents

| Built-in (CG / HLSL) | Universal Render Pipeline (URP) Equivalent |
| :--- | :--- |
| \`UnityObjectToClipPos(v.vertex)\` | \`TransformObjectToHClip(input.positionOS.xyz)\` |
| \`UnityObjectToWorldNormal(v.normal)\` | \`TransformObjectToWorldNormal(input.normalOS)\` |
| \`UnityObjectToWorldDir(dir)\` | \`TransformObjectToWorldDir(dir)\` |
| \`unity_ObjectToWorld\` / \`_Object2World\` | \`GetObjectToWorldMatrix()\` or \`TransformObjectToWorld(pos)\` |
| \`unity_WorldToObject\` / \`_World2Object\` | \`GetWorldToObjectMatrix()\` or \`TransformWorldToObject(pos)\` |
| \`UNITY_MATRIX_MVP\` | \`GetWorldToHClipMatrix()\` or \`TransformObjectToHClip\` |
| \`_WorldSpaceLightPos0.xyz\` | \`GetMainLight().direction\` or \`_MainLightPosition.xyz\` |
| \`_LightColor0.rgb\` | \`GetMainLight().color\` or \`_MainLightColor.rgb\` |
| \`_WorldSpaceCameraPos\` | \`GetCameraPositionWS()\` |
| \`tex2D(_MainTex, uv)\` | \`SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, uv)\` |
| \`fixed / fixed2 / fixed3 / fixed4\` | \`half / half2 / half3 / half4\` |
| \`ShadeSH9(float4(normal, 1.0))\` | \`SampleSH(normalWS)\` |
| \`UNITY_TRANSFER_FOG(o, o.vertex)\` | \`o.fogFactor = ComputeFogFactor(o.positionCS.z);\` |
| \`UNITY_APPLY_FOG(i.fogCoord, col)\` | \`col.rgb = MixFog(col.rgb, i.fogFactor);\` |

---

### Converting Legacy Surface Shaders
Built-in Surface Shaders like:
\`\`\`hlsl
CGPROGRAM
#pragma surface surf Standard fullforwardshadows
struct Input { float2 uv_MainTex; };
void surf (Input IN, inout SurfaceOutputStandard o) { ... }
ENDCG
\`\`\`

In URP, evaluate surface data using \`UniversalFragmentPBR\`:
\`\`\`hlsl
InputData inputData = (InputData)0;
inputData.positionWS = input.positionWS;
inputData.normalWS = normalize(input.normalWS);
inputData.viewDirectionWS = GetWorldSpaceNormalizeViewDir(input.positionWS);
inputData.fogCoord = InitializeInputDataFog(float4(input.positionWS, 1.0), input.fogFactor);
inputData.shadowMask = half4(1, 1, 1, 1);

SurfaceData surfaceData = (SurfaceData)0;
surfaceData.albedo = albedo.rgb;
surfaceData.alpha = albedo.a;
surfaceData.metallic = _Metallic;
surfaceData.smoothness = _Smoothness;

half4 finalColor = UniversalFragmentPBR(inputData, surfaceData);
finalColor.rgb = MixFog(finalColor.rgb, inputData.fogCoord);
return finalColor;
\`\`\`

---

### Mandatory Passes in URP Shaders
For a custom URP shader to interact with scene shadows, depth, and post-processing, provide these passes:
1. **ForwardLit** (\`Tags { "LightMode" = "UniversalForward" }\`): Main color rendering.
2. **ShadowCaster** (\`Tags { "LightMode" = "ShadowCaster" }\`): Renders object depth into directional and spot light shadowmaps.
3. **DepthOnly** (\`Tags { "LightMode" = "DepthOnly" }\`): Pre-renders depth for SSAO and depth-of-field.`
  },
];
