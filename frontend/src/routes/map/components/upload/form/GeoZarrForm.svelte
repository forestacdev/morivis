<script lang="ts">
	import { slide } from 'svelte/transition';
	import * as yup from 'yup';

	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import { DEFAULT_CUSTOM_META_DATA } from '$routes/map/data/entries/_meta_data';
	import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { RasterGeoZarrEntry, RasterTiffStyle } from '$routes/map/data/types/raster';
	import {
		inspectGeoZarr,
		registerGeoZarr,
		type GeoZarrRegistrationMeta
	} from '$routes/map/protocol/geozarr';
	import type { DialogType } from '$routes/map/types';
	import { findCenterTile } from '$routes/map/utils/map/tile';
	import { normalizeHttpUrlInput } from '$routes/map/utils/platform/request';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		showDialogType: DialogType;
	}

	let { showDataEntry = $bindable(), showDialogType = $bindable() }: Props = $props();

	const validation = yup.object().shape({
		url: yup
			.string()
			.required('URLを入力してください。')
			.test('url-format', 'URLの形式が正しくありません', (value) => {
				return !value || !!normalizeHttpUrlInput(value);
			}),
		arrayPath: yup.string(),
		bbox: yup.string()
	});

	interface FormSchema {
		url: string;
		arrayPath: string;
		bbox: string;
	}

	let forms = $state<FormSchema>({
		url: '',
		arrayPath: '',
		bbox: ''
	});
	let errors = $state<Partial<Record<keyof FormSchema, string>>>({});
	let isSubmitDisabled = $state(true);
	let analyzed = $state<GeoZarrRegistrationMeta | null>(null);

	$effect(() => {
		try {
			validation.validateSync(forms, { abortEarly: false });
			errors = {};
			isSubmitDisabled = false;
		} catch (error) {
			const nextErrors: Record<string, string> = {};
			if (error instanceof yup.ValidationError) {
				error.inner.forEach((item) => {
					if (item.path) nextErrors[item.path] = item.message;
				});
			}
			errors = nextErrors;
			isSubmitDisabled = true;
		}
	});

	const inspect = async () => {
		if (isSubmitDisabled) return;

		isProcessing.set(true);
		analyzed = null;

		try {
			const normalizedUrl = normalizeHttpUrlInput(forms.url);
			if (!normalizedUrl) {
				showNotification('URLの形式が正しくありません', 'error');
				return;
			}
			forms.url = normalizedUrl;
			analyzed = await inspectGeoZarr(normalizedUrl, forms.arrayPath, forms.bbox || null);
			if (!forms.bbox) {
				forms.bbox = analyzed.bbox.join(', ');
			}
			showNotification('GeoZarr を解析しました', 'success');
		} catch (error) {
			console.error(error);
			showNotification(
				error instanceof Error ? error.message : 'GeoZarr の解析に失敗しました',
				'error'
			);
		} finally {
			isProcessing.set(false);
		}
	};

	const registration = async () => {
		if (isSubmitDisabled) return;

		isProcessing.set(true);

		try {
			const normalizedUrl = normalizeHttpUrlInput(forms.url);
			if (!normalizedUrl) {
				showNotification('URLの形式が正しくありません', 'error');
				return;
			}

			const entryId = `geozarr_${crypto.randomUUID()}`;
			const metadata = await registerGeoZarr({
				entryId,
				url: normalizedUrl,
				arrayPath: forms.arrayPath,
				bboxText: forms.bbox || null
			});
			const sampleRanges =
				metadata.sampleRanges.length > 0 ? metadata.sampleRanges : [{ min: 0, max: 1 }];
			const entry: RasterGeoZarrEntry<RasterTiffStyle> = {
				id: entryId,
				type: 'raster',
				format: {
					type: 'geozarr',
					url: normalizedUrl,
					arrayPath: metadata.arrayPath || undefined
				},
				metaData: {
					...DEFAULT_CUSTOM_META_DATA,
					attribution: 'GeoZarr',
					name: metadata.arrayPath.split('/').pop() || normalizedUrl.split('/').pop() || 'GeoZarr',
					tileSize: 256,
					bounds: metadata.bbox,
					minZoom: 0,
					maxZoom: 24,
					xyzImageTile: findCenterTile(metadata.bbox)
				},
				properties: {
					bands: {
						numBands: metadata.numBands,
						sampleRanges
					}
				},
				interaction: { ...DEFAULT_RASTER_BASEMAP_INTERACTION },
				style: {
					type: 'tiff',
					opacity: 1.0,
					visible: true,
					visualization: {
						mode: metadata.numBands >= 3 ? 'multi' : 'single',
						uniformsData: {
							single: {
								index: 0,
								min: sampleRanges[0]?.min ?? 0,
								max: sampleRanges[0]?.max ?? 1,
								colorMap: 'jet'
							},
							multi: {
								r: {
									index: 0,
									min: sampleRanges[0]?.min ?? 0,
									max: sampleRanges[0]?.max ?? 255
								},
								g: {
									index: Math.min(1, metadata.numBands - 1),
									min: sampleRanges[1]?.min ?? sampleRanges[0]?.min ?? 0,
									max: sampleRanges[1]?.max ?? sampleRanges[0]?.max ?? 255
								},
								b: {
									index: Math.min(2, metadata.numBands - 1),
									min: sampleRanges[2]?.min ?? sampleRanges[0]?.min ?? 0,
									max: sampleRanges[2]?.max ?? sampleRanges[0]?.max ?? 255
								}
							}
						}
					}
				}
			};

			showDataEntry = entry;
			showDialogType = null;
			showNotification('GeoZarr レイヤーを登録しました', 'success');
		} catch (error) {
			console.error(error);
			showNotification(
				error instanceof Error ? error.message : 'GeoZarr の登録に失敗しました',
				'error'
			);
		} finally {
			isProcessing.set(false);
		}
	};

	const resetAnalysis = () => {
		analyzed = null;
	};
</script>

<div class="flex flex-col gap-4 overflow-y-auto pr-1">
	<h2 class="text-lg font-bold">GeoZarr を追加</h2>
	<p class="text-sm leading-relaxed text-gray-300">
		公開された GeoZarr 配列を URL から追加します。root が group の場合は配列パスも入力してください。
		bbox が見つからないときだけ `minx,miny,maxx,maxy` を補います。
	</p>

	<TextForm label="URL" bind:value={forms.url} error={errors.url} />
	<TextForm label="配列パス（任意）" bind:value={forms.arrayPath} error={errors.arrayPath} />
	<TextForm label="bbox（任意）" bind:value={forms.bbox} error={errors.bbox} />

	<div class="flex gap-3">
		<button class="c-btn-sub px-4 py-2" onclick={inspect} disabled={isSubmitDisabled}>
			解析
		</button>
		<button class="c-btn-confirm px-4 py-2" onclick={registration} disabled={isSubmitDisabled}>
			登録
		</button>
		<button class="c-btn-sub px-4 py-2" onclick={() => (showDialogType = null)}>閉じる</button>
	</div>

	{#if analyzed}
		<div transition:slide={{ duration: 180 }} class="bg-base rounded-lg p-3 text-sm">
			<div>配列: {analyzed.arrayPath || '/'}</div>
			<div>サイズ: {analyzed.width} x {analyzed.height}</div>
			<div>バンド数: {analyzed.numBands}</div>
			<div>dtype: {analyzed.dtype}</div>
			<div>bbox: {analyzed.bbox.join(', ')}</div>
			<div>次元: {analyzed.dimensionNames.join(', ')}</div>
			<button class="mt-3 text-xs text-gray-300 underline" onclick={resetAnalysis}>
				解析結果を消す
			</button>
		</div>
	{/if}
</div>
