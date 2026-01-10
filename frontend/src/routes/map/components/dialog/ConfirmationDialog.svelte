<script lang="ts">
	import { fade, scale } from 'svelte/transition';

	import { confirmationDialog, resolveConfirmDialog } from '$routes/stores/confirmation';

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
			class="bg-opacity-8 flex max-h-[600px] max-w-[600px] grow flex-col rounded-md bg-black p-4 text-base"
		>
			<div class="p-2">
				<p>{$confirmationDialog.message}</p>
			</div>

			<div class="flex shrink-0 items-center justify-end gap-2 pt-4">
				{#if !$confirmationDialog.confirmOnly}
					<button class="c-btn-sub px-4" onclick={handleCancel}>
						{$confirmationDialog.cancelText}
					</button>
				{/if}
				<button class="c-btn-confirm px-8" onclick={handleConfirm}>
					{$confirmationDialog.confirmText}
				</button>
			</div>
		</div>
	</div>
{/if}
