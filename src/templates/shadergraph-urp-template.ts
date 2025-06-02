export const getURPShaderGraphTemplate = (_shaderName: string) => `{
    "m_SGVersion": 3,
    "m_Type": "UnityEditor.ShaderGraph.GraphData",
    "m_ObjectId": "${generateGUID()}",
    "m_Properties": [
        {
            "m_Id": "${generateGUID()}"
        },
        {
            "m_Id": "${generateGUID()}"
        }
    ],
    "m_Keywords": [],
    "m_Dropdowns": [],
    "m_CategoryData": [
        {
            "m_Id": "${generateGUID()}"
        }
    ],
    "m_Nodes": [
        {
            "m_Id": "${generateGUID()}"
        },
        {
            "m_Id": "${generateGUID()}"
        },
        {
            "m_Id": "${generateGUID()}"
        },
        {
            "m_Id": "${generateGUID()}"
        }
    ],
    "m_GroupDatas": [],
    "m_StickyNoteDatas": [],
    "m_Edges": [
        {
            "m_OutputSlot": {
                "m_Node": {
                    "m_Id": "${generateGUID()}"
                },
                "m_SlotId": 0
            },
            "m_InputSlot": {
                "m_Node": {
                    "m_Id": "${generateGUID()}"
                },
                "m_SlotId": 0
            }
        }
    ],
    "m_VertexContext": {
        "m_Position": {
            "x": 0.0,
            "y": 0.0
        },
        "m_Blocks": [
            {
                "m_Id": "${generateGUID()}"
            },
            {
                "m_Id": "${generateGUID()}"
            },
            {
                "m_Id": "${generateGUID()}"
            }
        ]
    },
    "m_FragmentContext": {
        "m_Position": {
            "x": 0.0,
            "y": 200.0
        },
        "m_Blocks": [
            {
                "m_Id": "${generateGUID()}"
            },
            {
                "m_Id": "${generateGUID()}"
            },
            {
                "m_Id": "${generateGUID()}"
            },
            {
                "m_Id": "${generateGUID()}"
            },
            {
                "m_Id": "${generateGUID()}"
            }
        ]
    },
    "m_PreviewData": {
        "serializedMesh": {
            "m_SerializedMesh": "{}"
        },
        "preventRotation": false
    },
    "m_Path": "Shader Graphs",
    "m_GraphPrecision": 1,
    "m_PreviewMode": 2,
    "m_OutputNode": {
        "m_Id": ""
    },
    "m_ActiveTargets": [
        {
            "m_Id": "${generateGUID()}"
        }
    ]
}

{
    "m_SGVersion": 0,
    "m_Type": "UnityEditor.ShaderGraph.ColorRGBMaterialSlot",
    "m_ObjectId": "${generateGUID()}",
    "m_Id": 0,
    "m_DisplayName": "Base Color",
    "m_SlotType": 0,
    "m_Hidden": false,
    "m_ShaderOutputName": "BaseColor",
    "m_StageCapability": 2,
    "m_Value": {
        "x": 0.5,
        "y": 0.5,
        "z": 0.5
    },
    "m_DefaultValue": {
        "x": 0.0,
        "y": 0.0,
        "z": 0.0
    },
    "m_Labels": [],
    "m_ColorMode": 0,
    "m_DefaultColor": {
        "r": 0.5,
        "g": 0.5,
        "b": 0.5,
        "a": 1.0
    }
}

{
    "m_SGVersion": 0,
    "m_Type": "UnityEditor.Rendering.Universal.ShaderGraph.UniversalTarget",
    "m_ObjectId": "${generateGUID()}",
    "m_ActiveSubTarget": {
        "m_Id": "${generateGUID()}"
    },
    "m_AllowMaterialOverride": false,
    "m_SurfaceType": 0,
    "m_ZTestMode": 4,
    "m_ZWriteControl": 0,
    "m_AlphaMode": 0,
    "m_RenderFace": 2,
    "m_AlphaClip": false,
    "m_CastShadows": true,
    "m_ReceiveShadows": true,
    "m_CustomEditorGUI": "",
    "m_SupportVFX": false
}`;

function generateGUID(): string {
    // Simple GUID generator for Unity
    return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}