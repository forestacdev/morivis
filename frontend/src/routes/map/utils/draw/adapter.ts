import type { FilterSpecification, LayerSpecification, Map } from '$routes/map/utils/maplibre';
import type { GeoJSONStoreFeatures, TerraDrawChanges, TerraDrawStylingFunction } from 'terra-draw';
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter';
import { drawFeatureKey } from '../layers/draw';
import { DRAW_RUNTIME_PREFIX } from './style';

const isHandle = (feature: GeoJSONStoreFeatures): boolean =>
	['selectionPoint', 'midPoint', 'closingPoint', 'snappingPoint', 'coordinatePoint']
		.some(key => feature.properties[key] === true);

/** Terra Drawの入力・スタイル計算を保ち、地物ごとの描画順だけを差し替える。 */
export class OrderedDrawAdapter extends TerraDrawMapLibreGLAdapter<Map> {
	private readonly drawMap: Map;
	private readonly featureOrder: Set<string | number>;
	private featureLayers: string[] = [];
	private pendingFrame: number | undefined;

	constructor(map: Map, ids: (string | number)[]) {
		super({ map, prefixId: DRAW_RUNTIME_PREFIX });
		this.drawMap = map;
		this.featureOrder = new Set(ids);
	}

	override render = (changes: TerraDrawChanges, styling: TerraDrawStylingFunction): void => {
		super.render(changes, styling);
		const features = [...changes.created, ...changes.updated, ...changes.unchanged];
		const shapes = new globalThis.Map(
			features.filter(feature => !isHandle(feature)).map(feature => [feature.id!, feature])
		);
		changes.deletedIds.forEach(id => this.featureOrder.delete(id));
		shapes.forEach((_, id) => this.featureOrder.add(id));
		if (this.pendingFrame !== undefined) cancelAnimationFrame(this.pendingFrame);
		// 標準adapterがsourceとスタイル属性を更新した後、同じフレーム内で反映する。
		this.pendingFrame = requestAnimationFrame(() => {
			this.pendingFrame = undefined;
			if (!this._currentModeCallbacks) return;
			const templates = this.drawMap.getStyle().layers.filter(layer =>
				layer.id.startsWith(`${DRAW_RUNTIME_PREFIX}-`)
				&& !layer.id.startsWith(`${DRAW_RUNTIME_PREFIX}-feature-`)
			);
			const anchor = templates[0]?.id;
			if (!anchor) return;
			const handleIds = features.filter(isHandle).map(feature => feature.id!);
			const handleFilter: FilterSpecification = ['in', ['id'], ['literal', handleIds]];
			// 種類別レイヤーは編集ハンドル専用にし、地物より上に残す。
			for (const template of templates) {
				this.drawMap.setFilter(
					template.id,
					template.type === 'symbol'
						? ['all', handleFilter, ['has', 'markerId']]
						: handleFilter
				);
			}
			const nextLayers: LayerSpecification[] = [];
			for (const id of this.featureOrder) {
				const feature = shapes.get(id);
				if (!feature) continue;
				const source = `${DRAW_RUNTIME_PREFIX}-${feature.geometry.type.toLowerCase()}`;
				for (const template of templates) {
					if (
						!('source' in template) || template.source !== source
						|| !['circle', 'line', 'fill'].includes(template.type)
					) continue;
					// 面の塗りと輪郭も、一地物のまとまりとして隣接させる。
					nextLayers.push({
						...template,
						id: `${DRAW_RUNTIME_PREFIX}-feature-${drawFeatureKey(id)}-${template.type}`,
						filter: ['==', ['id'], id]
					});
				}
			}
			const nextIds = nextLayers.map(layer => layer.id);
			const nextIdSet = new Set(nextIds);
			for (const id of this.featureLayers) {
				if (!nextIdSet.has(id) && this.drawMap.getLayer(id)) this.drawMap.removeLayer(id);
			}
			for (const layer of nextLayers) {
				if (!this.drawMap.getLayer(layer.id)) this.drawMap.addLayer(layer, anchor);
			}
			// 頂点移動や色変更ではレイヤーを移動しない。
			if (nextIds.some((id, index) => id !== this.featureLayers[index])) {
				for (const id of nextIds) this.drawMap.moveLayer(id, anchor);
			}
			this.featureLayers = nextIds;
		});
	};

	private clearFeatureLayers = (): void => {
		if (this.pendingFrame !== undefined) cancelAnimationFrame(this.pendingFrame);
		this.pendingFrame = undefined;
		for (const id of this.featureLayers) {
			if (this.drawMap.getLayer(id)) this.drawMap.removeLayer(id);
		}
		this.featureLayers = [];
		this.featureOrder.clear();
	};

	override clear = (): void => {
		super.clear();
		this.clearFeatureLayers();
	};

	override unregister = (): void => {
		// sourceを標準adapterが削除する前に、それを参照する地物レイヤーを外す。
		this.clearFeatureLayers();
		super.unregister();
	};
}
