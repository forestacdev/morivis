<script lang="ts">
	import JSZip from 'jszip';
	import { fade, scale } from 'svelte/transition';

	import { confirmationDialog } from '$routes/stores/confirmation';
	import { mapStore } from '$routes/stores/map';
	import { generateAuxXml } from '$routes/map/utils/file/aux.xml';

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

			const auxXmlContent = await generateAuxXml(map, imagePreviewUrl);

			zip.file(baseName + '.png.aux.xml', auxXmlContent);

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
			class="bg-opacity-8 flex max-h-[90vh] max-w-[90vw] grow flex-col rounded-md bg-black p-4 text-base"
		>
			<div class="flex shrink-0 justify-center p-2">
				<h2 class="text-lg font-bold">画像プレビュー</h2>
			</div>
			<div class="relative flex min-h-0 flex-1 justify-center overflow-hidden p-2">
				<img src={imagePreviewUrl} alt="Preview" class="max-h-full max-w-full object-contain" />
			</div>

			<div class="flex shrink-0 items-center justify-center gap-4 pt-4">
				<button class="c-btn-sub px-4" onclick={handleCancel}> キャンセル </button>
				<button class="c-btn-confirm px-8" onclick={handleConfirm}> 保存する </button>
			</div>
		</div>
	</div>
{/if}
