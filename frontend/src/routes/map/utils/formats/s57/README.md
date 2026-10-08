# S-57 ENC

S-57 3.1のバイナリENC基本ファイル（`.000`）と更新ファイル（`.001`〜`.999`）をWorkerで解析し、WGS84のGeoJSONへ変換する。
既存のvector entry・プレビュー・MapLibreの宣言的スタイル更新を使用する。
ファイルの内容はブラウザー内で処理し、変換サーバーへの送信は行わない。
ISO 8211の読み取りとS-57の接続情報の復元は、このディレクトリのTypeScript実装を使う。
gdal3.jsやGDALのWebAssemblyは使用しない。

既存ライブラリの`@s57-parser/s57@0.1.0`も架空fixtureで確認したが、
OBJL=30の地物欠落と、分割された内周エッジを個別の穴へ変換する問題があり、採用を見送った。
後続バージョンの品質を評価したものではない。

## 対応範囲

- ENC標準のChain-node（DSTR=2）とPlanar graph（DSTR=3）。座標はHDAT=2（WGS84）、COUN=1（経緯度）。
- ISO 8211のDDRとdirectoryに基づくバイナリレコード。record length=0の長いレコードもdirectoryの長さから読む。
- 点、接続点、エッジ、ライン、穴付きポリゴン、複数の線・外周。
- COMFによる座標倍率、SOMFによる測深倍率。測深群は個別のPointに分割し、`DEPTH`・`DEPTH_UNIT`・`SOUNDING_DATUM`へ保存する。深さを標高として使わない。
- ATTF（ASCII / Latin1）とNATF（ASCII / Latin1 / UCS-2 LE）。辞書の略号を属性名にし、数値属性は数値へ変換する。列挙リストはカンマ区切り文字列のまま保存する。
- OBJL、OBJL_NAME、OBJL_DESCRIPTION、RCID、PRIM、GRUP、RVER、AGEN、FIDN、FIDS、LNAM。地物間参照は`FFPT`のJSON文字列へ保存する。
- 未知の地物・属性コードは`OBJL_<code>` / `ATTR_<code>`の形で保持する。
- 自動解析、分類と図形種別の選択、複数基本セルのファイル選択、ZIP内の基本セルと更新差分。
- 更新の追加・削除・変更（RUIN）、レコード版（RVER）の照合、ATTF・NATF・ATTVの属性更新と削除、FSPC・FFPC・VRPCの参照更新、SGCCの座標更新。空の直線エッジへの中間座標追加も扱う。

## 制限

ASCII符号化、ENC以外の製品仕様、別測地系・投影座標、曲線、Cartographic spaghetti・Full topology・Topology is not relevant、日付変更線をまたぐ線・面、ISO 8211の省略ヘッダーは未対応。理由を表示して取り込みを止める。
`CATALOG.031`は更新差分と区別し、基本セル選択時に除外する。
図形を持たない地物は地図の表示対象から除き、その件数をフォームに表示する。
空間レコードの品質属性ATTVは地物属性へ合成しない。S-52の配色・記号・表示優先度や、MASKによる個々の境界線の非表示は再現しない。

更新ファイルは同じフォルダ・基本名の基本セルとまとめて選択する。ファイル名とDSIDのセル名・版・更新番号・提供機関を照合し、基本セルのUPDNの次から連続して適用する。再発行された基本セルに取り込み済みの差分を再適用しない。途中の欠落・重複・不明な更新対象・不正な添字・版の不連続があれば、全体を失敗として登録を止める。元の入力ファイルは変更しない。
更新後の参照から点・線・面を復元する。更新差分単独、セル取消（EDTN=0）、座標系・倍率・文字コードを変更する差分は取り込みを止める。
選択されていない更新の有無は判定しない。DSIDの版・適用後の更新番号と発行日をフォームに表示する。
入力1ファイル64 MiB、一式128 MiB・1000ファイル、出力128 MiB、地物50万、入出力それぞれ500万頂点、レコード100万、解析120秒を上限とする。
共有エッジも出力時の各参照で頂点数を加算する。面の包含判定にも処理量の上限を設ける。

## 参照と辞書

- [IHO S-57 Edition 3.1 Part 3](https://iho.int/uploads/user/pubs/standards/s-57/31Main.pdf): レコード構造、符号化、接続情報。
- [IHO S-58 ENC Validation Checks](https://iho.int/uploads/user/pubs/standards/s-58/S-58%20Ed%208.0.0_FINAL.pdf): ENCのDSTRは2（Chain-node）。
- [GDAL S-57 driver](https://gdal.org/en/stable/drivers/vector/s57.html): 地物辞書と属性の対応。
- `catalog/s57objectclasses.csv`・`catalog/s57attributes.csv`は[GDAL v3.8.4のdata](https://github.com/OSGeo/gdal/tree/v3.8.4/data)から変更せず同梱。ライセンスは`catalog/LICENSE.TXT`、配布用コピーは`static/vendor/s57-catalog/LICENSE.txt`。

辞書以外のGDALコードは使用していない。パーサーを読み込むWorkerだけが辞書を参照する。

## 検証

`__fixtures__/generate.py`は架空の基本セルを生成する。実際の海図データを使用しない。
単体テストでは境界の接続・向き・穴・測深・属性・文字コード・欠損・上限に加え、連続した更新と不整合時の拒否を検証する。
ブラウザーテストではWorkerの自動解析、分類選択、地図登録、再ドロップ、ファイル切替・中断、エラー後の復帰を検証する。
