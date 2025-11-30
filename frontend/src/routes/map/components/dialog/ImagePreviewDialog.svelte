<script lang="ts">
	import { confirmationDialog, resolveConfirmDialog } from '$routes/stores/confirmation';
	import { fade, scale } from 'svelte/transition';
	import { downloadImage, imageExport } from '$routes/map/utils/file/image';
	import { generateWorldFile } from '$routes/map/utils/file/worldfile';
	import JSZip from 'jszip';
	import { mapStore } from '$routes/stores/map';

	interface Props {
		imagePreviewUrl: string | null;
	}

	let { imagePreviewUrl = $bindable() }: Props = $props();

	const handleConfirm = async () => {
		if (imagePreviewUrl) {
			// 現在の日時を取得してフォーマット（YYYYMMDDhhmmss）
			const now = new Date();
			const formattedDate =
				now.getFullYear() +
				String(now.getMonth() + 1).padStart(2, '0') +
				String(now.getDate()).padStart(2, '0') +
				String(now.getHours()).padStart(2, '0') +
				String(now.getMinutes()).padStart(2, '0') +
				String(now.getSeconds()).padStart(2, '0');

			const epsg = 4326;
			const baseName = formattedDate + '_epsg_' + epsg;

			const zip = new JSZip();
			zip.file(baseName + '.png', imagePreviewUrl?.split(',')[1] ?? '', {
				base64: true
			});

			const map = mapStore.getMap();
			if (!map) return;

			const canvas = map.getCanvas();

			const worldFileContent = await generateWorldFile(map, canvas.width, canvas.height, epsg);

			zip.file(baseName + '.pgw', worldFileContent);

			// ZIPファイルを生成してダウンロード
			const zipBlob = await zip.generateAsync({ type: 'blob' });
			const url = URL.createObjectURL(zipBlob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${formattedDate}.zip`;
			a.click();
			URL.revokeObjectURL(url);

			imagePreviewUrl = null;
		}
	};

	const handleCancel = () => {
		// メモリ解放のためにURLをクリア
		if (imagePreviewUrl) {
			URL.revokeObjectURL(imagePreviewUrl);
			imagePreviewUrl = null;
		}
	};

	const handleBackdropClick = (event: MouseEvent) => {
		if (event.target === event.currentTarget) {
			handleCancel();
		}
	};

	window.addEventListener('keydown', (event) => {
		if (event.key === 'Escape' && $confirmationDialog) {
			handleCancel();
		}
	});
</script>

{#if imagePreviewUrl}
	<div
		transition:fade={{ duration: 200 }}
		class="bg-main/70 absolute bottom-0 z-30 flex h-full w-full items-center justify-center"
		onclick={handleBackdropClick}
		aria-label="Confirmation Dialog"
		role="button"
		tabindex="0"
		onkeydown={(e) => {
			if (e.key === 'Escape') {
				handleCancel();
			}
		}}
	>
		<div
			transition:scale={{ duration: 300, start: 0.9 }}
			class="bg-opacity-8 flex max-h-[700px] max-w-[800px] grow flex-col rounded-md bg-black p-4 text-base"
		>
			<div class="flex justify-center p-2">
				<h2 class="text-lg font-bold">画像プレビュー</h2>
			</div>
			<div class="flex h-full w-full justify-center p-2">
				<img
					src={imagePreviewUrl}
					alt="Image Preview"
					class="h-full w-full object-contain"
					aria-label="Image Preview"
					role="img"
					tabindex="0"
				/>
			</div>

			<div class="flex shrink-0 items-center justify-center gap-2 pt-4">
				<button class="c-btn-sub" onclick={handleCancel}> キャンセル </button>
				<button class="c-btn-confirm" onclick={handleConfirm}> 保存する </button>
			</div>
		</div>
	</div>
{/if}
