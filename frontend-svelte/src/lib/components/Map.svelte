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
	import ThreeCanvas from '$lib/components/three/canvas.svelte';
	// import SelectPopup from '$lib/components/popup/SelectPopup.svelte';
	import Control from '$lib/components/Control.svelte';
	import LayerOptionMenu from './LayerMenu/LayerOptionMenu.svelte';
	// import VectorMenu from '$lib/components/VectorMenu.svelte';
	import { type LayerEntry, backgroundSources } from '$lib/utils/layers';
	import { layerData } from '$lib/utils/layers';
	import { onMount } from 'svelte';
	import { useGsiTerrainSource } from 'maplibre-gl-gsi-terrain';
	import { isSide } from '$lib/store/store';
	import { getTilePixelColor, getTileUrl } from '$lib/utils/map';

	// const gsiTerrainSource = useGsiTerrainSource(maplibregl.addProtocol);

	let layerDataEntries: LayerEntry[] = layerData; // カテゴリごとのレイヤーデータ情報
	let backgroundIds: string[] = Object.keys(backgroundSources); // ベースマップのIDの配列
	let selectedBackgroundId: string = Object.keys(backgroundSources)[0]; // 選択されたベースマップのID
	let mapInstance: Map | null = null; // Mapインスタンス
	let layerIdNameDict: { [_: string]: string } = {};
	let lockOnMarker: Marker | null = null;
	let selectFeatureList: [];
	let targetDemData: string | null = null;

	let mapBearing = 0;

	let feature;

	let sound;

	const createHighlightSource = () => {
		const sourceItems: { [_: string]: SourceSpecification } = {};
		sourceItems['HighlightFeatureId_source'] = {
			type: 'geojson',
			data: {
				type: 'FeatureCollection',
				features: []
			}
		};
		return sourceItems;
	};

	const createHighlightLayer = () => {
		const layerItems: LayerSpecification[] = [];
		layerItems.push({
			id: 'HighlightFeatureId',
			type: 'fill',
			source: 'HighlightFeatureId_source',
			paint: {
				'fill-color': '#ff0000',
				'fill-opacity': 0.5
			},
			filter: ['==', 'id', '']
		});
		return layerItems;
	};

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
				layerEntry.type === 'vector-polygon' ||
				layerEntry.type === 'vector-line' ||
				layerEntry.type === 'vector-point'
			) {
				sourceItems[sourceId] = {
					type: 'vector',
					tiles: [layerEntry.path],
					maxzoom: layerEntry.maxzoom ? layerEntry.maxzoom : 24,
					minzoom: layerEntry.minzoom ? layerEntry.minzoom : 0,
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
					generateId: true,
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
				} else if (layerEntry.type === 'vector-polygon') {
					const setStyele = layerEntry.style?.fill?.find(
						(item) => item.name === layerEntry.style_key
					);

					const layer = {
						id: layerId,
						type: 'fill',
						source: sourceId,
						'source-layer': layerEntry.source_layer,
						maxzoom: 24,
						minzoom: 0,
						paint: layerEntry.show_fill
							? {
									'fill-opacity': layerEntry.opacity,
									...setStyele?.paint
								}
							: {
									'fill-opacity': layerEntry.opacity,
									'fill-color': 'transparent'
								},
						layout: {
							...(layerEntry.style?.fill?.[0]?.layout ?? {})
						}
					} as LayerSpecification;

					layerItems.push(layer);
					layerIdNameDict[layerId] = layerEntry.name;

					if (layerEntry.show_outline) {
						layerItems.push({
							id: `${layerId}_outline`,
							type: 'line',
							source: sourceId,
							'source-layer': layerEntry.source_layer,
							paint: {
								'line-opacity': layerEntry.opacity,
								...(layerEntry.style?.line?.[0]?.paint ?? {})
							},
							layout: {
								...(layerEntry.style?.line?.[0]?.layout ?? {})
							}
						});
					}
					if (layerEntry.show_label) {
						symbolLayerItems.push({
							id: `${layerId}_label`,
							type: 'symbol',
							source: sourceId,
							'source-layer': layerEntry.source_layer,
							paint: {
								...(layerEntry.style?.symbol?.[0]?.paint ?? {})
							},
							layout: {
								...(layerEntry.style?.symbol?.[0]?.layout ?? {})
							}
						});
					}
				} else if (layerEntry.type === 'vector-line') {
					const setStyele = layerEntry.style?.line?.find(
						(item) => item.name === layerEntry.style_key
					);

					const layer = {
						id: layerId,
						type: 'line',
						source: sourceId,
						'source-layer': layerEntry.source_layer,
						maxzoom: 24,
						minzoom: 0,
						paint: {
							'line-opacity': layerEntry.opacity,
							...(layerEntry.style?.line?.[0]?.paint ?? {})
						},
						layout: {
							...(layerEntry.style?.line?.[0]?.layout ?? {})
						}
					} as LayerSpecification;

					layerItems.push(layer);
					layerIdNameDict[layerId] = layerEntry.name;

					if (layerEntry.show_label) {
						symbolLayerItems.push({
							id: `${layerId}_label`,
							type: 'symbol',
							source: sourceId,
							'source-layer': layerEntry.source_layer,
							paint: {
								...(layerEntry.style?.symbol?.[0]?.paint ?? {})
							},
							layout: {
								...(layerEntry.style?.symbol?.[0]?.layout ?? {})
							}
						});
					}
				} else if (layerEntry.type === 'geojson-polygon') {
					const setStyele = layerEntry.style?.fill?.find(
						(item) => item.name === layerEntry.style_key
					);

					const layer = {
						id: layerId,
						type: 'fill',
						source: sourceId,
						paint: layerEntry.show_fill
							? {
									'fill-opacity': layerEntry.opacity,
									...setStyele?.paint
								}
							: {
									'fill-opacity': layerEntry.opacity,
									'fill-color': 'transparent'
								},
						layout: {
							...(layerEntry.style?.fill?.[0]?.layout ?? {})
						}
					} as LayerSpecification;

					layerItems.push(layer);
					layerIdNameDict[layerId] = layerEntry.name;

					if (layerEntry.show_outline) {
						layerItems.push({
							id: `${layerId}_outline`,
							type: 'line',
							source: sourceId,
							paint: {
								'line-opacity': layerEntry.opacity,
								...(layerEntry.style?.line?.[0]?.paint ?? {})
							},
							layout: {
								...(layerEntry.style?.line?.[0]?.layout ?? {})
							}
						});
					}
					if (layerEntry.show_label) {
						symbolLayerItems.push({
							id: `${layerId}_label`,
							type: 'symbol',
							source: sourceId,
							paint: {
								...(layerEntry.style?.symbol?.[0]?.paint ?? {})
							},
							layout: {
								...(layerEntry.style?.symbol?.[0]?.layout ?? {})
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
						},
						layout: {
							...(layerEntry.style?.line?.[0]?.layout ?? {})
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
						},
						layout: {
							...(layerEntry.style?.circle?.[0]?.layout ?? {})
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
				terrainSource: {
                    type: 'raster-dem',
                    url: 'https://raw.githubusercontent.com/forestacdev/mino-terrain-rgb-poc/main/tiles/{z}/{x}/{y}.png',
                    tileSize: 256
                },
				...createSourceItems(),
				...backgroundSources,
				...createHighlightSource()
			},
			layers: [
				{
					id: 'background',
					source: selectedBackgroundId,
					type: 'raster'
				},
				...createLayerItems(),
				...createHighlightLayer()
			],
          
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
			// maxZoom: 18,
			maxBounds: [135.120849, 33.93533, 139.031982, 37.694841]
		});
		mapInstance = map;

		// コントロールの追加
		map.addControl(new maplibregl.NavigationControl({}), 'top-right');
		map.addControl(new maplibregl.GeolocateControl({}), 'top-right');
		map.addControl(new maplibregl.ScaleControl({}), 'bottom-left');
		map.addControl(
			new CustomTerrainControl({
				source: 'terrainSource', // 地形ソースを指定
				exaggeration: 1 // 高さの倍率
			}),
			'top-right' // コントロールの位置を指定
		);

		mapInstance.on('click', async (e) => {
			if (mapInstance === null) return;

			const div = document.createElement('div');
			const lockOnInstance = new LockOn({
				target: div
			});
			lockOnInstance.$on('click', (event) => {
				removeLockonMarker();
			});
			if (lockOnMarker) removeLockonMarker();
			lockOnMarker = new maplibregl.Marker({ element: div })
				.setLngLat(e.lngLat)

				.addTo(mapInstance);

			// sound.currentTime = 0; // 効果音を先頭から再生
			// sound.play(); // 効果音を再生

			mapInstance.panTo(e.lngLat, { duration: 1000 });

			const features = mapInstance.queryRenderedFeatures(e.point);

			if (features.length === 0) {
				selectFeatureList = [];
				feature = null;
				return;
			}

			// selectFeatureList = features.map((feature) => {
			// 	return {
			// 		name: layerDataEntries.find((entry) => entry.id === feature.layer.id)?.name,
			// 		layerId: feature.layer.id,
			// 		feature: feature
			// 	};
			// });

			console.log(features[0]);

			feature = features[0] ? features[0] : null;
			// selectFeatureList = [];
		});

		mapInstance.on('rotate', (e) => {
			console.log();
			// 角度が負の場合、360を足して0〜360度に変換
			const bearing360 = (Number(e.target.getBearing().toFixed(1)) + 360) % 360;
			mapBearing = bearing360;
		});
	});

	// 変更を監視して地図を更新（MapMenuのベースマップとレイヤー）
	$: if (layerDataEntries && selectedBackgroundId && mapInstance) {
		const mapStyle = createMapStyle();
		// mapInstance.getTerrain() ? (mapStyle.terrain = gsiTerrainSource) : null;
		mapInstance.setStyle(mapStyle as StyleSpecification);
	}

	// ロックオンマーカーを削除
	const removeLockonMarker = () => {
		if (lockOnMarker) lockOnMarker.remove();
		lockOnMarker = null;
		selectFeatureList = [];
		feature = null;
	};

	// 標高の取得
	const getElevation = async () => {
		console.log(lockOnMarker?.getLngLat());
		const lngLat = lockOnMarker?.getLngLat();
		if (!lngLat || !mapInstance) return;
		const zoom = Math.min(Math.round(mapInstance.getZoom()), 14);
		const rgba = await getTilePixelColor(
			lngLat.lng,
			lngLat.lat,
			zoom,
			'https://cyberjapandata.gsi.go.jp/xyz/dem_png/{z}/{x}/{y}.png'
		);

		if (!rgba) return;

		// RGB値を取得
		const r = rgba[0];
		const g = rgba[1];
		const b = rgba[2];

		// 高さを計算
		const rgb = r * 65536.0 + g * 256.0 + b;
		let h = 0.0;
		if (rgb < 8388608.0) {
			h = rgb * 0.01;
		} else if (rgb > 8388608.0) {
			h = (rgb - 16777216.0) * 0.01;
		}

		const tileurl = getTileUrl(
			lngLat.lng,
			lngLat.lat,
			14,
			'https://cyberjapandata.gsi.go.jp/xyz/dem_png/{z}/{x}/{y}.png'
		);
		targetDemData = tileurl;
	};

	// マップの回転
	const setMapBearing = (e) => {
		const mapBearing = e.detail;
		// mapInstance?.setBearing(mapBearing);

		mapInstance?.easeTo({ bearing: mapBearing, duration: 1000 });
	};

	// マップのズーム
	const setMapZoom = (e) => {
		const mapZoom = e.detail;
		mapInstance?.easeTo({
			zoom: mapZoom,
			duration: 1000
		});
	};
</script>

<div id="map" class="h-full w-full"></div>
<Side />
<div
	class="custom-css absolute left-[120px] top-[60px] h-full max-h-[calc(100vh-8rem)] max-w-[300px]"
>
	<BaseMenu {backgroundIds} bind:selectedBackgroundId {backgroundSources} />
	<LayerMenu bind:layerDataEntries />
</div>

<LayerOptionMenu bind:layerDataEntries />
<div class="custom-css absolute right-[60px] top-2 max-h-[calc(100vh-8rem)] w-[300px]">
	{#if lockOnMarker}
		<button on:click={getElevation}>この地点の標高</button>
	{/if}

	<!-- <SelectPopup {selectFeatureList} on:closePopup={removeLockonMarker} /> -->
	<InfoPopup {feature} />
</div>

<ThreeCanvas {targetDemData} />

<!-- <Control on:setMapBearing={setMapBearing} on:setMapZoom={setMapZoom} /> -->

<style>
	.custom-css {
		perspective: 1000px;
		transform-style: preserve-3d;
	}
</style>
