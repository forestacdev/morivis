<script lang="ts">
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { SUPPORTED_FILE_ACCEPT, SUPPORTED_FILE_GROUPS, type DialogType } from '$routes/map/types';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		dropFile: File | FileList | null;
		showDialogType: DialogType;
	}

	let {
		showDataEntry = $bindable(),
		dropFile = $bindable(),
		showDialogType = $bindable()
	}: Props = $props();

	const inputFile = (e: Event) => {
		const files = (e.target as HTMLInputElement).files;
		if (!files || files.length === 0) return;
		if (files.length === 1) {
			dropFile = files[0];
		} else {
			dropFile = files;
		}
	};

	const showUploadDialog = (type: DialogType) => {
		showDialogType = type;
	};

	const urlDialogs: { type: DialogType; label: string }[] = [
		{ type: 'raster', label: 'XYZタイル' },
		{ type: 'vector', label: 'ベクタータイル' },
		{ type: 'wmts', label: 'WMS/WMTS' },
		{ type: 'arcgis', label: 'ArcGIS' },
		{ type: 'pmtiles', label: 'PMTiles' },
		{ type: '3dtiles', label: '3D Tiles' },
		{ type: 'demxml', label: '基盤地図DEM' },
		{ type: 'stac', label: 'STAC / COG' }
	];
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
			<div class="flex flex-wrap items-center justify-center gap-2 px-12">
				{#each SUPPORTED_FILE_GROUPS as group}
					<span class="bg-sub rounded-full p-1 px-3 text-xs text-gray-300">
						{group.label}{group.extensions.length > 1 ? ` (${group.extensions.join(' ')})` : ''}
					</span>
				{/each}
			</div>

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
		</div>
		<div class="flex flex-wrap items-center justify-center gap-4 px-4">
			{#each urlDialogs as dialog}
				<button
					onclick={() => showUploadDialog(dialog.type)}
					class="bg-base hover:bg-accent grid cursor-pointer place-items-center rounded-full p-4 px-6 text-black transition-colors hover:text-white"
				>
					{dialog.label}
				</button>
			{/each}
		</div>
	</div>
</div>

<style>
</style>
