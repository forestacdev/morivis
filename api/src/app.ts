import { Hono } from "hono";
import { cors } from "hono/cors";
import { Compression, PMTiles } from "pmtiles";

const PMTILES_BASE_URL =
    process.env.PMTILES_BASE_URL ||
    "http://localhost:9000/data/entries/pmtiles";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

// PMTilesインスタンスのキャッシュ
const pmtilesCache: Record<string, PMTiles> = {};

function getPMTiles(url: string): PMTiles {
    if (!pmtilesCache[url]) {
        pmtilesCache[url] = new PMTiles(url);
    }
    return pmtilesCache[url];
}

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

    try {
        const pmtiles = getPMTiles(
            `${PMTILES_BASE_URL}/vector/${file_name}.pmtiles`,
        );

        const header = await pmtiles.getHeader();
        const tile = await pmtiles.getZxy(Number(z), Number(x), Number(y));
        if (!tile) {
            return c.json({ message: "Tile not found" }, 404);
        }

        const headers: Record<string, string> = {
            "Content-Type": "application/vnd.mapbox-vector-tile",
            "Cache-Control": "max-age=31536000, s-maxage=31536000",
        };
        if (header.tileCompression === Compression.Gzip) {
            headers["Content-Encoding"] = "gzip";
        }
        return c.body(tile.data, { headers });
    } catch (error) {
        console.error("Error serving vector tile:", error);
        return c.json(
            {
                message: "Failed to fetch tile data",
                error: error instanceof Error ? error.message : "Unknown error",
            },
            500,
        );
    }
});

// PMTilesのラスタタイルを取得するエンドポイント
app.get("/raster/:file_name/:z/:x/:y", async (c) => {
    const { file_name, z, x, y } = c.req.param();

    try {
        const pmtiles = getPMTiles(
            `${PMTILES_BASE_URL}/raster/${file_name}.pmtiles`,
        );

        const tile = await pmtiles.getZxy(Number(z), Number(x), Number(y));
        if (!tile) {
            return c.json({ message: "Tile not found" }, 404);
        }

        return c.body(tile.data, {
            headers: {
                "Content-Type": "image/png",
                "Cache-Control": "max-age=31536000, s-maxage=31536000",
            },
        });
    } catch (error) {
        console.error("Error serving raster tile:", error);
        return c.json(
            {
                message: "Failed to fetch tile data",
                error: error instanceof Error ? error.message : "Unknown error",
            },
            500,
        );
    }
});
