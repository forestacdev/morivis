# DWG

同梱WASMのopencadcodecでDWGを読み、通常の図形はDXF経由、ACISソリッドはopencadkernelでメッシュ化して解析する。サーバーへのファイル送信は行わない。
`DwgForm.svelte` と `DxfForm.svelte` は `CadForm.svelte` を共用する。

- ドロップ時は通常図形とソリッドのレイヤー・種類だけを読み取り、ACISの解析・三角形化はしない。読み込み方式とレイヤーを選び、既存の決定ボタンで選択したソリッドだけを変換する。通常の線・点だけを選んだ場合はソリッド変換を実行しない。
- 三角形化は最大4つのWorkerに部品単位で分担する。空いたWorkerへ次の部品を渡し、完了順にかかわらず元の部品順へ戻す。図面全体は各Workerへ複製せず、キャンセル時は準備・変換の全Workerを終了する。
- 単位変更は読み取り済みの通常図形を換算し、再解析しない。ソリッドを2Dに投影する場合は、決定後に三角形化する。
- 変換できない部品がある場合は一覧を表示してフォームに留まり、同じ決定ボタンで残りを読み込む。この再確認では変換済みメッシュを再利用する。
- 3DFACE・ポリフェイスは、色とレイヤー、XYZ座標を保持して色付きGLBへ変換する。
- 図面の単位をメートルへ換算する。単位指定がない場合はフォームで選択する。手動指定で上書きもできる。
- 3Dモデルは既存のモデル配置フォームを経由し、`MeshEntry` として登録する。
- ACISの解析結果は、頂点・面の番号を連続したバイナリで受け渡し、WorkerからArrayBufferを転送する。3D表示ではGeoJSONの面配列へ展開せず、BufferGeometryを直接構築する。
- GeoJSON APIや2D登録を選んだ場合だけ、必要なソリッドを座標配列へ展開する。
- 原点の移動、Z-upからY-upへの変換、部品の分割は [DXF](../dxf/README.md) と共通。
- 線・点の登録や、面を2Dポリゴン・輪郭線として読み込む経路も利用できる。
- DWGの3DSOLID・BODY・REGIONはSAT/SABを解析し、対応する面を三角形へ変換する。箱・円柱・球を両形式で検証している。
- 平面の連続した重複境界点や、2辺の両端だけでは面積が消える細い面は、元の曲線・曲面と許容差を保って再試行する。欠けた面が残る部品は引き続き全体を除外する。
- ACIS内部の配置と通常のINSERTの基点・倍率・回転を反映する。ソリッドごとのオブジェクト境界を保持する。色はエンティティ色・ByLayer・ByBlockを使用する。
- 未対応形状や欠けた面が検出された場合、その部品全体を除外し、レイヤー・ID・理由をフォームに表示する。変換できた残りの部品は既存の登録操作で読み込める。複雑な曲面・配列複写（MINSERT）内のACIS・Civil 3D専用オブジェクト・外部参照・面別材質やテクスチャの完全再現は対象外。
- ACISの読み込みはDWGのみ。DXFの3DSOLIDを直接読み込む経路は未対応。
- DWGの入力上限は128 MiB。アプリ独自の三角形数・処理時間の上限は設けない。実際に読み込める規模はブラウザーとWASMのメモリ容量に依存する。フォームを閉じた場合はWorkerを終了する。
- 変換ライブラリやDXFパーサーが扱えない要素は読み込まれない。図形が一つも得られなかった場合は理由を通知する。

## テストデータ

`__fixtures__/test-mesh.dxf` は、任意座標の垂直面を持つポリフェイス・3DFACE・2D線を手作業で作った架空データ。
単位はmm、レイヤーは `test-mesh` / `test-face` / `test-line`。実在の図面に由来しない。
`test-mesh.dwg` はこのDXFをacadrust 0.5.5で変換したバイナリ。生成には次のRustコードを使った。
通常のアプリ実行・テストにはRustは不要。

```rust
use acadrust::{DxfReader, DwgWriter};
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = std::env::args().collect();
    let doc = DxfReader::from_file(&args[1])?.read()?;
    DwgWriter::write_to_file(&args[2], &doc)?;
    Ok(())
}
```

依存を `acadrust = "=0.5.5"` に固定したCargoプロジェクトで、入力DXFと出力DWGのパスを引数に渡す。
単体テストは実際の同梱WASMでDWGを読み、高さ・寸法・色・レイヤー・単位上書き・2D変換・不正入力を検証する。

ACIS用の架空データは `tools/dwg-acis/src/bin/fixtures.rs` から生成する。

- `test-solids-sat.dwg`: R2007のSAT、箱・円柱・球と2D線、mm単位。
- `test-solids-sab.dwg`: R2018のSAB、同じ図形と単位。
- `test-placed-solids.dwg`: ACIS内部の平行移動とINSERTの基点・回転・倍率、ByLayer/ByBlock色。
- `test-unsupported-solid.dwg`: 未対応の曲面レコードを含む。対象と理由を表示し、登録できる図形がない状態を検証する。
- `test-partial-solids.dwg`: 正常な箱・未対応部品・2D線の混在。部品単位の除外と残りの登録を検証する。
- `test-parallel-solids.dwg`: 架空の箱8部品。4つのWorkerでの分担と再利用を検証する。
- `test-trimmed-solid.dwg`: 架空の箱の1面をNURBS化し、トリム座標を微小にずらした形状。元の3D辺からの再計算を検証する。
- `test-shallow-lens.dwg`: 架空の細いレンズ形のNURBS面。2本の曲線が両端だけにサンプリングされる場合の中点分割と、面積・向きを検証する。

WASMの再生成手順・固定した依存バージョン・ライセンス情報は `tools/dwg-acis/` と `static/vendor/dwg-acis/NOTICE.md` を参照。

静的ランタイムは公開URLから動的に読み込む。`static/`配下を直接importすると、本番ビルドが通っても開発サーバーでWorkerが起動しないため、両環境でCADアップロードを確認する。

```sh
PLAYWRIGHT_DEV=1 pnpm --dir frontend exec playwright test e2e/cad-upload.test.ts
pnpm --dir frontend exec playwright test e2e/cad-upload.test.ts
```

本番側のテストは事前に `pnpm --dir frontend build` を実行する。

## 地理参照

モデル空間のGEODATAに投影グリッドとEPSG Aliasがある場合、共通のDXF読み取りで座標系を取得する。EPSGコードは座標系のAliasから取り、測地系・楕円体のAliasと混同しない。
自動単位ではGEODATAのメートル換算値を使う。既存の決定操作から、2DはWGS84へ変換し、3Dは原点の緯度経度・高さを求めて手動配置を省略する。
3Dの方位・縮尺はモデル原点での投影の局所線形近似で補正する。広域モデル全体を頂点ごとに再投影する機能ではない。
元の投影グリッドを使うため、Local Grid用の参照点やNorthDirection、Geo-Meshを重ねて適用しない。埋め込みの任意の測地変換定義ではなく、EPSG辞書の変換定義を使う。
ローカルグリッド、緯度経度入力、未知の座標系、複数の参照、傾いた上方向、水平・垂直で異なる単位や独自縮尺補正は自動配置せず、従来の選択・位置合わせへ進む。単位を手動で上書きした場合も自動配置しない。
モデル原点の再中央化や小さいモデルの自動拡大は行わず、図面の位置と寸法を保持する。
仕様: [Autodesk GEODATA](https://help.autodesk.com/cloudhelp/2024/ENU/AutoCAD-DXF/files/GUID-104FE0E2-4801-4AC8-B92C-1DDF5AC7AB64.htm)。
