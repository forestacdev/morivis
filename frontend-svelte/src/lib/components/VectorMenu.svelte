<script lang="ts">
	import type { CategoryEntry } from '$lib/utils/layers';
	import Icon from '@iconify/svelte';
	import InfoPopup from '$lib/components/InfoPopup.svelte';
	import type { LayerEntry } from '$lib/utils/layers';
	import { tooltip } from '@svelte-plugins/tooltips';
	import { isSide } from '$lib/store/store';

	export let layerDataEntries: CategoryEntry[] = [];

	let selectedLayerEntry: LayerEntry | null = null;
	let selectedCategoryName: string | null = null;
</script>

<div
	class="bg-color-base absolute left-4 h-full overflow-visible rounded p-4 text-slate-100 shadow-2xl transition-all duration-200 {$isSide ===
	'vector'
		? ''
		: 'menu-out'}"
>
	<div class="flex flex-col gap-5">
		<div id="prefectures" class="flex flex-col gap-y-1">
			{#each layerDataEntries as categoryEntry (categoryEntry.categoryId)}
				<div class="mb-0 block text-sm font-semibold leading-6">
					{categoryEntry.categoryName}
				</div>
				<div class="layers flex flex-col gap-y-2">
					{#each categoryEntry.layers as layerEntry (layerEntry.id)}
						<div class="flex items-center justify-between gap-x-2">
							<div>{layerEntry.name}</div>
							<div class="justify-end">
								<div class="flex">
									<div
										class="flex w-12 cursor-pointer items-center justify-center"
									>
										<u
											use:tooltip={{
												content: `${categoryEntry.categoryName}:${layerEntry.name}`,
												action: 'click',
												animation: 'fade',
												hideOnClickOutside: true,
												delay: 0,
												position: 'bottom',
												theme: 'custom-tooltip',
												maxWidth: 350
											}}
											class=""><Icon icon="icon-park-twotone:info" /></u
										>
									</div>

									<!-- スイッチの表示 -->
									<label
										class="my-1 ml-3 inline-flex cursor-pointer items-center"
									>
										<input
											type="checkbox"
											id={layerEntry.name}
											bind:checked={layerEntry.visible}
											value={layerEntry}
											class="peer sr-only"
										/>
										<div
											class="h-6 w-11 rounded-full bg-gray-200 transition-colors duration-200 ease-in-out peer-checked:bg-indigo-600 peer-focus:ring-2 peer-focus:ring-indigo-600 peer-focus:ring-offset-2"
										></div>
										<div
											class="absolute h-5 w-5 transform rounded-full border-2 border-gray-300 bg-white transition-transform duration-200 ease-in-out peer-checked:translate-x-6 peer-checked:border-white"
										></div>
									</label>
								</div>
							</div>
						</div>
						<div>
							{#if layerEntry.visible}
								<!-- 透過度の設定 -->
								<div class="flex gap-x-2">
									<div class="w-20">透過度:</div>
									<input
										type="range"
										class="my-2 w-full"
										bind:value={layerEntry.opacity}
										min="0"
										max="1"
										step="0.01"
									/>
								</div>
							{/if}
						</div>
						<!-- infoのポップアップの表示 -->
						{#if selectedLayerEntry === layerEntry}
							<div class="overflow-hidden rounded-lg bg-white shadow">
								<div class="sm:p-0.5">
									<InfoPopup
										categoryName={categoryEntry.categoryName}
										{layerEntry}
									/>
								</div>
							</div>
						{/if}
					{/each}
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
</style>
