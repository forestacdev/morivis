<script lang="ts">
	import turfBbox from '@turf/bbox';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import { createGeoJsonEntry, geometryTypeToEntryType } from '$routes/map/data/entries/vector';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { DialogType } from '$routes/map/types';
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import { loadGTFSFromZip } from '$routes/map/utils/formats/gtfs';
	import { readStops, readRoutes } from '$routes/map/utils/formats/gtfs/parse';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	type DataType = 'stops' | 'routes';

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

	let dataType = $state<DataType>('routes');
	let setFileName = $state<string>('');
	let agencyName = $state<string>('');
	let routeCount = $state(0);
	let stopCount = $state(0);
	let hasShapes = $state(false);

	let gtfsData = $state<Awaited<ReturnType<typeof loadGTFSFromZip>> | null>(null);

	const setFile = async (file: File) => {
		setFileName = file.name.replace(/\.zip$/i, '');
		isProcessing.set(true);

		try {
			const buffer = await file.arrayBuffer();
			const gtfs = await loadGTFSFromZip(buffer);
			gtfsData = gtfs;

			agencyName = gtfs.agency[0]?.agency_name ?? '';
			routeCount = gtfs.routes.length;
			stopCount = gtfs.stops.length;
			hasShapes = gtfs.shapes !== null && gtfs.shapes.length > 0;
		} catch (e) {
			showNotification(
				`GTFSの読み込みに失敗しました: ${e instanceof Error ? e.message : String(e)}`,
				'error'
			);
			cancel();
		} finally {
			isProcessing.set(false);
		}
	};

	$effect(() => {
		if (dropFile) {
			const file = dropFile instanceof FileList ? dropFile[0] : dropFile;
			if (file) setFile(file);
		}
	});

	const registration = async () => {
		if (!gtfsData) return;
		isProcessing.set(true);

		try {
			if (dataType === 'stops') {
				const stopsGeoJson = readStops(gtfsData, {
					ignoreNoRoute: false
				}) as unknown as FeatureCollection;
				const entryType = geometryTypeToEntryType(stopsGeoJson);
				if (entryType) {
					const bbox = turfBbox(stopsGeoJson);
					const entry = createGeoJsonEntry(
						stopsGeoJson,
						entryType,
						setFileName,
						bbox as [number, number, number, number],
						undefined,
						{ attribution: agencyName || 'GTFS' }
					);

					if (entry) {
						entry.properties.attributeView.titles = [
							{
								conditions: ['stop_name'],
								template: `{stop_name}`
							}
						];
						showDataEntry = entry;
					}
				}
			}

			if (dataType === 'routes') {
				const routesGeoJson = readRoutes(gtfsData) as unknown as FeatureCollection;
				const entryType = geometryTypeToEntryType(routesGeoJson);
				if (entryType) {
					const bbox = turfBbox(routesGeoJson);
					const entry = createGeoJsonEntry(
						routesGeoJson,
						entryType,
						setFileName,
						bbox as [number, number, number, number],
						undefined,
						{ attribution: agencyName || 'GTFS' }
					);

					if (entry) {
						entry.properties.attributeView.titles = [
							{
								conditions: ['route_name'],
								template: `{route_name}`
							}
						];
						showDataEntry = entry;
					}
				}
			}

			showDialogType = null;
		} catch (e) {
			showNotification(
				`GTFSの変換に失敗しました: ${e instanceof Error ? e.message : String(e)}`,
				'error'
			);
		} finally {
			isProcessing.set(false);
		}
	};

	const cancel = () => {
		dropFile = null;
		showDialogType = null;
		gtfsData = null;
	};
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">GTFSファイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-6 overflow-x-hidden overflow-y-auto"
>
	{#if gtfsData}
		<div class="w-full space-y-4 p-2">
			<div class="text-sm opacity-70">
				{#if agencyName}
					<p>事業者: {agencyName}</p>
				{/if}
				<p>路線数: {routeCount} / 停留所数: {stopCount}</p>
				<p>形状データ(shapes.txt): {hasShapes ? 'あり' : 'なし'}</p>
			</div>

			<HorizontalSelectBox
				label="データタイプを選択"
				bind:group={dataType}
				options={[
					{ key: 'routes', name: 'ルート' },
					{ key: 'stops', name: '停留所' }
				]}
			/>
		</div>
	{/if}
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
	<button
		onclick={registration}
		disabled={!gtfsData}
		class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg"
	>
		決定
	</button>
</div>
