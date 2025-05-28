<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade, fly, slide } from 'svelte/transition';

	import type { DemStyleMode } from '$routes/data/types/raster';

	interface Props {
		isMode: DemStyleMode;
	}
	let { isMode = $bindable() }: Props = $props();
	interface DemStyleModeOptions {
		key: DemStyleMode;
		name: string;
	}
	let demStyleModes = $state<DemStyleModeOptions[]>([
		{ key: 'evolution', name: '標高' },
		{ key: 'slope', name: '傾斜量' },
        { key: 'curvature', name: '曲率' },
		{ key: 'default', name: 'なし' }
		// { key: 'shadow', name: '陰影' },
		// { key: 'slope', name: '傾斜量' },
		// { key: 'curvature', name: '曲率' }
	]);

	let showPullDown = $state<boolean>(false);
</script>

<h2 class="text-base">描画モード</h2>
<div class="relative py-2">
	<button
		onclick={() => (showPullDown = !showPullDown)}
		class="c-select flex w-full justify-between"
	>
		<div class="flex items-center gap-2">
			<Icon icon={'ic:round-terrain'} width={20} />

			<span>{demStyleModes.find((mode) => mode.key === isMode)?.name}</span>
		</div>
		<Icon icon="bi:chevron-down" class="h-6 w-6" />
	</button>

	{#if showPullDown}
		<div
			transition:fly={{ duration: 200, y: -20 }}
			class="bg-sub absolute left-0 top-[60px] z-10 w-full divide-y divide-gray-400 overflow-hidden rounded-lg shadow-md"
		>
			{#each demStyleModes as { key, name } (key)}
				<label
					class="flex w-full cursor-pointer items-center justify-between gap-2 p-2 transition-colors duration-100 {isMode ===
					key
						? 'bg-base text-main'
						: 'hover:text-accent text-white'}"
				>
					<input
						type="radio"
						bind:group={isMode}
						value={key}
						class="hidden"
						onchange={() => (showPullDown = false)}
					/>
					<div class="flex items-center gap-2">
						<Icon icon={'ic:round-terrain'} width={20} />
						<span class="select-none">{name}</span>
					</div>
				</label>
			{/each}
		</div>
	{/if}
</div>

<style>
</style>
