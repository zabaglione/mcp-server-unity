export const getMenuItemsTemplate = (className: string) => `using UnityEngine;
using UnityEditor;
using System.IO;

public static class ${className}
{
    // Simple menu item
    [MenuItem("Tools/Custom Tools/Do Something")]
    static void DoSomething()
    {
        Debug.Log("Doing something!");
        EditorUtility.DisplayDialog("Action", "Something has been done!", "OK");
    }
    
    // Menu item with validation
    [MenuItem("Tools/Custom Tools/Process Selected Objects")]
    static void ProcessSelectedObjects()
    {
        foreach (GameObject obj in Selection.gameObjects)
        {
            Debug.Log($"Processing: {obj.name}");
            // Add your processing logic here
            Undo.RecordObject(obj, "Process Object");
            obj.name = obj.name + "_Processed";
        }
    }
    
    // Validation function for the menu item above
    [MenuItem("Tools/Custom Tools/Process Selected Objects", true)]
    static bool ValidateProcessSelectedObjects()
    {
        // Menu item is only enabled when at least one GameObject is selected
        return Selection.gameObjects.Length > 0;
    }
    
    // Context menu for components
    [MenuItem("CONTEXT/Transform/Reset With Children")]
    static void ResetTransformWithChildren(MenuCommand command)
    {
        Transform transform = (Transform)command.context;
        Undo.RecordObject(transform, "Reset Transform With Children");
        
        transform.localPosition = Vector3.zero;
        transform.localRotation = Quaternion.identity;
        transform.localScale = Vector3.one;
        
        // Reset all children too
        foreach (Transform child in transform)
        {
            Undo.RecordObject(child, "Reset Child Transform");
            child.localPosition = Vector3.zero;
            child.localRotation = Quaternion.identity;
            child.localScale = Vector3.one;
        }
    }
    
    // Asset creation menu
    [MenuItem("Assets/Create/Custom Asset/Text File")]
    static void CreateTextFile()
    {
        string path = GetSelectedPath();
        string assetPath = AssetDatabase.GenerateUniqueAssetPath(path + "/NewTextFile.txt");
        
        File.WriteAllText(assetPath, "// New text file\\n");
        AssetDatabase.Refresh();
        
        // Select the new asset
        Object asset = AssetDatabase.LoadAssetAtPath<Object>(assetPath);
        Selection.activeObject = asset;
        EditorUtility.FocusProjectWindow();
    }
    
    // GameObject creation menu
    [MenuItem("GameObject/Custom Objects/Configured Cube", false, 10)]
    static void CreateConfiguredCube()
    {
        GameObject cube = GameObject.CreatePrimitive(PrimitiveType.Cube);
        cube.name = "Configured Cube";
        
        // Configure the cube
        cube.transform.position = Vector3.zero;
        cube.GetComponent<Renderer>().material.color = Color.blue;
        
        // Add components
        cube.AddComponent<Rigidbody>();
        
        // Register undo
        Undo.RegisterCreatedObjectUndo(cube, "Create Configured Cube");
        Selection.activeGameObject = cube;
    }
    
    // Shortcut key example (Ctrl/Cmd + Shift + G)
    [MenuItem("Tools/Custom Tools/Quick Action %#g")]
    static void QuickAction()
    {
        Debug.Log("Quick action executed!");
    }
    
    // Helper method to get selected folder path
    static string GetSelectedPath()
    {
        string path = "Assets";
        
        foreach (Object obj in Selection.GetFiltered(typeof(Object), SelectionMode.Assets))
        {
            path = AssetDatabase.GetAssetPath(obj);
            if (File.Exists(path))
            {
                path = Path.GetDirectoryName(path);
            }
            break;
        }
        
        return path;
    }
}`;