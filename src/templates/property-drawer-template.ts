export const getPropertyDrawerTemplate = (className: string, attributeName: string) => `using UnityEngine;
using UnityEditor;

// First, define the attribute that will use this drawer
public class ${attributeName} : PropertyAttribute
{
    public float min;
    public float max;
    
    public ${attributeName}(float min, float max)
    {
        this.min = min;
        this.max = max;
    }
}

// The property drawer for the attribute
[CustomPropertyDrawer(typeof(${attributeName}))]
public class ${className} : PropertyDrawer
{
    public override void OnGUI(Rect position, SerializedProperty property, GUIContent label)
    {
        // Get the attribute data
        ${attributeName} range = (${attributeName})attribute;
        
        // Begin property field
        EditorGUI.BeginProperty(position, label, property);
        
        // Draw label
        position = EditorGUI.PrefixLabel(position, GUIUtility.GetControlID(FocusType.Passive), label);
        
        // Don't indent child fields
        int indent = EditorGUI.indentLevel;
        EditorGUI.indentLevel = 0;
        
        // Calculate rects
        Rect sliderRect = new Rect(position.x, position.y, position.width - 50, position.height);
        Rect labelRect = new Rect(position.x + position.width - 45, position.y, 45, position.height);
        
        // Draw fields based on property type
        if (property.propertyType == SerializedPropertyType.Float)
        {
            float value = property.floatValue;
            value = GUI.HorizontalSlider(sliderRect, value, range.min, range.max);
            value = EditorGUI.FloatField(labelRect, value);
            property.floatValue = Mathf.Clamp(value, range.min, range.max);
        }
        else if (property.propertyType == SerializedPropertyType.Integer)
        {
            int value = property.intValue;
            value = (int)GUI.HorizontalSlider(sliderRect, value, range.min, range.max);
            value = EditorGUI.IntField(labelRect, value);
            property.intValue = Mathf.Clamp(value, (int)range.min, (int)range.max);
        }
        else
        {
            EditorGUI.LabelField(position, "Use ${attributeName} with float or int.");
        }
        
        // Restore indent
        EditorGUI.indentLevel = indent;
        
        // End property field
        EditorGUI.EndProperty();
    }
    
    public override float GetPropertyHeight(SerializedProperty property, GUIContent label)
    {
        return EditorGUIUtility.singleLineHeight;
    }
}`;