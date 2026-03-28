<script lang="ts">
	import * as pdfjsLib from 'pdfjs-dist';
	import { untrack } from 'svelte';

	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import type { GeoRefData } from '$routes/map/components/upload/form/GeoRefForm.svelte';
	import { DEFAULT_CUSTOM_META_DATA } from '$routes/map/data/entries/_meta_data';
	import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
	import { createGeoJsonEntry, getGeometryTypes } from '$routes/map/data/entries/vector';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { RasterImageEntry, RasterTiffStyle } from '$routes/map/data/types/raster';
	import type { DialogType } from '$routes/map/types';
	import {
		parseGeoPDFFromBuffer,
		extractContentStream,
		extractFeatureAttributes,
		pixelToGeo,
		extractVectorsFromContentStream,
		hasVectorContent,
		hasRasterContent
	} from '$routes/map/utils/file/geopdf';
	import {
		GeoTiffCache,
		getMinMax,
		encodeAllBandsToTerrarium,
		type RasterBands,
		type BandDataRange
	} from '$routes/map/utils/file/geotiff';
	import { findCenterTile, isBboxValid } from '$routes/map/utils/map';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		showDialogType: DialogType;
		dropFile: File | FileList | null;
		showGeoRefForm: boolean;
		geoRefData: GeoRefData | null;
	}

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable(),
		showGeoRefForm = $bindable(),
		geoRefData = $bindable()
	}: Props = $props();

	let entryName = $state('');

	// コンテンツ種別（テンプレートで参照）
	type ContentType = 'raster' | 'vector';
	let contentTypes = $state<ContentType[]>([]);
	let selectedType = $state<ContentType | null>(null);
	let analyzed = $state(false);
	let cachedGeojson = $state<Awaited<ReturnType<typeof extractVectorsFromContentStream>> | null>(
		null
	);

	// 解析結果キャッシュ（テンプレート不使用）
	let cachedGeoPdfInfo: Awaited<ReturnType<typeof parseGeoPDFFromBuffer>> | null = null;
	let cachedPdfPage: pdfjsLib.PDFPageProxy | null = null;
	let cachedContentStream = '';
	let cachedPageWidth = 0;
	let cachedPageHeight = 0;
	let cachedAttributes: Map<number, Record<string, string | number | boolean>> = new Map();
	let analyzing = false;

	const pdfFile = $derived.by(() => {
		if (!dropFile) return null;
		if (dropFile instanceof FileList) {
			return Array.from(dropFile).find((f) => /\.pdf$/i.test(f.name)) ?? null;
		}
		return dropFile;
	});

	// ファイルドロップ時: 解析
	$effect(() => {
		const file = pdfFile;
		if (file && !analyzing) {
			untrack(() => {
				entryName = file.name.replace(/\.[^.]+$/, '');
				analyzePdf(file);
			});
		}
	});

	const analyzePdf = async (file: File) => {
		if (analyzing) return;
		analyzing = true;
		isProcessing.set(true);
		analyzed = false;
		contentTypes = [];
		selectedType = null;
		cachedGeoPdfInfo = null;
		cachedGeojson = null;
		cachedPdfPage = null;

		try {
			pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
				'pdfjs-dist/build/pdf.worker.min.mjs',
				import.meta.url
			).href;

			const arrayBuffer = await file.arrayBuffer();

			// GeoPDF判定 + content stream取得（pdfjsがarrayBufferをdetachする前）
			let geoPdfInfo: Awaited<ReturnType<typeof parseGeoPDFFromBuffer>> | null = null;
			let contentStreamData: { content: string; pageWidth: number; pageHeight: number } | null =
				null;
			try {
				geoPdfInfo = await parseGeoPDFFromBuffer(arrayBuffer);
				if (geoPdfInfo.encoding !== 'unknown' && geoPdfInfo.geoTransform) {
					contentStreamData = await extractContentStream(arrayBuffer);
					cachedAttributes = await extractFeatureAttributes(arrayBuffer);
				}
			} catch (e) {
				console.warn('GeoPDF parse:', e);
			}

			const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
			const page = await pdf.getPage(1);

			const isGeoPdf =
				geoPdfInfo !== null && geoPdfInfo.encoding !== 'unknown' && geoPdfInfo.geoTransform;

			if (!isGeoPdf) {
				// GeoPDFでない → 画像としてジオリファレンスへ
				await redirectToGeoRef(file, page);
				return;
			}

			// コンテンツ種別を軽量判定（正規表現のみ、パースは後で）
			cachedGeoPdfInfo = geoPdfInfo;
			cachedPdfPage = page;
			cachedPageWidth = contentStreamData!.pageWidth;
			cachedPageHeight = contentStreamData!.pageHeight;
			cachedContentStream = contentStreamData!.content;

			const types: ContentType[] = [];

			if (hasVectorContent(contentStreamData!.content)) {
				types.push('vector');
			}
			if (hasRasterContent(contentStreamData!.content)) {
				types.push('raster');
			}

			contentTypes = types;
			analyzed = true;

			// 1種類のみなら自動選択
			if (types.length === 1) {
				await onContentSelect(types[0]);
			}
		} catch (e) {
			showNotification(e instanceof Error ? e.message : 'PDFの解析に失敗しました', 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
			analyzing = false;
		}
	};

	/**
	 * GeoPDFでないPDFを画像としてジオリファレンスフォームに渡す
	 */
	const redirectToGeoRef = async (file: File, page: pdfjsLib.PDFPageProxy) => {
		const scale = 2;
		const viewport = page.getViewport({ scale });
		const width = Math.floor(viewport.width);
		const height = Math.floor(viewport.height);

		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('Canvas context取得失敗');

		await page.render({ canvas, viewport }).promise;

		const imgData = ctx.getImageData(0, 0, width, height);
		const rgba = imgData.data;
		const pixelCount = width * height;

		const rBand = new Uint8Array(pixelCount);
		const gBand = new Uint8Array(pixelCount);
		const bBand = new Uint8Array(pixelCount);
		for (let i = 0; i < pixelCount; i++) {
			rBand[i] = rgba[i * 4];
			gBand[i] = rgba[i * 4 + 1];
			bBand[i] = rgba[i * 4 + 2];
		}

		const bands: RasterBands = [rBand, gBand, bBand];
		const id = `geotiff_${crypto.randomUUID()}`;
		const ranges: BandDataRange[] = bands.map((band) => getMinMax(band, null));

		GeoTiffCache.setSize(id, width, height);
		GeoTiffCache.setNumBands(id, 3);

		const pngBlob = await new Promise<Blob>((resolve, reject) => {
			canvas.toBlob(
				(blob) => (blob ? resolve(blob) : reject(new Error('PNG変換に失敗しました'))),
				'image/png'
			);
		});
		const pngFile = new File([pngBlob], file.name.replace(/\.pdf$/i, '.png'), {
			type: 'image/png'
		});

		geoRefData = {
			entryId: id,
			entryName,
			parsedBands: bands,
			parsedNodata: null,
			dataRanges: ranges,
			numBands: 3,
			imageWidth: width,
			imageHeight: height,
			bandMinMax: ranges[0],
			multiBandMinMax: { r: ranges[0], g: ranges[1], b: ranges[2] },
			imageFile: pngFile
		};
		showGeoRefForm = true;
		showDialogType = null;
	};

	// ベクター選択後のジオメトリ種別選択
	type GeoType = 'Point' | 'LineString' | 'Polygon';
	let vectorGeoTypes = $state<GeoType[]>([]);
	let showGeoTypeSelection = $state(false);

	/**
	 * コンテンツ種別選択
	 */
	const onContentSelect = async (type: ContentType) => {
		selectedType = type;
		isProcessing.set(true);
		try {
			if (type === 'raster') {
				await registerAsRaster();
			} else {
				await extractAndShowGeoTypes();
			}
		} catch (e) {
			showNotification(e instanceof Error ? e.message : '処理に失敗しました', 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	/**
	 * ベクター抽出 → ジオメトリ種別判定 → 1種なら即登録、複数なら選択UI
	 */
	const extractAndShowGeoTypes = async () => {
		const geoInfo = cachedGeoPdfInfo;
		if (!geoInfo?.geoTransform || !cachedContentStream) return;

		// 重い処理: content stream パース（Web Worker）
		const geojson = await extractVectorsFromContentStream(cachedContentStream, {
			geoTransform: geoInfo.geoTransform,
			pageWidth: cachedPageWidth,
			pageHeight: cachedPageHeight
		});
		cachedGeojson = geojson;

		if (geojson.features.length === 0) {
			showNotification('ベクターデータが見つかりませんでした', 'error');
			return;
		}

		const geoTypes = getGeometryTypes(geojson).filter(
			(t): t is GeoType => t === 'Point' || t === 'LineString' || t === 'Polygon'
		);
		vectorGeoTypes = geoTypes;

		if (geoTypes.length === 1) {
			await registerAsVector(geoTypes[0]);
		} else if (geoTypes.length > 1) {
			showGeoTypeSelection = true;
		}
	};

	/**
	 * ベクターデータをGeoJSONエントリとして登録
	 */
	const registerAsVector = async (geometryType: GeoType) => {
		const geoInfo = cachedGeoPdfInfo;
		if (!geoInfo?.geoTransform || !cachedGeojson) return;

		isProcessing.set(true);
		try {
			const multiType = `Multi${geometryType}`;
			const filtered = {
				...cachedGeojson,
				features: cachedGeojson.features.filter(
					(f) => f.geometry.type === geometryType || f.geometry.type === multiType
				)
			};

			if (filtered.features.length === 0) {
				showNotification('ベクターデータが見つかりませんでした', 'error');
				return;
			}

			// StructTreeの属性をMCIDで紐付けてマージ
			if (cachedAttributes.size > 0) {
				for (const f of filtered.features) {
					const mcid = f.properties?.['_mcid'];
					if (typeof mcid === 'number') {
						const attrs = cachedAttributes.get(mcid);
						if (attrs) {
							Object.assign(f.properties, attrs);
						}
					}
					delete f.properties['_mcid'];
				}
			}

			let bbox: [number, number, number, number];
			if (geoInfo.encoding === 'ISO32000' && geoInfo.neatline) {
				const coords = geoInfo.neatline.coordinates;
				const lons = coords.map((c) => c[0]);
				const lats = coords.map((c) => c[1]);
				bbox = [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
			} else {
				const gt = geoInfo.geoTransform;
				const tl = pixelToGeo(gt, 0, 0);
				const br = pixelToGeo(gt, cachedPageWidth, cachedPageHeight);
				bbox = [
					Math.min(tl.x, br.x),
					Math.min(tl.y, br.y),
					Math.max(tl.x, br.x),
					Math.max(tl.y, br.y)
				];
			}

			const entry = createGeoJsonEntry(
				filtered,
				geometryType,
				entryName || 'GeoPDF',
				bbox,
				undefined,
				{ attribution: 'PDF' }
			);
			if (entry) {
				showDataEntry = entry;
				showDialogType = null;
				dropFile = null;
				showNotification('GeoPDFからベクターデータを読み込みました', 'success');
			}
		} finally {
			isProcessing.set(false);
		}
	};

	/**
	 * ラスター（画像）としてエントリ登録
	 */
	const registerAsRaster = async () => {
		const geoInfo = cachedGeoPdfInfo;
		const page = cachedPdfPage;
		if (!geoInfo?.geoTransform || !page) return;

		const scale = 2;
		const viewport = page.getViewport({ scale });
		const width = Math.floor(viewport.width);
		const height = Math.floor(viewport.height);

		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('Canvas context取得失敗');

		await page.render({ canvas, viewport }).promise;

		const imgData = ctx.getImageData(0, 0, width, height);
		const rgba = imgData.data;
		const pixelCount = width * height;

		const rBand = new Uint8Array(pixelCount);
		const gBand = new Uint8Array(pixelCount);
		const bBand = new Uint8Array(pixelCount);
		for (let i = 0; i < pixelCount; i++) {
			rBand[i] = rgba[i * 4];
			gBand[i] = rgba[i * 4 + 1];
			bBand[i] = rgba[i * 4 + 2];
		}

		const bands: RasterBands = [rBand, gBand, bBand];

		// bbox取得（ページ全体のgeoTransformから算出、余白込み）
		const gt = geoInfo.geoTransform;
		const pdfWidth = Math.floor(viewport.width / scale);
		const pdfHeight = Math.floor(viewport.height / scale);
		const tl = pixelToGeo(gt, 0, 0);
		const tr = pixelToGeo(gt, pdfWidth, 0);
		const bl = pixelToGeo(gt, 0, pdfHeight);
		const br = pixelToGeo(gt, pdfWidth, pdfHeight);
		const bbox: [number, number, number, number] = [
			Math.min(tl.x, tr.x, bl.x, br.x),
			Math.min(tl.y, tr.y, bl.y, br.y),
			Math.max(tl.x, tr.x, bl.x, br.x),
			Math.max(tl.y, tr.y, bl.y, br.y)
		];

		if (!isBboxValid(bbox)) {
			showNotification('位置情報の取得に失敗しました', 'error');
			return;
		}

		const id = `geotiff_${crypto.randomUUID()}`;
		const ranges: BandDataRange[] = bands.map((band) => getMinMax(band, null));

		GeoTiffCache.setSize(id, width, height);
		GeoTiffCache.setNumBands(id, 3);
		GeoTiffCache.setBbox(id, bbox);

		await encodeAllBandsToTerrarium(id, bands, width, height, null, ranges);

		const entry: RasterImageEntry<RasterTiffStyle> = {
			id,
			type: 'raster',
			format: { type: 'image', url: '' },
			metaData: {
				...DEFAULT_CUSTOM_META_DATA,
					attribution: 'PDF',
				name: entryName || 'GeoPDF',
				tileSize: 256,
				bounds: bbox,
				xyzImageTile: findCenterTile(bbox)
			},
			interaction: { ...DEFAULT_RASTER_BASEMAP_INTERACTION },
			style: {
				type: 'tiff',
				opacity: 1.0,
				visible: true,
				visualization: {
					numBands: 3,
					mode: 'multi',
					uniformsData: {
						single: { index: 0, min: ranges[0].min, max: ranges[0].max, colorMap: 'jet' },
						multi: {
							r: { index: 0, min: ranges[0].min, max: ranges[0].max },
							g: { index: 1, min: ranges[1].min, max: ranges[1].max },
							b: { index: 2, min: ranges[2].min, max: ranges[2].max }
						}
					}
				}
			}
		};

		showDataEntry = entry;
		showDialogType = null;
		dropFile = null;
		showNotification('GeoPDFからラスターデータを読み込みました', 'success');
	};

	const cancel = () => {
		showDialogType = null;
		dropFile = null;
	};

	const geoTypeLabel = (type: GeoType): string => {
		switch (type) {
			case 'Point':
				return 'ポイント';
			case 'LineString':
				return 'ライン';
			case 'Polygon':
				return 'ポリゴン';
		}
	};

	const featureCount = (type: GeoType): number => {
		if (!cachedGeojson) return 0;
		const multiType = `Multi${type}`;
		return cachedGeojson.features.filter(
			(f) => f.geometry.type === type || f.geometry.type === multiType
		).length;
	};
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">GeoPDFファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-3 overflow-x-hidden overflow-y-auto"
>
	<TextForm bind:value={entryName} label="データ名" />

	{#if pdfFile}
		<div class="w-full px-2 text-sm text-gray-300">
			ファイル: {pdfFile.name}
		</div>
	{/if}

	{#if showGeoTypeSelection && vectorGeoTypes.length > 1}
		<!-- ジオメトリ種別選択（ベクター抽出後） -->
		<div class="flex w-full flex-col gap-3 px-2">
			<div class="text-sm text-gray-300">
				ベクターデータに複数のジオメトリ種別が含まれています。
			</div>
			<div class="flex flex-col gap-2">
				{#each vectorGeoTypes as geoType}
					<button
						onclick={() => registerAsVector(geoType)}
						disabled={$isProcessing}
						class="c-btn-confirm cursor-pointer p-3 text-base {$isProcessing
							? 'cursor-not-allowed opacity-50'
							: ''}"
					>
						{geoTypeLabel(geoType)}
						<span class="ml-1 text-sm opacity-70">({featureCount(geoType)}件)</span>
					</button>
				{/each}
			</div>
		</div>
	{:else if analyzed && contentTypes.length > 1 && selectedType === null}
		<!-- コンテンツ種別選択（ベクター/ラスター） -->
		<div class="flex w-full flex-col gap-3 px-2">
			<div class="text-sm text-gray-300">読み込むデータの種別を選択してください。</div>
			<div class="flex flex-col gap-2">
				<button
					onclick={() => onContentSelect('vector')}
					disabled={$isProcessing}
					class="c-btn-confirm cursor-pointer p-3 text-base {$isProcessing
						? 'cursor-not-allowed opacity-50'
						: ''}"
				>
					ベクター（GeoJSON）
				</button>
				<button
					onclick={() => onContentSelect('raster')}
					disabled={$isProcessing}
					class="c-btn-confirm cursor-pointer p-3 text-base {$isProcessing
						? 'cursor-not-allowed opacity-50'
						: ''}"
				>
					ラスター（画像）
				</button>
			</div>
		</div>
	{:else if analyzed && contentTypes.length === 0}
		<div class="w-full px-2 text-sm text-yellow-400">データが見つかりませんでした。</div>
	{/if}
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg">キャンセル</button>
</div>
