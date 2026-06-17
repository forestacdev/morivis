<script lang="ts">
	import turfBbox from '@turf/bbox';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import { createGeoJsonEntry } from '$routes/map/data/entries/vector';
	import { geometryTypeToEntryType } from '$routes/map/data/entries/vector';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import {
		formatDate,
		type FieldDef,
		type VectorTemporalItem
	} from '$routes/map/data/types/vector/properties';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import { GeojsonCache } from '$routes/map/utils/cache/geojson-cache';
	import { gpxFileToGeojson, checkGpxFile, type DataType } from '$routes/map/utils/formats/gpx';
	import { getFirstUploadFile } from '$routes/map/utils/upload-matchers-common';
	import { showNotification } from '$routes/stores/notification';

	interface Props {
		showDataEntry: MorivisLayerEntry | null;
		showDialogType: DialogType;
		dropFile: UploadFilesInput;
	}

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable()
	}: Props = $props();

	let dataType = $state<DataType>('waypoints');
	let dataTypesOptions = $state<
		{
			key: DataType;
			name: string;
		}[]
	>([]);
	let dataTypeErrorMessage = $state('');

	let setFileName = $state<string>('');

	const gpxFile = $derived.by(() => {
		if (!dropFile) return null;
		return getFirstUploadFile(dropFile);
	});

	const setFile = async (file: File) => {
		const fileName = file.name.toLowerCase();
		setFileName = fileName;
		dataTypeErrorMessage = '';
		dataTypesOptions = [];

		const isGpx = await checkGpxFile(file);

		const list: {
			key: DataType;
			name: string;
		}[] = [];

		if (isGpx.track_points) {
			list.push({ key: 'track_points', name: 'トラックポイント' });
		}
		if (isGpx.waypoints) {
			list.push({ key: 'waypoints', name: 'ウェイポイント' });
		}
		if (isGpx.tracks) {
			list.push({ key: 'tracks', name: 'トラック' });
		}
		if (isGpx.routes) {
			list.push({ key: 'routes', name: 'ルート' });
		}

		if (list.length === 0) {
			dataTypeErrorMessage =
				'この GPX ファイルから読み込めるウェイポイント・トラック・ルートが見つかりませんでした。';
			showNotification(dataTypeErrorMessage, 'warning');
			return;
		}

		if (list.length === 1) {
			const onlyDataType = list[0].key;
			dataType = onlyDataType;
			await registration(onlyDataType);
			return;
		}

		dataTypesOptions = list;
		dataType = list[0].key;
	};
	$effect(() => {
		if (gpxFile) {
			setFile(gpxFile);
		}
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

	const getTemporalItemsFromEntry = (entry: MorivisLayerEntry): VectorTemporalItem[] => {
		if (entry.type !== 'vector') return [];
		if (entry.format.type !== 'geojson') return [];

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

	const applyGpxTemporalProperties = (entry: MorivisLayerEntry, currentDataType: DataType) => {
		if (entry.type !== 'vector') return;

		entry.properties.fields = entry.properties.fields.map((field) =>
			field.key === 'time' ? getUpdatedTimeField(field) : field
		);

		const hasTemporalAxis =
			currentDataType === 'tracks' ||
			currentDataType === 'track_points' ||
			currentDataType === 'waypoints';

		if (!hasTemporalAxis) return;

		const temporalItems = getTemporalItemsFromEntry(entry);
		if (temporalItems.length === 0) {
			showNotification('「time」フィールドが見つかりませんでした', 'warning');
			return;
		}

		entry.properties.temporal = {
			dimension: {
				type: 'time',
				values: temporalItems.map((item) => item.raw),
				labels: temporalItems.map((item) => item.label)
			},
			behaviors: [{ type: 'filter', key: 'time' }],
			items: temporalItems
		};
		entry.properties.attributeView.timeKey = 'time';
	};

	const registration = async (selectedDataType = dataType) => {
		if (!gpxFile) {
			showNotification('GPX ファイルが選択されていません', 'warning');
			return;
		}

		if (dataTypesOptions.length === 0 && dataTypeErrorMessage) {
			showNotification(dataTypeErrorMessage, 'warning');
			return;
		}
		const geojsonData = await gpxFileToGeojson(gpxFile, selectedDataType);
		const entryGeometryType = geometryTypeToEntryType(geojsonData);
		if (!entryGeometryType) {
			showNotification('対応していないジオメトリタイプです', 'error');
			return;
		}

		const bbox = turfBbox(geojsonData);

		const entry = await createGeoJsonEntry(
			geojsonData,
			entryGeometryType,
			setFileName,
			bbox as [number, number, number, number],
			undefined,
			{ attribution: 'GPX' }
		);
		// const entry = createGeoJsonEntry(geojsonData, entryGeometryType, setFileName);
		if (entry) {
			applyGpxTemporalProperties(entry, selectedDataType);
			showDataEntry = entry;
			showDialogType = null;
		}
	};

	const cancel = () => {
		dropFile = null;
		dataTypesOptions = [];
		dataTypeErrorMessage = '';
		showDialogType = null;
	};
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">GPXファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-6 overflow-x-hidden overflow-y-auto"
>
	<div class="w-full space-y-4 p-2 text-sm">
		{#if dataTypesOptions.length > 1}
			<HorizontalSelectBox
				label="データタイプを選択"
				bind:group={dataType}
				bind:options={dataTypesOptions}
			/>
		{:else if dataTypesOptions.length === 1}
			<p>読み込みタイプ: {dataTypesOptions[0].name}</p>
		{:else if dataTypeErrorMessage}
			<p class="text-sm text-red-300">{dataTypeErrorMessage}</p>
		{/if}
	</div>
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
	<button
		onclick={() => registration()}
		class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg"
	>
		決定
	</button>
</div>
