<script lang="ts">
	import type { VectorLayerType } from '$map/data/types/vector/style';
	let {
		group = $bindable(),
		options = $bindable()
	}: {
		group: string;
		options: {
			key: VectorLayerType;
			name: string;
		}[];
	} = $props();
</script>

<div class="flex items-center gap-2">
	{#each options as option}
		<label
			for={option.key}
			class="grid cursor-pointer place-items-center rounded-full bg-gray-400 p-2"
		>
			<input type="radio" id={option.key} bind:group value={option.key} class="hidden" />
			<span class="">{option.name}</span>
		</label>
	{/each}
</div>

<style>
</style>
