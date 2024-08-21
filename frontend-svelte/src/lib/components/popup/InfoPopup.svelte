<script setup lang="ts">
	export let feature: any;

	// $: console.log(feature);
</script>

<!-- <div class="flex max-w-md flex-col gap-4 p-3"></div> -->

<div class="transition-all duration-150 bg-color-base menu-in flex flex-col gap-4 p-3 text-slate-100 h-[600px] overflow-y-auto overflow-x-hidden custom-scroll {feature ? '': 'opacity-0 translate-x-[400px]'}">
	{#if feature}
		{#if feature.properties['image']}
			<div class="flex gap-2">
				<img src={feature.properties['image']} alt="image" />
			</div>
		{/if}
		{#each Object.keys(feature.properties) as key}
			<div class="flex gap-2">
				<span>{key}</span>
				<span>{feature.properties[key]}</span>
			</div>
		{/each}
	{/if}
</div>

<style>
	.menu-in {
		/* transform: rotateY(-15deg); */
	}
</style>
