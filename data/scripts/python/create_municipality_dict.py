#!/usr/bin/env python3
"""
団体コードをキーにしたJSON辞書を作成するスクリプト

https://www.soumu.go.jp/denshijiti/code.html
"""

import argparse
import csv
import json
from pathlib import Path


def create_municipality_dict(csv_path: str, output_path: str, code_length: int = 6):
    """
    CSVファイルから団体コードをキーにした辞書を作成してJSONファイルに保存
    
    Args:
        csv_path: 入力CSVファイルのパス
        output_path: 出力JSONファイルのパス
        code_length: 団体コードの桁数（5 or 6）
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
            
            # 5桁にする場合は最後の1桁（チェックディジット）を削除
            if code_length == 5:
                code = code[:5]
            
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
    
    print(f"✓ {len(municipality_dict)} 件の団体コード（{code_length}桁）を処理しました")
    print(f"✓ 出力ファイル: {output_path}")


def main():
    parser = argparse.ArgumentParser(description='団体コードをキーにしたJSON辞書を作成')
    parser.add_argument(
        '--digits',
        type=int,
        choices=[5, 6],
        default=6,
        help='団体コードの桁数（5桁または6桁、デフォルト: 6）'
    )
    parser.add_argument(
        '--output',
        type=str,
        help='出力ファイルパス（指定しない場合は桁数に応じて自動設定）'
    )
    
    args = parser.parse_args()
    
    # スクリプトのディレクトリを基準にパスを設定
    script_dir = Path(__file__).parent
    csv_path = script_dir / 'data' / 'code' / '000925835.csv'
    
    # 出力ファイル名を桁数に応じて設定
    if args.output:
        output_path = Path(args.output)
    else:
        if args.digits == 5:
            output_path = script_dir / 'data' / 'code' / 'municipality_dict_5digit.json'
        else:
            output_path = script_dir / 'data' / 'code' / 'municipality_dict.json'
    
    # 出力ディレクトリが存在しない場合は作成
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # 辞書を作成
    create_municipality_dict(str(csv_path), str(output_path), args.digits)
    
    # サンプルデータを表示
    with open(output_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        print("\n=== サンプルデータ ===")
        for i, (code, info) in enumerate(list(data.items())[:5]):
            print(f"\n{code} ({len(code)}桁):")
            print(f"  {json.dumps(info, ensure_ascii=False, indent=2)}")
            if i >= 4:
                break


if __name__ == '__main__':
    main()
