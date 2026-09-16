# RIK

Microsoft CABに3DSモデルと画像を格納した `.rik` を読み込む。GSMのみのRIKや分割CABは未対応。

- `cabinet.ts`: CABファイル表の検証、展開。WASMランタイムを引数で渡せるためNodeでも検証可能。
- `worker.ts` / `analyze.ts`: 7z-wasmによるCAB（LZXを含む）の展開。処理後はWorkerを終了する。
- `index.ts`: `Info.ini` の `3DS_DATA / 3DS_FILE_NAME` からモデルを選び、画像と一緒に `File[]` へ変換する。
- `upload-drop.ts` → 既存のモデルフォーム → `MeshEntry`（format: `3ds`）→ three.js。
- `three/tds-loader.ts`: 3DSの初期配置（KFDATAの親子関係、移動・回転・縮尺、pivot、インスタンス）を復元する。表示とbounds計算で同じローダーを使い、GLBにも復元後の階層を渡す。複数キーのアニメーション再生は対象外。
- bounds計算用のWorkerではテクスチャを読み込まず、形状と配置だけを解析する。画像は描画側で読み込む。

`morivisRelativePath` で画像の参照パスを維持する。Info.iniがない場合は単一の3DSに限り読み込む。
`SIKICHI` の敷地座標は地理座標として扱わない。配置位置・向き・縮尺は既存のモデル配置画面で指定する。
RIK全体の形式を推測して固定の単位変換は行わない。

入力256 MB、展開後の1ファイル256 MB・合計512 MB、4096ファイルを上限とする。
実データはfixtureに含めず、合成CABで回帰を検証する。
