import { resolveStaticAssetPath } from '$routes/map/utils/platform/asset-path';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { describe, expect, it, vi } from 'vitest';
import { testDracoMesh, testDracoPoints } from './__fixtures__/draco';
import { createTilesDracoLoader } from './draco-loader';

// 配布する実デコーダーを実行する。WASM版とJSフォールバック版の両方を確認する。
describe.each(['wasm', 'js'])('3D Tiles Dracoデコーダー (%s)', (type) => {
	it('点群とメッシュをどちらも復号し、頂点座標を保持する', async () => {
		const setDecoderPath = vi.spyOn(DRACOLoader.prototype, 'setDecoderPath');
		const loader = createTilesDracoLoader();
		const [decoderPath] = setDecoderPath.mock.calls[0];
		setDecoderPath.mockRestore();
		const assetPath = decoderPath.slice(resolveStaticAssetPath('/').length);
		const directory = new URL(`../../../../../static/${assetPath}`, import.meta.url);
		const source = await readFile(
			new URL(type === 'wasm' ? 'draco_wasm_wrapper.js' : 'draco_decoder.js', directory),
			'utf8'
		);
		const wasmBinary = type === 'wasm'
			? await readFile(new URL('draco_decoder.wasm', directory))
			: undefined;
		// Emscriptenのブラウザ向けUMDは型定義を持たないため、VM内でAPIを使用する。
		const results = await runInNewContext(
			`${source}
			(async () => {
				const draco = await DracoDecoderModule({ wasmBinary });
				return inputs.map(({ bytes, mesh }) => {
					const decoder = new draco.Decoder();
					const geometry = mesh ? new draco.Mesh() : new draco.PointCloud();
					const values = new draco.DracoFloat32Array();
					try {
						const status = mesh
							? decoder.DecodeArrayToMesh(bytes, bytes.length, geometry)
							: decoder.DecodeArrayToPointCloud(bytes, bytes.length, geometry);
						if (!status.ok()) throw new Error(status.error_msg());
						const attribute = decoder.GetAttributeByUniqueId(geometry, 0);
						decoder.GetAttributeFloatForAllPoints(geometry, attribute, values);
						const positions = Array.from({ length: geometry.num_points() }, (_, i) =>
							[0, 1, 2].map(axis => values.GetValue(i * 3 + axis)));
						return { positions, faces: mesh ? geometry.num_faces() : null };
					} finally {
						[values, geometry, decoder].forEach(object => draco.destroy(object));
					}
				});
			})()
		`,
			{
				wasmBinary,
				inputs: [testDracoPoints, testDracoMesh].map((data, i) => ({
					bytes: new Uint8Array(Buffer.from(data, 'base64')),
					mesh: i === 1
				}))
			}
		) as { positions: number[][]; faces: number | null; }[];
		for (const result of results) {
			expect(result.positions.sort()).toEqual([[0, 0, 0], [0, 1, 0], [1, 0, 0]]);
		}
		expect(results.map((result) => result.faces)).toEqual([null, 1]);
		loader.dispose();
	});
});
