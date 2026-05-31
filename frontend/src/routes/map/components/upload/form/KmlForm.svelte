<script lang="ts">
	import turfBbox from '@turf/bbox';
	import { untrack } from 'svelte';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import { DEFAULT_CUSTOM_META_DATA } from '$routes/map/data/entries/_meta_data';
	import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
	import {
		createGeoJsonEntry,
		getGeometryTypes,
		filterByGeometryType
	} from '$routes/map/data/entries/vector';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { RasterImageEntry, RasterTiffStyle } from '$routes/map/data/types/raster';
	import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
	import {
		formatDate,
		type FieldDef,
		type VectorTemporalItem
	} from '$routes/map/data/types/vector/properties';
	import type { DialogType } from '$routes/map/types';
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import { GeojsonCache } from '$routes/map/utils/cache/geojson-cache';
	import { GeoTiffCache, type BandDataRange } from '$routes/map/utils/cache/raster/geotiff-cache';
	import {
		getMinMax,
		encodeAllBandsToTerrarium,
		type RasterBands
	} from '$routes/map/utils/formats/geotiff';
	import {
		extractGroundOverlayFromKmz,
		kmlFileToGeoJson,
		getKmlDefaultColor,
		type KmlParseResult
	} from '$routes/map/utils/formats/kml';
	import { isBboxValid } from '$routes/map/utils/map/bbox';
	import { findCenterTile } from '$routes/map/utils/map/tile';
	import { transformGeoJSONParallel } from '$routes/map/utils/proj';
	import { getProjContext, type EpsgCode } from '$routes/map/utils/proj/dict';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		showDialogType: DialogType;
		dropFile: File | FileList | null;
		showZoneForm: boolean;
		selectedEpsgCode: EpsgCode;
		focusBbox: [number, number, number, number] | null;
		zoneConfirmedEpsg: EpsgCode | null;
	}

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable(),
		showZoneForm = $bindable(),
		selectedEpsgCode = $bindable(),
		focusBbox = $bindable(),
		zoneConfirmedEpsg = $bindable()
	}: Props = $props();

	const GEOMETRY_TYPE_LABELS: Record<VectorEntryGeometryType, string> = {
		Point: 'ポイント',
		LineString: 'ライン',
		Polygon: 'ポリゴン'
	};

	let rawGeojson: FeatureCollection | null = null;
	let kmlResult: KmlParseResult | null = null;
	let geometryTypeOptions = $state<{ key: string; name: string }[]>([]);
	let selectedGeometryType = $state<VectorEntryGeometryType | ''>('');

	const kmlFile = $derived.by(() => {
		if (!dropFile) return null;
		return dropFile instanceof FileList ? dropFile[0] : dropFile;
	});

	const entryName = $derived(kmlFile?.name.replace(/\.[^.]+$/, '') ?? 'KMLデータ');

	const buildRgbBandsFromImage = async (file: File) => {
		const objectUrl = URL.createObjectURL(file);

		try {
			const image = await new Promise<HTMLImageElement>((resolve, reject) => {
				const img = new Image();
				img.onload = () => resolve(img);
				img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
				img.src = objectUrl;
			});

			const width = image.naturalWidth;
			const height = image.naturalHeight;
			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext('2d');
			if (!ctx) throw new Error('Canvas context取得失敗');

			ctx.drawImage(image, 0, 0);
			const imgData = ctx.getImageData(0, 0, width, height);
			const rgba = imgData.data;
			const pixelCount = width * height;

			const rBand = new Float32Array(pixelCount);
			const gBand = new Float32Array(pixelCount);
			const bBand = new Float32Array(pixelCount);
			for (let i = 0; i < pixelCount; i += 1) {
				const alpha = rgba[i * 4 + 3];
				if (alpha === 0) {
					rBand[i] = Number.NaN;
					gBand[i] = Number.NaN;
					bBand[i] = Number.NaN;
					continue;
				}

				rBand[i] = rgba[i * 4];
				gBand[i] = rgba[i * 4 + 1];
				bBand[i] = rgba[i * 4 + 2];
			}

			const bands: RasterBands = [rBand, gBand, bBand];
			const nodata = Number.NaN;
			const ranges: BandDataRange[] = bands.map((band) => getMinMax(band, nodata));

			return {
				bands,
				ranges,
				nodata,
				width,
				height
			};
		} finally {
			URL.revokeObjectURL(objectUrl);
		}
	};

	const registerGroundOverlay = async (file: File) => {
		const overlay = await extractGroundOverlayFromKmz(file);
		if (!overlay) return false;

		const imageData = await buildRgbBandsFromImage(overlay.imageFile);
		const entryId = `geotiff_${crypto.randomUUID()}`;

		GeoTiffCache.setSize(entryId, imageData.width, imageData.height);
		GeoTiffCache.setNumBands(entryId, 3);
		GeoTiffCache.setBbox(entryId, overlay.bbox);

		await encodeAllBandsToTerrarium(
			entryId,
			imageData.bands,
			imageData.width,
			imageData.height,
			imageData.nodata,
			imageData.ranges
		);

		const entry: RasterImageEntry<RasterTiffStyle> = {
			id: entryId,
			type: 'raster',
			format: { type: 'image', url: '' },
			metaData: {
				...DEFAULT_CUSTOM_META_DATA,
				attribution: 'KML',
				name: overlay.entryName || 'KMZ GroundOverlay',
				tileSize: 256,
				bounds: overlay.bbox,
				imageCorners: overlay.corners,
				xyzImageTile: findCenterTile(overlay.bbox)
			},
			properties: {
				bands: {
					numBands: 3
				}
			},
			interaction: { ...DEFAULT_RASTER_BASEMAP_INTERACTION },
			style: {
				type: 'tiff',
				opacity: 1.0,
				visible: true,
				visualization: {
					mode: 'multi',
					uniformsData: {
						single: {
							index: 0,
							min: imageData.ranges[0].min,
							max: imageData.ranges[0].max,
							colorMap: 'jet'
						},
						multi: {
							r: { index: 0, min: imageData.ranges[0].min, max: imageData.ranges[0].max },
							g: { index: 1, min: imageData.ranges[1].min, max: imageData.ranges[1].max },
							b: { index: 2, min: imageData.ranges[2].min, max: imageData.ranges[2].max }
						}
					}
				}
			}
		};

		showDataEntry = entry;
		showDialogType = null;
		dropFile = null;
		showNotification('GroundOverlay をラスターとして読み込みました', 'success');
		return true;
	};

	const getUpdatedTimeField = (field: FieldDef): FieldDef => ({
		...field,
		label: '時刻',
		type: 'datetime',
		format: {
			...field.format,
			date: {
				...(field.format?.date ?? {}),
				inputPatterns: [
					'YYYY-MM-DDTHH:mm:ssZ',
					'YYYY-MM-DDTHH:mm:ss+HH:mm',
					'YYYY-MM-DD',
					'YYYY-MM'
				],
				displayPattern: 'YYYY年M月D日 HH:mm:ss',
				invalidText: ''
			}
		}
	});

	const getTemporalItemsFromEntry = (entry: GeoDataEntry): VectorTemporalItem[] => {
		if (entry.type !== 'vector') return [];
		if (entry.format.type !== 'geojson') return [];

		const values = new Map<string, VectorTemporalItem>();
		const geojson = GeojsonCache.get(entry.id);

		for (const feature of geojson?.features ?? []) {
			const properties = feature.properties as Record<string, unknown> | null | undefined;
			const value = properties?.time;
			if (value == null || String(value) === '') continue;

			const raw = String(value);
			const timestamp = Date.parse(raw);
			if (Number.isNaN(timestamp) || values.has(raw)) continue;

			values.set(raw, {
				raw,
				timestamp,
				label: formatDate(raw, {
					inputPatterns: [
						'YYYY-MM-DDTHH:mm:ssZ',
						'YYYY-MM-DDTHH:mm:ss+HH:mm',
						'YYYY-MM-DD',
						'YYYY-MM'
					],
					displayPattern: 'YYYY年M月D日 HH:mm:ss',
					invalidText: raw
				})
			});
		}

		return Array.from(values.values()).sort((a, b) => a.timestamp - b.timestamp);
	};

	const applyKmlTemporalProperties = (entry: GeoDataEntry) => {
		if (entry.type !== 'vector') return;

		entry.properties.fields = entry.properties.fields.map((field) =>
			field.key === 'time' ? getUpdatedTimeField(field) : field
		);

		const temporalItems = getTemporalItemsFromEntry(entry);
		if (temporalItems.length === 0) return;

		entry.properties.temporal = {
			key: 'time',
			items: temporalItems
		};
		entry.properties.attributeView.timeKey = 'time';
	};

	$effect(() => {
		if (kmlFile) {
			isProcessing.set(true);
			(async () => {
				const ext = kmlFile.name.split('.').pop()?.toLowerCase();
				if (ext === 'kmz' && (await registerGroundOverlay(kmlFile))) {
					return;
				}

				return kmlFileToGeoJson(kmlFile)
					.then((result) => {
						kmlResult = result;
						rawGeojson = result.geojson as unknown as FeatureCollection;
						const types = getGeometryTypes(rawGeojson);

						if (types.length === 1) {
							selectedGeometryType = types[0];
							geometryTypeOptions = [];
							processGeojson();
						} else {
							geometryTypeOptions = types.map((t) => ({
								key: t,
								name: GEOMETRY_TYPE_LABELS[t] ?? t
							}));
							selectedGeometryType = types[0];
						}
					})
					.catch((e) => {
						showNotification('KMLファイルの読み込みに失敗しました', 'error');
						console.error(e);
					});
			})().finally(() => {
				isProcessing.set(false);
			});
		}
	});

	const processGeojson = async () => {
		let filtered = rawGeojson;
		if (rawGeojson && selectedGeometryType) {
			filtered = filterByGeometryType(rawGeojson, selectedGeometryType as VectorEntryGeometryType);
		}

		if (!filtered || filtered.features.length === 0) {
			showNotification('選択したジオメトリタイプのフィーチャが見つかりませんでした', 'error');
			return;
		}

		const bbox = turfBbox(filtered);

		if (!bbox || !isBboxValid(bbox)) {
			showZoneForm = true;
			focusBbox = bbox as [number, number, number, number];
		} else {
			const defaultColor = kmlResult
				? (getKmlDefaultColor(kmlResult, selectedGeometryType) ?? undefined)
				: undefined;
			const entry = await createGeoJsonEntry(
				filtered,
				selectedGeometryType as VectorEntryGeometryType,
				entryName,
				bbox as [number, number, number, number],
				undefined,
				{ attribution: 'KML', defaultColor }
			);

			if (entry) {
				applyKmlTemporalProperties(entry);
				showDataEntry = entry;
				showDialogType = null;
				showNotification('ファイルを読み込みました', 'success');
			} else {
				showNotification('データが不正です', 'error');
			}
		}
	};

	const convertAndCreateEntry = async (epsgCode: EpsgCode) => {
		if (!kmlFile || !rawGeojson || !selectedGeometryType) return;
		isProcessing.set(true);

		try {
			const prjContent = getProjContext(epsgCode);
			const transformedGeojson = (await transformGeoJSONParallel(
				rawGeojson,
				prjContent
			)) as FeatureCollection;

			let geojsonData = filterByGeometryType(
				transformedGeojson,
				selectedGeometryType as VectorEntryGeometryType
			);

			if (!geojsonData || geojsonData.features.length === 0) {
				showNotification('KMLファイルの変換に失敗しました', 'error');
				return;
			}

			const bbox = turfBbox(geojsonData);
			if (!bbox || !isBboxValid(bbox)) {
				showNotification('座標変換に失敗しました。座標系を確認してください', 'error');
				return;
			}

			const defaultColor = kmlResult
				? (getKmlDefaultColor(kmlResult, selectedGeometryType) ?? undefined)
				: undefined;
			const entry = await createGeoJsonEntry(
				geojsonData,
				selectedGeometryType,
				entryName,
				bbox as [number, number, number, number],
				undefined,
				{ attribution: 'KML', defaultColor }
			);

			if (entry) {
				applyKmlTemporalProperties(entry);
				showDataEntry = entry;
				showDialogType = null;
				showNotification('ファイルを読み込みました', 'success');
			}
		} catch (e) {
			showNotification('KMLファイルの変換中にエラーが発生しました', 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	const cancel = () => {
		dropFile = null;
		showDialogType = null;
	};

	$effect(() => {
		if (zoneConfirmedEpsg && showDialogType === 'kml') {
			const epsg = zoneConfirmedEpsg;
			untrack(() => {
				zoneConfirmedEpsg = null;
				convertAndCreateEntry(epsg);
			});
		}
	});
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">KMLファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-6 overflow-x-hidden overflow-y-auto"
>
	{#if geometryTypeOptions.length > 1}
		<div class="w-full p-2">
			<HorizontalSelectBox
				label="ジオメトリタイプを選択"
				bind:group={selectedGeometryType}
				bind:options={geometryTypeOptions}
			/>
		</div>
	{/if}
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
	<button
		onclick={processGeojson}
		disabled={$isProcessing || !selectedGeometryType}
		class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg {$isProcessing ||
		!selectedGeometryType
			? 'cursor-not-allowed opacity-50'
			: ''}"
	>
		決定
	</button>
</div>
