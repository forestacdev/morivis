import glob
import json
import math
from pathlib import Path

import geopandas as gpd
from shapely.geometry import shape
from shapely.geometry.base import BaseGeometry


def lonlat_to_tile_coords(lon: float, lat: float, zoom: int = 14):
    """経度・緯度 → タイル座標 (z/x/y) に変換"""
    lat_rad = math.radians(lat)
    n = 2.0**zoom
    x_tile = int((lon + 180.0) / 360.0 * n)
    y_tile = int(
        (1.0 - math.log(math.tan(lat_rad) + 1 / math.cos(lat_rad)) / math.pi) / 2.0 * n
    )
    return {"x": x_tile, "y": y_tile, "z": zoom}


OUTPUT_DIR = (
    Path(__file__).resolve().parent.parent.parent
    / "frontend"
    / "src"
    / "routes"
    / "components"
    / "header"
)

search_data_dict = {
    "fac_ziriki_point": {
        "name_key": "name",
        "path": "fac_ziriki_point.geojson",
        "search_keys": ["name"],
    },
    "fac_building_point": {
        "name_key": "name",
        "path": "fac_building_point.geojson",
        "search_keys": ["name"],
    },
    "fac_poi": {
        "name_key": "name",
        "path": "fac_poi.geojson",
        "search_keys": ["name"],
    },
}


def load_geojson(file_path):
    """geojson(.geojson) ファイルを読み込み、GeoDataFrame に変換"""
    with open(file_path, "rb") as f:
        return gpd.read_file(f)
    # return gpd.read_file(file_path, driver="GeoJSON")


def convert_nan_to_none(val):
    if val != val:  # NaN チェック
        return None
    return val


def get_representative_point(geometry: BaseGeometry):
    """ジオメトリの代表点（中心付近の点）を返す"""
    if geometry.geom_type == "Point":
        return list(geometry.coords)[0]
    elif geometry.is_empty:
        return None
    else:
        centroid = geometry.representative_point()
        return [centroid.x, centroid.y]


def create_search_json(file_paths, output_json=OUTPUT_DIR / "search_data.json"):
    """検索用 JSON を作成（search_data_dict に基づいて処理）"""
    if search_data_dict is None:
        raise ValueError("search_data_dict が必要です")

    search_index = []

    for file_path in file_paths:
        try:
            gdf = load_geojson(file_path)
            file_id = Path(file_path).stem
            config = search_data_dict.get(file_id)

            if config is None:
                print(
                    f"⚠️ {file_id} は search_data_dict に存在しません。スキップします。"
                )
                continue

            name_key = config["name_key"]
            search_keys = config["search_keys"]
            path = config["path"]  # 相対パス等で指定されたファイル名

            for idx, row in gdf.iterrows():
                feature_id = row.name  # ← indexがFeature.idになる
                geom = row["geometry"]
                if geom is not None:
                    shapely_geom = shape(geom)
                    rep_point = get_representative_point(shapely_geom)

                    tile_coords = lonlat_to_tile_coords(*rep_point, zoom=14)

                    name = convert_nan_to_none(row.get(name_key))
                    search_values = [
                        str(convert_nan_to_none(row.get(k)))
                        for k in search_keys
                        if convert_nan_to_none(row.get(k)) is not None
                    ]

                    feature = {
                        "layer_id": file_id,
                        "name": name,
                        "search_values": search_values,
                        "feature_id": feature_id,
                        "point": rep_point,
                        "tile_coords": tile_coords,
                        "path": path,
                    }
                    search_index.append(feature)

            print(f"✅ {file_id}.geojson のデータを追加しました（地物 {len(gdf)} 件）")

        except Exception as e:
            print(f"❌ 読み込みエラー: {file_path}")
            print(f"   エラー: {e}")

    # JSONとして保存
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(search_index, f, ensure_ascii=False, indent=2)

    print(f"✅ 検索用 JSON を作成: {output_json}")


# `.fgb` ファイルのディレクトリを指定
INPUT_DIR = Path(__file__).resolve().parent.parent.parent / "batch" / "data" / "search"

if __name__ == "__main__":
    # `.fgb` ファイルのリストを取得
    # .fgbファイルのリストを取得
    all_fgb_files = glob.glob(str(INPUT_DIR / "*.geojson"))

    # search_data_dict に定義されたファイル名のみを対象にフィルタリング
    target_filenames = {v["path"] for v in search_data_dict.values()}
    fgb_files = [f for f in all_fgb_files if Path(f).name in target_filenames]

    if not fgb_files:
        print("❌ .geojson ファイルが見つかりません")
    else:
        print(f"📂 {len(fgb_files)} 個の .geojson ファイルを処理中...")

        # 検索用 JSON を作成（関数は別途定義済みと仮定）
        create_search_json(fgb_files)
