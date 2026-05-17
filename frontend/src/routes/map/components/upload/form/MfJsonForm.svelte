<script lang="ts">
	import turfBbox from '@turf/bbox';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import { createGeoJsonEntry, geometryTypeToEntryType } from '$routes/map/data/entries/vector';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import {
		formatDate,
		type FieldDef,
		type VectorTemporalItem
	} from '$routes/map/data/types/vector/properties';
	import type { DialogType } from '$routes/map/types';
	import { GeojsonCache } from '$routes/map/utils/cache/geojson-cache';
	import {
		inspectMfJsonFile,
		mfJsonFileToGeojson,
		type MfDataType
	} from '$routes/map/utils/formats/mf-json';
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

	let dataType = $state<MfDataType>('track_points');
	let dataTypeOptions = $state<{ key: MfDataType; name: string }[]>([]);
	let setFileName = $state<string>('');
	let summaryText = $state<string>('');

	const mfJsonFile = $derived.by(() => {
		if (!dropFile) return null;
		return dropFile instanceof FileList ? dropFile[0] : dropFile;
	});

	const getUpdatedTimeField = (field: FieldDef): FieldDef => ({
		...field,
		label: '時刻',
		type: 'datetime',
		format: {
			...field.format,
			date: {
				...(field.format?.date ?? {}),
				inputPatterns: ['YYYY-MM-DDTHH:mm:ss+HH:mm'],
				displayPattern: 'YYYY年M月D日 HH:mm:ss',
				invalidText: ''
			}
		}
	});

	const getTemporalItemsFromEntry = (entry: GeoDataEntry): VectorTemporalItem[] => {
		if (entry.type !== 'vector' || entry.format.type !== 'geojson') return [];

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
					inputPatterns: ['YYYY-MM-DDTHH:mm:ss+HH:mm'],
					displayPattern: 'YYYY年M月D日 HH:mm:ss',
					invalidText: raw
				})
			});
		}

		return Array.from(values.values()).sort((a, b) => a.timestamp - b.timestamp);
	};

	const applyTemporalProperties = (entry: GeoDataEntry) => {
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

	const setFile = async (file: File) => {
		setFileName = file.name.replace(/\.[^.]+$/i, '');
		isProcessing.set(true);

		try {
			const summary = await inspectMfJsonFile(file);
			const options: { key: MfDataType; name: string }[] = [];

			if (summary.pointCount > 0) {
				options.push({ key: 'track_points', name: `時刻ごとのポイント (${summary.pointCount})` });
			}
			if (summary.trackCount > 0) {
				options.push({ key: 'tracks', name: `軌跡ライン (${summary.trackCount})` });
			}
			if (summary.polygonCount > 0) {
				options.push({ key: 'polygons', name: `時刻ごとのポリゴン (${summary.polygonCount})` });
			}

			if (options.length === 0) {
				showNotification('MF-JSON から読み取れるジオメトリが見つかりませんでした', 'error');
				cancel();
				return;
			}

			dataTypeOptions = options;
			dataType = options[0].key;
			summaryText = `形式: ${summary.geometryType} / 時刻数: ${summary.timestamps.length}`;
		} catch (error) {
			showNotification(
				error instanceof Error ? error.message : 'MF-JSON の読み込みに失敗しました',
				'error'
			);
			cancel();
		} finally {
			isProcessing.set(false);
		}
	};

	$effect(() => {
		if (mfJsonFile) {
			setFile(mfJsonFile);
		}
	});

	const registration = async () => {
		if (!mfJsonFile) return;
		isProcessing.set(true);

		try {
			const geojsonData = await mfJsonFileToGeojson(mfJsonFile, dataType);
			const entryType = geometryTypeToEntryType(geojsonData);
			if (!entryType) {
				showNotification('MF-JSON からレイヤーを作成できませんでした', 'error');
				return;
			}

			const bbox = turfBbox(geojsonData);
			const entry = await createGeoJsonEntry(
				geojsonData,
				entryType,
				setFileName,
				bbox as [number, number, number, number],
				undefined,
				{ attribution: 'MF-JSON' }
			);

			if (!entry) {
				showNotification('MF-JSON の登録に失敗しました', 'error');
				return;
			}

			applyTemporalProperties(entry);
			showNotification('MF-JSON を読み込みました', 'success');
			showDataEntry = entry;
			showDialogType = null;
		} catch (error) {
			showNotification(
				error instanceof Error ? error.message : 'MF-JSON の変換に失敗しました',
				'error'
			);
		} finally {
			isProcessing.set(false);
		}
	};

	const cancel = () => {
		dropFile = null;
		showDialogType = null;
		dataTypeOptions = [];
		summaryText = '';
	};
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">MF-JSONファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-6 overflow-x-hidden overflow-y-auto"
>
	<div class="w-full space-y-4 p-2 text-sm">
		{#if summaryText}
			<p>{summaryText}</p>
		{/if}
		{#if dataTypeOptions.length > 1}
			<HorizontalSelectBox
				label="読み込むデータタイプを選択"
				bind:group={dataType}
				bind:options={dataTypeOptions}
			/>
		{:else if dataTypeOptions.length === 1}
			<p>読み込みタイプ: {dataTypeOptions[0].name}</p>
		{/if}
	</div>
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
	<button
		onclick={registration}
		disabled={dataTypeOptions.length === 0}
		class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg"
	>
		決定
	</button>
</div>
