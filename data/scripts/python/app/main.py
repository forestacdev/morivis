from pathlib import Path

from aiopmtiles import Reader
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# CORSミドルウェアの設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # フロントエンドのURL（Viteのデフォルト）
    allow_credentials=True,
    allow_methods=["*"],  # すべてのHTTPメソッドを許可（GET, POST, PUT, DELETE など）
    allow_headers=["*"],  # すべてのHTTPヘッダーを許可
)


FILE = (
    Path(__file__).resolve().parent.parent.parent
    / "data"
    / "entry"
    / "pmtiles"
    / "vector"
    / "ensyurin.pmtiles"
)


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/health")
def health():
    return {"status": "ok"}


# PMTilesのベクタタイルを取得するエンドポイント
@app.get("/vector/{file_name}/{z}/{x}/{y}.pbf")
async def vectortile(file_name: str, z: int, x: int, y: int):
    async with Reader(
        f"http://localhost:9000/data/entries/pmtiles/vector/{file_name}.pmtiles"
    ) as pmtiles:
        # Get Tile
        tile_data = await pmtiles.get_tile(z, x, y)

    if tile_data is None:
        return Response(status_code=404)

    return Response(
        content=tile_data,
        media_type="application/vnd.mapbox-vector-tile",
        headers={"content-encoding": "gzip"},
    )


# PMTilesのラスタタイルを取得するエンドポイント
@app.get("/raster/{file_name}/{z}/{x}/{y}.png")
async def rastertile(file_name: str, z: int, x: int, y: int):
    async with Reader(
        f"http://localhost:9000/data/entries/pmtiles/raster/{file_name}.pmtiles"
    ) as pmtiles:
        tile_data = await pmtiles.get_tile(z, x, y)
        if tile_data is None:
            return Response(status_code=404)
        return Response(content=tile_data, media_type="image/png")
