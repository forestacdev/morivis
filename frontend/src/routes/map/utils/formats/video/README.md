# 動画

MP4・WebM・MOV・M4V・OGVをドロップすると、ブラウザで先頭フレームを復号する。MP4・MOV・M4Vの撮影位置を読み取れた場合は、位置合わせを省略してポイントのエントリー登録へ進む。地図上では先頭フレームを写真アイコンとして表示し、クリックすると詳細画面で動画を再生できる。位置情報がない場合は位置合わせへ進む。再生できるコーデックはブラウザに依存し、復号できないファイルは登録前にエラーを表示する。変換サービスへのアップロードは行わない。

位置合わせは静止した先頭フレームで行う。確定した四隅を持つ `RasterVideoEntry`（`format.type: 'video'`、`style.type: 'basemap'`）へ正規化し、source生成でMapLibreのvideo sourceへ渡す。登録後は無音・ループ再生する。画像サイズと角の移動・回転・拡大縮小、透過率、表示切り替えは既存のラスター導線を使う。

動画の一時URLは先頭フレームの読み取り後に解放する。位置合わせ中は元のFileを保持し、確定時に再生用URLを作る。レイヤー削除時は既存のラスターURL解放処理を使う。ローカル動画のURLはそのページ内のみ有効で、ページ再読み込み後の再生にはファイルの読み込み直しが必要。

撮影位置はQuickTimeの `com.apple.quicktime.location.ISO6709`（`keys` / `ilst`）、`©xyz`、3GPPの `loci` に対応する。ISO 6709は度の十進表記に対応し、緯度・経度の範囲を検証する。WebM・OGVの位置タグ、動画内で変化するGPS軌跡、別ファイルのGPSログは対象外。位置タグがない・不正・読み取り上限を超えた場合は位置合わせへ進む。

位置情報は `moov` 内のメタデータだけをBlobの部分読み取りで調べ、`mdat` は読み飛ばす。読み取りは1MiB、atomは4096件まで。ポイントはGeoJSONとして `createGeoJsonEntry` に渡し、動画を `detailsById` のmediaに設定する。再生用URLはキャンセル・レイヤー削除で解放する。

位置タグの仕様は [AppleのLocation metadata](https://developer.apple.com/documentation/quicktime-file-format/location_metadata) と [FFmpegのMOV demuxer](https://github.com/FFmpeg/FFmpeg/blob/master/libavformat/mov.c) を参照。
