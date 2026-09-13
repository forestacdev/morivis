<script lang="ts">
	import { PMTiles, TileType } from 'pmtiles';
	import { onDestroy } from 'svelte';
	import { slide } from 'svelte/transition';
	import * as yup from 'yup';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import { createPmtilesRasterEntry } from '$routes/map/data/entries/raster';
	import { createVectorPmtilesEntry } from '$routes/map/data/entries/vector';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import { getFirstUploadFile } from '$routes/map/utils/upload-matchers-common';
	import {
		buildVectorTileFields,
		buildVectorTilePopupKeys,
		buildVectorTileTitles,
		mergeVectorTileMetadataLayers,
		type RawVectorTileLayerMetadata,
		type RawVectorTileStatsLayerMetadata,
		type VectorTileMetadataLayer
	} from '$routes/map/utils/vector/tile-metadata';
	import { buildVectorTileColorExpressions } from '$routes/map/utils/vector/tile-style';
	import { showNotification } from '$routes/stores/notification';

	interface Props {
		showDataEntry: MorivisLayerEntry | null;
		showDialogType: DialogType;
		dropFile: UploadFilesInput;
		remotePmtilesUrl: string | null;
		active?: boolean;
		loading?: boolean;
	}

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable(),
		remotePmtilesUrl = $bindable(),
		active = true,
		loading = $bindable(false)
	}: Props = $props();

	const id = $props.id();
	let disposed = false;
	let analysisVersion = 0;
	let registeredUrl = '';
	let analyzedUrl = $state('');
	let analysisError = $state('');
	onDestroy(() => {
		disposed = true;
		analysisVersion++;
		loading = false;
	});

	const urlValidation = yup.object().shape({
		name: yup.string().required('データ名を入力してください。'),
		url: yup
			.string()
			.required('PMTilesのURLを入力してください。')
			.test('url-format', 'URLまたはファイルが必要です', (value) => {
				if (!value) return false;
				return (
					value.startsWith('http://') || value.startsWith('https://') || value.startsWith('blob:')
				);
			})
	});

	type FormSchema = yup.InferType<typeof urlValidation>;

	let forms = $state<FormSchema>({ name: '', url: '' });
	let isDisabled = $state<boolean>(true);
	let errors = $state<Partial<Record<keyof FormSchema, string>>>({});
	let isFromFile = $state<boolean>(false);

	// PMTiles解析結果
	let tileTypeLabel = $state<string>('');
	let isVector = $state<boolean>(false);
	let vectorLayers = $state<VectorTileMetadataLayer[]>([]);
	let selectedLayerId = $state<string>('');
	let analyzed = $state<boolean>(false);
	let pmtilesBbox = $state<[number, number, number, number] | null>(null);
	let pmtilesMinZoom = $state<number>(0);
	let pmtilesMaxZoom = $state<number>(24);

	// ジオメトリタイプ選択
	let geometryType = $state<VectorEntryGeometryType>('Point');

	const ALL_GEOMETRY_OPTIONS = [
		{ key: 'Point', name: 'ポイント' },
		{ key: 'LineString', name: 'ライン' },
		{ key: 'Polygon', name: 'ポリゴン' }
	];

	// 選択中レイヤーのgeometryTypeに応じて選択肢を絞る
	const geometryTypeOptions = $derived.by(() => {
		const layer = vectorLayers.find((l) => l.id === selectedLayerId);
		if (!layer?.geometryType) return ALL_GEOMETRY_OPTIONS;
		const gt = layer.geometryType.toLowerCase();
		if (gt.includes('point')) return ALL_GEOMETRY_OPTIONS.filter((o) => o.key === 'Point');
		if (gt.includes('line')) return ALL_GEOMETRY_OPTIONS.filter((o) => o.key !== 'Polygon');
		return ALL_GEOMETRY_OPTIONS; // Polygon → 全部選べる
	});

	const pmtilesFile = $derived.by(() => {
		if (!dropFile) return null;
		const file = getFirstUploadFile(dropFile);
		return file && /\.pmtiles$/i.test(file.name) ? file : null;
	});

	const getNameFromUrl = (url: string): string => {
		try {
			const pathname = new URL(url).pathname;
			const fileName = decodeURIComponent(pathname.split('/').pop() ?? 'pmtiles');
			return fileName.replace(/\.[^.]+$/, '') || 'pmtiles';
		} catch {
			return 'pmtiles';
		}
	};

	// ドロップファイルからBlobURLを生成
	$effect(() => {
		if (pmtilesFile) {
			const blobUrl = URL.createObjectURL(pmtilesFile);
			forms.url = blobUrl;
			forms.name = pmtilesFile.name.replace(/\.[^.]+$/, '');
			isFromFile = true;
			void analyzePmtiles(blobUrl);
			return () => {
				analysisVersion++;
				if (registeredUrl !== blobUrl) URL.revokeObjectURL(blobUrl);
			};
		}
	});

	$effect(() => {
		if (remotePmtilesUrl) {
			forms.url = remotePmtilesUrl;
			forms.name = getNameFromUrl(remotePmtilesUrl);
			isFromFile = false;
			analyzePmtiles(remotePmtilesUrl);
			remotePmtilesUrl = null;
		}
	});

	$effect(() => {
		try {
			urlValidation.validateSync(forms, { abortEarly: false });
			isDisabled = false;
			errors = {};
		} catch (error) {
			isDisabled = true;
			const newErrors: Record<string, string> = {};
			if (error instanceof yup.ValidationError && error.inner && Array.isArray(error.inner)) {
				error.inner.forEach((err: yup.ValidationError) => {
					if (err.path) {
						newErrors[err.path] = err.message;
					}
				});
			}
			errors = newErrors;
		}
	});

	const analyzePmtiles = async (url: string) => {
		const version = ++analysisVersion;
		loading = true;
		analysisError = '';
		analyzedUrl = '';
		analyzed = false;
		tileTypeLabel = '';
		isVector = false;
		vectorLayers = [];
		selectedLayerId = '';
		pmtilesBbox = null;
		pmtilesMinZoom = 0;
		pmtilesMaxZoom = 24;

		try {
			const pm = new PMTiles(url);
			const header = await pm.getHeader();
			if (disposed || version !== analysisVersion || !active) return;

			const tileType = header.tileType;
			isVector = tileType === TileType.Mvt;

			// bboxとズームレベルを取得
			if (header.minLon !== 0 || header.maxLon !== 0) {
				pmtilesBbox = [header.minLon, header.minLat, header.maxLon, header.maxLat];
			}
			pmtilesMinZoom = header.minZoom;
			pmtilesMaxZoom = header.maxZoom;

			const typeNames: Record<number, string> = {
				[TileType.Unknown]: '不明',
				[TileType.Mvt]: 'ベクター (MVT)',
				[TileType.Png]: 'ラスター (PNG)',
				[TileType.Jpeg]: 'ラスター (JPEG)',
				[TileType.Webp]: 'ラスター (WebP)',
				[TileType.Avif]: 'ラスター (AVIF)'
			};
			tileTypeLabel = typeNames[tileType] ?? '不明';

			if (isVector) {
				const metadata = (await pm.getMetadata()) as Record<string, unknown>;
				if (disposed || version !== analysisVersion || !active) return;
				const vlayers = metadata?.vector_layers as RawVectorTileLayerMetadata[] | undefined;
				const tilestats = metadata?.tilestats as
					| { layers?: RawVectorTileStatsLayerMetadata[] }
					| undefined;
				vectorLayers = mergeVectorTileMetadataLayers(vlayers, tilestats?.layers ?? []);

				if (vectorLayers.length === 1) {
					const layer = vectorLayers[0];
					selectedLayerId = layer.id;
					// ジオメトリタイプを自動設定
					if (layer.geometryType) {
						const gt = layer.geometryType.toLowerCase();
						if (gt.includes('point')) geometryType = 'Point';
						else if (gt.includes('line')) geometryType = 'LineString';
						else if (gt.includes('polygon')) geometryType = 'Polygon';
					}
				}
			} else {
				// ラスターはそのまま登録
				analyzed = true;
				analyzedUrl = url;
				registration();
				return;
			}

			analyzed = true;
			analyzedUrl = url;
		} catch (e) {
			if (!disposed && version === analysisVersion) {
				analysisError = 'PMTilesの解析に失敗しました。URLまたはファイルを確認してください。';
				showNotification(analysisError, 'error');
				console.error(e);
			}
		} finally {
			if (!disposed && version === analysisVersion) loading = false;
		}
	};

	const invalidateAnalysis = () => {
		analysisVersion++;
		analyzed = false;
		analyzedUrl = '';
		analysisError = '';
		tileTypeLabel = '';
		vectorLayers = [];
		selectedLayerId = '';
		loading = false;
	};

	const fetchAndAnalyze = () => {
		if (forms.url && !loading && active) {
			analyzePmtiles(forms.url.trim());
		}
	};

	const registration = () => {
		if (disposed || !active || !analyzed || analyzedUrl !== forms.url.trim() || !forms.name.trim())
			return;
		const opts = {
			bounds: pmtilesBbox ?? undefined,
			minZoom: pmtilesMinZoom,
			maxZoom: pmtilesMaxZoom
		};

		if (isVector) {
			if (!selectedLayerId) return;
			const selectedLayer = vectorLayers.find((layer) => layer.id === selectedLayerId);
			if (!selectedLayer) return;

			const fields = buildVectorTileFields(selectedLayer.fields);
			const entry = createVectorPmtilesEntry(
				forms.name,
				forms.url.trim(),
				selectedLayerId,
				geometryType,
				undefined,
				{
					...opts,
					fields,
					popupKeys: buildVectorTilePopupKeys(fields),
					titles: buildVectorTileTitles(fields, forms.name || selectedLayerId),
					colorExpressions: buildVectorTileColorExpressions(selectedLayer)
				}
			);
			if (entry) {
				registeredUrl = forms.url.trim();
				showDataEntry = entry;
				showDialogType = null;
				dropFile = null;
				remotePmtilesUrl = null;
			}
		} else {
			const entry = createPmtilesRasterEntry(forms.name, forms.url.trim(), opts);
			if (entry) {
				registeredUrl = forms.url.trim();
				showDataEntry = entry;
				showDialogType = null;
				dropFile = null;
				remotePmtilesUrl = null;
			}
		}
	};

	const cancel = () => {
		disposed = true;
		analysisVersion++;
		loading = false;
		showDialogType = null;
		dropFile = null;
		remotePmtilesUrl = null;
	};
</script>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-3 overflow-x-hidden overflow-y-auto"
>
	<TextForm bind:value={forms.name} label="データ名" error={errors.name} />

	{#if isFromFile}
		<div class="w-full px-2 text-sm text-gray-300">
			ファイル: {pmtilesFile?.name}
		</div>
	{:else}
		<div class="flex w-full items-center gap-2">
			<TextForm
				bind:value={forms.url}
				label="PMTiles URL"
				error={errors.url}
				onInput={invalidateAnalysis}
			/>
		</div>
	{/if}

	{#if loading}<p role="status" class="w-full text-sm">PMTilesを解析しています…</p>{/if}
	{#if analysisError}<p role="alert" class="w-full text-sm text-red-300">{analysisError}</p>{/if}
	{#if tileTypeLabel}
		<div transition:slide class="w-full text-sm text-gray-300">
			タイプ: {tileTypeLabel}
		</div>
	{/if}

	{#if isVector && vectorLayers.length > 0}
		<div transition:slide class="w-full">
			<div class="flex flex-col gap-1">
				<label for={`${id}-layer-select`} class="text-sm text-gray-300">ソースレイヤーを選択</label>
				<select
					id={`${id}-layer-select`}
					bind:value={selectedLayerId}
					onchange={() => {
						const layer = vectorLayers.find((l) => l.id === selectedLayerId);
						if (layer?.geometryType) {
							const gt = layer.geometryType.toLowerCase();
							if (gt.includes('point')) geometryType = 'Point';
							else if (gt.includes('line')) geometryType = 'LineString';
							else if (gt.includes('polygon')) geometryType = 'Polygon';
						}
					}}
					class="bg-sub rounded border border-gray-600 p-2 text-white"
				>
					<option value="" disabled>選択してください</option>
					{#each vectorLayers as layer (layer.id)}
						<option value={layer.id}>
							{layer.id}
							{#if layer.geometryType}
								[{layer.geometryType}]{/if}
							{#if Object.keys(layer.fields).length > 0}
								({Object.keys(layer.fields).length}フィールド)
							{/if}
						</option>
					{/each}
				</select>
			</div>
		</div>

		{#if selectedLayerId}
			<div transition:slide class="w-full p-2">
				<HorizontalSelectBox
					label="ジオメトリタイプ"
					bind:group={geometryType}
					options={geometryTypeOptions}
				/>
			</div>
		{/if}
	{/if}
</div>

<div class="flex shrink-0 flex-wrap justify-center gap-3 pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
	<button
		onclick={fetchAndAnalyze}
		disabled={isDisabled || loading}
		class="c-btn-confirm min-w-[150px] cursor-pointer p-4 text-lg {isDisabled || loading
			? 'cursor-not-allowed opacity-50'
			: ''}"
	>
		{loading ? '解析中…' : analyzed ? '再解析' : '解析'}
	</button>
	{#if analyzed}
		<button
			onclick={registration}
			disabled={loading || !forms.name.trim() || (isVector && !selectedLayerId)}
			class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg {loading ||
			(isVector && !selectedLayerId)
				? 'cursor-not-allowed opacity-50'
				: ''}"
		>
			登録
		</button>
	{/if}
</div>
