<script lang="ts">
	import Icon from '@iconify/svelte';
	import maplibregl from 'maplibre-gl';
	import type { ImageSource } from 'maplibre-gl';
	import { onDestroy, untrack } from 'svelte';
	import { fly } from 'svelte/transition';

	import GeoRefMarker from '$routes/map/components/marker/GeoRefMarker.svelte';
	import { DEFAULT_CUSTOM_META_DATA } from '$routes/map/data/entries/_meta_data';
	import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { RasterImageEntry, RasterTiffStyle } from '$routes/map/data/types/raster';
	import type { DialogType } from '$routes/map/types';
	import {
		GeoTiffCache,
		encodeAllBandsToTerrarium,
		type RasterBands,
		type BandDataRange
	} from '$routes/map/utils/file/geotiff';
	import { findCenterTile } from '$routes/map/utils/map';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing, showDataMenu } from '$routes/stores/ui';

	export interface GeoRefData {
		entryId: string;
		entryName: string;
		parsedBands: RasterBands;
		parsedNodata: number | null;
		dataRanges: BandDataRange[];
		numBands: number;
		imageWidth: number;
		imageHeight: number;
		bandMinMax: { min: number; max: number };
		multiBandMinMax: {
			r: { min: number; max: number };
			g: { min: number; max: number };
			b: { min: number; max: number };
		};
		imageFile: File;
	}

	interface Props {
		map: maplibregl.Map;
		showGeoRefForm: boolean;
		geoRefData: GeoRefData | null;
		showDataEntry: GeoDataEntry | null;
		showDialogType: DialogType;
		dropFile: File | FileList | null;
	}

	let {
		map,
		showGeoRefForm = $bindable(),
		geoRefData = $bindable(),
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable()
	}: Props = $props();

	const PREVIEW_SOURCE_ID = 'georef-image-preview';
	const PREVIEW_LAYER_ID = 'georef-image-preview-layer';

	let imageUrl = $state<string | null>(null);
	let previewAdded = $state(false);

	// 4コーナー座標: NW, NE, SE, SW
	let nw = $state<maplibregl.LngLat>(new maplibregl.LngLat(0, 0));
	let ne = $state<maplibregl.LngLat>(new maplibregl.LngLat(0, 0));
	let se = $state<maplibregl.LngLat>(new maplibregl.LngLat(0, 0));
	let sw = $state<maplibregl.LngLat>(new maplibregl.LngLat(0, 0));

	const getCornerCoordinates = (): [
		[number, number],
		[number, number],
		[number, number],
		[number, number]
	] => [
		[nw.lng, nw.lat],
		[ne.lng, ne.lat],
		[se.lng, se.lat],
		[sw.lng, sw.lat]
	];

	const getBbox = (): [number, number, number, number] => {
		const lngs = [nw.lng, ne.lng, se.lng, sw.lng];
		const lats = [nw.lat, ne.lat, se.lat, sw.lat];
		return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
	};

	let initialized = $state(false);

	// 初期配置: 地図の現在のビューから画像のアスペクト比でbboxを計算
	$effect(() => {
		if (geoRefData && showGeoRefForm && !initialized) {
			const data = geoRefData;
			untrack(() => {
				showDataMenu.set(false);
				const center = map.getCenter();
				const bounds = map.getBounds();
				const viewWidth = bounds.getEast() - bounds.getWest();
				const viewHeight = bounds.getNorth() - bounds.getSouth();

				const aspect = data.imageWidth / data.imageHeight;
				const size = Math.min(viewWidth, viewHeight) * 0.3;

				let halfW: number;
				let halfH: number;
				if (aspect >= 1) {
					halfW = size / 2;
					halfH = size / (2 * aspect);
				} else {
					halfW = (size * aspect) / 2;
					halfH = size / 2;
				}

				nw = new maplibregl.LngLat(center.lng - halfW, center.lat + halfH);
				ne = new maplibregl.LngLat(center.lng + halfW, center.lat + halfH);
				se = new maplibregl.LngLat(center.lng + halfW, center.lat - halfH);
				sw = new maplibregl.LngLat(center.lng - halfW, center.lat - halfH);

				// 画像プレビュー用URL
				imageUrl = URL.createObjectURL(data.imageFile);
				addPreview();
				initialized = true;
			});
		}
	});

	const addPreview = () => {
		if (!imageUrl || previewAdded) return;

		if (map.getSource(PREVIEW_SOURCE_ID)) {
			map.removeLayer(PREVIEW_LAYER_ID);
			map.removeSource(PREVIEW_SOURCE_ID);
		}

		map.addSource(PREVIEW_SOURCE_ID, {
			type: 'image',
			url: imageUrl,
			coordinates: getCornerCoordinates()
		});

		map.addLayer({
			id: PREVIEW_LAYER_ID,
			type: 'raster',
			source: PREVIEW_SOURCE_ID,
			paint: {
				'raster-opacity': 0.6
			}
		});

		previewAdded = true;
	};

	let rafId: number | null = null;

	const updatePreview = () => {
		if (!previewAdded) return;
		if (rafId !== null) return;

		rafId = requestAnimationFrame(() => {
			rafId = null;
			const source = map.getSource(PREVIEW_SOURCE_ID) as ImageSource | undefined;
			if (source && imageUrl) {
				source.updateImage({
					url: imageUrl,
					coordinates: getCornerCoordinates()
				});
			}
		});
	};

	// コーナードラッグ: 各コーナー独立移動（回転・自由変形対応）
	const onDragCorner = () => {
		updatePreview();
	};

	/**
	 * バンドデータから512x512のサムネイル画像を生成
	 */
	const generateThumbnail = (bands: RasterBands, width: number, height: number): string => {
		const size = Math.min(width, height);
		const sx = Math.floor((width - size) / 2);
		const sy = Math.floor((height - size) / 2);

		const thumbSize = 512;
		const canvas = new OffscreenCanvas(thumbSize, thumbSize);
		const ctx = canvas.getContext('2d')!;
		const imgData = ctx.createImageData(thumbSize, thumbSize);
		const data = imgData.data;

		const hasRgb = bands.length >= 3;

		for (let ty = 0; ty < thumbSize; ty++) {
			for (let tx = 0; tx < thumbSize; tx++) {
				const srcX = sx + Math.floor((tx * size) / thumbSize);
				const srcY = sy + Math.floor((ty * size) / thumbSize);
				const srcIdx = srcY * width + srcX;
				const dstIdx = (ty * thumbSize + tx) * 4;

				if (hasRgb) {
					data[dstIdx] = bands[0][srcIdx];
					data[dstIdx + 1] = bands[1][srcIdx];
					data[dstIdx + 2] = bands[2][srcIdx];
				} else {
					const v = bands[0][srcIdx];
					data[dstIdx] = v;
					data[dstIdx + 1] = v;
					data[dstIdx + 2] = v;
				}
				data[dstIdx + 3] = 255;
			}
		}

		ctx.putImageData(imgData, 0, 0);
		const tempCanvas = document.createElement('canvas');
		tempCanvas.width = thumbSize;
		tempCanvas.height = thumbSize;
		const tempCtx = tempCanvas.getContext('2d')!;
		tempCtx.putImageData(imgData, 0, 0);
		return tempCanvas.toDataURL('image/png');
	};

	const registration = async () => {
		if (!geoRefData) return;

		isProcessing.set(true);

		try {
			const data = geoRefData;
			const bbox = getBbox();
			const corners = getCornerCoordinates();

			GeoTiffCache.setBbox(data.entryId, bbox);
			GeoTiffCache.setSize(data.entryId, data.imageWidth, data.imageHeight);
			GeoTiffCache.setNumBands(data.entryId, data.numBands);

			const mapImage = generateThumbnail(data.parsedBands, data.imageWidth, data.imageHeight);

			await encodeAllBandsToTerrarium(
				data.entryId,
				data.parsedBands,
				data.imageWidth,
				data.imageHeight,
				data.parsedNodata,
				data.dataRanges
			);

			const isSingleBand = data.numBands === 1;

			const entry: RasterImageEntry<RasterTiffStyle> = {
				id: data.entryId,
				type: 'raster',
				format: {
					type: 'image',
					url: ''
				},
				metaData: {
					...DEFAULT_CUSTOM_META_DATA,
					name: data.entryName || '画像データ',
					tileSize: 256,
					bounds: bbox,
					imageCorners: corners,
					xyzImageTile: findCenterTile(bbox),
					mapImage
				},
				interaction: {
					...DEFAULT_RASTER_BASEMAP_INTERACTION
				},
				style: {
					type: 'tiff',
					opacity: 1.0,
					visible: true,
					visualization: {
						numBands: data.numBands,
						mode: isSingleBand ? 'single' : 'multi',
						uniformsData: {
							single: {
								index: 0,
								min: data.bandMinMax.min,
								max: data.bandMinMax.max,
								colorMap: 'jet'
							},
							multi: {
								r: { index: 0, min: data.multiBandMinMax.r.min, max: data.multiBandMinMax.r.max },
								g: {
									index: data.numBands >= 2 ? 1 : 0,
									min: data.multiBandMinMax.g.min,
									max: data.multiBandMinMax.g.max
								},
								b: {
									index: data.numBands >= 3 ? 2 : 0,
									min: data.multiBandMinMax.b.min,
									max: data.multiBandMinMax.b.max
								}
							}
						}
					}
				}
			};

			showDataEntry = entry;
			cleanup();
			showNotification('画像の位置を設定しました', 'success');
		} catch (e) {
			showNotification(e instanceof Error ? e.message : 'エンコードに失敗しました', 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	const removePreview = () => {
		if (previewAdded) {
			try {
				if (map.getLayer(PREVIEW_LAYER_ID)) map.removeLayer(PREVIEW_LAYER_ID);
				if (map.getSource(PREVIEW_SOURCE_ID)) map.removeSource(PREVIEW_SOURCE_ID);
			} catch {
				// skip
			}
			previewAdded = false;
		}
		if (imageUrl) {
			URL.revokeObjectURL(imageUrl);
			imageUrl = null;
		}
		if (rafId !== null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
	};

	const cleanup = () => {
		removePreview();
		initialized = false;
		showGeoRefForm = false;
		geoRefData = null;
		showDialogType = null;
		dropFile = null;
	};

	const cancel = () => {
		cleanup();
	};

	onDestroy(() => {
		removePreview();
	});

	const bboxDisplay = $derived.by(() => {
		const bbox = getBbox();
		return `[${bbox.map((v) => v.toFixed(6)).join(', ')}]`;
	});
</script>

{#if showGeoRefForm && geoRefData}
	<div
		transition:fly={{ duration: 300, x: -100, opacity: 0 }}
		class="w-side-menu bg-main absolute top-0 left-0 z-30 flex h-full flex-col items-center justify-center p-4 text-base"
	>
		<div class="flex shrink-0 items-center justify-between gap-2 overflow-auto pb-4">
			<Icon icon="ph:polygon-fill" class="h-8 w-8" />
			<span class="text-2xl font-bold">ジオリファレンス</span>
		</div>

		<div
			class="c-scroll flex h-full w-full grow flex-col items-center gap-3 overflow-x-hidden overflow-y-auto"
		>
			<div class="flex w-full flex-col gap-2 px-2 text-sm text-gray-300">
				<div>ファイル: {geoRefData.imageFile.name}</div>
				<div>サイズ: {geoRefData.imageWidth} × {geoRefData.imageHeight} px</div>
			</div>

			<div class="w-full px-2 text-sm text-gray-300">
				<p class="mb-2 text-yellow-400">
					地図上の4つのマーカーをドラッグして画像の範囲を指定してください
				</p>
				<div class="flex flex-col gap-1 text-xs">
					<div>範囲: {bboxDisplay}</div>
				</div>
			</div>
		</div>

		<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
			<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg">キャンセル</button>
			<button
				onclick={registration}
				disabled={$isProcessing}
				class="c-btn-confirm min-w-[200px] p-4 text-lg {$isProcessing
					? 'cursor-not-allowed opacity-50'
					: 'cursor-pointer'}"
			>
				決定
			</button>
		</div>
	</div>

	<GeoRefMarker {map} bind:lngLat={nw} label="NW" onDrag={onDragCorner} />
	<GeoRefMarker {map} bind:lngLat={ne} label="NE" onDrag={onDragCorner} />
	<GeoRefMarker {map} bind:lngLat={se} label="SE" onDrag={onDragCorner} />
	<GeoRefMarker {map} bind:lngLat={sw} label="SW" onDrag={onDragCorner} />
{/if}
