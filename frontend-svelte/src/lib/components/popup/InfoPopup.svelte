<script setup lang="ts">
	export let feature: any;

	$: console.log(feature);
</script>

<div class="flex max-w-md flex-col gap-4 p-3"></div>

<div class="bg-color-base flex max-w-md flex-col gap-4 p-3 text-slate-100">
	{#if feature}
		{#each Object.keys(feature.properties) as key}
			<div class="flex gap-2">
				<span>{key}</span>
				<span>{feature.properties[key]}</span>
			</div>
		{/each}
	{/if}
</div>

<style>
</style>
