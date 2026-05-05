<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { Snippet } from 'svelte';
	import { fly, scale } from 'svelte/transition';

	import { checkPc } from '$routes/map/utils/platform/viewport';

	interface Props {
		open: boolean;
		transition?: 'scale' | 'fly';
		onClose: () => void;
		headerActions?: Snippet;
		children: Snippet;
	}

	let { open, transition = 'scale', onClose, headerActions, children }: Props = $props();
</script>

{#snippet panelContent()}
	<div class="flex items-center gap-2 p-3 px-4 pt-4">
		{#if headerActions}
			{@render headerActions()}
		{/if}
		<button onclick={onClose} class="bg-base ml-auto shrink-0 cursor-pointer rounded-full p-2">
			<Icon icon="material-symbols:close-rounded" class="text-main h-5 w-5" />
		</button>
	</div>

	<div class="c-scroll-hidden relative flex h-full flex-col overflow-x-hidden">
		<div class="c-scroll-hidden h-full overflow-x-hidden overflow-y-auto px-2 pb-48">
			{@render children()}
		</div>
		<div class="c-bg-fog-bottom pointer-events-none absolute bottom-0 z-10 h-[150px] w-full"></div>
	</div>
{/snippet}

{#if open && checkPc()}
	{#if transition === 'fly'}
		<div
			transition:fly={{
				duration: 300,
				x: -100,
				opacity: 0
			}}
			class="bg-main w-side-menu max absolute top-0 left-0 z-20 flex h-full flex-col max-lg:hidden"
		>
			{@render panelContent()}
		</div>
	{:else}
		<div
			transition:scale={{ duration: 300, start: 0.9, opacity: 0 }}
			class="bg-main w-side-menu max absolute top-0 left-0 z-20 flex h-full flex-col max-lg:hidden"
		>
			{@render panelContent()}
		</div>
	{/if}
{/if}
