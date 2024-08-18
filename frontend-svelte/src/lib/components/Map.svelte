<script lang="ts">
	import maplibregl from 'maplibre-gl';
	import type {
		Map,
		StyleSpecification,
		SourceSpecification,
		LayerSpecification,
		TerrainSpecification,
		Marker
	} from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import Side from '$lib/components/Side.svelte';
	import BaseMenu from '$lib/components/BaseMenu.svelte';
	import LayerMenu from '$lib/components/LayerMenu.svelte';
	import LockOn from '$lib/components/Marker/LockOn.svelte';
	import InfoPopup from '$lib/components/popup/InfoPopup.svelte';
	import SelectPopup from '$lib/components/popup/SelectPopup.svelte';
	// import VectorMenu from '$lib/components/VectorMenu.svelte';
	import { type LayerEntry, backgroundSources } from '$lib/utils/layers';
	import { layerData } from '$lib/utils/layers';
	import { onMount } from 'svelte';
	import { useGsiTerrainSource } from 'maplibre-gl-gsi-terrain';
	import { isSide } from '$lib/store/store';

	const gsiTerrainSource = useGsiTerrainSource(maplibregl.addProtocol);

	let layerDataEntries: LayerEntry[] = layerData; // カテゴリごとのレイヤーデータ情報
	let backgroundIds: string[] = Object.keys(backgroundSources); // ベースマップのIDの配列
	let selectedBackgroundId: string = Object.keys(backgroundSources)[0]; // 選択されたベースマップのID
	let mapInstance: Map | null = null; // Mapインスタンス
	let layerIdNameDict: { [_: string]: string } = {};
	let lockOnMarker: Marker | null = null;
	let selectFeatureList: [];
	let popup;

	let sound;

	// sourcesの作成
	const createSourceItems = () => {
		const sourceItems: { [_: string]: SourceSpecification } = {};

		layerDataEntries.forEach((layerEntry) => {
			const sourceId = `${layerEntry.id}_source`;

			if (layerEntry.type === 'raster') {
				sourceItems[sourceId] = {
					type: 'raster',
					tiles: [layerEntry.path],
					maxzoom: layerEntry.maxzoom ? layerEntry.maxzoom : 24,
					minzoom: layerEntry.minzoom ? layerEntry.minzoom : 0,
					tileSize: 256,
					attribution: layerEntry.attribution
				};
			} else if (
				layerEntry.type === 'geojson-polygon' ||
				layerEntry.type === 'geojson-line' ||
				layerEntry.type === 'geojson-point'
			) {
				sourceItems[sourceId] = {
					type: 'geojson',
					data: layerEntry.path,
					attribution: layerEntry.attribution
				};
			} else {
				console.warn(`Unknown layer type: ${layerEntry.type}`);
			}
		});

		return sourceItems;
	};

	// layersの作成
	const createLayerItems = () => {
		let layerItems: LayerSpecification[] = [];
		let symbolLayerItems: LayerSpecification[] = [];

		layerDataEntries
			.filter((layerEntry) => layerEntry.visible)
			.reverse()
			.forEach((layerEntry, i) => {
				const layerId = `${layerEntry.id}`;
				const sourceId = `${layerEntry.id}_source`;

				if (layerEntry.type === 'raster') {
					layerItems.push({
						id: layerId,
						type: 'raster',
						source: sourceId,
						maxzoom: layerEntry.maxzoom ? layerEntry.maxzoom : 24,
						minzoom: layerEntry.minzoom ? layerEntry.minzoom : 0,
						paint: {
							'raster-opacity': layerEntry.opacity,
							...(layerEntry.style?.raster?.[0]?.paint ?? {})
						}
					});
					layerIdNameDict[layerId] = layerEntry.name;
				} else if (layerEntry.type === 'geojson-polygon') {
					const setStyele = layerEntry.style?.fill?.find(
						(item) => item.name === layerEntry.style_key
					);
					layerItems.push({
						id: layerId,
						type: 'fill',
						source: sourceId,
						paint: {
							'fill-opacity': layerEntry.opacity,
							...setStyele?.paint
						}
					});
					layerIdNameDict[layerId] = layerEntry.name;
					if (layerEntry.show_label) {
						symbolLayerItems.push({
							id: `${layerId}_label`,
							type: 'symbol',
							source: sourceId,
							layout: {
								...(layerEntry.style?.symbol?.[0]?.layout ?? {})
							},
							paint: {
								...(layerEntry.style?.symbol?.[0]?.paint ?? {})
							}
						});
					}
				} else if (layerEntry.type === 'geojson-line') {
					layerItems.push({
						id: layerId,
						type: 'line',
						source: sourceId,
						paint: {
							'line-opacity': layerEntry.opacity,
							...(layerEntry.style?.line?.[0]?.paint ?? {})
						}
					});
					layerIdNameDict[layerId] = layerEntry.name;
				} else if (layerEntry.type === 'geojson-point') {
					layerItems.push({
						id: layerId,
						type: 'circle',
						source: sourceId,
						paint: {
							'circle-opacity': layerEntry.opacity,
							...(layerEntry.style?.circle?.[0]?.paint ?? {})
						}
					});
					layerIdNameDict[layerId] = layerEntry.name;
				} else {
					console.warn(`Unknown layer type: ${layerEntry.type}`);
				}
			});

		return [...layerItems, ...symbolLayerItems];
	};

	// mapStyleの作成
	const createMapStyle = () => {
		const mapStyle: StyleSpecification = {
			version: 8,
			glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
			sources: {
				terrain: gsiTerrainSource, // 地形ソース
				...createSourceItems(),
				...backgroundSources
			},
			layers: [
				{
					id: 'background',
					source: selectedBackgroundId,
					type: 'raster'
				},
				...createLayerItems()
			]
		};

		return mapStyle;
	};

	class CustomTerrainControl extends maplibregl.TerrainControl {
		constructor(options: TerrainSpecification) {
			super(options);
		}

		onAdd(map: Map) {
			const container = super.onAdd(map);
			this._terrainButton.addEventListener('click', this.customClickHandler);
			return container;
		}

		// ３D表示の時に地図を傾ける
		customClickHandler = () => {
			this._map.getTerrain()
				? this._map.easeTo({ pitch: 60 })
				: this._map.easeTo({ pitch: 0 });
		};
	}

	// 初期描画時
	onMount(() => {
		sound = new Audio('click.mp3'); // 効果音ファイルのパスを指定
		sound.load(); // 効果音を事前にロード
		const map = new maplibregl.Map({
			container: 'map',
			style: createMapStyle(),
			center: [136.92300400916308, 35.5509525769706] as [number, number], // starting position [lng, lat]
			zoom: 14.5,
			maxZoom: 18,
			maxBounds: [135.120849, 33.93533, 139.031982, 37.694841]
		});
		mapInstance = map;

		// コントロールの追加
		map.addControl(new maplibregl.NavigationControl({}), 'top-right');
		map.addControl(new maplibregl.GeolocateControl({}), 'top-right');
		map.addControl(new maplibregl.ScaleControl({}), 'bottom-left');
		map.addControl(
			new CustomTerrainControl({
				source: 'terrain', // 地形ソースを指定
				exaggeration: 1 // 高さの倍率
			}),
			'top-right' // コントロールの位置を指定
		);

		mapInstance.on('click', (e) => {
			if (mapInstance === null) return;

			const features = mapInstance.queryRenderedFeatures(e.point);

			if (features.length === 0) return;

			for (const feature of features) {
				if (feature.layer && feature.layer.id && feature.layer.id.includes('cluster')) {
					// ズームを拡大
					const currentZoom = mapInstance.getZoom();
					const newZoom = currentZoom + 1;
					const zoomOptions = {
						duration: 500 // アニメーションの時間（ミリ秒）
					};
					mapInstance.flyTo({
						center: e.lngLat,
						zoom: newZoom,
						essential: true,
						...zoomOptions
					});
					return; // クラスターの場合はポップアップを表示しない
				}
			}

			if (features.length > 1) {
				selectPopupList = features.map((feature) => {
					return {
						name: layerDataEntries.find((entry) => entry.id === feature.layer.id)?.name,
						layerId: feature.layer.id,
						feature: feature
					};
				});

				return;
			}

			// レイヤーが属するカテゴリ名を取得
			const categoryName = features[0]?.layer.id
				? layerIdNameDict[features[0].layer.id]
				: undefined;

			console.log(features[0].properties);

			const div = document.createElement('div');
			new LockOn({
				target: div
			});

			if (lockOnMarker) {
				lockOnMarker.remove();
			}

			lockOnMarker = new maplibregl.Marker({ element: div })
				.setLngLat(e.lngLat)
				.addTo(mapInstance);

			sound.currentTime = 0; // 効果音を先頭から再生
			sound.play(); // 効果音を再生

			popup = features[0];
			selectFeatureList = [];
		});
	});

	// 変更を監視して地図を更新（MapMenuのベースマップとレイヤー）
	$: if (layerDataEntries && selectedBackgroundId && mapInstance) {
		const mapStyle = createMapStyle();
		// mapInstance.getTerrain() ? (mapStyle.terrain = gsiTerrainSource) : null;
		mapInstance.setStyle(mapStyle as StyleSpecification);
	}
</script>

<div id="map" class="h-full w-full"></div>
<Side />
<div class="custom-css absolute left-[70px] top-2 h-full max-h-[calc(100vh-8rem)] w-[300px]">
	<BaseMenu {backgroundIds} bind:selectedBackgroundId {backgroundSources} />
	<LayerMenu bind:layerDataEntries />
</div>
<div class="custom-css absolute right-[70px] top-2 h-full max-h-[calc(100vh-8rem)] w-[300px]">
	<SelectPopup {selectFeatureList} />
</div>

<style>
	.custom-css {
		perspective: 1000px;
		transform-style: preserve-3d;
	}
</style>
