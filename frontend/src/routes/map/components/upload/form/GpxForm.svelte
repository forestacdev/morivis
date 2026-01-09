<script lang="ts">
	import type { DialogType } from '$routes/map/types';
	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import { createGeoJsonEntry } from '$routes/map/data';
	import { geometryTypeToEntryType } from '$routes/map/data';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { showNotification } from '$routes/stores/notification';
	import { gpxFileToGeojson, checkGpxFile, type DataType } from '$routes/map/utils/file/gpx';
	import turfBbox from '@turf/bbox';

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

		if (isGpx.tracks) {
			list.push({ key: 'tracks', name: 'トラック' });
		}
		if (isGpx.routes) {
			list.push({ key: 'routes', name: 'ルート' });
		}
		if (isGpx.waypoints) {
			list.push({ key: 'waypoints', name: 'ウェイポイント' });
		}

		if (list.length === 1) {
			dataType = list[0].key;
			registration();
			return;
		}

		dataTypesOptions = list;
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

		const entry = createGeoJsonEntry(
			geojsonData,
			entryGeometryType,
			setFileName,
			bbox as [number, number, number, number]
		);
		// const entry = createGeoJsonEntry(geojsonData, entryGeometryType, setFileName);
		if (entry) {
			showDataEntry = entry;
			showDialogType = null;
		}
	};

	const cancel = () => {
		showDialogType = null;
	};
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">GPXファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-6 overflow-x-hidden overflow-y-auto"
>
	<div class="p-2">
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
