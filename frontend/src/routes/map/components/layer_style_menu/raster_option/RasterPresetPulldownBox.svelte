<script lang="ts">
	import type { DemStyleMode } from '$routes/map/data/types/raster';
	import type { RasterStylePreset } from '$routes/map/utils/raster';
	import Icon from '@iconify/svelte';
	import { fade, fly, slide } from 'svelte/transition';

	interface Props {
		preset: RasterStylePreset;
	}
	let { preset = $bindable() }: Props = $props();
	interface RasterStylePresetOptions {
		key: RasterStylePreset;
		name: string;
	}
	let presetOptions = $state<RasterStylePresetOptions[]>([
		{ key: 'default', name: 'デフォルト' },
		{ key: 'sepia', name: 'セピア' },
		{ key: 'grayscale', name: 'グレースケール' },
		{ key: 'vintage', name: 'ヴィンテージ' },
		{ key: 'cool', name: 'クール' },
		{ key: 'warm', name: 'ウォーム' },
		{ key: 'vivid', name: 'ビビッド' },
		{ key: 'soft', name: 'ソフト' },
		{ key: 'dramatic', name: 'ダイナミック' },
		{ key: 'night', name: 'ナイト' },
		{ key: 'sunset', name: 'サンセット' },
		{ key: 'blueprint', name: '青焼き' }
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

			<span>{presetOptions.find((option) => option.key === preset)?.name}</span>
		</div>
		<Icon icon="bi:chevron-down" class="h-6 w-6" />
	</button>

	{#if showPullDown}
		<div
			transition:fly={{ duration: 200, y: -20 }}
			class="bg-sub absolute left-0 top-[60px] z-10 w-full divide-y divide-gray-400 overflow-hidden rounded-lg shadow-md"
		>
			{#each presetOptions as { key, name } (key)}
				<label
					class="flex w-full cursor-pointer items-center justify-between gap-2 p-2 transition-colors duration-100 {preset ===
					key
						? 'bg-base text-main'
						: 'hover:text-accent text-white'}"
				>
					<input
						type="radio"
						bind:group={preset}
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
