<script lang="ts">
	import { debounce } from 'es-toolkit';
	import type { GeoJSON } from 'geojson';
	import maplibregl from 'maplibre-gl';
	import type {
		StyleSpecification,
		MapGeoJSONFeature,
		SourceSpecification,
		LayerSpecification,
		TerrainSpecification,
		Marker,
		Popup
	} from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { useGsiTerrainSource } from 'maplibre-gl-gsi-terrain';
	import { mount, onMount } from 'svelte';

	import LayerMenu from '$map/components/LayerMenu.svelte';
	import LayerOptionMenu from '$map/components/LayerOptionMenu.svelte';
	import Menu from '$map/components/Menu.svelte';
	import TablePopup from '$map/components/popup/TablePopup.svelte';
	import { geoDataEntry } from '$map/data';
	import type { GeoDataEntry } from '$map/data/types';
	import Draggable from '$map/debug/Draggable.svelte';
	import GuiControl from '$map/debug/GuiControl.svelte';
	import JsonEditor from '$map/debug/JsonEditor.svelte';
	import { debugJson } from '$map/debug/store';
	import { mapStore } from '$map/store/map';
	import { createLayersItems } from '$routes/map/layers';
	import { createSourcesItems } from '$routes/map/sources';
	import {
		addedLayerIds,
		showLayerOptionId,
		clickableLayerIds,
		DEBUG_MODE,
		selectedHighlightData
	} from '$routes/map/store';

	const gsiTerrainSource = useGsiTerrainSource(maplibregl.addProtocol);
	let showJsonEditor = $state<{
		value: boolean;
	}>({ value: false });
	let tempLayerEntries = $state<GeoDataEntry[]>([]); // 一時レイヤーデータ
	let layerEntries = $state<GeoDataEntry[]>([]); // レイヤーデータ

	let mapContainer = $state<HTMLDivElement | null>(null); // Mapコンテナ
	let layerToEdit = $state<GeoDataEntry | undefined>(undefined); // 編集中のレイヤー
	let maplibrePopup = $state<Popup | null>(null); // ポップアップ

	// mapStyleの作成
	const createMapStyle = async (_dataEntries: GeoDataEntry[]): Promise<StyleSpecification> => {
		// ソースとレイヤーの作成
		const sources = await createSourcesItems(_dataEntries);
		const layers = await createLayersItems(_dataEntries);

		const terrain = mapStore.getTerrain();

		const mapStyle = {
			version: 8,
			glyphs: './font/{fontstack}/{range}.pbf', // TODO; フォントの検討
			sources: {
				terrain: gsiTerrainSource,
				...sources
			},
			layers: [...layers],
			terrain: terrain ? terrain : undefined
		};

		// NOTE:debug
		if (import.meta.env.DEV) debugJson.set(mapStyle);

		return mapStyle as StyleSpecification;
	};

	// レイヤーの追加
	addedLayerIds.subscribe((ids) => {
		if (import.meta.env.DEV) {
			const debugEntry = geoDataEntry.filter((entry) => entry.debug);
			if (debugEntry.length > 0) {
				debugEntry.forEach((entry) => {
					console.warn('デバッグデータのみ追加します。', entry.id);
				});
				layerEntries = [...debugEntry, ...tempLayerEntries];
				return;
			}
		}

		const filteredDataEntry = [...geoDataEntry, ...tempLayerEntries].filter((entry) =>
			ids.includes(entry.id)
		);

		// idsの順番に並び替え
		layerEntries = filteredDataEntry.sort((a, b) => {
			return ids.indexOf(a.id) - ids.indexOf(b.id);
		});
	});

	// 編集中のレイヤーの取得
	showLayerOptionId.subscribe((id) => {
		if (!id) {
			layerToEdit = undefined;
			return;
		} else {
			layerToEdit = layerEntries.find((entry) => entry.id === id);
		}
	});

	// 初期描画時
	onMount(async () => {
		if (!layerEntries) return;
		const mapStyle = await createMapStyle(layerEntries);
		if (!mapStyle || !mapContainer) return;
		mapStore.init(mapContainer, mapStyle as StyleSpecification);
	});

	const setStyleDebounce = debounce(async (entries: GeoDataEntry[]) => {
		const mapStyle = await createMapStyle(entries as GeoDataEntry[]);
		mapStore.setStyle(mapStyle);
	}, 100);

	$effect(() => {
		const currentEntries = $state.snapshot(layerEntries);
		setStyleDebounce(currentEntries as GeoDataEntry[]);
	});

	selectedHighlightData.subscribe((data) => {
		setStyleDebounce(layerEntries as GeoDataEntry[]);
	});

	// ポップアップの作成
	const generatePopup = (_feature: MapGeoJSONFeature, lngLat: LngLat) => {
		const popupContainer = document.createElement('div');
		mount(TablePopup, {
			target: popupContainer,
			props: {
				feature: _feature
			}
		});

		// const geometry = _feature.geometry as GeoJSON.Geometry;

		// console.log('geometry', geometry);
		if (maplibrePopup) {
			maplibrePopup.remove();
		}

		maplibrePopup = new maplibregl.Popup({
			closeButton: false,
			maxWidth: 'none',
			anchor: 'bottom'
		})
			.setLngLat(lngLat as [number, number])
			.setDOMContent(popupContainer)
			.addTo(mapStore.getMap() as maplibregl.Map);
	};

	// 地図のクリックイベント
	mapStore.onClick((e) => {
		// console.log('click', e);
		if (!e) return;
		const features = mapStore.queryRenderedFeatures(e.point, {
			layers: $clickableLayerIds
		});
		if (!features || features?.length === 0) return;

		const feature = features[0];

		const lngLat = e.lngLat;

		generatePopup(feature, lngLat);
		const layerId = feature.layer.id;
		const featureId = feature.id;

		const entry = layerEntries.find((entry) => entry.id === layerId);

		if (!entry || !featureId) return;

		$selectedHighlightData = {
			layerData: entry,
			featureId
		};
	});

	mapStore.onSetStyle((e) => {});

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

<!-- <Menu /> -->

<div class="relative h-full w-full">
	<LayerMenu bind:layerEntries />
	<LayerOptionMenu bind:layerToEdit bind:tempLayerEntries />
	<div bind:this={mapContainer} class="h-full w-full flex-grow"></div>
</div>
{#if $DEBUG_MODE}
	{#if showJsonEditor.value}
		<Draggable left={0} top={0}>
			<JsonEditor map={mapStore.getMap()} />
		</Draggable>
	{/if}

	<GuiControl map={mapStore.getMap()} {showJsonEditor} />
{/if}

<style>
</style>
