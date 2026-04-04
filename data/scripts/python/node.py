import json
from pathlib import Path

import geopandas as gpd
from shapely.geometry import LineString


# --- ファイルからGeoJSONデータを読み込む ---
def load_geojson(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


SCRIPT_DIR = Path(__file__).resolve().parent
INPUT_DIR = SCRIPT_DIR / "data"
OUTPUT_DIR = SCRIPT_DIR.parents[1] / "assets" / "street_view"


# ノードデータとリンクデータのファイルパスを指定（適宜変更）
nodes_file = INPUT_DIR / "panorama_nodes.geojson"
links_file = INPUT_DIR / "panorama_links.geojson"

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
        node_id = feature["properties"]["node_id"]
        coordinates = round_coordinates(feature["geometry"]["coordinates"])
        node_dict[coordinates] = node_id

# --- 2. ラインデータに "source" と "target" を付与 ---
node_connections = {}  # 各ノードの隣接ノード情報を保持する辞書
link_features = []  # FGB出力用のリンクリスト
connected_nodes = set()  # リンクに接続されているノードのセット

for feature in links_geojson["features"]:
    if feature["geometry"]["type"] == "LineString":
        coordinates = feature["geometry"]["coordinates"]
        start_coord = round_coordinates(coordinates[0])
        end_coord = round_coordinates(coordinates[-1])

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

            # 接続されているノードを記録
            connected_nodes.add(source_id)
            connected_nodes.add(target_id)

            # --- 3. 隣接ノードの辞書を作成 ---
            if source_id not in node_connections:
                node_connections[source_id] = []
            if target_id not in node_connections:
                node_connections[target_id] = []

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

# --- 5. ノードデータに接続情報を追加 ---
nodes_gdf = gpd.GeoDataFrame.from_features(nodes_geojson)
nodes_gdf.crs = "EPSG:4326"

# has_link 列を追加（リンクに接続されているかどうか）
nodes_gdf["has_link"] = nodes_gdf["node_id"].isin(connected_nodes)

# connection_count 列を追加（接続数）
nodes_gdf["connection_count"] = nodes_gdf["node_id"].apply(
    lambda x: len(node_connections.get(x, []))
)

# 統計情報を出力
total_nodes = len(nodes_gdf)
connected_count = nodes_gdf["has_link"].sum()
isolated_count = total_nodes - connected_count

print("\n📊 ノード統計:")
print(f"  総ノード数: {total_nodes}")
print(f"  接続あり: {connected_count}")
print(f"  孤立ノード: {isolated_count}")

# FGBファイルに保存
output_nodes_fgb = OUTPUT_DIR / "nodes.fgb"
nodes_gdf.to_file(output_nodes_fgb, driver="FlatGeobuf")

# FGB ファイルに保存（リンクのみ）
output_links_fgb = OUTPUT_DIR / "links.fgb"
links_gdf.to_file(output_links_fgb, driver="FlatGeobuf")

print(f"✅ ノードデータを {output_nodes_fgb} に保存しました。")
print(f"✅ リンクデータを {output_links_fgb} に保存しました。")

# --- 6. 隣接ノードデータを JSON で保存 ---
output_connections_file = OUTPUT_DIR / "node_connections.json"
with open(output_connections_file, "w", encoding="utf-8") as f:
    json.dump(node_connections, f, indent=2, ensure_ascii=False)

print(f"✅ ノード接続データを {output_connections_file} に保存しました。")

# --- 7. 検索用インデックスJSON作成 ---
# node_index = {}

# for _, row in nodes_gdf.iterrows():
#     node_id = row["node_id"]
#     geom = row["geometry"]

#     node_index[str(node_id)] = {
#         "lng": geom.x,
#         "lat": geom.y,
#         "photo_id": row.get("photo_id"),
#         "has_link": bool(row["has_link"]),
#         "connection_count": int(row["connection_count"]),
#         "date": row.get("Date"),
#         "time": row.get("Time", ""),
#         "name": row.get("name", ""),
#     }

# output_index = OUTPUT_DIR / "node_index.json"
# with open(output_index, "w", encoding="utf-8") as f:
#     json.dump(node_index, f, ensure_ascii=False)

# print(f"✅ ノードインデックスを {output_index} に保存しました。")
