export const getScriptableObjectEditorTemplate = (className: string) => `using UnityEngine;
using UnityEditor;
using System.IO;

public class ${className} : EditorWindow
{
    private string assetName = "NewScriptableObject";
    private ScriptableObject targetObject;
    private Vector2 scrollPosition;
    private Editor cachedEditor;
    
    [MenuItem("Assets/Create/Custom ScriptableObject Tool")]
    public static void ShowWindow()
    {
        ${className} window = GetWindow<${className}>("ScriptableObject Creator");
        window.minSize = new Vector2(400, 300);
    }
    
    void OnGUI()
    {
        GUILayout.Label("ScriptableObject Creator", EditorStyles.boldLabel);
        EditorGUILayout.Space();
        
        // Asset creation section
        EditorGUILayout.BeginVertical("box");
        EditorGUILayout.LabelField("Create New Asset", EditorStyles.boldLabel);
        
        assetName = EditorGUILayout.TextField("Asset Name", assetName);
        
        if (GUILayout.Button("Create ScriptableObject Asset"))
        {
            CreateScriptableObjectAsset();
        }
        EditorGUILayout.EndVertical();
        
        EditorGUILayout.Space();
        
        // Asset editing section
        EditorGUILayout.BeginVertical("box");
        EditorGUILayout.LabelField("Edit Existing Asset", EditorStyles.boldLabel);
        
        ScriptableObject newTarget = (ScriptableObject)EditorGUILayout.ObjectField(
            "Target Object", 
            targetObject, 
            typeof(ScriptableObject), 
            false
        );
        
        if (newTarget != targetObject)
        {
            targetObject = newTarget;
            if (cachedEditor != null)
            {
                DestroyImmediate(cachedEditor);
            }
            if (targetObject != null)
            {
                cachedEditor = Editor.CreateEditor(targetObject);
            }
        }
        
        if (targetObject != null && cachedEditor != null)
        {
            EditorGUILayout.Space();
            scrollPosition = EditorGUILayout.BeginScrollView(scrollPosition);
            cachedEditor.OnInspectorGUI();
            EditorGUILayout.EndScrollView();
        }
        
        EditorGUILayout.EndVertical();
    }
    
    void CreateScriptableObjectAsset()
    {
        // Create instance of ScriptableObject
        ScriptableObject asset = ScriptableObject.CreateInstance<YourScriptableObjectClass>();
        
        // Create the asset
        string path = "Assets/ScriptableObjects";
        if (!Directory.Exists(path))
        {
            Directory.CreateDirectory(path);
        }
        
        string assetPath = AssetDatabase.GenerateUniqueAssetPath($"{path}/{assetName}.asset");
        AssetDatabase.CreateAsset(asset, assetPath);
        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();
        
        // Focus on the new asset
        EditorUtility.FocusProjectWindow();
        Selection.activeObject = asset;
        
        Debug.Log($"Created ScriptableObject at: {assetPath}");
    }
    
    void OnDestroy()
    {
        if (cachedEditor != null)
        {
            DestroyImmediate(cachedEditor);
        }
    }
}

// Example ScriptableObject class (replace with your actual class)
[CreateAssetMenu(fileName = "NewData", menuName = "Custom/Data Object")]
public class YourScriptableObjectClass : ScriptableObject
{
    public string dataName;
    public int dataValue;
    public float dataMultiplier = 1.0f;
}`;