import { expect, type Page, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

import { getDemLightDirection } from '../src/routes/map/utils/style/dem-shadow';

test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });

const shaderRoot = new URL('../src/routes/map/protocol/raster/shader/', import.meta.url);
const vertex = readFileSync(new URL('vertex.glsl', shaderRoot), 'utf8');
const fragment = readFileSync(new URL('fragment.glsl', shaderRoot), 'utf8');

type Terrain = {
	dx?: number;
	dy?: number;
	azimuth?: number;
	altitude?: number;
	tileY?: number;
	zoom?: number;
	tileSize?: number;
	missing?: 'center' | 'left' | 'neighbors';
	demType?: number;
};

// 実際の GLSL を WebGL2 で描画し、人工 DEM のピクセル値を検証する。
const render = async (page: Page, terrain: Terrain = {}) =>
	page.evaluate(
		({ vertex, fragment, terrain, light }) => {
			const size = terrain.tileSize ?? 8;
			const zoom = terrain.zoom ?? 20;
			const canvas = document.createElement('canvas');
			canvas.width = canvas.height = size;
			const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true })!;
			if (!gl) throw new Error('WebGL2 is required');
			const compile = (type: number, source: string) => {
				const shader = gl.createShader(type)!;
				gl.shaderSource(shader, source);
				gl.compileShader(shader);
				if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
					throw new Error(gl.getShaderInfoLog(shader) ?? 'Shader compilation failed');
				}
				return shader;
			};
			const program = gl.createProgram()!;
			gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
			gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
			gl.linkProgram(program);
			if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
				throw new Error(gl.getProgramInfoLog(program) ?? 'Shader link failed');
			}
			gl.useProgram(program);
			gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
			gl.bufferData(
				gl.ARRAY_BUFFER,
				new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
				gl.STATIC_DRAW
			);
			const position = gl.getAttribLocation(program, 'a_position');
			gl.enableVertexAttribArray(position);
			gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
			const demType = terrain.demType ?? 2;
			const offsets = [[0, 0], [-size, 0], [size, 0], [0, -size], [0, size]];
			['center', 'left', 'right', 'top', 'bottom'].forEach((side, unit) => {
				const pixels = new Uint8Array(size * size * 4);
				for (let y = 0; y < size; y++) {
					for (let x = 0; x < size; x++) {
						const height = 1000 + (x + offsets[unit][0]) * (terrain.dx ?? 0)
							+ (y + offsets[unit][1]) * (terrain.dy ?? 0);
						const encoded = demType === 2
							? (height + 32768) * 256
							: demType === 1
							? height * 100
							: (height + 10000) * 10;
						const offset = (y * size + x) * 4;
						pixels.set(
							[encoded >> 16 & 255, encoded >> 8 & 255, encoded & 255, 255],
							offset
						);
						if (
							terrain.missing === side
							|| (terrain.missing === 'neighbors' && side !== 'center')
						) {
							pixels.set(demType === 1 ? [128, 0, 0, 255] : [0, 0, 0, 0], offset);
						}
					}
				}
				gl.activeTexture(gl.TEXTURE0 + unit);
				gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
				gl.texImage2D(
					gl.TEXTURE_2D,
					0,
					gl.RGBA,
					size,
					size,
					0,
					gl.RGBA,
					gl.UNSIGNED_BYTE,
					pixels
				);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
				gl.uniform1i(gl.getUniformLocation(program, `u_height_map_${side}`), unit);
			});
			const uniforms = {
				u_mode: 5,
				u_dem_type: demType,
				u_tile_size: size,
				u_tile_z: zoom,
				u_tile_y: terrain.tileY ?? Math.floor(2 ** zoom / 2)
			};
			Object.entries(uniforms).forEach(([name, value]) =>
				gl.uniform1f(gl.getUniformLocation(program, name), value)
			);
			gl.uniform3fv(gl.getUniformLocation(program, 'u_light_direction'), light);
			gl.viewport(0, 0, size, size);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			const pixels = new Uint8Array(size * size * 4);
			gl.readPixels(0, 0, size, size, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
			if (gl.getError() !== gl.NO_ERROR) throw new Error('WebGL rendering failed');
			gl.getExtension('WEBGL_lose_context')?.loseContext();
			return Array.from(pixels);
		},
		{
			vertex,
			fragment,
			terrain,
			light: getDemLightDirection({
				azimuth: terrain.azimuth ?? 315,
				altitude: terrain.altitude ?? 45
			})
		}
	);

test('平地は高度角で明るさが変わり、3 種の DEM エンコードで一致する', async ({ page }) => {
	for (const demType of [0, 1, 2]) {
		for (const [altitude, expected] of [[0, 0], [30, 128], [90, 255]]) {
			const pixels = await render(page, { demType, altitude });
			for (let i = 0; i < pixels.length; i += 4) {
				expect(Math.abs(pixels[i] - expected)).toBeLessThanOrEqual(1);
				expect(pixels[i + 3]).toBe(255);
			}
		}
	}
});

test('東西・南北の斜面で光源を反転すると明暗が反転する', async ({ page }) => {
	for (
		const [gradient, litAzimuth, darkAzimuth] of [
			[{ dx: 5 }, 270, 90],
			[{ dy: 5 }, 0, 180]
		] as const
	) {
		const lit = await render(page, { ...gradient, azimuth: litAzimuth });
		const dark = await render(page, { ...gradient, azimuth: darkAzimuth });
		expect(lit[4 * 27]).toBeGreaterThan(250);
		expect(dark[4 * 27]).toBeLessThan(5);
	}
});

test('タイルの四辺と角でも連続した斜面に継ぎ目を作らない', async ({ page }) => {
	const pixels = await render(page, { dx: 5, dy: 5 });
	const brightness = pixels.filter((_, i) => i % 4 === 0);
	const alpha = pixels.filter((_, i) => i % 4 === 3);
	expect(Math.max(...brightness) - Math.min(...brightness)).toBeLessThanOrEqual(1);
	expect(alpha.every((value) => value === 255)).toBe(true);
});

test('欠損した隣接タイルは片側差分で補い、中心の欠損は透明にする', async ({ page }) => {
	for (const demType of [1, 2]) {
		const pixels = await render(page, { dx: 5, missing: 'left', demType, azimuth: 270 });
		expect(pixels[0]).toBeGreaterThan(250);
		expect(pixels[3]).toBe(255);
		const preview = await render(page, { dx: 5, dy: 5, missing: 'neighbors', demType });
		const brightness = preview.filter((_, i) => i % 4 === 0);
		expect(Math.max(...brightness) - Math.min(...brightness)).toBeLessThanOrEqual(1);
		const empty = await render(page, { missing: 'center', demType });
		expect(empty.filter((_, i) => i % 4 === 3).every((value) => value === 0)).toBe(true);
	}
});

test('高緯度では東西・南北の地上解像度を同じように補正する', async ({ page }) => {
	const east = await render(page, { dx: 5, azimuth: 270, tileY: 2 ** 17 });
	const north = await render(page, { dy: 5, azimuth: 0, tileY: 2 ** 17 });
	expect(Math.abs(east[4 * 27] - north[4 * 27])).toBeLessThanOrEqual(1);
	const equator = await render(page, { dx: 5, azimuth: 270 });
	expect(east[4 * 27]).toBeLessThan(equator[4 * 27]);
});

test('低ズームでも緩斜面の光源方向による明暗差が残る', async ({ page }) => {
	for (const zoom of [0, 2, 5]) {
		const tileSize = 256;
		const terrain = { dx: 40, zoom, tileSize };
		const lit = await render(page, { ...terrain, azimuth: 270 });
		const dark = await render(page, { ...terrain, azimuth: 90 });
		const center = 4 * (tileSize * Math.floor(tileSize / 2) + Math.floor(tileSize / 2));
		expect(lit[center] - dark[center], `zoom ${zoom} の明暗差`).toBeGreaterThanOrEqual(5);
		expect(lit[center + 3]).toBe(255);
		expect(dark[center + 3]).toBe(255);
	}
});

test('低ズームの補正後も 256px と 512px タイルで同じ斜面は同じ明るさになる', async ({ page }) => {
	const small = await render(page, { dx: 40, zoom: 5, tileSize: 256 });
	const large = await render(page, { dx: 20, zoom: 5, tileSize: 512 });
	const smallCenter = 4 * (256 * 128 + 128);
	const largeCenter = 4 * (512 * 256 + 256);
	// 一方のピクセルは他方の2倍の地上幅を持つ。
	// ピクセル中心の緯度差と8bit丸めを考慮し、1階調まで許容する。
	for (let channel = 0; channel < 4; channel++) {
		expect(Math.abs(small[smallCenter + channel] - large[largeCenter + channel]))
			.toBeLessThanOrEqual(1);
	}
});

test('低ズームの平地と欠損値に補正由来の陰影を作らない', async ({ page }) => {
	for (const demType of [1, 2]) {
		const flat = await render(page, { zoom: 0, demType });
		for (let i = 0; i < flat.length; i += 4) {
			expect(Math.abs(flat[i] - 180)).toBeLessThanOrEqual(1);
			expect(flat[i + 3]).toBe(255);
		}
		const empty = await render(page, { zoom: 0, demType, missing: 'center' });
		expect(empty.filter((_, i) => i % 4 === 3).every((alpha) => alpha === 0)).toBe(true);
	}
});
