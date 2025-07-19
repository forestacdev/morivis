<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade, fly, slide } from 'svelte/transition';

	import type { DemStyleMode } from '$routes/map/data/types/raster';

	interface Props {
		isMode: DemStyleMode;
	}
	let { isMode = $bindable() }: Props = $props();
	interface DemStyleModeOptions {
		key: DemStyleMode;
		name: string;
	}
	let demStyleModes = $state<DemStyleModeOptions[]>([
		{ key: 'relief', name: '段彩図' },
		{ key: 'slope', name: '傾斜量' },
		{ key: 'aspect', name: '傾斜方位' },
		{ key: 'default', name: 'なし' }
		// { key: 'curvature', name: '曲率' },
		// { key: 'shadow', name: '陰影' },
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
			<span>{demStyleModes.find((mode) => mode.key === isMode)?.name}</span>
		</div>
		<Icon icon="iconamoon:arrow-down-2-duotone" class="h-7 w-7" />
	</button>

	{#if showPullDown}
		<div
			transition:fly={{ duration: 200, y: -20 }}
			class="absolute left-0 top-[60px] z-10 w-full divide-y divide-gray-400 overflow-hidden rounded-lg bg-black shadow-md"
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
