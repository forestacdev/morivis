# Minecraftの表示素材

利用者は `.mca` だけを読み込む。モデルと画像はここから自動取得する。
Minecraft Java版26.3のモデル・画像を配置済み。`manifest.json` の `blockstates` が空なら従来の色付き表示を使う。

配信に使用する素材をプロジェクト内に置き、リポジトリのルートから実行する。

```sh
pnpm --dir frontend minecraft:prepare materials/minecraft.jar 1.21.1
```

`.jar`・`.zip`・展開済みの素材フォルダーに対応。入力パスはリポジトリのルート基準。
`assets` フォルダー自体も指定できる。素材のバージョンは読み込むワールドと合わせる。
事前準備で使うアーカイブ全体を配信する必要はない。

配置されるファイル:

```text
minecraft/
  manifest.json
  assets/<namespace>/blockstates/*.json
  assets/<namespace>/models/**/*.json
  assets/<namespace>/textures/**/*.png
```

元の名前空間・パスを保ち、親モデルやテクスチャ参照を一緒に配置する。
カスタムリソースパックが本体のモデル・画像を参照する場合、素材フォルダーで本体素材に重ねてから実行する。
コマンドは一覧を再生成する。使用しなくなった素材は必要に応じてリポジトリから削除する。
配置後に `.mca` を再読み込みすると反映される。使用画像はGLB内に埋め込まれる。
