# VRML

VRML 2.0（`.wrl` / `.vrml`）を既存の `MeshEntry` と three.js の描画経路で扱う。

- `parseVrmlText` / `parseVrmlFile`: `VRMLLoader` で形状・材質・画像を読み込む。
- `inspectVrmlFile`: `ImageTexture` の先頭URLを調べ、アップロード画面で不足画像を案内する。
- 範囲計算Workerでは `skipTextures: true` とし、画像の読み込みを省く。
- ローカルモデルはY-upとして原点を補正する。投影座標を持つモデルは既存の座標系選択へ進む。

外部画像はモデルと一緒に選択するか、フォルダごとドロップする。パスの区切りと大文字・小文字を正規化し、登録済みのBlob URLへ解決する。

対応範囲はthree.jsの `VRMLLoader` に準じる。VRML 1.0、外部VRMLを参照する `Inline`、スクリプトやセンサーによる動作は対象外。

テストは手作業で作った `__fixtures__/test-textured.wrl` を使用する。
