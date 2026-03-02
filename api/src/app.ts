import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { cors } from "hono/cors";
import { PMTiles, TileType } from "pmtiles";

const PMTILES_BASE_URL =
    process.env.PMTILES_BASE_URL ||
    "http://localhost:9000/data/entries/pmtiles";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

export const app = new OpenAPIHono();

app.use("*", cors({ origin: CORS_ORIGIN }));

// --- スキーマ定義 ---

const TileParams = z.object({
    file_name: z
        .string()
        .openapi({ description: "PMTilesファイル名", example: "example" }),
    z: z.string().openapi({ description: "ズームレベル", example: "14" }),
    x: z.string().openapi({ description: "タイルX座標", example: "14423" }),
    y: z.string().openapi({ description: "タイルY座標", example: "6459" }),
});

const UrlTileParams = z.object({
    z: z.string().openapi({ description: "ズームレベル", example: "14" }),
    x: z.string().openapi({ description: "タイルX座標", example: "14423" }),
    y: z.string().openapi({ description: "タイルY座標", example: "6459" }),
});

const UrlTileQuery = z.object({
    url: z
        .string()
        .url()
        .openapi({
            description: "PMTilesファイルのURL",
            example: "https://example.com/tiles.pmtiles",
        }),
});

// --- ルート定義 ---

const healthRoute = createRoute({
    method: "get",
    path: "/health",
    responses: {
        200: {
            content: {
                "application/json": {
                    schema: z.object({ status: z.string() }),
                },
            },
            description: "ヘルスチェック",
        },
    },
    tags: ["System"],
});

const vectorTileRoute = createRoute({
    method: "get",
    path: "/vector/{file_name}/{z}/{x}/{y}",
    request: { params: TileParams },
    responses: {
        200: {
            description: "ベクタタイルデータ",
            content: { "application/octet-stream": { schema: z.string() } },
        },
        404: { description: "タイルが見つかりません" },
    },
    tags: ["Tiles"],
});

const pbfTileRoute = createRoute({
    method: "get",
    path: "/pmtiles/pbf/{z}/{x}/{y}",
    request: { params: UrlTileParams, query: UrlTileQuery },
    responses: {
        200: {
            description: "PBFベクタタイルデータ",
            content: { "application/octet-stream": { schema: z.string() } },
        },
        404: { description: "タイルが見つかりません" },
    },
    tags: ["Tiles"],
});

const rasterUrlTileRoute = createRoute({
    method: "get",
    path: "/pmtiles/raster/{z}/{x}/{y}",
    request: { params: UrlTileParams, query: UrlTileQuery },
    responses: {
        200: {
            description: "ラスタタイルデータ (PNG/JPEG/WebP/AVIF)",
            content: { "application/octet-stream": { schema: z.string() } },
        },
        404: { description: "タイルが見つかりません" },
    },
    tags: ["Tiles"],
});

const rasterTileRoute = createRoute({
    method: "get",
    path: "/raster/{file_name}/{z}/{x}/{y}",
    request: { params: TileParams },
    responses: {
        200: {
            description: "ラスタタイルデータ (PNG/JPEG/WebP/AVIF)",
            content: { "application/octet-stream": { schema: z.string() } },
        },
        404: { description: "タイルが見つかりません" },
    },
    tags: ["Tiles"],
});

// --- ハンドラ ---

app.openapi(healthRoute, (c) => {
    return c.json({ status: "ok" }, 200);
});

app.openapi(vectorTileRoute, async (c) => {
    const { file_name, z, x, y } = c.req.valid("param");
    const pmtiles = new PMTiles(
        `${PMTILES_BASE_URL}/vector/${file_name}.pmtiles`,
    );

    const tile = await pmtiles.getZxy(Number(z), Number(x), Number(y));
    if (tile === undefined) return c.text("tile not found", 404);

    return c.body(Buffer.from(tile.data), 200, {
        "Content-Type": "application/vnd.mapbox-vector-tile",
    });
});

app.openapi(pbfTileRoute, async (c) => {
    const { z, x, y } = c.req.valid("param");
    const { url } = c.req.valid("query");
    const pmtiles = new PMTiles(url);

    const tile = await pmtiles.getZxy(Number(z), Number(x), Number(y));
    if (tile === undefined) return c.text("tile not found", 404);

    return c.body(Buffer.from(tile.data), 200, {
        "Content-Type": "application/x-protobuf",
    });
});

app.openapi(rasterUrlTileRoute, async (c) => {
    const { z, x, y } = c.req.valid("param");
    const { url } = c.req.valid("query");
    const pmtiles = new PMTiles(url);

    const header = await pmtiles.getHeader();
    const tile = await pmtiles.getZxy(Number(z), Number(x), Number(y));
    if (tile === undefined) return c.text("tile not found", 404);

    const contentType: Record<number, string> = {
        [TileType.Png]: "image/png",
        [TileType.Jpeg]: "image/jpeg",
        [TileType.Webp]: "image/webp",
        [TileType.Avif]: "image/avif",
    };

    return c.body(Buffer.from(tile.data), 200, {
        "Content-Type":
            contentType[header.tileType] || "application/octet-stream",
    });
});

app.openapi(rasterTileRoute, async (c) => {
    const { file_name, z, x, y } = c.req.valid("param");
    const pmtiles = new PMTiles(
        `${PMTILES_BASE_URL}/raster/${file_name}.pmtiles`,
    );

    const header = await pmtiles.getHeader();
    const tile = await pmtiles.getZxy(Number(z), Number(x), Number(y));
    if (tile === undefined) return c.text("tile not found", 404);

    const contentType: Record<number, string> = {
        [TileType.Png]: "image/png",
        [TileType.Jpeg]: "image/jpeg",
        [TileType.Webp]: "image/webp",
        [TileType.Avif]: "image/avif",
    };

    return c.body(Buffer.from(tile.data), 200, {
        "Content-Type":
            contentType[header.tileType] || "application/octet-stream",
    });
});

// --- OpenAPI ドキュメント & Swagger UI ---

app.doc("/doc", {
    openapi: "3.0.0",
    info: {
        title: "morivis Tile API",
        version: "1.0.0",
        description: "PMTilesベースのタイル配信API",
    },
});

app.get("/ui", swaggerUI({ url: "/doc" }));
