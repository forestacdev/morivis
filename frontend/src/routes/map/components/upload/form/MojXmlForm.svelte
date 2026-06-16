<script lang="ts">
	import turfBbox from '@turf/bbox';
	import JSZip from 'jszip';
	import proj4 from 'proj4';
	import { untrack } from 'svelte';

	import type {
		PendingZoneGeoRefData,
		TransformOptionMode
	} from '$routes/map/components/upload/form/pending-zone-vector';
	import {
		createGeoJsonEntry,
		getGeometryTypes,
		filterByGeometryType
	} from '$routes/map/data/entries/vector';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import { parseMojXml } from '$routes/map/utils/formats/mojxml';
	import { isBboxValid } from '$routes/map/utils/map/bbox';
	import { transformGeoJSONParallel } from '$routes/map/utils/proj';
	import { getProjContext, type EpsgCode } from '$routes/map/utils/proj/dict';
	import { toUploadFiles } from '$routes/map/utils/upload-matchers-common';
	import { showConfirmDialog } from '$routes/stores/confirmation';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDataEntry: MorivisLayerEntry | null;
		showDialogType: DialogType;
		dropFile: UploadFilesInput;
		transformOptionMode: TransformOptionMode;
		focusBbox: [number, number, number, number] | null;
		zoneConfirmedEpsg: EpsgCode | null;
		pendingZoneGeoRefData: PendingZoneGeoRefData | null;
		selectedEpsgCode: EpsgCode;
	}

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable(),
		transformOptionMode = $bindable(),
		focusBbox = $bindable(),
		zoneConfirmedEpsg = $bindable(),
		pendingZoneGeoRefData = $bindable(),
		selectedEpsgCode = $bindable()
	}: Props = $props();

	let rawGeojson: FeatureCollection | null = null;
	let hasData = $state(false);

	const mojFiles = $derived.by(() => {
		const files = toUploadFiles(dropFile);
		return files.length > 0 ? files : null;
	});

	const entryName = $derived(mojFiles?.[0]?.name.replace(/\.[^.]+$/, '') ?? '地図XML');

	$effect(() => {
		if (mojFiles && mojFiles.length > 0) {
			processFile();
		}
	});

	const parseXmlStrings = async (xmlStrings: string[]): Promise<FeatureCollection> => {
		const allFeatures: FeatureCollection['features'] = [];
		for (const xmlString of xmlStrings) {
			const geojson = (await parseMojXml(
				xmlString,
				{ includeArbitraryCrs: true },
				proj4
			)) as unknown as FeatureCollection;
			allFeatures.push(...geojson.features);
		}
		return { type: 'FeatureCollection', features: allFeatures };
	};

	const readXmlFromZip = async (file: File): Promise<string[]> => {
		const zip = await JSZip.loadAsync(file);
		const xmlNames: string[] = [];
		zip.forEach((path, entry) => {
			if (!entry.dir && path.toLowerCase().endsWith('.xml')) {
				xmlNames.push(path);
			}
		});
		return Promise.all(xmlNames.map((name) => zip.file(name)!.async('string')));
	};

	const processFile = async () => {
		if (!mojFiles || mojFiles.length === 0) return;
		isProcessing.set(true);

		try {
			const zipFile = mojFiles.find((file) => file.name.toLowerCase().endsWith('.zip')) ?? null;
			const xmlFiles = mojFiles.filter((file) => file.name.toLowerCase().endsWith('.xml'));
			const xmlStrings = zipFile
				? await readXmlFromZip(zipFile)
				: await Promise.all(xmlFiles.map((file) => file.text()));

			const geojson = await parseXmlStrings(xmlStrings);

			if (!geojson.features.length) {
				showNotification('フィーチャが見つかりませんでした', 'error');
				return;
			}

			rawGeojson = geojson;
			hasData = true;
			registerEntry();
		} catch (e) {
			showNotification('地図XMLファイルの読み込みに失敗しました', 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	const registerEntry = async () => {
		if (!rawGeojson) return;

		const types = getGeometryTypes(rawGeojson);
		const geometryType: VectorEntryGeometryType = types[0] ?? 'Polygon';

		const filtered = types.length > 1 ? filterByGeometryType(rawGeojson, geometryType) : rawGeojson;

		if (!filtered || filtered.features.length === 0) {
			showNotification('フィーチャが見つかりませんでした', 'error');
			return;
		}

		const bbox = turfBbox(filtered);

		if (!bbox || !isBboxValid(bbox)) {
			// 任意座標系 → 確認ダイアログを表示してから座標系選択へ
			await showConfirmDialog({
				message: 'このファイルは任意座標系のため、地図上の正しい位置に表示できません。',
				confirmText: 'OK',
				confirmOnly: true
			});
			pendingZoneGeoRefData = {
				featureCollection: filtered,
				entryName
			};
			transformOptionMode = 'zone';
			focusBbox = bbox as [number, number, number, number];
			return;
		}

		const entry = await createGeoJsonEntry(
			filtered,
			geometryType,
			entryName,
			bbox as [number, number, number, number],
			undefined,
			{ attribution: '法務局地図XML' }
		);

		if (entry) {
			showDataEntry = entry;
			showDialogType = null;
			showNotification('地図XMLファイルを読み込みました', 'success');
		} else {
			showNotification('データが不正です', 'error');
		}
	};

	// 座標系選択後 → 座標変換してエントリ作成
	const convertAndCreateEntry = async (epsgCode: EpsgCode) => {
		if (!rawGeojson) return;
		isProcessing.set(true);

		try {
			const prjContent = getProjContext(epsgCode);
			const transformedGeojson = (await transformGeoJSONParallel(
				rawGeojson,
				prjContent
			)) as FeatureCollection;

			const types = getGeometryTypes(transformedGeojson);
			const geometryType: VectorEntryGeometryType = types[0] ?? 'Polygon';

			const filtered =
				types.length > 1
					? filterByGeometryType(transformedGeojson, geometryType)
					: transformedGeojson;

			if (!filtered || filtered.features.length === 0) {
				showNotification('変換後のフィーチャが見つかりませんでした', 'error');
				return;
			}

			const bbox = turfBbox(filtered);
			if (!bbox || !isBboxValid(bbox)) {
				showNotification('座標変換に失敗しました。座標系を確認してください', 'error');
				return;
			}

			const entry = await createGeoJsonEntry(
				filtered,
				geometryType,
				entryName,
				bbox as [number, number, number, number],
				undefined,
				{ attribution: '法務局地図XML' }
			);

			if (entry) {
				showDataEntry = entry;
				showDialogType = null;
				showNotification('地図XMLファイルを読み込みました', 'success');
			}
		} catch (e) {
			showNotification('座標変換中にエラーが発生しました', 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	$effect(() => {
		if (zoneConfirmedEpsg && showDialogType === 'mojxml') {
			const epsg = zoneConfirmedEpsg;
			untrack(() => {
				zoneConfirmedEpsg = null;
				convertAndCreateEntry(epsg);
			});
		}
	});

	const cancel = () => {
		dropFile = null;
		showDialogType = null;
	};
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">法務局地図XMLの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-6 overflow-x-hidden overflow-y-auto"
>
	<div class="w-full p-2">
		<p class="text-sm text-gray-400">ファイルを読み込み中...</p>
	</div>
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
	<button
		onclick={registerEntry}
		disabled={$isProcessing || !hasData}
		class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg {$isProcessing || !hasData
			? 'cursor-not-allowed opacity-50'
			: ''}"
	>
		決定
	</button>
</div>
