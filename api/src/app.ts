import { Hono } from "hono";
import { cors } from "hono/cors";
import { Compression, PMTiles } from "pmtiles";

const PMTILES_BASE_URL =
    process.env.PMTILES_BASE_URL ||
    "http://localhost:9000/data/entries/pmtiles";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

export const app = new Hono();

app.use("*", cors({ origin: CORS_ORIGIN }));

app.get("/", (c) => {
    return c.text("Hello Hono!");
});

app.get("/health", (c) => {
    return c.json({ status: "ok" });
});

// PMTilesのベクタタイルを取得するエンドポイント
app.get("/vector/:file_name/:z/:x/:y", async (c) => {
    const { file_name, z, x, y } = c.req.param();

    const pmtiles = new PMTiles(
        `${PMTILES_BASE_URL}/vector/${file_name}.pmtiles`,
    );

    const tile = await pmtiles.getZxy(Number(z), Number(x), Number(y));

    if (tile === undefined) return c.text("tile not found", 404);
    return c.body(Buffer.from(tile.data), 200, {
        "Content-Type": "application/vnd.mapbox-vector-tile",
    });
});

// PMTilesのラスタタイルを取得するエンドポイント
app.get("/raster/:file_name/:z/:x/:y", async (c) => {
    const { file_name, z, x, y } = c.req.param();
    const pmtiles = new PMTiles(
        `${PMTILES_BASE_URL}/raster/${file_name}.pmtiles`,
    );

    const tile = await pmtiles.getZxy(Number(z), Number(x), Number(y));
    if (tile === undefined) return c.text("tile not found", 404);

    c.header("Content-Type", "image/png");
    return c.body(tile.data);
});
