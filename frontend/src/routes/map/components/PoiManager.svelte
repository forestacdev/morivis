<script lang="ts">
	import maplibregl from 'maplibre-gl';
	import { onDestroy, onMount } from 'svelte';

	import { mapStore } from '$routes/stores/map';
	import { showPoiLayer } from '$routes/stores/layers';

	import { poiLayersIds } from '$routes/map/utils/layers/poi';
	import PoiMarker from '$routes/map/components/marker/PoiMarker.svelte';
	import type { FeatureMenuData } from '$routes/map/types';
	import { throttle } from 'es-toolkit';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { isStyleEdit } from '$routes/stores';
	import { showSearchMenu } from '$routes/stores/ui';
	import { debounce } from 'es-toolkit';
	import { ICON_IMAGE_BASE_PATH } from '$routes/constants';

	interface Props {
		map: maplibregl.Map;
		featureMenuData: FeatureMenuData | null;
		showDataEntry: GeoDataEntry | null;
		showZoneForm: boolean; // ゾーンフォームを表示するかどうか
		showSelectionMarker: boolean; // 選択マーカーを表示するかどうか
	}

	let {
		map,
		featureMenuData = $bindable(),
		showDataEntry,
		showZoneForm,
		showSelectionMarker = $bindable()
	}: Props = $props();

	interface PoiData {
		featureId: number;
		propId: string;
		coordinates: [number, number];
		properties: {
			[name: string]: any;
		};
	}

	let poiDatas = $state<PoiData[]>([]);
	let clickId = $state<number | null>(null); // クリックされたPOIのID

	const updateMarkers = () => {
		if (!map || !mapStore.isInitialized()) return;
		if (!$showPoiLayer || !mapStore.getLayer(poiLayersIds[0])) return;

		const features = map.queryRenderedFeatures({ layers: poiLayersIds });

		const featureDataArray: PoiData[] = [];

		for (let i = 0; i < features.length; i++) {
			const feature = features[i];
			const props = feature.properties;
			const propId = props._prop_id;

			// TODO: propを整理
			props.iconImage = `${ICON_IMAGE_BASE_PATH}/${propId}.webp`;

			// Point geometryかどうかをチェック
			if (feature.geometry.type !== 'Point') {
				continue;
			}

			const coords = feature.geometry.coordinates as [number, number];

			const featureId = feature.id as string;

			if (propId) {
				featureDataArray.push({
					featureId: featureId,
					propId: propId,
					coordinates: coords,
					properties: props
				});
			}
		}

		poiDatas = featureDataArray;
	};

	const updateThrottle = throttle(() => {
		updateMarkers();
	}, 500);

	const onClick = (featureId: number) => {
		const poiData = poiDatas.find((data) => data.featureId === featureId);
		if (!poiData) return;
		const { coordinates, properties } = poiData;
		featureMenuData = {
			layerId: 'fac_poi',
			featureId: featureId,
			properties: properties,
			point: coordinates
		};

		clickId = featureId;

		mapStore.panToPoi(new maplibregl.LngLat(coordinates[0], coordinates[1]));
	};

	$effect(() => {
		if (!featureMenuData) {
			clickId = null;
			console.warn('Feature menu data is null, resetting clickId.');
			// mapStore.setLayoutProperty('fac_poi', 'symbol-sort-key', 1);
		}
	});

	$effect(() => {
		if (featureMenuData && featureMenuData.layerId === 'fac_poi') {
			mapStore.setLayoutProperty('fac_poi', 'symbol-sort-key', [
				'case',
				// 特定の1つのfeature_idを最優先
				['==', ['id'], featureMenuData.featureId],
				0, // 最優先
				1 // 通常優先度
			]);

			clickId = featureMenuData.featureId;
			showSelectionMarker = false;
		} else {
			clickId = null;
			// mapStore.setLayoutProperty('fac_poi', 'symbol-sort-key', 1);
		}
	});

	onMount(() => {
		// NOTE: 初期読み込み時のエラーを防ぐため、レイヤーが読み込まれるまで待つ
		mapStore.onLoad((e) => {
			updateMarkers();
			if (!map) return;
			map.on('move', updateThrottle);
			map.on('moveend', updateMarkers);
		});
	});

	onDestroy(() => {
		if (!map) return;

		map.off('move', updateThrottle);
		map.off('moveend', updateMarkers);
	});

	// ちらつき防止
	let stablePOIData = $state<PoiData[]>([]);
	const updatePOIData = debounce((newData: PoiData[]) => {
		stablePOIData = [...newData];
	}, 50);

	// poiDatasの変更を監視してdebounced更新
	$effect(() => {
		updatePOIData(poiDatas);
	});

	let shouldShowPoi = $derived.by(() => {
		return (
			$showPoiLayer &&
			!showDataEntry &&
			!showZoneForm &&
			!$isStyleEdit &&
			!$showSearchMenu &&
			poiDatas.length > 0
		);
	});
</script>

{#if shouldShowPoi}
	{#each stablePOIData as poiData (poiData.propId)}
		<PoiMarker
			{map}
			lngLat={new maplibregl.LngLat(poiData.coordinates[0], poiData.coordinates[1])}
			properties={poiData.properties}
			featureId={poiData.featureId}
			onClick={(featureId) => onClick(featureId)}
			{clickId}
		/>
	{/each}
{/if}

<style>
</style>
