from pyproj import CRS
import json

# 統合されたEPSG情報辞書
EPSG_INFO_MAP = {
    4326: {"name_ja": "WGS84 / 地理座標系", "prefecture": None, "zone": None},
    3857: {"name_ja": "Web メルカトル座標系", "prefecture": "世界", "zone": None},
    4612: {"name_ja": "日本測地系2000 / 地理座標系", "prefecture": None, "zone": None},
    6668: {"name_ja": "日本測地系2011 / 地理座標系", "prefecture": None, "zone": None},
    6669: {
        "name_ja": "日本測地系2011 / 平面直角座標系第1系",
        "prefecture": "長崎県",
        "zone": "1",
    },
    6670: {
        "name_ja": "日本測地系2011 / 平面直角座標系第2系",
        "prefecture": "福岡県、佐賀県、熊本県、大分県、宮崎県、鹿児島県",
        "zone": "2",
    },
    6671: {
        "name_ja": "日本測地系2011 / 平面直角座標系第3系",
        "prefecture": "広島県、山口県、島根県",
        "zone": "3",
    },
    6672: {
        "name_ja": "日本測地系2011 / 平面直角座標系第4系",
        "prefecture": "徳島県、香川県、愛媛県、高知県",
        "zone": "4",
    },
    6673: {
        "name_ja": "日本測地系2011 / 平面直角座標系第5系",
        "prefecture": "兵庫県、鳥取県、岡山県",
        "zone": "5",
    },
    6674: {
        "name_ja": "日本測地系2011 / 平面直角座標系第6系",
        "prefecture": "京都府、大阪府、福井県、滋賀県、三重県、奈良県、和歌山県",
        "zone": "6",
    },
    6675: {
        "name_ja": "日本測地系2011 / 平面直角座標系第7系",
        "prefecture": "石川県、富山県、岐阜県、愛知県",
        "zone": "7",
    },
    6676: {
        "name_ja": "日本測地系2011 / 平面直角座標系第8系",
        "prefecture": "新潟県、長野県、山梨県、静岡県",
        "zone": "8",
    },
    6677: {
        "name_ja": "日本測地系2011 / 平面直角座標系第9系",
        "prefecture": "東京都、福島県、栃木県、茨城県、埼玉県、千葉県、群馬県、神奈川県",
        "zone": "9",
    },
    6678: {
        "name_ja": "日本測地系2011 / 平面直角座標系第10系",
        "prefecture": "青森県、秋田県、山形県、岩手県、宮城県",
        "zone": "10",
    },
    6679: {
        "name_ja": "日本測地系2011 / 平面直角座標系第11系",
        "prefecture": "北海道（11系地域）",
        "zone": "11",
    },
    6680: {
        "name_ja": "日本測地系2011 / 平面直角座標系第12系",
        "prefecture": "北海道",
        "zone": "12",
    },
    6681: {
        "name_ja": "日本測地系2011 / 平面直角座標系第13系",
        "prefecture": "北海道（13系地域）",
        "zone": "13",
    },
    6682: {
        "name_ja": "日本測地系2011 / 平面直角座標系第14系",
        "prefecture": "東京都（小笠原）",
        "zone": "14",
    },
    6683: {
        "name_ja": "日本測地系2011 / 平面直角座標系第15系",
        "prefecture": "沖縄県",
        "zone": "15",
    },
    6684: {
        "name_ja": "日本測地系2011 / 平面直角座標系第16系",
        "prefecture": "沖縄県（16系地域）",
        "zone": "16",
    },
    6685: {
        "name_ja": "日本測地系2011 / 平面直角座標系第17系",
        "prefecture": "沖縄県（17系地域）",
        "zone": "17",
    },
    6686: {
        "name_ja": "日本測地系2011 / 平面直角座標系第18系",
        "prefecture": "東京都（沖ノ鳥島）",
        "zone": "18",
    },
    6687: {
        "name_ja": "日本測地系2011 / 平面直角座標系第19系",
        "prefecture": "東京都（南鳥島）",
        "zone": "19",
    },
    2443: {
        "name_ja": "日本測地系2011 / 北海道測地系",
        "prefecture": "北海道",
        "zone": None,
    },
}


def get_epsg_info(epsg_code):
    """EPSGコードから統合された情報を取得"""
    default_info = {"name": "不明", "prefecture": None, "zone": None}
    return EPSG_INFO_MAP.get(epsg_code, default_info)


def epsg_list_to_detailed_dict(epsg_codes):
    detailed_dict = {}
    for code in epsg_codes:
        try:
            crs = CRS.from_epsg(code)

            # 基本情報を取得
            info = {
                "citation": crs.name,  # 正式名称
                "proj_context": crs.to_proj4(),  # Proj4文字列
                "area_of_use": None,
                "datum": None,
                "ellipsoid": None,
                "projection_method": None,
            }

            custom_info = get_epsg_info(code)
            
            info["name_ja"] = custom_info["name_ja"]
            
            # prefecture と zone を追加（値が存在する場合のみ）
            if custom_info["prefecture"]:
                info["prefecture"] = custom_info["prefecture"]
            if custom_info["zone"]:
                info["zone"] = custom_info["zone"]

            # 使用領域情報
            if hasattr(crs, "area_of_use") and crs.area_of_use:
                area = crs.area_of_use
                info["area_of_use"] = {
                    "name": area.name,
                    "bounds": [area.west, area.south, area.east, area.north],
                }

            # 測地系情報
            if hasattr(crs, "datum") and crs.datum:
                info["datum"] = crs.datum.name

            # 楕円体情報
            if hasattr(crs, "ellipsoid") and crs.ellipsoid:
                info["ellipsoid"] = {
                    "name": crs.ellipsoid.name,
                    "semi_major_axis": crs.ellipsoid.semi_major_metre,
                    "inverse_flattening": crs.ellipsoid.inverse_flattening,
                }

            # 投影法情報（投影座標系の場合）
            if crs.is_projected:
                if hasattr(crs, "coordinate_operation") and crs.coordinate_operation:
                    info["projection_method"] = crs.coordinate_operation.method_name

            detailed_dict[str(code)] = info

        except Exception as e:
            print(f"EPSG:{code} - 取得失敗: {e}")
            detailed_dict[str(code)] = {
                "citation": None,
                "projContext": None,
                "name": None,
                "error": str(e),
            }

    return detailed_dict




# 使用例
epsg_codes = EPSG_INFO_MAP.keys()

detailed_dict = epsg_list_to_detailed_dict(epsg_codes)

# 結果を確認
print(json.dumps(detailed_dict, indent=2, ensure_ascii=False))

# JSONファイルに保存
with open("epsg_definitions.json", "w", encoding="utf-8") as f:
    json.dump(detailed_dict, f, indent=2, ensure_ascii=False)
