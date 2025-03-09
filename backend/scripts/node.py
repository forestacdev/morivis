import json
from pathlib import Path

import geopandas as gpd
from shapely.geometry import LineString


# --- ファイルからGeoJSONデータを読み込む ---
def load_geojson(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


INPUT_DIR = Path(__file__).resolve().parent.parent / "data"
OUTPUT_DIR = (
    Path(__file__).resolve().parent.parent.parent / "frontend" / "static" / "streetView"
)

OUTPUT_DIR2 = (
    Path(__file__).resolve().parent.parent.parent
    / "frontend"
    / "src"
    / "routes"
    / "map"
    / "components"
    / "streetView"
)

# ノードデータとリンクデータのファイルパスを指定（適宜変更）
nodes_file = OUTPUT_DIR / "THETA360.geojson"
links_file = INPUT_DIR / "THETA360_line.geojson"

# GeoJSONファイルの読み込み
nodes_geojson = load_geojson(nodes_file)
links_geojson = load_geojson(links_file)


# --- 1. ノード情報を辞書化（座標 -> ID） ---
def round_coordinates(coord, precision=6):
    """座標を指定された小数点の精度に丸める"""
    return tuple(round(c, precision) for c in coord)


node_dict = {}

for feature in nodes_geojson["features"]:
    if feature["geometry"]["type"] == "Point":
        node_id = feature["properties"]["ID"]
        coordinates = round_coordinates(feature["geometry"]["coordinates"])  # 丸める
        node_dict[coordinates] = node_id

# --- 2. ラインデータに "source" と "target" を付与 ---
node_connections = {}  # 各ノードの隣接ノード情報を保持する辞書
link_features = []  # FGB出力用のリンクリスト

for feature in links_geojson["features"]:
    if feature["geometry"]["type"] == "LineString":
        coordinates = feature["geometry"]["coordinates"]
        start_coord = round_coordinates(coordinates[0])  # 丸める
        end_coord = round_coordinates(coordinates[-1])  # 丸める

        source_id = node_dict.get(start_coord)
        target_id = node_dict.get(end_coord)

        if source_id and target_id:
            feature["properties"]["source"] = source_id
            feature["properties"]["target"] = target_id

            # GeoPandas DataFrame 用のデータリスト
            link_features.append(
                {
                    "geometry": LineString(coordinates),
                    "source": source_id,
                    "target": target_id,
                }
            )

            # --- 3. 隣接ノードの辞書を作成 ---
            if source_id not in node_connections:
                node_connections[source_id] = []
            if target_id not in node_connections:
                node_connections[target_id] = []

            # ⚠️ 修正: 自身を追加しないようにする
            if source_id != target_id:
                if target_id not in node_connections[source_id]:
                    node_connections[source_id].append(target_id)
                if source_id not in node_connections[target_id]:
                    node_connections[target_id].append(source_id)

        else:
            print(f"⚠️ 識別できないノードがある: {coordinates}")
            print(f"  - source: {source_id}")
            print(f"  - target: {target_id}")

# --- 4. FGB ファイル（リンクデータのみ）に保存 ---
links_gdf = gpd.GeoDataFrame(link_features, crs="EPSG:4326")

# FGB ファイルに保存（リンクのみ）
output_links_fgb = OUTPUT_DIR / "links.fgb"
links_gdf.to_file(output_links_fgb, driver="FlatGeobuf")

print(f"✅ リンクデータを {output_links_fgb} に保存しました。")

# --- 5. 隣接ノードデータを JSON で保存 ---
output_connections_file = OUTPUT_DIR2 / "node_connections.json"
with open(output_connections_file, "w", encoding="utf-8") as f:
    json.dump(node_connections, f, indent=2, ensure_ascii=False)

print(f"✅ ノード接続データを {output_connections_file} に保存しました。")
