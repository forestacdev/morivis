import { createGlbEntry } from '$routes/map/data/entries/model';
import { GeojsonCache } from '$routes/map/utils/cache/geojson-cache';
import { createSymbolLayer } from '$routes/map/utils/layers/vector/label';
import { createCircleLayer } from '$routes/map/utils/layers/vector/point';
import { createFillLayer, createOutLineLayer } from '$routes/map/utils/layers/vector/polygon';
import { buildMercatorModelMatrix } from '$routes/map/utils/three/mercator-model-matrix';
import { Vector3 } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import {
	createMcaRegionGridController,
	createMcaRegionGridData,
	createMcaRegionGridEntry,
	finishMcaPlacementGrid
} from './region-grid';

const modelFixture = (x = 0, z = 0, id = 'test-model') => {
	const model = createGlbEntry(
		'test-region',
		'blob:test-region',
		{ lng: 10, lat: 20, altitude: 0 },
		'gltf',
		undefined,
		undefined,
		{
			sourceUnit: 'minecraft-block',
			minecraftRegion: { x, z }
		}
	);
	model.id = id;
	model.style.minecraftGrid = { visible: true, labels: true };
	return model;
};
afterEach(() => GeojsonCache.clear());

describe('MCAリージョングリッド', () => {
	it('専用モードの原点を、グリッド非表示でもポイントとラベルで表示する', () => {
		const controller = createMcaRegionGridController();
		const draft = modelFixture(-2, 3);
		draft.style.minecraftGrid = { visible: false, labels: false };
		const [origin] = controller.sync([draft], draft);
		expect(origin.format.geometryType).toBe('Point');
		expect(GeojsonCache.get(origin.id)?.features[0].geometry).toEqual({
			type: 'Point',
			coordinates: [10, 20]
		});
		expect(origin.style.type).toBe('circle');
		if (origin.style.type !== 'circle') throw new Error('原点はポイントレイヤー');
		const layer = { id: origin.id, source: `${origin.id}_source`, minzoom: 0, maxzoom: 24 };
		expect(createCircleLayer(layer, origin.style).paint?.['circle-radius']).toBe(7);
		expect(origin.style.labels.show).toBe(true);
		expect(
			createSymbolLayer(layer, origin.style, origin.properties.fields).layout
				?.['text-allow-overlap']
		).toBe(true);
		expect(origin.interaction.clickable).toBe(false);
	});

	it('原点はリージョン位置・縮尺・回転に左右されず、入力座標に追従する', () => {
		const controller = createMcaRegionGridController();
		const draft = modelFixture(3, -2);
		draft.style.minecraftGrid!.visible = false;
		const [origin] = controller.sync([draft], draft);
		draft.style.transform = {
			...draft.style.transform,
			lng: 12,
			lat: 21,
			scale: 3,
			rotationZ: 45
		};
		const [updated] = controller.sync([draft], draft);
		expect(updated.id).toBe(origin.id);
		expect(GeojsonCache.get(origin.id)?.features[0].geometry).toEqual({
			type: 'Point',
			coordinates: [12, 21]
		});
	});

	it('専用モード終了時は原点を削除し、グリッドだけの表示では原点を残さない', () => {
		const controller = createMcaRegionGridController();
		const draft = modelFixture();
		const entries = controller.sync([draft], draft);
		const origin = entries.find((entry) => entry.format.geometryType === 'Point')!;
		expect(GeojsonCache.has(origin.id)).toBe(true);
		expect(controller.sync([draft]).map((entry) => entry.format.geometryType)).toEqual([
			'Polygon'
		]);
		expect(GeojsonCache.has(origin.id)).toBe(false);
		controller.sync([draft], draft);
		controller.clear();
		expect(GeojsonCache.has(origin.id)).toBe(false);
	});

	it('不正な原点やMinecraft以外の仮配置ではポイントを生成しない', () => {
		const controller = createMcaRegionGridController();
		const draft = modelFixture();
		draft.style.transform.lng = Number.NaN;
		expect(controller.sync([draft], draft)).toEqual([]);
		draft.style.transform.lng = 10;
		delete draft.format.minecraftRegion;
		expect(controller.sync([draft], draft)).toEqual([]);
	});

	it('位置合わせ完了でグリッドとラベルのentry・キャッシュを除き、再表示できる', () => {
		const controller = createMcaRegionGridController();
		const draft = modelFixture();
		const [guide] = controller.sync([draft]);
		expect(guide.style.labels.show).toBe(true);
		expect(GeojsonCache.has(guide.id)).toBe(true);
		const confirmed = { ...draft, style: finishMcaPlacementGrid(draft.style) };
		expect(confirmed.style.transform).toEqual(draft.style.transform);
		expect(draft.style.minecraftGrid?.visible).toBe(true);
		expect(controller.sync([confirmed])).toEqual([]);
		expect(GeojsonCache.has(guide.id)).toBe(false);
		confirmed.style.minecraftGrid!.visible = true;
		expect(controller.sync([confirmed])).toHaveLength(1);
	});

	it('未設定の確定レイヤーにはガイドを出さず、再配置キャンセルで元に戻す', () => {
		const controller = createMcaRegionGridController();
		const original = modelFixture();
		delete original.style.minecraftGrid;
		expect(controller.sync([original])).toEqual([]);
		const draft = {
			...original,
			style: { ...original.style, minecraftGrid: { visible: true, labels: true } }
		};
		const [guide] = controller.sync([original, draft]);
		expect(GeojsonCache.has(guide.id)).toBe(true);
		expect(controller.sync([original])).toEqual([]);
		expect(GeojsonCache.has(guide.id)).toBe(false);
	});

	it('負の座標を含む3×3を閉じたポリゴンで生成し、ファイル名でラベル付けする', () => {
		const data = createMcaRegionGridData(modelFixture(-1, 2));
		expect(data.features).toHaveLength(9);
		expect(data.features.map((feature) => feature.properties.name)).toContain('r.-2.1.mca');
		const current = data.features.filter((feature) => feature.properties.current);
		expect(current).toHaveLength(1);
		expect(current[0].properties.name).toBe('r.-1.2.mca');
		for (const feature of data.features) {
			const ring = feature.geometry.coordinates[0];
			expect(ring).toHaveLength(5);
			expect(ring[0]).toEqual(ring[4]);
		}
		const left = data.features.find((feature) => feature.properties.name === 'r.-2.2.mca')!;
		expect(left.geometry.coordinates[0][2]).toEqual(current[0].geometry.coordinates[0][1]);
		expect(left.geometry.coordinates[0][3]).toEqual(current[0].geometry.coordinates[0][0]);
	});

	it.each([0.1, 1, 10])('1ブロック=%smの地形描画行列に境界が一致する', (meters) => {
		const model = modelFixture(-1, 2);
		model.style.transform.scale = meters;
		const data = createMcaRegionGridData(model);
		const current = data.features.find((feature) => feature.properties.current)!;
		const expected = new Vector3(-512, 0, 1024).applyMatrix4(
			buildMercatorModelMatrix(model.style.transform, false)
		);
		expect(current.geometry.coordinates[0][0][0]).toBeCloseTo(expected.x * 360 - 180, 12);
		expect(current.geometry.coordinates[0][0][1]).toBeCloseTo(
			Math.atan(Math.sinh(Math.PI * (1 - 2 * expected.y))) * 180 / Math.PI,
			12
		);
		const width = current.geometry.coordinates[0][3][0] - current.geometry.coordinates[0][0][0];
		expect(width / 360 * 40075016.68557849 * Math.cos(20 * Math.PI / 180)).toBeCloseTo(
			512 * meters,
			6
		);
	});

	it('原点を移すとグリッドも移り、部分的な地形boundsに区画幅を縮めない', () => {
		const model = modelFixture();
		model.format.localBounds = [1, 2, 3, 2, 3, 4];
		const before = createMcaRegionGridData(model).features[4].geometry.coordinates[0];
		model.style.transform.lng += 2;
		const after = createMcaRegionGridData(model).features[4].geometry.coordinates[0];
		expect(after[0][0] - before[0][0]).toBeCloseTo(2, 10);
		expect(after[3][0] - after[0][0]).toBeCloseTo(before[3][0] - before[0][0], 10);
	});

	it('不正な配置とMinecraft以外のモデルはグリッドを生成しない', () => {
		const model = modelFixture();
		model.style.transform.scale = Number.NaN;
		expect(createMcaRegionGridData(model).features).toHaveLength(0);
		delete model.format.minecraftRegion;
		expect(createMcaRegionGridController().sync([model])).toEqual([]);
	});

	it('塗り・境界・ラベルを既存のベクタースタイルへ正規化する', () => {
		const model = modelFixture();
		const entry = createMcaRegionGridEntry(model, createMcaRegionGridData(model));
		const layer = { id: entry.id, source: `${entry.id}_source`, minzoom: 0, maxzoom: 24 };
		expect(createFillLayer(layer, entry.style).paint?.['fill-opacity']).toEqual([
			'case',
			['get', 'current'],
			0.16,
			0.04
		]);
		expect(createOutLineLayer(layer, entry.style).paint?.['line-opacity']).toBe(1);
		const label = createSymbolLayer(layer, entry.style, entry.properties.fields);
		expect(JSON.stringify(label.layout?.['text-field'])).toContain('name');
		expect(label.filter).toEqual(['==', ['get', 'labelVisible'], true]);
		expect(entry.interaction.clickable).toBe(false);
	});

	it('同じワールドの隣接リージョンは重複区画を統合する', () => {
		const controller = createMcaRegionGridController();
		const a = modelFixture(0, 0, 'test-a');
		const b = modelFixture(1, 0, 'test-b');
		const entries = controller.sync([a, b]);
		expect(entries).toHaveLength(1);
		const data = GeojsonCache.get(entries[0].id)!;
		expect(data.features).toHaveLength(12);
		expect(data.features.filter((feature) => feature.properties.current)).toHaveLength(2);
		b.style.transform.lng += 1;
		expect(controller.sync([a, b])).toHaveLength(2);
		controller.clear();
	});

	it('有効な仮配置を優先し、非表示・削除・終了で派生データを解放する', () => {
		const controller = createMcaRegionGridController();
		const model = modelFixture();
		const draft = structuredClone(model);
		draft.style.transform.lng += 1;
		const [entry] = controller.sync([model, draft]);
		expect(GeojsonCache.get(entry.id)).toEqual(createMcaRegionGridData(draft));
		model.style.minecraftGrid = { visible: true, labels: false };
		expect(controller.sync([model])[0].style.labels.show).toBe(false);
		model.style.minecraftGrid.visible = false;
		expect(controller.sync([model])).toHaveLength(0);
		expect(GeojsonCache.has(entry.id)).toBe(false);
		model.style.minecraftGrid.visible = true;
		model.style.visible = false;
		expect(controller.sync([model])).toHaveLength(0);
		model.style.visible = true;
		controller.sync([model]);
		controller.sync([]);
		expect(GeojsonCache.has(entry.id)).toBe(false);
		controller.sync([model]);
		controller.clear();
		expect(GeojsonCache.has(entry.id)).toBe(false);
	});
});
