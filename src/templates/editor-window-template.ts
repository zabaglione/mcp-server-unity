export const getEditorWindowTemplate = (className: string) => `using UnityEngine;
using UnityEditor;

public class ${className} : EditorWindow
{
    private string myString = "Hello World";
    private bool groupEnabled;
    private bool myBool = true;
    private float myFloat = 1.23f;
    
    // Add menu item to open this window
    [MenuItem("Window/Custom/${className}")]
    public static void ShowWindow()
    {
        // Get existing open window or if none, make a new one
        ${className} window = (${className})EditorWindow.GetWindow(typeof(${className}));
        window.titleContent = new GUIContent("${className}");
        window.Show();
    }
    
    void OnGUI()
    {
        GUILayout.Label("Base Settings", EditorStyles.boldLabel);
        myString = EditorGUILayout.TextField("Text Field", myString);
        
        groupEnabled = EditorGUILayout.BeginToggleGroup("Optional Settings", groupEnabled);
        myBool = EditorGUILayout.Toggle("Toggle", myBool);
        myFloat = EditorGUILayout.Slider("Slider", myFloat, -3, 3);
        EditorGUILayout.EndToggleGroup();
        
        EditorGUILayout.Space();
        
        if (GUILayout.Button("Do Something"))
        {
            DoSomething();
        }
    }
    
    void DoSomething()
    {
        Debug.Log($"Button clicked! String value: {myString}");
    }
    
    void OnInspectorUpdate()
    {
        // Called 10 times per second to give the inspector a chance to update
        Repaint();
    }
}`;