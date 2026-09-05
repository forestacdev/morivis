<script lang="ts">
	import Icon from '@iconify/svelte';
	import { tick } from 'svelte';
	import { fade, fly, slide } from 'svelte/transition';

	import { getRemoteFileName, resolveUploadUrlInput, validateUploadUrlInput } from './upload-url';

	import DropContainer from '$routes/map/components/DropContainer.svelte';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import {
		SUPPORTED_FILE_ACCEPT,
		SUPPORTED_FILE_GROUPS,
		type DialogType,
		type UploadFiles
	} from '$routes/map/types';
	import { fetchWithDevProxy } from '$routes/map/utils/platform/request';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDataEntry: MorivisLayerEntry | null;
		dropFile: UploadFiles;
		showDialogType: DialogType;
		remoteGeoZarrUrl: string | null;
		remotePmtilesUrl: string | null;
		remoteRasterUrl: string | null;
		remoteVectorUrl: string | null;
		remoteTiles3dUrl: string | null;
		remoteWmtsUrl: string | null;
		remoteFeatureServiceUrl: string | null;
		pendingTileUrl: string | null;
	}

	let {
		showDataEntry = $bindable(),
		dropFile = $bindable(),
		showDialogType = $bindable(),
		remoteGeoZarrUrl = $bindable(),
		remotePmtilesUrl = $bindable(),
		remoteRasterUrl = $bindable(),
		remoteVectorUrl = $bindable(),
		remoteTiles3dUrl = $bindable(),
		remoteWmtsUrl = $bindable(),
		remoteFeatureServiceUrl = $bindable(),
		pendingTileUrl = $bindable()
	}: Props = $props();

	let inputUrl = $state('');
	let isLoadingUrl = $state(false);
	let hasTouchedUrlInput = $state(false);
	let showFormListDialog = $state(false);
	let formListFileAccept = $state(SUPPORTED_FILE_ACCEPT);
	let formListFileInput = $state<HTMLInputElement | null>(null);

	const trimmedInputUrl = $derived(inputUrl.trim());
	const urlInputError = $derived.by(() => {
		if (!hasTouchedUrlInput) return '';
		return validateUploadUrlInput(trimmedInputUrl);
	});
	const isUrlInputValid = $derived(trimmedInputUrl.length > 0 && !urlInputError);

	const inputRemoteFile = async () => {
		hasTouchedUrlInput = true;

		// URLの種別判定は upload-url.ts に集約し、ここでは結果に応じて state を更新する。
		const resolved = await resolveUploadUrlInput(trimmedInputUrl);

		if (resolved.type === 'error') {
			showNotification(resolved.message, 'error');
			return;
		}

		if (resolved.type === 'dialog') {
			// 既知のURL種別に当たった場合は、対応フォームへ必要な値を渡して終了する。
			showDialogType = resolved.dialogType;
			if (resolved.target === 'remoteRasterUrl') remoteRasterUrl = resolved.value;
			if (resolved.target === 'remoteVectorUrl') remoteVectorUrl = resolved.value;
			if (resolved.target === 'pendingTileUrl') pendingTileUrl = resolved.value;
			if (resolved.target === 'remoteTiles3dUrl') remoteTiles3dUrl = resolved.value;
			if (resolved.target === 'remotePmtilesUrl') remotePmtilesUrl = resolved.value;
			if (resolved.target === 'remoteWmtsUrl') remoteWmtsUrl = resolved.value;
			if (resolved.target === 'remoteFeatureServiceUrl') remoteFeatureServiceUrl = resolved.value;
			inputUrl = '';
			hasTouchedUrlInput = false;
			return;
		}

		isLoadingUrl = true;
		isProcessing.set(true);
		try {
			// upload-url.ts が remote-file を返した場合だけ、ここで実ファイルを取得する。
			const response = await fetchWithDevProxy(resolved.requestUrl);
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			const blob = await response.blob();
			const remoteFileName = await getRemoteFileName(resolved.requestUrl, response, blob);
			if (!remoteFileName) {
				showNotification('URLから対応拡張子を判定できません', 'error');
				return;
			}

			dropFile = [new File([blob], remoteFileName, { type: blob.type })];
			inputUrl = '';
			hasTouchedUrlInput = false;
		} catch (error) {
			console.error('Failed to load remote file:', error);
			showNotification(
				'URLの読み込みに失敗しました。URLが正しいか、配信元がCORSを許可しているか確認してください',
				'error'
			);
		} finally {
			isLoadingUrl = false;
			isProcessing.set(false);
		}
	};

	const inputFile = async (e: Event) => {
		const files = (e.target as HTMLInputElement).files;
		if (!files || files.length === 0) return;

		await handleDroppedFiles(Array.from(files));
	};

	const handleDroppedFiles = async (files: File[]) => {
		if (!files || files.length === 0) return;

		// 単一ZIPファイルの場合は展開
		if (files.length === 1 && files[0].name.toLowerCase().endsWith('.zip')) {
			try {
				const extracted = await extractZipFiles(files[0]);
				if (extracted.length > 0) {
					dropFile = extracted;
					return;
				}
			} catch {
				// 展開失敗時は通常フローへ
			}
		}

		dropFile = files;
	};

	const showUploadDialog = (type: DialogType) => {
		showFormListDialog = false;
		showDialogType = type;
	};

	type DialogFormat = {
		type: Exclude<DialogType, null>;
		label: string;
		description: string;
		icon: string;
	};

	type FormatListItem =
		| (DialogFormat & { id: string; kind: 'dialog' })
		| {
				id: string;
				kind: 'file';
				label: string;
				description: string;
				icon: string;
				extensions: string[];
				accept: string;
		  };

	const urlDialogs: DialogFormat[] = [
		{
			type: 'raster',
			label: 'XYZタイル',
			description:
				'画像タイルのURLテンプレートです。背景地図やオルソ画像を表示するときに使います。',
			icon: 'mdi:map-outline'
		},
		{
			type: 'vector',
			label: 'ベクタータイル',
			description:
				'ベクタータイルのURLテンプレートです。属性を持つタイルデータを表示するときに使います。',
			icon: 'mdi:vector-polygon'
		},
		{
			type: 'wmts',
			label: 'WMS/WMTS',
			description:
				'地図配信サービスのURLです。公開されている配信レイヤーを追加するときに使います。',
			icon: 'mdi:layers-outline'
		},
		{
			type: 'wcs',
			label: 'WCS',
			description:
				'カバレッジ配信サービスのURLです。ラスターデータを範囲指定で取得するときに使います。',
			icon: 'mdi:chart-areaspline'
		},
		{
			type: 'featureservice',
			label: 'WFS / OGC API',
			description:
				'地物配信サービスのURLです。WFS と OGC API - Features のどちらも同じフォームから開けます。',
			icon: 'mdi:map-marker-path'
		},
		{
			type: 'arcgis',
			label: 'ArcGIS',
			description:
				'ArcGIS REST サービスのURLです。ArcGIS Server や Online のレイヤーを追加するときに使います。',
			icon: 'mdi:lan-connect'
		},
		{
			type: 'pmtiles',
			label: 'PMTiles',
			description:
				'PMTiles ファイルのURLです。単一ファイルで配信されるタイルデータを開くときに使います。',
			icon: 'mdi:package-variant-closed'
		},
		{
			type: '3dtiles',
			label: '3D Tiles',
			description:
				'3D Tiles の tileset.json のURLです。3次元の地物やモデルを表示するときに使います。',
			icon: 'mdi:cube-scan'
		},
		{
			type: 'stac',
			label: 'STAC / COG',
			description: 'STAC API や COG のURLです。衛星画像やラスターデータを参照するときに使います。',
			icon: 'mdi:image-multiple'
		}
	];

	const textDialogs: DialogFormat[] = [
		{
			type: 'geojson',
			label: 'GeoJSON',
			description: 'GeoJSONファイルの読み込みや、GeoJSONテキストの直接入力を行うフォームです。',
			icon: 'mdi:code-json'
		},
		{
			type: 'wkt',
			label: 'WKT',
			description: 'WKTファイルの読み込みや、WKTテキストの直接入力を行うフォームです。',
			icon: 'mdi:code-tags'
		}
	];

	const fileFormatIcons: Record<string, string> = {
		TopoJSON: 'mdi:vector-polyline',
		FlatGeobuf: 'mdi:vector-square',
		GeoParquet: 'mdi:table-large',
		'GeoArrow / Feather': 'mdi:arrow-right-bold-hexagon-outline',
		'MapInfo MIF/MID': 'mdi:map-marker-radius',
		GeoPackage: 'mdi:database',
		'SQLite / SQL dump': 'mdi:database-outline',
		'Esri FileGDB': 'mdi:database-cog',
		Shapefile: 'mdi:shape-outline',
		GPX: 'mdi:map-marker-path',
		TCX: 'mdi:run',
		'Garmin GDB': 'mdi:map-marker-radius',
		'OpenStreetMap XML': 'mdi:map',
		GeoRSS: 'mdi:rss',
		'SXF (SFC)': 'mdi:ruler-square-compass',
		GML: 'mdi:file-code-outline',
		'KML / KMZ': 'mdi:earth',
		CSV: 'mdi:table',
		TSV: 'mdi:table',
		Excel: 'mdi:microsoft-excel',
		GeoTIFF: 'mdi:image',
		MBTiles: 'mdi:package-variant-closed',
		PMTiles: 'mdi:package-variant-closed',
		HDF5: 'mdi:file-tree-outline',
		NetCDF: 'mdi:weather-cloudy',
		'GRIB2 (GPV)': 'mdi:weather-windy',
		GTFS: 'mdi:train',
		'HRIT/LRIT': 'mdi:satellite-variant',
		'DXF / DWG': 'mdi:vector-square',
		SIMA: 'mdi:ruler-square-compass',
		DRM: 'mdi:road-variant',
		DM: 'mdi:terrain',
		LandXML: 'mdi:terrain',
		法務局地図XML: 'mdi:map-legend',
		'画像 (EXIF GPS)': 'mdi:image',
		SVG: 'mdi:svg',
		GeoPDF: 'mdi:file-pdf-box',
		'GLB / GLTF': 'mdi:cube-outline',
		VRM: 'mdi:account',
		'Wavefront OBJ': 'mdi:cube-outline',
		'Autodesk 3DS': 'mdi:cube-outline',
		'Collada DAE': 'mdi:vector-combine',
		'Rhino 3DM': 'mdi:alpha-r-box-outline',
		'Autodesk FBX': 'mdi:cube-outline',
		'MikuMikuDance PMX': 'mdi:account',
		'Draco DRC': 'mdi:cube-outline',
		'3D Manufacturing Format': 'mdi:printer-3d',
		'Additive Manufacturing Format': 'mdi:printer-3d',
		'Industry Foundation Classes': 'mdi:office-building-cog',
		'BIM Collaboration Format': 'mdi:comment-question-outline',
		点群: 'mdi:chart-scatter-plot'
	};

	const formatListItems: FormatListItem[] = [
		...urlDialogs.map((dialog) => ({
			...dialog,
			id: `dialog:${dialog.type}`,
			kind: 'dialog' as const
		})),
		...textDialogs.map((dialog) => ({
			...dialog,
			id: `dialog:${dialog.type}`,
			kind: 'dialog' as const
		})),
		...SUPPORTED_FILE_GROUPS.filter(
			(group) => group.label !== 'GeoJSON' && group.label !== 'WKT'
		).map((group) => ({
			id: `file:${group.label}`,
			kind: 'file' as const,
			label: group.label,
			description: group.description,
			icon: fileFormatIcons[group.label] ?? 'mdi:file-outline',
			extensions: group.extensions,
			accept: group.extensions.join(',')
		}))
	];

	const openFilteredFilePicker = async (accept: string) => {
		formListFileAccept = accept;
		await tick();
		formListFileInput?.click();
	};

	const openFormatItem = async (item: FormatListItem) => {
		if (item.kind === 'dialog') {
			showUploadDialog(item.type);
			return;
		}

		showFormListDialog = false;
		await openFilteredFilePicker(item.accept);
	};
	let isDragover = $state(false);
	const setRelativePath = (file: File, relativePath: string) => {
		Object.defineProperty(file, 'morivisRelativePath', {
			value: relativePath,
			configurable: true
		});
		return file;
	};

	/** ZIPファイルを展開してFile配列にする */
	const extractZipFiles = async (zipFile: File): Promise<File[]> => {
		const JSZip = (await import('jszip')).default;
		const zip = await JSZip.loadAsync(zipFile);
		const files: File[] = [];
		const entries: [string, import('jszip').JSZipObject][] = [];
		zip.forEach((path, entry) => {
			if (!entry.dir) entries.push([path, entry]);
		});
		for (const [path, entry] of entries) {
			const blob = await entry.async('blob');
			const fileName = path.split('/').pop() ?? path;
			files.push(setRelativePath(new File([blob], fileName, { type: blob.type }), path));
		}
		return files;
	};
</script>

<div class="flex h-full grow flex-col gap-4 p-4 text-white">
	<DropContainer
		bind:isDragover
		onDropFile={handleDroppedFiles}
		class="flex h-full w-full grow flex-col items-center justify-center gap-16 rounded-lg border-2 decoration-amber-200 transition-all {isDragover
			? 'border-white bg-black'
			: 'border-dashed bg-black/70'}"
	>
		<div class="grid place-items-center gap-6">
			<span class="text-3xl select-none">ここにファイルをドロップしてください </span>

			<label
				class="bg-base hover:bg-accent grid cursor-pointer place-items-center rounded-full p-4 text-black transition-colors hover:text-white"
			>
				<span>またはファイルを選択</span>
				<input
					type="file"
					multiple
					accept={SUPPORTED_FILE_ACCEPT}
					class="hidden"
					onchange={(e) => inputFile(e)}
				/>
			</label>
			<input
				bind:this={formListFileInput}
				type="file"
				multiple
				accept={formListFileAccept}
				class="hidden"
				onchange={(e) => inputFile(e)}
			/>
			<div class="flex w-full max-w-[720px] flex-col gap-1 px-4">
				<div class="flex w-full flex-col gap-3 sm:flex-row">
					<div class="flex w-full flex-col gap-2">
						<input
							type="url"
							bind:value={inputUrl}
							placeholder="URLから読み込む"
							class="bg-base text-main placeholder:text-main/60 focus:ring-accent/40 w-full rounded-full px-5 py-3 focus:ring-2 focus:outline-none {urlInputError
								? 'ring-2 ring-red-500/70'
								: ''}"
							oninput={() => {
								hasTouchedUrlInput = true;
							}}
							onblur={() => {
								hasTouchedUrlInput = true;
							}}
							onkeydown={async (e) => {
								if (e.key === 'Enter' && !isLoadingUrl && isUrlInputValid) {
									await inputRemoteFile();
								}
							}}
						/>
					</div>
				</div>
				<div>
					{#if urlInputError}
						<span transition:slide class="text-xs text-red-400">{urlInputError}</span>
					{:else}
						<span class="text-xs text-gray-500 select-none">
							※配信元がCORSを許可しているファイルURLを入力してください
						</span>
					{/if}
				</div>
				{#if !(isLoadingUrl || !isUrlInputValid)}
					<div class="flex w-full justify-center">
						<button
							transition:slide={{ axis: 'y' }}
							onclick={inputRemoteFile}
							disabled={isLoadingUrl || !isUrlInputValid}
							class="bg-base hover:bg-accent w-[100px] min-w-[140px] rounded-full px-6 py-3 text-wrap text-black transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
						>
							{isLoadingUrl ? '読込中...' : 'URLを開く'}
						</button>
					</div>
				{/if}
			</div>
			<div class="flex flex-wrap items-center justify-center gap-4 px-4">
				<button
					onclick={() => {
						showFormListDialog = true;
					}}
					class="bg-base select-none hover:bg-accent grid cursor-pointer place-items-center rounded-full p-4 px-6 text-black transition-colors hover:text-white"
				>
					対応形式一覧
				</button>
			</div>
			<div class="marquee-container overflow-hidden">
				<div class="marquee-track flex w-max gap-2 select-none">
					{#each Array.from({ length: 2 }) as _, index (index)}
						{#each SUPPORTED_FILE_GROUPS as group (group.label)}
							<span class="bg-sub rounded-full p-1 px-3 text-xs whitespace-nowrap text-gray-300">
								{group.label}
							</span>
						{/each}
					{/each}
				</div>
			</div>
		</div>
	</DropContainer>
</div>

{#if showFormListDialog}
	<div
		transition:fade={{ duration: 200 }}
		class="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-4"
	>
		<div class="bg-main flex max-h-[80dvh] w-full max-w-[880px] flex-col gap-4 rounded-xl p-5">
			<div class="flex items-center justify-between gap-4">
				<div class="flex flex-col gap-1">
					<span class="text-xl font-bold text-white">対応形式一覧</span>
					<span class="text-sm text-gray-400">形式を選ぶと、入力またはファイル選択を開始します</span
					>
				</div>
				<button
					onclick={() => {
						showFormListDialog = false;
					}}
					class="bg-base hover:bg-accent cursor-pointer rounded-full px-4 py-2 text-black transition-colors select-none hover:text-white"
				>
					閉じる
				</button>
			</div>

			<div class="c-scroll grid grid-cols-2 gap-3 overflow-y-auto pr-1 md:grid-cols-3">
				{#each formatListItems as item (item.id)}
					<button
						onclick={() => openFormatItem(item)}
						class="bg-base hover:bg-accent group relative flex min-h-[132px] cursor-pointer flex-col gap-2 overflow-hidden rounded-lg px-4 py-3 text-left text-sm text-black transition-colors select-none hover:text-white"
					>
						<Icon
							icon={item.icon}
							class="absolute top-3 right-3 h-9 w-9 text-black/20 group-hover:text-white/30"
						/>
						<div class="flex flex-col gap-2 pr-8">
							<span class="font-semibold">{item.label}</span>
							<span class="text-xs leading-5 text-black/70 group-hover:text-white/80">
								{item.description}
							</span>
							{#if item.kind === 'file'}
								<span class="text-[11px] leading-4 text-black/55 group-hover:text-white/65">
									対応拡張子: {item.extensions.join(' ')}
								</span>
							{/if}
						</div>
					</button>
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
	.marquee-container {
		max-width: 100%;
		mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
	}

	.marquee-track {
		animation: marquee 50s linear infinite;
	}

	@keyframes marquee {
		0% {
			transform: translateX(0);
		}
		100% {
			transform: translateX(-50%);
		}
	}
</style>
