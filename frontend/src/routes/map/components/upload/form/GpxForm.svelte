<script lang="ts">
	import turfBbox from '@turf/bbox';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import { createGeoJsonEntry } from '$routes/map/data/entries/vector';
	import { geometryTypeToEntryType } from '$routes/map/data/entries/vector';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import {
		formatDate,
		type FieldDef,
		type VectorTemporalItem
	} from '$routes/map/data/types/vector/properties';
	import type { DialogType } from '$routes/map/types';
	import { GeojsonCache } from '$routes/map/utils/cache/geojson-cache';
	import { gpxFileToGeojson, checkGpxFile, type DataType } from '$routes/map/utils/formats/gpx';
	import { showNotification } from '$routes/stores/notification';

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

	let dataType = $state<DataType>('waypoints');
	let dataTypesOptions = $state<
		{
			key: DataType;
			name: string;
		}[]
	>([]);

	let setFileName = $state<string>('');

	const setFile = async (file: File) => {
		const fileName = file.name.toLowerCase();
		setFileName = fileName;

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

		if (list.length === 1) {
			dataType = list[0].key;
			registration();
			return;
		}

		dataTypesOptions = list;
		dataType = list[0].key;
	};
	$effect(() => {
		if (dropFile) {
			if (dropFile instanceof FileList) {
				const file = dropFile[0];
				setFile(file);
				return;
			} else if (dropFile instanceof File) {
				setFile(dropFile);
				return;
			}
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

	const getTemporalItemsFromEntry = (entry: GeoDataEntry): VectorTemporalItem[] => {
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

	const applyGpxTemporalProperties = (entry: GeoDataEntry, currentDataType: DataType) => {
		if (entry.type !== 'vector') return;

		entry.properties.fields = entry.properties.fields.map((field) =>
			field.key === 'time' ? getUpdatedTimeField(field) : field
		);

		const hasTemporalAxis =
			currentDataType === 'tracks' ||
			currentDataType === 'track_points' ||
			currentDataType === 'waypoints';

		if (!hasTemporalAxis) return;

		entry.properties.temporal = {
			key: 'time',
			items: getTemporalItemsFromEntry(entry)
		};
		entry.properties.attributeView.timeKey = 'time';
	};

	const registration = async () => {
		if (!dropFile) {
			return;
		}
		let file;
		if (dropFile instanceof FileList) {
			file = dropFile[0];
		} else if (dropFile instanceof File) {
			file = dropFile;
		}

		if (!file) return;
		const geojsonData = await gpxFileToGeojson(file, dataType);
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
			applyGpxTemporalProperties(entry, dataType);
			showDataEntry = entry;
			showDialogType = null;
		}
	};

	const cancel = () => {
		dropFile = null;
		showDialogType = null;
	};
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">GPXファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-6 overflow-x-hidden overflow-y-auto"
>
	<div class="w-full p-2">
		<HorizontalSelectBox
			label="データタイプを選択"
			bind:group={dataType}
			bind:options={dataTypesOptions}
		/>
	</div>
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
	<button onclick={registration} class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg">
		決定
	</button>
</div>
