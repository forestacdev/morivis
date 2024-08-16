<script lang="ts">
	import type { CategoryEntry } from '$lib/utils/layers';
	import Icon from '@iconify/svelte';
	import InfoPopup from '$lib/components/InfoPopup.svelte';
	import type { LayerEntry } from '$lib/utils/layers';
	import { tooltip } from '@svelte-plugins/tooltips';

	export let backgroundIds: string[] = [];
	export let selectedBackgroundId: string = '';
	export let layerDataEntries: CategoryEntry[] = [];

	let selectedLayerEntry: LayerEntry | null = null;
	let selectedCategoryName: string | null = null;

	// トグルの切り替え
	const toggleDetails = (categoryName: string, layerEntry: LayerEntry) => {
		// クリックされたボタンのポップアップを表示する。それ以外は非表示にする。
		selectedLayerEntry = selectedLayerEntry === layerEntry ? null : layerEntry;
		selectedCategoryName = selectedLayerEntry ? categoryName : null;
	};
</script>

<div
	class="absolute left-4 top-12 z-10 max-h-[calc(100vh-8rem)] overflow-visible rounded bg-white p-4 text-neutral-700 shadow-2xl"
>
	<div class="flex flex-col gap-5">
		<div>
			<label for="background" class="block text-sm font-semibold leading-6 text-gray-900"
				>ベースマップ</label
			>
			<select
				bind:value={selectedBackgroundId}
				id="background"
				name="background"
				class="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
			>
				{#each backgroundIds as name (name)}
					<option value={name}>{name}</option>
				{/each}
			</select>
		</div>

		<div id="prefectures" class="flex flex-col gap-y-1">
			{#each layerDataEntries as categoryEntry (categoryEntry.categoryId)}
				<div class="mb-0 block text-sm font-semibold leading-6 text-gray-900">
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
	:global(.tooltip.custom-tooltip) {
		--tooltip-background-color: rgb(255, 255, 255);
		--tooltip-color: rgb(0, 0, 0);
		--tooltip-box-shadow: 0 1px 8px rgba(0, 0, 0, 0.25);
	}
</style>
