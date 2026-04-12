<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fly } from 'svelte/transition';

	import ModelOptionMenu from './ModelOptionMenu.svelte';

	import { ICONS, getVisibilityIconName } from '$lib/icons';
	import RasterOptionMenu from '$routes/map/components/layer_style_menu/RasterOptionMenu.svelte';
	import VectorOptionMenu from '$routes/map/components/layer_style_menu/VectorOptionMenu.svelte';
	import { getInitialEntryStyle } from '$routes/map/data/entries';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { Opacity } from '$routes/map/data/types';
	import { getLayerImage } from '$routes/map/utils/image';
	import { getBaseMapImageUrl } from '$routes/map/utils/image/vector';
	import { selectedLayerId, isStyleEdit } from '$routes/stores';
	import { resetLayerStyleConfirm } from '$routes/stores/confirmation';

	interface Props {
		layerEntry: GeoDataEntry | null;
		tempLayerEntries: GeoDataEntry[];
	}

	let { layerEntry = $bindable(), tempLayerEntries = $bindable() }: Props = $props();
	let showVisibleOption = $state<boolean>(false);
	let showColorOption = $state<boolean>(false);

	interface OpacityButton {
		label: string;
		value: Opacity;
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

	const resetStyle = async () => {
		if (!layerEntry) return;
		const result = await resetLayerStyleConfirm();
		if (!result) return;

		const initialStyle = getInitialEntryStyle(layerEntry.id);
		if (!initialStyle) return;

		layerEntry.style = initialStyle;
	};
</script>

{#if layerEntry}
	<div
		in:fly={{ duration: 300, opacity: 0, x: -100 }}
		out:fly={{ duration: 300, opacity: 0, x: -100, delay: 150 }}
		class="bg-main lg:w-side-menu absolute z-10 flex flex-col gap-2 overflow-hidden pl-2 max-lg:bottom-0 max-lg:h-1/2 max-lg:w-full max-lg:pt-2 lg:top-0 lg:h-full"
	>
		{#key layerEntry.id}
			<div
				in:fly={{ duration: 300, opacity: 10 }}
				out:fly={{ duration: 300, opacity: 0 }}
				class="absolute flex h-full w-full flex-col gap-2 px-2"
			>
				<div class="flex items-center gap-2 pt-4 pr-3 pb-3">
					<!-- タイトル -->
					<div class="truncate text-2xl text-base">
						<span class="select-none">{layerEntry.metaData.name}</span>
					</div>
					<button
						onclick={resetStyle}
						class="bg-base text-main ml-auto grid shrink-0 cursor-pointer place-items-center rounded-full p-2"
						title="スタイルをリセット"
					>
						<Icon icon={ICONS.reset} class="h-5 w-5" />
					</button>
					<button
						onclick={() => {
							isStyleEdit.set(false);
							selectedLayerId.set('');
						}}
						class="bg-base text-main grid shrink-0 cursor-pointer place-items-center rounded-full p-2"
					>
						<Icon icon={ICONS.close} class="h-5 w-5" />
					</button>
				</div>

				<div class="c-scroll-hidden relative flex h-full flex-col overflow-x-hidden">
					<!-- スクロールコンテンツ -->
					<div class="c-scroll-hidden h-full grow overflow-x-hidden rounded-lg pr-4 pb-[300px]">
						<div class="flex w-full justify-between rounded-lg bg-black p-2">
							<!-- 表示 -->
							<button
								class="flex aspect-square w-[19%] flex-col items-center gap-1"
								onclick={() => {
									if (layerEntry) {
										layerEntry.style.visible = false;
									}
								}}
							>
								<div
									class="hover:bg-accent grid aspect-square w-full cursor-pointer place-items-center rounded-lg object-cover text-left {!layerEntry
										.style.visible
										? 'bg-accent'
										: ''}"
								>
									<Icon icon={getVisibilityIconName(false)} class="h-8 w-8 text-base/90" />
								</div>

								<span
									class="rounded-lg p-1 px-2 text-base text-sm transition-colors duration-150 select-none {!layerEntry
										.style.visible
										? 'bg-accent text-black'
										: 'border-base'}">隠す</span
								>
							</button>
							<!-- 不透明度 -->
							{#each opacityButtons as item (item.label)}
								<button
									class="flex aspect-square w-[19%] flex-col items-center gap-1 select-none"
									onclick={() => {
										if (layerEntry) {
											layerEntry.style.visible = true;
											layerEntry.style.opacity = item.value;
										}
									}}
								>
									{#if src}
										<div
											class=" relative h-full w-full overflow-hidden rounded-lg border-2 {layerEntry
												.style.opacity === item.value && layerEntry.style.visible
												? 'border-accent set-glow'
												: 'border-transparent'}"
										>
											<!-- 背景地図画像 -->
											{#if layerEntry.metaData.xyzImageTile && layerEntry.type === 'vector'}
												<img
													src={getBaseMapImageUrl(layerEntry.metaData.xyzImageTile)}
													class="c-basemap-img absolute top-0 left-0 h-full w-full scale-200 cursor-pointer object-cover text-left text-sm"
													alt="背景地図画像"
												/>
											{/if}
											<img
												{src}
												alt={layerEntry.metaData.name}
												class="c-no-drag-icon absolute top-0 left-0 h-full w-full scale-200 cursor-pointer text-left text-sm"
												style="opacity: {item.value};"
											/>
										</div>
									{/if}
									<span
										class="rounded-lg p-1 px-2 text-base text-sm transition-colors duration-150 select-none {layerEntry
											.style.opacity === item.value && layerEntry.style.visible
											? 'bg-accent text-black'
											: 'border-base'}">{item.label}</span
									>
								</button>
							{/each}
						</div>

						{#if layerEntry.type === 'vector'}
							<VectorOptionMenu bind:layerEntry bind:showColorOption />
						{/if}

						{#if layerEntry.type === 'raster'}
							<RasterOptionMenu bind:layerEntry bind:showColorOption />
						{/if}

						{#if layerEntry.type === 'model'}
							<ModelOptionMenu bind:layerEntry bind:showColorOption />
						{/if}
					</div>
					<div
						class="c-bg-fog-bottom pointer-events-none absolute bottom-0 z-10 h-[150px] w-full"
					></div>
				</div>
			</div>
		{/key}
		<div
			class="absolute bottom-0 -z-10 grid -translate-x-[200px] translate-y-[200px] animate-[spin_25s_linear_infinite] place-items-center opacity-[3%]"
		>
			<svg
				version="1.1"
				id="_x32_"
				xmlns="http://www.w3.org/2000/svg"
				xmlns:xlink="http://www.w3.org/1999/xlink"
				x="0px"
				y="0px"
				viewBox="0 0 512 512"
				style="width: 500px; height: 500px; fill: white;"
				xml:space="preserve"
			>
				<g>
					<path
						class="st0"
						d="M499.453,210.004l-55.851-2.58c-5.102-0.23-9.608-3.395-11.546-8.103l-11.508-27.695
                                    c-1.937-4.728-0.997-10.145,2.455-13.914l37.668-41.332c4.718-5.188,4.546-13.205-0.421-18.182l-46.434-46.443
                                    c-4.986-4.967-13.003-5.159-18.2-0.412l-41.312,37.668c-3.778,3.443-9.206,4.402-13.924,2.436l-27.694-11.488
                                    c-4.718-1.946-7.864-6.454-8.094-11.565l-2.589-55.831C301.675,5.534,295.883,0,288.864,0h-65.708
                                    c-7.02,0-12.831,5.534-13.156,12.562l-2.571,55.831c-0.23,5.111-3.376,9.618-8.094,11.565L171.64,91.447
                                    c-4.737,1.966-10.165,1.007-13.924-2.436l-41.331-37.668c-5.198-4.746-13.215-4.564-18.201,0.412L51.769,98.198
                                    c-4.986,4.977-5.158,12.994-0.422,18.182l37.668,41.332c3.452,3.769,4.373,9.186,2.416,13.914l-11.469,27.695
                                    c-1.956,4.708-6.444,7.873-11.564,8.103l-55.832,2.58c-7.019,0.316-12.562,6.118-12.562,13.147v65.699
                                    c0,7.019,5.543,12.83,12.562,13.148l55.832,2.579c5.12,0.229,9.608,3.394,11.564,8.103l11.469,27.694
                                    c1.957,4.728,1.036,10.146-2.416,13.914l-37.668,41.313c-4.756,5.217-4.564,13.224,0.403,18.201l46.471,46.443
                                    c4.967,4.977,12.965,5.15,18.182,0.422l41.312-37.677c3.759-3.443,9.207-4.392,13.924-2.435l27.694,11.478
                                    c4.719,1.956,7.864,6.464,8.094,11.575l2.571,55.831c0.325,7.02,6.136,12.562,13.156,12.562h65.708
                                    c7.02,0,12.812-5.542,13.138-12.562l2.589-55.831c0.23-5.111,3.376-9.619,8.094-11.575l27.694-11.478
                                    c4.718-1.957,10.146-1.008,13.924,2.435l41.312,37.677c5.198,4.728,13.215,4.555,18.2-0.422l46.434-46.443
                                    c4.967-4.977,5.139-12.984,0.421-18.201l-37.668-41.313c-3.452-3.768-4.412-9.186-2.455-13.914l11.508-27.694
                                    c1.937-4.709,6.444-7.874,11.546-8.103l55.851-2.579c7.019-0.318,12.542-6.129,12.542-13.148v-65.699
                                    C511.995,216.122,506.472,210.32,499.453,210.004z M256.01,339.618c-46.164,0-83.622-37.438-83.622-83.612
                                    c0-46.184,37.458-83.622,83.622-83.622s83.602,37.438,83.602,83.622C339.612,302.179,302.174,339.618,256.01,339.618z"
					></path>
				</g>
			</svg>
		</div>
	</div>
{/if}

<style>
	.set-glow {
		filter: drop-shadow(0 0 3px var(--color-accent));
	}
</style>
