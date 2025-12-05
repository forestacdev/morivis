from pathlib import Path

import flatgeobuf
import geopandas as gpd

# ディレクトリを指定
INPUT_DIR = (
    Path(__file__).resolve().parent.parent.parent / "frontend" / "static" / "fgb"
)

# `.fgb` ファイルのリストを取得
fgb_files = list(INPUT_DIR.glob("*.fgb"))

# 読み込みに失敗したファイル & 3Dデータを持つファイルを記録
failed_files = []
files_with_3d = []

print(f"📂 {len(fgb_files)} 個の .fgb ファイルをチェック中...")

for file_path in fgb_files:
    try:
        with open(file_path, "rb") as f:
            gdf = gpd.GeoDataFrame.from_features(flatgeobuf.load(f))

        # 3D (XYZ) の座標を持つかチェック
        has_3d = any(geom.has_z for geom in gdf.geometry if geom is not None)

        if has_3d:
            files_with_3d.append(file_path.name)
            print(f"⚠️  {file_path.name} は 3D 座標を含んでいます")

        print(f"✅ {file_path.name} を正常に読み込みました")

    except Exception as e:
        print(f"❌ 読み込みエラー: {file_path.name}")
        print(f"   エラー: {e}")
        failed_files.append(file_path.name)

# 結果を表示
print("\n🔍 チェック完了")
if failed_files:
    print("❌ 読み込みエラーのあるファイル:")
    for failed in failed_files:
        print(f"   - {failed}")
else:
    print("✅ すべての `.fgb` ファイルを正常に読み込みました")

if files_with_3d:
    print("\n⚠️  3D (XYZ) 座標を含む .fgb ファイル:")
    for fgb in files_with_3d:
        print(f"   - {fgb}")
else:
    print("✅ すべての `.fgb` は 2D (XY) 座標のみです")
