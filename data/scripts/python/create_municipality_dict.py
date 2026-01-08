#!/usr/bin/env python3
"""
団体コードをキーにしたJSON辞書を作成するスクリプト

https://www.soumu.go.jp/denshijiti/code.html
"""

import csv
import json
from pathlib import Path


def create_municipality_dict(csv_path: str, output_path: str):
    """
    CSVファイルから団体コードをキーにした辞書を作成してJSONファイルに保存
    
    Args:
        csv_path: 入力CSVファイルのパス
        output_path: 出力JSONファイルのパス
    """
    municipality_dict = {}
    
    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            # 団体コードをキーとして辞書に追加
            code = row['団体コード'].strip()
            
            # 空のコードはスキップ
            if not code:
                continue
            
            # カラム名から改行を削除して整形
            pref_kanji = row.get('都道府県名\n（漢字）', '').strip()
            city_kanji = row.get('市区町村名\n（漢字）', '').strip()
            pref_kana = row.get('都道府県名\n（カナ）', '').strip()
            city_kana = row.get('市区町村名\n（カナ）', '').strip()
            
            municipality_dict[code] = {
                'prefecture': pref_kanji,
                'city': city_kanji,
                'prefecture_kana': pref_kana,
                'city_kana': city_kana,
                'full_name': f"{pref_kanji}{city_kanji}" if city_kanji else pref_kanji,
                'full_name_kana': f"{pref_kana}{city_kana}" if city_kana else pref_kana
            }
    
    # JSONファイルに保存
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(municipality_dict, f, ensure_ascii=False, indent=2)
    
    print(f"✓ {len(municipality_dict)} 件の団体コードを処理しました")
    print(f"✓ 出力ファイル: {output_path}")


def main():
    # スクリプトのディレクトリを基準にパスを設定
    script_dir = Path(__file__).parent
    csv_path = script_dir / 'data' / 'code' / '000925835.csv'
    output_path = script_dir / 'data' / 'code' / 'municipality_dict.json'
    
    # 出力ディレクトリが存在しない場合は作成
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # 辞書を作成
    create_municipality_dict(str(csv_path), str(output_path))
    
    # サンプルデータを表示
    with open(output_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        print("\n=== サンプルデータ ===")
        for i, (code, info) in enumerate(list(data.items())[:5]):
            print(f"\n{code}:")
            print(f"  {json.dumps(info, ensure_ascii=False, indent=2)}")
            if i >= 4:
                break


if __name__ == '__main__':
    main()
