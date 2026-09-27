# test-pattern.webm

撮影データを含まない、64×48px・8fps・2秒の人工テストパターン。VP9、音声なし。生成コマンド:

```sh
ffmpeg -f lavfi -i 'testsrc2=size=64x48:rate=8:duration=2' -c:v libvpx-vp9 -an test-pattern.webm
```

`test-empty.fgb` は、動画テスト時のストリートビュー索引を置き換える地物0件のFlatGeobuf。`flatgeobuf`の`buildHeader`でgeometryType=0、featuresCount=0、indexNodeSize=0、columns=[]のヘッダーを作り、magicbytesを先頭に付けたもの。実在の地物を含まない。
