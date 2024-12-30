<script lang="ts">
	import maplibregl from 'maplibre-gl';
	import type {
		Map,
		StyleSpecification,
		SourceSpecification,
		LayerSpecification,
		TerrainSpecification,
		Marker,
		CircleLayerSpecification
	} from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';

	import { mapStore } from '$routes/map/store/map';

	const gsiTerrainSource = useGsiTerrainSource(maplibregl.addProtocol);

	let mapContainer = $state<HTMLDivElement | null>(null); // Mapコンテナ
	// mapStyleの作成
	const createMapStyle = () => {
		return mapStyle;
	};

	// 初期描画時
	onMount(() => {
		// パース対象の式

		if (!mapContainer) return;

		const mapStyle = createMapStyle();

		if (import.meta.env.DEV) console.warn('gebug:mapstyle', mapStyle);

		if (!mapStyle) return;

		mapStore.init(mapContainer, mapStyle as StyleSpecification);

		// クリックイベントの購読
		const onClick = mapStore.onClick(async (e) => {
			if (!e) return;
			const div = document.createElement('div');
			const lockOnInstance = new LockOn({
				target: div,
				props: {
					lngLat: e.lngLat
				}
			});
			lockOnInstance.$on('click', (event) => {
				console.log('click', event);
				mapStore.removeLockonMarker();
			});

			lockOnInstance.$on('scan', (e) => {
				console.log('scan', e.detail);
				// const lngLat = e.detail;
				// console.log('lngLat', lngLat);
				// const tileImage = getTileUrl(lngLat.lng, lngLat.lat, mapStore.getZoom());
				// console.log('tileImage', tileImage);
			});

			mapStore.removeLockonMarker();
			mapStore.addLockonMarker(div, e.lngLat);

			let features = mapStore.queryRenderedFeatures(e.point, {
				layers: $clickableLayerIds
			});

			// NOTE: debug
			if (import.meta.env.DEV) console.log('click', features);

			if (!features) return;
			// features = features.filter((feature) => {
			// 	return !$excludeIdsClickLayer.includes(feature.layer.id);
			// });

			if (features.length === 0) {
				selectFeatureList = [];
				feature = null;
				return;
			}

			const targetLayerData = layerDataEntries.find((entry) => entry.id === features[0].layer.id);

			type FlexibleProp = {
				[key: string]: string | number;
			};

			function convertProps(prop1: FlexibleProp, prop2: { [key: string]: string }): FlexibleProp {
				const result: FlexibleProp = {};

				for (const [key, value] of Object.entries(prop1)) {
					if (prop2.hasOwnProperty(key)) {
						result[prop2[key]] = value;
					} else {
						result[key] = value; // キーが prop2 に存在しない場合は元のキーを使用
					}
				}

				return result;
			}

			if (targetLayerData) {
				selectedhighlightData = {
					LayerData: targetLayerData,
					featureId: features[0].id
				};

				if (targetLayerData.fieldDict) {
					const dictJson = await getFieldDictJson(targetLayerData.fieldDict);

					const convertedProp = convertProps(features[0].properties, dictJson);

					features[0].properties = convertedProp;

					feature = features[0];
					return;
				}

				feature = features[0] ? features[0] : null;
				clickedLayerId = targetLayerData.id;
			}
		});

		return () => {
			onClick();
		};
	});

	// 変更を監視して地図を更新（MapMenuのベースマップとレイヤー）
	$: if (layerDataEntries && selectedhighlightData !== undefined && $addedLayerIds) {
		const mapStyle = createMapStyle();

		// mapInstance.getTerrain() ? (mapStyle.terrain = gsiTerrainSource) : null;
		mapStore.setStyle(mapStyle as StyleSpecification);
	}

	// $: if (mapInstance && selectedhighlightData) {
	// 	const mapStyle = createMapStyle();
	// 	// mapInstance.getTerrain() ? (mapStyle.terrain = gsiTerrainSource) : null;
	// 	mapInstance.setStyle(mapStyle as StyleSpecification);

	// 	// NOTE: debug
	// 	if (import.meta.env.DEV) console.log('mapstyle', mapStyle);
	// }

	$: createHighlightLayer(selectedhighlightData);

	// マップの回転
	// const setMapBearing = (e) => {
	// 	const mapBearing = e.detail;
	// 	// mapInstance?.setBearing(mapBearing);

	// 	mapInstance?.easeTo({ bearing: mapBearing, duration: 1000 });
	// };

	// // マップのズーム
	// const setMapZoom = (e) => {
	// 	const mapZoom = e.detail;
	// 	mapInstance?.easeTo({
	// 		zoom: mapZoom,
	// 		duration: 1000
	// 	});
	// };
</script>

<Side />

<LayerMenu bind:layerDataEntries {clickedLayerId} />
<SearchMenu />
<div class="relative h-full w-full">
	<div class="absolute z-0 h-full w-full">
		<div
			bind:this={mapContainer}
			class="bg-bla h-full w-full transition-all duration-200 {$isSide === 'info'
				? 'custom-brah scale-[1.05]'
				: ''}"
		></div>
	</div>
	<DataMenu bind:layerDataEntries />
</div>
<LayerOptionMenu bind:layerDataEntries bind:tempLayerEntries />
<div class="custom-css absolute right-[60px] top-2 max-h-[calc(100vh-8rem)] w-[300px]">
	<!-- {#if lockOnMarker}
		<button on:click={getElevation}>この地点の標高</button>
	{/if} -->

	<!-- <SelectPopup {selectFeatureList} on:closePopup={removeLockonMarker} /> -->
	<InfoPopup {feature} />
	<!-- <ForestPopup /> -->
</div>

<style>
</style>
