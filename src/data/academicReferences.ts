export interface AcademicReference {
  id: string;
  title: string;
  author: string;
  year: number;
  publication: string;
  category: 'PBR & Lighting' | 'Raymarching & SDF' | 'Noise & Procedural' | 'Post-Processing & Bloom' | 'Atmospheric & Volumetrics' | 'Unity Engine & SRP';
  abstract: string;
  doiOrUrl?: string;
  keyContributions: string[];
  impactOnRealtimeGraphics: string;
  recommendedShaderPresets: string[]; // references shader preset IDs
  bibtex: string;
}

export const ACADEMIC_REFERENCES: AcademicReference[] = [
  {
    id: 'cook_torrance_1982',
    title: 'A Reflectance Model for Computer Graphics',
    author: 'Robert L. Cook & Kenneth E. Torrance',
    year: 1982,
    publication: 'ACM Transactions on Graphics (TOG) / SIGGRAPH',
    category: 'PBR & Lighting',
    abstract: 'Introduced the microfacet specular reflectance theory to computer graphics, modeling surfaces as collections of randomly oriented mirror-like microfacets. Formulated the Cook-Torrance BRDF with Geometric Shadowing-Masking (G), Fresnel Reflection (F), and Microfacet Normal Distribution (D).',
    doiOrUrl: 'https://doi.org/10.1145/357290.357293',
    keyContributions: [
      'Microfacet theory formulation: D(h) * F(v,h) * G(l,v,h) / (4 * (n·l) * (n·v))',
      'Fresnel reflectance approximation based on wavelength and angle of incidence',
      'Geometrical attenuation factor accounting for self-shadowing and masking'
    ],
    impactOnRealtimeGraphics: 'The foundational bedrock of modern Real-Time Physically Based Rendering (PBR) in Unity URP, HDRP, Unreal Engine 5, and Frostbite.',
    recommendedShaderPresets: ['pbr_metallic_roughness', 'glass_dispersion_refraction', 'liquid_bubble_iridescence'],
    bibtex: `@article{cook1982reflectance,
  title={A reflectance model for computer graphics},
  author={Cook, Robert L and Torrance, Kenneth E},
  journal={ACM Transactions on Graphics (TOG)},
  volume={1},
  number={1},
  pages={7--24},
  year={1982},
  publisher={ACM New York, NY, USA}
}`
  },
  {
    id: 'walter_ggx_2007',
    title: 'Microfacet Models for Refraction through Rough Surfaces (GGX Distribution)',
    author: 'Bruce Walter, Stephen R. Marschner, Hongsong Li, Kenneth E. Torrance',
    year: 2007,
    publication: 'Eurographics Symposium on Rendering (EGSR)',
    category: 'PBR & Lighting',
    abstract: 'Derived the GGX (Trowbridge-Reitz) normal distribution function with heavy-tailed highlight decay for rough surfaces, solving the artificial cutoff of Beckmann and Blinn-Phong distributions.',
    doiOrUrl: 'https://doi.org/10.2312/EGWR/EGSR07/195-206',
    keyContributions: [
      'Formulation of the GGX Normal Distribution Function (NDF)',
      'Smith joint shadowing-masking function tailored for GGX',
      'Realistic specular tails matching real-world metallic and dielectric lab measurements'
    ],
    impactOnRealtimeGraphics: 'GGX is the official standard specular distribution used in Unity URP Lit, HDRP, glTF 2.0 PBR, and MaterialX standard surface.',
    recommendedShaderPresets: ['pbr_metallic_roughness', 'glass_dispersion_refraction'],
    bibtex: `@inproceedings{walter2007microfacet,
  title={Microfacet models for refraction through rough surfaces},
  author={Walter, Bruce and Marschner, Stephen R and Li, Hongsong and Torrance, Kenneth E},
  booktitle={Proceedings of the 18th Eurographics conference on Rendering Techniques},
  pages={195--206},
  year={2007}
}`
  },
  {
    id: 'hart_sphere_tracing_1996',
    title: 'Sphere Tracing: A Geometric Method for the Antialiased Ray Tracing of Implicit Surfaces',
    author: 'John C. Hart',
    year: 1996,
    publication: 'The Visual Computer / Springer',
    category: 'Raymarching & SDF',
    abstract: 'Introduced the Sphere Tracing algorithm for implicit signed distance fields (SDFs). Rather than stepping fixed distances, rays advance by the safe distance returned by the distance estimator without intersecting geometry.',
    doiOrUrl: 'https://doi.org/10.1007/s003710050084',
    keyContributions: [
      'Safe step-length bound defined by Lipschitz continuity: step = f(p)',
      'Guaranteed ray progression without over-stepping geometry boundaries',
      'Tetrahedron normal estimation using finite differences in 4 gradient evaluations'
    ],
    impactOnRealtimeGraphics: 'Allowed GPU real-time raymarching of complex procedural fractals, Mandelbulbs, metaballs, and Shadertoy SDF worlds in single fragment passes.',
    recommendedShaderPresets: ['sdf_raymarching', 'volumetric_nebula', 'quantum_matrix_grid'],
    bibtex: `@article{hart1996sphere,
  title={Sphere tracing: A geometric method for the antialiased ray tracing of implicit surfaces},
  author={Hart, John C},
  journal={The Visual Computer},
  volume={12},
  number={10},
  pages={527--545},
  year={1996},
  publisher={Springer}
}`
  },
  {
    id: 'perlin_simplex_noise_2001',
    title: 'Improving Noise (Simplex Noise & Higher Dimensional Coherent Noise)',
    author: 'Ken Perlin',
    year: 2001,
    publication: 'ACM SIGGRAPH Computer Graphics',
    category: 'Noise & Procedural',
    abstract: 'Replaced Classic 1985 Perlin Noise with Simplex Noise on a tetrahedral simplicial lattice, reducing algorithmic complexity from O(2^N) to O(N^2) in N dimensions and eliminating directional grid artifacts.',
    doiOrUrl: 'https://doi.org/10.1145/383259.383260',
    keyContributions: [
      'Simplicial lattice coordinate tiling reducing ALU instructions by 60%',
      'Elimination of square / cubic bias in 3D and 4D procedural textures',
      'Hardware-friendly derivative evaluation for procedural terrain normal generation'
    ],
    impactOnRealtimeGraphics: 'Simplex and Curl noise power modern procedural terrains, fire effects, fluid advection, and VFX in games and film.',
    recommendedShaderPresets: ['voronoi_caustics', 'volumetric_nebula', 'cyberpunk_glitch_grid'],
    bibtex: `@inproceedings{perlin2002improving,
  title={Improving noise},
  author={Perlin, Ken},
  booktitle={ACM Transactions on Graphics (TOG)},
  volume={21},
  number={3},
  pages={681--682},
  year={2002},
  organization={ACM}
}`
  },
  {
    id: 'karis_epic_pbr_2013',
    title: 'Real Shading in Unreal Engine 4 (Split-Sum Approximation for IBL)',
    author: 'Brian Karis (Epic Games)',
    year: 2013,
    publication: 'SIGGRAPH Physically Based Shading Course',
    category: 'PBR & Lighting',
    abstract: 'Introduced the Split-Sum Approximation to solve the real-time Image-Based Lighting (IBL) environment reflection integral on mobile and console hardware in real-time without Monte Carlo sampling.',
    doiOrUrl: 'https://cdn2.unrealengine.com/Resources/files/2013SiggraphPresentationsNotes-26915738.pdf',
    keyContributions: [
      'Split-Sum approximation: Int[Li * BRDF] ~= Int[Li] * Int[BRDF]',
      'Pre-filtered Environment Map filtered with GGX at varying roughness MIPs',
      'Pre-integrated 2D LUT storing (Scale, Bias) parameterized by Roughness and NoV'
    ],
    impactOnRealtimeGraphics: 'Adopted universally across the games industry, including Unity URP/HDRP Reflection Probes and standard PBR pipelines.',
    recommendedShaderPresets: ['pbr_metallic_roughness', 'glass_dispersion_refraction'],
    bibtex: `@inproceedings{karis2013real,
  title={Real shading in unreal engine 4},
  author={Karis, Brian},
  booktitle={Proc. Physically Based Shading Theory Practice},
  volume={4},
  number={3},
  pages={1},
  year={2013}
}`
  },
  {
    id: 'jimenez_bloom_nextgen_2014',
    title: 'Next Generation Post-Processing in Call of Duty: Advanced Warfare (Dual Kawase Filtering)',
    author: 'Jorge Jimenez (Activision Blizzard)',
    year: 2014,
    publication: 'SIGGRAPH 2014 Advances in Real-Time Rendering',
    category: 'Post-Processing & Bloom',
    abstract: 'Engineered high-performance cinematic post-processing techniques, including 13-tap tent downsampling and progressive dual-filtering for HDR bloom without temporal flickering or high bandwidth costs.',
    doiOrUrl: 'https://www.iryoku.com/next-generation-post-processing-in-call-of-duty-advanced-warfare/',
    keyContributions: [
      '13-tap bilateral downsample anti-flicker kernel',
      'Progressive Gaussian / Kawase pyramid upsampling',
      'Physically motivated energy conservation in HDR bloom thresholds'
    ],
    impactOnRealtimeGraphics: 'Directly powers the Bloom post-processing pass inside Unity URP and HDRP Post-Processing Stack.',
    recommendedShaderPresets: ['hologram_scanner_vfx', 'quantum_matrix_grid'],
    bibtex: `@inproceedings{jimenez2014next,
  title={Next generation post-processing in Call of Duty: Advanced Warfare},
  author={Jimenez, Jorge},
  booktitle={ACM SIGGRAPH 2014 Courses},
  pages={1--71},
  year={2014}
}`
  },
  {
    id: 'quilez_distance_functions_2008',
    title: '3D Distance Functions, Raymarching & Smooth Minima Operations',
    author: 'Inigo Quilez (Shadertoy Co-Creator & Pixar)',
    year: 2008,
    publication: 'Inigo Quilez Articles & Computer Graphics Research',
    category: 'Raymarching & SDF',
    abstract: 'Systematically categorized exact signed distance field (SDF) formulas for primitives (spheres, boxes, capsules, tori, prisms) and continuous smooth blending operations (smin/smax polynomial smoothly merged unions).',
    doiOrUrl: 'https://iquilezles.org/articles/distfunctions/',
    keyContributions: [
      'Polynomial and exponential Smooth Minimum (smin) formulas for organic blending',
      'Exact distance formulas for 40+ geometric primitives',
      'Fast analytic ambient occlusion and soft shadow approximation for raymarchers'
    ],
    impactOnRealtimeGraphics: 'Created the mathematical foundation for hundreds of thousands of shaders on Shadertoy and procedural geometry engines.',
    recommendedShaderPresets: ['sdf_raymarching', 'liquid_bubble_iridescence'],
    bibtex: `@misc{quilez2008distfunctions,
  title={3D distance functions and raymarching techniques},
  author={Quilez, Inigo},
  year={2008},
  url={https://iquilezles.org/articles/distfunctions/}
}`
  },
  {
    id: 'hillaire_volumetric_clouds_2016',
    title: 'Physically Based Sky, Atmosphere and Cloud Rendering in Frostbite',
    author: 'Sébastien Hillaire (Electronic Arts Frostbite)',
    year: 2016,
    publication: 'SIGGRAPH 2016 Courses: Physically Based Shading in Theory and Practice',
    category: 'Atmospheric & Volumetrics',
    abstract: 'Derived real-time multiscattering approximations for participating media, integrating Rayleigh and Mie phase functions, optical depth Beer-Lambert extinction, and Powder sugar effects in atmospheric clouds.',
    doiOrUrl: 'https://doi.org/10.1145/2929464.2929474',
    keyContributions: [
      'Multi-scattering Beer-Powder approximation: T(d) = exp(-d) * (1.0 - exp(-2.0*d))',
      'Henyey-Greenstein dual-lobe forward/backward scattering phase function',
      'Temporal raymarching with 3D Worley-Perlin noise tiling'
    ],
    impactOnRealtimeGraphics: 'Adopted in Unity HDRP Volumetric Clouds and URP Custom Render Pass atmospheric renderers.',
    recommendedShaderPresets: ['volumetric_nebula'],
    bibtex: `@inproceedings{hillaire2016physically,
  title={Physically based sky, atmosphere and cloud rendering in Frostbite},
  author={Hillaire, S{\'e}bastien},
  booktitle={ACM SIGGRAPH 2016 Courses},
  pages={1--12},
  year={2016}
}`
  }
];
