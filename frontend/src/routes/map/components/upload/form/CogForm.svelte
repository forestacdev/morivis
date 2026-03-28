<script lang="ts">
	import * as yup from 'yup';

	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import { DEFAULT_CUSTOM_META_DATA } from '$routes/map/data/entries/_meta_data';
	import {
		WEB_MERCATOR_MIN_LAT,
		WEB_MERCATOR_MAX_LAT,
		WEB_MERCATOR_MIN_LNG,
		WEB_MERCATOR_MAX_LNG
	} from '$routes/map/data/entries/_meta_data/_bounds';
	import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { RasterCogEntry, RasterImageEntry, RasterTiffStyle } from '$routes/map/data/types/raster';
	import type { DialogType } from '$routes/map/types';
	import {
		GeoTiffCache,
		encodeAllBandsToTerrarium,
		getMinMax,
		type BandDataRange,
		type RasterBands
	} from '$routes/map/utils/file/geotiff';
	import { CogTileManager } from '$routes/map/utils/file/geotiff/cog_tile_manager';
	import { findCenterTile } from '$routes/map/utils/map';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';
	import { fromUrl } from 'geotiff';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		showDialogType: DialogType;
	}

	let { showDataEntry = $bindable(), showDialogType = $bindable() }: Props = $props();

	const validation = yup.object().shape({
		url: yup.string().url('有効なURLを入力してください').required('URLを入力してください'),
		name: yup.string().required('データ名を入力してください')
	});

	type FormSchema = yup.InferType<typeof validation>;

	let forms = $state<FormSchema>({ url: '', name: '' });
	let isDisabled = $state(true);
	let errors = $state<Partial<Record<keyof FormSchema, string>>>({});
	let progressText = $state('');

	$effect(() => {
		validation
			.validate(forms, { abortEarly: false })
			.then(() => {
				isDisabled = false;
				errors = {};
			})
			.catch((error) => {
				isDisabled = true;
				const newErrors: Record<string, string> = {};
				if (error.inner && Array.isArray(error.inner)) {
					error.inner.forEach((err: yup.ValidationError) => {
						if (err.path) {
							newErrors[err.path] = err.message;
						}
					});
				}
				errors = newErrors;
			});
	});

	const registration = async () => {
		const cogUrl = forms.url.trim();
		const entryName = forms.name.trim();

		isProcessing.set(true);
		progressText = 'COGメタデータを読み取り中...';

		try {
			const id = `geotiff_${crypto.randomUUID()}`;
			const cogMetadata = await CogTileManager.register(id, cogUrl);
			const { fullWidth, fullHeight, numBands, bbox, sampleRanges } = cogMetadata;

			const resolvedBbox: [number, number, number, number] = [
				Math.max(WEB_MERCATOR_MIN_LNG, Math.min(WEB_MERCATOR_MAX_LNG, bbox[0])),
				Math.max(WEB_MERCATOR_MIN_LAT, Math.min(WEB_MERCATOR_MAX_LAT, bbox[1])),
				Math.max(WEB_MERCATOR_MIN_LNG, Math.min(WEB_MERCATOR_MAX_LNG, bbox[2])),
				Math.max(WEB_MERCATOR_MIN_LAT, Math.min(WEB_MERCATOR_MAX_LAT, bbox[3]))
			];

			const MAX_SIZE = 4096;
			const useTiledMode = fullWidth > MAX_SIZE || fullHeight > MAX_SIZE;

			if (useTiledMode) {
				progressText = `タイル方式で読み込み中... (${fullWidth}x${fullHeight})`;

				const entry: RasterCogEntry<RasterTiffStyle> = {
					id,
					type: 'raster',
					format: { type: 'cog', url: cogUrl },
					metaData: {
						...DEFAULT_CUSTOM_META_DATA,
						name: entryName,
						tileSize: 256,
						bounds: resolvedBbox,
						minZoom: cogMetadata.minZoom,
						maxZoom: cogMetadata.maxZoom,
						xyzImageTile: findCenterTile(resolvedBbox)
					},
					interaction: { ...DEFAULT_RASTER_BASEMAP_INTERACTION },
					style: {
						type: 'tiff',
						opacity: 1.0,
						visible: true,
						visualization: {
							numBands,
							mode: numBands >= 3 ? 'multi' : 'single',
							uniformsData: {
								single: {
									index: 0,
									min: sampleRanges[0].min,
									max: sampleRanges[0].max,
									colorMap: 'jet'
								},
								multi: {
									r: { index: 0, min: sampleRanges[0]?.min ?? 0, max: sampleRanges[0]?.max ?? 255 },
									g: {
										index: Math.min(1, numBands - 1),
										min: sampleRanges[1]?.min ?? 0,
										max: sampleRanges[1]?.max ?? 255
									},
									b: {
										index: Math.min(2, numBands - 1),
										min: sampleRanges[2]?.min ?? 0,
										max: sampleRanges[2]?.max ?? 255
									}
								}
							}
						}
					}
				};

				showDataEntry = entry;
				showDialogType = null;
				showNotification('COGをタイル方式で読み込みました', 'success');
			} else {
				progressText = `ラスターデータを読み込み中... (${fullWidth}x${fullHeight})`;

				const tiff = await fromUrl(cogUrl);
				const fullImage = await tiff.getImage();
				const rasters = await fullImage.readRasters();

				const bands: RasterBands = [];
				const ranges: BandDataRange[] = [];
				for (let i = 0; i < numBands; i++) {
					const band = rasters[i] as Float32Array | Uint8Array | Uint16Array;
					bands.push(band);
					ranges.push(getMinMax(band, null));
				}

				const nodata = fullImage.getGDALNoData();
				await encodeAllBandsToTerrarium(id, bands, fullWidth, fullHeight, nodata, ranges);

				GeoTiffCache.setSize(id, fullWidth, fullHeight);
				GeoTiffCache.setNumBands(id, numBands);
				GeoTiffCache.setBbox(id, resolvedBbox);
				GeoTiffCache.markAs4326(id);
				GeoTiffCache.setRawBbox(id, bbox);

				CogTileManager.unregister(id);

				const entry: RasterImageEntry<RasterTiffStyle> = {
					id,
					type: 'raster',
					format: { type: 'image', url: '' },
					metaData: {
						...DEFAULT_CUSTOM_META_DATA,
						name: entryName,
						tileSize: 256,
						bounds: resolvedBbox,
						xyzImageTile: findCenterTile(resolvedBbox)
					},
					interaction: { ...DEFAULT_RASTER_BASEMAP_INTERACTION },
					style: {
						type: 'tiff',
						opacity: 1.0,
						visible: true,
						visualization: {
							numBands,
							mode: numBands >= 3 ? 'multi' : 'single',
							uniformsData: {
								single: {
									index: 0,
									min: ranges[0].min,
									max: ranges[0].max,
									colorMap: 'jet'
								},
								multi: {
									r: { index: 0, min: ranges[0]?.min ?? 0, max: ranges[0]?.max ?? 255 },
									g: {
										index: Math.min(1, numBands - 1),
										min: ranges[1]?.min ?? 0,
										max: ranges[1]?.max ?? 255
									},
									b: {
										index: Math.min(2, numBands - 1),
										min: ranges[2]?.min ?? 0,
										max: ranges[2]?.max ?? 255
									}
								}
							}
						}
					}
				};

				showDataEntry = entry;
				showDialogType = null;
				showNotification('COGを読み込みました', 'success');
			}
		} catch (e) {
			const msg =
				e instanceof TypeError && e.message.includes('Failed to fetch')
					? 'COGの読み込みに失敗しました（CORSエラー）'
					: 'COGの読み込みに失敗しました';
			showNotification(msg, 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
			progressText = '';
		}
	};

	const cancel = () => {
		showDialogType = null;
	};
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">COGの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-2 overflow-x-hidden overflow-y-auto"
>
	<TextForm bind:value={forms.name} label="データ名" error={errors.name} />
	<TextForm bind:value={forms.url} label="COG URL" error={errors.url} />

	{#if progressText}
		<div class="w-full px-2 text-sm text-gray-400">
			{progressText}
		</div>
	{/if}
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg">キャンセル</button>
	<button
		onclick={registration}
		disabled={isDisabled || $isProcessing}
		class="c-btn-confirm min-w-[200px] p-4 text-lg {isDisabled || $isProcessing
			? 'cursor-not-allowed opacity-50'
			: 'cursor-pointer'}"
	>
		決定
	</button>
</div>
