export const getHDRPShaderTemplate = (shaderName: string) => `Shader "HDRP/Custom/${shaderName}"
{
    Properties
    {
        _BaseColorMap ("Base Color Map", 2D) = "white" {}
        _BaseColor ("Base Color", Color) = (1,1,1,1)
        _Metallic ("Metallic", Range(0,1)) = 0.0
        _Smoothness ("Smoothness", Range(0,1)) = 0.5
        _NormalMap ("Normal Map", 2D) = "bump" {}
        _NormalScale ("Normal Scale", Range(0,2)) = 1.0
        _EmissiveColorMap ("Emissive Map", 2D) = "white" {}
        _EmissiveColor ("Emissive Color", Color) = (0,0,0,1)
    }

    HLSLINCLUDE
    #pragma target 4.5
    #pragma only_renderers d3d11 playstation xboxone xboxseries vulkan metal switch
    #pragma multi_compile_instancing
    #pragma instancing_options renderinglayer
    ENDHLSL

    SubShader
    {
        Tags { "RenderType"="Opaque" "Queue"="Geometry" "RenderPipeline" = "HDRenderPipeline" }

        Pass
        {
            Name "ForwardOnly"
            Tags { "LightMode" = "ForwardOnly" }

            Cull Back
            ZTest LEqual
            ZWrite On

            HLSLPROGRAM
            #pragma vertex Vert
            #pragma fragment Frag
            
            #define SHADERPASS SHADERPASS_FORWARD
            #include "Packages/com.unity.render-pipelines.core/ShaderLibrary/Common.hlsl"
            #include "Packages/com.unity.render-pipelines.high-definition/Runtime/ShaderLibrary/ShaderVariables.hlsl"
            #include "Packages/com.unity.render-pipelines.high-definition/Runtime/Material/Material.hlsl"
            #include "Packages/com.unity.render-pipelines.high-definition/Runtime/Material/Lit/Lit.hlsl"
            #include "Packages/com.unity.render-pipelines.high-definition/Runtime/Material/BuiltinUtilities.hlsl"
            #include "Packages/com.unity.render-pipelines.high-definition/Runtime/Material/MaterialUtilities.hlsl"
            #include "Packages/com.unity.render-pipelines.high-definition/Runtime/ShaderLibrary/ShaderGraphFunctions.hlsl"

            struct AttributesMesh
            {
                float3 positionOS : POSITION;
                float3 normalOS : NORMAL;
                float4 tangentOS : TANGENT;
                float2 uv0 : TEXCOORD0;
                UNITY_VERTEX_INPUT_INSTANCE_ID
            };

            struct PackedVaryingsMeshToPS
            {
                float4 positionCS : SV_POSITION;
                float3 positionWS : TEXCOORD0;
                float3 normalWS : TEXCOORD1;
                float4 tangentWS : TEXCOORD2;
                float2 uv0 : TEXCOORD3;
                UNITY_VERTEX_INPUT_INSTANCE_ID
            };

            TEXTURE2D(_BaseColorMap);
            TEXTURE2D(_NormalMap);
            TEXTURE2D(_EmissiveColorMap);
            SAMPLER(sampler_BaseColorMap);
            SAMPLER(sampler_NormalMap);
            SAMPLER(sampler_EmissiveColorMap);

            CBUFFER_START(UnityPerMaterial)
                float4 _BaseColor;
                float _Metallic;
                float _Smoothness;
                float _NormalScale;
                float4 _EmissiveColor;
            CBUFFER_END

            PackedVaryingsMeshToPS Vert(AttributesMesh input)
            {
                PackedVaryingsMeshToPS output;
                UNITY_SETUP_INSTANCE_ID(input);
                UNITY_TRANSFER_INSTANCE_ID(input, output);

                float3 positionWS = TransformObjectToWorld(input.positionOS);
                output.positionCS = TransformWorldToHClip(positionWS);
                output.positionWS = positionWS;
                
                float3 normalWS = TransformObjectToWorldNormal(input.normalOS);
                float4 tangentWS = float4(TransformObjectToWorldDir(input.tangentOS.xyz), input.tangentOS.w);
                
                output.normalWS = normalWS;
                output.tangentWS = tangentWS;
                output.uv0 = input.uv0;

                return output;
            }

            float4 Frag(PackedVaryingsMeshToPS input) : SV_Target
            {
                UNITY_SETUP_INSTANCE_ID(input);

                // Sample textures
                float4 baseColor = SAMPLE_TEXTURE2D(_BaseColorMap, sampler_BaseColorMap, input.uv0) * _BaseColor;
                float3 normalTS = UnpackNormalScale(SAMPLE_TEXTURE2D(_NormalMap, sampler_NormalMap, input.uv0), _NormalScale);
                float3 emissive = SAMPLE_TEXTURE2D(_EmissiveColorMap, sampler_EmissiveColorMap, input.uv0).rgb * _EmissiveColor.rgb;

                // Calculate world space normal
                float3 bitangent = cross(input.normalWS, input.tangentWS.xyz) * input.tangentWS.w;
                float3x3 TBN = float3x3(input.tangentWS.xyz, bitangent, input.normalWS);
                float3 normalWS = normalize(mul(normalTS, TBN));

                // Setup surface data
                SurfaceData surfaceData = (SurfaceData)0;
                surfaceData.baseColor = baseColor.rgb;
                surfaceData.metallic = _Metallic;
                surfaceData.perceptualSmoothness = _Smoothness;
                surfaceData.normalWS = normalWS;
                surfaceData.ambientOcclusion = 1.0;

                // Setup builtin data
                BuiltinData builtinData = (BuiltinData)0;
                builtinData.emissiveColor = emissive;
                builtinData.opacity = baseColor.a;

                // Simple lighting calculation (this is a simplified version)
                float3 viewDirectionWS = GetWorldSpaceNormalizeViewDir(input.positionWS);
                float3 lightDir = normalize(float3(1, 1, -1)); // Simple directional light
                float NdotL = saturate(dot(normalWS, lightDir));
                
                float3 diffuse = surfaceData.baseColor * NdotL;
                float3 color = diffuse + builtinData.emissiveColor;

                return float4(color, builtinData.opacity);
            }
            ENDHLSL
        }
    }
    FallBack "HDRP/Lit"
}`;