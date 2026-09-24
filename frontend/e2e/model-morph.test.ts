import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

// 標準材質ではなく、morivisがモデル本体に使うGLSLをそのままGPUで検証する。
const source = readFileSync(
	new URL('../src/routes/map/utils/three/layer-manager.ts', import.meta.url),
	'utf8'
);
const materialSource = source.slice(
	source.indexOf('private createShaderMaterial ='),
	source.indexOf('private getPartPaletteColors =')
);
const vertexShader = materialSource.match(/vertexShader: `([\s\S]*?)`/)?.[1];
const fragmentShader = materialSource.match(/fragmentShader: `([\s\S]*?)`/)?.[1];
if (!vertexShader || !fragmentShader) throw new Error('Model shader source not found');

test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });

for (const skinned of [false, true]) {
	for (const morphs of [false, true]) {
		test(`モデル本体のモーフ描画・リセット: skin=${skinned}, morph=${morphs}`, async ({ page }) => {
			await page.route('https://test.invalid/**', async route => {
				const name = new URL(route.request().url()).pathname.slice(1);
				if (name === 'three.module.js' || name === 'three.core.js') {
					await route.fulfill({
						contentType: 'text/javascript',
						body: readFileSync(
							new URL(`../node_modules/three/build/${name}`, import.meta.url)
						)
					});
				} else {
					await route.fulfill({
						contentType: 'text/html',
						body: '<html><body></body></html>'
					});
				}
			});
			await page.goto('https://test.invalid/');
			const result = await page.evaluate(
				async ({ vertexShader, fragmentShader, skinned, morphs }) => {
					const moduleUrl = 'https://test.invalid/three.module.js';
					const THREE = await import(/* @vite-ignore */ moduleUrl);
					const renderer = new THREE.WebGLRenderer({
						antialias: false,
						preserveDrawingBuffer: true
					});
					renderer.setSize(64, 64);
					renderer.setClearColor(0x000000, 1);
					const errors: string[] = [];
					renderer.debug.onShaderError = () => errors.push('Shader compilation failed');
					const geometry = new THREE.BufferGeometry();
					geometry.setAttribute(
						'position',
						new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3)
					);
					geometry.setAttribute(
						'normal',
						new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3)
					);
					geometry.setAttribute(
						'uv',
						new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2)
					);
					geometry.setAttribute(
						'morivisPartColorIndex',
						new THREE.Float32BufferAttribute([0, 0, 0], 1)
					);
					if (morphs) {
						geometry.morphTargetsRelative = true;
						geometry.morphAttributes.position = [
							new THREE.Float32BufferAttribute([1, 0, 0, 1, 0, 0, 1, 0, 0], 3)
						];
						geometry.morphAttributes.normal = [
							new THREE.Float32BufferAttribute([1, 0, -1, 1, 0, -1, 1, 0, -1], 3)
						];
					}
					const material = new THREE.ShaderMaterial({
						vertexShader,
						fragmentShader,
						side: THREE.DoubleSide,
						uniforms: {
							uMap: { value: null },
							uColorRamp: { value: null },
							uPartColorPalette: { value: null },
							uBaseColor: { value: new THREE.Color(0xffffff) },
							uOpacity: { value: 1 },
							uAmbientStrength: { value: 0.4 },
							uShadeStrength: { value: 0.6 },
							uLightDirection: { value: new THREE.Vector3(0, 0, 1) },
							uUseMap: { value: false },
							uUseHeightColorRamp: { value: false },
							uUseObjectPartColor: { value: false },
							uUsePartColors: { value: false },
							uPartColorPaletteSize: { value: 1 },
							uHeightRampSourceMax: { value: 1 },
							uHeightRampMax: { value: 1 }
						}
					});
					const mesh = skinned
						? new THREE.SkinnedMesh(geometry, material)
						: new THREE.Mesh(geometry, material);
					if (skinned) {
						geometry.setAttribute(
							'skinIndex',
							new THREE.Uint16BufferAttribute(new Uint16Array(12), 4)
						);
						geometry.setAttribute(
							'skinWeight',
							new THREE.Float32BufferAttribute(
								[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
								4
							)
						);
						const bone = new THREE.Bone();
						mesh.add(bone);
						mesh.bind(new THREE.Skeleton([bone]));
					}
					const scene = new THREE.Scene();
					scene.add(mesh);
					const camera = new THREE.OrthographicCamera(-1, 3, 3, -1, 0.1, 10);
					camera.position.z = 5;
					const render = (weight: number) => {
						if (morphs) mesh.morphTargetInfluences[0] = weight;
						renderer.render(scene, camera);
						const gl = renderer.getContext();
						const pixels = new Uint8Array(64 * 64 * 4);
						gl.readPixels(0, 0, 64, 64, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
						const error = gl.getError();
						if (error !== gl.NO_ERROR) errors.push(`WebGL error: ${error}`);
						let count = 0, sumX = 0, sumBrightness = 0;
						for (let i = 0; i < 64 * 64; i++) {
							if (pixels[i * 4] > 0) {
								count++;
								sumX += i % 64;
								sumBrightness += pixels[i * 4];
							}
						}
						return { count, x: sumX / count, brightness: sumBrightness / count };
					};
					const initial = render(0), changed = render(1), reset = render(0);
					geometry.dispose();
					material.dispose();
					renderer.dispose();
					return { initial, changed, reset, errors };
				},
				{ vertexShader, fragmentShader, skinned, morphs }
			);
			expect(result.errors).toEqual([]);
			expect(result.initial.count).toBeGreaterThan(50);
			expect(result.changed.count).toBe(result.initial.count);
			expect(result.changed.x - result.initial.x).toBeCloseTo(morphs ? 16 : 0, 1);
			if (morphs) {
				expect(result.changed.brightness).toBeLessThan(result.initial.brightness - 30);
			}
			expect(result.reset).toEqual(result.initial);
		});
	}
}
