# PMXの基本ポーズ

morivis用に作成したオリジナルのVPD（UTF-8）。外部のモデルや配布ポーズからの転載・抽出はしていない。

初期選択は「なし」で、モデル本来の姿勢を表示する。ポーズ適用後も「なし」で元の姿勢へ戻せる。既存のモーション・ポーズの選択は維持する。

## ポーズ一覧

共通・男性・女性の各3種類を選べる。男性・女性は作画上の区分で、性別による骨格や可動域の仕様ではない。どのPMXモデルでも任意の区分を選択できる。

| 区分 | 立つ | 座る（椅子） | 寝る（仰向け） |
| --- | --- | --- | --- |
| 共通 | 腕を下ろす | 股関節と膝を90度曲げる | 腕を体側に置く |
| 男性 | 手足を少し開く | 膝を外へ向け、肘を曲げる | 手足をやや開く |
| 女性 | 手足をやや揃える | 膝を寄せ、肘を曲げる | 脚と腕を体側へ寄せる |

共通は `standing.vpd`、`sitting.vpd`、`lying.vpd`。男性は `male-`、女性は `female-` を先頭に付けたファイル。
既存の共通ポーズのURLを維持し、保存済みの選択や利用者が追加したVPD/VMDのインデックスを変更せずに追加する。

## 参考資料と設計

- [babylon-mmd 開発者資料：標準・準標準ボーン構造](https://noname0310.github.io/babylon-mmd/docs/reference/understanding-mmd-behaviour/introduction-to-pmx-and-pmd/#standard-bone-structure--semi-standard-bone-structure)
  - 日本語のボーン名、センターから上下半身へ続く階層、肩・腕・肘・手首、足・膝・足首の対応を参照。
  - センターと一般的なHumanoidのHipが同じ位置ではない点を考慮し、センターの移動量を人体寸法の自動推定には使用しない。
- [同資料：脚の構造](https://noname0310.github.io/babylon-mmd/docs/reference/understanding-mmd-behaviour/introduction-to-pmx-and-pmd/#leg-structure)
  - 足IKが脚の回転を上書きし得るため、基本ポーズはIKを無効にして適用。
  - 準標準の足Dボーンは付与変形を受けるため、同じ回転を足と足Dの両方に書いて二重適用しない。
- [three-mmd-loader 開発元](https://github.com/yohawing/three-mmd-loader)
  - 実装には導入済みバージョンの `loadPoseAnimation`、`resetPose`、`update(0, { physics: false, ik: false })` を使用する。

資料は骨格と変換方式の参照に用いた。男女別の角度・手足の開き方はmorivisの独自設定で、資料が定める標準姿勢ではない。

## 寸法と接地

センターの基準高が約10単位のテスト骨格を想定した汎用ポーズ。体格、初期の腕の角度、ボーン構成によって結果は異なる。
椅子・地面への接地位置はモデルの高さオフセットで調整する。椅子のモデル自体は含まない。
VPDの形式自体にはIK無効の指定がないため、別のソフトで使うときは足・つま先のIKを無効にする。

## 再生成

リポジトリのルートから実行する。

```sh
pnpm --dir frontend exec node --import tsx scripts/generate-pmx-basic-poses.ts
```

角度はこのスクリプトで管理し、VPDのクォータニオンへ変換する。対称なテスト骨格で全9種類の姿勢・左右の対称性・脚の開き・姿勢を戻した際の復元を検証する。
