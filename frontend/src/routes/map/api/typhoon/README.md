# 気象庁の台風カタログ

気象庁の台風ページが取得するJSONをGeoJSONへ変換する。外部仕様の変更は読み込みエラーとして扱い、通信失敗を「台風なし」に置き換えない。

- 一覧: `https://www.jma.go.jp/bosai/typhoon/data/targetTc.json`
- 各対象: `https://www.jma.go.jp/bosai/typhoon/data/{tropicalCyclone}/forecast.json`
- 表示元: <https://www.jma.go.jp/bosai/map.html#contents=typhoon>
- 予報円の説明: <https://www.jma.go.jp/jma/kishou/know/typhoon/7-1.html>

カタログは `jma_typhoon_tracks`（台風（実況・予報））の1項目。

- ライン本体: 発達前・実況の経路、予報円の中心を結ぶ線、予報円の輪郭と接線。初期表示はすべて実線にする。
- 補助レイヤー: 実況・予報の中心位置とラベル。`auxiliaryLayers` を使い、親と一緒に追加・削除・表示切替する。不透明度も親の設定を引き継ぐ。中心位置のクリックは親エントリーの属性表示へ結び付ける。

中心座標は緯度・経度順から経度・緯度順へ変換する。予報円の半径はメートル単位で、既存のTurfで輪郭を生成する。予報円は中心が入る確率70%の範囲であり、強風域・暴風域はこの実装の対象外。発表時刻・対象時刻はUTCで属性に保持する。

取得はカタログの初回追加時に行う。同時の読み込み要求は通信を共有し、60秒以内の取得結果を再利用する。カタログ全体の解決済みキャッシュにより、追加済みのエントリーはページを再読み込みするまで同じデータを表示する。自動更新は行わない。

`__fixtures__/test-forecast.json` は実データを含まない架空の入力。
