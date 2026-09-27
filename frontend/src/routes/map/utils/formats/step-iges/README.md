# STEP／IGES

`.step` / `.stp` / `.iges` / `.igs` を `occt-import-js`（Open CASCADE、LGPL-2.1）のWASMで読み込む。
入力ファイルを外部サービスへ送信せず、Worker内で面・立体を三角形化してGLBに変換する。

## 登録フロー

`upload-drop` → `StepIgesForm` → 変換Worker → `MeshModelForm` → GLTF形式の`MeshEntry` → 既存three.js runtime。
専用フォームは上方向の選択と変換を担当する。地図上の配置・回転・倍率は既存モデルフォームへ渡す。
複数ファイルを選んだ場合は、その中から1件を選択して読み込む。外部参照先の結合は行わない。

## 保持するもの

- ソリッド・曲面の三角形メッシュ、法線
- パーサーが返す部品名・階層と、部品・面ごとのRGB色
- ファイル内の単位に基づく寸法（OCCTの`linearUnit: 'meter'`で換算）
- 選択した上方向（既定Z-up）をGLBのY-upへ変換した姿勢

OCCTの色はlinear RGBとして扱う。WASMはパッケージの`?url`経由で配信し、本番のbase pathに追従する。
キャンセル・フォーム破棄時はWorkerを終了する。変換終了後はGLBのみを既存のモデル入力へ渡し、entryへ描画実体やWASM状態を保持しない。

## 制限

CADの編集履歴・拘束・パラメーター・PMI寸法注記・線や点だけの形状・外部参照は取り込まない。
曲面は表示用メッシュになり、CADとしての再編集・STEP／IGESへの書き戻しは行わない。
地理座標系は自動判定しない。変換後の初期表示倍率は既存GLBと同じ配置画面の処理に従う。
大きなモデルは三角形化とGLB生成に時間・メモリを要する。

## 検証

`__fixtures__`に手書きした架空のSTEP平面、IGES Bスプライン曲面と、部品階層・面色の中間データを使用する。
WASMによる実パース、mm→m、Z-up→Y-up、GLB再読み込み、異常入力、アップロード振り分けをテストする。

参照: [occt-import-js](https://github.com/kovacsv/occt-import-js)、[OCCT Quantity_Color](https://dev.opencascade.org/doc/refman/html/class_quantity___color.html)。
