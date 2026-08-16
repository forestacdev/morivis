<script lang="ts">
	import Icon from '@iconify/svelte';
	import { untrack } from 'svelte';
	import { fly } from 'svelte/transition';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import GeoRefMarker from '$routes/map/components/marker/GeoRefMarker.svelte';
	import { DEFAULT_CUSTOM_META_DATA } from '$routes/map/data/entries/_meta_data';
	import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { RasterImageEntry, RasterTiffStyle } from '$routes/map/data/types/raster';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import { GeoTiffCache, type BandDataRange } from '$routes/map/utils/cache/raster/geotiff-cache';
	import { encodeAllBandsToTerrarium, type RasterBands } from '$routes/map/utils/formats/geotiff';
	import { createRasterMeshEntry } from '$routes/map/utils/formats/geotiff/mesh';
	import { generateThumbnail } from '$routes/map/utils/formats/raster/thumbnail';
	import { findCenterTile } from '$routes/map/utils/map/tile';
	import type { ImageSource } from '$routes/map/utils/maplibre';
	import maplibregl from '$routes/map/utils/maplibre';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing, showDataMenu } from '$routes/stores/ui';

	export type RasterRegistrationMode = 'raster' | 'mesh';

	export interface GeoRefData {
		sourceType: 'raster' | 'vector' | 'pointcloud';
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
		previewImageUrl?: string;
		initialCorners?: [[number, number], [number, number], [number, number], [number, number]];
		registrationMode: RasterRegistrationMode;
		allowRegistrationModeChange?: boolean;
	}

	export interface GeoRefPreviewData {
		url: string;
		coordinates: [[number, number], [number, number], [number, number], [number, number]];
	}

	interface Props {
		map: maplibregl.Map;
		geoRefData: GeoRefData | null;
		geoRefPreviewData: GeoRefPreviewData | null;
		showDataEntry: MorivisLayerEntry | null;
		showDialogType: DialogType;
		dropFile: UploadFilesInput;
		transformOptionMode: 'zone' | 'georef' | null;
	}

	let {
		map,
		geoRefData = $bindable(),
		geoRefPreviewData = $bindable(),
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable(),
		transformOptionMode
	}: Props = $props();

	const PREVIEW_SOURCE_ID = 'georef_image_preview';

	let imageUrl = $state<string | null>(null);
	const isGeoRefVisible = $derived(transformOptionMode === 'georef');
	const registrationModeOptions = [
		{ key: 'raster', name: 'ラスター' },
		{ key: 'mesh', name: '3Dメッシュ' }
	];

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

	const updatePreviewData = () => {
		if (!isGeoRefVisible || !imageUrl) return;

		if (!geoRefPreviewData || geoRefPreviewData.url !== imageUrl) {
			geoRefPreviewData = {
				url: imageUrl,
				coordinates: getCornerCoordinates()
			};
			return;
		}

		geoRefPreviewData.coordinates = getCornerCoordinates();
	};

	let rafId: number | null = null;

	const updatePreviewSource = () => {
		if (rafId !== null || !imageUrl) return;
		const nextImageUrl = imageUrl;

		rafId = requestAnimationFrame(() => {
			rafId = null;
			const source = map.getSource(PREVIEW_SOURCE_ID) as ImageSource | undefined;
			if (!source) return;

			source.updateImage({
				url: nextImageUrl,
				coordinates: getCornerCoordinates()
			});
		});
	};

	const getBbox = (): [number, number, number, number] => {
		const lngs = [nw.lng, ne.lng, se.lng, sw.lng];
		const lats = [nw.lat, ne.lat, se.lat, sw.lat];
		return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
	};

	let initialized = $state(false);

	// 初期配置: 地図の現在のビューから画像のアスペクト比でbboxを計算
	$effect(() => {
		if (geoRefData && isGeoRefVisible && !initialized) {
			const data = geoRefData;
			untrack(() => {
				showDataMenu.set(false);
				if (data.initialCorners) {
					nw = new maplibregl.LngLat(data.initialCorners[0][0], data.initialCorners[0][1]);
					ne = new maplibregl.LngLat(data.initialCorners[1][0], data.initialCorners[1][1]);
					se = new maplibregl.LngLat(data.initialCorners[2][0], data.initialCorners[2][1]);
					sw = new maplibregl.LngLat(data.initialCorners[3][0], data.initialCorners[3][1]);
					map.fitBounds(
						[
							[Math.min(nw.lng, sw.lng), Math.min(sw.lat, se.lat)],
							[Math.max(ne.lng, se.lng), Math.max(nw.lat, ne.lat)]
						],
						{
							padding: 80,
							duration: 0
						}
					);
				} else {
					const center = map.getCenter();
					const bounds = map.getBounds();
					const viewWidth = bounds.getEast() - bounds.getWest();
					const viewHeight = bounds.getNorth() - bounds.getSouth();

					// 緯度によるメルカトル歪み補正
					const cosLat = Math.cos((center.lat * Math.PI) / 180);
					const aspect = data.imageWidth / data.imageHeight;
					const size = Math.min(viewWidth, viewHeight) * 0.3;

					let halfW: number;
					let halfH: number;
					if (aspect >= 1) {
						halfW = size / 2 / cosLat;
						halfH = size / (2 * aspect);
					} else {
						halfW = (size * aspect) / 2 / cosLat;
						halfH = size / 2;
					}

					nw = new maplibregl.LngLat(center.lng - halfW, center.lat + halfH);
					ne = new maplibregl.LngLat(center.lng + halfW, center.lat + halfH);
					se = new maplibregl.LngLat(center.lng + halfW, center.lat - halfH);
					sw = new maplibregl.LngLat(center.lng - halfW, center.lat - halfH);
				}

				// 画像プレビュー用URL
				imageUrl =
					data.previewImageUrl ??
					generateThumbnail({
						bands: data.parsedBands,
						width: data.imageWidth,
						height: data.imageHeight,
						nodata: data.parsedNodata,
						ranges: data.dataRanges
					});
				updatePreviewData();
				initialized = true;
			});
		}
	});

	// コーナードラッグ: 各コーナー独立移動（回転・自由変形対応）
	const onDragCorner = () => {
		updatePreviewData();
		updatePreviewSource();
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

			const mapImage = generateThumbnail({
				bands: data.parsedBands,
				width: data.imageWidth,
				height: data.imageHeight
			});

			if (data.registrationMode === 'mesh' && data.numBands === 1) {
				const entry = await createRasterMeshEntry({
					id: data.entryId,
					name: data.entryName || 'GeoTIFF 3Dメッシュ',
					band: data.parsedBands[0],
					width: data.imageWidth,
					height: data.imageHeight,
					nodata: data.parsedNodata,
					bounds: bbox,
					corners,
					mapImage
				});

				showDataEntry = entry;
				cleanup();
				showNotification('3Dメッシュを生成しました', 'success');
				return;
			}

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
					attribution: 'GeoTIFF',
					name: data.entryName || '画像データ',
					tileSize: 256,
					bounds: bbox,
					imageCorners: corners,
					xyzImageTile: findCenterTile(bbox),
					mapImage
				},
				properties: {
					bands: {
						numBands: data.numBands
					}
				},
				interaction: {
					...DEFAULT_RASTER_BASEMAP_INTERACTION
				},
				style: {
					type: 'tiff',
					opacity: 1.0,
					visible: true,
					visualization: {
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
		geoRefPreviewData = null;
		if (imageUrl && imageUrl.startsWith('blob:')) {
			URL.revokeObjectURL(imageUrl);
		}
		imageUrl = null;
		if (rafId !== null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
	};

	const cleanup = () => {
		removePreview();
		initialized = false;
		transformOptionMode = null;
		geoRefData = null;
		showDialogType = null;
		dropFile = null;
	};

	const cancel = () => {
		cleanup();
	};

	const bboxDisplay = $derived.by(() => {
		const bbox = getBbox();
		return `[${bbox.map((v) => v.toFixed(6)).join(', ')}]`;
	});
</script>

{#if isGeoRefVisible && geoRefData}
	<div
		transition:fly={{ duration: 300, x: -100, opacity: 0 }}
		class="w-side-menu bg-main absolute top-0 left-0 z-30 flex h-full flex-col items-center justify-center p-4 text-base"
	>
		<div
			class="c-scroll flex h-full w-full grow flex-col items-center gap-3 overflow-x-hidden overflow-y-auto"
		>
			<div class="flex w-full flex-col gap-2 px-2 text-sm text-gray-300">
				<div>ファイル: {geoRefData.imageFile.name}</div>
				<div>サイズ: {geoRefData.imageWidth} × {geoRefData.imageHeight} px</div>
			</div>

			{#if geoRefData.sourceType === 'raster' && geoRefData.numBands === 1 && geoRefData.allowRegistrationModeChange !== false}
				<div class="w-full px-2">
					<HorizontalSelectBox
						label="登録方法"
						options={registrationModeOptions}
						bind:group={geoRefData.registrationMode}
					/>
					<p class="mt-2 text-xs text-gray-400">
						3Dメッシュは 1 バンド値を高さとして GLB に変換して登録します
					</p>
				</div>
			{/if}

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
