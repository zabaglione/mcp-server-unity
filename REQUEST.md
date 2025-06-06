# Unity MCP Server Enhancement Instructions

## 概要
Unity MCPサーバーに以下の機能を追加してください：
1. マテリアルのシェーダー変更機能
2. マテリアルプロパティの設定機能  
3. 既存アセットの編集・更新機能

## 実装する新機能

### 1. マテリアル編集機能

#### `asset_update_material_shader`
```json
{
  "description": "Change the shader of an existing material",
  "name": "asset_update_material_shader",
  "parameters": {
    "materialName": {
      "description": "Name of the material file (with or without .mat extension)",
      "type": "string"
    },
    "shaderName": {
      "description": "Full shader name (e.g., 'Universal Render Pipeline/Lit', 'Custom/URP/CubeController')",
      "type": "string"
    }
  },
  "required": ["materialName", "shaderName"]
}
```

#### `asset_update_material_properties`
```json
{
  "description": "Update properties of an existing material",
  "name": "asset_update_material_properties",
  "parameters": {
    "materialName": {
      "description": "Name of the material file",
      "type": "string"
    },
    "properties": {
      "description": "Material properties to update",
      "type": "object",
      "properties": {
        "colors": {
          "type": "object",
          "description": "Color properties (e.g., {'_BaseColor': [1.0, 0.0, 0.0, 1.0]})"
        },
        "floats": {
          "type": "object", 
          "description": "Float properties (e.g., {'_Metallic': 0.5, '_Smoothness': 0.8})"
        },
        "textures": {
          "type": "object",
          "description": "Texture properties (e.g., {'_MainTex': 'path/to/texture.png'})"
        },
        "vectors": {
          "type": "object",
          "description": "Vector4 properties (e.g., {'_Tiling': [1.0, 1.0, 0.0, 0.0]})"
        }
      }
    }
  },
  "required": ["materialName", "properties"]
}
```

### 2. 汎用アセット更新機能

#### `asset_update_script`
```json
{
  "description": "Update content of an existing C# script",
  "name": "asset_update_script", 
  "parameters": {
    "fileName": {
      "description": "Name of the script file",
      "type": "string"
    },
    "content": {
      "description": "New script content",
      "type": "string"
    },
    "backup": {
      "description": "Create backup before updating (default: true)",
      "type": "boolean",
      "default": true
    }
  },
  "required": ["fileName", "content"]
}
```

#### `asset_read_material`
```json
{
  "description": "Read material properties and current shader",
  "name": "asset_read_material",
  "parameters": {
    "materialName": {
      "description": "Name of the material file",
      "type": "string"
    }
  },
  "required": ["materialName"]
}
```

### 3. バッチ処理機能

#### `asset_batch_convert_materials`
```json
{
  "description": "Convert multiple materials to specified shader with property mapping",
  "name": "asset_batch_convert_materials",
  "parameters": {
    "materials": {
      "description": "List of material names to convert",
      "type": "array",
      "items": {"type": "string"}
    },
    "targetShader": {
      "description": "Target shader name",
      "type": "string"
    },
    "propertyMapping": {
      "description": "Mapping from old properties to new properties",
      "type": "object",
      "optional": true
    }
  },
  "required": ["materials", "targetShader"]
}
```

## 実装詳細要件

### エラーハンドリング
- 存在しないアセットファイルの処理
- 無効なシェーダー名の処理
- プロパティ型の不整合の処理
- 読み取り専用ファイルの処理

### Unity Editor連携
```csharp
// C#実装例（参考用）
// EditorUtility.SetDirty()でアセットを保存対象にマーク
// AssetDatabase.SaveAssets()で変更を保存
// AssetDatabase.Refresh()でプロジェクトブラウザを更新
```

### ファイル操作
- `.meta`ファイルの整合性保持
- アセットGUIDの保持
- バックアップ作成機能

### プロパティ型対応
- Color (RGBA float array)
- Float (single float)
- Texture (ファイルパス文字列)
- Vector4 (4 float array)
- Matrix4x4 (16 float array)
- Boolean (0 or 1 float)

## 使用例

### Built-inからURPへの変換
```python
# マテリアルのシェーダーをURPに変更
asset_update_material_shader(
    materialName="CubeMaterial",
    shaderName="Universal Render Pipeline/Lit"
)

# Built-inプロパティをURPプロパティにマッピング
asset_update_material_properties(
    materialName="CubeMaterial",
    properties={
        "colors": {
            "_BaseColor": [0.2, 0.8, 1.0, 1.0]  # _Colorから_BaseColorへ
        },
        "floats": {
            "_Metallic": 0.2,
            "_Smoothness": 0.7
        }
    }
)
```

### カスタムシェーダーの適用
```python
# カスタムURPシェーダーに変更
asset_update_material_shader(
    materialName="CubeMaterial", 
    shaderName="Custom/URP/CubeController"
)

# カスタムプロパティを設定
asset_update_material_properties(
    materialName="CubeMaterial",
    properties={
        "floats": {
            "_PulseSpeed": 2.0,
            "_PulseIntensity": 0.1,
            "_RimPower": 3.0
        },
        "colors": {
            "_RimColor": [0.5, 0.8, 1.0, 1.0]
        }
    }
)
```

### 一括変換
```python
# プロジェクト内の全Built-inマテリアルをURPに変換
materials = ["CubeMaterial", "FloorMaterial", "WallMaterial"]
asset_batch_convert_materials(
    materials=materials,
    targetShader="Universal Render Pipeline/Lit",
    propertyMapping={
        "_Color": "_BaseColor",
        "_MainTex": "_BaseMap",
        "_Glossiness": "_Smoothness"
    }
)
```

## 実装優先度
1. **High**: `asset_update_material_shader` - 基本的なシェーダー変更
2. **High**: `asset_update_material_properties` - プロパティ設定  
3. **Medium**: `asset_read_material` - マテリアル情報取得
4. **Medium**: `asset_update_script` - スクリプト更新
5. **Low**: `asset_batch_convert_materials` - バッチ処理

## テスト要件
- Built-in Standard → URP Lit変換テスト
- カスタムシェーダー適用テスト
- プロパティ型別設定テスト
- エラーケース処理テスト
- バックアップ機能テスト

**自信の度合い：95%**
この指示に従ってMCPサーバーを拡張することで、マテリアル編集機能の不足を完全に解決できます。
