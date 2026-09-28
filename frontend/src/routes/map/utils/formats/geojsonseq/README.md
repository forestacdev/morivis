# GeoJSONSeq / 行区切りGeoJSON

`.geojsonl`・`.jsonl`・`.ndjson`・`.geojsons`・`.geojsonseq`を既存のGeoJSONフォームへ渡す。
形式一覧、ファイル選択、ドロップ、ZIP内のファイルに対応する。
GeoJSONフォームのテキスト入力や`.json`・`.geojson`でも、先頭のRSまたは行ごとに完結したGeoJSONから判定する。

- 改行区切り（LF / CRLF）と、RFC 8142のRS（U+001E）区切りに対応。RS区切りではレコード内の改行を許容する。
- UTF-8のBOM、空行、連続RS、末尾改行の省略を許容する。
- Feature・FeatureCollection・GeometryをFeatureCollectionへまとめる。GeometryCollectionは再帰的に展開する。
- 属性・ID・Z座標を保持する。GeometryCollectionのIDには子の添字を付ける。
- geometryがnullの地物と空のコレクションは表示対象から除く。表示できる地物が残らない場合はエラーにする。
- 不正なJSON・構造・座標では行番号またはレコード番号を表示し、読み込み全体を止める。破損レコードを飛ばして部分登録しない。
- 既存GeoJSONのジオメトリ選択、2D/3D選択、座標系選択、位置合わせ、entry生成を共用する。

ファイル全体をテキストとして読み、全地物をメモリ上のFeatureCollectionへまとめる。ストリーミング描画やファイル間の一括結合は行わない。
座標の範囲だけで投影法を確定することはできないため、座標系判定は既存GeoJSONフォームと同じ制約を持つ。

仕様: [RFC 8142](https://www.rfc-editor.org/rfc/rfc8142)、[RFC 7946](https://www.rfc-editor.org/rfc/rfc7946)。
