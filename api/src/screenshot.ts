import { chromium, type Browser } from "playwright";

const FRONTEND_BASE_URL =
    process.env.FRONTEND_BASE_URL || "http://localhost:5173";
const FRONTEND_BASE_PATH = process.env.FRONTEND_BASE_PATH || "";
const SCREENSHOT_WIDTH = 512;
const SCREENSHOT_HEIGHT = 512;
const SCREENSHOT_TIMEOUT = 30_000;

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
    if (!browser || !browser.isConnected()) {
        browser = await chromium.launch({
            args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
        });
    }
    return browser;
}

export interface ScreenshotParams {
    center?: string;
    zoom?: number;
    pitch?: number;
    bearing?: number;
    terrain3d?: "0" | "1";
}

export async function captureMapScreenshot(
    params: ScreenshotParams,
): Promise<Buffer> {
    const b = await getBrowser();
    const context = await b.newContext({
        viewport: { width: SCREENSHOT_WIDTH, height: SCREENSHOT_HEIGHT },
        deviceScaleFactor: 1,
    });

    const page = await context.newPage();

    try {
        const url = new URL(
            `${FRONTEND_BASE_PATH}/map`,
            FRONTEND_BASE_URL,
        );
        url.searchParams.set("mode", "screenshot");
        if (params.center) url.searchParams.set("c", params.center);
        if (params.zoom !== undefined)
            url.searchParams.set("z", String(params.zoom));
        if (params.pitch !== undefined)
            url.searchParams.set("p", String(params.pitch));
        if (params.bearing !== undefined)
            url.searchParams.set("b", String(params.bearing));
        if (params.terrain3d) url.searchParams.set("3d", params.terrain3d);

        await page.goto(url.toString(), { waitUntil: "domcontentloaded" });

        await page.waitForFunction(
            () => (window as any).__morivis_map_idle === true,
            { timeout: SCREENSHOT_TIMEOUT },
        );

        // WebGLレンダリング完了を待つ
        await page.waitForTimeout(300);

        const screenshot = await page.screenshot({
            type: "png",
            clip: {
                x: 0,
                y: 0,
                width: SCREENSHOT_WIDTH,
                height: SCREENSHOT_HEIGHT,
            },
        });

        return Buffer.from(screenshot);
    } finally {
        await context.close();
    }
}

export async function closeBrowser(): Promise<void> {
    if (browser) {
        await browser.close();
        browser = null;
    }
}
