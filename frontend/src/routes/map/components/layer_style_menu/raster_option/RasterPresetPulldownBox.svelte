<script lang="ts">
	import type { RasterStylePreset } from '$routes/map/utils/raster';
	import { getPresetCSSStyle } from '$routes/map/utils/raster';
	import Icon from '@iconify/svelte';
	import { fade, fly, slide } from 'svelte/transition';

	interface Props {
		preset: RasterStylePreset;
		src: string;
		disabled?: boolean; // プルダウンを無効にするかどうか
	}
	let { preset = $bindable(), src, disabled = false }: Props = $props();
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

<div class="mt-4 flex gap-1 text-base">
	<Icon icon={'mdi:magic'} width={20} /><span>描画モード</span>
</div>

<div bind:this={containerRef} class="relative py-2">
	<button
		{disabled}
		onclick={() => (showPullDown = !showPullDown)}
		class="flex w-full items-center justify-between gap-2 rounded-md bg-black p-2 px-4 text-base {disabled
			? 'cursor-not-allowed opacity-50'
			: 'cursor-pointer'}"
	>
		<span>{presetOptions.find((option) => option.key === preset)?.name}</span>
		<img
			{src}
			alt={presetOptions.find((option) => option.key === preset)?.name}
			class="aspect-square h-24 rounded border-2 border-white bg-black object-cover"
			style="filter:{getPresetCSSStyle(preset).filter};"
		/>
	</button>

	{#if showPullDown}
		<div
			transition:fly={{ duration: 200, y: -20 }}
			class="bg-sub absolute left-0 top-[130px] z-10 grid w-full grid-cols-3 gap-1 overflow-hidden rounded-lg shadow-md"
		>
			{#each presetOptions as { key, name } (key)}
				<label
					class="group flex w-full cursor-pointer flex-col items-center justify-between gap-2 p-2 text-white transition-colors duration-100 {preset ===
					key
						? ''
						: ''}"
				>
					<input
						type="radio"
						bind:group={preset}
						value={key}
						class="hidden"
						onchange={() => (showPullDown = false)}
					/>

					<img
						{src}
						alt={name}
						class="aspect-square w-full rounded border-2 bg-black object-cover {preset === key
							? 'border-accent'
							: 'border-white'}"
						style="filter:{getPresetCSSStyle(key).filter};"
					/>
					<span class="select-none text-sm">{name}</span>
				</label>
			{/each}
		</div>
	{/if}
</div>

<style>
</style>
