<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fly } from 'svelte/transition';

	import RasterOptionMenu from '$routes/map/components/layer_style_menu/RasterOptionMenu.svelte';
	import VectorOptionMenu from '$routes/map/components/layer_style_menu/VectorOptionMenu.svelte';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { selectedLayerId, isStyleEdit } from '$routes/stores';

	import { getLayerImage } from '$routes/map/utils/image';

	interface Props {
		layerEntry: GeoDataEntry | null;
		tempLayerEntries: GeoDataEntry[];
	}

	let { layerEntry = $bindable(), tempLayerEntries = $bindable() }: Props = $props();
	let showVisibleOption = $state<boolean>(false);
	let showColorOption = $state<boolean>(false);

	const handleKeydown = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			layerEntry = null;
		}
	};
	interface OpacityButton {
		label: string;
		value: number;
	}

	const opacityButtons: OpacityButton[] = [
		{
			label: '30％',
			value: 0.3
		},
		{
			label: '50％',
			value: 0.5
		},
		{
			label: '70％',
			value: 0.7
		},
		{
			label: '100％',
			value: 1
		}
	];

	// const promise = (() => {
	// 	try {
	// 		if (layerEntry === null) {
	// 			return Promise.resolve(undefined);
	// 		}
	// 		return getLayerImage(layerEntry);
	// 	} catch (error) {
	// 		console.error('Error generating icon image:', error);
	// 		return Promise.resolve(undefined);
	// 	}
	// })();
	let src = $state<string | undefined>(undefined);
	const getImage = async (_layerEntry: GeoDataEntry) => {
		try {
			const imageResult = await getLayerImage(_layerEntry);
			src = imageResult ? imageResult.url : undefined;
		} catch (error) {
			console.error('Error generating icon image:', error);
			return undefined;
		}
	};

	$effect(() => {
		if (layerEntry) {
			getImage(layerEntry);
		}
	});
</script>

<svelte:window on:keydown={handleKeydown} />

{#if layerEntry}
	<div
		in:fly={{ duration: 300, opacity: 0, x: -100 }}
		out:fly={{ duration: 300, opacity: 0, x: -100, delay: 150 }}
		class="bg-main w-side-menu absolute top-0 z-10 flex h-full flex-col gap-2 overflow-hidden pl-2"
	>
		{#key layerEntry.id}
			<div
				in:fly={{ duration: 300, opacity: 10 }}
				out:fly={{ duration: 300, opacity: 0 }}
				class="absolute flex h-full w-full flex-col gap-2 px-2"
			>
				<div class="flex h-[80px] items-center gap-2 pr-2">
					<Icon icon="streamline:paint-palette-solid text-base" class="h-7 w-7" />
					<span class="select-none text-base text-lg max-lg:hidden">データのカスタマイズ</span>
					<button
						onclick={() => {
							isStyleEdit.set(false);
							selectedLayerId.set('');
						}}
						class="bg-base ml-auto grid shrink-0 cursor-pointer place-items-center rounded-full p-2"
					>
						<Icon icon="material-symbols:close-rounded" class="h-6 w-6" />
					</button>
				</div>
				<div class="text-2xl text-base">{layerEntry.metaData.name}</div>

				<div class="c-scroll h-full grow overflow-x-hidden pb-[300px]">
					<div class="flex w-full justify-center gap-2">
						<!-- 表示 -->
						<button
							class="flex aspect-square w-1/6 flex-col items-center gap-1"
							onclick={() => {
								if (layerEntry) {
									layerEntry.style.visible = false;
								}
							}}
						>
							<div
								class="hover:bg-accent border-base/80 grid aspect-square w-full cursor-pointer place-items-center rounded-full border-2 object-cover text-left {!layerEntry
									.style.visible
									? 'bg-accent'
									: ''}"
							>
								<Icon icon={'akar-icons:eye-slashed'} class="text-base/90 h-8 w-8" />
							</div>

							<span
								class="select-none rounded-lg p-1 px-2 text-base text-sm transition-colors duration-150 {!layerEntry
									.style.visible
									? 'bg-accent text-black'
									: 'border-base'}">隠す</span
							>
						</button>
						<!-- 不透明度 -->
						{#each opacityButtons as item (item.label)}
							<button
								class="flex aspect-square w-1/6 flex-col items-center gap-1"
								onclick={() => {
									if (layerEntry) {
										layerEntry.style.visible = true;
										layerEntry.style.opacity = item.value;
									}
								}}
							>
								{#if src}
									<div
										class="rounded-full border-2 {layerEntry.style.opacity === item.value &&
										layerEntry.style.visible
											? 'border-accent'
											: 'border-base/80'}"
									>
										<img
											{src}
											alt={layerEntry.metaData.name}
											class="hover:bg-accent c-no-drag-icon aspect-square cursor-pointer rounded-full object-cover text-left text-sm"
											style="opacity: {item.value};"
										/>
									</div>
								{/if}
								<span
									class="select-none rounded-lg p-1 px-2 text-base text-sm transition-colors duration-150 {layerEntry
										.style.opacity === item.value && layerEntry.style.visible
										? 'bg-accent text-black'
										: 'border-base'}">{item.label}</span
								>
							</button>
						{/each}
					</div>

					<!-- <Switch
							label="表示"
							bind:value={layerEntry.style.visible as boolean}
							icon={'akar-icons:eye'}
						/>
						<RangeSlider
							label={'不透明度'}
							bind:value={layerEntry.style.opacity}
							min={0.1}
							max={1}
							step={0.01}
							icon={'mdi:circle-opacity'}
						/> -->
					{#if layerEntry.type === 'vector'}
						<VectorOptionMenu bind:layerEntry bind:showColorOption />
					{/if}

					{#if layerEntry.type === 'raster'}
						<RasterOptionMenu bind:layerEntry bind:showColorOption />
					{/if}
				</div>
			</div>
		{/key}
	</div>
{/if}

<style>
</style>
