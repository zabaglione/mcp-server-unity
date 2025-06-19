import yaml from 'js-yaml';

/**
 * Common YAML utilities for Unity files
 */

/**
 * Standard YAML dump options for Unity materials
 */
export const UNITY_YAML_OPTIONS = {
  lineWidth: -1,
  noRefs: true,
  flowLevel: 3,
  styles: {
    '!!int': 'decimal',
    '!!float': 'decimal'
  }
};

/**
 * Dump material data to YAML with Unity-compatible formatting
 */
export function dumpMaterialYAML(materialData: any): string {
  return yaml.dump(materialData, UNITY_YAML_OPTIONS);
}

/**
 * Format YAML content with Unity header for materials
 */
export function formatMaterialYAML(yamlContent: string): string {
  return '%YAML 1.1\n%TAG !u! tag:unity3d.com,2011:\n--- !u!21 &2100000\n' + yamlContent;
}

/**
 * Parse Unity YAML content, handling the Unity-specific header
 */
export function parseUnityYAML(content: string): any {
  // Remove Unity-specific headers
  const cleanedContent = content
    .replace(/%YAML.*\n/, '')
    .replace(/%TAG.*\n/, '')
    .replace(/---.*\n/, '');
  
  return yaml.load(cleanedContent);
}