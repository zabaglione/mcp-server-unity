export const getCustomEditorTemplate = (className: string, targetClassName: string) => `using UnityEngine;
using UnityEditor;

[CustomEditor(typeof(${targetClassName}))]
public class ${className} : Editor
{
    SerializedProperty myStringProp;
    SerializedProperty myIntProp;
    SerializedProperty myFloatProp;
    
    bool showAdvanced = false;
    
    void OnEnable()
    {
        // Link serialized properties
        myStringProp = serializedObject.FindProperty("myString");
        myIntProp = serializedObject.FindProperty("myInt");
        myFloatProp = serializedObject.FindProperty("myFloat");
    }
    
    public override void OnInspectorGUI()
    {
        // Update the serialized object
        serializedObject.Update();
        
        // Custom GUI
        EditorGUILayout.LabelField("Custom Inspector", EditorStyles.boldLabel);
        
        // Basic properties
        EditorGUILayout.PropertyField(myStringProp, new GUIContent("Custom String"));
        EditorGUILayout.PropertyField(myIntProp, new GUIContent("Custom Integer"));
        
        EditorGUILayout.Space();
        
        // Foldout for advanced options
        showAdvanced = EditorGUILayout.Foldout(showAdvanced, "Advanced Options");
        if (showAdvanced)
        {
            EditorGUI.indentLevel++;
            EditorGUILayout.PropertyField(myFloatProp, new GUIContent("Float Value"));
            
            if (GUILayout.Button("Reset Values"))
            {
                myStringProp.stringValue = "Default";
                myIntProp.intValue = 0;
                myFloatProp.floatValue = 1.0f;
            }
            EditorGUI.indentLevel--;
        }
        
        // Apply changes to the serialized object
        serializedObject.ApplyModifiedProperties();
        
        // Draw default inspector
        EditorGUILayout.Space();
        if (GUILayout.Button("Show Default Inspector"))
        {
            DrawDefaultInspector();
        }
    }
    
    // Custom preview in the inspector
    public override bool HasPreviewGUI()
    {
        return true;
    }
    
    public override void OnPreviewGUI(Rect r, GUIStyle background)
    {
        GUI.Label(r, "Custom Preview Area", EditorStyles.boldLabel);
    }
}`;