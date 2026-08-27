import { TutorialResource, LearningRoadmap } from '../types';

export const TUTORIAL_RESOURCES: TutorialResource[] = [
  // ==========================================
  // 1. OPENGL & GRAPHICS FOUNDATIONS
  // ==========================================
  {
    id: 'learnopengl-main',
    title: 'LearnOpenGL: Modern OpenGL & Shader Programming',
    author: 'Joey de Vries',
    websiteOrSource: 'learnopengl.com',
    url: 'https://learnopengl.com/',
    category: 'opengl_foundations',
    level: 'Beginner',
    format: 'Interactive Book',
    highlightBadge: 'Essential Foundation',
    summary: 'The most revered online textbook for modern 3.3+ core profile OpenGL. Covers everything from the programmable graphics pipeline, GLSL shaders, textures, coordinate spaces (Model-View-Projection), lighting models (Phong, Blinn-Phong), to advanced topics like Framebuffers, Cubemaps, Shadow Mapping, and Physically Based Rendering (PBR).',
    keyTopics: [
      'OpenGL 3.3+ Core Pipeline',
      'GLSL Shader Stages (Vertex, Fragment, Geometry)',
      'Coordinate Systems & MVP Transformation Matrices',
      'Blinn-Phong Lighting & Normal Mapping',
      'Framebuffers & Post-Processing Buffers',
      'Omnidirectional Shadow Mapping',
      'PBR (Cook-Torrance Microfacet BRDF, IBL)'
    ],
    recommendedPrerequisites: ['Basic C++ or C#', 'Linear Algebra fundamentals (Vectors, Dot/Cross products, 4x4 Matrices)'],
    conceptSnippet: {
      title: 'GLSL Blinn-Phong Specular vs URP Equivalent',
      language: 'glsl',
      code: `// LearnOpenGL GLSL Blinn-Phong Half-Vector
vec3 viewDir = normalize(viewPos - FragPos);
vec3 lightDir = normalize(lightPos - FragPos);
vec3 halfwayDir = normalize(lightDir + viewDir);  
float spec = pow(max(dot(normal, halfwayDir), 0.0), 32.0);
vec3 specular = lightColor * spec;`,
      note: 'In Unity URP HLSL, this math is computed via Lighting.hlsl inside UniversalFragmentBlinnPhong() using half-vectors derived from GetWorldSpaceNormalizeViewDir().'
    }
  },
  {
    id: 'the-book-of-shaders',
    title: 'The Book of Shaders: Step-by-step Guide to Fragment Shaders',
    author: 'Patricio Gonzalez Vivo & Jen Lowe',
    websiteOrSource: 'thebookofshaders.com',
    url: 'https://thebookofshaders.com/',
    category: 'opengl_foundations',
    level: 'Beginner',
    format: 'Interactive Book',
    highlightBadge: 'Interactive WebGL',
    summary: 'An illustrated, interactive guide to fragment shaders and creative coding with GLSL. Teaches how to think in parallel pixels, shape mathematical curves with step/smoothstep, generate 2D/3D shapes, and compose procedural noise (Value, Perlin, Simplex, Cellular / Voronoi).',
    keyTopics: [
      'Fragment-Parallel Thinking',
      'GLSL Built-in Math Functions (step, smoothstep, clamp, mod, fract)',
      'Algorithmic 2D Drawing & Polar Coordinates',
      'Matrices for 2D Transforms (Rotation, Scale, Translation)',
      'Procedural Noise & Fractional Brownian Motion (fBm)',
      'Cellular Noise & Voronoi Diagrams'
    ],
    recommendedPrerequisites: ['Basic high-school trigonometry and algebra'],
    conceptSnippet: {
      title: 'Shaping Function: Smoothstep Step Edge in GLSL',
      language: 'glsl',
      code: `// The Book of Shaders: Smooth Hermite Interpolation
float plot(vec2 st, float pct){
  return smoothstep(pct - 0.02, pct, st.y) -
         smoothstep(pct, pct + 0.02, st.y);
}`,
      note: 'GLSL smoothstep(edge0, edge1, x) matches HLSL smoothstep(min, max, x) exactly, performing cubic Hermite interpolation.'
    }
  },
  {
    id: 'inigo-quilez-articles',
    title: 'Inigo Quilez Graphics Articles: 2D/3D Distance Functions & Raymarching',
    author: 'Inigo Quilez (Co-creator of Shadertoy)',
    websiteOrSource: 'iquilezles.org',
    url: 'https://iquilezles.org/articles/',
    category: 'procedural_math',
    level: 'Advanced',
    format: 'Article / Blog',
    highlightBadge: 'Industry Legend',
    summary: 'The holy grail of procedural computer graphics and shader mathematics. Contains definitive formulas for 2D/3D Signed Distance Fields (SDFs), Smooth Minimum (smin) blending, exact normals via tetrahedral finite differences, raymarching sphere-tracing loops, analytical ambient occlusion, and procedural palette generation.',
    keyTopics: [
      'Signed Distance Functions (SDF) Primitives (Sphere, Box, Torus, Cylinder, Capsule, Mandelbulb)',
      'Smooth Boolean Operations (Smooth Union, Subtraction, Intersection)',
      'Raymarching / Sphere Tracing Algorithmic Frameworks',
      'Analytical Normal Estimation (Tetrahedron technique)',
      'Soft Shadows & Cone Tracing in Raymarchers',
      'Cosine Gradient Color Palettes'
    ],
    recommendedPrerequisites: ['GLSL syntax', 'Vector calculus & distance metrics'],
    conceptSnippet: {
      title: 'Inigo Quilez Smooth Minimum (Polynomial smin)',
      language: 'glsl',
      code: `// Polynomial smooth minimum (k = blend radius)
float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}`,
      note: 'Used worldwide to blend organic shapes and raymarched SDF volumes without harsh intersection creases.'
    }
  },
  {
    id: 'scratchapixel-foundations',
    title: 'Scratchapixel: Learn Computer Graphics from Scratch',
    author: 'Scratchapixel Team',
    websiteOrSource: 'scratchapixel.com',
    url: 'https://www.scratchapixel.com/',
    category: 'opengl_foundations',
    level: 'Intermediate',
    format: 'Interactive Book',
    summary: 'Comprehensive deep dive into the mathematical and physical foundations of 3D computer graphics. Explains ray-geometry intersections, barycentric coordinates, rasterization algorithms, perspective projection matrix derivations, radiometry, and Monte Carlo ray tracing.',
    keyTopics: [
      'Rasterization vs Ray Tracing',
      'Perspective Projection Matrix Derivation',
      'Barycentric Coordinates & Interpolation',
      'Radiometry, Photometry & BRDF Equations',
      'Camera Models & Ray Generation'
    ],
    recommendedPrerequisites: ['Linear algebra', 'Calculus basics']
  },
  {
    id: 'antons-opengl-tutorials',
    title: 'Anton’s OpenGL 4 Tutorials',
    author: 'Dr. Anton Gerdelan',
    websiteOrSource: 'antongerdelan.net',
    url: 'https://antongerdelan.net/opengl/',
    category: 'opengl_foundations',
    level: 'Intermediate',
    format: 'Article / Blog',
    summary: 'Clear, modern OpenGL 4.x tutorial series written by an experienced graphics researcher. Covers vertex array objects (VAOs), shader compilation workflows, virtual camera math, skinning/skeletal animation in GLSL, billboarding, and font rendering.',
    keyTopics: [
      'Modern OpenGL 4.x Pipeline',
      'Virtual Camera Math (Quaternions, Euler, View Matrix)',
      'Skeletal Animation & Hardware Skinning in Shaders',
      'GLSL Uniform Buffer Objects (UBO)',
      'Particle Billboard Shaders'
    ]
  },
  {
    id: 'songho-opengl-matrices',
    title: 'Song Ho Ahn: OpenGL Projection & Transform Matrix Derivations',
    author: 'Song Ho Ahn',
    websiteOrSource: 'songho.ca',
    url: 'http://www.songho.ca/opengl/gl_projectionmatrix.html',
    category: 'opengl_foundations',
    level: 'Intermediate',
    format: 'Article / Blog',
    summary: 'The cleanest step-by-step geometric proof and algebraic derivation of OpenGL perspective and orthographic projection matrices. Crucial for understanding why OpenGL NDC uses depth [-1, 1] while DirectX / Unity uses [0, 1] with Reversed-Z.',
    keyTopics: [
      'Perspective Projection Matrix Geometric Derivation',
      'Orthographic Projection Matrix Derivation',
      'OpenGL vs DirectX NDC Clip Volume Differences',
      'Depth Buffer Non-Linearity ($z_{ndc}$ vs $1/z$)',
      'Matrix Transpose & Column-Major vs Row-Major Ordering'
    ]
  },

  // ==========================================
  // 2. UNITY URP / SRP & HLSL TUTORIALS
  // ==========================================
  {
    id: 'catlike-coding-custom-srp',
    title: 'Catlike Coding: Custom Scriptable Render Pipeline (URP / SRP Engine)',
    author: 'Jasper Flick (Catlike Coding)',
    websiteOrSource: 'catlikecoding.com',
    url: 'https://catlikecoding.com/unity/tutorials/custom-srp/',
    category: 'unity_urp_srp',
    level: 'Advanced',
    format: 'Interactive Book',
    highlightBadge: 'Gold Standard for Unity Devs',
    summary: 'The legendary comprehensive tutorial series breaking down how Unity Scriptable Render Pipelines (SRP) work under the hood. Covers custom SRP render loop execution, SRP Batcher compatibility rules, CBUFFER layout alignment, directional & punctual shadow rendering, baked GI, LOD crossfades, and HDR post-processing stacks.',
    keyTopics: [
      'ScriptableRenderContext & RenderPipelineAsset architecture',
      'SRP Batcher: CBUFFER_START(UnityPerMaterial) memory packing',
      'Writing HLSL shaders without CGPROGRAM / UnityCG.cginc',
      'Directional, Point, and Spot Light Shadow Maps in HLSL',
      'Complex Surface Shading & Metallic/Smoothness PBR workflow',
      'Post-Processing passes via Custom Renderer Features'
    ],
    recommendedPrerequisites: ['C# intermediate', 'Basic HLSL / CG knowledge'],
    conceptSnippet: {
      title: 'Catlike Coding SRP Batcher Constant Buffer Standard',
      language: 'hlsl',
      code: `// UnityPerMaterial CBUFFER required for SRP Batching
CBUFFER_START(UnityPerMaterial)
    float4 _BaseColor;
    float4 _BaseMap_ST;
    float _Cutoff;
    float _Metallic;
    float _Smoothness;
CBUFFER_END`,
      note: 'All per-material properties must reside in UnityPerMaterial to allow Unity to keep uniform data in GPU VRAM across draw calls.'
    }
  },
  {
    id: 'catlike-coding-flow-shaders',
    title: 'Catlike Coding: Flow & Directional Water Shaders in Unity',
    author: 'Jasper Flick (Catlike Coding)',
    websiteOrSource: 'catlikecoding.com',
    url: 'https://catlikecoding.com/unity/tutorials/flow/',
    category: 'unity_urp_srp',
    level: 'Intermediate',
    format: 'Article / Blog',
    summary: 'Deep dive into animated procedural surface shaders in Unity: UV distortion via flow maps, dual-phase pulsing texture samplers, waves using Gerstner wave trigonometric sums, and directional foam simulation.',
    keyTopics: [
      'Flow Maps & Vector Flow Distortion',
      'Two-Phase Blending to eliminate texture stretching artifacts',
      'Gerstner Wave Math in Vertex Shaders',
      'Triplanar Surface Mapping & Texture Blending',
      'Depth Buffer Water Intersection Foam'
    ]
  },
  {
    id: 'cyanilux-urp-shader-tutorials',
    title: 'Cyanilux: URP Shader Graph & HLSL Deep Dives',
    author: 'Cyan (Cyanilux)',
    websiteOrSource: 'cyanilux.com',
    url: 'https://www.cyanilux.com/',
    category: 'unity_urp_srp',
    level: 'Intermediate',
    format: 'Article / Blog',
    highlightBadge: 'URP Masterclass',
    summary: 'The leading dedicated resource for Unity Universal Render Pipeline (URP) technical artists. Contains dozens of modular guides explaining Scene Depth reconstructions, Screen-Space Refractions, Custom Render Passes, Stencil Portals, Volumetric Lighting, Toon Shaders, and Custom Function Nodes in Shader Graph.',
    keyTopics: [
      'Scene Depth Reconstruction (_CameraDepthTexture) Linear01 vs LinearEyeDepth',
      'Screen Space UV Coordinates & Refraction Offsets',
      'ScriptableRendererFeature & ScriptableRenderPass Implementation',
      'Stencil Buffer Portals and Masking',
      'Stylized Water with Caustics & Edge Depth Fade',
      'HLSL Custom Nodes for Shader Graph'
    ],
    recommendedPrerequisites: ['Unity URP basics', 'Shader Graph or HLSL familiarity'],
    conceptSnippet: {
      title: 'Cyanilux: Reconstructing Linear Depth in URP HLSL',
      language: 'hlsl',
      code: `// Sample raw depth and convert to linear eye depth
#include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/DeclareDepthTexture.hlsl"

float rawDepth = SampleSceneDepth(screenUV);
float linearDepth = LinearEyeDepth(rawDepth, _ZBufferParams);
float surfaceDepth = input.positionCS.w;
float depthDifference = linearDepth - surfaceDepth;`,
      note: 'SampleSceneDepth() uses the URP depth texture safely across API backends (Metal, Vulkan, Direct3D, OpenGL ES).'
    }
  },
  {
    id: 'minions-art-stylized-shaders',
    title: 'MinionsArt: Stylized & Toon Shaders for Unity URP',
    author: 'Mina Pêcheux / MinionsArt (Joyce)',
    websiteOrSource: 'minionsart.github.io',
    url: 'https://minionsart.github.io/tutorials/',
    category: 'stylized_vfx',
    level: 'Beginner',
    format: 'Article / Blog',
    highlightBadge: 'Visual & Beginner Friendly',
    summary: 'Highly visual, bite-sized tutorials on creating non-photorealistic (NPR) rendering effects in Unity URP. Covers Inverted Hull Outlines, Stepped Cel Lighting, Triplanar Texturing, Vertex Wind/Wobble displacement, Shield/Forcefield energy rings, and Stylized Particle VFX.',
    keyTopics: [
      'Inverted Hull Mesh Outlines (Vertex Normal Extrusion)',
      'Banded Toon / Cel Lighting Shaders',
      'Dissolve Effects with Noise & Burning Edge Glow',
      'Forcefield & Energy Shield Spheres',
      'Interactive Grass & Foliage Vertex Sway'
    ]
  },
  {
    id: 'ben-golus-graphics-articles',
    title: 'Ben Golus Graphics Deep Dives: Normal Maps, Lines & Shader Math',
    author: 'Ben Golus',
    websiteOrSource: 'bgolus.medium.com',
    url: 'https://bgolus.medium.com/',
    category: 'unity_urp_srp',
    level: 'Advanced',
    format: 'Article / Blog',
    highlightBadge: 'Technical Rigor',
    summary: 'In-depth, mathematically precise articles by a seasoned game engine graphics engineer. Covers the definitive standard for screen-space anti-aliased wide lines, unpacking normal maps without tangent spaces (screen-space derivative normal reconstruction), specular anti-aliasing (Toksvig / LEAN / Kaplanyan), and precision issues in mobile shader arithmetic.',
    keyTopics: [
      'The Quest for Very Wide Lines (Anti-Aliased Procedural Geometry)',
      'Unpacking & Blending Normal Maps (Whiteout, Reoriented Normal Mapping)',
      'Tangent-Less Normal Mapping via ddx/ddy screen derivatives',
      'Geometric Specular Anti-Aliasing (Normal variance filtering)',
      'Reversed-Z Depth Buffer Mathematics'
    ]
  },
  {
    id: 'ned-makes-games-urp',
    title: 'Ned Makes Games: Writing URP Shaders from Scratch in HLSL',
    author: 'Ned Makes Games',
    websiteOrSource: 'YouTube / nedmakesgames.com',
    url: 'https://www.youtube.com/@NedMakesGames',
    category: 'unity_urp_srp',
    level: 'Intermediate',
    format: 'Video Series',
    highlightBadge: 'Complete Video Course',
    summary: 'Exceptional video series walking step-by-step through writing raw HLSL shaders in Unity URP without relying on Shader Graph. Covers structure declarations, vertex/fragment functions, multi-compile keywords, shadow caster passes, custom lighting models with GetMainLight() and GetAdditionalLight().',
    keyTopics: [
      'Writing Raw HLSL URP Shaders line-by-line',
      'URP Lighting Library Functions (GetMainLight, GetAdditionalLight)',
      'ShadowCaster & DepthOnly Passes',
      'Multi_compile Keywords & Shader Feature Pragmas',
      'Custom Lighting Functions in Shader Graph'
    ]
  },
  {
    id: 'harry-alisavakis-shaders',
    title: 'Harry Alisavakis: Extra Fabulous Shaders & URP Custom Passes',
    author: 'Harry Alisavakis',
    websiteOrSource: 'harryalisavakis.com',
    url: 'https://harryalisavakis.com/',
    category: 'stylized_vfx',
    level: 'Intermediate',
    format: 'Article / Blog',
    summary: 'Creative exploration of game visual effects and URP ScriptableRendererFeature post-processing. Includes volumetric clouds/fog, pixelation shaders, retro CRT simulation, edge detection filters, and glass caustic rendering.',
    keyTopics: [
      'URP ScriptableRendererFeature Custom Post-Processing',
      'Volumetric Raymarched Fog & Clouds',
      'Screen-Space Edge Detection (Sobel Filter, Depth & Normal based)',
      'Retro Color Paletting & Dithering (Bayer Matrix)',
      'Interactive Glass & Refraction Effects'
    ]
  },
  {
    id: 'freya-holmer-math-shaders',
    title: 'Freya Holmér: Math for Game Developers & Shaders',
    author: 'Freya Holmér',
    websiteOrSource: 'YouTube / acegikmo.com',
    url: 'https://www.youtube.com/@Acegikmo',
    category: 'procedural_math',
    level: 'Beginner',
    format: 'Video Series',
    highlightBadge: 'Visual Math Legend',
    summary: 'Spectacular visual lectures explaining the geometric intuition behind vectors, dot products, cross products, coordinate spaces, Bézier curves, transformation matrices, and shader rendering. Essential viewing for technical artists and shader developers.',
    keyTopics: [
      'Geometric Intuition of Dot & Cross Products',
      'Coordinate Spaces: Local, World, View, Clip, and NDC',
      'Trigonometry & Polar Coordinates for Shaders',
      'Bézier Curves, Splines & Smooth Interpolations',
      'Matrix Transformations & Change of Basis'
    ]
  },
  {
    id: 'unity-manual-urp-hlsl',
    title: 'Unity Official: Writing Custom HLSL Shaders for URP (Manual)',
    author: 'Unity Technologies',
    websiteOrSource: 'docs.unity3d.com',
    url: 'https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@latest/index.html?subfolder=/manual/writing-custom-shaders-urp.html',
    category: 'unity_urp_srp',
    level: 'Intermediate',
    format: 'Article / Blog',
    summary: 'Official documentation for authoring hand-written HLSL shaders in Unity Universal Render Pipeline. Documents standard include files (Core.hlsl, Lighting.hlsl, Shadow.hlsl), required tags (LightMode), vertex attribute structs, and SRP Batcher compliance requirements.',
    keyTopics: [
      'Universal RP Shader Structure & SubShader Tags',
      'Core Include Files (Packages/com.unity.render-pipelines.universal/ShaderLibrary/...)',
      'LightMode Pass Tags (UniversalForward, ShadowCaster, DepthOnly, DepthNormals, Meta)',
      'Varyings and Attributes Struct Conventions',
      'TransformObjectToHClip & Modern Coordinate Transformation APIs'
    ]
  },

  // ==========================================
  // 3. ACADEMIC PAPERS & FOUNDATIONAL RESEARCH
  // ==========================================
  {
    id: 'disney-principled-pbr-paper',
    title: 'Physically Based Shading at Disney (Burley, SIGGRAPH)',
    author: 'Brent Burley (Walt Disney Animation Studios)',
    websiteOrSource: 'SIGGRAPH Course Notes',
    url: 'https://blog.selfshadow.com/publications/s2012-shading-course/burley/s2012_pbs_disney_brdf_notes_v3.pdf',
    category: 'academic_papers',
    level: 'Research',
    format: 'Academic Paper',
    highlightBadge: 'Industry Milestone Paper',
    summary: 'The landmark 2012 SIGGRAPH paper that established the modern "Principled BRDF" standard adopted by Unity URP/HDRP, Unreal Engine, Blender, and Disney films. Introduced intuitive artist parameters (BaseColor, Metallic, Roughness, Specular, Sheen, Clearcoat, Anisotropic) unified with microfacet physics.',
    keyTopics: [
      'Disney Principled BRDF 10 Core Principles',
      'Microfacet Distribution (Trowbridge-Reitz / GGX)',
      'Schlick Fresnel Approximation ($F_0$ Interpolation)',
      'Smith Geometric Shadowing-Masking Function ($G$)',
      'Energy Conservation in Surface Reflection Models'
    ],
    conceptSnippet: {
      title: 'GGX Normal Distribution Function (NDF / D-Term)',
      language: 'hlsl',
      code: `// GGX / Trowbridge-Reitz NDF calculation in HLSL
float D_GGX(float NdotH, float roughness) {
    float a = roughness * roughness;
    float a2 = a * a;
    float d = (NdotH * a2 - NdotH) * NdotH + 1.0;
    return a2 / (3.14159265 * d * d + 1e-7);
}`,
      note: 'Evaluated in Unity URP inside UniversalFragmentPBR() to compute specular microfacet reflections.'
    }
  },
  {
    id: 'microfacet-ggx-paper',
    title: 'Microfacet Models for Refraction through Rough Surfaces (Walter et al.)',
    author: 'Bruce Walter, Stephen R. Marschner, Hongsong Li, Kenneth E. Torrance',
    websiteOrSource: 'Eurographics Symposium on Rendering (EGSR)',
    url: 'https://www.cs.cornell.edu/~srm/publications/EGSR07-btdf.pdf',
    category: 'academic_papers',
    level: 'Research',
    format: 'Academic Paper',
    summary: 'The seminal academic paper introducing the GGX distribution function (Trowbridge-Reitz variant with heavy tails) to real-time computer graphics, outperforming traditional Blinn-Phong and Beckmann specular lobes on metallic surfaces.',
    keyTopics: [
      'Microfacet Distribution Functions (GGX, Beckmann, Phong)',
      'Rough Surface Refraction & Transmission BSDFs',
      'Trowbridge-Reitz Distribution Derivations',
      'Visible Normal Distribution Sampling'
    ]
  },
  {
    id: 'nvidia-gpu-gems',
    title: 'NVIDIA GPU Gems 1, 2, 3: Classic Real-Time Graphics Gems',
    author: 'NVIDIA Corporation (Multiple Authors)',
    websiteOrSource: 'developer.nvidia.com',
    url: 'https://developer.nvidia.com/gpugems/gpugems/contributors',
    category: 'academic_papers',
    level: 'Advanced',
    format: 'Interactive Book',
    highlightBadge: 'Legendary Free Textbook',
    summary: 'NVIDIA’s legendary trilogy of books on real-time programmable graphics algorithms, now completely free online. Features seminal chapters on Ocean Wave Simulation (Jerry Tessendorf), Atmospheric Scattering (Sean O’Neil), Parallax Occlusion Mapping, GPU Cloth, and Volumetric Smoke.',
    keyTopics: [
      'Simulating Ocean Water (FFT & Gerstner Sums)',
      'Accurate Atmospheric Scattering in Real-Time',
      'Parallax Occlusion Mapping (POM) & Steep Parallax',
      'Subsurface Scattering for Skin & Jade',
      'Depth of Field, Motion Blur & HDR Tone Mapping'
    ]
  },
  {
    id: 'realtime-rendering-fourth-edition',
    title: 'Real-Time Rendering (4th Edition Resources & Portal)',
    author: 'Tomas Akenine-Möller, Eric Haines, Naty Hoffman, Angelo Pesce, Michal Iwanicki, Sébastien Hillaire',
    websiteOrSource: 'realtimerendering.com',
    url: 'https://www.realtimerendering.com/',
    category: 'academic_papers',
    level: 'Advanced',
    format: 'Interactive Book',
    summary: 'The definitive encyclopedia of modern real-time computer graphics. The website provides extensive curated bibliographies, interactive WebGL demos, BRDF model calculators, and GPU hardware evolution summaries.',
    keyTopics: [
      'Graphics Processing Unit (GPU) Microarchitecture',
      'Modern Physically Based Shading Models',
      'Global Illumination, Light Probes & Irradiance Volumes',
      'Spatial Data Structures (BVH, Octrees, Frustum Culling)',
      'Temporal Anti-Aliasing (TAA) & Upscaling (DLSS, FSR)'
    ]
  },

  // ==========================================
  // 4. INTERACTIVE SANDBOXES & CREATIVE CODING
  // ==========================================
  {
    id: 'shadertoy-platform',
    title: 'Shadertoy: Interactive WebGL GLSL Shader Repository',
    author: 'Inigo Quilez & Pol Jeremias',
    websiteOrSource: 'shadertoy.com',
    url: 'https://www.shadertoy.com/',
    category: 'interactive_sandboxes',
    level: 'Intermediate',
    format: 'Interactive Tool',
    highlightBadge: 'Live GLSL Sandbox',
    summary: 'The global community standard platform for authoring, sharing, and studying procedural fragment shaders in WebGL. Millions of open-source shaders demonstrating volumetric raymarching, fractal rendering, fluid simulation, and audio synthesis in pure GLSL code.',
    keyTopics: [
      'Procedural Pixel Shaders in Real-Time',
      'Multi-Pass Buffers (Buffer A, B, C, D, Sound, VR)',
      'Procedural SDF 3D Worlds',
      'Multipass Fluid Dynamics in Fragment Shaders'
    ],
    conceptSnippet: {
      title: 'Shadertoy mainImage Entry Point vs URP Fragment',
      language: 'glsl',
      code: `// Shadertoy Standard Entry Point
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec3 col = 0.5 + 0.5 * cos(iTime + uv.xyx + vec3(0,2,4));
    fragColor = vec4(col, 1.0);
}`,
      note: 'Our Converter Workbench automatically maps iResolution, iTime, and mainImage into URP Varyings struct with _Time.y and positionCS.'
    }
  },
  {
    id: 'shaderfrog-visual-editor',
    title: 'Shaderfrog: WebGL Shader Builder & Visual Node Compositor',
    author: 'Andrew Ray',
    websiteOrSource: 'shaderfrog.com',
    url: 'https://shaderfrog.com/',
    category: 'interactive_sandboxes',
    level: 'Beginner',
    format: 'Interactive Tool',
    summary: 'Interactive WebGL tool for composing and merging GLSL vertex and fragment shaders visually onto 3D test models with real-time uniform controls.',
    keyTopics: [
      'Visual Shader Composition',
      'Live GLSL Uniform Tweaking',
      '3D Model Shading Playground'
    ]
  }
];

export const LEARNING_ROADMAPS: LearningRoadmap[] = [
  {
    id: 'path-glsl-foundations',
    title: 'Path 1: Graphics Math & GLSL Foundations (Zero to Shader Hero)',
    targetAudience: 'Beginner to Intermediate programmers new to GPU shader pipelines',
    estimatedWeeks: '3 - 4 Weeks',
    description: 'Master parallel GPU thinking, vector and matrix mathematics, GLSL language syntax, procedural curves, and fundamental lighting equations before moving to engine-specific pipelines.',
    steps: [
      {
        stepNumber: 1,
        title: 'Learn the Geometric & Vector Math Intuition',
        resourceIds: ['freya-holmer-math-shaders'],
        description: 'Understand vector dot products, cross products, coordinate systems (local vs world vs clip), and trigonometric wave functions visually.'
      },
      {
        stepNumber: 2,
        title: 'Master Creative Fragment Shaders with The Book of Shaders',
        resourceIds: ['the-book-of-shaders'],
        description: 'Learn step, smoothstep, fract, mod, polar coordinates, procedural noise, and fractional Brownian motion (fBm).'
      },
      {
        stepNumber: 3,
        title: 'Understand the Programmable GPU Pipeline & Coordinate Systems',
        resourceIds: ['learnopengl-main', 'songho-opengl-matrices'],
        description: 'Study vertex attributes, Uniforms, MVP matrices, depth testing, Blinn-Phong lighting, and Framebuffers.'
      },
      {
        stepNumber: 4,
        title: 'Experiment Live on Shadertoy',
        resourceIds: ['shadertoy-platform'],
        description: 'Read and dissect open-source procedural fragment shaders, test color palettes, and build simple SDF renderers.'
      }
    ]
  },
  {
    id: 'path-unity-urp-migration',
    title: 'Path 2: GLSL to Unity URP / SRP HLSL Migration Masterclass',
    targetAudience: 'Technical Artists and Game Developers migrating legacy or GLSL shaders to modern Unity 2022/2023 & Unity 6',
    estimatedWeeks: '2 - 3 Weeks',
    description: 'Learn the exact architectural differences between legacy OpenGL/CG shaders and modern Scriptable Render Pipeline standards: CBUFFER memory packing, separated samplers, and URP lighting APIs.',
    steps: [
      {
        stepNumber: 1,
        title: 'Learn How Unity SRP Operates Under the Hood',
        resourceIds: ['catlike-coding-custom-srp'],
        description: 'Understand why Unity introduced SRP, how draw calls are batchable with CBUFFER_START(UnityPerMaterial), and how custom passes execute.'
      },
      {
        stepNumber: 2,
        title: 'Author Hand-Written HLSL Shaders in URP',
        resourceIds: ['ned-makes-games-urp', 'unity-manual-urp-hlsl'],
        description: 'Write raw HLSL shaders targeting UniversalForward, ShadowCaster, and DepthOnly passes using TransformObjectToHClip() and GetMainLight().'
      },
      {
        stepNumber: 3,
        title: 'Master Depth Reconstructions, Screen-Space Passes & Shader Graph Nodes',
        resourceIds: ['cyanilux-urp-shader-tutorials'],
        description: 'Implement scene depth comparisons (SampleSceneDepth), screen-space refractions, custom Shader Graph Custom Function nodes, and ScriptableRendererFeatures.'
      },
      {
        stepNumber: 4,
        title: 'Verify SRP Batcher Compatibility & Performance Profiling',
        resourceIds: ['catlike-coding-custom-srp', 'ben-golus-graphics-articles'],
        description: 'Audit constant buffer float4 padding, eliminate uniform buffer register misalignments, and evaluate keyword variant explosion risk.'
      }
    ]
  },
  {
    id: 'path-stylized-vfx',
    title: 'Path 3: Stylized & Non-Photorealistic Technical Artistry',
    targetAudience: 'Artists and technical developers creating anime, toon, fantasy, or stylized game visuals in Unity',
    estimatedWeeks: '2 Weeks',
    description: 'Create eye-catching stylized visuals: multi-banded cel shading, inverted hull outlines, procedural dissolves, forcefield shields, and water caustics.',
    steps: [
      {
        stepNumber: 1,
        title: 'Toon Shading, Outlines & Dissolves',
        resourceIds: ['minions-art-stylized-shaders'],
        description: 'Implement stepped lighting bands, vertex normal extrusion outlines, and noise-driven threshold dissolves.'
      },
      {
        stepNumber: 2,
        title: 'Flow Maps, Water Waves & Caustics',
        resourceIds: ['catlike-coding-flow-shaders', 'cyanilux-urp-shader-tutorials'],
        description: 'Simulate flowing rivers, Gerstner wave vertex ocean swells, and dynamic water intersection foam.'
      },
      {
        stepNumber: 3,
        title: 'Volumetric Post-Processing & Special Effects',
        resourceIds: ['harry-alisavakis-shaders'],
        description: 'Build raymarched fog volumes, screen-space edge filters, and stylized retro CRT/dithering post-processing features.'
      }
    ]
  },
  {
    id: 'path-pbr-academic',
    title: 'Path 4: Physically Based Rendering (PBR) & Research Foundations',
    targetAudience: 'Senior Graphics Engineers and researchers seeking deep mathematical mastery of light transport and microfacets',
    estimatedWeeks: '4 - 6 Weeks',
    description: 'Study the landmark academic papers behind microfacet BRDFs, Fresnel equations, Disney Principled BSDFs, and GPU hardware architectures.',
    steps: [
      {
        stepNumber: 1,
        title: 'The Disney Principled BRDF Milestone',
        resourceIds: ['disney-principled-pbr-paper'],
        description: 'Read Brent Burley’s seminal SIGGRAPH course notes detailing the 10 principles of modern intuitive physical shading.'
      },
      {
        stepNumber: 2,
        title: 'Microfacet Theory & GGX Normal Distribution',
        resourceIds: ['microfacet-ggx-paper'],
        description: 'Understand the mathematical derivations of GGX/Trowbridge-Reitz distributions, Smith geometric shadowing, and rough surface transmission.'
      },
      {
        stepNumber: 3,
        title: 'Classical GPU Algorithms & Industry Textbooks',
        resourceIds: ['nvidia-gpu-gems', 'realtime-rendering-fourth-edition'],
        description: 'Explore atmospheric scattering, ocean waves, BRDF integration approximations, and modern GPU pipeline architectures.'
      }
    ]
  }
];
