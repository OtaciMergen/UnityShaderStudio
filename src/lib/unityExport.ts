import JSZip from 'jszip';
import { ExtractedProperty, TargetPipeline } from '../types';

/**
 * Generates a standard Unity 32-character hexadecimal GUID.
 * Unity Asset Database uses lowercase 128-bit (32 hex characters) hashes for .meta files.
 */
export function generateUnityGuid(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Fallback random generation
  let guid = '';
  const hexChars = '0123456789abcdef';
  for (let i = 0; i < 32; i++) {
    guid += hexChars[Math.floor(Math.random() * 16)];
  }
  return guid;
}

/**
 * Validates whether a string matches Unity's 32-character hex GUID specification.
 */
export function isValidUnityGuid(guid: string): boolean {
  return /^[0-9a-f]{32}$/i.test(guid.trim());
}

/**
 * Generates the official Unity `.shader.meta` YAML file content with the specified GUID.
 */
export function generateShaderMetaContent(
  guid: string,
  targetPipeline: TargetPipeline = 'urp'
): string {
  const cleanGuid = guid.trim().toLowerCase();
  
  if (targetPipeline === 'compute') {
    return `fileFormatVersion: 2
guid: ${cleanGuid}
ComputeShaderImporter:
  externalObjects: {}
  userData: 
  assetBundleName: 
  assetBundleVariant: 
`;
  }

  if (targetPipeline === 'shadergraph' || targetPipeline === 'srp_core') {
    return `fileFormatVersion: 2
guid: ${cleanGuid}
DefaultImporter:
  externalObjects: {}
  userData: 
  assetBundleName: 
  assetBundleVariant: 
`;
  }

  return `fileFormatVersion: 2
guid: ${cleanGuid}
ShaderImporter:
  externalObjects: {}
  defaultTextures: []
  nonModifiableTextures: []
  userData: 
  assetBundleName: 
  assetBundleVariant: 
`;
}

/**
 * Generates a Unity Material `.mat.meta` file content.
 */
export function generateMaterialMetaContent(guid: string): string {
  const cleanGuid = guid.trim().toLowerCase();
  return `fileFormatVersion: 2
guid: ${cleanGuid}
NativeFormatImporter:
  externalObjects: {}
  userData: 
  assetBundleName: 
  assetBundleVariant: 
`;
}

/**
 * Generates a ready-to-use Unity Material (.mat) YAML file bound to the exported Shader GUID.
 */
export function generateMaterialAssetContent(params: {
  shaderGuid: string;
  shaderName: string;
  materialName: string;
  properties?: ExtractedProperty[];
}): string {
  const { shaderGuid, shaderName, materialName, properties = [] } = params;
  const cleanGuid = shaderGuid.trim().toLowerCase();

  const texEnvs: string[] = [];
  const floats: string[] = [];
  const colors: string[] = [];

  properties.forEach(p => {
    if (p.type === '2D') {
      texEnvs.push(`      - ${p.name}:
          m_Texture: {fileID: 0}
          m_Scale: {x: 1, y: 1}
          m_Offset: {x: 0, y: 0}`);
    } else if (p.type === 'Color') {
      // Default RGBA
      colors.push(`      - ${p.name}: {r: 1, g: 1, b: 1, a: 1}`);
    } else if (p.type === 'Float' || p.type === 'Range') {
      const numVal = parseFloat(p.defaultValue) || 1.0;
      floats.push(`      - ${p.name}: ${numVal}`);
    }
  });

  return `%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!21 &2100000
Material:
  serializedVersion: 8
  m_ObjectHideFlags: 0
  m_CorrespondingSourceObject: {fileID: 0}
  m_PrefabInstance: {fileID: 0}
  m_PrefabAsset: {fileID: 0}
  m_Name: ${materialName}
  m_Shader: {fileID: 4800000, guid: ${cleanGuid}, type: 3}
  m_Parent: {fileID: 0}
  m_ModifiedSerializedProperties: 0
  m_ValidKeywords: []
  m_InvalidKeywords: []
  m_LightmapFlags: 4
  m_EnableInstancingVariants: 1
  m_DoubleSidedGI: 0
  m_CustomRenderQueue: -1
  stringTagMap: {}
  disabledShaderPasses: []
  m_LockedProperties: []
  m_SavedProperties:
    serializedVersion: 3
    m_TexEnvs:
${texEnvs.length > 0 ? texEnvs.join('\n') : '      []'}
    m_Ints: []
    m_Floats:
${floats.length > 0 ? floats.join('\n') : '      []'}
    m_Colors:
${colors.length > 0 ? colors.join('\n') : '      []'}
  m_BuildTextureStacks: []
`;
}

/**
 * Extracts shader name, category, and suggested filename from ShaderLab / HLSL code.
 */
export function extractShaderInfoFromCode(code: string, targetPipeline: TargetPipeline = 'urp') {
  const match = code.match(/Shader\s+["']([^"']+)["']/i);
  let fullShaderName = 'Custom/Universal/TranspiledShader';
  let shortName = 'TranspiledShader';
  let category = 'Custom/Universal';

  if (match && match[1]) {
    fullShaderName = match[1].trim();
    const parts = fullShaderName.split('/');
    shortName = parts[parts.length - 1] || 'TranspiledShader';
    category = parts.slice(0, -1).join('/') || 'Custom';
  }

  let extension = '.shader';
  if (targetPipeline === 'shadergraph' || targetPipeline === 'srp_core') {
    extension = '.hlsl';
  } else if (targetPipeline === 'compute') {
    extension = '.compute';
  }

  // Sanitize filename
  const sanitizedShortName = shortName.replace(/[^a-zA-Z0-9_-]/g, '') || 'Shader';
  const fileName = `${sanitizedShortName}${extension}`;

  return {
    fullShaderName,
    shortName: sanitizedShortName,
    category,
    extension,
    fileName,
  };
}

/**
 * Updates or injects the `Shader "..."` line in the ShaderLab code.
 */
export function setShaderLabName(code: string, newShaderName: string): string {
  if (/Shader\s+["'][^"']*["']/i.test(code)) {
    return code.replace(/Shader\s+["'][^"']*["']/i, `Shader "${newShaderName}"`);
  }
  return `Shader "${newShaderName}"\n{\n${code}\n}`;
}

/**
 * Triggers a browser download for a text/plain or specified MIME file.
 */
export function downloadTextFile(fileName: string, content: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface UnityExportPackageOptions {
  shaderCode: string;
  shaderGuid: string;
  fileName: string;
  shaderLabName: string;
  targetPipeline: TargetPipeline;
  unityVersion?: string;
  properties?: ExtractedProperty[];
  includeMaterial?: boolean;
  includeReadme?: boolean;
  includeMetaFiles?: boolean;
}

/**
 * Builds and downloads a ready-to-import Unity Project Asset Package (.zip)
 * containing structured `Assets/Shaders/` and `Assets/Materials/` with proper .meta files and GUIDs.
 */
export async function exportUnityAssetZip(options: UnityExportPackageOptions): Promise<void> {
  const {
    shaderCode,
    shaderGuid,
    fileName,
    shaderLabName,
    targetPipeline,
    unityVersion = '2023 / 6000',
    properties = [],
    includeMaterial = true,
    includeReadme = true,
    includeMetaFiles = true,
  } = options;

  const zip = new JSZip();
  const root = zip.folder('Assets');
  const shadersFolder = root?.folder('Shaders');
  const materialsFolder = root?.folder('Materials');

  const baseShaderName = fileName.replace(/\.(shader|hlsl|compute)$/i, '');
  const metaContent = generateShaderMetaContent(shaderGuid, targetPipeline);

  // 1. Add Shader file
  shadersFolder?.file(fileName, shaderCode);

  // 2. Add Shader .meta file
  if (includeMetaFiles) {
    shadersFolder?.file(`${fileName}.meta`, metaContent);
  }

  // 3. Add Pre-Configured Material and Material .meta
  if (includeMaterial && (targetPipeline === 'urp' || targetPipeline === 'hdrp')) {
    const matGuid = generateUnityGuid();
    const matFileName = `${baseShaderName}_Material.mat`;
    const matContent = generateMaterialAssetContent({
      shaderGuid,
      shaderName: shaderLabName,
      materialName: `${baseShaderName}_Material`,
      properties,
    });

    materialsFolder?.file(matFileName, matContent);
    if (includeMetaFiles) {
      materialsFolder?.file(`${matFileName}.meta`, generateMaterialMetaContent(matGuid));
    }
  }

  // 4. Add Readme & Unity Quick Import Instructions
  if (includeReadme) {
    root?.file(
      'README_UNITY_IMPORT.md',
      `# Unity ${targetPipeline.toUpperCase()} Shader Import Package

## Package Metadata
- **Shader File**: \`Assets/Shaders/${fileName}\`
- **Unity GUID**: \`${shaderGuid}\`
- **ShaderLab Path**: \`${shaderLabName}\`
- **Pipeline**: ${targetPipeline.toUpperCase()}
- **Target Unity Version**: ${unityVersion}
- **SRP Batcher Compatible**: Yes (Uniforms packed in \`UnityPerMaterial\` CBUFFER)

## How to Import into Unity
1. Copy the \`Assets/\` folder (or drag and drop the contained \`Shaders/\` folder) directly into your Unity Project's \`Assets/\` folder.
2. Because the companion \`${fileName}.meta\` file is included with the static GUID (\`${shaderGuid}\`), Unity preserves all asset links, scene references, and pre-built materials without broken references.
3. In Unity's Project window, right click \`Assets/Shaders/${fileName}\` -> **Create -> Material**, or use the pre-generated material located in \`Assets/Materials/\`.
4. Assign the material to your MeshRenderer or Fullscreen Pass.

Exported from UniShader Studio.
`
    );
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `${baseShaderName}_Unity_Package.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}
