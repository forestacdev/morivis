<script setup lang="ts">
	export let selectFeatureList: any[];
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	const closePopup = () => {
		selectFeatureList = [];
		dispatch('closePopup');
	};
</script>

<div
	class="absolute flex h-full w-full flex-col gap-2 rounded shadow-2xl transition-all duration-200 {selectFeatureList &&
	selectFeatureList.length > 0
		? ''
		: 'menu-out'}"
>
	{#if selectFeatureList && selectFeatureList.length > 0}
		<button on:click={closePopup}>閉じる</button>
		{#each selectFeatureList as feature}
			<div class="bg-color-base flex max-w-md flex-col gap-4 rounded-md p-3 text-slate-100">
				<button class="flex gap-2">
					<span>{feature.name}</span>
				</button>
			</div>
		{/each}
	{/if}
</div>

<style>
</style>
