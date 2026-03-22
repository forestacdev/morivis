<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		class?: string;
		onDragover?: (e: DragEvent) => void;
		onDragleave?: (e: DragEvent) => void;
		onDropFile?: (files: FileList) => void;
		isDragover?: boolean;
		disabled?: boolean;
		children?: Snippet;
	}
	let {
		class: className,
		onDragover,
		onDragleave,
		onDropFile,
		isDragover = $bindable(),
		disabled = false,
		children
	}: Props = $props();

	// ドラッグ中のイベント
	const dragover: (e: DragEvent) => void = (e) => {
		e.preventDefault();
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
		if (disabled) return;

		const dataTransfer = e.dataTransfer;
		if (!dataTransfer) return;

		const files = dataTransfer.files;
		if (!files || files.length === 0) return;

		if (onDropFile) onDropFile(files);
	};
</script>

<div role="region" ondragover={dragover} ondragleave={dragleave} ondrop={drop} class={className}>
	{@render children?.()}
</div>
