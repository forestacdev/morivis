<script lang="ts">
	import turfBbox from '@turf/bbox';

	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import { createGeoJsonEntry, geometryTypeToEntryType } from '$routes/map/data/entries/vector';
	import { createMatchColorMapping } from '$routes/map/data/entries/vector/_style';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { FieldDef, VectorTemporalItem } from '$routes/map/data/types/vector/properties';
	import type { DialogType } from '$routes/map/types';
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import { loadGTFSFromFiles, loadGTFSFromZip } from '$routes/map/utils/formats/gtfs';
	import { readRoutes, readStops, readTimedStops } from '$routes/map/utils/formats/gtfs/parse';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	type DataType = 'stops' | 'routes' | 'stop_times';

	interface Props {
		showDataEntry: MorivisLayerEntry | null;
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
	let stopTimeCount = $state(0);

	let gtfsData = $state<Awaited<ReturnType<typeof loadGTFSFromZip>> | null>(null);

	const setFile = async (input: File | FileList) => {
		const files = input instanceof FileList ? Array.from(input) : [input];
		const primaryFile = files[0];
		if (!primaryFile) return;

		setFileName = primaryFile.name.replace(/\.zip$/i, '').replace(/\.txt$/i, '');
		isProcessing.set(true);

		try {
			const gtfs = input instanceof FileList
				? await loadGTFSFromFiles(files)
				: await loadGTFSFromZip(await primaryFile.arrayBuffer());
			gtfsData = gtfs;

			agencyName = gtfs.agency[0]?.agency_name ?? '';
			routeCount = gtfs.routes.length;
			stopCount = gtfs.stops.length;
			stopTimeCount = gtfs.stop_times.length;
			hasShapes = gtfs.shapes !== null && gtfs.shapes.length > 0;
		} catch (e) {
			console.error('GTFS load failed:', e);
			showNotification('GTFSの読み込みに失敗しました', 'error');
			cancel();
		} finally {
			isProcessing.set(false);
		}
	};

	$effect(() => {
		if (dropFile) {
			setFile(dropFile);
		}
	});

	const getUpdatedTimeField = (field: FieldDef): FieldDef => ({
		...field,
		label: field.key === 'time_seconds' ? '時刻秒' : '時刻'
	});

	const getTemporalItemsFromGeojson = (geojson: FeatureCollection): VectorTemporalItem[] => {
		const values = new Map<string, VectorTemporalItem>();

		for (const feature of geojson.features ?? []) {
			const properties = feature.properties as Record<string, unknown> | null | undefined;
			const rawValue = properties?.time;
			const secondsValue = properties?.time_seconds;
			if (rawValue == null || secondsValue == null) continue;

			const raw = String(rawValue);
			const timestamp = Number(secondsValue);
			if (raw === '' || Number.isNaN(timestamp) || values.has(raw)) continue;

			values.set(raw, {
				raw,
				timestamp,
				label: raw
			});
		}

		return Array.from(values.values()).sort((a, b) => a.timestamp - b.timestamp);
	};

	const applyGtfsTemporalProperties = (
		entry: MorivisLayerEntry,
		geojson: FeatureCollection,
		currentDataType: DataType
	) => {
		if (entry.type !== 'vector' || currentDataType !== 'stop_times') return;

		entry.properties.fields = entry.properties.fields.map((field) =>
			field.key === 'time' || field.key === 'time_seconds' ? getUpdatedTimeField(field) : field
		);

		const temporalItems = getTemporalItemsFromGeojson(geojson);
		if (temporalItems.length === 0) {
			showNotification('GTFS の stop_times から時間軸を作れませんでした', 'warning');
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

	const applyGtfsRouteColorStyle = (entry: MorivisLayerEntry, geojson: FeatureCollection) => {
		if (entry.type !== 'vector') return;

		const routeNamesSet = new Set<string>();
		const routeColorMap = new Map<string, string>();
		for (const feature of geojson.features ?? []) {
			const properties = feature.properties as Record<string, unknown> | null | undefined;
			const routeName = properties?.route_name;
			const routeColor = properties?.route_color;
			if (typeof routeName !== 'string' || routeName === '') continue;
			routeNamesSet.add(routeName);
			if (typeof routeColor !== 'string' || routeColor === '') continue;
			if (!routeColorMap.has(routeName)) {
				routeColorMap.set(routeName, routeColor);
			}
		}

		const routeNames = Array.from(routeNamesSet);
		if (routeNames.length === 0) return;

		const mapping = createMatchColorMapping(routeNames);
		mapping.values = routeNames.map(
			(routeName, index) => routeColorMap.get(routeName) ?? mapping.values[index]
		);

		const routeColorExpression = {
			type: 'match' as const,
			key: 'route_name',
			name: '路線色分け',
			mapping
		};

		entry.style.colors = {
			...entry.style.colors,
			key: 'route_name',
			show: true,
			expressions: [
				routeColorExpression,
				...entry.style.colors.expressions.filter((expression) => expression.key !== 'route_name')
			]
		};
	};

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
					const entry = await createGeoJsonEntry(
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
						applyGtfsRouteColorStyle(entry, stopsGeoJson);
						showDataEntry = entry;
					}
				}
			}

			if (dataType === 'routes') {
				const routesGeoJson = readRoutes(gtfsData) as unknown as FeatureCollection;
				const entryType = geometryTypeToEntryType(routesGeoJson);
				if (entryType) {
					const bbox = turfBbox(routesGeoJson);
					const entry = await createGeoJsonEntry(
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
						applyGtfsRouteColorStyle(entry, routesGeoJson);
						showDataEntry = entry;
					}
				}
			}

			if (dataType === 'stop_times') {
				const timedStopsGeoJson = readTimedStops(gtfsData) as unknown as FeatureCollection;
				const entryType = geometryTypeToEntryType(timedStopsGeoJson);
				if (entryType) {
					const bbox = turfBbox(timedStopsGeoJson);
					const entry = await createGeoJsonEntry(
						timedStopsGeoJson,
						entryType,
						setFileName,
						bbox as [number, number, number, number],
						undefined,
						{ attribution: agencyName || 'GTFS' }
					);

					if (entry) {
						entry.properties.attributeView.titles = [
							{
								conditions: ['route_name', 'stop_name', 'time'],
								template: `{route_name} {stop_name} {time}`
							},
							{
								conditions: ['stop_name', 'time'],
								template: `{stop_name} {time}`
							}
						];
						applyGtfsTemporalProperties(entry, timedStopsGeoJson, dataType);
						applyGtfsRouteColorStyle(entry, timedStopsGeoJson);
						showDataEntry = entry;
					}
				}
			}

			showDialogType = null;
		} catch (e) {
			console.error('GTFS conversion failed:', e);
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
				<p>stop_times 件数: {stopTimeCount}</p>
				<p>形状データ(shapes.txt): {hasShapes ? 'あり' : 'なし'}</p>
			</div>

			<HorizontalSelectBox
				label="データタイプを選択"
				bind:group={dataType}
				options={[
					{ key: 'routes', name: 'ルート' },
					{ key: 'stops', name: '停留所' },
					{ key: 'stop_times', name: '時刻付き停留所' }
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
