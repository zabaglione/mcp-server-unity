export const getProBuilderShapeTemplate = (className: string) => `using UnityEngine;
using UnityEngine.ProBuilder;
using UnityEngine.ProBuilder.MeshOperations;

public class ${className} : MonoBehaviour
{
    [Header("Shape Settings")]
    public ShapeType shapeType = ShapeType.Cube;
    public Vector3 size = Vector3.one;
    
    [Header("Cube Settings")]
    public Vector3 cubeSize = Vector3.one;
    
    [Header("Cylinder Settings")]
    [Range(3, 64)]
    public int cylinderSides = 12;
    public float cylinderRadius = 0.5f;
    public float cylinderHeight = 2f;
    
    [Header("Sphere Settings")]
    [Range(1, 5)]
    public int sphereSubdivisions = 2;
    public float sphereRadius = 0.5f;
    
    [Header("Plane Settings")]
    public float planeWidth = 1f;
    public float planeHeight = 1f;
    [Range(1, 10)]
    public int planeWidthSegments = 1;
    [Range(1, 10)]
    public int planeHeightSegments = 1;
    
    [Header("Material")]
    public Material defaultMaterial;
    
    public enum ShapeType
    {
        Cube,
        Cylinder,
        Sphere,
        Plane,
        Stairs,
        Arch,
        Torus
    }
    
    void Start()
    {
        CreateShape();
    }
    
    public ProBuilderMesh CreateShape()
    {
        ProBuilderMesh mesh = null;
        
        switch (shapeType)
        {
            case ShapeType.Cube:
                mesh = CreateCube();
                break;
            case ShapeType.Cylinder:
                mesh = CreateCylinder();
                break;
            case ShapeType.Sphere:
                mesh = CreateSphere();
                break;
            case ShapeType.Plane:
                mesh = CreatePlane();
                break;
            case ShapeType.Stairs:
                mesh = CreateStairs();
                break;
            case ShapeType.Arch:
                mesh = CreateArch();
                break;
            case ShapeType.Torus:
                mesh = CreateTorus();
                break;
        }
        
        if (mesh != null && defaultMaterial != null)
        {
            mesh.GetComponent<MeshRenderer>().sharedMaterial = defaultMaterial;
        }
        
        return mesh;
    }
    
    ProBuilderMesh CreateCube()
    {
        GameObject go = GameObject.CreatePrimitive(PrimitiveType.Cube);
        go.name = "ProBuilder Cube";
        
        ProBuilderMesh proMesh = go.AddComponent<ProBuilderMesh>();
        MeshFilter meshFilter = go.GetComponent<MeshFilter>();
        
        // Create cube with ProBuilder
        ProBuilderMesh cube = ShapeGenerator.CreateShape(ShapeType.Cube, PivotLocation.Center);
        cube.transform.position = transform.position;
        cube.transform.localScale = cubeSize;
        
        // Clean up temp object
        DestroyImmediate(go);
        
        return cube;
    }
    
    ProBuilderMesh CreateCylinder()
    {
        ProBuilderMesh cylinder = ShapeGenerator.CreateShape(ShapeType.Cylinder, PivotLocation.Center);
        cylinder.transform.position = transform.position;
        
        // Rebuild with custom parameters
        Bounds bounds = cylinder.mesh.bounds;
        Vector3 size = bounds.size;
        size.x = cylinderRadius * 2;
        size.z = cylinderRadius * 2;
        size.y = cylinderHeight;
        
        cylinder.transform.localScale = size;
        
        return cylinder;
    }
    
    ProBuilderMesh CreateSphere()
    {
        ProBuilderMesh sphere = ShapeGenerator.CreateShape(ShapeType.Icosphere, PivotLocation.Center);
        sphere.transform.position = transform.position;
        
        // Apply subdivisions
        for (int i = 0; i < sphereSubdivisions; i++)
        {
            Subdivision.Subdivide(sphere);
        }
        
        sphere.transform.localScale = Vector3.one * sphereRadius * 2;
        sphere.ToMesh();
        sphere.Refresh();
        
        return sphere;
    }
    
    ProBuilderMesh CreatePlane()
    {
        ProBuilderMesh plane = ShapeGenerator.CreateShape(ShapeType.Plane, PivotLocation.Center);
        plane.transform.position = transform.position;
        plane.transform.localScale = new Vector3(planeWidth, 1, planeHeight);
        
        return plane;
    }
    
    ProBuilderMesh CreateStairs()
    {
        ProBuilderMesh stairs = ShapeGenerator.CreateShape(ShapeType.Stairs, PivotLocation.Center);
        stairs.transform.position = transform.position;
        stairs.transform.localScale = size;
        
        return stairs;
    }
    
    ProBuilderMesh CreateArch()
    {
        ProBuilderMesh arch = ShapeGenerator.CreateShape(ShapeType.Arch, PivotLocation.Center);
        arch.transform.position = transform.position;
        arch.transform.localScale = size;
        
        return arch;
    }
    
    ProBuilderMesh CreateTorus()
    {
        ProBuilderMesh torus = ShapeGenerator.CreateShape(ShapeType.Torus, PivotLocation.Center);
        torus.transform.position = transform.position;
        torus.transform.localScale = size;
        
        return torus;
    }
}

// Extension class for additional ProBuilder operations
public static class ProBuilderExtensions
{
    public static void ExtrudeFaces(this ProBuilderMesh mesh, float distance)
    {
        if (mesh.selectedFaceCount > 0)
        {
            mesh.Extrude(mesh.GetSelectedFaces(), ExtrudeMethod.FaceNormal, distance);
            mesh.ToMesh();
            mesh.Refresh();
        }
    }
    
    public static void BevelEdges(this ProBuilderMesh mesh, float amount)
    {
        if (mesh.selectedEdgeCount > 0)
        {
            Bevel.BevelEdges(mesh, mesh.GetSelectedEdges(), amount);
            mesh.ToMesh();
            mesh.Refresh();
        }
    }
}`;