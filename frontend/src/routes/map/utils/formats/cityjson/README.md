# CityJSON

CityJSON 1.0 / 1.1 / 2.0の面・立体形状を、標高付きMultiPolygonの`geojson-3d` entryへ変換する。deck.glの既存3D GeoJSON描画を使う。

- MultiSurface、CompositeSurface、Solid、MultiSolid、CompositeSolidとGeometryInstanceに対応。
- 各CityObjectの最高LODを選択。同一LODの複数geometry、内周、立体の内側のshellを保持する。
- transformを復元し、水平座標をWGS84へ変換する。GeometryInstanceはテンプレートに行優先のアフィン行列を適用してから、復元した参照点を加える。
- boundsは表示する頂点から算出する。metadata.geographicalExtentや未使用頂点は使わない。
- 属性は保持し、配列・オブジェクト・nullはJSON文字列にする。形式情報は`cityjson:`接頭辞の属性として格納する。
- CRSはmetadata.referenceSystemから取得。既存EPSG辞書、WGS84のUTM、EPSG:4979、EPSG:6697、CRS84/CRS84hに対応。未知のCRSは自動推定せず、フォームでEPSGコードまたは水平座標系のPROJ文字列を指定する。
- 高さは変換せず、元のZ値をメートルとして描画する。鉛直測地系の変換は行わない。
- 点・線、色・テクスチャ・面のsemantics、拡張スキーマは描画対象外。点・線の除外とappearanceの省略は通知する。
- CityJSONSeq / CityJSONFeatureは対象外。
- 変換はWorkerで実行し、ファイル変更・キャンセル時に終了する。ZIPは共通の展開処理を通る。

仕様: https://www.cityjson.org/specs/2.0.2/
