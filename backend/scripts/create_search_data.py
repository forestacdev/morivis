import glob
import json
from pathlib import Path

import flatgeobuf
import geopandas as gpd
import numpy as np


def load_flatgeobuf(file_path):
    """flatgeobuf(.fgb) ファイルを読み込み、GeoDataFrame に変換"""
    with open(file_path, "rb") as f:
        return gpd.GeoDataFrame.from_features(flatgeobuf.load(f))


def convert_nan_to_none(value):
    """NaN を None に変換"""
    if isinstance(value, float) and np.isnan(value):
        return None
    return value


def create_search_json(file_paths, output_json="search_data.json"):
    """検索用 JSON を作成 (ファイルごとに file_id を設定, 各地物に search_id を振る)"""
    search_index = []

    for file_path in file_paths:
        try:
            gdf = load_flatgeobuf(file_path)
            file_id = Path(file_path).stem  # 拡張子なしのファイル名を ID にする

            for idx, row in gdf.iterrows():
                if row["geometry"] is not None:
                    feature = {
                        "file_id": file_id,  # ファイル名をIDとして利用
                        "search_id": idx,  # 各ファイル内で 0 からIDを振る
                        "type": row[
                            "geometry"
                        ].geom_type,  # 地物の種類 (Point, Polygon など)
                        "prop": {
                            key: convert_nan_to_none(value)
                            for key, value in row.drop(labels=["geometry"])
                            .to_dict()
                            .items()
                        },
                    }
                    search_index.append(feature)

            print(f"✅ {file_id}.fgb のデータを追加しました (地物 {len(gdf)} 件)")

        except Exception as e:
            print(f"❌ 読み込みエラー: {file_path}")
            print(f"   エラー: {e}")

    # JSONとして保存
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(search_index, f, ensure_ascii=False, indent=2)

    print(f"✅ 検索用 JSON を作成: {output_json}")


# `.fgb` ファイルのディレクトリを指定
INPUT_DIR = (
    Path(__file__).resolve().parent.parent.parent / "frontend" / "static" / "fgb"
)

if __name__ == "__main__":
    # `.fgb` ファイルのリストを取得
    fgb_files = glob.glob(str(INPUT_DIR / "*.fgb"))

    if not fgb_files:
        print("❌ .fgb ファイルが見つかりません")
    else:
        print(f"📂 {len(fgb_files)} 個の .fgb ファイルを処理中...")

        # 検索用 JSON を作成
        create_search_json(fgb_files, "search_data.json")
