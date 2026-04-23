<script lang="ts">
	import { fromArrayBuffer } from 'geotiff';
	import { untrack } from 'svelte';

	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import type { GeoRefData } from '$routes/map/components/upload/form/GeoRefForm.svelte';
	import { DEFAULT_CUSTOM_META_DATA } from '$routes/map/data/entries/_meta_data';
	import {
		WEB_MERCATOR_MIN_LAT,
		WEB_MERCATOR_MAX_LAT,
		WEB_MERCATOR_MIN_LNG,
		WEB_MERCATOR_MAX_LNG
	} from '$routes/map/data/entries/_meta_data/_bounds';
	import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { RasterImageEntry, RasterTiffStyle } from '$routes/map/data/types/raster';
	import type { DialogType } from '$routes/map/types';
	import { parseEpsgFromAuxXml, parseBboxFromAuxXml } from '$routes/map/utils/file/aux.xml';
	import {
		GeoTiffCache,
		parseRasterBands,
		getMinMax,
		encodeAllBandsToTerrarium,
		type RasterBands,
		type BandDataRange
	} from '$routes/map/utils/file/geotiff';
	import { generateThumbnail } from '$routes/map/utils/file/thumbnail';
	import { isBboxValid } from '$routes/map/utils/map/bbox';
	import { findCenterTile } from '$routes/map/utils/map/tile';
	import { transformBbox } from '$routes/map/utils/proj';
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
		showGeoRefForm: boolean;
		geoRefData: GeoRefData | null;
	}

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable(),
		showZoneForm = $bindable(),
		selectedEpsgCode = $bindable(),
		focusBbox = $bindable(),
		zoneConfirmedEpsg = $bindable(),
		showGeoRefForm = $bindable(),
		geoRefData = $bindable()
	}: Props = $props();

	let entryName = $state<string>('');
	let numBands = $state<number>(0);
	let imageWidth = $state<number>(0);
	let imageHeight = $state<number>(0);
	let rawBbox = $state<[number, number, number, number] | null>(null);
	let resolvedBbox = $state<[number, number, number, number] | null>(null);
	let bandMinMax = $state<{ min: number; max: number }>({ min: 0, max: 255 });
	let multiBandMinMax = $state<{
		r: { min: number; max: number };
		g: { min: number; max: number };
		b: { min: number; max: number };
	}>({
		r: { min: 0, max: 255 },
		g: { min: 0, max: 255 },
		b: { min: 0, max: 255 }
	});
	let analyzed = $state<boolean>(false);
	let entryId = $state<string>('');
	let hasTfw = $state<boolean>(false);

	// 一時的に保持する解析済みデータ（Terrariumエンコード後に解放）
	let parsedBands = $state<RasterBands | null>(null);
	let parsedNodata = $state<number | null>(null);
	let dataRanges = $state<BandDataRange[]>([]);

	const imageFile = $derived.by(() => {
		if (!dropFile) return null;
		if (dropFile instanceof FileList) {
			return (
				Array.from(dropFile).find((f) => /\.(tiff?|tif|png|jpe?g|webp)$/i.test(f.name)) ?? null
			);
		}
		return dropFile;
	});

	const isPlainImage = $derived(imageFile ? /\.(png|jpe?g|webp)$/i.test(imageFile.name) : false);

	/**
	 * ワールドファイル(.tfw/.tifw/.tiffw)からbboxを計算する
	 */
	const parseTfw = async (
		file: File,
		width: number,
		height: number
	): Promise<[number, number, number, number] | null> => {
		try {
			const text = await file.text();
			const lines = text.trim().split(/\r?\n/);
			if (lines.length < 6) return null;

			const a = parseFloat(lines[0]);
			const d = parseFloat(lines[1]);
			const b = parseFloat(lines[2]);
			const e = parseFloat(lines[3]);
			const c = parseFloat(lines[4]);
			const f = parseFloat(lines[5]);

			if ([a, b, c, d, e, f].some((v) => !Number.isFinite(v))) return null;

			const corners = [
				[c, f],
				[c + a * width + b * 0, f + d * width + e * 0],
				[c + a * 0 + b * height, f + d * 0 + e * height],
				[c + a * width + b * height, f + d * width + e * height]
			];

			const xs = corners.map(([x]) => x);
			const ys = corners.map(([, y]) => y);

			return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
		} catch {
			return null;
		}
	};

	const findWorldFile = (files: FileList): File | null => {
		return Array.from(files).find((f) => /\.(tfw|tifw|tiffw|pgw|jgw|wld)$/i.test(f.name)) ?? null;
	};

	const findAuxXmlFile = (files: FileList): File | null => {
		return Array.from(files).find((f) => /\.aux\.xml$/i.test(f.name)) ?? null;
	};

	// ファイルドロップ時: 解析
	$effect(() => {
		if (imageFile) {
			entryName = imageFile.name.replace(/\.[^.]+$/, '');
			if (isPlainImage) {
				analyzeImage(imageFile);
			} else {
				analyzeGeoTiff(imageFile);
			}
		}
	});

	/**
	 * PNG/JPG画像からRGB 3バンドデータを抽出
	 */
	const analyzeImage = async (file: File) => {
		isProcessing.set(true);
		analyzed = false;
		resolvedBbox = null;
		hasTfw = false;
		parsedBands = null;

		try {
			const bitmap = await createImageBitmap(await file.arrayBuffer().then((b) => new Blob([b])));
			const width = bitmap.width;
			const height = bitmap.height;
			imageWidth = width;
			imageHeight = height;

			// Canvas経由でRGBAデータを取得
			const canvas = new OffscreenCanvas(width, height);
			const ctx = canvas.getContext('2d');
			if (!ctx) throw new Error('Canvas context取得失敗');
			ctx.drawImage(bitmap, 0, 0);
			bitmap.close();

			const imgData = ctx.getImageData(0, 0, width, height);
			const rgba = imgData.data;
			const pixelCount = width * height;

			// RGBAからR/G/B各バンドのTypedArrayを生成（透明ピクセルはNaN）
			const rBand = new Float32Array(pixelCount);
			const gBand = new Float32Array(pixelCount);
			const bBand = new Float32Array(pixelCount);
			for (let i = 0; i < pixelCount; i++) {
				if (rgba[i * 4 + 3] === 0) {
					rBand[i] = NaN;
					gBand[i] = NaN;
					bBand[i] = NaN;
				} else {
					rBand[i] = rgba[i * 4];
					gBand[i] = rgba[i * 4 + 1];
					bBand[i] = rgba[i * 4 + 2];
				}
			}

			const bands: RasterBands = [rBand, gBand, bBand];
			numBands = 3;

			const id = `geotiff_${crypto.randomUUID()}`;
			entryId = id;
			parsedNodata = NaN;

			const ranges: BandDataRange[] = bands.map((band) => getMinMax(band, null));
			dataRanges = ranges;

			bandMinMax = ranges[0];
			multiBandMinMax = {
				r: ranges[0],
				g: ranges[1],
				b: ranges[2]
			};

			parsedBands = bands;

			GeoTiffCache.setSize(id, width, height);
			GeoTiffCache.setNumBands(id, 3);

			// aux.xmlからGeoTransform/EPSGコードを取得
			let auxEpsg: EpsgCode | null = null;
			let auxContent: string | null = null;
			if (dropFile instanceof FileList) {
				const auxFile = findAuxXmlFile(dropFile);
				if (auxFile) {
					auxContent = await auxFile.text();
					auxEpsg = parseEpsgFromAuxXml(auxContent);
				}
			}

			// ワールドファイルから位置情報を取得
			if (dropFile instanceof FileList) {
				const wf = findWorldFile(dropFile);
				if (wf) {
					rawBbox = await parseTfw(wf, width, height);
					hasTfw = true;
				}
			}

			// ワールドファイルがなければaux.xmlのGeoTransformからbboxを取得
			if (!rawBbox && auxContent) {
				rawBbox = parseBboxFromAuxXml(auxContent, width, height);
			}

			analyzed = true;

			if (rawBbox && isBboxValid(rawBbox)) {
				resolvedBbox = rawBbox;
				GeoTiffCache.setBbox(id, rawBbox);
			} else if (rawBbox && auxEpsg) {
				convertBboxWithEpsg(auxEpsg);
				showNotification(`aux.xmlから座標系 EPSG:${auxEpsg} を検出しました`, 'success');
			} else if (rawBbox) {
				showZoneForm = true;
				focusBbox = rawBbox;
			} else {
				// 位置情報なし → ジオリファレンスフォームへ
				geoRefData = {
					entryId,
					entryName,
					parsedBands: parsedBands!,
					parsedNodata,
					dataRanges,
					numBands,
					imageWidth,
					imageHeight,
					bandMinMax,
					multiBandMinMax,
					imageFile: file
				};
				showGeoRefForm = true;
				showDialogType = null;
			}
		} catch (e) {
			showNotification(e instanceof Error ? e.message : '画像の解析に失敗しました', 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	const analyzeGeoTiff = async (file: File) => {
		isProcessing.set(true);
		analyzed = false;
		resolvedBbox = null;
		hasTfw = false;
		parsedBands = null;

		try {
			const arrayBuffer = await file.arrayBuffer();
			const tiff = await fromArrayBuffer(arrayBuffer);
			const image = await tiff.getImage();

			const width = image.getWidth();
			const height = image.getHeight();
			imageWidth = width;
			imageHeight = height;

			// bbox取得: まずGeoTIFF内蔵のメタデータを試す
			try {
				const imageBbox = image.getBoundingBox();
				if (imageBbox && imageBbox.length === 4) {
					rawBbox = imageBbox as [number, number, number, number];
				}
			} catch {
				rawBbox = null;
			}

			// GeoTIFFにbboxがなければワールドファイル(.tfw)を探す
			if (!rawBbox && dropFile instanceof FileList) {
				const tfwFile = findWorldFile(dropFile);
				if (tfwFile) {
					rawBbox = await parseTfw(tfwFile, width, height);
					hasTfw = true;
				}
			}

			// ラスターデータ読み込み
			const rasterData = await image.readRasters({ interleave: false });
			const bands = parseRasterBands(rasterData);
			numBands = bands.length;

			const id = `geotiff_${crypto.randomUUID()}`;
			entryId = id;

			// nodataの取得
			const nodata =
				image.fileDirectory.GDAL_NODATA !== undefined
					? parseFloat(image.fileDirectory.GDAL_NODATA)
					: null;
			parsedNodata = nodata;

			// 各バンドのmin/max計算
			const ranges: BandDataRange[] = bands.map((band) => getMinMax(band, nodata));
			dataRanges = ranges;

			// 表示用min/max
			bandMinMax = ranges[0];
			if (bands.length > 1) {
				multiBandMinMax = {
					r: ranges[0],
					g: ranges.length >= 2 ? ranges[1] : ranges[0],
					b: ranges.length >= 3 ? ranges[2] : ranges[0]
				};
			}

			// 一時的にバンドデータを保持（registration時にTerrariumエンコード）
			parsedBands = bands;

			// サイズとバンド数をキャッシュ
			GeoTiffCache.setSize(id, width, height);
			GeoTiffCache.setNumBands(id, bands.length);

			// aux.xmlからGeoTransform/EPSGコードを取得
			let auxEpsg: EpsgCode | null = null;
			let auxContent: string | null = null;
			if (dropFile instanceof FileList) {
				const auxFile = findAuxXmlFile(dropFile);
				if (auxFile) {
					auxContent = await auxFile.text();
					auxEpsg = parseEpsgFromAuxXml(auxContent);
				}
			}

			// ワールドファイル・GeoTIFF内蔵bboxがなければaux.xmlのGeoTransformからbboxを取得
			if (!rawBbox && auxContent) {
				rawBbox = parseBboxFromAuxXml(auxContent, width, height);
			}

			analyzed = true;

			// bboxの有効性チェック
			if (rawBbox && isBboxValid(rawBbox)) {
				resolvedBbox = rawBbox;
				GeoTiffCache.setBbox(id, rawBbox);
			} else if (rawBbox && auxEpsg) {
				// aux.xmlに座標系があれば自動変換
				convertBboxWithEpsg(auxEpsg);
				showNotification(`aux.xmlから座標系 EPSG:${auxEpsg} を検出しました`, 'success');
			} else if (rawBbox) {
				showZoneForm = true;
				focusBbox = rawBbox;
			} else {
				// 位置情報なし → ジオリファレンスフォームへ
				geoRefData = {
					entryId,
					entryName,
					parsedBands: parsedBands!,
					parsedNodata,
					dataRanges,
					numBands,
					imageWidth,
					imageHeight,
					bandMinMax,
					multiBandMinMax,
					imageFile: file
				};
				showGeoRefForm = true;
				showDialogType = null;
			}
		} catch (e) {
			showNotification(e instanceof Error ? e.message : 'GeoTIFFの解析に失敗しました', 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	// ZoneFormで座標系選択後 → bbox座標変換 → 自動登録
	$effect(() => {
		if (zoneConfirmedEpsg && showDialogType === 'geotiff') {
			const epsg = zoneConfirmedEpsg;
			untrack(() => {
				zoneConfirmedEpsg = null;
				convertBboxWithEpsg(epsg);
				registration();
			});
		}
	});

	const convertBboxWithEpsg = (epsgCode: EpsgCode) => {
		if (!rawBbox) return;

		try {
			let transformed: [number, number, number, number];

			if (epsgCode === '4326') {
				// 4326の場合は座標変換不要、WebMercator範囲にクリップ
				transformed = [
					Math.max(WEB_MERCATOR_MIN_LNG, Math.min(WEB_MERCATOR_MAX_LNG, rawBbox[0])),
					Math.max(WEB_MERCATOR_MIN_LAT, Math.min(WEB_MERCATOR_MAX_LAT, rawBbox[1])),
					Math.max(WEB_MERCATOR_MIN_LNG, Math.min(WEB_MERCATOR_MAX_LNG, rawBbox[2])),
					Math.max(WEB_MERCATOR_MIN_LAT, Math.min(WEB_MERCATOR_MAX_LAT, rawBbox[3]))
				];
			} else {
				const prjContent = getProjContext(epsgCode);
				transformed = transformBbox(rawBbox, prjContent);
			}

			if (!isBboxValid(transformed)) {
				showNotification('座標変換に失敗しました。座標系を確認してください', 'error');
				return;
			}

			resolvedBbox = transformed;
			if (entryId) {
				GeoTiffCache.setBbox(entryId, transformed);
				if (epsgCode === '4326' && rawBbox) {
					GeoTiffCache.markAs4326(entryId);
					GeoTiffCache.setRawBbox(entryId, rawBbox);
				}
			}
		} catch (e) {
			showNotification('座標変換中にエラーが発生しました', 'error');
			console.error(e);
		}
	};

	const registration = async () => {
		if (!analyzed || !entryId || !resolvedBbox || !parsedBands) return;

		isProcessing.set(true);

		try {
			// サムネイル画像を生成（Terrarium化前にバンドデータから作成）
			const mapImage = generateThumbnail({
				bands: parsedBands,
				width: imageWidth,
				height: imageHeight
			});

			// 全バンドをTerrariumエンコード
			await encodeAllBandsToTerrarium(
				entryId,
				parsedBands,
				imageWidth,
				imageHeight,
				parsedNodata,
				dataRanges
			);

			// 生データを解放（メモリ節約）
			parsedBands = null;

			const isSingleBand = numBands === 1;

			const entry: RasterImageEntry<RasterTiffStyle> = {
				id: entryId,
				type: 'raster',
				format: {
					type: 'image',
					url: '' // Terrarium PNGはキャッシュ経由で使用
				},
				metaData: {
					...DEFAULT_CUSTOM_META_DATA,
					attribution: 'GeoTIFF',
					name: entryName || 'GeoTIFFデータ',
					tileSize: 256,
					bounds: resolvedBbox,
					xyzImageTile: findCenterTile(resolvedBbox),
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
						numBands,
						mode: isSingleBand ? 'single' : 'multi',
						uniformsData: {
							single: {
								index: 0,
								min: bandMinMax.min,
								max: bandMinMax.max,
								colorMap: 'jet'
							},
							multi: {
								r: { index: 0, min: multiBandMinMax.r.min, max: multiBandMinMax.r.max },
								g: {
									index: numBands >= 2 ? 1 : 0,
									min: multiBandMinMax.g.min,
									max: multiBandMinMax.g.max
								},
								b: {
									index: numBands >= 3 ? 2 : 0,
									min: multiBandMinMax.b.min,
									max: multiBandMinMax.b.max
								}
							}
						}
					}
				}
			};

			showDataEntry = entry;
			showDialogType = null;
			dropFile = null;
			showNotification(
				isPlainImage ? '画像ファイルを読み込みました' : 'GeoTIFFファイルを読み込みました',
				'success'
			);
		} catch (e) {
			showNotification(e instanceof Error ? e.message : 'エンコードに失敗しました', 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	const cancel = () => {
		showDialogType = null;
		dropFile = null;
		parsedBands = null;
	};
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">{isPlainImage ? '画像' : 'GeoTIFF'}ファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-3 overflow-x-hidden overflow-y-auto"
>
	<TextForm bind:value={entryName} label="データ名" />

	{#if imageFile}
		<div class="w-full px-2 text-sm text-gray-300">
			ファイル: {imageFile.name}
		</div>
	{/if}

	{#if analyzed}
		<div class="flex w-full flex-col gap-1 px-2 text-sm text-gray-300">
			<div>サイズ: {imageWidth} × {imageHeight} px</div>
			<div>バンド数: {numBands}</div>
			{#if numBands === 1}
				<div>値の範囲: {bandMinMax.min.toFixed(2)} ~ {bandMinMax.max.toFixed(2)}</div>
			{/if}
			{#if hasTfw}
				<div class="text-blue-300">ワールドファイル(.tfw)から位置情報を取得しました</div>
			{/if}
			{#if resolvedBbox}
				<div>
					範囲: [{resolvedBbox[0].toFixed(6)}, {resolvedBbox[1].toFixed(6)}, {resolvedBbox[2].toFixed(
						6
					)}, {resolvedBbox[3].toFixed(6)}]
				</div>
			{:else if rawBbox}
				<div class="text-yellow-400">座標系が不明です。投影法を選択してください。</div>
			{:else}
				<div class="text-red-400">
					位置情報がありません。.tfwファイルと一緒にドロップしてください。
				</div>
			{/if}
		</div>
	{/if}
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
	<button
		onclick={registration}
		disabled={!analyzed || !resolvedBbox || $isProcessing}
		class="c-btn-confirm min-w-[200px] p-4 text-lg {!analyzed || !resolvedBbox || $isProcessing
			? 'cursor-not-allowed opacity-50'
			: 'cursor-pointer'}"
	>
		決定
	</button>
</div>
