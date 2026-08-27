import { ShaderSnippet } from '../types';

export const BUILTIN_SHADER_SNIPPETS: ShaderSnippet[] = [
  // ==========================================
  // NOISE FUNCTIONS
  // ==========================================
  {
    id: 'simplex-noise-2d',
    title: 'Simplex Noise 2D',
    category: 'noise',
    description: 'Fast, artifact-free 2D Simplex Noise by Ian McEwan / Ashima Arts. Ideal for terrain, fire, and organic textures.',
    tags: ['noise', 'simplex', 'procedural', 'ashima', '2d'],
    author: 'Ashima Arts / Ian McEwan',
    usageExample: 'float n = snoise(uv * 4.0);',
    code: `// 2D Simplex Noise by Ian McEwan, Ashima Arts
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                        0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                       -0.577350269189626,  // -1.0 + 2.0 * C.x
                        0.024390243902439); // 1.0 / 41.0
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}`
  },
  {
    id: 'fbm-fractal-noise-2d',
    title: 'Fractal Brownian Motion (fBm) 2D',
    category: 'noise',
    description: 'Multi-octave layered turbulence/fBm based on 2D value noise. Generates clouds, smoke, marble, and terrain elevation.',
    tags: ['noise', 'fbm', 'fractal', 'clouds', 'octaves'],
    author: 'Inigo Quilez',
    usageExample: 'float cloud = fbm(uv * 3.0, 5);',
    code: `// 2D Value Noise & Fractal Brownian Motion (fBm)
float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float valueNoise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    // Cubic Hermite Interpolation (smoothstep)
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash21(i + vec2(0.0, 0.0)), hash21(i + vec2(1.0, 0.0)), u.x),
        mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
        u.y
    );
}

float fbm(vec2 st, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    
    for (int i = 0; i < 6; i++) {
        if (i >= octaves) break;
        value += amplitude * valueNoise(st * frequency);
        st = rot * st * 2.0 + vec2(100.0);
        amplitude *= 0.5;
    }
    return value;
}`
  },
  {
    id: 'voronoi-cellular-noise',
    title: 'Voronoi / Cellular Noise 2D',
    category: 'noise',
    description: 'Cellular distance noise returning closest point distance (F1) and second closest (F2). Perfect for water caustics, scales, and crystals.',
    tags: ['voronoi', 'worley', 'cellular', 'caustics', 'crystals'],
    author: 'Steven Worley / Inigo Quilez',
    usageExample: 'vec2 cells = voronoi(uv * 5.0); float borders = cells.y - cells.x;',
    code: `// Voronoi / Cellular 2D (Returns vec2(F1, F2))
vec2 hash22(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453123);
}

vec2 voronoi(vec2 p) {
    vec2 n = floor(p);
    vec2 f = fract(p);
    float f1 = 8.0;
    float f2 = 8.0;

    for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
            vec2 g = vec2(float(i), float(j));
            vec2 o = hash22(n + g);
            // Animate jitter over time if desired: o = 0.5 + 0.5 * sin(iTime + 6.2831 * o);
            vec2 r = g + o - f;
            float d = dot(r, r);

            if (d < f1) {
                f2 = f1;
                f1 = d;
            } else if (d < f2) {
                f2 = d;
            }
        }
    }
    return vec2(sqrt(f1), sqrt(f2));
}`
  },
  {
    id: 'classic-perlin-noise-3d',
    title: 'Classic Perlin Noise 3D',
    category: 'noise',
    description: '3D gradient noise for volumetric clouds, 3D space effects, and marble textures without texture lookups.',
    tags: ['noise', 'perlin', '3d', 'volumetric', 'gradients'],
    author: 'Stefan Gustavson',
    usageExample: 'float n = cnoise3D(worldPos * 0.5);',
    code: `// 3D Classic Perlin Noise by Stefan Gustavson
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec3 fade(vec3 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

float cnoise3D(vec3 P) {
    vec3 Pi0 = floor(P); // Integer part for indexing
    vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
    Pi0 = mod289(vec4(Pi0, 0.0)).xyz;
    Pi1 = mod289(vec4(Pi1, 0.0)).xyz;
    vec3 Pf0 = fract(P); // Fractional part for interpolation
    vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = vec4(Pi0.z);
    vec4 iz1 = vec4(Pi1.z);

    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);

    vec4 gx0 = ixy0 * (1.0 / 7.0);
    vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);

    vec4 gx1 = ixy1 * (1.0 / 7.0);
    vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);

    vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
    vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
    vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
    vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
    vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
    vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
    vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
    vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);

    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x; g010 *= norm0.y; g100 *= norm0.z; g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x; g011 *= norm1.y; g101 *= norm1.z; g111 *= norm1.w;

    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
    float n111 = dot(g111, Pf1);

    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
    return 2.2 * n_xyz;
}`
  },

  // ==========================================
  // COLOR BLENDING & COLOR SPACE
  // ==========================================
  {
    id: 'photoshop-blend-modes',
    title: 'Photoshop Blend Modes Suite',
    category: 'blending',
    description: 'Complete suite of Photoshop-style blending functions: Screen, Overlay, Color Dodge, Soft Light, Multiply, and Linear Dodge (Add).',
    tags: ['photoshop', 'blending', 'screen', 'overlay', 'colordodge', 'multiply'],
    author: 'Romain Dura / UniShader',
    usageExample: 'vec3 composite = blendOverlay(baseColor, glowColor);',
    code: `// Photoshop Blending Modes (Base = Destination, Blend = Source)
vec3 blendMultiply(vec3 base, vec3 blend) {
    return base * blend;
}

vec3 blendScreen(vec3 base, vec3 blend) {
    return 1.0 - ((1.0 - base) * (1.0 - blend));
}

vec3 blendOverlay(vec3 base, vec3 blend) {
    return mix(
        2.0 * base * blend,
        1.0 - 2.0 * (1.0 - base) * (1.0 - blend),
        step(0.5, base)
    );
}

vec3 blendColorDodge(vec3 base, vec3 blend) {
    return base / max(vec3(0.0001), 1.0 - blend);
}

vec3 blendSoftLight(vec3 base, vec3 blend) {
    return mix(
        2.0 * base * blend + base * base * (1.0 - 2.0 * blend),
        sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend),
        step(0.5, blend)
    );
}

vec3 blendHardLight(vec3 base, vec3 blend) {
    return blendOverlay(blend, base);
}

vec3 blendLinearDodge(vec3 base, vec3 blend) {
    return min(base + blend, vec3(1.0));
}`
  },
  {
    id: 'rgb-hsv-converter',
    title: 'RGB ↔ HSV Color Converter',
    category: 'color',
    description: 'Accurate branchless RGB to HSV and HSV to RGB conversions. Essential for hue shifting, rainbow gradients, and saturation modulation.',
    tags: ['color', 'hsv', 'rgb', 'hue', 'saturation', 'color-space'],
    author: 'Sam Hocevar / Inigo Quilez',
    usageExample: 'vec3 hsv = rgb2hsv(col); hsv.x += 0.2; vec3 shiftedCol = hsv2rgb(hsv);',
    code: `// Fast Branchless RGB <-> HSV Conversions
vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}`
  },
  {
    id: 'aces-filmic-tonemapping',
    title: 'ACES Filmic Tonemapping Curve',
    category: 'color',
    description: 'Narkowicz / Hill curve approximation of the Academy Color Encoding System (ACES) filmic tonemapper for cinematic HDR range compression.',
    tags: ['aces', 'tonemapping', 'hdr', 'cinematic', 'filmic'],
    author: 'Krzysztof Narkowicz',
    usageExample: 'vec3 ldrColor = acesTonemap(hdrColor);',
    code: `// ACES Filmic Tonemapping (Narkowicz curve approximation)
vec3 acesTonemap(vec3 x) {
    const float a = 2.51;
    const float b = 0.03;
    const float c = 2.43;
    const float d = 0.59;
    const float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

// Luminance extraction (Rec. 709 HDTV standard)
float getLuminance(vec3 color) {
    return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

// Contrast & Saturation Adjustment
vec3 adjustColor(vec3 color, float contrast, float saturation, float brightness) {
    // Brightness
    color *= brightness;
    // Saturation
    float lum = getLuminance(color);
    color = mix(vec3(lum), color, saturation);
    // Contrast
    color = (color - 0.5) * contrast + 0.5;
    return max(color, vec3(0.0));
}`
  },
  {
    id: 'bayer-matrix-dither',
    title: 'Bayer 4x4 Matrix Dithering (Retro / PSX)',
    category: 'color',
    description: 'Ordered Bayer 4x4 matrix threshold generator for stylized pixel-art, PS1 retro graphics, and ordered alpha-test dithering.',
    tags: ['dither', 'bayer', 'retro', 'pixelart', 'psx', 'ordered-dither'],
    author: 'UniShader Library',
    usageExample: 'float threshold = bayer4x4(gl_FragCoord.xy); if (alpha < threshold) discard;',
    code: `// Bayer 4x4 Matrix Ordered Dithering
float bayer4x4(vec2 screenPos) {
    const mat4 bayer = mat4(
         0.0, 12.0,  3.0, 15.0,
         8.0,  4.0, 11.0,  7.0,
         2.0, 14.0,  1.0, 13.0,
        10.0,  6.0,  9.0,  5.0
    ) / 16.0;
    
    int x = int(mod(screenPos.x, 4.0));
    int y = int(mod(screenPos.y, 4.0));
    
    if (x == 0) return (y == 0) ? bayer[0][0] : (y == 1) ? bayer[0][1] : (y == 2) ? bayer[0][2] : bayer[0][3];
    if (x == 1) return (y == 0) ? bayer[1][0] : (y == 1) ? bayer[1][1] : (y == 2) ? bayer[1][2] : bayer[1][3];
    if (x == 2) return (y == 0) ? bayer[2][0] : (y == 1) ? bayer[2][1] : (y == 2) ? bayer[2][2] : bayer[2][3];
    return (y == 0) ? bayer[3][0] : (y == 1) ? bayer[3][1] : (y == 2) ? bayer[3][2] : bayer[3][3];
}`
  },

  // ==========================================
  // SIGNED DISTANCE FIELDS (SDF 2D & 3D)
  // ==========================================
  {
    id: 'sdf-2d-primitives-collection',
    title: '2D Signed Distance Fields (SDF Primitives)',
    category: 'sdf',
    description: 'Essential 2D SDF functions: Circle, Box, Rounded Box, Segment (Capsule 2D), and Equilateral Triangle.',
    tags: ['sdf', '2d', 'raymarching', 'primitives', 'inigo-quilez'],
    author: 'Inigo Quilez',
    usageExample: 'float d = sdRoundedBox(p, vec2(0.5, 0.3), vec4(0.1));',
    code: `// 2D Signed Distance Field (SDF) Primitives by Inigo Quilez
float sdCircle(vec2 p, float r) {
    return length(p) - r;
}

float sdBox(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

float sdRoundedBox(vec2 p, vec2 b, vec4 r) {
    r.xy = (p.x > 0.0) ? r.xy : r.zw;
    r.x  = (p.y > 0.0) ? r.x  : r.y;
    vec2 q = abs(p) - b + r.x;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r.x;
}

float sdSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

float sdHexagon(vec2 p, float r) {
    const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
    p = abs(p);
    p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
    p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
    return length(p) * sign(p.y);
}`
  },
  {
    id: 'sdf-3d-primitives-and-raymarching',
    title: '3D SDF Primitives & Normal Estimator',
    category: 'sdf',
    description: '3D Sphere, Box, Torus, Cylinder distance estimators, plus central-difference normal vector estimator for 3D raymarching.',
    tags: ['sdf', '3d', 'raymarching', 'torus', 'sphere', 'normals'],
    author: 'Inigo Quilez',
    usageExample: 'vec3 normal = calcNormal3D(hitPos);',
    code: `// 3D SDF Primitives
float sdSphere(vec3 p, float s) {
    return length(p) - s;
}

float sdBox3D(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
}

float sdCappedCylinder(vec3 p, float h, float r) {
    vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

// Global scene distance query prototype: replace with your scene geometry
float mapScene(vec3 p) {
    return sdTorus(p, vec2(0.8, 0.25));
}

// 3D Normal estimation via tetrahedron technique
vec3 calcNormal3D(vec3 p) {
    const float eps = 0.001;
    const vec2 h = vec2(eps, 0.0);
    return normalize(vec3(
        mapScene(p + h.xyy) - mapScene(p - h.xyy),
        mapScene(p + h.yxy) - mapScene(p - h.yxy),
        mapScene(p + h.yyx) - mapScene(p - h.yyx)
    ));
}`
  },
  {
    id: 'sdf-smooth-boolean-ops',
    title: 'SDF Boolean & Smooth Minimum (smin)',
    category: 'sdf',
    description: 'Polynomial & exponential smooth union, subtraction, and intersection operators for organic blending between shapes.',
    tags: ['sdf', 'smin', 'smooth-union', 'booleans', 'organic', 'blending'],
    author: 'Inigo Quilez',
    usageExample: 'float d = opSmoothUnion(dSphere, dBox, 0.15);',
    code: `// SDF Boolean & Smooth Operations
// Standard sharp booleans
float opUnion(float d1, float d2) { return min(d1, d2); }
float opSubtract(float d1, float d2) { return max(-d1, d2); }
float opIntersect(float d1, float d2) { return max(d1, d2); }

// Polynomial Smooth Minimum (Quadratic blend, k = smoothing radius)
float opSmoothUnion(float d1, float d2, float k) {
    float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
    return mix(d2, d1, h) - k * h * (1.0 - h);
}

float opSmoothSubtract(float d1, float d2, float k) {
    float h = clamp(0.5 - 0.5 * (d2 + d1) / k, 0.0, 1.0);
    return mix(d2, -d1, h) + k * h * (1.0 - h);
}

float opSmoothIntersect(float d1, float d2, float k) {
    float h = clamp(0.5 - 0.5 * (d2 - d1) / k, 0.0, 1.0);
    return mix(d2, d1, h) + k * h * (1.0 - h);
}

// Domain repetition for infinite grid structures
vec3 opRepetition(vec3 p, vec3 spacing) {
    return mod(p + 0.5 * spacing, spacing) - 0.5 * spacing;
}`
  },

  // ==========================================
  // UV MAPPING & PROCEDURAL MATH
  // ==========================================
  {
    id: 'uv-transformation-suite',
    title: 'UV Transformations & 2D Rotation',
    category: 'uv_math',
    description: 'Matrix 2D rotations, centered aspect-ratio correction, polar coordinates, and smooth pulse band generators.',
    tags: ['uv', 'rotation', 'polar', 'aspect-ratio', 'matrix', 'math'],
    author: 'UniShader Library',
    usageExample: 'vec2 rotUV = rot2D(iTime * 0.5) * (uv - 0.5) + 0.5;',
    code: `// 2D Rotation matrix
mat2 rot2D(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2(c, -s, s, c);
}

// Aspect-ratio normalized centered UV (Coordinates range [-1, 1] on smaller axis)
vec2 getAspectUV(vec2 fragCoord, vec2 resolution) {
    return (fragCoord - 0.5 * resolution) / min(resolution.x, resolution.y);
}

// Convert Cartesian UVs to Polar Coordinates: vec2(radius, angle [0..1])
vec2 cartToPolar(vec2 uv, vec2 center) {
    vec2 delta = uv - center;
    float radius = length(delta);
    float angle = atan(delta.y, delta.x) / (2.0 * 3.14159265359) + 0.5;
    return vec2(radius, angle);
}

// Smooth Pulse Generator (1.0 between edge0 and edge1 with soft falloff)
float pulse(float edge0, float edge1, float falloff, float x) {
    return smoothstep(edge0 - falloff, edge0, x) - smoothstep(edge1, edge1 + falloff, x);
}`
  },
  {
    id: 'hexagonal-tiling-grid',
    title: 'Hexagonal Grid Tiling UVs',
    category: 'uv_math',
    description: 'Splits 2D coordinates into a seamless hexagonal tile grid with local cell UV coordinates and discrete hex cell ID.',
    tags: ['hex', 'hexagonal', 'grid', 'tiling', 'procedural', 'uv'],
    author: 'Martijn Steinrucken (The Art of Code)',
    usageExample: 'vec4 hex = hexGrid(uv * 6.0); // hex.xy = local UV, hex.zw = cell ID',
    code: `// Hexagonal Grid Coordinates
// Returns vec4(local_uv.x, local_uv.y, hex_id.x, hex_id.y)
vec4 hexGrid(vec2 uv) {
    vec2 r = vec2(1.0, 1.7320508); // 1.0, sqrt(3)
    vec2 h = r * 0.5;
    vec2 a = mod(uv, r) - h;
    vec2 b = mod(uv - h, r) - h;
    
    vec2 gv = dot(a, a) < dot(b, b) ? a : b;
    vec2 id = uv - gv;
    return vec4(gv.x, gv.y, id.x, id.y);
}`
  },

  // ==========================================
  // LIGHTING & VFX
  // ==========================================
  {
    id: 'fresnel-schlick-and-rim',
    title: 'Fresnel Schlick & Stylized Rim Light',
    category: 'lighting',
    description: 'Physically inspired Schlick Fresnel approximation and customizable stylized anime/sci-fi rim glow.',
    tags: ['fresnel', 'rim', 'lighting', 'schlick', 'glow', 'stylized'],
    author: 'UniShader Library',
    usageExample: 'vec3 rim = calculateRimLight(normal, viewDir, vec3(0.2, 0.6, 1.0), 3.0);',
    code: `// Fresnel Schlick Equation
vec3 fresnelSchlick(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

// Stylized Sci-Fi / Anime Rim Glow
vec3 calculateRimLight(vec3 normal, vec3 viewDir, vec3 rimColor, float rimPower) {
    float NdotV = 1.0 - max(0.0, dot(normal, viewDir));
    float rimIntensity = smoothstep(0.0, 1.0, pow(NdotV, rimPower));
    return rimColor * rimIntensity;
}

// Spherical Environment Mapping (MatCap) UV Coordinate
vec2 getMatCapUV(vec3 normalWorld, mat4 viewMatrix) {
    vec3 normalView = normalize((viewMatrix * vec4(normalWorld, 0.0)).xyz);
    return normalView.xy * 0.5 + 0.5;
}`
  }
];
