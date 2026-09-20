# Robloxワールド

`.rbxl` / `.rbxlx` のドロップから、WorkerでWorkspace内のパーツ・画像をGLBへ変換し、既存の3Dモデルの位置合わせへ進む。画像ファイルの追加ドロップは不要。

## 対応範囲

- バイナリ version 0（非圧縮 / LZ4 / Zstandard）とXML version 4。
- PartのBlock / Ball / Cylinder / Wedge、WedgePart、Seat / VehicleSeat / SpawnLocationの基本形状。
- CFrame、size / Size、Color3uint8 / Color、Transparency。子のCFrameもワールド座標として扱い、親Modelのピボットを加算しない。
- 背景用の巨大なBaseplateを自動除外する。対象は名前が`Baseplate`の水平な箱型Partで、幅・奥行きがともに256 studs以上、厚みが短辺の1/16以下。通常の床や地面のMeshPartは残す。
- 箱型パーツのDecalとTexture。下地の色と画像を合成し、面を重ねずに表示する。単独の繰り返し画像は元の解像度を保持し、複数画像を重ねた面は最大4096×4096ピクセルへ合成する。Face、Color3、Transparency、ZIndex、StudsPerTileU/V、OffsetStudsU/V。
- MeshPartの静的FileMesh version 2〜5、LOD0の形状・UV、TextureID / TextureContent、SurfaceAppearanceのColorMap / NormalMap / RoughnessMap / MetalnessMap。画像はPNG / JPEG。
- 標準Materialの画像・PBR。MaterialService.Use2022Materialsによる旧材質切替。Neonはunlit、Plastic / SmoothPlastic / Glass等は粗さも設定する。
- MaterialService配下のMaterialVariantを名前とBaseMaterialで解決し、パーツの明示指定とサービスの材質上書きに対応する。StudsPerTileを面の実寸UVへ変換する。
- 粗さ画像をglTFのG、金属感画像をBに合成し、法線画像をnormalTextureへ格納する。カラー画像のないPBR材質も扱う。材質の上のDecalは下地と合成し、PBR用UVは別に保持する。
- SurfaceAppearanceのAlphaMode=Overlayは透明部分をPart.Colorで埋め、Transparencyは画像のアルファを保持する。TintMaskはアルファに応じて色を混ぜ、Opaqueはアルファを無視する。SurfaceAppearance.Colorはカラー画像へ適用する。
- 同じ素材IDの取得をまとめ、最大4件を並行処理する。公開アセットはRobloxの配信APIから取得する。取得できた画像は重複を除いてGLB内に格納し、配置後のモデルは外部URLに依存しない。
- 画像だけ取得に失敗した場合はパーツの色で表示する。MeshIdの取得失敗・未対応メッシュは省略し、理由と件数を通知する。表示可能なパーツがなくなった場合はエラーにする。
- 水平中心と底面をローカル原点へ寄せ、Y-upを保つ。ダイアログのキャンセル・ファイル切替でWorkerと進行中の取得を終了する。

未対応: Union等の演算形状、SpecialMesh付きPart、CornerWedge、Truss、Terrain、ボーン付きメッシュ、曲面・MeshPart上のDecal、EmissiveMask、Decalの新しいUVScale・Rotation、スクリプト・物理・照明。旧BrickColorのみのパーツはグレーで代替する。

標準材質はRoblox公式の画像IDを参照した近似。専用シェーダー、tintmask、標準材質ごとの細かな繰り返し幅、Glassの屈折、Neonの発光・ブルームは再現しない。標準材質のタイル幅は8 studsとする。Organicは通常の繰り返しに置き換えて通知する。球・斜面・任意メッシュのタイル材質は主法線方向への投影で近似する。SurfaceAppearanceはメッシュ固有UVを使う。

## 素材の事前配置

`.rbxl` は通常、画像・メッシュの実体ではなくアセットIDを保持する。公開アセットは直接取得し、認証が必要なアセットは下記のOpen Cloud経路を使う。Roblox組み込み画像は元ファイルの事前配置が必要。利用できる元の素材を以下に配置すると、ワールドファイルだけのドロップで読み込める。

```text
frontend/static/roblox/
  assets/
    101                         # rbxassetid://101 の画像。PNG/JPEGを拡張子なしで置く
    201                         # rbxassetid://201 のFileMesh本体。拡張子なし
  builtin/
    textures/
      test.png                  # rbxasset://textures/test.png
```

IDとファイル名は説明用の架空値。配置時はワールドが参照する実際のID・パスに合わせる。`static/roblox/` はGit管理から除外している。メッシュにはRoblox FileMesh形式が必要で、OBJ / FBXを拡張子だけ変えて配置しても読めない。

S3 / CloudFront等へ同じ構成を置く場合は、フロントエンドの環境変数を設定する。

```dotenv
PUBLIC_ROBLOX_RESOURCE_URL=https://test-assets.invalid/roblox
```

空欄の場合はアプリのベースパス配下の `/roblox` を使う。設定変更後はdev serverの再起動、または本番の再ビルドが必要。外部配信ではアプリからのGETを許可するCORSを設定する。

配置先が未配置の場合は認証付きAPI、未設定なら公開APIへ進む。ローカル開発では未配置を204で返し、通常のフォールバックで404ログを出さない。Roblox APIのCORS回避は既存の `platform/proxy.ts` を通じて**開発環境のみ**に適用する。本番は静的配信のため、このdev proxyは存在しない。Roblox側のCORSで取得できない素材も、上記の配信先に事前配置する。認証情報をブラウザへ埋め込む実装は行わない。

## Open Cloudで認証が必要な素材を取得する

`frontend/.env.local` に設定する。APIキーには `legacy-asset:manage` の権限が必要。キーの所有者が利用できないアセットは取得できない。

```dotenv
ROBLOX_API_KEY=...
```

開発サーバーを再起動すると、`localhost` / `127.0.0.1` からのドロップで、配置済み素材 → ローカル認証付きAPI → 公開APIの順に取得する（認証付きAPI未設定の場合のみ公開APIへ進む）。LAN経由の開発アクセスでは認証付きAPIを利用できない。キーはNode側だけが保持し、CDNへも転送しない。公式APIが返す `*.rbxcdn.com` と `contentdelivery.roblox.com` のHTTPS配信先に対応する。

本番・オフライン用に、ワールドが参照する画像とメッシュをまとめて事前配置できる。

```sh
pnpm --dir frontend run roblox:prepare '/path/to/world.rbxl'
```

ワールドに含まれない標準材質もまとめて取得する場合:

```sh
pnpm --dir frontend run roblox:prepare --standard-materials
```

現行39種・旧版18種のカラー・法線・粗さ・金属感画像を保存する。現在の対応表では重複を除いて179件。ワールドファイルを続けて指定すれば、そのワールド固有の素材も一緒に取得できる。ユーザー作成の独自材質・メッシュや、Studioの組み込み画像は標準材質一式に含まれない。

`.rbxlx`、複数ファイル指定にも対応する。保存先は `frontend/static/roblox/assets/`。既存ファイルは上書きしない。未取得の素材はIDと理由を表示して終了コード1を返す。S3等へ配信するときは、使用する素材の公開範囲に合わせてこのフォルダを配置する。本番ブラウザにAPIキーを設定する必要はない。

## 検証と参照

架空XML・バイナリ・FileMesh生成器で、圧縮展開、階層、回転、色、面・UV、素材重複、取得失敗、GLBの画像埋め込みを検証する。Three.js GLTFLoaderによる読み戻しも行う。

- [Robloxのワールド形式](https://create.roblox.com/docs/projects/place-files)
- [rbx-dom XML形式](https://dom.rojo.space/xml.html)
- [rbx-dom バイナリ形式](https://dom.rojo.space/binary.html)
- [Texture](https://create.roblox.com/docs/reference/engine/classes/Texture)
- [SurfaceAppearance](https://create.roblox.com/docs/reference/engine/classes/SurfaceAppearance)
- [FileMesh形式の記述](https://devforum.roblox.com/t/roblox-filemesh-format-specification/326114)

- [標準材質の画像ID](https://create.roblox.com/docs/parts/materials)
- [MaterialService](https://create.roblox.com/docs/reference/engine/classes/MaterialService)
- [Open Cloud Asset Deliveryの認証](https://devforum.roblox.com/t/creator-action-required-new-asset-delivery-api-endpoints-for-community-tools/3574403)
