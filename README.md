# Shader Converter (GLSL / Built-in RP to Unity URP & HDRP)

> **Disclaimer:** This project was created **strictly for educational and learning purposes**. It serves as an interactive playground and study tool for exploring computer graphics pipeline architectures, GLSL/HLSL syntax translations, abstract syntax tree (AST) code migrations, and modern Scriptable Render Pipeline (SRP) batching principles in Unity.

---

## 🌟 Overview

**Shader Converter** is a modern, client-side web application designed to help graphics programmers, technical artists, and game development students understand and automate the migration of shaders from legacy environments to modern Unity Scriptable Render Pipelines (URP & HDRP).

It provides complete, deterministic transpilation for:
1. **OpenGL / GLSL (Fragment & Vertex)** ➔ **Unity URP / HDRP HLSL**
2. **Unity Legacy Built-in RP (`CGPROGRAM` / Surface Shaders)** ➔ **Unity URP / HDRP HLSL**

---

## 🚀 Key Features

### 1. 🔄 Multi-Mode Shader Transpiler
- **Deterministic AST Parser**: Converts shader code locally without external API dependencies.
- **SRP Batcher Compatibility**: Automatically groups uniforms into the `UnityPerMaterial` constant buffer (`CBUFFER_START(UnityPerMaterial)` / `CBUFFER_END`), checking for float4 alignment and padding requirements.
- **Texture & Sampler Separation**: Automatically upgrades legacy single-handle samplers (`sampler2D`, `tex2D`) to modern API-efficient split handles (`TEXTURE2D(_MainTex)`, `SAMPLER(sampler_MainTex)`, `SAMPLE_TEXTURE2D(...)`).
- **Coordinate & Clip-Space Correction**: Handles differences in NDC coordinate spaces (Y-flip, Z depth range [0, 1] vs [-1, 1], and stereoscopic eye rendering).
- **Shadow Caster Pass Generation**: Synthesizes a compliant URP `ShadowCaster` pass with depth bias and normal offset compensation.

### 2. ⚡ Real-Time WebGL Preview Playground
- Render shaders live directly in the browser canvas using WebGL.
- Adjust procedural animation parameters (`_Time`, `_Resolution`, mouse interaction) with immediate feedback.

### 3. 🔍 Cross-Pipeline Function Search Matrix
- Comprehensive lookup index comparing math functions, texture sampling, matrix transformations, lighting variables, and built-in uniforms across:
  - **GLSL**
  - **Unity Built-in RP (CG / HLSL)**
  - **Unity Universal Render Pipeline (URP)**
  - **Unity High Definition Render Pipeline (HDRP)**
  - **Unity Shader Graph Custom Nodes**

### 4. 🧩 Custom Node Studio (Shader Graph)
- Generate custom HLSL code blocks formatted specifically for Unity Shader Graph `Custom Function` nodes (supporting both `.hlsl` files and string body modes).

### 5. 📊 SRP Batcher & Performance Profiler
- Static analysis of shader code evaluating:
  - SRP Batcher readiness score.
  - Estimated ALU instruction count and math complexity.
  - Texture fetch register pressure.
  - Branching and conditional penalties on mobile GPUs.

### 6. 📦 One-Click Unity Asset Export
- Bundle converted shaders, material presets, documentation, and metadata into a ready-to-import `.zip` file for Unity projects.

---

## 🛠️ Technology Stack

- **Framework**: React 18 with TypeScript
- **Bundler**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Zip Compression**: JSZip
- **Server**: Express (Development & Static Asset Serving)

---

## 💻 Getting Started

### Prerequisites
- Node.js (v18 or newer recommended)
- npm or yarn

### Installation

```bash
# Clone or extract repository
git clone <repository-url>
cd shader-converter

# Install project dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`.

### Production Build

```bash
npm run build
npm start
```

---

## 📖 Educational Context

When transitioning legacy projects or learning modern shader development, key challenges include:
- Understanding **Scriptable Render Pipeline (SRP) Batching** and GPU constant buffer memory layouts.
- Understanding **Matrix naming conventions** (e.g., `UNITY_MATRIX_MVP` vs. `TransformObjectToHClip`).
- Dealing with **Lighting Model differences** (e.g., `_LightColor0` and `UnityWorldSpaceLightDir` vs. `GetMainLight()`).

This tool provides side-by-side annotations explaining every token replacement so developers can learn *why* each migration change occurs.

---

## 🔒 Security & Privacy

- **100% Deterministic & Offline-Capable**: No AI models, remote APIs, or cloud analytics are used. Transpilation and AST evaluation occur entirely in the user's browser.
- **No Secret Keys Required**: The project does not require or store sensitive credentials or third-party tokens.
- **Strict Safe Sandboxing**: WebGL shader execution runs within an isolated HTML5 canvas context.

---

## 📄 License

This project is authored by **Berkay Sert** and licensed under the [MIT License](LICENSE). You are free to use, modify, distribute, and integrate the transpiler logic and converted shaders into personal or commercial Unity projects.
