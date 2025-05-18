from pyproj import CRS


def epsg_list_to_proj4_dict(epsg_codes):
    proj4_dict = {}
    for code in epsg_codes:
        try:
            crs = CRS.from_epsg(code)
            proj4_str = crs.to_proj4()
            proj4_dict[code] = proj4_str
        except Exception as e:
            print(f"EPSG:{code} - 取得失敗: {e}")
            proj4_dict[code] = None  # または除外したい場合は continue
    return proj4_dict


# 使用例
epsg_codes = [
    4326,
    3857,
    6669,
    6670,
    6671,
    6672,
    6673,
    6674,
    6675,
    6676,
    6677,
    6678,
    6679,
    6680,
    6681,
    6682,
    6683,
    6684,
    6685,
    6686,
    6687,
]
proj4_dict = epsg_list_to_proj4_dict(epsg_codes)

# 結果を確認
import json

print(json.dumps(proj4_dict, indent=2))

with open("epsg_proj4_map.json", "w") as f:
    json.dump(proj4_dict, f, indent=2)
