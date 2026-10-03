# OpenDRIVE

`.xodr`と、ルートが`OpenDRIVE`の`.xml`を道路・車線の2Dベクターとして読み込む。
ZIP内のファイル、複数ファイルの選択にも対応する。道路基準線と車線面は表示対象を選んで別々に登録できる。

- XMLの読み取りは既存の`fast-xml-parser`、座標変換は既存の`proj4`を使用する。OpenDRIVE固有の形状変換はこのディレクトリで実装する。
- `planView`の`line`、`arc`、`spiral`、`poly3`、`paramPoly3`を折れ線化する。
- `poly3`と`paramPoly3`のパラメータは弧長とは区別し、弧長テーブルから逆算する。
- 車線面は`laneSection`、`laneOffset`、左右の`width`または`border`から生成する。`singleSide`は反対側の定義とその開始位置を引き継ぐ。
- 道路ID・名称・接続するjunction ID・道路長、車線ID・種別・区間位置を属性に保持する。
- `header/offset`の平面回転・平行移動を適用してから、`geoReference`のPROJ定義でWGS84へ変換する。
- 座標系がない、または変換できない場合は元の座標を残し、登録時に座標系選択フォームへ進む。位置合わせへの切り替えは共通フォームで行う。数値の範囲から経緯度とは推測しない。

道路・車線は平面図として扱う。標高、横断勾配、車線高さ、路面の凹凸、路面標示の描画、道路付属物・信号、交通シミュレーション用の接続関係は再現しない。junction内の接続道路も通常のroadとして読む。`.xodrz`圧縮形式は対象外。

曲線は最大2m間隔、境界の中点・四分点の弦誤差5cmを目安に細分化する。これは描画用近似であり、元の解析曲線そのものではない。
容量・地物・頂点・計算量の上限は`definition.ts`で定義する。処理はWorkerで実行し、ファイル切替・キャンセル時に破棄する。
不正な幅、接続していない線形、未知のplanView曲線などはエラーにし、架空の道路形状で補わない。

仕様参照:

- [ASAM OpenDRIVE: Georeferencing](https://publications.pages.asam.net/standards/ASAM_OpenDRIVE/ASAM_OpenDRIVE_Specification/v1.8.1/specification/08_coordinate_systems/08_05_geo_referencing.html)
- [ASAM OpenDRIVE: Parametric cubic curve](https://publications.pages.asam.net/standards/ASAM_OpenDRIVE/ASAM_OpenDRIVE_Specification/v1.8.1/specification/09_geometries/09_06_param_poly3.html)
- [ASAM OpenDRIVE: Lane geometry](https://publications.pages.asam.net/standards/ASAM_OpenDRIVE/ASAM_OpenDRIVE_Specification/v1.8.1/specification/11_lanes/11_06_lane_geometry.html)

`__fixtures__`は手作業で作った架空の道路。個人環境の入力や実在の道路データはテストに使用しない。
