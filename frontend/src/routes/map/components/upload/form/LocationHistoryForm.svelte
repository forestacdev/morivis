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
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import {
		inspectLocationHistoryFile,
		locationHistoryFileToGeojson,
		type LocationHistoryDataType,
		type LocationHistorySummary
	} from '$routes/map/utils/formats/location-history';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		showDialogType: DialogType;
		dropFile: File | FileList | null;
	}

	type DataTypeOption = {
		key: LocationHistoryDataType;
		name: string;
	};

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable()
	}: Props = $props();

	let dataType = $state<LocationHistoryDataType>('visits');
	let dataTypeOptions = $state<DataTypeOption[]>([]);
	let setFileName = $state('');
	let summary = $state<LocationHistorySummary | null>(null);

	const locationHistoryFile = $derived.by(() => {
		if (!dropFile) return null;
		return dropFile instanceof FileList ? dropFile[0] : dropFile;
	});

	const buildOptionName = (summaryValue: LocationHistorySummary, key: LocationHistoryDataType) => {
		if (key === 'visits') {
			return `滞在地点 (${summaryValue.visitCount}件)`;
		}

		if (key === 'activities') {
			return `移動区間 (${summaryValue.activityCount}件)`;
		}

		return `タイムライン点列 (${summaryValue.timelinePointCount}点)`;
	};

	const createDataTypeOptions = (summaryValue: LocationHistorySummary): DataTypeOption[] => {
		const options: DataTypeOption[] = [];

		if (summaryValue.visitCount > 0) {
			options.push({
				key: 'visits',
				name: buildOptionName(summaryValue, 'visits')
			});
		}

		if (summaryValue.activityCount > 0) {
			options.push({
				key: 'activities',
				name: buildOptionName(summaryValue, 'activities')
			});
		}

		if (summaryValue.timelinePointCount > 0) {
			options.push({
				key: 'timeline_points',
				name: buildOptionName(summaryValue, 'timeline_points')
			});
		}

		return options;
	};

	const getEntryName = () => {
		if (dataType === 'activities') {
			return `${setFileName} 移動区間`;
		}

		if (dataType === 'timeline_points') {
			return `${setFileName} タイムライン`;
		}

		return `${setFileName} 滞在地点`;
	};

	const getUpdatedTimeField = (field: FieldDef): FieldDef => ({
		...field,
		label:
			field.key === 'start_time'
				? '開始時刻'
				: field.key === 'end_time' || field.key === 'segment_end_time'
					? '終了時刻'
					: field.key === 'segment_start_time'
						? '区間開始時刻'
						: '時刻',
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

	const getTemporalLabel = (raw: string) => {
		return formatDate(raw, {
			inputPatterns: ['YYYY-MM-DDTHH:mm:ss+HH:mm'],
			displayPattern: 'YYYY年M月D日 HH:mm:ss',
			invalidText: raw
		});
	};

	const getTemporalItemsFromGeojson = (geojson: FeatureCollection): VectorTemporalItem[] => {
		const values = new Map<string, VectorTemporalItem>();

		for (const feature of geojson.features ?? []) {
			const properties = feature.properties as Record<string, unknown> | null | undefined;
			const rawValue = properties?.time;
			if (rawValue == null || String(rawValue) === '') continue;

			const raw = String(rawValue);
			const timestamp = Date.parse(raw);
			if (Number.isNaN(timestamp) || values.has(raw)) continue;

			values.set(raw, {
				raw,
				timestamp,
				label: getTemporalLabel(raw)
			});
		}

		return Array.from(values.values()).sort((left, right) => left.timestamp - right.timestamp);
	};

	const applyFieldFormats = (entry: GeoDataEntry) => {
		if (entry.type !== 'vector') return;

		const timeFields = new Set([
			'time',
			'start_time',
			'end_time',
			'segment_start_time',
			'segment_end_time'
		]);

		entry.properties.fields = entry.properties.fields.map((field) =>
			timeFields.has(field.key) ? getUpdatedTimeField(field) : field
		);
	};

	const applyTemporalProperties = (entry: GeoDataEntry, geojson: FeatureCollection) => {
		if (entry.type !== 'vector') return;

		const temporalItems = getTemporalItemsFromGeojson(geojson);
		if (temporalItems.length === 0) return;

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

	const applyAttributeView = (entry: GeoDataEntry) => {
		if (entry.type !== 'vector') return;

		if (dataType === 'visits') {
			entry.properties.attributeView.popupKeys = [
				'time',
				'end_time',
				'duration_minutes',
				'semantic_type',
				'place_id',
				'visit_probability',
				'candidate_probability'
			];
			entry.properties.attributeView.titles = [
				{
					conditions: ['semantic_type', 'time'],
					template: `{semantic_type} {time}`
				},
				{
					conditions: ['time'],
					template: `{time}`
				}
			];
			return;
		}

		if (dataType === 'activities') {
			entry.properties.attributeView.popupKeys = [
				'time',
				'end_time',
				'duration_minutes',
				'activity_type',
				'distance_meters',
				'activity_probability',
				'record_probability'
			];
			entry.properties.attributeView.titles = [
				{
					conditions: ['activity_type', 'time'],
					template: `{activity_type} {time}`
				},
				{
					conditions: ['time'],
					template: `{time}`
				}
			];
			return;
		}

		entry.properties.attributeView.popupKeys = [
			'time',
			'duration_minutes_offset',
			'segment_start_time',
			'segment_end_time',
			'segment_index',
			'point_index'
		];
		entry.properties.attributeView.titles = [
			{
				conditions: ['time'],
				template: `{time}`
			}
		];
	};

	const setFile = async (file: File) => {
		setFileName = file.name.replace(/\.[^.]+$/, '');
		isProcessing.set(true);

		try {
			const nextSummary = await inspectLocationHistoryFile(file);
			const options = createDataTypeOptions(nextSummary);

			if (options.length === 0) {
				showNotification('Location History から読み取れる位置情報が見つかりませんでした', 'error');
				cancel();
				return;
			}

			summary = nextSummary;
			dataTypeOptions = options;
			dataType = options[0].key;
		} catch (error) {
			showNotification(
				error instanceof Error ? error.message : 'Location History の読み込みに失敗しました',
				'error'
			);
			cancel();
		} finally {
			isProcessing.set(false);
		}
	};

	$effect(() => {
		if (locationHistoryFile) {
			setFile(locationHistoryFile);
		}
	});

	const registration = async () => {
		if (!locationHistoryFile) return;
		isProcessing.set(true);

		try {
			const geojsonData = (await locationHistoryFileToGeojson(
				locationHistoryFile,
				dataType
			)) as FeatureCollection;
			const entryType = geometryTypeToEntryType(geojsonData);
			if (!entryType || geojsonData.features.length === 0) {
				showNotification('Location History からレイヤーを作成できませんでした', 'error');
				return;
			}

			const bbox = turfBbox(geojsonData);
			const entry = await createGeoJsonEntry(
				geojsonData,
				entryType,
				getEntryName(),
				bbox as [number, number, number, number],
				undefined,
				{ attribution: 'Location History' }
			);

			if (!entry) {
				showNotification('Location History の登録に失敗しました', 'error');
				return;
			}

			applyFieldFormats(entry);
			applyTemporalProperties(entry, geojsonData);
			applyAttributeView(entry);

			showNotification('Location History を読み込みました', 'success');
			showDataEntry = entry;
			showDialogType = null;
		} catch (error) {
			showNotification(
				error instanceof Error ? error.message : 'Location History の変換に失敗しました',
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
		summary = null;
	};
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">Location History ファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-6 overflow-x-hidden overflow-y-auto"
>
	<div class="w-full space-y-4 p-2 text-sm">
		{#if summary}
			<div class="text-sub space-y-1">
				<p>滞在地点: {summary.visitCount}件</p>
				<p>移動区間: {summary.activityCount}件</p>
				<p>タイムライン区間: {summary.timelineSegmentCount}件</p>
				<p>タイムライン点: {summary.timelinePointCount}点</p>
			</div>
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

		{#if dataType === 'visits'}
			<p class="text-sub">各滞在記録をポイントとして読み込みます。時刻は開始時刻で扱います。</p>
		{/if}
		{#if dataType === 'activities'}
			<p class="text-sub">
				各移動記録を始点と終点を結ぶラインとして読み込みます。時刻は開始時刻で扱います。
			</p>
		{/if}
		{#if dataType === 'timeline_points'}
			<p class="text-sub">
				`timelinePath`
				の各点をポイントとして読み込みます。開始時刻とオフセットから各点の時刻を作ります。
			</p>
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
