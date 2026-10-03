# CZML

`@cesium/engine` の公式 `CzmlDataSource` でCZML 1.0を読み取り、WGS84のGeoJSONへ変換する。描画は既存のvector entryとMapLibreを使用し、Cesium Viewerは起動しない。デコーダーは専用Worker内で実行する。

## 読み込み範囲

- `.czml` と、先頭のdocumentパケットで内容判定した `.json`。ZIP展開後も同じ判定。複数ファイルはフォームで切り替えて個別に登録する。
- `position` の固定位置と時刻付き位置、`polyline.positions`、`polygon.positions`・`polygon.holes`。
- WGS84の `cartographicDegrees` / `cartographicRadians` と、地球固定座標 `cartesian` / `cartesianVelocity`。
- ISO8601の時刻と、`epoch` からの秒数。`availability`、プロパティの時間区間、`show`、同じIDの更新、`delete`、別エンティティの `position` への参照。
- 定数の文字列・数値・真偽値の任意属性。動的な任意属性やHTMLのdescriptionは対象外。

ファイル中のサンプル時刻、時間区間の両端、document.clockのcurrentTimeを評価時刻として集める。各時刻でCesiumのプロパティを評価し、ポイント・ライン・ポリゴンに `time` を付ける。補間はCesiumの実装を使用する。元データの時刻間に表示フレームを追加生成するものではなく、既存の離散タイムラインで選択・再生する。

動く位置からは別途「軌跡」を生成する。availabilityやpositionの区間の切り替わり、測位のない区間、日付変更線では線を分割する。軌跡は全期間を表示し、開始・終了時刻を属性に保持する。静的な入力に日付は補わない。時系列入力に含まれる静的地物は各評価時刻に含める。

## 制限

- 2D表示。ポイントの楕円体高は属性に保持し、地形標高として使用しない。ライン・ポリゴンは地図上へ投影する。
- `INERTIAL` 座標は未対応。FIXEDと誤認して配置せず、エラーを表示する。
- 3Dモデル、画像、ラベル、押し出し、立体図形は再現しない。位置があればポイントとして表示し、フォームに説明する。外部モデルや画像を取得しない。
- 色・線幅・マテリアル・leadTime/trailTimeなどCesium固有の表示設定は再現しない。
- `.json` の自動判定は先頭64 KiBのdocumentパケットを読む。documentがこれより大きい場合は `.czml` を使用する。
- 入力32 MiB・25万座標、評価時刻1万件、地物数×時刻数20万、出力20万地物・評価座標100万点、Worker上限120秒。上限を超えると登録せず分割を求める。

任意属性のCesiumデコーダーがDOMのImage型を参照するため、定数属性は別に保持し、幾何と時刻のデコードに公式ライブラリを使用する。entry・ストアにはCesiumのオブジェクトを保存しない。

参照: [CZML仕様](https://github.com/AnalyticalGraphicsInc/czml-writer/wiki/CZML-Structure)、[CzmlDataSource](https://cesium.com/learn/cesiumjs/ref-doc/CzmlDataSource.html)
