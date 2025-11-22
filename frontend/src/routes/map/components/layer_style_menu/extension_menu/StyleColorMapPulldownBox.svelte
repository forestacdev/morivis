<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade, fly, slide } from 'svelte/transition';

	import { type ColorMapType } from '$routes/map/data/types/raster';

	import type { Snippet } from 'svelte';
	import { type SequentialScheme } from '$routes/map/utils/color/color-brewer';

	interface Props {
		isColorMap: ColorMapType | SequentialScheme;
		mutableColorMapType: (ColorMapType | SequentialScheme)[];
		children: Snippet<[ColorMapType | SequentialScheme]>;
	}
	let { isColorMap = $bindable(), mutableColorMapType, children }: Props = $props();

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

			{@render children(isColorMap)}
		</div>
		<Icon icon="iconamoon:arrow-down-2-duotone" class="h-7 w-7" />
	</button>

	{#if showPullDown}
		<div
			transition:fly={{ duration: 200, y: -20 }}
			class="bg-sub c-scroll-sub absolute left-0 top-[60px] z-10 max-h-60 w-full divide-y divide-gray-300 overflow-hidden overflow-y-auto rounded-lg shadow-md"
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
					</div>
					{@render children(key)}
				</label>
			{/each}
		</div>
	{/if}
</div>

<style>
</style>
