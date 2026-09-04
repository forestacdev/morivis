<script lang="ts">
	import { slide } from 'svelte/transition';
	import * as yup from 'yup';

	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import { DEFAULT_CUSTOM_META_DATA } from '$routes/map/data/entries/_meta_data';
	import { DEFAULT_RASTER_BASEMAP_INTERACTION } from '$routes/map/data/entries/raster/_interaction';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type {
		RasterCategoricalStyle,
		RasterGeoZarrEntry,
		RasterTiffStyle
	} from '$routes/map/data/types/raster';
	import {
		inspectGeoZarr,
		listGeoZarrArrayCandidates,
		normalizeGeoZarrUrl,
		registerGeoZarr,
		type GeoZarrArrayCandidate,
		type GeoZarrRegistrationMeta
	} from '$routes/map/protocol/geozarr';
	import type { DialogType } from '$routes/map/types';
	import { findCenterTile } from '$routes/map/utils/map/tile';
	import { normalizeHttpUrlInput } from '$routes/map/utils/platform/request';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDataEntry: MorivisLayerEntry | null;
		showDialogType: DialogType;
		remoteGeoZarrUrl: string | null;
	}

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		remoteGeoZarrUrl = $bindable()
	}: Props = $props();

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
	let candidates = $state<GeoZarrArrayCandidate[]>([]);
	let candidatesLoaded = $state(false);
	let isRegistering = $state(false);
	let needsManualBbox = $state(false);

	const selectedCandidate = $derived.by(
		() => candidates.find((candidate) => candidate.arrayPath === forms.arrayPath) ?? null
	);
	const shouldShowManualArrayPath = $derived(candidatesLoaded && candidates.length === 0);
	const canRegister = $derived(
		candidatesLoaded &&
			!!forms.arrayPath &&
			!isSubmitDisabled &&
			!isRegistering &&
			(!needsManualBbox || !!forms.bbox.trim())
	);
	$effect(() => {
		if (remoteGeoZarrUrl) {
			forms.url = normalizeGeoZarrUrl(remoteGeoZarrUrl);
			remoteGeoZarrUrl = null;
		}
	});

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

		try {
			const normalizedUrl = normalizeHttpUrlInput(forms.url);
			if (!normalizedUrl) {
				showNotification('URLの形式が正しくありません', 'error');
				return;
			}
			forms.url = normalizeGeoZarrUrl(normalizedUrl);
			candidates = await listGeoZarrArrayCandidates(forms.url);
			candidatesLoaded = true;
			needsManualBbox = false;
			analyzed = null;

			if (candidates.length > 0) {
				forms.arrayPath = candidates.some((candidate) => candidate.arrayPath === forms.arrayPath)
					? forms.arrayPath
					: (candidates[0]?.arrayPath ?? '');
			} else if (!forms.arrayPath) {
				showNotification(
					'配列候補を一覧できませんでした。必要なら配列パスを入力してください',
					'info'
				);
			}

			showNotification('GeoZarr の候補を取得しました', 'success');
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
		if (isSubmitDisabled || !canRegister) return;

		isProcessing.set(true);
		isRegistering = true;

		try {
			const normalizedUrl = normalizeHttpUrlInput(forms.url);
			if (!normalizedUrl) {
				showNotification('URLの形式が正しくありません', 'error');
				return;
			}
			const inspected = await inspectGeoZarr(
				normalizeGeoZarrUrl(normalizedUrl),
				forms.arrayPath,
				forms.bbox || null
			);
			analyzed = inspected;
			needsManualBbox = false;
			if (!forms.bbox) {
				forms.bbox = inspected.bbox.join(', ');
			}

			const entryId = `geozarr_${crypto.randomUUID()}`;
			const metadata = await registerGeoZarr({
				entryId,
				url: normalizedUrl,
				arrayPath: forms.arrayPath,
				bboxText: forms.bbox || null,
				metadata: inspected
			});
			const sampleRanges =
				metadata.sampleRanges.length > 0 ? metadata.sampleRanges : [{ min: 0, max: 1 }];
			const entry: RasterGeoZarrEntry<RasterTiffStyle | RasterCategoricalStyle> = {
				id: entryId,
				type: 'raster',
				format: {
					type: 'geozarr',
					url: metadata.url,
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
					},
					...(metadata.categorical ? { categories: { values: metadata.categorical.values } } : {})
				},
				interaction: { ...DEFAULT_RASTER_BASEMAP_INTERACTION },
				style: metadata.categorical
					? {
							type: 'categorical',
							opacity: 1.0,
							visible: true,
							legend: {
								type: 'category',
								name: metadata.arrayPath.split('/').pop() || 'category',
								colors: metadata.categorical.colors,
								labels: metadata.categorical.labels
							}
						}
					: {
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
			remoteGeoZarrUrl = null;
			showNotification('GeoZarr レイヤーを登録しました', 'success');
		} catch (error) {
			console.error(error);
			needsManualBbox =
				error instanceof Error && error.message.includes('bbox を判定できませんでした');
			showNotification(
				error instanceof Error ? error.message : 'GeoZarr の登録に失敗しました',
				'error'
			);
		} finally {
			isRegistering = false;
			isProcessing.set(false);
		}
	};

	const resetAnalysis = () => {
		analyzed = null;
	};

	const categoryLabel = (category: GeoZarrArrayCandidate['category']) => {
		switch (category) {
			case 'measurements':
				return '推奨';
			case 'quality':
				return '品質';
			case 'conditions':
				return '補助';
			case 'coordinates':
				return '座標';
			default:
				return 'その他';
		}
	};

	const onArrayPathChange = () => {
		analyzed = null;
		needsManualBbox = false;
	};

	const onUrlChange = () => {
		candidates = [];
		candidatesLoaded = false;
		forms.arrayPath = '';
		forms.bbox = '';
		analyzed = null;
		needsManualBbox = false;
	};

	const onBboxChange = () => {
		analyzed = null;
	};
</script>

<div class="flex flex-col gap-4 overflow-y-auto pr-1">
	<h2 class="text-lg font-bold">GeoZarr を追加</h2>
	<p class="text-sm leading-relaxed text-gray-300">
		公開された GeoZarr 配列を URL から追加します。root が group の場合は配列パスも入力してください。
		bbox が自動判定できないときだけ `minx,miny,maxx,maxy` を補います。
	</p>

	<TextForm label="URL" bind:value={forms.url} error={errors.url} onInput={onUrlChange} />
	{#if needsManualBbox}
		<TextForm label="bbox" bind:value={forms.bbox} error={errors.bbox} onInput={onBboxChange} />
	{/if}

	{#if candidates.length > 0}
		<div class="flex flex-col gap-2">
			<label class="text-sm font-medium text-gray-200" for="geozarr-array-select"> 配列候補 </label>
			<select
				id="geozarr-array-select"
				bind:value={forms.arrayPath}
				class="c-text-form rounded-lg border border-gray-600 px-3 py-2 text-sm"
				onchange={onArrayPathChange}
			>
				{#each candidates as candidate (candidate.arrayPath)}
					<option value={candidate.arrayPath}>
						[{categoryLabel(candidate.category)}] {candidate.arrayPath}
					</option>
				{/each}
			</select>
			<p class="text-xs leading-relaxed text-gray-400">
				`measurements` は画像本体、`quality` は品質情報、`conditions` は補助データ、 `coordinates`
				は座標軸です。
			</p>
		</div>
	{:else if shouldShowManualArrayPath}
		<div class="rounded-lg border border-gray-700 bg-black/20 p-3 text-sm text-gray-300">
			配列候補を一覧できませんでした。必要なら配列パスを手入力してください。
		</div>
	{/if}

	{#if shouldShowManualArrayPath}
		<TextForm
			label="配列パス"
			bind:value={forms.arrayPath}
			error={errors.arrayPath}
			onInput={onArrayPathChange}
		/>
	{/if}

	{#if selectedCandidate}
		<div
			transition:slide={{ duration: 180 }}
			class="rounded-lg p-3 text-sm text-gray-200 border border-gray-700 bg-black/20"
		>
			<div class="flex items-center gap-2">
				<span class="rounded bg-white/10 px-2 py-0.5 text-xs text-gray-100">
					{categoryLabel(selectedCandidate.category)}
				</span>
				{#if selectedCandidate.isRecommended}
					<span class="rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-200">
						自動選択候補
					</span>
				{/if}
			</div>
			<div class="mt-2 break-all">配列: {selectedCandidate.arrayPath}</div>
			<div>グループ: {selectedCandidate.groupPath}</div>
			{#if selectedCandidate.longName}
				<div>説明: {selectedCandidate.longName}</div>
			{/if}
			{#if selectedCandidate.shortName}
				<div>短縮名: {selectedCandidate.shortName}</div>
			{/if}
			{#if selectedCandidate.units}
				<div>単位: {selectedCandidate.units}</div>
			{/if}
			<div>shape: {selectedCandidate.shape.join(' x ')}</div>
			<div>dtype: {selectedCandidate.dtype}</div>
			<div>次元: {selectedCandidate.dimensionNames.join(', ')}</div>
		</div>
	{/if}

	<div class="flex gap-3">
		<button class="c-btn-sub px-4 py-2" onclick={inspect} disabled={isSubmitDisabled}>
			候補を解析
		</button>
		{#if candidatesLoaded}
			<button class="c-btn-confirm px-4 py-2" onclick={registration} disabled={!canRegister}>
				登録
			</button>
		{/if}
		<button class="c-btn-sub px-4 py-2" onclick={() => (showDialogType = null)}>閉じる</button>
	</div>

	{#if analyzed}
		<div
			transition:slide={{ duration: 180 }}
			class="rounded-lg p-3 text-sm text-gray-200 border border-gray-700 bg-black/20"
		>
			{#if selectedCandidate}
				<div>分類: {categoryLabel(selectedCandidate.category)}</div>
			{/if}
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
	{:else if isRegistering}
		<div
			transition:slide={{ duration: 180 }}
			class="flex items-center gap-3 rounded-lg border border-gray-700 bg-black/20 p-3 text-sm text-gray-200"
		>
			<div class="border-t-accent h-4 w-4 animate-spin rounded-full border-2 border-gray-300"></div>
			<span>GeoZarr を解析して登録しています...</span>
		</div>
	{/if}
</div>
