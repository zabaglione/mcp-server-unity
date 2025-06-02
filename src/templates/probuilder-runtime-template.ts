export const getProBuilderRuntimeTemplate = (className: string) => `using UnityEngine;
using UnityEngine.ProBuilder;
using UnityEngine.ProBuilder.MeshOperations;
using System.Collections.Generic;

/// <summary>
/// Runtime ProBuilder mesh creation and modification
/// </summary>
public class ${className} : MonoBehaviour
{
    [Header("Runtime Mesh Generation")]
    public bool generateOnStart = true;
    public Vector3 meshSize = Vector3.one;
    
    [Header("Procedural Settings")]
    public int seed = 12345;
    public float noiseScale = 0.1f;
    public float noiseStrength = 0.5f;
    
    private ProBuilderMesh currentMesh;
    
    void Start()
    {
        if (generateOnStart)
        {
            GenerateProceduralMesh();
        }
    }
    
    // Basic shape creation at runtime
    public ProBuilderMesh CreateRuntimeCube(Vector3 position, Vector3 size)
    {
        ProBuilderMesh cube = ShapeGenerator.CreateShape(ShapeType.Cube, PivotLocation.Center);
        cube.transform.position = position;
        cube.transform.localScale = size;
        return cube;
    }
    
    public ProBuilderMesh CreateRuntimeCylinder(Vector3 position, int sides, float radius, float height)
    {
        ProBuilderMesh cylinder = ShapeGenerator.CreateShape(ShapeType.Cylinder, PivotLocation.Center);
        cylinder.transform.position = position;
        
        // Scale to match parameters
        Vector3 scale = new Vector3(radius * 2, height, radius * 2);
        cylinder.transform.localScale = scale;
        
        return cylinder;
    }
    
    // Procedural mesh generation
    public void GenerateProceduralMesh()
    {
        if (currentMesh != null)
        {
            DestroyImmediate(currentMesh.gameObject);
        }
        
        // Create base shape
        currentMesh = ShapeGenerator.CreateShape(ShapeType.Plane, PivotLocation.Center);
        currentMesh.transform.position = transform.position;
        currentMesh.transform.localScale = new Vector3(meshSize.x, 1, meshSize.z);
        
        // Apply procedural deformation
        ApplyNoiseDeformation();
        
        // Add some random extrusions
        AddRandomExtrusions();
        
        currentMesh.ToMesh();
        currentMesh.Refresh();
    }
    
    void ApplyNoiseDeformation()
    {
        Vector3[] vertices = currentMesh.positions.ToArray();
        
        for (int i = 0; i < vertices.Length; i++)
        {
            Vector3 worldPos = currentMesh.transform.TransformPoint(vertices[i]);
            float noise = Mathf.PerlinNoise(
                worldPos.x * noiseScale + seed,
                worldPos.z * noiseScale + seed
            );
            
            vertices[i].y += noise * noiseStrength;
        }
        
        currentMesh.positions = vertices;
        currentMesh.ToMesh();
        currentMesh.Refresh();
    }
    
    void AddRandomExtrusions()
    {
        System.Random random = new System.Random(seed);
        Face[] faces = currentMesh.faces.ToArray();
        
        int extrusionCount = Mathf.Min(5, faces.Length / 2);
        
        for (int i = 0; i < extrusionCount; i++)
        {
            int faceIndex = random.Next(0, faces.Length);
            Face face = faces[faceIndex];
            
            float extrudeHeight = (float)(random.NextDouble() * 0.5 + 0.1);
            currentMesh.Extrude(new Face[] { face }, ExtrudeMethod.FaceNormal, extrudeHeight);
        }
    }
    
    // Runtime mesh modification
    public void ModifyMeshAtPoint(Vector3 worldPoint, float radius, float strength)
    {
        if (currentMesh == null) return;
        
        Vector3 localPoint = currentMesh.transform.InverseTransformPoint(worldPoint);
        Vector3[] vertices = currentMesh.positions.ToArray();
        
        for (int i = 0; i < vertices.Length; i++)
        {
            float distance = Vector3.Distance(vertices[i], localPoint);
            if (distance < radius)
            {
                float falloff = 1f - (distance / radius);
                vertices[i].y += strength * falloff;
            }
        }
        
        currentMesh.positions = vertices;
        currentMesh.ToMesh();
        currentMesh.Refresh();
    }
    
    // Mesh combination
    public ProBuilderMesh CombineMeshes(ProBuilderMesh[] meshes)
    {
        if (meshes == null || meshes.Length == 0) return null;
        
        List<Vertex> allVertices = new List<Vertex>();
        List<Face> allFaces = new List<Face>();
        int vertexOffset = 0;
        
        foreach (ProBuilderMesh mesh in meshes)
        {
            if (mesh == null) continue;
            
            // Get vertices
            Vertex[] vertices = mesh.GetVertices();
            
            // Transform vertices to world space
            for (int i = 0; i < vertices.Length; i++)
            {
                vertices[i].position = mesh.transform.TransformPoint(vertices[i].position);
            }
            
            allVertices.AddRange(vertices);
            
            // Get faces and offset indices
            Face[] faces = mesh.faces.ToArray();
            foreach (Face face in faces)
            {
                int[] indices = face.indices.ToArray();
                for (int i = 0; i < indices.Length; i++)
                {
                    indices[i] += vertexOffset;
                }
                Face newFace = new Face(indices);
                allFaces.Add(newFace);
            }
            
            vertexOffset += vertices.Length;
        }
        
        // Create new mesh
        ProBuilderMesh combinedMesh = ProBuilderMesh.Create(
            allVertices.ToArray(),
            allFaces.ToArray()
        );
        
        combinedMesh.ToMesh();
        combinedMesh.Refresh();
        
        return combinedMesh;
    }
    
    // Utility methods
    public void SaveMeshAsset(ProBuilderMesh mesh, string path)
    {
        #if UNITY_EDITOR
        UnityEditor.AssetDatabase.CreateAsset(mesh.mesh, path);
        UnityEditor.AssetDatabase.SaveAssets();
        Debug.Log($"Mesh saved to: {path}");
        #else
        Debug.LogWarning("SaveMeshAsset only works in the Unity Editor");
        #endif
    }
    
    public void OptimizeMesh(ProBuilderMesh mesh)
    {
        // Remove duplicate vertices
        MergeVertices.MergeDuplicateVertices(mesh);
        
        // Optimize mesh topology
        mesh.Optimize();
        
        mesh.ToMesh();
        mesh.Refresh();
    }
}

// Helper class for creating parametric shapes
public static class ProBuilderParametricShapes
{
    public static ProBuilderMesh CreateParametricBox(Vector3 size, int subdivisions)
    {
        ProBuilderMesh box = ShapeGenerator.CreateShape(ShapeType.Cube, PivotLocation.Center);
        box.transform.localScale = size;
        
        for (int i = 0; i < subdivisions; i++)
        {
            Subdivision.Subdivide(box);
        }
        
        return box;
    }
    
    public static ProBuilderMesh CreateParametricSphere(float radius, int subdivisions)
    {
        ProBuilderMesh sphere = ShapeGenerator.CreateShape(ShapeType.Icosphere, PivotLocation.Center);
        
        for (int i = 0; i < subdivisions; i++)
        {
            Subdivision.Subdivide(sphere);
        }
        
        sphere.transform.localScale = Vector3.one * radius * 2;
        sphere.ToMesh();
        sphere.Refresh();
        
        return sphere;
    }
}`;