<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade, fly, slide } from 'svelte/transition';

	import { COLOR_MAP_TYPE } from '$routes/data/types/raster';
	import type { ColorMapType } from '$routes/data/types/raster';

	interface Props {
		isColorMap: ColorMapType;
	}
	let { isColorMap = $bindable() }: Props = $props();

	let mutableColorMapType = $state<ColorMapType[]>([...COLOR_MAP_TYPE]);

	let showPullDown = $state<boolean>(false);
</script>

<h2 class="text-base">カラーランプ</h2>
<div class="relative py-2">
	<button
		onclick={() => (showPullDown = !showPullDown)}
		class="c-select flex w-full justify-between"
	>
		<div class="flex items-center gap-2">
			<Icon icon={'bxs:color-fill'} width={20} />

			<span>{isColorMap}</span>
		</div>
		<Icon icon="bi:chevron-down" class="h-6 w-6" />
	</button>

	{#if showPullDown}
		<div
			transition:fly={{ duration: 200, y: -20 }}
			class="bg-sub absolute left-0 top-[60px] z-10 w-full divide-y divide-gray-300 overflow-hidden rounded-lg shadow-md"
		>
			{#each mutableColorMapType as key (key)}
				<label
					class="flex w-full cursor-pointer items-center justify-between gap-2 p-2 transition-colors duration-100 {isColorMap ===
					key
						? 'bg-base text-main'
						: 'hover:text-accent text-white'}"
				>
					<input
						type="radio"
						bind:group={isColorMap}
						value={key}
						class="hidden"
						onchange={() => (showPullDown = false)}
					/>
					<div class="flex items-center gap-2">
						<Icon icon={'bxs:color-fill'} width={20} />
						<span class="select-none">{key}</span>
					</div>
				</label>
			{/each}
		</div>
	{/if}
</div>

<style>
</style>
