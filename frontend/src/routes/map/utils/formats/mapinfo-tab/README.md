# MapInfo TAB

Native TAB（TAB・DAT・MAP・ID、任意のIND）と、属性がDBFのベクターTABを読み込む。
一式を同時にドロップするか、ZIP・フォルダで読み込む。同じフォルダ・名前だけを対応付ける。
複数のTABがある場合は表を選択する。不足していたDAT・MAP・IDは開いたフォームへ追加ドロップできる。

## 処理

- 専用Workerでgdal3.js 2.8.1のMapInfoドライバーを実行する。ファイルは外部へ送信しない。
- GDALが点・線・面・複合図形、属性、MAP内の座標系を読み取る。Charsetによる日本語属性も扱う。
- 埋め込み座標系からWGS84へ変換する。NonEarth・未知の座標系・変換失敗は、元座標を保持して座標系選択へ渡す。
- 図形の種類が1つなら自動でエントリー登録へ進む。混在する場合はポイント・ライン・ポリゴンを選ぶ。
- `createGeoJsonEntry()`で通常のベクターentryを生成する。描画は既存のentry → spec → MapLibre経路を使う。
- 手動位置合わせも既存のベクターGeoRefを使う。処理中は共通スクリーンガードを表示する。
- Workerは処理完了・エラー・キャンセル・120秒のタイムアウトで終了し、WASMのメモリを解放する。

GDALのWASM・投影辞書はMapInfoを使うときだけ同じアプリから取得する。初回は約38 MiBの追加読み込みがある。
PROJのネットワーク取得は無効で、座標変換には同梱辞書を使う。

## 制限

- 一式256 MiB、TABヘッダー1 MiB、50万地物、500万頂点まで。
- ラスターTAB、結合表・シームレス表、NativeXなどGDAL 3.8.4が読めない形式は未対応。
- 外部属性ファイルの明示参照は同じフォルダ内のみ。
- 元の線種・記号・フォント・ラベル配置は再現せず、morivisの標準スタイルを使う。
- 図形のない行は表示から除外し、数を表示する。属性だけの表は登録しない。
- 出力は2D。複数種類の図形を登録する場合は、同じTABを再度読み込んで種類を選ぶ。

## 検証データ

`__fixtures__/generate.mjs`が任意の座標と架空属性からNative TABを生成する。
地理座標、投影座標、日本語（WindowsJapanese）、NonEarth、穴のあるポリゴンを含む。
単体テストでは実際のGDAL/WASMでこれらを読み取る。実データは使用していない。

## 参照・ライセンス

- [GDAL MapInfo TABドライバー](https://gdal.org/en/stable/drivers/vector/mitab.html)
- [gdal3.jsのソースとビルド手順](https://github.com/bugra9/gdal3.js)
- gdal3.jsはLGPL-2.1-or-later。配布用ライセンスと依存ライブラリの参照は `static/vendor/gdal3/` に置く。
