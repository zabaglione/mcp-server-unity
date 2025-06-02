export const getHDRPShaderGraphTemplate = (_shaderName: string) => `{
    "m_SGVersion": 3,
    "m_Type": "UnityEditor.ShaderGraph.GraphData",
    "m_ObjectId": "${generateGUID()}",
    "m_Properties": [],
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
        }
    ],
    "m_GroupDatas": [],
    "m_StickyNoteDatas": [],
    "m_Edges": [],
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
    "m_Type": "UnityEditor.Rendering.HighDefinition.ShaderGraph.HDTarget",
    "m_ObjectId": "${generateGUID()}",
    "m_ActiveSubTarget": {
        "m_Id": "${generateGUID()}"
    },
    "m_Datas": [
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
    "m_CustomEditorGUI": "",
    "m_SupportVFX": false,
    "m_SupportLineRendering": false,
    "m_SupportRayTracing": true,
    "m_SupportedRenderingFeatures": {
        "m_MotionVectors": 1,
        "m_ReceiveShadows": 1,
        "m_DepthMode": 1,
        "m_Normal": 1,
        "m_Motion": 1,
        "m_Lightmaps": 0,
        "m_LightProbes": 0,
        "m_RenderQueues": 1
    }
}`;

function generateGUID(): string {
    return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}