import { createRoute, z } from "@hono/zod-openapi";
import type { OpenAPIHono } from "@hono/zod-openapi";
import { captureMapScreenshot } from "./screenshot";

const ScreenshotQuery = z.object({
    c: z
        .string()
        .optional()
        .openapi({
            description: "地図の中心座標 (lng_lat)",
            example: "136.921382_35.55356",
        }),
    z: z
        .string()
        .optional()
        .openapi({ description: "ズームレベル", example: "16" }),
    p: z
        .string()
        .optional()
        .openapi({ description: "ピッチ", example: "0" }),
    b: z
        .string()
        .optional()
        .openapi({ description: "ベアリング", example: "0" }),
    "3d": z
        .enum(["0", "1"])
        .optional()
        .openapi({ description: "3D地形の有効/無効", example: "0" }),
});

const screenshotRoute = createRoute({
    method: "get",
    path: "/screenshot",
    request: { query: ScreenshotQuery },
    responses: {
        200: {
            description: "地図のスクリーンショット (512x512 PNG)",
            content: { "image/png": { schema: z.string() } },
        },
        500: { description: "スクリーンショット生成に失敗" },
    },
    tags: ["Screenshot"],
});

export const registerScreenshotRoute = (app: OpenAPIHono) => {
    app.openapi(screenshotRoute, async (c) => {
        const query = c.req.valid("query");

        try {
            const png = await captureMapScreenshot({
                center: query.c,
                zoom: query.z ? Number(query.z) : undefined,
                pitch: query.p ? Number(query.p) : undefined,
                bearing: query.b ? Number(query.b) : undefined,
                terrain3d: query["3d"] as "0" | "1" | undefined,
            });

            return c.body(png, 200, {
                "Content-Type": "image/png",
                "Cache-Control": "public, max-age=3600",
            });
        } catch (error) {
            console.error("Screenshot error:", error);
            return c.text("Screenshot generation failed", 500);
        }
    });
};
