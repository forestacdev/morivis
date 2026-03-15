<script lang="ts">
	import * as yup from 'yup';
	import { PMTiles, TileType } from 'pmtiles';
	import { slide } from 'svelte/transition';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import { createPmtilesEntry } from '$routes/map/data/entries/raster';
	import { createVectorPmtilesEntry } from '$routes/map/data/entries/vector';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
	import type { DialogType } from '$routes/map/types';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		showDialogType: DialogType;
		dropFile: File | FileList | null;
	}

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable()
	}: Props = $props();

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
	let vectorLayers = $state<{ id: string; fields: Record<string, string> }[]>([]);
	let selectedLayerId = $state<string>('');
	let analyzed = $state<boolean>(false);

	// ジオメトリタイプ選択
	let geometryType = $state<VectorEntryGeometryType>('Point');
	let geometryTypeOptions = $state([
		{ key: 'Point', name: 'ポイント' },
		{ key: 'LineString', name: 'ライン' },
		{ key: 'Polygon', name: 'ポリゴン' }
	]);

	const pmtilesFile = $derived.by(() => {
		if (!dropFile) return null;
		return dropFile instanceof FileList ? dropFile[0] : dropFile;
	});

	// ドロップファイルからBlobURLを生成
	$effect(() => {
		if (pmtilesFile) {
			const blobUrl = URL.createObjectURL(pmtilesFile);
			forms.url = blobUrl;
			forms.name = pmtilesFile.name.replace(/\.[^.]+$/, '');
			isFromFile = true;
			analyzePmtiles(blobUrl);
		}
	});

	$effect(() => {
		urlValidation
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

	const analyzePmtiles = async (url: string) => {
		isProcessing.set(true);
		analyzed = false;
		tileTypeLabel = '';
		isVector = false;
		vectorLayers = [];
		selectedLayerId = '';

		try {
			const pm = new PMTiles(url);
			const header = await pm.getHeader();

			const tileType = header.tileType;
			isVector = tileType === TileType.Mvt;

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
				const vlayers = metadata?.vector_layers as
					| { id: string; fields: Record<string, string> }[]
					| undefined;
				const tilestats = metadata?.tilestats as { layers: { layer: string }[] } | undefined;

				if (vlayers && Array.isArray(vlayers)) {
					vectorLayers = vlayers.map((l) => ({
						id: l.id,
						fields: l.fields ?? {}
					}));
				} else if (tilestats?.layers && Array.isArray(tilestats.layers)) {
					vectorLayers = tilestats.layers.map((l) => ({
						id: l.layer,
						fields: {}
					}));
				}

				if (vectorLayers.length === 1) {
					selectedLayerId = vectorLayers[0].id;
				}
			} else {
				// ラスターはそのまま登録
				analyzed = true;
				registration();
				return;
			}

			analyzed = true;
		} catch (e) {
			showNotification('PMTilesの解析に失敗しました', 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	const fetchAndAnalyze = () => {
		if (forms.url) {
			analyzePmtiles(forms.url.trim());
		}
	};

	const registration = () => {
		if (isVector) {
			if (!selectedLayerId) return;
			const entry = createVectorPmtilesEntry(
				forms.name,
				forms.url.trim(),
				selectedLayerId,
				geometryType
			);
			if (entry) {
				showDataEntry = entry;
				showDialogType = null;
				dropFile = null;
			}
		} else {
			const entry = createPmtilesEntry(forms.name, forms.url.trim());
			if (entry) {
				showDataEntry = entry;
				showDialogType = null;
				dropFile = null;
			}
		}
	};

	const cancel = () => {
		showDialogType = null;
		dropFile = null;
	};
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">PMTilesの登録</span>
</div>

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
			<TextForm bind:value={forms.url} label="PMTiles URL" error={errors.url} />
		</div>
	{/if}

	{#if tileTypeLabel}
		<div transition:slide class="w-full text-sm text-gray-300">
			タイプ: {tileTypeLabel}
		</div>
	{/if}

	{#if isVector && vectorLayers.length > 0}
		<div transition:slide class="w-full">
			<div class="flex flex-col gap-1">
				<label for="layer-select" class="text-sm text-gray-300">ソースレイヤーを選択</label>
				<select
					id="layer-select"
					bind:value={selectedLayerId}
					class="bg-sub rounded border border-gray-600 p-2 text-white"
				>
					<option value="" disabled>選択してください</option>
					{#each vectorLayers as layer}
						<option value={layer.id}>
							{layer.id}
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

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
	<button
		onclick={fetchAndAnalyze}
		disabled={isDisabled || $isProcessing}
		class="c-btn-confirm min-w-[150px] cursor-pointer p-4 text-lg {isDisabled || $isProcessing
			? 'cursor-not-allowed opacity-50'
			: ''}"
	>
		{analyzed ? '再解析' : '決定'}
	</button>
	{#if analyzed}
		<button
			onclick={registration}
			disabled={$isProcessing || (isVector && !selectedLayerId)}
			class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg {$isProcessing ||
			(isVector && !selectedLayerId)
				? 'cursor-not-allowed opacity-50'
				: ''}"
		>
			決定
		</button>
	{/if}
</div>
