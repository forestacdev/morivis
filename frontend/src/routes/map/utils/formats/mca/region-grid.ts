import { DEFAULT_CUSTOM_META_DATA } from '$routes/map/data/entries/_meta_data';
import type { MorivisLayerEntry } from '$routes/map/data/types';
import type { MeshEntry, MeshStyle } from '$routes/map/data/types/model';
import type {
	GeoJsonMetaData,
	VectorPointEntry,
	VectorPolygonEntry
} from '$routes/map/data/types/vector';
import type { FeatureCollection } from '$routes/map/types/geojson';
import type { PolygonGeometry } from '$routes/map/types/geometry';
import type { FeatureProp } from '$routes/map/types/properties';
import { GeojsonCache } from '$routes/map/utils/cache/geojson-cache';
import { buildMercatorModelMatrix } from '$routes/map/utils/three/mercator-model-matrix';
import { getModelUnitMeters } from '$routes/map/utils/three/model-scale';
import { Vector3 } from 'three';
import { createMcaWorldOrigin } from './world-origin';
import { isMcaRegionPositionValid, validateMcaWorldPlacement } from './world-placement';

export interface McaRegionGridProperties extends FeatureProp {
	name: string;
	regionX: number;
	regionZ: number;
	current: boolean;
	labelVisible: boolean;
}

/** 位置合わせ中のガイド表示を確定レイヤーへ持ち越さない。 */
export const finishMcaPlacementGrid = (style: MeshStyle): MeshStyle => ({
	...style,
	minecraftGrid: { visible: false, labels: style.minecraftGrid?.labels ?? true }
});

/** 地形と同じモデル行列でY=0のリージョン境界を投影する。右端・下端は次区画の開始位置。 */
export const createMcaRegionGridData = (
	model: MeshEntry<MeshStyle>
): FeatureCollection<PolygonGeometry, McaRegionGridProperties> => {
	const data: FeatureCollection<PolygonGeometry, McaRegionGridProperties> = {
		type: 'FeatureCollection',
		features: []
	};
	const regions = model.format.minecraftRegions?.length
		? model.format.minecraftRegions
		: model.format.minecraftRegion
		? [model.format.minecraftRegion]
		: [];
	const transform = model.style.transform;
	if (
		!regions.length || !regions.every(isMcaRegionPositionValid) || validateMcaWorldPlacement({
			lng: transform.lng,
			lat: transform.lat,
			metersPerBlock: getModelUnitMeters(transform)
		})
	) return data;
	const matrix = buildMercatorModelMatrix(transform, false);
	const loaded = new Set(regions.map(region => `${region.x},${region.z}`));
	const cells = new Map<string, { x: number; z: number; }>();
	for (const region of regions) {
		for (let z = region.z - 1; z <= region.z + 1; z++) {
			for (let x = region.x - 1; x <= region.x + 1; x++) cells.set(`${x},${z}`, { x, z });
		}
	}
	for (const { x, z } of cells.values()) {
		const points = [[x, z], [x, z + 1], [x + 1, z + 1], [x + 1, z], [x, z]]
			.map(([blockX, blockZ]) =>
				new Vector3(blockX * 512, 0, blockZ * 512).applyMatrix4(matrix)
			);
		// 地図の投影範囲外は、極に潰れたポリゴンにせず表示対象から外す。
		if (
			points.some((point) =>
				!Number.isFinite(point.x) || !Number.isFinite(point.y) || point.y < 0
				|| point.y > 1
			)
		) continue;
		const coordinates = points.map<[number, number]>((point) => [
			point.x * 360 - 180,
			Math.atan(Math.sinh(Math.PI * (1 - 2 * point.y))) * 180 / Math.PI
		]);
		data.features.push({
			type: 'Feature',
			id: `r.${x}.${z}`,
			properties: {
				name: `r.${x}.${z}.mca`,
				regionX: x,
				regionZ: z,
				current: loaded.has(`${x},${z}`),
				labelVisible: model.style.minecraftGrid?.labels ?? true
			},
			geometry: { type: 'Polygon', coordinates: [coordinates] }
		});
	}
	return data;
};

export const createMcaRegionGridEntry = (
	model: MeshEntry<MeshStyle>,
	data: FeatureCollection<PolygonGeometry, McaRegionGridProperties>
): VectorPolygonEntry<GeoJsonMetaData> => {
	const points = data.features.flatMap((feature) => feature.geometry.coordinates[0]);
	const bounds: [number, number, number, number] = points.length
		? [
			Math.min(...points.map((point) => point[0])),
			Math.min(...points.map((point) => point[1])),
			Math.max(...points.map((point) => point[0])),
			Math.max(...points.map((point) => point[1]))
		]
		: [...model.metaData.bounds];
	return {
		id: `${model.id}_minecraft_regions`,
		type: 'vector',
		format: { type: 'geojson', geometryType: 'Polygon', url: '' },
		metaData: {
			...DEFAULT_CUSTOM_META_DATA,
			name: `${model.metaData.name} リージョングリッド`,
			bounds,
			description:
				'Minecraftのリージョン境界を示すポリゴン。ワールド内の位置とファイル名の対応を確認するために利用する。'
		},
		interaction: { clickable: false },
		properties: {
			fields: [{ key: 'name', label: 'リージョン名', type: 'string' }],
			attributeView: { popupKeys: [], titles: [] }
		},
		style: {
			type: 'fill',
			visible: true,
			opacity: 1,
			colors: {
				show: true,
				key: 'grid',
				expressions: [{
					type: 'single',
					key: 'grid',
					name: 'グリッド',
					mapping: { value: '#a6cee3', pattern: null }
				}]
			},
			outline: { show: true, color: '#0891b2', width: 1.5, lineStyle: 'solid' },
			labels: {
				show: data.features.some((feature) => feature.properties.labelVisible),
				key: 'name',
				expressions: [{ key: 'name', name: 'リージョン名' }]
			},
			default: {
				fill: {
					paint: { 'fill-opacity': ['case', ['get', 'current'], 0.16, 0.04] },
					layout: {}
				},
				symbol: {
					filter: ['==', ['get', 'labelVisible'], true],
					paint: {
						'text-color': '#164e63',
						'text-halo-color': '#ffffff',
						'text-halo-width': 2
					},
					layout: { 'text-size': 13, 'text-max-width': 20 }
				}
			}
		}
	};
};

/** 派生vector entryとデータの寿命を地形に合わせる。確定値を二重に保存しない。 */
export const createMcaRegionGridController = () => {
	const ownedIds = new Set<string>();
	const sync = (
		models: MorivisLayerEntry[],
		placementPreview: MeshEntry<MeshStyle> | null = null
	) => {
		const entries: (VectorPolygonEntry<GeoJsonMetaData> | VectorPointEntry<GeoJsonMetaData>)[] =
			[];
		const nextIds = new Set<string>();
		const groups = new Map<
			string,
			{
				model: MeshEntry<MeshStyle>;
				data: FeatureCollection<PolygonGeometry, McaRegionGridProperties>;
			}
		>();
		// 同じモデルの仮配置が後に渡された場合は、確定値より優先する。
		const effectiveModels = new Map(models.map((model) => [model.id, model]));
		for (
			const model of [...effectiveModels.values()].sort((a, b) => a.id.localeCompare(b.id))
		) {
			if (
				model.type !== 'model' || model.style.type !== 'mesh'
				|| !('minecraftRegion' in model.format) || !model.format.minecraftRegion
			) continue;
			const mesh = model as MeshEntry<MeshStyle>;
			if (
				mesh.style.visible === false || mesh.style.minecraftGrid?.visible !== true
			) continue;
			const data = createMcaRegionGridData(mesh);
			if (!data.features.length) continue;
			const t = mesh.style.transform;
			const groupKey = JSON.stringify([
				t.lng,
				t.lat,
				getModelUnitMeters(t),
				(t.baseRotationX ?? 0) + t.rotationX,
				(t.baseRotationY ?? 0) + t.rotationY,
				(t.baseRotationZ ?? 0) + t.rotationZ
			]);
			const group = groups.get(groupKey);
			if (!group) groups.set(groupKey, { model: mesh, data });
			else {
				const features = new Map(
					group.data.features.map((feature) => [feature.id, feature])
				);
				for (const feature of data.features) {
					const existing = features.get(feature.id);
					if (existing) {
						existing.properties.current ||= feature.properties.current;
						existing.properties.labelVisible ||= feature.properties.labelVisible;
					} else features.set(feature.id, feature);
				}
				group.data.features = [...features.values()];
			}
		}
		for (const group of groups.values()) {
			const entry = createMcaRegionGridEntry(group.model, group.data);
			GeojsonCache.set(entry.id, group.data);
			nextIds.add(entry.id);
			entries.push(entry);
		}
		// 原点はグリッドの表示設定に依存せず、専用モードの仮配置だけから生成する。
		const origin = placementPreview ? createMcaWorldOrigin(placementPreview) : null;
		if (origin) {
			GeojsonCache.set(origin.entry.id, origin.data);
			nextIds.add(origin.entry.id);
			entries.push(origin.entry);
		}
		for (const id of ownedIds) {
			if (!nextIds.has(id)) GeojsonCache.remove(id);
		}
		ownedIds.clear();
		for (const id of nextIds) ownedIds.add(id);
		return entries;
	};
	const clear = () => {
		for (const id of ownedIds) GeojsonCache.remove(id);
		ownedIds.clear();
	};
	return { sync, clear };
};
