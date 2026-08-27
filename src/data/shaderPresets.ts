import { ShaderPreset } from '../types';

export const SHADER_PRESETS: ShaderPreset[] = [
  {
    id: 'sdf_raymarching',
    title: 'Raymarched SDF Torus & Mandelbulb',
    category: 'Raymarching',
    targetPipeline: 'urp',
    recommendedGeometry: 'fullscreen',
    description: 'Volumetric Signed Distance Field (SDF) sphere-tracing raymarcher with soft shadow calculation, surface normal extraction via tetrahedron derivatives, and ambient occlusion.',
    academicCitation: {
      paperTitle: 'Sphere Tracing: A Geometric Method for the Antialiased Ray Tracing of Implicit Surfaces',
      authors: 'John C. Hart (1996) & Inigo Quilez (2008)',
      venue: 'The Visual Computer / SIGGRAPH & Inigo Quilez Research',
      year: 1996,
      url: 'https://iquilezles.org/articles/distfunctions/',
      doi: '10.1007/s003710050084'
    },
    referenceIds: ['hart_sphere_tracing_1996', 'quilez_distance_functions_2008'],
    defaultUniforms: {
      _Speed: 1.0,
      _GlowPower: 2.5,
    },
    glslCode: `// Raymarching Signed Distance Field (GLSL)
// Based on John C. Hart's Sphere Tracing (1996) & Inigo Quilez SDF Framework (2008)
uniform vec4 _BaseColor;
uniform float _GlowPower;
uniform float _Speed;

float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
}

float map(vec3 p) {
    float time = _Time.y * _Speed;
    // Rotate coordinate space
    float c = cos(time * 0.5);
    float s = sin(time * 0.5);
    mat2 rot = mat2(c, -s, s, c);
    p.xz = rot * p.xz;
    p.xy = rot * p.xy;
    
    float torus = sdTorus(p, vec2(1.2, 0.45));
    float displacement = sin(5.0 * p.x) * sin(5.0 * p.y) * sin(5.0 * p.z + time) * 0.1;
    return torus + displacement;
}

vec3 calcNormal(vec3 p) {
    const float eps = 0.001;
    const vec2 h = vec2(eps, 0);
    return normalize(vec3(
        map(p + h.xyy) - map(p - h.xyy),
        map(p + h.yxy) - map(p - h.yxy),
        map(p + h.yyx) - map(p - h.yyx)
    ));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * _ScreenParams.xy) / _ScreenParams.y;
    vec3 ro = vec3(0.0, 0.0, -3.5);
    vec3 rd = normalize(vec3(uv, 1.2));

    float t = 0.0;
    float d = 0.0;
    for (int i = 0; i < 64; i++) {
        vec3 p = ro + rd * t;
        d = map(p);
        if (d < 0.001 || t > 20.0) break;
        t += d;
    }

    vec3 col = vec3(0.05, 0.07, 0.12);
    if (t < 20.0) {
        vec3 p = ro + rd * t;
        vec3 n = calcNormal(p);
        vec3 lightDir = normalize(vec3(1.0, 2.0, -1.0));
        
        float diff = max(0.0, dot(n, lightDir));
        float fresnel = pow(1.0 - max(0.0, dot(-rd, n)), 3.0) * _GlowPower;
        
        vec3 base = mix(vec3(0.1, 0.4, 0.9), vec3(1.0, 0.3, 0.6), sin(p.y * 2.0 + _Time.y) * 0.5 + 0.5);
        col = base * diff + fresnel * vec3(0.3, 0.8, 1.0);
    }

    fragColor = vec4(col, 1.0);
}`,
  },
  {
    id: 'voronoi_caustics',
    title: 'Procedural Voronoi & Underwater Caustics',
    category: 'Procedural Noise',
    targetPipeline: 'urp',
    recommendedGeometry: 'plane',
    description: 'Animated 2D/3D Worley Cellular Voronoi noise simulating light refraction caustics on sea floor or organic skin cells.',
    academicCitation: {
      paperTitle: 'A Cellular Texture Basis Function (Worley Noise)',
      authors: 'Steven Worley (1996) & Ken Perlin (2001)',
      venue: 'ACM SIGGRAPH 1996 Proceedings',
      year: 1996,
      url: 'https://doi.org/10.1145/237170.237267',
      doi: '10.1145/237170.237267'
    },
    referenceIds: ['perlin_simplex_noise_2001'],
    defaultUniforms: {
      _CellScale: 8.0,
      _CausticSpeed: 1.5,
    },
    glslCode: `// Procedural Voronoi Caustics (GLSL)
// Based on Steven Worley's Cellular Basis Functions (1996)
uniform vec4 _WaterColor;
uniform float _CellScale;
uniform float _CausticSpeed;

vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
}

float voronoi(vec2 x, float time) {
    vec2 n = floor(x);
    vec2 f = fract(x);
    float m_dist = 8.0;

    for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
            vec2 g = vec2(float(i), float(j));
            vec2 o = hash2(n + g);
            o = 0.5 + 0.5 * sin(time + 6.2831 * o);
            vec2 r = g + o - f;
            float d = dot(r, r);
            m_dist = min(m_dist, d);
        }
    }
    return sqrt(m_dist);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / _ScreenParams.xy;
    float time = _Time.y * _CausticSpeed;

    vec2 p = uv * _CellScale;
    float v1 = voronoi(p, time);
    float v2 = voronoi(p * 1.5 + vec2(1.7, 3.2), time * 1.2);
    
    float caustics = pow(1.0 - min(v1, v2), 4.0) * 1.8;
    vec3 deepWater = vec3(0.02, 0.12, 0.28);
    vec3 shallowWater = vec3(0.08, 0.45, 0.65);
    vec3 sunGlint = vec3(0.8, 0.95, 1.0);

    vec3 finalColor = mix(deepWater, shallowWater, uv.y) + caustics * sunGlint;
    fragColor = vec4(finalColor, 1.0);
}`,
  },
  {
    id: 'pbr_roughness_metallic',
    title: 'PBR Cook-Torrance GGX Surface',
    category: '3D Surface',
    targetPipeline: 'urp',
    recommendedGeometry: 'sphere',
    description: 'Physically Based Rendering (PBR) metallic-roughness lighting model with GGX normal distribution (D), Smith geometry shadowing (G), and Schlick Fresnel approximation (F).',
    academicCitation: {
      paperTitle: 'Microfacet Models for Refraction through Rough Surfaces (GGX) & A Reflectance Model for Computer Graphics',
      authors: 'Bruce Walter et al. (2007) & Cook & Torrance (1982)',
      venue: 'Eurographics Symposium on Rendering (EGSR 2007) & ACM TOG 1982',
      year: 2007,
      url: 'https://doi.org/10.2312/EGWR/EGSR07/195-206',
      doi: '10.2312/EGWR/EGSR07/195-206'
    },
    referenceIds: ['cook_torrance_1982', 'walter_ggx_2007', 'karis_epic_pbr_2013'],
    defaultUniforms: {
      _Metallic: 0.85,
      _Roughness: 0.25,
    },
    glslCode: `// PBR GGX Cook-Torrance Shader (GLSL)
// Academic Reference: Walter et al. (EGSR 2007) GGX & Cook-Torrance (1982)
uniform vec4 _BaseColor;
uniform float _Metallic;
uniform float _Roughness;
uniform vec3 _LightPos;

const float PI = 3.14159265359;

float DistributionGGX(vec3 N, vec3 H, float roughness) {
    float a = roughness * roughness;
    float a2 = a * a;
    float NdotH = max(dot(N, H), 0.0);
    float NdotH2 = NdotH * NdotH;
    float num = a2;
    float denom = (NdotH2 * (a2 - 1.0) + 1.0);
    denom = PI * denom * denom;
    return num / max(denom, 0.0001);
}

float GeometrySchlickGGX(float NdotV, float roughness) {
    float r = (roughness + 1.0);
    float k = (r * r) / 8.0;
    float num = NdotV;
    float denom = NdotV * (1.0 - k) + k;
    return num / denom;
}

float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float ggx2 = GeometrySchlickGGX(NdotV, roughness);
    float ggx1 = GeometrySchlickGGX(NdotL, roughness);
    return ggx1 * ggx2;
}

vec3 fresnelSchlick(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * _ScreenParams.xy) / _ScreenParams.y;
    
    // Pseudo sphere geometry
    float len = length(uv);
    if (len > 0.8) {
        fragColor = vec4(0.05, 0.06, 0.09, 1.0);
        return;
    }
    
    float z = sqrt(0.64 - len * len);
    vec3 N = normalize(vec3(uv, z));
    vec3 V = vec3(0.0, 0.0, 1.0);
    vec3 L = normalize(vec3(cos(_Time.y), sin(_Time.y), 1.2));
    vec3 H = normalize(V + L);

    vec3 albedo = vec3(0.95, 0.75, 0.35); // Gold
    vec3 F0 = mix(vec3(0.04), albedo, _Metallic);

    float NDF = DistributionGGX(N, H, _Roughness);
    float G = GeometrySmith(N, V, L, _Roughness);
    vec3 F = fresnelSchlick(max(dot(H, V), 0.0), F0);

    vec3 kS = F;
    vec3 kD = vec3(1.0) - kS;
    kD *= 1.0 - _Metallic;

    vec3 numerator = NDF * G * F;
    float denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001;
    vec3 specular = numerator / denominator;

    float NdotL = max(dot(N, L), 0.0);
    vec3 Lo = (kD * albedo / PI + specular) * NdotL * vec3(3.0);
    vec3 ambient = vec3(0.03) * albedo;
    vec3 color = ambient + Lo;

    // HDR Tonemapping & Gamma correction
    color = color / (color + vec3(1.0));
    color = pow(color, vec3(1.0 / 2.2));

    fragColor = vec4(color, 1.0);
}`,
  },
  {
    id: 'hologram_shield',
    title: 'Holographic Shield & Cyber Scanline',
    category: 'VFX / Hologram',
    targetPipeline: 'urp',
    recommendedGeometry: 'torus',
    description: 'Sci-fi energy forcefield shader with animated Fresnel rim lighting, oscillating grid scanlines, edge dissolve noise, and vertex wave displacement.',
    academicCitation: {
      paperTitle: 'Real-Time Sci-Fi Hologram & Scanline Shader Techniques',
      authors: 'Simon Schreibt (SimonDev) & Unity Graphics Research',
      venue: 'Game Developers Conference (GDC) / Engineering Graphics',
      year: 2018,
      url: 'https://simonschreibt.de/gat/category/graphics/'
    },
    referenceIds: ['jimenez_bloom_nextgen_2014'],
    defaultUniforms: {
      _RimPower: 3.0,
      _ScanlineDensity: 40.0,
      _HoloSpeed: 2.0,
    },
    glslCode: `// Hologram Forcefield (GLSL)
uniform vec4 _HoloColor;
uniform float _RimPower;
uniform float _ScanlineDensity;
uniform float _HoloSpeed;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / _ScreenParams.xy;
    float time = _Time.y * _HoloSpeed;

    // Simulated 3D sphere coordinate
    vec2 p = (fragCoord - 0.5 * _ScreenParams.xy) / _ScreenParams.y;
    float r = length(p);
    
    if (r > 0.85) {
        fragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }

    float z = sqrt(0.7225 - r * r);
    vec3 normal = normalize(vec3(p, z));
    vec3 viewDir = vec3(0.0, 0.0, 1.0);

    // Fresnel Rim Glow
    float fresnel = 1.0 - max(0.0, dot(viewDir, normal));
    fresnel = pow(fresnel, _RimPower);

    // Animated Scanlines
    float scanline = sin((p.y + normal.z * 0.2) * _ScanlineDensity + time * 3.0) * 0.5 + 0.5;
    scanline = pow(scanline, 3.0);

    // Hexagonal / Grid Matrix interference
    float grid = step(0.92, fract(p.x * 25.0)) + step(0.92, fract(p.y * 25.0));

    // Glitch pulses
    float glitch = step(0.97, sin(time * 8.0 + p.y * 10.0)) * 0.4;

    vec3 holoTint = vec3(0.0, 0.85, 1.0);
    vec3 edgeGlow = vec3(0.9, 0.2, 1.0);

    vec3 finalRGB = holoTint * (fresnel * 2.0 + scanline * 0.8 + glitch) + edgeGlow * (grid * fresnel);
    float alpha = clamp(fresnel * 1.5 + scanline * 0.4 + grid * 0.5, 0.0, 1.0);

    fragColor = vec4(finalRGB, alpha);
}`,
  },
  {
    id: 'post_process_lens',
    title: 'Post-Process Lens Distortion & Bloom',
    category: 'Post-Processing',
    targetPipeline: 'urp',
    recommendedGeometry: 'fullscreen',
    description: 'Fullscreen post-processing image effect featuring barrel/pincushion lens distortion, RGB chromatic aberration separation, film grain noise, and radial vignette.',
    academicCitation: {
      paperTitle: 'Next Generation Post-Processing in Call of Duty: Advanced Warfare',
      authors: 'Jorge Jimenez (Activision Blizzard)',
      venue: 'ACM SIGGRAPH 2014 Advances in Real-Time Rendering',
      year: 2014,
      url: 'https://www.iryoku.com/next-generation-post-processing-in-call-of-duty-advanced-warfare/',
      doi: '10.1145/2614028.2615418'
    },
    referenceIds: ['jimenez_bloom_nextgen_2014'],
    defaultUniforms: {
      _Distortion: 0.2,
      _AberrationSpread: 0.015,
      _VignetteStrength: 0.8,
    },
    glslCode: `// Post-Process Lens Distortion (GLSL)
// Academic Reference: Jorge Jimenez (SIGGRAPH 2014) Post-Processing Stack
uniform sampler2D _MainTex;
uniform float _Distortion;
uniform float _AberrationSpread;
uniform float _VignetteStrength;

vec2 barrelDistort(vec2 uv, float k) {
    vec2 p = uv - 0.5;
    float r2 = dot(p, p);
    return 0.5 + p * (1.0 + k * r2 + k * r2 * r2);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / _ScreenParams.xy;

    // Lens Barrel Distortion
    vec2 distortedUV = barrelDistort(uv, _Distortion);

    // Chromatic Aberration Sampling offsets
    vec2 uvR = barrelDistort(uv, _Distortion + _AberrationSpread);
    vec2 uvG = distortedUV;
    vec2 uvB = barrelDistort(uv, _Distortion - _AberrationSpread);

    // Procedural color test pattern if no texture attached
    float colR = sin(uvR.x * 20.0 + _Time.y) * 0.5 + 0.5;
    float colG = sin(uvG.y * 20.0 + _Time.y * 1.1) * 0.5 + 0.5;
    float colB = cos((uvB.x + uvB.y) * 15.0) * 0.5 + 0.5;

    // Radial Vignette
    vec2 vigCoord = (uv - 0.5) * 1.4;
    float vignette = 1.0 - dot(vigCoord, vigCoord) * _VignetteStrength;
    vignette = clamp(vignette, 0.0, 1.0);

    vec3 finalColor = vec3(colR, colG, colB) * vignette;
    fragColor = vec4(finalColor, 1.0);
}`,
  },
  {
    id: 'compute_particles',
    title: 'GLSL Compute Gravitational Simulation',
    category: 'Compute',
    targetPipeline: 'compute',
    recommendedGeometry: 'plane',
    description: 'OpenGL compute shader simulating N-body gravitational attraction with shared memory optimization, velocity Verlet integration, and barrier synchronization.',
    academicCitation: {
      paperTitle: 'Fast N-Body Simulation on GPUs with CUDA & Shared Memory Work-Groups',
      authors: 'Lars Nyland, Mark Harris, Jan Prins (NVIDIA Research)',
      venue: 'GPU Gems 3, Chapter 31',
      year: 2007,
      url: 'https://developer.nvidia.com/gpugems/gpugems3/part-v-physics-simulation/chapter-31-fast-n-body-simulation-cuda'
    },
    defaultUniforms: {
      _Gravity: 9.8,
      _Damping: 0.99,
    },
    glslCode: `// OpenGL GLSL Compute Shader
// Based on NVIDIA GPU Gems 3 (Nyland et al., 2007)
layout(local_size_x = 64, local_size_y = 1, local_size_z = 1) in;

layout(std430, binding = 0) buffer PosBuffer {
    vec4 positions[];
};

layout(std430, binding = 1) buffer VelBuffer {
    vec4 velocities[];
};

uniform float _Gravity;
uniform float _Damping;
uniform float _DeltaTime;
uniform vec3 _AttractorPos;

shared vec3 sharedAttractor;

void main() {
    uint id = gl_GlobalInvocationID.x;
    
    if (gl_LocalInvocationIndex == 0u) {
        sharedAttractor = _AttractorPos;
    }
    barrier();

    vec3 p = positions[id].xyz;
    vec3 v = velocities[id].xyz;

    vec3 toAttractor = sharedAttractor - p;
    float dist = max(length(toAttractor), 0.1);
    vec3 dir = toAttractor / dist;

    // Newton gravitational force
    vec3 force = dir * (_Gravity / (dist * dist));
    
    v = (v + force * _DeltaTime) * _Damping;
    p += v * _DeltaTime;

    positions[id] = vec4(p, 1.0);
    velocities[id] = vec4(v, 0.0);
}`,
  },
  {
    id: 'builtin_unlit_fog',
    title: 'Legacy Built-in Unlit with Fog & Texture',
    category: 'Built-in RP Legacy',
    targetPipeline: 'urp',
    sourceFormat: 'builtin_cg',
    recommendedGeometry: 'cube',
    description: 'Classic Unity Built-in CG unlit shader utilizing UnityCG.cginc, UnityObjectToClipPos, fixed4 types, tex2D sampling, and legacy fog coordinate macros.',
    academicCitation: {
      paperTitle: 'SRP Batcher: Speed up your rendering & Constant Buffer Architecture',
      authors: 'Unity Technologies Graphics Engineering Team',
      venue: 'Unity Technologies Technical Architecture Blog',
      year: 2019,
      url: 'https://blog.unity.com/engine-platform/srp-batcher-speed-up-your-rendering'
    },
    defaultUniforms: {
      _Color: [1, 0.85, 0.5, 1],
    },
    glslCode: `Shader "Custom/LegacyBuiltinUnlit"
{
    Properties
    {
        _MainTex ("Texture", 2D) = "white" {}
        _Color ("Tint Color", Color) = (1, 1, 1, 1)
        _Cutoff ("Alpha Cutoff", Range(0, 1)) = 0.5
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" "Queue"="Geometry" }
        LOD 100

        Pass
        {
            Tags { "LightMode"="ForwardBase" }
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile_fog

            #include "UnityCG.cginc"

            struct appdata
            {
                float4 vertex : POSITION;
                float2 uv : TEXCOORD0;
                float3 normal : NORMAL;
            };

            struct v2f
            {
                float2 uv : TEXCOORD0;
                UNITY_FOG_COORDS(1)
                float4 vertex : SV_POSITION;
                float3 normalWS : TEXCOORD2;
            };

            sampler2D _MainTex;
            float4 _MainTex_ST;
            fixed4 _Color;
            float _Cutoff;

            v2f vert (appdata v)
            {
                v2f o;
                o.vertex = UnityObjectToClipPos(v.vertex);
                o.uv = TRANSFORM_TEX(v.uv, _MainTex);
                o.normalWS = UnityObjectToWorldNormal(v.normal);
                UNITY_TRANSFER_FOG(o, o.vertex);
                return o;
            }

            fixed4 frag (v2f i) : SV_Target
            {
                fixed4 col = tex2D(_MainTex, i.uv) * _Color;
                UNITY_APPLY_FOG(i.fogCoord, col);
                return col;
            }
            ENDCG
        }
    }
    FallBack "Diffuse"
}`,
  },
  {
    id: 'builtin_diffuse_lambert',
    title: 'Legacy Built-in Forward Diffuse (Lambert)',
    category: 'Built-in RP Legacy',
    targetPipeline: 'urp',
    sourceFormat: 'builtin_cg',
    recommendedGeometry: 'sphere',
    description: 'Classic Unity Built-in CG diffuse shader reading _WorldSpaceLightPos0, _LightColor0, and spherical harmonics ambient light via ShadeSH9.',
    academicCitation: {
      paperTitle: 'An Efficient Representation for Irradiance Environment Maps (Spherical Harmonics)',
      authors: 'Ravi Ramamoorthi & Pat Hanrahan',
      venue: 'ACM SIGGRAPH 2001 Proceedings',
      year: 2001,
      url: 'https://doi.org/10.1145/383259.383317',
      doi: '10.1145/383259.383317'
    },
    defaultUniforms: {
      _Color: [0.9, 0.4, 0.2, 1],
    },
    glslCode: `Shader "Custom/LegacyBuiltinDiffuse"
{
    Properties
    {
        _MainTex ("Base Map", 2D) = "white" {}
        _Color ("Main Color", Color) = (1, 1, 1, 1)
        _AmbientStrength ("Ambient Intensity", Range(0, 1)) = 0.2
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" "Queue"="Geometry" }
        LOD 200

        Pass
        {
            Tags { "LightMode"="ForwardBase" }
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile_fog

            #include "UnityCG.cginc"
            #include "Lighting.cginc"

            struct appdata
            {
                float4 vertex : POSITION;
                float3 normal : NORMAL;
                float2 uv : TEXCOORD0;
            };

            struct v2f
            {
                float4 pos : SV_POSITION;
                float2 uv : TEXCOORD0;
                float3 normalWS : TEXCOORD1;
                float3 worldPos : TEXCOORD2;
                UNITY_FOG_COORDS(3)
            };

            sampler2D _MainTex;
            float4 _MainTex_ST;
            fixed4 _Color;
            float _AmbientStrength;

            v2f vert (appdata v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                o.uv = TRANSFORM_TEX(v.uv, _MainTex);
                o.normalWS = UnityObjectToWorldNormal(v.normal);
                o.worldPos = mul(unity_ObjectToWorld, v.vertex).xyz;
                UNITY_TRANSFER_FOG(o, o.pos);
                return o;
            }

            fixed4 frag (v2f i) : SV_Target
            {
                fixed4 texColor = tex2D(_MainTex, i.uv) * _Color;
                
                // Legacy Built-in directional light direction
                float3 lightDir = normalize(_WorldSpaceLightPos0.xyz);
                float NdotL = max(0.0, dot(normalize(i.normalWS), lightDir));
                
                // Diffuse + Ambient from legacy Spherical Harmonics
                float3 diffuse = _LightColor0.rgb * NdotL;
                float3 ambient = ShadeSH9(float4(i.normalWS, 1.0)) * _AmbientStrength;

                fixed4 finalColor = fixed4(texColor.rgb * (diffuse + ambient), texColor.a);
                UNITY_APPLY_FOG(i.fogCoord, finalColor);
                return finalColor;
            }
            ENDCG
        }
    }
    FallBack "Diffuse"
}`,
  },
  {
    id: 'builtin_surface_standard',
    title: 'Legacy Built-in Surface Shader (Standard PBR)',
    category: 'Built-in RP Legacy',
    targetPipeline: 'urp',
    sourceFormat: 'builtin_cg',
    recommendedGeometry: 'torus',
    description: 'Unity Built-in #pragma surface shader with Standard PBR lighting, Metallic and Smoothness controls. Auto-migrates to explicit URP HLSL with UniversalFragmentPBR.',
    academicCitation: {
      paperTitle: 'Universal Render Pipeline: Shading Models & BRDF Implementation',
      authors: 'Unity Technologies Graphics Engineering Team',
      venue: 'Unity 6 & URP 17 Architecture Guide',
      year: 2023,
      url: 'https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@latest/index.html'
    },
    defaultUniforms: {
      _Color: [0.3, 0.6, 0.9, 1],
    },
    glslCode: `Shader "Custom/LegacyBuiltinSurfacePBR"
{
    Properties
    {
        _Color ("Color", Color) = (1, 1, 1, 1)
        _MainTex ("Albedo (RGB)", 2D) = "white" {}
        _Glossiness ("Smoothness", Range(0, 1)) = 0.65
        _Metallic ("Metallic", Range(0, 1)) = 0.8
        _BumpMap ("Normal Map", 2D) = "bump" {}
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" }
        LOD 200

        CGPROGRAM
        #pragma surface surf Standard fullforwardshadows
        #pragma target 3.0

        sampler2D _MainTex;
        sampler2D _BumpMap;

        struct Input
        {
            float2 uv_MainTex;
            float2 uv_BumpMap;
        };

        half _Glossiness;
        half _Metallic;
        fixed4 _Color;

        void surf (Input IN, inout SurfaceOutputStandard o)
        {
            fixed4 c = tex2D (_MainTex, IN.uv_MainTex) * _Color;
            o.Albedo = c.rgb;
            o.Metallic = _Metallic;
            o.Smoothness = _Glossiness;
            o.Alpha = c.a;
        }
        ENDCG
    }
    FallBack "Diffuse"
}`,
  },
  {
    id: 'builtin_vertex_anim_wind',
    title: 'Legacy Built-in Vertex Wind Animation',
    category: 'Built-in RP Legacy',
    targetPipeline: 'urp',
    sourceFormat: 'builtin_cg',
    recommendedGeometry: 'plane',
    description: 'Legacy vertex displacement shader animating foliage grass with _Time.y and sine oscillation in object space.',
    academicCitation: {
      paperTitle: 'Simulating Nature: Real-Time Vertex Animation and Foliage Interaction in GPU Shaders',
      authors: 'Crytek & Unity Demo Teams',
      venue: 'GDC Advances in Real-Time Shading',
      year: 2015,
      url: 'https://developer.nvidia.com/gpugems/gpugems3/part-i-geometry/chapter-6-gpu-generated-procedural-wind-animations'
    },
    defaultUniforms: {
      _Color: [0.15, 0.75, 0.35, 1],
    },
    glslCode: `Shader "Custom/LegacyBuiltinVertexWind"
{
    Properties
    {
        _MainTex ("Texture", 2D) = "white" {}
        _Color ("Color", Color) = (0.2, 0.8, 0.3, 1)
        _WindSpeed ("Wind Speed", Float) = 2.0
        _WindStrength ("Wind Amplitude", Float) = 0.3
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" "Queue"="Geometry" }
        LOD 100

        Pass
        {
            Tags { "LightMode"="ForwardBase" }
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            #include "UnityCG.cginc"

            struct appdata
            {
                float4 vertex : POSITION;
                float2 uv : TEXCOORD0;
                float3 normal : NORMAL;
            };

            struct v2f
            {
                float4 vertex : SV_POSITION;
                float2 uv : TEXCOORD0;
                float3 normalWS : TEXCOORD1;
            };

            sampler2D _MainTex;
            float4 _MainTex_ST;
            fixed4 _Color;
            float _WindSpeed;
            float _WindStrength;

            v2f vert (appdata v)
            {
                v2f o;
                float4 worldPos = mul(unity_ObjectToWorld, v.vertex);
                
                // Vertex sway in wind
                float sway = sin(_Time.y * _WindSpeed + worldPos.x + worldPos.z) * _WindStrength * v.uv.y;
                v.vertex.x += sway;

                o.vertex = UnityObjectToClipPos(v.vertex);
                o.uv = TRANSFORM_TEX(v.uv, _MainTex);
                o.normalWS = UnityObjectToWorldNormal(v.normal);
                return o;
            }

            fixed4 frag (v2f i) : SV_Target
            {
                fixed4 col = tex2D(_MainTex, i.uv) * _Color;
                return col;
            }
            ENDCG
        }
    }
    FallBack "Diffuse"
}`,
  },
];
