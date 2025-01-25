import json
from pathlib import Path
from typing import List

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

# JSONファイルのパス
JSON_FILE_PATH = Path("data.json")


# Pydanticモデル
class Item(BaseModel):
    id: int
    name: str
    description: str = None


# JSONファイルの読み取り
def read_json_file() -> List[dict]:
    if not JSON_FILE_PATH.exists():
        return []  # ファイルが存在しない場合は空リストを返す
    with open(JSON_FILE_PATH, "r", encoding="utf-8") as file:
        return json.load(file)


# JSONファイルの書き込み
def write_json_file(data: List[dict]) -> None:
    with open(JSON_FILE_PATH, "w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=4)


@app.get("/")
def read_root():
    return {"Hello": "World"}


# すべてのデータを取得
@app.get("/items", response_model=List[Item])
def get_items():
    return read_json_file()


# 新しいデータを追加
@app.post("/items", response_model=Item)
def add_item(item: Item):
    data = read_json_file()

    # IDが重複していないかチェック
    if any(existing_item["id"] == item.id for existing_item in data):
        raise HTTPException(status_code=400, detail="Item with this ID already exists.")

    # データを追加
    data.append(item.dict())
    write_json_file(data)
    return item


# 既存のデータを更新
@app.put("/items/{item_id}", response_model=Item)
def update_item(item_id: int, updated_item: Item):
    data = read_json_file()

    for index, existing_item in enumerate(data):
        if existing_item["id"] == item_id:
            # データを更新
            data[index] = updated_item.dict()
            write_json_file(data)
            return updated_item

    raise HTTPException(status_code=404, detail="Item not found.")


# 特定のデータを削除
@app.delete("/items/{item_id}")
def delete_item(item_id: int):
    data = read_json_file()

    for index, existing_item in enumerate(data):
        if existing_item["id"] == item_id:
            # データを削除
            data.pop(index)
            write_json_file(data)
            return {"detail": "Item deleted successfully."}

    raise HTTPException(status_code=404, detail="Item not found.")
