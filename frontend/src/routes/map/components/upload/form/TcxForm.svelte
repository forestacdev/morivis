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
	import { checkTcxFile, tcxFileToGeojson, type TcxDataType } from '$routes/map/utils/formats/tcx';
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

	let dataType = $state<TcxDataType>('track_points');
	let dataTypeOptions = $state<{ key: TcxDataType; name: string }[]>([]);
	let setFileName = $state<string>('');

	const tcxFile = $derived.by(() => {
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

	const applyTcxTemporalProperties = (entry: GeoDataEntry) => {
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
		setFileName = file.name.replace(/\.tcx$/i, '');
		isProcessing.set(true);

		try {
			const types = await checkTcxFile(file);
			const options: { key: TcxDataType; name: string }[] = [];
			if (types.track_points) {
				options.push({ key: 'track_points', name: 'トラックポイント' });
			}
			if (types.tracks) {
				options.push({ key: 'tracks', name: 'トラック' });
			}
			if (types.waypoints) {
				options.push({ key: 'waypoints', name: 'ラップ/コースポイント' });
			}

			if (options.length === 0) {
				showNotification('TCX から読み取れる位置情報が見つかりませんでした', 'error');
				cancel();
				return;
			}

			dataTypeOptions = options;
			dataType = options[0].key;
		} catch (error) {
			showNotification(error instanceof Error ? error.message : 'TCX の読み込みに失敗しました', 'error');
			cancel();
		} finally {
			isProcessing.set(false);
		}
	};

	$effect(() => {
		if (tcxFile) {
			setFile(tcxFile);
		}
	});

	const registration = async () => {
		if (!tcxFile) return;
		isProcessing.set(true);

		try {
			const geojsonData = await tcxFileToGeojson(tcxFile, dataType);
			const entryType = geometryTypeToEntryType(geojsonData);
			if (!entryType) {
				showNotification('TCX からレイヤーを作成できませんでした', 'error');
				return;
			}

			const bbox = turfBbox(geojsonData);
			const entry = await createGeoJsonEntry(
				geojsonData,
				entryType,
				setFileName,
				bbox as [number, number, number, number],
				undefined,
				{ attribution: 'TCX' }
			);

			if (!entry) {
				showNotification('TCX の登録に失敗しました', 'error');
				return;
			}

			applyTcxTemporalProperties(entry);
			showNotification('TCX を読み込みました', 'success');
			showDataEntry = entry;
			showDialogType = null;
		} catch (error) {
			showNotification(error instanceof Error ? error.message : 'TCX の変換に失敗しました', 'error');
		} finally {
			isProcessing.set(false);
		}
	};

	const cancel = () => {
		dropFile = null;
		showDialogType = null;
		dataTypeOptions = [];
	};
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">TCXファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-6 overflow-x-hidden overflow-y-auto"
>
	<div class="w-full space-y-4 p-2 text-sm">
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
