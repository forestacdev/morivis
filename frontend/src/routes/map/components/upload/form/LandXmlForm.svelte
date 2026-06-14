<script lang="ts">
	import turfBbox from '@turf/bbox';
	import proj4 from 'proj4';
	import { untrack } from 'svelte';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import RangeSlider from '$routes/map/components/atoms/RangeSlider.svelte';
	import type { TransformOptionMode } from '$routes/map/components/upload/form/pending-zone-vector';
	import type { GeoRefData } from '$routes/map/components/upload/form/transform/georef-types';
	import { createMeshModelEntry } from '$routes/map/data/entries/_factories';
	import { DEFAULT_CUSTOM_META_DATA } from '$routes/map/data/entries/_meta_data';
	import {
		WEB_MERCATOR_MIN_LAT,
		WEB_MERCATOR_MAX_LAT,
		WEB_MERCATOR_MIN_LNG,
		WEB_MERCATOR_MAX_LNG
	} from '$routes/map/data/entries/_meta_data/_bounds';
	import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { RasterImageEntry, RasterTiffStyle } from '$routes/map/data/types/raster';
	import type { DialogType } from '$routes/map/types';
	import { GeoTiffCache, type BandDataRange } from '$routes/map/utils/cache/raster/geotiff-cache';
	import {
		encodeAllBandsToTerrarium,
		getMinMax,
		type RasterBands
	} from '$routes/map/utils/formats/geotiff';
	import { sampleRasterMeshHeights } from '$routes/map/utils/formats/geotiff/mesh';
	import {
		parseLandXml,
		landXmlFileToDem,
		type LandXmlSurface,
		type LandXmlParseResult
	} from '$routes/map/utils/formats/landxml';
	import { createRasterGeoRefData } from '$routes/map/utils/formats/raster/georef';
	import { isBboxValid } from '$routes/map/utils/map/bbox';
	import { findCenterTile } from '$routes/map/utils/map/tile';
	import { getProjContext, type EpsgCode } from '$routes/map/utils/proj/dict';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDataEntry: MorivisLayerEntry | null;
		showDialogType: DialogType;
		dropFile: File | FileList | null;
		transformOptionMode: TransformOptionMode;
		selectedEpsgCode: EpsgCode;
		focusBbox: [number, number, number, number] | null;
		zoneConfirmedEpsg: EpsgCode | null;
		geoRefData: GeoRefData | null;
	}

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable(),
		transformOptionMode = $bindable(),
		selectedEpsgCode = $bindable(),
		focusBbox = $bindable(),
		zoneConfirmedEpsg = $bindable(),
		geoRefData = $bindable()
	}: Props = $props();

	let parseResult = $state<LandXmlParseResult | null>(null);
	let surfaces = $state<LandXmlSurface[]>([]);
	let surfaceOptions = $state<{ key: string; name: string }[]>([]);
	let selectedSurfaceIndex = $state<string>('0');
	let demResolution = $state<number>(256);
	let registrationMode = $state<'dem' | 'mesh'>('dem');

	const registrationModeOptions = [
		{ key: 'dem', name: 'DEMラスター' },
		{ key: 'mesh', name: '3Dメッシュ' }
	];

	const xmlFile = $derived.by(() => {
		if (!dropFile) return null;
		return dropFile instanceof FileList ? dropFile[0] : dropFile;
	});

	const entryName = $derived(xmlFile?.name.replace(/\.[^.]+$/, '') ?? 'LandXMLデータ');
	const selectedSurface = $derived.by(() => surfaces[Number(selectedSurfaceIndex)] ?? null);

	// ファイルドロップ時: パースしてサーフェス一覧取得
	$effect(() => {
		if (xmlFile) {
			isProcessing.set(true);
			parseLandXml(xmlFile)
				.then((result) => {
					parseResult = result;
					surfaces = result.surfaces;

					if (surfaces.length === 1) {
						selectedSurfaceIndex = '0';
						surfaceOptions = [];
					} else {
						surfaceOptions = surfaces.map((s, i) => ({
							key: String(i),
							name: s.name || `Surface ${i + 1}`
						}));
						selectedSurfaceIndex = '0';
					}
				})
				.catch((e) => {
					showNotification('LandXMLファイルの読み込みに失敗しました', 'error');
					console.error(e);
				})
				.finally(() => {
					isProcessing.set(false);
				});
		}
	});

	const resolveProjString = (surface: LandXmlSurface, overrideProjString?: string) => {
		if (overrideProjString) return overrideProjString;
		if (surface.wktString) return surface.wktString;
		if (parseResult?.detectedZone) {
			return getProjContext(String(6668 + parseResult.detectedZone) as EpsgCode);
		}
		return null;
	};

	const createMeshEntry = async (overrideProjString?: string) => {
		const surface = selectedSurface;
		if (!surface) return;

		if (surface.glb.length === 0) {
			showNotification('このサーフェスは 3D メッシュを生成できませんでした', 'error');
			return;
		}

		const projString = resolveProjString(surface, overrideProjString);
		if (!projString) {
			showNotification('座標系が不明です。投影法を選択してください', 'warning');
			transformOptionMode = 'zone';
			focusBbox = [surface.center[0], surface.center[1], surface.center[0], surface.center[1]];
			return;
		}

		let bounds: [number, number, number, number];
		let lng: number;
		let lat: number;

		if (surface.contourGeojson && surface.contourGeojson.features.length > 0) {
			const contourBbox = turfBbox(surface.contourGeojson);
			bounds = [contourBbox[0], contourBbox[1], contourBbox[2], contourBbox[3]];
			lng = (bounds[0] + bounds[2]) / 2;
			lat = (bounds[1] + bounds[3]) / 2;
		} else if (surface.sourceBbox) {
			const sw = proj4(projString, 'EPSG:4326', [surface.sourceBbox[1], surface.sourceBbox[0]]);
			const ne = proj4(projString, 'EPSG:4326', [surface.sourceBbox[3], surface.sourceBbox[2]]);
			bounds = [sw[0], sw[1], ne[0], ne[1]];
			lng = (bounds[0] + bounds[2]) / 2;
			lat = (bounds[1] + bounds[3]) / 2;
		} else {
			const [centerLng, centerLat] = proj4(projString, 'EPSG:4326', [
				surface.center[1],
				surface.center[0]
			]);
			lng = centerLng;
			lat = centerLat;
			bounds = [lng - 0.001, lat - 0.001, lng + 0.001, lat + 0.001];
		}

		if (!isBboxValid(bounds)) {
			showNotification('3Dメッシュの位置情報が不正です', 'error');
			return;
		}

		const glbBytes = new Uint8Array(surface.glb.byteLength);
		glbBytes.set(surface.glb);
		const glbUrl = URL.createObjectURL(new Blob([glbBytes.buffer], { type: 'model/gltf-binary' }));

		const entry = createMeshModelEntry({
			id: `landxml_mesh_${crypto.randomUUID()}`,
			name: `${entryName}_${surface.name || 'surface'}_mesh`,
			url: glbUrl,
			attribution: 'LandXML',
			location: DEFAULT_CUSTOM_META_DATA.location,
			bounds,
			transform: {
				lng,
				lat,
				altitude: 0
			},
			...(surface.minHeight != null &&
				surface.maxHeight != null && {
					heightColorRamp: {
						enabled: true,
						min: surface.minHeight,
						max: surface.maxHeight,
						sourceMin: surface.minHeight,
						sourceMax: surface.maxHeight,
						sourceSign: 1
					}
				}),
			opacity: 1
		});

		showDataEntry = entry;
		showDialogType = null;
		showNotification('3Dメッシュを生成しました', 'success');
	};

	const prepareGeoRefData = async (projString: string) => {
		if (!xmlFile) return false;

		const demResult = await landXmlFileToDem(
			xmlFile,
			Number(selectedSurfaceIndex),
			demResolution,
			projString
		);

		const { data, width, height, nodata } = demResult;
		const bands: RasterBands = [data];
		const ranges: BandDataRange[] = [getMinMax(data, nodata)];

		if (registrationMode === 'mesh') {
			const meshHeightSampling = sampleRasterMeshHeights({
				band: data,
				width,
				height,
				nodata,
				bounds: demResult.bbox,
				baseValue: ranges[0].min,
				autoHeightScale: true
			});

			geoRefData = createRasterGeoRefData({
				entryId: `geotiff_${crypto.randomUUID()}`,
				entryName: `${entryName}_${selectedSurface?.name || 'surface'}_mesh`,
				parsedBands: bands,
				parsedNodata: nodata,
				dataRanges: ranges,
				imageWidth: width,
				imageHeight: height,
				imageFile: xmlFile,
				registrationMode: 'mesh',
				meshConfig: {
					baseValue: meshHeightSampling.effectiveBaseValue,
					heightScale: meshHeightSampling.effectiveHeightScale,
					attribution: 'LandXML 3D Mesh',
					opacity: 0.7,
					shadingEnabled: false,
					heightColorRampEnabled: true
				}
			});
		} else {
			geoRefData = createRasterGeoRefData({
				entryId: `geotiff_${crypto.randomUUID()}`,
				entryName: `${entryName}_dem`,
				parsedBands: bands,
				parsedNodata: nodata,
				dataRanges: ranges,
				imageWidth: width,
				imageHeight: height,
				imageFile: xmlFile,
				registrationMode: 'raster'
			});
		}

		showDialogType = null;
		return true;
	};

	/** DEM生成してエントリ作成 */
	const createDemEntry = async (projString?: string) => {
		if (!xmlFile) return;
		isProcessing.set(true);

		try {
			const demResult = await landXmlFileToDem(
				xmlFile,
				Number(selectedSurfaceIndex),
				demResolution,
				projString
			);

			const { data, width, height, bbox, nodata } = demResult;

			// bbox検証: 座標変換が正しくできたか
			if (!isBboxValid(bbox)) {
				// 座標系不明 → 座標系選択UIで手動選択
				transformOptionMode = 'zone';
				focusBbox = bbox;
				return;
			}

			const id = `geotiff_${crypto.randomUUID()}`;

			const bands: RasterBands = [data];
			const ranges: BandDataRange[] = [getMinMax(data, nodata)];

			await encodeAllBandsToTerrarium(id, bands, width, height, nodata, ranges);

			GeoTiffCache.setSize(id, width, height);
			GeoTiffCache.setNumBands(id, 1);

			const resolvedBbox: [number, number, number, number] = [
				Math.max(WEB_MERCATOR_MIN_LNG, Math.min(WEB_MERCATOR_MAX_LNG, bbox[0])),
				Math.max(WEB_MERCATOR_MIN_LAT, Math.min(WEB_MERCATOR_MAX_LAT, bbox[1])),
				Math.max(WEB_MERCATOR_MIN_LNG, Math.min(WEB_MERCATOR_MAX_LNG, bbox[2])),
				Math.max(WEB_MERCATOR_MIN_LAT, Math.min(WEB_MERCATOR_MAX_LAT, bbox[3]))
			];

			GeoTiffCache.setBbox(id, resolvedBbox);
			GeoTiffCache.markAs4326(id);
			GeoTiffCache.setRawBbox(id, bbox);

			const entry: RasterImageEntry<RasterTiffStyle> = {
				id,
				type: 'raster',
				format: { type: 'image', url: '' },
				metaData: {
					...DEFAULT_CUSTOM_META_DATA,
					attribution: 'LandXML',
					name: `${entryName}_dem`,
					tileSize: 256,
					bounds: resolvedBbox,
					xyzImageTile: findCenterTile(resolvedBbox)
				},
				properties: {
					bands: {
						numBands: 1
					}
				},
				interaction: { ...DEFAULT_RASTER_BASEMAP_INTERACTION },
				style: {
					type: 'tiff',
					opacity: 1.0,
					visible: true,
					visualization: {
						mode: 'single',
						uniformsData: {
							single: {
								index: 0,
								min: ranges[0].min,
								max: ranges[0].max,
								colorMap: 'jet'
							},
							multi: {
								r: { index: 0, min: ranges[0].min, max: ranges[0].max },
								g: { index: 0, min: ranges[0].min, max: ranges[0].max },
								b: { index: 0, min: ranges[0].min, max: ranges[0].max }
							}
						}
					}
				}
			};

			showDataEntry = entry;
			showDialogType = null;
			showNotification('DEMラスターを生成しました', 'success');
		} catch (e) {
			showNotification('DEM生成に失敗しました', 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	const cancel = () => {
		dropFile = null;
		showDialogType = null;
	};

	const register = async () => {
		if (registrationMode === 'mesh') {
			await createMeshEntry();
			return;
		}

		await createDemEntry();
	};

	// 座標系選択後
	$effect(() => {
		if (zoneConfirmedEpsg && showDialogType === 'landxml') {
			const epsg = zoneConfirmedEpsg;
			untrack(() => {
				zoneConfirmedEpsg = null;
				const projString = getProjContext(epsg);
				if (registrationMode === 'mesh') {
					createMeshEntry(projString);
					return;
				}
				createDemEntry(projString);
			});
		}
	});

	$effect(() => {
		if (
			transformOptionMode !== 'georef'
			|| geoRefData
			|| showDialogType !== 'landxml'
			|| !xmlFile
			|| !selectedSurface
		) {
			return;
		}

		const projString = getProjContext(selectedEpsgCode);
		if (!projString) return;

		isProcessing.set(true);
		prepareGeoRefData(projString)
			.then((prepared) => {
				if (!prepared) return;
				showNotification('LandXML の位置合わせを設定してください', 'info');
			})
			.catch((error) => {
				showNotification('LandXML の位置合わせデータ生成に失敗しました', 'error');
				console.error(error);
			})
			.finally(() => {
				isProcessing.set(false);
			});
	});
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">LandXMLファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-4 overflow-x-hidden overflow-y-auto"
>
	{#if parseResult && parseResult.detectedZone}
		<div class="w-full p-2 text-sm text-gray-300">
			検出された座標系: 平面直角座標系 第{parseResult.detectedZone}系
		</div>
	{:else if parseResult && !parseResult.detectedZone}
		<div class="w-full p-2 text-sm text-yellow-400">
			座標系を検出できませんでした。決定後に座標系を選択してください。
		</div>
	{/if}

	{#if surfaceOptions.length > 1}
		<div class="w-full p-2">
			<HorizontalSelectBox
				label="サーフェスを選択"
				bind:group={selectedSurfaceIndex}
				bind:options={surfaceOptions}
			/>
		</div>
	{/if}

	<div class="w-full p-2">
		<HorizontalSelectBox
			label="登録方法"
			bind:group={registrationMode}
			options={registrationModeOptions}
		/>
	</div>

	{#if registrationMode === 'dem'}
		<div class="w-full p-2">
			<RangeSlider
				label="解像度"
				bind:value={demResolution}
				min={64}
				max={4096}
				step={64}
				isInt={true}
			/>
		</div>
	{:else if selectedSurface}
		<div class="w-full p-2 text-sm text-gray-300">
			三角メッシュをそのまま GLB として登録します。
		</div>
	{/if}
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
	<button
		onclick={register}
		disabled={$isProcessing || surfaces.length === 0}
		class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg {$isProcessing ||
		surfaces.length === 0
			? 'cursor-not-allowed opacity-50'
			: ''}"
	>
		決定
	</button>
</div>
