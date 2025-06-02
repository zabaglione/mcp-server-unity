export const getProBuilderMeshEditorTemplate = (className: string) => `using UnityEngine;
using UnityEngine.ProBuilder;
using UnityEngine.ProBuilder.MeshOperations;
using System.Collections.Generic;
using System.Linq;

[RequireComponent(typeof(ProBuilderMesh))]
public class ${className} : MonoBehaviour
{
    private ProBuilderMesh proMesh;
    
    [Header("Selection")]
    public SelectionMode selectionMode = SelectionMode.Face;
    public List<int> selectedIndices = new List<int>();
    
    [Header("Operations")]
    public float extrudeAmount = 0.5f;
    public float bevelAmount = 0.1f;
    public float insetAmount = 0.1f;
    public int subdivisionLevel = 1;
    
    [Header("Materials")]
    public Material[] materials;
    public int currentMaterialIndex = 0;
    
    public enum SelectionMode
    {
        Vertex,
        Edge,
        Face,
        Object
    }
    
    void Awake()
    {
        proMesh = GetComponent<ProBuilderMesh>();
        if (proMesh == null)
        {
            proMesh = gameObject.AddComponent<ProBuilderMesh>();
        }
    }
    
    // Face Operations
    public void ExtrudeSelectedFaces()
    {
        if (selectionMode != SelectionMode.Face || selectedIndices.Count == 0)
            return;
            
        Face[] faces = GetSelectedFaces();
        proMesh.Extrude(faces, ExtrudeMethod.FaceNormal, extrudeAmount);
        RefreshMesh();
    }
    
    public void InsetSelectedFaces()
    {
        if (selectionMode != SelectionMode.Face || selectedIndices.Count == 0)
            return;
            
        Face[] faces = GetSelectedFaces();
        proMesh.InsetFaces(faces, insetAmount);
        RefreshMesh();
    }
    
    public void DeleteSelectedFaces()
    {
        if (selectionMode != SelectionMode.Face || selectedIndices.Count == 0)
            return;
            
        Face[] faces = GetSelectedFaces();
        proMesh.DeleteFaces(faces);
        RefreshMesh();
        ClearSelection();
    }
    
    // Edge Operations
    public void BevelSelectedEdges()
    {
        if (selectionMode != SelectionMode.Edge || selectedIndices.Count == 0)
            return;
            
        Edge[] edges = GetSelectedEdges();
        Bevel.BevelEdges(proMesh, edges, bevelAmount);
        RefreshMesh();
    }
    
    public void ConnectSelectedEdges()
    {
        if (selectionMode != SelectionMode.Edge || selectedIndices.Count < 2)
            return;
            
        Edge[] edges = GetSelectedEdges();
        Connect.ConnectEdges(proMesh, edges);
        RefreshMesh();
    }
    
    // Vertex Operations
    public void MergeSelectedVertices()
    {
        if (selectionMode != SelectionMode.Vertex || selectedIndices.Count < 2)
            return;
            
        int[] vertices = selectedIndices.ToArray();
        MergeVertices.Merge(proMesh, vertices);
        RefreshMesh();
        ClearSelection();
    }
    
    public void WeldSelectedVertices(float threshold = 0.01f)
    {
        if (selectionMode != SelectionMode.Vertex || selectedIndices.Count < 2)
            return;
            
        int[] vertices = selectedIndices.ToArray();
        WeldVertices.WeldVertices(proMesh, vertices, threshold);
        RefreshMesh();
    }
    
    // Mesh Operations
    public void SubdivideMesh()
    {
        Subdivision.Subdivide(proMesh);
        RefreshMesh();
    }
    
    public void TriangulateMesh()
    {
        proMesh.ToTriangles();
        RefreshMesh();
    }
    
    public void ConformNormals()
    {
        MeshOperations.ConformNormals(proMesh);
        RefreshMesh();
    }
    
    public void FlipNormals()
    {
        foreach (Face face in proMesh.faces)
        {
            face.Reverse();
        }
        RefreshMesh();
    }
    
    // Material Operations
    public void ApplyMaterialToSelection()
    {
        if (materials == null || materials.Length == 0 || currentMaterialIndex >= materials.Length)
            return;
            
        Material mat = materials[currentMaterialIndex];
        
        if (selectionMode == SelectionMode.Face)
        {
            Face[] faces = GetSelectedFaces();
            foreach (Face face in faces)
            {
                face.submeshIndex = currentMaterialIndex;
            }
            
            MeshRenderer renderer = GetComponent<MeshRenderer>();
            Material[] mats = new Material[currentMaterialIndex + 1];
            for (int i = 0; i <= currentMaterialIndex; i++)
            {
                mats[i] = i < materials.Length ? materials[i] : mat;
            }
            renderer.sharedMaterials = mats;
        }
        
        RefreshMesh();
    }
    
    // UV Operations
    public void ProjectUVs(AutoUnwrapSettings settings)
    {
        if (selectionMode != SelectionMode.Face || selectedIndices.Count == 0)
        {
            // Apply to all faces
            foreach (Face face in proMesh.faces)
            {
                face.uv = settings;
            }
        }
        else
        {
            // Apply to selected faces
            Face[] faces = GetSelectedFaces();
            foreach (Face face in faces)
            {
                face.uv = settings;
            }
        }
        
        proMesh.RefreshUV();
        RefreshMesh();
    }
    
    // Helper Methods
    Face[] GetSelectedFaces()
    {
        return proMesh.faces.Where((face, index) => selectedIndices.Contains(index)).ToArray();
    }
    
    Edge[] GetSelectedEdges()
    {
        List<Edge> edges = new List<Edge>();
        SharedVertex[] sharedVertices = proMesh.sharedVertices;
        
        foreach (int index in selectedIndices)
        {
            if (index < proMesh.edgeCount)
            {
                edges.Add(proMesh.GetEdges()[index]);
            }
        }
        
        return edges.ToArray();
    }
    
    void RefreshMesh()
    {
        proMesh.ToMesh();
        proMesh.Refresh();
    }
    
    void ClearSelection()
    {
        selectedIndices.Clear();
    }
    
    // Utility Methods for Creating Complex Shapes
    public static ProBuilderMesh CreateBox(Vector3 size)
    {
        ProBuilderMesh mesh = ShapeGenerator.CreateShape(ShapeType.Cube, PivotLocation.Center);
        mesh.transform.localScale = size;
        return mesh;
    }
    
    public static ProBuilderMesh CreateRoom(Vector3 size, float wallThickness)
    {
        // Create outer box
        ProBuilderMesh outer = CreateBox(size);
        
        // Create inner box
        ProBuilderMesh inner = CreateBox(size - Vector3.one * wallThickness * 2);
        
        // Subtract inner from outer
        ProBuilderMesh result = CSG.Subtract(outer.gameObject, inner.gameObject);
        
        // Clean up
        DestroyImmediate(outer.gameObject);
        DestroyImmediate(inner.gameObject);
        
        return result.GetComponent<ProBuilderMesh>();
    }
}`;