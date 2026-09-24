import { createGlbEntry } from '$routes/map/data/entries/model';
import { buildMercatorModelMatrix } from '$routes/map/utils/three/mercator-model-matrix';
import { getModelGeoBoundsFromLocalBounds } from '$routes/map/utils/three/model-geo-bounds';
import { getModelUnitMeters, normalizeModelUnitMeters } from '$routes/map/utils/three/model-scale';
import { getUploadedMinecraftRegion } from '$routes/map/utils/three/model-source-unit';
import { finalizeRuntimeModelObject } from '$routes/map/utils/three/runtime-model-finalize';
import { Box3, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { mcaToGlb } from '.';
import { chunkFixture, regionFixture } from './__fixtures__/region';
import { createMcaModelFile } from './model-file';
import {
	getInitialMcaWorldPlacement,
	parseMcaRegionFileName,
	validateMcaWorldPlacement
} from './world-placement';

describe('MCAのワールド原点配置', () => {
	it.each([
		['r.0.0.mca', { x: 0, z: 0 }],
		['r.-2.3.MCA', { x: -2, z: 3 }],
		['r.4.-5.mca', { x: 4, z: -5 }]
	])('標準ファイル名%sから符号を保って位置を読む', (name, expected) => {
		expect(parseMcaRegionFileName(name as string)).toEqual(expected);
	});

	it.each([
		'test-region.mca',
		'r.1.2.mca.bak',
		'r.1.5.2.mca',
		'r.1e3.0.mca',
		'r.9007199254740991.0.mca'
	])('不正なファイル名%sを原点扱いにしない', (name) => {
		expect(parseMcaRegionFileName(name)).toBeNull();
	});

	it.each([
		{ lng: Number.NaN, lat: 0, metersPerBlock: 1 },
		{ lng: 181, lat: 0, metersPerBlock: 1 },
		{ lng: 0, lat: 90, metersPerBlock: 1 },
		{ lng: 0, lat: -86, metersPerBlock: 1 },
		{ lng: 0, lat: 0, metersPerBlock: 0 },
		{ lng: 0, lat: 0, metersPerBlock: -1 },
		{ lng: 0, lat: 0, metersPerBlock: Infinity }
	])('無効な原点または縮尺を拒否する %j', (placement) => {
		expect(validateMcaWorldPlacement(placement)).not.toBeNull();
	});

	it('ファイル名と中身が異なる場合に誤配置せずエラーにする', async () => {
		await expect(mcaToGlb(regionFixture(), { region: { x: 1, z: 0 } })).rejects.toThrow(
			'ファイル名'
		);
		await expect(mcaToGlb(regionFixture(), { region: { x: 0.5, z: 0 } })).rejects.toThrow(
			'リージョン座標'
		);
		expect(() => createMcaModelFile(new ArrayBuffer(0), 'test-region.mca')).toThrow(
			'r.x.z.mca'
		);
	});

	it('初回の仮配置は地図中心・1mで、次回は確定した設定のコピーから始める', () => {
		expect(getInitialMcaWorldPlacement({ lng: 370, lat: 20 }, null)).toEqual({
			lng: 10,
			lat: 20,
			metersPerBlock: 1
		});
		const previous = { lng: -10, lat: -20, metersPerBlock: 0.25 };
		const draft = getInitialMcaWorldPlacement({ lng: 0, lat: 0 }, previous);
		expect(draft).toEqual(previous);
		draft.metersPerBlock = 10;
		draft.lng = 1;
		expect(previous).toEqual({ lng: -10, lat: -20, metersPerBlock: 0.25 });
	});

	it('部分読み込みでも負のワールド座標・Y=0基準をGLBとruntimeで保持する', async () => {
		const result = await mcaToGlb(
			regionFixture([
				{ nbt: chunkFixture({ x: -32, z: 64, y: -4 }), index: 0 },
				{ nbt: chunkFixture({ x: -1, z: 67, y: -2 }), index: 127 }
			]),
			{ region: { x: -1, z: 2 }, minChunkX: 31, minChunkZ: 3, maxChunkZ: 3 }
		);
		const { scene } = await new GLTFLoader().parseAsync(result.glb, '');
		finalizeRuntimeModelObject(scene, { formatType: 'gltf', normalizeToLocalOrigin: false });
		const box = new Box3().setFromObject(scene);
		expect(box.min.toArray()).toEqual([-16, -32, 1072]);
		expect(box.max.toArray()).toEqual([-15, -31, 1073]);
	});

	it.each([0.1, 1, 10])(
		'共通原点・1ブロック=%smでリージョン境界が一致し、倍率変更後もつながる',
		async (metersPerBlock) => {
			const placement = { lng: 10, lat: 20, metersPerBlock };
			const models = await Promise.all([-1, 0, 1].map(async (x) => {
				const result = await mcaToGlb(
					regionFixture([
						{
							nbt: chunkFixture({ x: x * 32, palette: ['minecraft:stone'] }),
							index: 0
						},
						{
							nbt: chunkFixture({ x: x * 32 + 31, palette: ['minecraft:stone'] }),
							index: 31
						}
					]),
					{ region: { x, z: 0 } }
				);
				const file = createMcaModelFile(result.glb, `r.${x}.0.mca`);
				const entry = createGlbEntry(
					'test-region',
					'blob:test-region',
					{
						lng: placement.lng,
						lat: placement.lat,
						altitude: 0,
						scale: placement.metersPerBlock
					},
					'gltf',
					undefined,
					undefined,
					{
						sourceUnit: 'minecraft-block',
						minecraftRegion: getUploadedMinecraftRegion(file),
						normalizeToLocalOrigin: false
					}
				);
				const { scene } = await new GLTFLoader().parseAsync(await file.arrayBuffer(), '');
				finalizeRuntimeModelObject(scene, {
					formatType: 'gltf',
					normalizeToLocalOrigin: entry.format.normalizeToLocalOrigin
				});
				const box = new Box3().setFromObject(scene);
				expect(getModelUnitMeters(entry.style.transform)).toBe(metersPerBlock);
				expect(JSON.parse(JSON.stringify(entry)).format.minecraftRegion).toEqual({
					x,
					z: 0
				});
				return { box, entry };
			}));
			for (const scaleFactor of [1, 2]) {
				const bounds = models.map(({ box, entry }) => {
					Object.assign(
						entry.style.transform,
						normalizeModelUnitMeters(
							metersPerBlock * scaleFactor,
							entry.style.transform.baseScale
						)
					);
					return getModelGeoBoundsFromLocalBounds([
						box.min.x,
						box.min.y,
						box.min.z,
						box.max.x,
						box.max.y,
						box.max.z
					], entry.style);
				});
				expect(bounds[0][2]).toBeCloseTo(bounds[1][0], 10);
				expect(bounds[1][2]).toBeCloseTo(bounds[2][0], 10);
				expect(bounds[1][0]).toBeCloseTo(placement.lng, 10);
				expect(bounds[1][3]).toBeCloseTo(placement.lat, 10);
				expect(bounds[1][1]).toBeLessThan(placement.lat); // +Zは南
				expect(bounds[1][2]).toBeGreaterThan(placement.lng); // +Xは東
				const matrix = buildMercatorModelMatrix(models[1].entry.style.transform, false);
				const origin = new Vector3().applyMatrix4(matrix);
				const east = new Vector3(512, 0, 0).applyMatrix4(matrix);
				const unitMeters = 40075016.68557849 * Math.cos(placement.lat * Math.PI / 180);
				expect(east.distanceTo(origin) * unitMeters).toBeCloseTo(
					512 * metersPerBlock * scaleFactor,
					6
				);
				expect(new Vector3(0, 1, 0).applyMatrix4(matrix).z).toBeGreaterThan(origin.z);
			}
		}
	);
});
