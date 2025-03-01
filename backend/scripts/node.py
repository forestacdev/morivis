import json
from pathlib import Path


# --- ファイルからGeoJSONデータを読み込む ---
def load_geojson(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


INPUT_DIR = Path(__file__).resolve().parent.parent / "data"

OUTPUT_DIR = (
    Path(__file__).resolve().parent.parent.parent / "frontend" / "static" / "streetView"
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
        else:
            print(f"⚠️ 識別できないノードがある: {coordinates}")
            print(f"  - source: {source_id}")
            print(f"  - target: {target_id}")

# --- 3. 結果をファイルに保存 ---
output_file = OUTPUT_DIR / "link.geojson"
with open(output_file, "w", encoding="utf-8") as f:
    json.dump(links_geojson, f, indent=2, ensure_ascii=False)

print(f"✅ 更新されたリンクデータを {output_file} に保存しました。")
