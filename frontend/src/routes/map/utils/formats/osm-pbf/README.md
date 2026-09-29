# OSM PBF

`.osm.pbf`と、先頭のBlobHeaderが`OSMHeader`の`.pbf`を既存のOSMフォームへ渡す。
MVTの`.pbf`とはアップロード時に区別する。ファイル選択・ドロップ・ZIPに対応し、1ファイルずつ登録する。

## 変換

- 同梱済みのgdal3.js 2.8.1を専用Workerで起動する。変換サービスへファイルを送信しない。
- 通常ノード、DenseNodes、非圧縮・zlib圧縮、ブロックをまたぐway参照、multipolygon relationを架空fixtureで検証している。
- GDALのpoints・lines・multilinestrings・multipolygons・other_relationsをGeoJSONへ変換する。OSMの前向き読み取りに合わせ、レイヤーごとに入力を開き直す。
- OSM専用Workerでは`OSM_UNLINK_TMPFILE=NO`を指定する。大きな入力で一時SQLiteがファイルへ移行した際、Emscripten上で使用中のファイルを削除してI/Oエラーになることを防ぐ。GeoJSONの出力先もレイヤー間で再利用し、取り込み済みの出力をWASM内へ蓄積しない。
- ノード・ウェイ・リレーションのIDは`node/9`のように種類を付ける。GDALの標準カラムと`other_tags`を属性として保持し、`other_tags`は通常の属性へ展開する。
- ノード参照用の無タグ点は通常、独立した地点としては表示しない。面と線の判定、タグの採用範囲はGDALのOSMドライバーと同梱osmconf.iniに従う。OSM XMLと属性構成が完全に同じになるわけではない。
- WGS84の経度・緯度へ復元されたGeoJSONを既存OSMフォームへ渡す。点・線・面の選択後、通常のvector entryとMapLibre描画へ接続する。
- キャンセル・入力変更・フォーム破棄時はWorkerを終了し、古い結果を登録しない。

## 制限

入力64 MiB、展開したGeoJSONの合計256 MiB、50万地物、処理時間120秒を上限とする。
展開結果の上限は変換後に確認するため、メモリ使用量の厳密な上限ではない。
広域データは参照ノード・wayを保持するツールで範囲分割してから読み込む。
範囲を指定したストリーミング描画、複数ファイルの結合、履歴・差分データの再生は行わない。
任意の圧縮方式・拡張機能への対応は保証しない。

ブロック境界の欠損を変換前に検出する。GDALが解析エラーを報告した場合は、途中まで変換できていても全体を失敗とする。
元データに参照先がない場合の形状再現はGDALに依存する。

仕様: [OSM-binary](https://github.com/openstreetmap/OSM-binary/tree/master/osmpbf)。
変換動作: [GDAL OSMドライバー](https://gdal.org/en/stable/drivers/vector/osm.html)。

`__fixtures__/generate.mjs`でGit管理用の架空PBFを生成する。実在のOSMデータは使用しない。
実デコーダーのテストでは`OSM_MAX_TMPFILE_SIZE=0`として、小さなfixtureでも一時SQLiteのファイル移行を検証する。
