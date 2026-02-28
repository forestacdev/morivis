<script lang="ts">
	import turfBbox from '@turf/bbox';
	import maplibregl from 'maplibre-gl';

	import {
		createGeoJsonEntry,
		getGeometryTypes,
		filterByGeometryType
	} from '$routes/map/data/entries/vector';
	import { geometryTypeToEntryType } from '$routes/map/data/entries/vector';
	import type { VecterStyleType } from '$routes/map/data/entries/vector';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { DialogType } from '$routes/map/types';
	import type { FeatureCollection } from '$routes/map/types/geojson';
	import { fgbFileToGeojson } from '$routes/map/utils/file/fgb';
	import { geoJsonFileToGeoJson } from '$routes/map/utils/file/geojson';
	import {
		cprClpToOrbitTrackGeojson,
		cprFmrToOrbitTrackGeojson,
		msiClpToOrbitTrackGeojson,
		getHdf5FileInfo
	} from '$routes/map/utils/file/hdf5';
	import { shpFileToGeojson } from '$routes/map/utils/file/shp';
	import { isBboxValid } from '$routes/map/utils/map';
	import { readPrjFileContent } from '$routes/map/utils/proj';
	import { getProjContext } from '$routes/map/utils/proj/dict';
	import { showNotification } from '$routes/stores/notification';

	interface Props {
		map: maplibregl.Map;
		isDragover: boolean;
		dropFile: File | FileList | null;
		tempLayerEntries: GeoDataEntry[];
		showDataEntry: GeoDataEntry | null;
		showDialogType: DialogType;
		showZoneForm: boolean; // 座標系フォームの表示状態
		focusBbox: [number, number, number, number] | null; // フォーカスするバウンディングボックス
	}

	let {
		map,
		isDragover = $bindable(),
		dropFile = $bindable(),
		tempLayerEntries = $bindable(),
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		showZoneForm = $bindable(),
		focusBbox = $bindable()
	}: Props = $props();

	let fileName = $state<string>('');

	const setFile = async (file: File | FileList) => {
		let geojsonData: FeatureCollection = { type: 'FeatureCollection', features: [] };
		let styleType: VecterStyleType = 'default';
		if (file instanceof File) {
			const ext = file.name.split('.').pop()?.toLowerCase();
			fileName = file.name;

			switch (ext) {
				// TODO:CSV
				// case 'csv':
				// 	geojsonData = await csvFileToGeojson(file);
				// 	break;
				case 'geojson':
					geojsonData = await geoJsonFileToGeoJson(file);
					break;
				case 'fgb':
					geojsonData = await fgbFileToGeojson(file);
					break;
				case 'gpx':
					showDialogType = 'gpx';
					return;
				case 'dm':
					showDialogType = 'dm';
					return;
                case 'dxf':
					showDialogType = 'dxf';
					return;
				case 'shp':
				case 'dbf':
				case 'shx':
				case 'prj':
					showDialogType = 'shp';
					return;
				case 'h5':
					// データセット一覧を確認

					if (import.meta.env.MODE !== 'production') {
						const info = await getHdf5FileInfo(file);
						console.log(info);
					}

					if (file.name.includes('ECA_J_CPR_CLP')) {
						geojsonData = await cprClpToOrbitTrackGeojson(file);
					} else if (file.name.includes('ECA_E_CPR_FMR')) {
						geojsonData = await cprFmrToOrbitTrackGeojson(file);
					} else if (file.name.includes('ECA_J_MSI_CLP')) {
						geojsonData = await msiClpToOrbitTrackGeojson(file);
					} else {
						showNotification('対応していないHDF5プロダクトです', 'error');
						return;
					}
					break;

				default:
					showNotification('対応していないファイル形式です', 'error');
					return;
			}
		} else if (file instanceof FileList) {
			// すべのファイルの拡張子を取得
			let shpFile: File | undefined;
			let dbfFile: File | undefined;
			let prjFile: File | undefined;
			let shxFile: File | undefined;

			// .shp .dbf .prj のファイルを探して File オブジェクトを取得
			for (let i = 0; i < file.length; i++) {
				const f = file[i];
				if (f.name.endsWith('.shp')) {
					shpFile = f;
				} else if (f.name.endsWith('.dbf')) {
					dbfFile = f;
				} else if (f.name.endsWith('.prj')) {
					prjFile = f;
				} else if (f.name.endsWith('.shx')) {
					shxFile = f;
				}
			}

			if (shpFile && dbfFile && prjFile && shxFile) {
				const prjContent = await readPrjFileContent(prjFile);
				geojsonData = await shpFileToGeojson(shpFile, dbfFile, prjContent);
				if (!geojsonData) {
					showNotification('シェープファイルの読み込みに失敗しました', 'error');
					return;
				}
				fileName = shpFile.name;
			} else if (shpFile && dbfFile && shxFile && !prjFile) {
				const tempGeojsonData = await shpFileToGeojson(shpFile as File, dbfFile as File);
				if (!tempGeojsonData) {
					showNotification('シェープファイルの読み込みに失敗しました', 'error');
					return;
				}
				const bbox = turfBbox(tempGeojsonData);

				if (!isBboxValid(bbox as [number, number, number, number])) {
					focusBbox = bbox as [number, number, number, number];
					showDialogType = 'shp';
					showZoneForm = true;
					return;
				} else {
					// bboxが有効な場合は、座標系フォームを表示せずにエントリを作成
					const prjContent = getProjContext('4326'); // 世界測地系のプロジェクションを使用
					geojsonData = await shpFileToGeojson(shpFile, dbfFile, prjContent);
					if (!geojsonData) {
						showNotification('シェープファイルの読み込みに失敗しました', 'error');
						return;
					}
					fileName = shpFile.name;
				}
			} else if (shpFile || dbfFile || prjFile || shxFile) {
				showDialogType = 'shp';
				return;
			} else {
				setFile(file[0]);
				return;
			}
		}

		if (!geojsonData) {
			showNotification('データが不正です', 'error');
			return;
		}

		const checkGeometryTypes = getGeometryTypes(geojsonData);

		if (checkGeometryTypes.length > 1) {
			geojsonData = filterByGeometryType(geojsonData, checkGeometryTypes[0]);
		}

		if (import.meta.env.MODE !== 'production') {
			console.log(geojsonData);
		}

		const entryGeometryType = geometryTypeToEntryType(geojsonData);

		if (!entryGeometryType) {
			showNotification('対応していないジオメトリタイプです', 'error');
			return;
		}

		const bbox = turfBbox(geojsonData);

		if (!bbox || !isBboxValid(bbox)) {
			// TODO: 座標系対応
			// focusBbox = bbox as [number, number, number, number];
			// showDialogType = 'shp';
			// showZoneForm = true;
			showNotification('対応していない座標系データです', 'error');
			return;
		}

		const entry = createGeoJsonEntry(
			geojsonData,
			entryGeometryType,
			fileName,
			bbox as [number, number, number, number],
			styleType
		);

		if (!entry) {
			showNotification('データが不正です', 'error');
			return;
		}

		showDataEntry = entry;

		showNotification('ファイルを読み込みました', 'success');
	};

	$effect(() => {
		if (dropFile) {
			setFile(dropFile);
		}
	});
</script>

{#if isDragover}
	<div class="pointer-events-none absolute h-full w-full bg-slate-500 opacity-50"></div>
{/if}

<style>
</style>
