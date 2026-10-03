# CZML

`@cesium/engine` の公式 `CzmlDataSource` でCZML 1.0を読み取り、WGS84のGeoJSON、またはglTFのmesh entryへ変換する。描画は既存のMapLibre・Three.js runtimeを使用し、Cesium Viewerは起動しない。デコーダーは専用Worker内で実行する。

## 読み込み範囲

- `.czml` と、先頭のdocumentパケットで内容判定した `.json`。ZIP展開後も同じ判定。複数ファイルはフォームで切り替えて個別に登録する。
- `position` の固定位置と時刻付き位置、`polyline.positions`、`polygon.positions`・`polygon.holes`。
- WGS84の `cartographicDegrees` / `cartographicRadians` と、地球固定座標 `cartesian` / `cartesianVelocity`。
- ISO8601の時刻と、`epoch` からの秒数。`availability`、プロパティの時間区間、`show`、同じIDの更新、`delete`、別エンティティの `position` への参照。
- 定数の文字列・数値・真偽値の任意属性。動的な任意属性やHTMLのdescriptionは対象外。

ファイル中のサンプル時刻、時間区間の両端、document.clockのcurrentTimeを評価時刻として集める。各時刻でCesiumのプロパティを評価し、ポイント・ライン・ポリゴンに `time` を付ける。補間はCesiumの実装を使用する。元データの時刻間に表示フレームを追加生成するものではなく、既存の離散タイムラインで選択・再生する。

動く位置からは別途「軌跡」を生成する。availabilityやpositionの区間の切り替わり、測位のない区間、日付変更線では線を分割する。軌跡は全期間を表示し、開始・終了時刻を属性に保持する。静的な入力に日付は補わない。時系列入力に含まれる静的地物は各評価時刻に含める。

## 3Dモデル

`model.gltf` のglTF 2.0 / GLBを読み込む。CZMLとモデル・バッファ・画像をまとめて選択またはドロップする。ZIPではフォルダー構造を保持する。CZMLからモデルへの参照、glTFからバッファ・画像への参照を、それぞれのファイル位置から解決する。同名の候補が複数ある場合は曖昧に選択しない。HTTP(S) URLと自己完結したdata URIも使用できる。外部配信には配信元のCORS許可が必要。

`position`・`orientation.unitQuaternion`・`orientation.velocityReference`・`model.scale`・`model.show`・availabilityをCesiumで評価する。orientation・scaleだけのサンプル時刻も収集する。glTFのY-up/Z-forwardをCesiumと同じZ-up/X-forwardへ補正し、ENUから地図のモデル座標へ変換する。楕円体高を高さに使い、地形の有無でゼロへ戻さない。

複数エンティティを1つのGLBにまとめ、配置行列と非表示区間を `ModelEntryProperties.nodeTransforms` に保存する。既存のmodel temporal dimensionの選択・再生でruntimeがノード変換を反映する。entryにはThree.jsの実体を保持しない。登録時に関連ファイルをGLBへ内包し、一時URLと読み込みオブジェクトを解放する。

モデルは128インスタンス・32種類の参照ファイル・関連ファイル合計128 MiB・描画100万頂点が上限。Draco・Meshopt圧縮に対応。KTX2テクスチャ、モデル内のアニメーション、nodeTransformations・articulations、minimumPixelSize、地面への追従、CZMLによるマテリアルの上書きは対象外。通常のglTFマテリアルと画像テクスチャを保持する。

## 制限

- ベクター図形は2D表示。ポイントの楕円体高は属性に保持し、地形標高として使用しない。ライン・ポリゴンは地図上へ投影する。
- `INERTIAL` 座標は未対応。FIXEDと誤認して配置せず、エラーを表示する。
- billboard画像、ラベル、押し出し、立体図形は再現しない。位置があればポイントとして表示し、フォームに説明する。
- CZMLによる色・線幅・マテリアル・leadTime/trailTimeなどCesium固有の表示設定は再現しない。
- `.json` の自動判定は先頭64 KiBのdocumentパケットを読む。documentがこれより大きい場合は `.czml` を使用する。
- 入力32 MiB・25万座標、評価時刻1万件、地物数×時刻数20万、出力20万地物・評価座標100万点、Worker上限120秒。上限を超えると登録せず分割を求める。

CesiumのプロパティデコーダーがDOMのImageコンストラクターを型比較に参照するため、Workerでは型比較専用の識別子を補う。Worker内で画像をデコード・取得しない。任意属性はプリミティブな定数だけを別に保持する。entry・ストアにはCesiumのオブジェクトを保存しない。

参照: [CZML仕様](https://github.com/AnalyticalGraphicsInc/czml-writer/wiki/CZML-Structure)、[CzmlDataSource](https://cesium.com/learn/cesiumjs/ref-doc/CzmlDataSource.html)
