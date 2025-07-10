/**
 * Shader template tests
 */

import { getBuiltInShaderTemplate } from '../../../../src/templates/shaders/builtin-shader.js';
import { getURPShaderTemplate } from '../../../../src/templates/shaders/urp-shader.js';
import { getHDRPShaderTemplate } from '../../../../src/templates/shaders/hdrp-shader.js';

describe('Shader Templates', () => {
  describe('Built-in Shader Template', () => {
    it('should generate valid built-in shader', () => {
      const shader = getBuiltInShaderTemplate('TestShader');
      
      expect(shader).toContain('Shader "Custom/TestShader"');
      expect(shader).toContain('Properties');
      expect(shader).toContain('_MainTex');
      expect(shader).toContain('_Color');
      expect(shader).toContain('SubShader');
      expect(shader).toContain('CGPROGRAM');
      expect(shader).toContain('#pragma surface surf Standard');
      expect(shader).toContain('struct Input');
      expect(shader).toContain('void surf');
      expect(shader).toContain('ENDCG');
      expect(shader).toContain('FallBack "Diffuse"');
    });

    it('should use shader name in declaration', () => {
      const shader = getBuiltInShaderTemplate('MyCustomShader');
      expect(shader).toContain('Shader "Custom/MyCustomShader"');
    });

    it('should include metallic and smoothness properties', () => {
      const shader = getBuiltInShaderTemplate('TestShader');
      expect(shader).toContain('_Metallic');
      expect(shader).toContain('_Glossiness'); // Built-in uses _Glossiness
    });
  });

  describe('URP Shader Template', () => {
    it('should generate valid URP shader', () => {
      const shader = getURPShaderTemplate('TestShader');
      
      expect(shader).toContain('Shader "Universal Render Pipeline/Custom/TestShader"');
      expect(shader).toContain('Properties');
      expect(shader).toContain('_BaseMap');
      expect(shader).toContain('_BaseColor');
      expect(shader).toContain('SubShader');
      expect(shader).toContain('Tags');
      expect(shader).toContain('"RenderType"="Opaque"');
      expect(shader).toContain('"RenderPipeline" = "UniversalPipeline"'); // Fixed spacing
      expect(shader).toContain('HLSLPROGRAM');
      expect(shader).toContain('#pragma vertex vert');
      expect(shader).toContain('#pragma fragment frag');
      expect(shader).toContain('ENDHLSL');
    });

    it('should use shader name in declaration', () => {
      const shader = getURPShaderTemplate('MyURPShader');
      expect(shader).toContain('Shader "Universal Render Pipeline/Custom/MyURPShader"');
    });

    it('should include URP-specific includes', () => {
      const shader = getURPShaderTemplate('TestShader');
      expect(shader).toContain('Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl');
      expect(shader).toContain('Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl');
    });

    it('should have Forward pass', () => {
      const shader = getURPShaderTemplate('TestShader');
      expect(shader).toContain('Name "ForwardLit"');
      expect(shader).toContain('"LightMode" = "UniversalForward"'); // Fixed spacing
    });
  });

  describe('HDRP Shader Template', () => {
    it('should generate valid HDRP shader', () => {
      const shader = getHDRPShaderTemplate('TestShader');
      
      expect(shader).toContain('Shader "HDRP/Custom/TestShader"');
      expect(shader).toContain('Properties');
      expect(shader).toContain('_BaseColorMap');
      expect(shader).toContain('_BaseColor');
      expect(shader).toContain('_Metallic');
      expect(shader).toContain('_Smoothness');
      expect(shader).toContain('SubShader');
      expect(shader).toContain('HLSLPROGRAM');
      expect(shader).toContain('#pragma vertex Vert');
      expect(shader).toContain('#pragma fragment Frag');
      expect(shader).toContain('ENDHLSL');
    });

    it('should use shader name in declaration', () => {
      const shader = getHDRPShaderTemplate('MyHDRPShader');
      expect(shader).toContain('Shader "HDRP/Custom/MyHDRPShader"');
    });

    it('should include HDRP-specific includes', () => {
      const shader = getHDRPShaderTemplate('TestShader');
      expect(shader).toContain('Packages/com.unity.render-pipelines.core/ShaderLibrary/Common.hlsl');
      expect(shader).toContain('Packages/com.unity.render-pipelines.high-definition/Runtime/ShaderLibrary/ShaderVariables.hlsl');
      expect(shader).toContain('Packages/com.unity.render-pipelines.high-definition/Runtime/Material/Material.hlsl');
    });

    it('should have proper HDRP tags', () => {
      const shader = getHDRPShaderTemplate('TestShader');
      expect(shader).toContain('"RenderPipeline"="HDRenderPipeline"');
      expect(shader).toContain('"Queue"="Geometry"');
    });

    it('should have ForwardOnly and ShadowCaster passes', () => {
      const shader = getHDRPShaderTemplate('TestShader');
      expect(shader).toContain('Name "ForwardOnly"');
      expect(shader).toContain('"LightMode" = "ForwardOnly"');
      expect(shader).toContain('Name "ShadowCaster"');
      expect(shader).toContain('"LightMode" = "ShadowCaster"');
    });

    it('should have fallback to HDRP/Lit', () => {
      const shader = getHDRPShaderTemplate('TestShader');
      expect(shader).toContain('FallBack "HDRP/Lit"');
    });
  });
});