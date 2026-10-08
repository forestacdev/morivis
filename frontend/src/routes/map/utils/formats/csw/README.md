# CSWカタログ

URL入力欄、または対応形式一覧の「CSW カタログ」から接続する。CSW自体は地図レイヤーに登録せず、選択した配信リンクを既存のサービス・ファイル読み込みへ渡す。

## 対応範囲

- CSW 2.0.2のGetCapabilities・GetRecords・GetRecordById（HTTP GET）
- キーワード検索と現在の地図範囲による絞り込み。OGC Filter 1.1のXMLをconstraintへ渡す
- サーバーのnextRecordを使ったページ送り。通常は1回20件、上限100件
- Dublin CoreのRecord/SummaryRecord/BriefRecordとISO 19139のMD_Metadata/MI_Metadata
- 詳細取得でISO 19139が提供される場合は優先し、配信先を取得する
- タイトル、説明、識別子、種類、更新日、キーワード、地理範囲、配信リンク
- WMS・WMTS・WFSの配信リンクは既存サービスフォームへ、対応拡張子・ダウンロードリンクは既存ファイル読み込みへ渡す
- メタデータだけの項目は情報・関連リンクを表示する

応答は5 MiB、通信は20秒まで。XMLの解析には導入済みの`@xmldom/xmldom`を使う。DTD・外部エンティティは受け付けない。空の検索結果と通信・XMLエラーを区別する。検索と詳細取得はフォームを閉じる際に中止する。

CSW 3.0、CSW-Tによる編集、POST専用サービス、専用認証画面には対応していない。ブラウザから接続するため、配信先のCORS許可が必要。既存のプロキシ規則を通すが、不特定の配信先を代理取得するプロキシは追加していない。

## 検証

`__fixtures__/`は手作業で作成した架空のXML。名前空間prefixの違い、ページ送り、ISO 19139のリンク、軸順、検索文字列のエスケープ、日付変更線、通信失敗を検証する。画面テストは`e2e/csw-catalog.test.ts`。

## 参照

- [OGC Catalogue Service](https://www.ogc.org/standards/cat/)
- [CSW 2.0.2 XML Schema](https://schemas.opengis.net/csw/2.0.2/)
- [GeoNetwork CSW API](https://docs.geonetwork-opensource.org/4.2/api/csw/)
