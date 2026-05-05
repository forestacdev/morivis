<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fly } from 'svelte/transition';

	import type { RasterStylePreset } from '$routes/map/utils/style/raster-preset';
	import { getPresetCSSStyle } from '$routes/map/utils/style/raster-preset';

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
		{ key: 'blueprint', name: '青焼き' },
		{ key: 'negative', name: 'ネガポジ' }
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

	let hoverdName = $state<string>(
		presetOptions.find((option) => option.key === preset)?.name || ''
	);

	$effect(() => {
		if (showPullDown) {
			const currentOption = presetOptions.find((option) => option.key === preset);
			hoverdName = currentOption ? currentOption.name : '';
		} else {
			hoverdName = '';
		}
	});
</script>

<div bind:this={containerRef} class="relative py-2">
	<button
		{disabled}
		onclick={() => (showPullDown = !showPullDown)}
		class="bg-main-accent flex w-full items-center justify-between gap-2 rounded-full p-1 text-base transition-colors duration-150 lg:hover:bg-white lg:hover:text-black {disabled
			? 'cursor-not-allowed opacity-50'
			: 'cursor-pointer'}"
	>
		<div class="flex items-center gap-2">
			<img
				{src}
				alt={presetOptions.find((option) => option.key === preset)?.name}
				class="c-no-drag-icon aspect-square h-16 rounded-full bg-black object-cover"
				style="filter:{getPresetCSSStyle(preset).filter};"
			/>
			<span>{presetOptions.find((option) => option.key === preset)?.name}</span>
		</div>
		<Icon icon="iconamoon:arrow-down-2-duotone" class="mr-2 h-8 w-8 shrink-0" />
	</button>

	{#if showPullDown}
		<div
			transition:fly={{ duration: 200, y: -20 }}
			class="pointer-events-none absolute top-[90px] left-0 z-10 flex flex-col gap-2"
		>
			<div
				class="bg-sub pointer-events-auto grid w-full grid-cols-5 overflow-hidden rounded-[35px] p-1 shadow-md"
			>
				{#each presetOptions as { key, name } (key)}
					<label
						class="group flex w-full cursor-pointer flex-col items-center justify-between text-white transition-colors duration-100 {preset ===
						key
							? ''
							: ''}"
						onmouseenter={() => (hoverdName = name)}
					>
						<input
							type="radio"
							bind:group={preset}
							value={key}
							class="hidden"
							onchange={() => (showPullDown = false)}
							onclick={() => (showPullDown = false)}
						/>

						<div
							class="lg:hover:border-base overflow-hidden rounded-full border-3 {preset === key
								? 'border-accent'
								: 'border-transparent'}"
						>
							<img
								{src}
								alt={name}
								class="c-no-drag-icon aspect-square w-full bg-black object-cover"
								style="filter:{getPresetCSSStyle(key).filter};"
							/>
						</div>
						<!-- <span class="text-sm select-none">{name}</span> -->
					</label>
				{/each}
			</div>
			<div class="flex items-center justify-center">
				<span class="bg-sub w-full max-w-[200px] rounded-full p-1 text-center text-base select-none"
					>{hoverdName}</span
				>
			</div>
		</div>
	{/if}
</div>

<style>
</style>
