<script lang="ts">
	import { parse } from '@loaders.gl/core';
	import { LASLoader } from '@loaders.gl/las';
	import { PCDLoader } from '@loaders.gl/pcd';
	import { PLYLoader } from '@loaders.gl/ply';
	import { untrack } from 'svelte';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import RangeSlider from '$routes/map/components/atoms/RangeSlider.svelte';
	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import type { TransformOptionMode } from '$routes/map/components/upload/form/pending-zone-vector';
	import type { GeoRefData } from '$routes/map/components/upload/form/transform/georef-types';
	import { getAllowedTransformModesForIssue } from '$routes/map/components/upload/transform-policy';
	import { DEFAULT_CUSTOM_META_DATA } from '$routes/map/data/entries/_meta_data';
	import { createPointCloudEntry } from '$routes/map/data/entries/model';
	import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
	import { createAdjustableRange, type MorivisLayerEntry } from '$routes/map/data/types';
	import type { RasterImageEntry, RasterTiffStyle } from '$routes/map/data/types/raster';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import { GeoTiffCache, type BandDataRange } from '$routes/map/utils/cache/raster/geotiff-cache';
	import { isCopcFileName, parseCopcFile } from '$routes/map/utils/formats/copc';
	import {
		encodeAllBandsToTerrarium,
		getMinMax,
		type RasterBands
	} from '$routes/map/utils/formats/geotiff';
	import { getLasProjection } from '$routes/map/utils/formats/las';
	import { parseObjPointCloudFile } from '$routes/map/utils/formats/obj';
	import {
		getPointCloudBbox,
		normalizePointCloudUpAxis,
		type PointCloudUpAxis
	} from '$routes/map/utils/formats/pointcloud/axis';
	import {
		createPointCloudMeterOffsets,
		type PointCloudMeterOffsets,
		type PointCloudSourcePositions
	} from '$routes/map/utils/formats/pointcloud/coordinate-offsets';
	import { rasterizePointCloudToDemInWorker } from '$routes/map/utils/formats/pointcloud/rasterize';
	import { createRasterGeoRefData } from '$routes/map/utils/formats/raster/georef';
	import { parseXyzFile } from '$routes/map/utils/formats/xyz';
	import { isBboxValid } from '$routes/map/utils/map/bbox';
	import { findCenterTile } from '$routes/map/utils/map/tile';
	import { transformBbox } from '$routes/map/utils/proj';
	import { getProjContext, type EpsgCode } from '$routes/map/utils/proj/dict';
	import { transformPointCloudParallel } from '$routes/map/utils/proj/pointcloud_transformer';
	import {
		getFirstUploadFile,
		getMatchedExtension
	} from '$routes/map/utils/upload-matchers-common';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDataEntry: MorivisLayerEntry | null;
		showDialogType: DialogType;
		dropFile: UploadFilesInput;
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

	let entryName = $state('');
	let pointCount = $state<number | null>(null);
	let sourcePointCount = $state<number | null>(null);
	let rawBbox = $state<[number, number, number, number] | null>(null);
	let resolvedBbox = $state<[number, number, number, number] | null>(null);
	let analyzed = $state(false);
	let parsedArrayBuffer = $state<ArrayBuffer | null>(null);
	let resolvedPositions = $state<Float32Array | null>(null);
	let resolvedColors = $state<Uint8Array | undefined>(undefined);
	let needsTransform = $state(false);
	let registrationMode = $state<'pointcloud' | 'raster'>('pointcloud');
	let rasterResolution = $state(1024);
	let pendingRegistrationAfterTransform = $state(false);
	let projectedPointCloud: PointCloudMeterOffsets | null = null;
	let plyUpAxis = $state<PointCloudUpAxis>('z-up');

	const registrationModeOptions = [
		{ key: 'pointcloud', name: '点群' },
		{ key: 'raster', name: 'DEMラスター' }
	];
	const plyUpAxisOptions = [
		{ key: 'z-up', name: 'Z-up（測量・点群）' },
		{ key: 'y-up', name: 'Y-up（3Dモデル系）' }
	];

	const pointCloudFile = $derived.by(() => {
		const file = getFirstUploadFile(dropFile);
		return file && /\.(las|laz|ply|pcd|xyz|txt|obj)$/i.test(file.name) ? file : null;
	});
	const getPointCloudEntryName = (fileName: string) => {
		const matchedExtension = getMatchedExtension(fileName);
		return matchedExtension
			? fileName.slice(0, -matchedExtension.length)
			: fileName.replace(/\.[^.]+$/, '');
	};
	const getPlacementAllowedTransformModes = () =>
		getAllowedTransformModesForIssue(showDialogType, 'placement-missing');

	/** 拡張子に応じたLoaderを返す */
	const getLoader = (fileName: string) => {
		const ext = fileName.split('.').pop()?.toLowerCase();
		if (ext === 'ply') return PLYLoader;
		if (ext === 'pcd') return PCDLoader;
		return LASLoader;
	};

	$effect(() => {
		if (pointCloudFile) {
			entryName = getPointCloudEntryName(pointCloudFile.name);
			analyzePointCloud(
				pointCloudFile,
				isPlyPointCloudFile(pointCloudFile.name) ? plyUpAxis : 'z-up'
			);
		}
	});

	const isTextPointCloudFile = (fileName: string) => /\.(xyz|txt)$/i.test(fileName);
	const isObjPointCloudFile = (fileName: string) => /\.obj$/i.test(fileName);
	const isPlyPointCloudFile = (fileName: string) => /\.ply$/i.test(fileName);
	const isLasPointCloudFile = (fileName: string) => /\.(las|laz)$/i.test(fileName);
	const transformPositions = transformPointCloudParallel;
	const transformPointCloudData = async (
		sourceBbox: [number, number, number, number],
		positions: Float32Array,
		projectionDefinition: string
	) => {
		const bbox = await transformBbox(sourceBbox, projectionDefinition);
		if (!isBboxValid(bbox)) {
			throw new Error('座標変換に失敗しました。座標系を確認してください');
		}

		return {
			bbox,
			positions: await transformPositions(positions, projectionDefinition)
		};
	};
	const createProjectedPointCloud = async (
		sourceBbox: [number, number, number, number],
		positions: PointCloudSourcePositions,
		projectionDefinition: string
	) => {
		const bbox = await transformBbox(sourceBbox, projectionDefinition);
		if (!isBboxValid(bbox)) {
			throw new Error('座標変換に失敗しました。座標系を確認してください');
		}

		const projectedOrigin: [number, number] = [
			(sourceBbox[0] + sourceBbox[2]) / 2,
			(sourceBbox[1] + sourceBbox[3]) / 2
		];
		const coordinateOrigin: [number, number, number] = [
			(bbox[0] + bbox[2]) / 2,
			(bbox[1] + bbox[3]) / 2,
			0
		];

		return {
			bbox,
			pointCloud: createPointCloudMeterOffsets(positions, projectedOrigin, coordinateOrigin)
		};
	};
	const getPointCloudErrorMessage = (error: unknown) => {
		if (!(error instanceof Error)) {
			return '点群ファイルの解析に失敗しました';
		}

		if (error.message.includes('Only file versions <= 1.3 are supported at this time')) {
			return 'この LAS/LAZ ファイルのバージョンには未対応です。現在は 1.3 以下のみ対応しています。';
		}

		return error.message;
	};

	const analyzePointCloud = async (file: File, upAxis: PointCloudUpAxis) => {
		isProcessing.set(true);
		analyzed = false;
		pointCount = null;
		sourcePointCount = null;
		rawBbox = null;
		resolvedBbox = null;
		resolvedPositions = null;
		resolvedColors = undefined;
		needsTransform = false;
		pendingRegistrationAfterTransform = false;
		projectedPointCloud = null;

		try {
			let positions: PointCloudSourcePositions | null = null;
			let colors: Uint8Array | undefined = undefined;
			let bbox: [number, number, number, number] | null = null;
			let detectedProjection: ReturnType<typeof getLasProjection> = null;

			if (isCopcFileName(file.name)) {
				const result = await parseCopcFile(file);
				positions = result.positions;
				colors = result.colors;
				pointCount = result.pointCount;
				sourcePointCount = result.sourcePointCount;
				bbox = result.bbox;
				detectedProjection = result.projection;
			} else if (isTextPointCloudFile(file.name)) {
				// XYZ テキスト形式
				const result = await parseXyzFile(file);
				positions = result.positions;
				colors = result.colors ?? undefined;
				pointCount = result.pointCount;

				if (pointCount > 0) {
					let minX = Infinity,
						minY = Infinity,
						maxX = -Infinity,
						maxY = -Infinity;
					for (let i = 0; i < positions.length; i += 3) {
						const x = positions[i],
							y = positions[i + 1];
						if (x < minX) minX = x;
						if (y < minY) minY = y;
						if (x > maxX) maxX = x;
						if (y > maxY) maxY = y;
					}
					bbox = [minX, minY, maxX, maxY];
				}
			} else if (isObjPointCloudFile(file.name)) {
				const result = await parseObjPointCloudFile(file);
				positions = result.positions;
				colors = result.colors ?? undefined;
				pointCount = result.pointCount;

				if (pointCount > 0) {
					let minX = Infinity,
						minY = Infinity,
						maxX = -Infinity,
						maxY = -Infinity;
					for (let i = 0; i < positions.length; i += 3) {
						const x = positions[i],
							y = positions[i + 1];
						if (x < minX) minX = x;
						if (y < minY) minY = y;
						if (x > maxX) maxX = x;
						if (y > maxY) maxY = y;
					}
					bbox = [minX, minY, maxX, maxY];
				}
			} else {
				// LAS/LAZ/PLY/PCD (loaders.gl)
				const arrayBuffer = await file.arrayBuffer();
				parsedArrayBuffer = arrayBuffer.slice(0);
				if (isLasPointCloudFile(file.name)) {
					detectedProjection = getLasProjection(arrayBuffer);
				}

				const data = isLasPointCloudFile(file.name)
					? await parse(arrayBuffer, LASLoader, { las: { fp64: true } })
					: await parse(arrayBuffer, getLoader(file.name));

				const pos = data.attributes?.POSITION?.value;
				if (pos) {
					positions =
						pos instanceof Float64Array
							? pos
							: pos instanceof Float32Array
								? pos
								: new Float32Array(pos);
					pointCount = positions.length / 3;
				}

				const col = data.attributes?.COLOR_0?.value;
				if (col) colors = col instanceof Uint8Array ? col : new Uint8Array(col);

				if (data.header?.boundingBox) {
					const [mins, maxs] = data.header.boundingBox;
					bbox = [mins[0], mins[1], maxs[0], maxs[1]];
				}

				if (isPlyPointCloudFile(file.name) && positions) {
					positions = normalizePointCloudUpAxis(positions, upAxis);
					bbox = getPointCloudBbox(positions);
				}
			}

			rawBbox = bbox;
			analyzed = true;

			if (
				rawBbox &&
				positions &&
				detectedProjection?.coordinateType === 'projected' &&
				detectedProjection.definition.includes('+units=m')
			) {
				try {
					const transformed = await createProjectedPointCloud(
						rawBbox,
						positions,
						detectedProjection.definition
					);
					resolvedBbox = transformed.bbox;
					projectedPointCloud = transformed.pointCloud;
					resolvedColors = colors;
					showNotification(
						detectedProjection.epsg
							? `埋め込み座標系 EPSG:${detectedProjection.epsg} を認識して自動配置しました`
							: '埋め込み座標系を認識して自動配置しました',
						'success'
					);
					return;
				} catch (error) {
					console.warn('LAS の埋め込み座標系による自動配置に失敗しました', error);
				}
			}
			if (positions instanceof Float64Array) positions = new Float32Array(positions);

			if (rawBbox && positions && detectedProjection) {
				try {
					const transformed = await transformPointCloudData(
						rawBbox,
						positions,
						detectedProjection.definition
					);
					resolvedBbox = transformed.bbox;
					resolvedPositions = transformed.positions;
					resolvedColors = colors;
					showNotification(
						detectedProjection.epsg
							? `埋め込み座標系 EPSG:${detectedProjection.epsg} を認識して自動配置しました`
							: '埋め込み座標系を認識して自動配置しました',
						'success'
					);
					return;
				} catch (error) {
					console.warn('LAS の埋め込み座標系による自動配置に失敗しました', error);
				}
			}

			if (rawBbox && isBboxValid(rawBbox)) {
				resolvedBbox = rawBbox;
				if (positions) resolvedPositions = positions;
				resolvedColors = colors;
			} else if (rawBbox) {
				needsTransform = true;
				if (positions) resolvedPositions = positions;
				resolvedColors = colors;
			} else {
				showNotification('位置情報が取得できませんでした', 'error');
			}
		} catch (e) {
			showNotification(getPointCloudErrorMessage(e), 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	// 座標系選択後 → 座標変換
	$effect(() => {
		if (zoneConfirmedEpsg && showDialogType === 'pointcloud') {
			const epsg = zoneConfirmedEpsg;
			untrack(() => {
				zoneConfirmedEpsg = null;
				transformWithEpsg(epsg);
			});
		}
	});

	const transformWithEpsg = async (epsgCode: EpsgCode) => {
		if (!rawBbox) return;

		isProcessing.set(true);

		try {
			const prjContent = getProjContext(epsgCode);
			let positions: Float32Array | null = resolvedPositions;

			if (!positions && parsedArrayBuffer) {
				// loaders.gl形式の場合は再パース
				const loader = pointCloudFile ? getLoader(pointCloudFile.name) : LASLoader;
				const data = await parse(parsedArrayBuffer.slice(0), loader);
				positions = data.attributes?.POSITION?.value as Float32Array;
				const col = data.attributes?.COLOR_0?.value;
				if (col) resolvedColors = col instanceof Uint8Array ? col : new Uint8Array(col);
			}

			if (!positions) {
				showNotification('点群座標の取得に失敗しました', 'error');
				return;
			}

			const transformed = await transformPointCloudData(rawBbox, positions, prjContent);
			resolvedBbox = transformed.bbox;
			resolvedPositions = transformed.positions;
			needsTransform = false;

			showNotification(
				`EPSG:${epsgCode} で座標変換しました（${pointCount?.toLocaleString()}点）`,
				'success'
			);

			if (pendingRegistrationAfterTransform) {
				pendingRegistrationAfterTransform = false;
				await registration();
				return;
			}
		} catch (e) {
			showNotification(e instanceof Error ? e.message : '座標変換に失敗しました', 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	const preparePointCloudRasterGeoRef = async () => {
		if (!resolvedPositions || !pointCloudFile) return false;
		const sourceBbox = resolvedBbox ?? rawBbox;
		if (!sourceBbox) return false;

		const { band, width, height, nodata } = await rasterizePointCloudToDemInWorker({
			positions: resolvedPositions,
			bbox: sourceBbox,
			longEdgePixels: rasterResolution
		});
		const id = `geotiff_${crypto.randomUUID()}`;
		const bands: RasterBands = [band];
		const ranges: BandDataRange[] = [getMinMax(band, nodata)];

		geoRefData = createRasterGeoRefData({
			entryId: id,
			entryName: `${entryName || '点群データ'}_dem`,
			parsedBands: bands,
			parsedNodata: nodata,
			dataRanges: ranges,
			imageWidth: width,
			imageHeight: height,
			imageFile: pointCloudFile,
			registrationMode: 'raster',
			allowedTransformModes: getPlacementAllowedTransformModes(),
			allowRegistrationModeChange: false
		});
		showDialogType = null;
		return true;
	};

	const preparePointCloudDirectGeoRef = async () => {
		if (!resolvedPositions || !pointCloudFile) return false;
		const sourceBbox = resolvedBbox ?? rawBbox;
		if (!sourceBbox) return false;

		const { band, width, height, nodata } = await rasterizePointCloudToDemInWorker({
			positions: resolvedPositions,
			bbox: sourceBbox,
			longEdgePixels: rasterResolution
		});
		const ranges: BandDataRange[] = [getMinMax(band, nodata)];

		geoRefData = {
			...createRasterGeoRefData({
				entryId: `pointcloud_georef_${crypto.randomUUID()}`,
				entryName: entryName || '点群データ',
				parsedBands: [band],
				parsedNodata: nodata,
				dataRanges: ranges,
				imageWidth: width,
				imageHeight: height,
				imageFile: pointCloudFile,
				registrationMode: 'raster',
				allowedTransformModes: getPlacementAllowedTransformModes(),
				allowRegistrationModeChange: false
			}),
			sourceType: 'pointcloud',
			pointCloudConfig: {
				positions: resolvedPositions,
				colors: resolvedColors,
				pointCount: pointCount ?? resolvedPositions.length / 3,
				sourceBbox
			}
		};
		showDialogType = null;
		return true;
	};

	const registration = async () => {
		if (!analyzed || (!resolvedPositions && !projectedPointCloud) || !pointCount) return;

		if (!resolvedBbox) {
			if (!rawBbox || !needsTransform) return;
			pendingRegistrationAfterTransform = true;
			transformOptionMode = 'zone';
			focusBbox = rawBbox;
			showNotification('投影法を選択してください', 'warning');
			return;
		}

		if (registrationMode === 'raster') {
			if (!resolvedPositions) {
				showNotification('自動配置した点群は DEM ラスター化に未対応です', 'warning');
				return;
			}
			isProcessing.set(true);

			try {
				const { band, width, height, nodata } = await rasterizePointCloudToDemInWorker({
					positions: resolvedPositions,
					bbox: resolvedBbox,
					longEdgePixels: rasterResolution
				});
				const id = `geotiff_${crypto.randomUUID()}`;
				const bands: RasterBands = [band];
				const ranges: BandDataRange[] = [getMinMax(band, nodata)];

				await encodeAllBandsToTerrarium(id, bands, width, height, nodata, ranges);

				GeoTiffCache.setBbox(id, resolvedBbox);
				GeoTiffCache.markAs4326(id);
				GeoTiffCache.setRawBbox(id, resolvedBbox);

				const entry: RasterImageEntry<RasterTiffStyle> = {
					id,
					type: 'raster',
					format: { type: 'image', url: '' },
					metaData: {
						...DEFAULT_CUSTOM_META_DATA,
						attribution: 'Point Cloud DEM',
						name: `${entryName || '点群データ'}_dem`,
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
						opacity: 1,
						visible: true,
						visualization: {
							mode: 'single',
							uniformsData: {
								single: {
									index: 0,
									min: ranges[0].min,
									max: ranges[0].max,
									range: createAdjustableRange(ranges[0].min, ranges[0].max),
									colorMap: 'jet'
								},
								multi: {
									r: {
										index: 0,
										min: ranges[0].min,
										max: ranges[0].max,
										range: createAdjustableRange(ranges[0].min, ranges[0].max)
									},
									g: {
										index: 0,
										min: ranges[0].min,
										max: ranges[0].max,
										range: createAdjustableRange(ranges[0].min, ranges[0].max)
									},
									b: {
										index: 0,
										min: ranges[0].min,
										max: ranges[0].max,
										range: createAdjustableRange(ranges[0].min, ranges[0].max)
									}
								}
							}
						}
					}
				};

				showDataEntry = entry;
				showDialogType = null;
				dropFile = null;
				parsedArrayBuffer = null;
				showNotification('点群から DEM ラスターを生成しました', 'success');
				return;
			} catch (e) {
				showNotification(
					e instanceof Error ? e.message : '点群の GeoTIFF 化に失敗しました',
					'error'
				);
				console.error(e);
				return;
			} finally {
				isProcessing.set(false);
			}
		}

		const pointCloudData = projectedPointCloud ?? { positions: resolvedPositions! };
		const entry = createPointCloudEntry(
			entryName || '点群データ',
			{
				positions: pointCloudData.positions,
				colors: resolvedColors,
				pointCount,
				coordinateOrigin: projectedPointCloud?.coordinateOrigin
			},
			resolvedBbox
		);

		showDataEntry = entry;
		showDialogType = null;
		dropFile = null;
		parsedArrayBuffer = null;
		showNotification('点群ファイルを読み込みました', 'success');
	};

	$effect(() => {
		if (
			transformOptionMode !== 'georef' ||
			geoRefData ||
			showDialogType !== 'pointcloud' ||
			!analyzed
		) {
			return;
		}

		isProcessing.set(true);
		(registrationMode === 'raster'
			? preparePointCloudRasterGeoRef()
			: preparePointCloudDirectGeoRef()
		)
			.then((prepared) => {
				if (!prepared) return;
				showNotification(
					registrationMode === 'raster'
						? '点群DEMの位置合わせを設定してください'
						: '点群の位置合わせを設定してください',
					'info'
				);
			})
			.catch((error) => {
				showNotification('点群DEMの位置合わせデータ生成に失敗しました', 'error');
				console.error(error);
			})
			.finally(() => {
				isProcessing.set(false);
			});
	});

	const cancel = () => {
		resolvedPositions = null;
		resolvedColors = undefined;
		projectedPointCloud = null;
		parsedArrayBuffer = null;
		showDialogType = null;
		dropFile = null;
	};
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">点群ファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-3 overflow-x-hidden overflow-y-auto"
>
	<TextForm bind:value={entryName} label="データ名" />

	{#if pointCloudFile}
		<div class="w-full px-2 text-sm text-gray-300">
			ファイル: {pointCloudFile.name}
		</div>
	{/if}

	{#if analyzed}
		{#if pointCloudFile && isPlyPointCloudFile(pointCloudFile.name)}
			<div class="w-full p-2">
				<HorizontalSelectBox label="上方向" bind:group={plyUpAxis} options={plyUpAxisOptions} />
			</div>
		{/if}

		<div class="flex w-full flex-col gap-1 px-2 text-sm text-gray-300">
			{#if pointCount !== null}
				<div>点数: {pointCount.toLocaleString()}</div>
			{/if}
			{#if sourcePointCount !== null && pointCount !== null && pointCount < sourcePointCount}
				<div class="text-xs text-gray-400">
					COPC の全 {sourcePointCount.toLocaleString()} 点のうち、表示用に {pointCount.toLocaleString()}
					点を読み込みました。
				</div>
			{/if}
			{#if resolvedBbox}
				<div>
					範囲: [{resolvedBbox[0].toFixed(6)}, {resolvedBbox[1].toFixed(6)}, {resolvedBbox[2].toFixed(
						6
					)}, {resolvedBbox[3].toFixed(6)}]
				</div>
			{:else if rawBbox && needsTransform}
				<div class="text-yellow-400">座標系が不明です。投影法を選択してください。</div>
				<div class="text-xs text-gray-500">
					元の範囲: [{rawBbox[0].toFixed(2)}, {rawBbox[1].toFixed(2)}, {rawBbox[2].toFixed(2)}, {rawBbox[3].toFixed(
						2
					)}]
				</div>
			{/if}
		</div>

		<div class="w-full p-2">
			<HorizontalSelectBox
				label="登録方法"
				bind:group={registrationMode}
				options={registrationModeOptions}
			/>
		</div>

		{#if registrationMode === 'raster'}
			<div class="w-full px-2">
				<RangeSlider
					label="ピクセルサイズ"
					bind:value={rasterResolution}
					min={128}
					max={4096}
					step={128}
					isInt={true}
				/>
			</div>
			<div class="w-full px-2 text-xs text-gray-400">
				各セルの最大標高で 1 バンド DEM を生成します。
			</div>
		{/if}
	{/if}
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg">キャンセル</button>
	<button
		onclick={registration}
		disabled={!analyzed || (!resolvedBbox && !rawBbox) || $isProcessing}
		class="c-btn-confirm min-w-[200px] p-4 text-lg {!analyzed ||
		(!resolvedBbox && !rawBbox) ||
		$isProcessing
			? 'cursor-not-allowed opacity-50'
			: 'cursor-pointer'}"
	>
		決定
	</button>
</div>
