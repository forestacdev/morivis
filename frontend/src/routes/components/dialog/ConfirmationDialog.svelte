<script lang="ts">
	import { confirmationDialog, resolveConfirmDialog } from '$routes/store/confirmation';
	import { fade, scale } from 'svelte/transition';

	const handleConfirm = () => {
		resolveConfirmDialog(true);
	};

	const handleCancel = () => {
		resolveConfirmDialog(false);
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

{#if $confirmationDialog}
	<div
		transition:fade={{ duration: 200 }}
		class="absolute bottom-0 z-30 flex h-full w-full items-center justify-center bg-black/50"
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
			transition:scale={{ duration: 300 }}
			class="bg-opacity-8 bg-main flex max-h-[600px] max-w-[600px] grow flex-col rounded-md p-4 text-base"
		>
			<div class="p-2">
				<p>{$confirmationDialog.message}</p>
			</div>

			<div class="flex shrink-0 items-center justify-end gap-2 pt-4">
				<button class="c-btn-sub" onclick={handleCancel}>
					{$confirmationDialog.cancelText}
				</button>
				<button class="c-btn-confirm" onclick={handleConfirm}>
					{$confirmationDialog.confirmText}
				</button>
			</div>
		</div>
	</div>
{/if}
