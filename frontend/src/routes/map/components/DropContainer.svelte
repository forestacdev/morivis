<script lang="ts">
	import type { Snippet } from 'svelte';

	import { showNotification } from '$routes/stores/notification';

	interface Props {
		class?: string;
		onDragover?: (e: DragEvent) => void;
		onDragleave?: (e: DragEvent) => void;
		onDropFile?: (files: File[]) => void;
		onDropEntryId?: (entryId: string) => void;
		isDragover?: boolean;
		disabled?: boolean;
		children?: Snippet;
	}
	let {
		class: className,
		onDragover,
		onDragleave,
		onDropFile,
		onDropEntryId,
		isDragover = $bindable(),
		disabled = false,
		children
	}: Props = $props();

	const setRelativePath = (file: File, relativePath: string) => {
		Object.defineProperty(file, 'morivisRelativePath', {
			value: relativePath,
			configurable: true
		});
		return file;
	};

	const entryToFile = (entry: FileSystemFileEntry, relativePath: string): Promise<File> =>
		new Promise((resolve, reject) =>
			entry.file((file) => resolve(setRelativePath(file, relativePath)), reject)
		);

	const readDirectoryRecursive = async (
		dirEntry: FileSystemDirectoryEntry,
		basePath = dirEntry.name
	): Promise<File[]> => {
		const files: File[] = [];
		const reader = dirEntry.createReader();

		const readEntries = (): Promise<FileSystemEntry[]> =>
			new Promise((resolve, reject) => reader.readEntries(resolve, reject));

		let entries: FileSystemEntry[];
		do {
			entries = await readEntries();
			for (const entry of entries) {
				if (entry.isFile) {
					files.push(await entryToFile(entry as FileSystemFileEntry, `${basePath}/${entry.name}`));
				} else if (entry.isDirectory) {
					files.push(
						...(await readDirectoryRecursive(
							entry as FileSystemDirectoryEntry,
							`${basePath}/${entry.name}`
						))
					);
				}
			}
		} while (entries.length > 0);

		return files;
	};

	const collectDroppedItemFiles = async (items: DataTransferItemList): Promise<File[]> => {
		const files: File[] = [];

		// DataTransferはイベント中に確保する。await後には取得できないブラウザーがある。
		const inputs = Array.from(items, (item) => ({
			entry: item.webkitGetAsEntry?.(),
			file: item.getAsFile()
		}));
		for (const { entry, file } of inputs) {
			if (entry?.isDirectory) {
				files.push(
					...(await readDirectoryRecursive(entry as FileSystemDirectoryEntry, entry.name))
				);
				continue;
			}

			if (entry?.isFile) {
				files.push(await entryToFile(entry as FileSystemFileEntry, entry.name));
				continue;
			}

			if (file) {
				files.push(file);
			}
		}

		return files;
	};

	// ドラッグ中のイベント
	const dragover: (e: DragEvent) => void = (e) => {
		const isEntryDrag = e.dataTransfer?.types.includes('application/x-entry-id');
		if (!disabled || isEntryDrag) e.preventDefault();
		if (disabled) return;
		isDragover = true;
		if (onDragover) onDragover(e);
	};
	const dragleave: (e: DragEvent) => void = (e) => {
		e.preventDefault();
		isDragover = false;
		if (onDragleave) onDragleave(e);
	};

	// ドロップ完了時にファイルを取得
	const drop: (e: DragEvent) => void = async (e) => {
		e.preventDefault();
		isDragover = false;

		const dataTransfer = e.dataTransfer;
		if (!dataTransfer) return;

		const entryId = dataTransfer.getData('application/x-entry-id');
		if (entryId) {
			if (onDropEntryId) onDropEntryId(entryId);
			return;
		}

		if (disabled) return;

		const items = dataTransfer.items;
		const hasDirectoryEntry = Array.from(items ?? []).some(
			(item) => item.webkitGetAsEntry?.()?.isDirectory
		);

		if (!hasDirectoryEntry) {
			const files = dataTransfer.files;
			if (!files || files.length === 0) return;
			onDropFile?.(Array.from(files));
			return;
		}

		if (items && items.length > 0) {
			try {
				const collectedFiles = await collectDroppedItemFiles(items);
				if (collectedFiles.length) onDropFile?.(collectedFiles);
				else showNotification('フォルダー内にファイルがありません', 'info');
			} catch {
				showNotification(
					'フォルダーを読み取れませんでした。フォルダー選択またはZIPで再登録してください',
					'error'
				);
			}
			return;
		}

		const files = dataTransfer.files;
		if (!files || files.length === 0) return;

		if (onDropFile) onDropFile(Array.from(files));
	};
</script>

<div role="region" ondragover={dragover} ondragleave={dragleave} ondrop={drop} class={className}>
	{@render children?.()}
</div>
