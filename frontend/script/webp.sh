#!/bin/sh
# スクリプトのディレクトリを取得
script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# .webp ファイルを削除
find "$script_dir/../static/images" -type f -iname '*.webp' | xargs rm

# .jpg または .png ファイルを検索
Files=$(find "$script_dir/../static/images" -type f \( -iname '*.jpg' -o -iname '*.png' \))

# ファイルごとに処理
for File in $Files
do
    # 元のファイル名から拡張子を除外して新しいファイル名を作成
    OutputFile="${File%.*}.webp"

    echo "Converting $File to $OutputFile"
    cwebp -preset photo -metadata icc -sharp_yuv -o "$OutputFile" -progress -short "$File"
    printf "\n----------------\n\n"
done