export const CONFIG = {
  server: {
    name: 'unity-mcp-server',
    version: '1.0.0',
  },
  unity: {
    defaultFolders: {
      scripts: 'Scripts',
      scenes: 'Scenes',
      materials: 'Materials',
      shaders: 'Shaders',
      editor: 'Editor',
    },
    buildTargets: [
      'StandaloneWindows64',
      'StandaloneOSX',
      'StandaloneLinux64',
      'iOS',
      'Android',
      'WebGL',
    ],
    assetTypes: {
      all: ['.unity', '.mat', '.cs', '.prefab', '.asset', '.shader', '.shadergraph'],
      scenes: ['.unity'],
      materials: ['.mat'],
      scripts: ['.cs'],
      shaders: ['.shader', '.shadergraph'],
    },
    shaderTypes: {
      builtin: { extension: '.shader', name: 'Built-in Render Pipeline' },
      urp: { extension: '.shader', name: 'Universal Render Pipeline' },
      hdrp: { extension: '.shader', name: 'High Definition Render Pipeline' },
      urpGraph: { extension: '.shadergraph', name: 'URP Shader Graph' },
      hdrpGraph: { extension: '.shadergraph', name: 'HDRP Shader Graph' },
    },
    editorScriptTypes: {
      editorWindow: { name: 'Editor Window', description: 'Custom editor window with GUI' },
      customEditor: { name: 'Custom Editor', description: 'Custom inspector for a component' },
      propertyDrawer: { name: 'Property Drawer', description: 'Custom property drawer for attributes' },
      menuItems: { name: 'Menu Items', description: 'Custom menu items and shortcuts' },
      scriptableObjectEditor: { name: 'ScriptableObject Editor', description: 'Editor for ScriptableObject assets' },
    },
    proBuilderShapes: {
      cube: { name: 'Cube', description: 'Basic cube shape' },
      cylinder: { name: 'Cylinder', description: 'Cylinder with customizable sides' },
      sphere: { name: 'Sphere', description: 'Sphere with subdivision levels' },
      plane: { name: 'Plane', description: 'Flat plane with segments' },
      stairs: { name: 'Stairs', description: 'Staircase shape' },
      arch: { name: 'Arch', description: 'Arch shape' },
      torus: { name: 'Torus', description: 'Torus (donut) shape' },
    },
  },
  paths: {
    darwin: '/Applications/Unity/Unity.app/Contents/MacOS/Unity',
    win32: 'C:\\Program Files\\Unity\\Editor\\Unity.exe',
    linux: 'unity',
  },
  refresh: {
    autoRefresh: true,
    batchTimeout: 5000, // 5 seconds
    minRefreshInterval: 2000, // 2 seconds
    scriptExtensions: ['.cs', '.js', '.boo'],
    shaderExtensions: ['.shader', '.cginc', '.hlsl', '.glslinc'],
  },
};