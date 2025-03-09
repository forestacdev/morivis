import json
import os
import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# CORSミドルウェアの設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # フロントエンドのURL（Viteのデフォルト）
    allow_credentials=True,
    allow_methods=["*"],  # すべてのHTTPメソッドを許可（GET, POST, PUT, DELETE など）
    allow_headers=["*"],  # すべてのHTTPヘッダーを許可
)

JSON_FILE = "data.json"

JSON_FILE = (
    Path(__file__).resolve().parent.parent.parent
    / "frontend"
    / "src"
    / "routes"
    / "map"
    / "components"
    / "streetView"
    / "angle.json"
)


# JSONファイルを読み込む関数


def load_json():
    if not os.path.exists(JSON_FILE):
        return []
    with open(JSON_FILE, "r", encoding="utf-8") as file:
        return json.load(file)


# JSONファイルに書き込む関数
def save_json(data):
    with open(JSON_FILE, "w", encoding="utf-8") as file:
        json.dump(data, file, indent=4, ensure_ascii=False)


# リクエストボディのバリデーション
class UpdateAngles(BaseModel):
    id: str  # または id: uuid.UUID でバリデーションを強化
    angleX: int
    angleY: int
    angleZ: int


@app.put("/update_angle")
async def update_angle(data: UpdateAngles):
    json_data = load_json()

    for obj in json_data:
        if obj["id"] == str(data.id):  # `id` が文字列なのでそのまま比較
            print("Found matching ID:", obj["id"])  # 確認用
            sys.stdout.flush()

            obj["angleX"] = data.angleX
            obj["angleY"] = data.angleY
            obj["angleZ"] = data.angleZ

            save_json(json_data)  # 更新後にJSONを保存

            return {"message": "Updated successfully", "data": obj["id"]}

    print("ID not found:", data.id)  # IDが見つからなかった場合
    raise HTTPException(status_code=404, detail="ID not found")


@app.get("/")
def read_root():
    return {"Hello": "World"}


# jsonファイルのデータを取得
@app.get("/json")
async def read_angles():
    return load_json()
