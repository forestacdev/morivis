#!/bin/sh
find ../static/imgs -type f -iname '*'.webp | xargs rm
Files=$(find ../static/imgs -type f -iname '*'.jpg -o -iname '*'.png)
# printf  "$Files\n"
for File in $Files
do
    echo $File
    cwebp -preset photo -metadata icc -sharp_yuv -o $File".webp" -progress -short $File
    printf "\n----------------\n\n"
done