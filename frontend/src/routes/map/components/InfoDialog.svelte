<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade } from 'svelte/transition';

	import { showInfoDialog } from '$map/store';

	// export let mapBearing: number;
</script>

{#if $showInfoDialog}
	<div
		transition:fade={{ duration: 100 }}
		class="absolute bottom-0 z-30 flex h-full w-full items-center justify-center"
	>
		<div class="bg-opacity-8 bg-main h-[600px] w-[600px] rounded-full p-2">
			<div class="flex items-center justify-between">
				<button onclick={() => showInfoDialog.set(false)} class="bg-base rounded-full p-2">
					<Icon icon="material-symbols:close-rounded" class="text-main w-4] h-4" />
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
</style>
