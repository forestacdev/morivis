import type { DrawGeojsonData, DrawGeojsonFeature, DrawMode } from '$routes/map/types/draw';
import type { Map } from '$routes/map/utils/maplibre';
import {
	type GeoJSONStoreFeatures,
	type HexColor,
	TerraDraw,
	TerraDrawCircleMode,
	TerraDrawFreehandMode,
	TerraDrawLineStringMode,
	TerraDrawPointMode,
	TerraDrawPolygonMode,
	TerraDrawRectangleMode,
	TerraDrawSectorMode,
	TerraDrawSelectMode
} from 'terra-draw';
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter';
import { DRAW_RUNTIME_PREFIX } from './style';

export const createDrawRuntime = (options: {
	map: Map;
	data: DrawGeojsonData;
	onchange: (data: DrawGeojsonData) => void;
	onselect: (feature: DrawGeojsonFeature | null) => void;
	onready: () => void;
}) => {
	let color: HexColor = '#ff0000';
	let selectedId: string | number | null = null;
	let disposed = false;
	const committedIds = new Set<string | number>(options.data.features.map(feature => feature.id));
	const featureColor = (feature: GeoJSONStoreFeatures): HexColor =>
		(feature.properties.color as HexColor | undefined) ?? color;
	const polygonStyles = { fillColor: featureColor, outlineColor: featureColor, fillOpacity: 0.4 };
	const editable = {
		feature: {
			draggable: true,
			coordinates: { draggable: true, deletable: true, midpoints: true }
		}
	};
	const draw = new TerraDraw({
		adapter: new TerraDrawMapLibreGLAdapter({
			map: options.map,
			prefixId: DRAW_RUNTIME_PREFIX
		}),
		modes: [
			new TerraDrawSelectMode({
				keyEvents: null,
				flags: Object.fromEntries(
					['point', 'linestring', 'polygon', 'freehand', 'circle', 'rectangle', 'sector']
						.map(mode => [mode, editable])
				),
				styles: {
					selectedPointColor: featureColor,
					selectedLineStringColor: featureColor,
					selectedPolygonColor: featureColor,
					selectedPolygonFillOpacity: 0.4
				}
			}),
			new TerraDrawPointMode({ styles: { pointColor: featureColor, pointWidth: 7 } }),
			new TerraDrawLineStringMode({
				styles: { lineStringColor: featureColor, lineStringWidth: 5 }
			}),
			new TerraDrawPolygonMode({ styles: polygonStyles }),
			new TerraDrawCircleMode({ styles: polygonStyles }),
			new TerraDrawSectorMode({ styles: polygonStyles }),
			new TerraDrawRectangleMode({ styles: polygonStyles }),
			new TerraDrawFreehandMode({ styles: polygonStyles })
		]
	});
	const publish = () => {
		if (disposed || !draw.enabled) return;
		// 確定済みのIDだけを保存し、描画途中の図形や編集ハンドルを含めない。
		const features = draw.getSnapshot().filter(feature => committedIds.has(feature.id!)).map(
			feature => {
				const { selected: _selected, ...properties } = feature.properties;
				return { ...feature, properties } as DrawGeojsonFeature;
			}
		);
		options.onchange({ type: 'FeatureCollection', features });
	};
	draw.on('finish', (id, context) => {
		if (context.action === 'draw') {
			committedIds.add(id);
			draw.updateFeatureProperties(id, {
				id,
				color,
				opacity: context.mode === 'point' || context.mode === 'linestring' ? 1 : 0.4
			});
		}
		publish();
	});
	draw.on('change', publish);
	draw.on('select', id => {
		selectedId = id;
		const feature = draw.getSnapshotFeature(id) as DrawGeojsonFeature;
		color = featureColor(feature);
		options.onselect(feature);
	});
	draw.on('deselect', () => {
		selectedId = null;
		options.onselect(null);
	});
	const start = () => {
		if (disposed || draw.enabled) return;
		draw.start();
		draw.addFeatures(options.data.features);
		draw.setMode('select');
		options.onready();
	};
	// style.load後に開いた場合も、初回ロード待ちの場合も一度だけ起動する。
	if (options.map.isStyleLoaded()) start();
	else {
		options.map.on('style.load', start);
		options.map.on('idle', start);
	}
	return {
		setMode: (mode: DrawMode) => {
			if (draw.enabled) draw.setMode(mode);
		},
		setColor: (value: string) => {
			if (!/^#[0-9a-f]{6}$/i.test(value)) return;
			color = value as HexColor;
			if (draw.enabled && selectedId !== null && draw.hasFeature(selectedId)) {
				draw.updateFeatureProperties(selectedId, { color });
			}
		},
		deleteSelected: () => {
			if (!draw.enabled || selectedId === null) return;
			const id = selectedId;
			draw.deselectFeature(id);
			draw.removeFeatures([id]);
			committedIds.delete(id);
		},
		destroy: () => {
			if (disposed) return;
			// stop()は内部データも削除するため、その前に確定済みの状態を退避する。
			publish();
			disposed = true;
			options.map.off('style.load', start);
			options.map.off('idle', start);
			if (draw.enabled) draw.stop();
		}
	};
};
