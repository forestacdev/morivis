# 架空のE57

libE57FormatのWASM版（e57-js 1.0.9）のWriterで生成した最小データ。実測点群・写真・個人ファイルは含まない。

- `test-multi-scan.e57`: 1つ目はXYZ=(1,2,3)、RGB=(255,128,0)と無効点(9,9,9)。poseはX+10。2つ目は色のないXYZ=(2,0,4)で、Z軸90度回転・Y+20。変換結果は(11,2,3)と(0,22,4)。
- `test-spherical.e57`: (range,azimuth,elevation)=(2,0,0),(3,π/2,0)、poseはZ+5。
- `test-empty.e57`: スキャンなし。
- `test-all-invalid.e57`: XYZ=(1,2,3)、cartesianInvalidState=1。

いずれも作成時に自動生成された架空GUIDを含む。パーサーテストでは配布WASMで実際に復号し、CRC、無効点、pose、RGBを検証する。
