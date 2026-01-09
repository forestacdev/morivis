<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade, fly, slide } from 'svelte/transition';

	import type { BandTypeKey, RasterTiffStyle } from '$routes/map/data/types/raster';

	interface Props {
		isMode: BandTypeKey;
	}
	let { isMode = $bindable() }: Props = $props();
	interface TiffStyleModeOptions {
		key: BandTypeKey;
		name: string;
	}
	let demStyleModes = $state<TiffStyleModeOptions[]>([
		{ key: 'single', name: '単バンド擬似カラー' },
		{ key: 'multi', name: 'マルチバンドカラー' }
		// { key: 'shadow', name: '陰影' },
		// { key: 'slope', name: '傾斜量' },
		// { key: 'aspect', name: '傾斜方向' },
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
			class="bg-sub absolute top-[60px] left-0 z-10 w-full divide-y divide-gray-400 overflow-hidden rounded-lg shadow-md"
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
