<script lang="ts">
	import type { Snippet } from 'svelte';
	import { slide } from 'svelte/transition';
	let {
		label,
		value = $bindable(),
		children
	}: { label: string; value: boolean | undefined; children: Snippet } = $props();
</script>

<label class="flex flex-grow cursor-pointer items-center justify-between gap-2 py-2">
	<span class="select-none font-bold">{label}</span>
	<input type="checkbox" class="hidden" bind:checked={value} />
	<div
		class="relative flex h-[30px] w-[60px] items-center rounded-full {value
			? 'bg-accent'
			: 'bg-gray-400'}"
	>
		<div
			class="ml-[5px] h-[22px] w-[22px] rounded-full bg-white transition-transform duration-200 {value
				? 'translate-x-[28px]'
				: ''}"
		></div>
	</div>
</label>

{#if value}
	<div transition:slide={{ duration: 250 }}>
		{@render children()}
		<div class="mt-2 h-[1px] w-full bg-gray-500"></div>
	</div>
{/if}

<style>
</style>
