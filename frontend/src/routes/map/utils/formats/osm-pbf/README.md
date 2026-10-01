# OSM PBF

`.osm.pbf`と、先頭のBlobHeaderが`OSMHeader`の`.pbf`を既存のOSMフォームへ渡す。
MVTの`.pbf`とはアップロード時に区別する。ファイル選択・ドロップ・ZIPに対応し、1ファイルずつ登録する。

## 変換

- 専用Workerで`@osmix/pbf` 0.0.9のprotobufデコーダーを使う。GDAL・WASM・SQLiteは起動せず、ファイルを外部へ送信しない。
- `blocks.ts`がBlob単位で入力を読み、非圧縮・zlib圧縮を展開する。`DecompressionStream`でzlibのチェックサムを検証し、宣言サイズを超える展開を中断する。
- `entities.ts`で通常ノード・DenseNodes・way・relationをOSM JSONへ復元する。文字列テーブル、差分ID、座標倍率・原点、参照配列の整合性を検査する。
- 図形の組み立てにはOSM XMLでも使う`osmtogeojson`を使用する。ブロックをまたぐ参照、建物、複数外周・穴のあるmultipolygon、boundary、route、waterwayを扱う。
- その他のrelationは参照先の点・線を個別地物に展開し、relationのタグを保持する。循環参照・32段を超える階層はエラーにする。
- 元のタグを属性へ展開し、`osm:type`・`osm:id`を付与する。地物IDは`node/9`のように種類を付け、その他のrelationの構成図形には連番を付ける。タグのない点は独立した地物として表示しない。
- GDALの`osmconf.ini`によるタグ選択・面判定・計算済み属性は使用しない。そのため、GDAL版とは分類・地物数・属性が異なる場合がある。単純なmultipolygonは`osmtogeojson`の規則で外周wayのIDになる場合がある。
- 参照不足の形状を`osmtogeojson`が生成した場合は`osm:tainted`を付ける。組み立て不能な図形や参照先のない構成図形は出力しない。元ファイルにない形状は復元できない。
- WGS84のGeoJSONを既存OSMフォームへ渡す。点・線・面の選択後、通常のvector entryとMapLibre描画へ接続する。
- キャンセル・入力変更・フォーム破棄時、エラー・120秒のタイムアウト時にWorkerを終了する。

## 制限

入力64 MiB、出力GeoJSON 256 MiB、100万地物、処理時間120秒。
参照ノード500万点、way・relation合計100万件、参照数1,000万、出力1,000万頂点、PBFの展開総量512 MiBも検査する。
定義元は`definition.ts`。メモリ使用量そのものの上限ではない。

PBFはブロックごとに展開するが、図形組み立てにはファイル全体のノード・way・relationを保持する。
広域データは参照先を保持するツールで範囲分割してから読み込む。
タイル配信、複数ファイルの結合、履歴・差分データ、LZMA・LZ4・Zstandard圧縮は未対応。
未対応の必須機能、重複ID、安全な整数範囲を超えるID、破損したデータは全体をエラーにする。

## 専用パーサーの固定と検証

`@osmix/pbf`は公開元の検証情報がある0.0.9へ固定する。
この版のroot exportは未宣言の`@osmix/shared`を参照するため、依存が完結した`dist/proto/osmformat.js`を直接importする。
高水準APIが扱わない非圧縮Blobとサイズ制限はmorivis側で補う。更新時はdeep importの互換性も検証する。

`__fixtures__/generate.mjs`で架空PBFを生成する。通常ノード・DenseNodes、非圧縮・zlib、負の差分・座標原点、内周・route・その他relation、15万way、破損・容量制限を検証する。
GDALを比較対象やfixture生成に使わない。

- [専用パーサーとライセンス](https://github.com/conveyal/osmix)
- [OSM図形組み立て](https://github.com/tyrasd/osmtogeojson)
- [PBF仕様](https://github.com/openstreetmap/OSM-binary/tree/master/osmpbf)
- 配布用の著作権・許諾表示: `static/vendor/osmix-pbf/LICENSE.txt`
