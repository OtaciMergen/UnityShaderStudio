import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize Gemini Client
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// API Routes
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// AI-Assisted Shader Porting / Deep Transmutation Endpoint
app.post("/api/shader/port", async (req, res) => {
  try {
    const {
      sourceGlsl,
      targetPipeline = "urp", // "urp" | "hdrp" | "shadergraph" | "compute" | "srp_core"
      unityVersion = "6000",
      surfaceMode = "unlit", // "unlit" | "lit_pbr" | "transparent" | "custom"
      srpBatcher = true,
      additionalInstructions = "",
    } = req.body;

    if (!sourceGlsl || typeof sourceGlsl !== "string") {
      return res.status(400).json({ error: "sourceGlsl is required" });
    }

    const ai = getAIClient();
    if (!ai) {
      return res.status(503).json({
        error: "GEMINI_API_KEY is not configured on the server. Falling back to local rule-based conversion engine.",
      });
    }

    const pipelineDescriptions: Record<string, string> = {
      urp: `Target: Unity Universal Render Pipeline (URP) version ${unityVersion}+ HLSL ShaderLab shader.
- Use #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl" (and Lighting.hlsl if lighting is needed).
- Wrap all custom material properties in CBUFFER_START(UnityPerMaterial) ... CBUFFER_END for full SRP Batcher compatibility.
- Use TEXTURE2D(_BaseMap) and SAMPLER(sampler_BaseMap) macros with SAMPLE_TEXTURE2D.
- Use TransformObjectToHClip for vertex positions and TransformObjectToWorldNormal for normals.
- Format with complete Shader "Custom/ConvertedShader" { Properties { ... } SubShader { Tags { "RenderPipeline" = "UniversalPipeline" ... } Pass { ... } } }`,
      hdrp: `Target: Unity High Definition Render Pipeline (HDRP) version ${unityVersion}+ HLSL ShaderLab shader.
- Use #include "Packages/com.unity.render-pipelines.high-definition/Runtime/ShaderLibrary/ShaderVariables.hlsl"
- Wrap per-material properties inside CBUFFER_START(UnityPerMaterial) ... CBUFFER_END.
- Format with Tags { "RenderPipeline"="HDRenderPipeline" } and appropriate HD lit or unlit pass setup.`,
      shadergraph: `Target: Unity Shader Graph Custom Function Node (.hlsl include file and function).
- Provide both void <FunctionName>_float(...) and void <FunctionName>_half(...) signatures.
- Make arguments precision-flexible with correct input and out parameters.
- Provide a ready-to-use .hlsl file that can be linked directly inside a Custom Function node.`,
      compute: `Target: Unity Compute Shader (.compute file).
- Use #pragma kernel CSMain
- Use [numthreads(8,8,1)] or appropriate thread group layout.
- Map OpenGL image2D/buffers to RWTexture2D<float4> or RWStructuredBuffer.`,
      srp_core: `Target: Unity SRP Core Include (.hlsl).
- Use #include "Packages/com.unity.render-pipelines.core/ShaderLibrary/Common.hlsl"
- Create modular include functions compatible with both URP and HDRP.`,
    };

    const targetDesc = pipelineDescriptions[targetPipeline] || pipelineDescriptions.urp;

    const isBuiltin = sourceGlsl.includes("CGPROGRAM") || sourceGlsl.includes("UnityCG.cginc") || sourceGlsl.includes("#pragma surface") || sourceGlsl.includes("UnityObjectToClipPos") || sourceGlsl.includes("fixed4");

    const systemPrompt = `You are an expert Graphics & Rendering Engineer specializing in Unity Built-in Render Pipeline (CG/ShaderLab/Surface Shaders), GLSL, HLSL, DirectX, Metal, Vulkan, and Unity Universal Render Pipeline (URP) and HDRP.
You will convert legacy Unity Built-in Render Pipeline shaders OR OpenGL / GLSL code into pristine, modern, production-grade Unity URP or HDRP shaders.

Key Conversion Rules for Unity Built-in to URP:
1. Replace CGPROGRAM ... ENDCG with HLSLPROGRAM ... ENDHLSL.
2. In SubShader, ensure Tags include "RenderPipeline" = "UniversalPipeline".
3. In Pass Tags, replace "LightMode" = "ForwardBase" with "LightMode" = "UniversalForward". Remove or consolidate separate ForwardAdd passes.
4. Replace UnityCG.cginc with "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl", Lighting.cginc with "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl", and AutoLight.cginc with Shadows.hlsl.
5. Replace legacy fixed/fixed2/fixed3/fixed4 with half/half2/half3/half4.
6. Replace UnityObjectToClipPos(v.vertex) with TransformObjectToHClip(v.vertex.xyz).
7. Replace UnityObjectToWorldNormal(v.normal) with TransformObjectToWorldNormal(v.normal).
8. Replace unity_ObjectToWorld / _Object2World with GetObjectToWorldMatrix() or TransformObjectToWorld().
9. Replace unity_WorldToObject / _World2Object with GetWorldToObjectMatrix().
10. Replace _WorldSpaceLightPos0.xyz with GetMainLight().direction and _LightColor0.rgb with GetMainLight().color.
11. Replace ShadeSH9(float4(normal, 1.0)) with SampleSH(normalWS).
12. Replace tex2D(tex, uv) with SAMPLE_TEXTURE2D(tex, sampler_tex, uv) and declare TEXTURE2D(tex); SAMPLER(sampler_tex);
13. Replace legacy fog macros: UNITY_TRANSFER_FOG -> o.fogFactor = ComputeFogFactor(o.positionCS.z); and UNITY_APPLY_FOG -> col.rgb = MixFog(col.rgb, i.fogFactor);
14. If converting a #pragma surface shader, generate a complete URP ForwardLit Pass evaluating UniversalFragmentPBR with InputData and SurfaceData structs.
15. Wrap all per-material properties in CBUFFER_START(UnityPerMaterial) ... CBUFFER_END for 100% SRP Batcher compliance.
16. Include a standard ShadowCaster pass for dynamic shadows.`;

    const userPrompt = `Convert the following ${isBuiltin ? "Unity Built-in Render Pipeline (CG / ShaderLab / Surface Shader)" : "OpenGL / GLSL"} code to modern Unity ${targetPipeline.toUpperCase()} (Unity version ${unityVersion}):

\`\`\`${isBuiltin ? "hlsl" : "glsl"}
${sourceGlsl}
\`\`\`

Configuration Options:
- Source Type: ${isBuiltin ? "Unity Built-in Render Pipeline (Legacy CG / ShaderLab)" : "OpenGL / GLSL"}
- Target Pipeline: ${targetPipeline}
- Target Unity Version: ${unityVersion}
- Surface Mode: ${surfaceMode}
- SRP Batcher Enabled: ${srpBatcher ? "Yes" : "No"}
${additionalInstructions ? `- Additional User Request: ${additionalInstructions}` : ""}

Please return your response in clean JSON format with these exact keys:
{
  "convertedCode": "the full, pristine Unity URP/HDRP shader file code",
  "explanation": "concise overview of what was converted from Built-in/GLSL to URP",
  "conversionsMade": [
    { "from": "legacy construct", "to": "modern URP construct", "reason": "why it changed" }
  ],
  "propertiesExtracted": [
    { "name": "_Property", "type": "Color|Float|Vector|2D", "defaultValue": "value", "glslEquivalent": "original name" }
  ],
  "warnings": [
    "any shader warnings or mobile precision notes"
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text || "{}";
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      parsedData = {
        convertedCode: responseText,
        explanation: "Converted successfully",
        conversionsMade: [],
        propertiesExtracted: [],
        warnings: [],
      };
    }

    res.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error("AI Shader Porting Error:", error);
    res.status(500).json({
      error: error.message || "Failed to process shader conversion via AI",
    });
  }
});

// AI Shader Optimization & Analysis Endpoint
app.post("/api/shader/analyze", async (req, res) => {
  try {
    const { shaderCode, pipeline = "urp" } = req.body;
    if (!shaderCode) {
      return res.status(400).json({ error: "shaderCode is required" });
    }

    const ai = getAIClient();
    if (!ai) {
      return res.status(503).json({ error: "Gemini API key not configured" });
    }

    const prompt = `Analyze this Unity ${pipeline.toUpperCase()} HLSL shader for performance, SRP Batcher compliance, ALU instruction density, register pressure, and mobile compatibility:

\`\`\`hlsl
${shaderCode}
\`\`\`

Return a JSON with:
{
  "srpBatcherStatus": "Compliant" | "Non-Compliant" | "N/A",
  "srpBatcherAnalysis": "explanation of CBUFFER and uniform layout",
  "performanceScore": 1-100,
  "aluAnalysis": "breakdown of heavy math / transcendental instructions",
  "textureSamplesCount": number,
  "optimizationSuggestions": [
    { "title": "suggestion title", "description": "detail", "codeFix": "snippet" }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    res.status(500).json({ error: error.message || "Analysis failed" });
  }
});

// Setup Vite middleware
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`GLSL to Unity SRP Server listening on http://0.0.0.0:${PORT}`);
  });
}

start();
