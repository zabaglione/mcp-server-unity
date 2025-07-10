/**
 * Shader Templates for Unity MCP Bridge
 * Exports all shader template functions
 */

export { getBuiltInShaderTemplate } from './builtin-shader.js';
export { getURPShaderTemplate } from './urp-shader.js';
export { getHDRPShaderTemplate } from './hdrp-shader.js';

export type ShaderType = 'builtin' | 'urp' | 'hdrp' | 'custom';

export interface ShaderTemplateConfig {
  name: string;
  extension: '.shader';
  templateFunction: (name: string) => string;
}

import { getBuiltInShaderTemplate as builtinTemplate } from './builtin-shader.js';
import { getURPShaderTemplate as urpTemplate } from './urp-shader.js';
import { getHDRPShaderTemplate as hdrpTemplate } from './hdrp-shader.js';

export const SHADER_TEMPLATES: Record<Exclude<ShaderType, 'custom'>, ShaderTemplateConfig> = {
  builtin: {
    name: 'Built-in Render Pipeline',
    extension: '.shader',
    templateFunction: builtinTemplate,
  },
  urp: {
    name: 'Universal Render Pipeline',
    extension: '.shader',
    templateFunction: urpTemplate,
  },
  hdrp: {
    name: 'High Definition Render Pipeline',
    extension: '.shader',
    templateFunction: hdrpTemplate,
  },
};