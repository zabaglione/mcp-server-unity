# Unity MCP Server - 利用可能なツール一覧

## プロジェクト管理
- `project_setup_path` - Unityプロジェクトのパスを設定
- `project_read_info` - プロジェクト情報を取得

## アセット作成
- `asset_create_script` - C#スクリプトを作成
- `asset_create_scene` - Unityシーンを作成
- `asset_create_material` - マテリアルを作成
- `asset_create_shader` - シェーダーを作成

## アセット読み取り
- `asset_read_script` - C#スクリプトを読み取る
- `asset_list_scripts` - 全スクリプトを一覧表示
- `asset_list_shaders` - 全シェーダーを一覧表示
- `asset_list_all` - アセットを一覧表示

## エディター拡張
- `editor_create_script` - エディター拡張スクリプトを作成
- `editor_list_scripts` - エディタースクリプトを一覧表示

## ProBuilder/モデリング
- `modeling_create_script` - ProBuilderスクリプトを作成
- `modeling_create_prefab` - ProBuilderプレハブを作成
- `modeling_list_scripts` - ProBuilderスクリプトを一覧表示

## パッケージ管理
- `package_search` - Unityパッケージを検索
- `package_install` - パッケージをインストール
- `package_remove` - パッケージを削除
- `package_list` - インストール済みパッケージを一覧表示
- `package_install_multiple` - 複数パッケージを一括インストール

## ビルド操作
- `build_execute_project` - プロジェクトをビルド

## システム操作
- `system_setup_refresh` - Unity refreshハンドラーをインストール
- `system_refresh_assets` - アセットデータベースを更新
- `system_batch_start` - バッチ操作を開始
- `system_batch_end` - バッチ操作を終了

## 診断ツール
- `diagnostics_set_unity_path` - Unity実行ファイルのパスを設定
- `diagnostics_read_editor_log` - Unity Editorログを読み取る
- `diagnostics_compile_scripts` - スクリプトをコンパイルしてエラーを取得
- `diagnostics_validate_assets` - アセットの整合性を検証
- `diagnostics_run_tests` - Unityテストを実行
- `diagnostics_summary` - 包括的な診断サマリーを取得
- `diagnostics_install_script` - Unity診断スクリプトをインストール
- `diagnostics_read_results` - Unityが保存した診断結果を読み取る