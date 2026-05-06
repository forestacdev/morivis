<script lang="ts">
	import { tick } from 'svelte';

	import type { GeoDataEntry } from '$routes/map/data/types';
	import {
		SUPPORTED_FILE_ACCEPT,
		SUPPORTED_FILE_EXTENSIONS,
		SUPPORTED_FILE_GROUPS,
		type DialogType
	} from '$routes/map/types';
	import { parseWmsCapabilities } from '$routes/map/utils/formats/wms';
	import { parseWmtsCapabilities } from '$routes/map/utils/formats/wmts';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';
	import { slide } from 'svelte/transition';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		dropFile: File | FileList | null;
		showDialogType: DialogType;
		remotePmtilesUrl: string | null;
		remoteRasterUrl: string | null;
		remoteVectorUrl: string | null;
		remoteTiles3dUrl: string | null;
		remoteWmtsUrl: string | null;
		pendingTileUrl: string | null;
	}

	let {
		showDataEntry = $bindable(),
		dropFile = $bindable(),
		showDialogType = $bindable(),
		remotePmtilesUrl = $bindable(),
		remoteRasterUrl = $bindable(),
		remoteVectorUrl = $bindable(),
		remoteTiles3dUrl = $bindable(),
		remoteWmtsUrl = $bindable(),
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
		if (!trimmedInputUrl) return 'URLを入力してください';
		if (!/^https?:\/\//i.test(trimmedInputUrl)) return 'http(s) で始まるURLを入力してください';
		return '';
	});
	const isUrlInputValid = $derived(trimmedInputUrl.length > 0 && !urlInputError);

	const getFileNameFromContentDisposition = (headerValue: string | null): string | null => {
		if (!headerValue) return null;

		const utf8Match = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
		if (utf8Match?.[1]) {
			try {
				return decodeURIComponent(utf8Match[1]);
			} catch {
				return utf8Match[1];
			}
		}

		const plainMatch = headerValue.match(/filename="?([^";]+)"?/i);
		return plainMatch?.[1] ?? null;
	};

	const getMatchedExtension = (fileName: string): string | null => {
		const lowerFileName = fileName.toLowerCase();
		const sortedExtensions = [...SUPPORTED_FILE_EXTENSIONS].sort((a, b) => b.length - a.length);
		return sortedExtensions.find((ext) => lowerFileName.endsWith(ext)) ?? null;
	};

	const getTileUrlExtension = (fileName: string): string | null => {
		const lowerFileName = fileName.toLowerCase();
		const tileExtensions = ['.geojson', '.pbf', '.mvt', '.png', '.jpg', '.jpeg', '.webp', '.avif'];
		return tileExtensions.find((ext) => lowerFileName.endsWith(ext)) ?? null;
	};

	const getRemoteFileName = (urlValue: string, response: Response): string | null => {
		const contentDispositionName = getFileNameFromContentDisposition(
			response.headers.get('content-disposition')
		);
		if (contentDispositionName && getMatchedExtension(contentDispositionName)) {
			return contentDispositionName;
		}

		try {
			const pathname = new URL(urlValue).pathname;
			const pathName = pathname.split('/').pop();
			if (pathName) {
				const decodedPathName = decodeURIComponent(pathName);
				if (getMatchedExtension(decodedPathName)) {
					return decodedPathName;
				}
			}
		} catch {
			return null;
		}

		return null;
	};

	const getRemoteFileNameFromUrl = (urlValue: string): string | null => {
		try {
			const pathname = new URL(urlValue).pathname;
			const pathName = pathname.split('/').pop();
			return pathName ? decodeURIComponent(pathName) : null;
		} catch {
			return null;
		}
	};

	const isXyzTileUrl = (urlValue: string): boolean => {
		const lowerUrl = urlValue.toLowerCase();
		return lowerUrl.includes('{x}') && lowerUrl.includes('{y}') && lowerUrl.includes('{z}');
	};

	const isTilesetJsonUrl = (urlValue: string): boolean => {
		try {
			return new URL(urlValue).pathname.toLowerCase().endsWith('/tileset.json');
		} catch {
			return false;
		}
	};

	const isWmsOrWmtsUrl = async (urlValue: string): Promise<boolean> => {
		let wmtsResult = await parseWmtsCapabilities(urlValue);

		if ((!wmtsResult || wmtsResult.length === 0) && /epsg4326/i.test(urlValue)) {
			const mercatorUrl = urlValue.replace(/epsg4326/gi, 'epsg3857');
			wmtsResult = await parseWmtsCapabilities(mercatorUrl);
		}

		if (wmtsResult && wmtsResult.length > 0) {
			return true;
		}

		const wmsResult = await parseWmsCapabilities(urlValue);
		return !!(wmsResult && wmsResult.length > 0);
	};

	const RASTER_TILE_EXTENSIONS = new Set([
		'.png',
		'.jpg',
		'.jpeg',
		'.webp',
		'.avif',
		'.tif',
		'.tiff'
	]);
	const VECTOR_TILE_EXTENSIONS = new Set(['.pbf', '.mvt', '.geojson']);

	const inputRemoteFile = async () => {
		hasTouchedUrlInput = true;
		const trimmedUrl = trimmedInputUrl;
		if (!trimmedUrl) {
			showNotification('URLを入力してください', 'error');
			return;
		}

		if (!/^https?:\/\//i.test(trimmedUrl)) {
			showNotification('http(s) で始まるURLを入力してください', 'error');
			return;
		}

		if (isTilesetJsonUrl(trimmedUrl)) {
			remoteTiles3dUrl = trimmedUrl;
			showDialogType = '3dtiles';
			inputUrl = '';
			hasTouchedUrlInput = false;
			return;
		}

		if (isXyzTileUrl(trimmedUrl)) {
			const remoteFileNameFromUrl = getRemoteFileNameFromUrl(trimmedUrl);
			const matchedExtension = remoteFileNameFromUrl
				? getTileUrlExtension(remoteFileNameFromUrl)
				: null;

			if (matchedExtension && RASTER_TILE_EXTENSIONS.has(matchedExtension)) {
				remoteRasterUrl = trimmedUrl;
				showDialogType = 'raster';
			} else if (matchedExtension && VECTOR_TILE_EXTENSIONS.has(matchedExtension)) {
				remoteVectorUrl = trimmedUrl;
				showDialogType = 'vector';
			} else {
				pendingTileUrl = trimmedUrl;
				showDialogType = 'tileurltype';
			}
			inputUrl = '';
			hasTouchedUrlInput = false;
			return;
		}

		const remoteFileNameFromUrl = getRemoteFileNameFromUrl(trimmedUrl);
		if (remoteFileNameFromUrl && getMatchedExtension(remoteFileNameFromUrl) === '.pmtiles') {
			remotePmtilesUrl = trimmedUrl;
			showDialogType = 'pmtiles';
			inputUrl = '';
			hasTouchedUrlInput = false;
			return;
		}

		isLoadingUrl = true;
		isProcessing.set(true);

		try {
			if (await isWmsOrWmtsUrl(trimmedUrl)) {
				remoteWmtsUrl = trimmedUrl;
				showDialogType = 'wmts';
				inputUrl = '';
				hasTouchedUrlInput = false;
				return;
			}

			const response = await fetch(trimmedUrl);
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			const remoteFileName = getRemoteFileName(trimmedUrl, response);
			if (!remoteFileName) {
				showNotification('URLから対応拡張子を判定できません', 'error');
				return;
			}

			const blob = await response.blob();
			dropFile = new File([blob], remoteFileName, { type: blob.type });
			inputUrl = '';
			hasTouchedUrlInput = false;
		} catch (error) {
			console.error('Failed to load remote file:', error);
			showNotification(
				'URLの読み込みに失敗しました。配信元がCORSを許可しているか確認してください',
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

		// 単一ZIPファイルの場合は展開
		if (files.length === 1 && files[0].name.toLowerCase().endsWith('.zip')) {
			try {
				const extracted = await extractZipFiles(files[0]);
				if (extracted.length > 0) {
					const dt = new DataTransfer();
					extracted.forEach((f) => dt.items.add(f));
					dropFile = dt.files;
					return;
				}
			} catch {
				// 展開失敗時は通常フローへ
			}
		}

		if (files.length === 1) {
			dropFile = files[0];
		} else {
			dropFile = files;
		}
	};

	const showUploadDialog = (type: DialogType) => {
		showFormListDialog = false;
		showDialogType = type;
	};

	const urlDialogGroups: { title: string; dialogs: { type: DialogType; label: string }[] }[] = [
		{
			title: 'URL・サービス',
			dialogs: [
				{ type: 'raster', label: 'XYZタイル' },
				{ type: 'vector', label: 'ベクタータイル' },
				{ type: 'wmts', label: 'WMS/WMTS' },
				{ type: 'wcs', label: 'WCS' },
				{ type: 'arcgis', label: 'ArcGIS' },
				{ type: 'pmtiles', label: 'PMTiles' },
				{ type: '3dtiles', label: '3D Tiles' },
				{ type: 'stac', label: 'STAC / COG' }
			]
		}
	];

	const fileDialogGroups: { title: string; groups: { label: string; accept: string }[] }[] = [
		{
			title: 'ファイル選択',
			groups: SUPPORTED_FILE_GROUPS.map((group) => ({
				label: group.label,
				accept: group.extensions.join(',')
			}))
		}
	];

	const openFilteredFilePicker = async (accept: string) => {
		formListFileAccept = accept;
		await tick();
		formListFileInput?.click();
	};
	let isDragover = $state(false);

	// ドラッグ中のイベント
	const dragover: (e: DragEvent) => void = (e) => {
		e.preventDefault();
		isDragover = true;
	};
	const dragleave: (e: DragEvent) => void = (e) => {
		e.preventDefault();
		isDragover = false;
	};
	// ドロップ完了時にファイルを取得
	/** FileSystemEntryからFileを取得 */
	const entryToFile = (entry: FileSystemFileEntry): Promise<File> =>
		new Promise((resolve, reject) => entry.file(resolve, reject));

	/** ディレクトリを再帰的に読み取り全ファイルを収集 */
	const readDirectoryRecursive = async (dirEntry: FileSystemDirectoryEntry): Promise<File[]> => {
		const files: File[] = [];
		const reader = dirEntry.createReader();

		const readEntries = (): Promise<FileSystemEntry[]> =>
			new Promise((resolve, reject) => reader.readEntries(resolve, reject));

		let entries: FileSystemEntry[];
		do {
			entries = await readEntries();
			for (const entry of entries) {
				if (entry.isFile) {
					files.push(await entryToFile(entry as FileSystemFileEntry));
				} else if (entry.isDirectory) {
					files.push(...(await readDirectoryRecursive(entry as FileSystemDirectoryEntry)));
				}
			}
		} while (entries.length > 0);

		return files;
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
			files.push(new File([blob], fileName, { type: blob.type }));
		}
		return files;
	};

	const drop: (e: DragEvent) => void = async (e) => {
		e.preventDefault();
		isDragover = false;

		const dataTransfer = e.dataTransfer;
		if (!dataTransfer) return;

		// フォルダドロップの判定
		const items = dataTransfer.items;
		if (items && items.length > 0) {
			const firstEntry = items[0].webkitGetAsEntry?.();
			if (firstEntry?.isDirectory) {
				// フォルダ → 再帰的にファイル収集
				const allFiles = await readDirectoryRecursive(firstEntry as FileSystemDirectoryEntry);
				if (allFiles.length > 0) {
					const dt = new DataTransfer();
					allFiles.forEach((f) => dt.items.add(f));
					dropFile = dt.files;
					return;
				}
			}
		}

		const files = dataTransfer.files;
		if (!files || files.length === 0) return;

		// 単一ZIPファイルの場合、展開してFileListとして渡す
		if (files.length === 1 && files[0].name.toLowerCase().endsWith('.zip')) {
			try {
				const extracted = await extractZipFiles(files[0]);
				if (extracted.length > 0) {
					const dt = new DataTransfer();
					extracted.forEach((f) => dt.items.add(f));
					dropFile = dt.files;
					return;
				}
			} catch {
				// ZIP展開失敗時は通常フローへ
			}
		}

		dropFile = files;
	};
</script>

<div class="flex h-full grow flex-col gap-4 p-4 text-white">
	<div
		role="region"
		ondrop={drop}
		ondragover={dragover}
		ondragleave={dragleave}
		class="flex h-full w-full grow flex-col items-center justify-center gap-16 rounded-lg border-2 decoration-amber-200 transition-all {isDragover
			? 'border-white bg-black'
			: 'border-dashed bg-black/70'}"
	>
		<div class="grid place-items-center gap-6">
			<span class="text-3xl">ここにファイルをドロップしてください </span>

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
						<span class="text-xs text-gray-500">
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
		</div>
		<div class="flex flex-wrap items-center justify-center gap-4 px-4">
			<button
				onclick={() => {
					showFormListDialog = true;
				}}
				class="bg-base hover:bg-accent grid cursor-pointer place-items-center rounded-full p-4 px-6 text-black transition-colors hover:text-white"
			>
				フォーム一覧
			</button>
		</div>
		<div class="marquee-container overflow-hidden">
			<div class="marquee-track flex w-max gap-2">
				{#each { length: 2 } as _}
					{#each SUPPORTED_FILE_GROUPS as group}
						<span class="bg-sub rounded-full p-1 px-3 text-xs whitespace-nowrap text-gray-300">
							{group.label}{group.extensions.length > 1 ? ` (${group.extensions.join(' ')})` : ''}
						</span>
					{/each}
				{/each}
			</div>
		</div>
	</div>
</div>

{#if showFormListDialog}
	<div class="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
		<div class="bg-main flex max-h-[80dvh] w-full max-w-[880px] flex-col gap-4 rounded-xl p-5">
			<div class="flex items-center justify-between gap-4">
				<div class="flex flex-col gap-1">
					<span class="text-xl font-bold text-white">フォーム一覧</span>
					<span class="text-sm text-gray-400">
						URL指定系とファイル系のフォームをここから直接開けます
					</span>
				</div>
				<button
					onclick={() => {
						showFormListDialog = false;
					}}
					class="bg-base hover:bg-accent rounded-full px-4 py-2 text-black transition-colors hover:text-white"
				>
					閉じる
				</button>
			</div>

			<div class="flex flex-col gap-5 overflow-y-auto pr-1">
				{#each urlDialogGroups as group}
					<div class="flex flex-col gap-3">
						<span class="text-sm font-bold text-gray-300">{group.title}</span>
						<div class="grid grid-cols-2 gap-3 md:grid-cols-3">
							{#each group.dialogs as dialog}
								<button
									onclick={() => showUploadDialog(dialog.type)}
									class="bg-base hover:bg-accent rounded-lg px-4 py-3 text-left text-sm text-black transition-colors hover:text-white"
								>
									{dialog.label}
								</button>
							{/each}
						</div>
					</div>
				{/each}
				{#each fileDialogGroups as group}
					<div class="flex flex-col gap-3">
						<span class="text-sm font-bold text-gray-300">{group.title}</span>
						<div class="grid grid-cols-2 gap-3 md:grid-cols-3">
							{#each group.groups as fileGroup}
								<button
									onclick={async () => {
										showFormListDialog = false;
										await openFilteredFilePicker(fileGroup.accept);
									}}
									class="bg-base hover:bg-accent rounded-lg px-4 py-3 text-left text-sm text-black transition-colors hover:text-white"
								>
									{fileGroup.label}
								</button>
							{/each}
						</div>
					</div>
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
