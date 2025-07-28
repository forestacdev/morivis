<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade, fly, slide } from 'svelte/transition';

	import { COLOR_MAP_TYPE } from '$routes/map/data/types/raster';
	import type { ColorMapType } from '$routes/map/data/types/raster';
	import ColorScale from './ColorScale.svelte';

	interface Props {
		isColorMap: ColorMapType;
	}
	let { isColorMap = $bindable() }: Props = $props();

	let mutableColorMapType = $state<ColorMapType[]>([...COLOR_MAP_TYPE]);

	let showPullDown = $state<boolean>(false);

	let containerRef = $state<HTMLElement>();

	$effect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (showPullDown && containerRef && !containerRef.contains(event.target as Node)) {
				showPullDown = false;
			}
		};

		if (showPullDown) {
			document.addEventListener('click', handleClickOutside);
		}

		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<h2 class="text-base">カラーランプ</h2>
<div class="relative py-2" bind:this={containerRef}>
	<button
		onclick={() => (showPullDown = !showPullDown)}
		class="c-select flex w-full justify-between"
	>
		<div class="flex w-full items-center justify-center gap-2">
			<span class="w-[180px] select-none text-start">{isColorMap}</span>
			<ColorScale {isColorMap} />
		</div>
		<Icon icon="iconamoon:arrow-down-2-duotone" class="h-7 w-7" />
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
					<div class="flex w-full items-center justify-center gap-2">
						<span class="w-[200px] select-none">{key}</span>
						<ColorScale isColorMap={key} />
					</div>
				</label>
			{/each}
		</div>
	{/if}
</div>

<style>
</style>
