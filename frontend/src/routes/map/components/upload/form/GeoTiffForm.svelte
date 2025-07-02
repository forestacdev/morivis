<script lang="ts">
	import type { DialogType } from '$routes/map/+page.svelte';
	import { createGeoJsonEntry } from '$routes/map/data';
	import { geometryTypeToEntryType } from '$routes/map/data';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { notificationMessage, showNotification } from '$routes/stores/notification';
	import { loadRasterData, loadToGeotiffFile } from '$routes/map/utils/file/geotiff';
	import { gpxFileToGeojson } from '$routes/map/utils/file/gpx';

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

	let setFileName = $state<string>('');

	const setFile = async (file: File) => {
		const fileName = file.name.toLowerCase();
		setFileName = fileName;
		const id = `${file.name}_${file.size}_${file.lastModified}`;
		const hoge = await loadToGeotiffFile(id, file);
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

		const entry = createGeoJsonEntry(geojsonData, entryGeometryType, setFileName);
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
	<span class="text-2xl font-bold">GeoTIFFファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-6 overflow-y-auto overflow-x-hidden"
></div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-cancel cursor-pointer p-4 text-lg"> キャンセル </button>
	<button onclick={registration} class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg">
		決定
	</button>
</div>
