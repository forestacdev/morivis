# CZML

`@cesium/engine` の公式 `CzmlDataSource` でCZML 1.0を読み取り、WGS84のGeoJSON、またはglTFのmesh entryへ変換する。描画は既存のMapLibre・Three.js runtimeを使用し、Cesium Viewerは起動しない。デコーダーは専用Worker内で実行する。

## 読み込み範囲

- `.czml` と、先頭のdocumentパケットで内容判定した `.json`。ZIP展開後も同じ判定。複数ファイルはフォームで切り替えて個別に登録する。
- `position` の固定位置と時刻付き位置、`polyline.positions`、`polygon.positions`・`polygon.holes`。
- WGS84の `cartographicDegrees` / `cartographicRadians` と、`FIXED`（地球固定）・`INERTIAL`（ICRF慣性系）の `cartesian` / `cartesianVelocity`。
- ISO8601の時刻と、`epoch` からの秒数。`availability`、プロパティの時間区間、`show`、同じIDの更新、`delete`、別エンティティの `position` への参照。
- 定数の文字列・数値・真偽値の任意属性。動的な任意属性やHTMLのdescriptionは対象外。

ファイル中のサンプル時刻、時間区間の両端、document.clockのcurrentTimeを評価時刻として集める。各時刻でCesiumのプロパティを評価し、ポイント・ライン・ポリゴンに `time` を付ける。補間はCesiumの実装を使用する。元データの時刻間に表示フレームを追加生成するものではなく、既存の離散タイムラインで選択・再生する。

動く位置からは別途「軌跡」を生成する。availabilityやpositionの区間の切り替わり、測位のない区間、日付変更線では線を分割する。軌跡は全期間を表示し、開始・終了時刻を属性に保持する。静的な入力に日付は補わない。時系列入力に含まれる静的地物は各評価時刻に含める。

## INERTIAL座標

INERTIALは地球の自転に追従しない慣性座標系。`position.referenceFrame: "INERTIAL"` をCesiumで評価し、各時刻の地球固定座標からWGS84へ変換する。ポイント・軌跡・位置参照による線と面・3Dモデルで共通の変換を使う。慣性系で一定の位置も地図上では時間とともに動く。サンプルは慣性系で補間してから変換する。向きはCZML仕様どおり地球固定系のquaternion、または変換済み位置に基づくvelocityReferenceを使用する。

時計・availability・サンプルのいずれかで評価時刻が必要。時刻がない場合は任意の日付で補わずエラーにする。線・面の座標配列に直接referenceFrameを付ける形式はCesiumが評価しないため、INERTIALのpositionへのreferencesを使う。

Cesium 26.3に含まれるIAU2006 XYS表をViteの`cesium-assets-plugin.ts`でアプリと一緒に配信し、必要な期間だけWorkerが先読みする。表の範囲はTTのJulian day 2442396.5から27426日間（およそ1974年12月中旬〜2050年1月中旬）。velocityReference用に前後1秒も必要。期間外や表の取得失敗では登録を止め、TEMEへの近似フォールバックは使用しない。FIXEDのみの入力では表を読み込まない。

EOP（極運動・UT1−UTCなどの実測補正）はCesium既定のゼロ補正を使用する。精密な軌道解析用の変換精度を保証するものではない。時刻は入力の離散時刻を使い、軌道計算や追加の時間サンプリングは行わない。

## テキスト入力

フォームの「ファイル／テキスト」で切り替える。テキストは「登録」を押したときに、ファイルと同じWorker・容量制限で解析する。表示種類が複数ある場合は種類を選んで同じ「登録」で確定する。入力を編集したときは解析結果を破棄し、以前の内容を登録しない。テキスト入力のモデル参照はHTTP(S)の絶対URLまたは自己完結したdata URIを使う。ローカルの関連ファイルを参照する場合はファイル入力を使う。

## 画像マーカー（billboard）

`billboard.image`の画像を通常のPoint vector entryとして登録する。PNG・JPEG・WebP、HTTP(S) URL・data URI・CZMLからの相対参照に対応する。CZMLを先に読み込むと不足画像のファイル名を表示する。画像はフォームへ後から追加ドロップ・選択できる。一式の同時選択や、フォルダー構成を保ったZIPにも対応する。テキスト入力はHTTP(S)絶対URLかdata URIを使う。外部URLにはCORS許可が必要。

位置・availability・show・imageの時間区間、大きさ（width/height/scale）、回転、色・透過、原点、pixelOffsetをCesiumで各時刻に評価する。画像の大きさと色、配置はPNGへ反映し、枠や吹き出しを付けずに画面の正面へ表示する。画面座標のpixelOffsetは右・下が正。参照画像は登録時に取得し、表示設定ごとにdata URIをentryの画像表へ保存する。地物には画像IDだけを持たせ、同じ画像を時刻の数だけ重複保存しない。

時系列は既存の時間フィルターを1時刻表示で開始する。show=false・縮尺0・透明な時刻も選択肢に残し、その時刻には画像を表示しない。登録・取消・入力変更時は取得を中断し、デコードしたImageBitmapを解放する。失敗した画像を無言でポイントへ置き換えて登録しない。

地図上の2D表示で、楕円体高は属性として保持する。メートル単位のサイズ、距離に応じたサイズ・透明度、eyeOffset/alignedAxisなど3D方向の指定、heightReference、imageSubRegionは再現せず、入力に含まれる場合はフォームで説明する。アニメーション画像のフレーム再生は対象外。画像の時間区間による差し替えは対応する。

参照画像128枚、入力画像合計32 MiB、デコード画像合計16,777,216ピクセル、画像と表示設定の組み合わせ256種類。回転・オフセット後の画像は各2048×2048以内、合計16,777,216ピクセル、保存するdata URI合計32 MiBに制限する。

## 3Dモデル

`model.gltf` のglTF 2.0 / GLBを読み込む。CZMLだけを先に読み込むと不足モデルを案内する。モデルを追加した際には、glTF/GLB内の外部バッファ・画像も検査し、不足ファイルを表示する。フォームへの追加ドロップ・選択で一式を揃えられる。同じパスのファイルは差し替え、入力したデータ名と表示種類は保持する。一式の同時選択・ドロップも使える。ZIPではフォルダー構造を保持する。CZMLからモデルへの参照、glTFからバッファ・画像への参照を、それぞれのファイル位置から解決する。同名の候補が複数ある場合は曖昧に選択しない。事前検査はローカルファイルのみを対象にし、公開URLは登録時に取得する。モデル・画像が不足していてもポイントや軌跡は登録できる。HTTP(S) URLと自己完結したdata URIも使用できる。外部配信には配信元のCORS許可が必要。

`position`・`orientation.unitQuaternion`・`orientation.velocityReference`・`model.scale`・`model.show`・availabilityをCesiumで評価する。orientation・scaleだけのサンプル時刻も収集する。glTFのY-up/Z-forwardをCesiumと同じZ-up/X-forwardへ補正し、ENUから地図のモデル座標へ変換する。楕円体高を高さに使い、地形の有無でゼロへ戻さない。

複数エンティティを1つのGLBにまとめ、配置行列と非表示区間を `ModelEntryProperties.nodeTransforms` に保存する。既存のmodel temporal dimensionの選択・再生でruntimeがノード変換を反映する。entryにはThree.jsの実体を保持しない。登録時に関連ファイルをGLBへ内包し、一時URLと読み込みオブジェクトを解放する。

モデルは128インスタンス・32種類の参照ファイル・関連ファイル合計128 MiB・描画100万頂点が上限。Draco・Meshopt圧縮に対応。KTX2テクスチャ、モデル内のアニメーション、nodeTransformations・articulations、minimumPixelSize、地面への追従、CZMLによるマテリアルの上書きは対象外。通常のglTFマテリアルと画像テクスチャを保持する。

## 制限

- ベクター図形は2D表示。ポイントの楕円体高は属性に保持し、地形標高として使用しない。ライン・ポリゴンは地図上へ投影する。
- ラベル、押し出し、立体図形は再現しない。位置があればポイントとして表示し、フォームに説明する。
- 画像マーカー以外のCZMLによる色・線幅・マテリアル・leadTime/trailTimeなどCesium固有の表示設定は再現しない。
- `.json` の自動判定は先頭64 KiBのdocumentパケットを読む。documentがこれより大きい場合は `.czml` を使用する。
- 入力32 MiB・25万座標、評価時刻1万件、地物数×時刻数20万、出力20万地物・評価座標100万点、Worker上限120秒。上限を超えると登録せず分割を求める。

CesiumのプロパティデコーダーがDOMのImageコンストラクターを型比較に参照するため、Workerでは型比較専用の識別子を補う。Worker内で画像をデコード・取得しない。任意属性はプリミティブな定数だけを別に保持する。entry・ストアにはCesiumのオブジェクトを保存しない。

参照: [CZML仕様](https://github.com/AnalyticalGraphicsInc/czml-writer/wiki/CZML-Structure)、[CzmlDataSource](https://cesium.com/learn/cesiumjs/ref-doc/CzmlDataSource.html)
