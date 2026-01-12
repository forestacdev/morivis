import type { MapMouseEvent } from 'maplibre-gl';
import { mapStore } from '$routes/stores/map';

export const clickDebug = (e: MapMouseEvent) => {
	if (import.meta.env.DEV) {
		console.log('================================');
		console.log('debug:Map clicked at', e.lngLat);
		const features = mapStore.queryRenderedFeatures(e.point);

		if (features.length) {
			console.log('debug:Clicked features:', features);
			console.log('debug:Clicked prop', features[0].properties);

			const prop = features[0].properties;

			// keyを配列で取得
			const keys = Object.keys(prop);
			console.log(keys);

			const fields = keys.map((key) => {
				return {
					key: key,
					label: key
				};
			});

			// expressions配列を作成
			const expressions = keys.map((key) => {
				return {
					key: key,
					name: key
				};
			});

			console.log(fields);
			console.log(expressions);

			if (features[0].layer.id === '@tile_index_layer') {
				const xyz = {
					x: prop.x,
					y: prop.y,
					z: prop.z
				};

				console.log(xyz);

				//クリップボードにコピー
			}
		}
	}
};
