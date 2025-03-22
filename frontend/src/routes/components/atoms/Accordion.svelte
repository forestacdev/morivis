<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { Snippet } from 'svelte';
	import { slide } from 'svelte/transition';
	let {
		label,
		value = $bindable(),
		children
	}: { label: string; value: boolean | undefined; children: Snippet } = $props();
</script>

<label
	class="hover:text-accent flex flex-grow cursor-pointer items-center justify-start gap-2 pb-2 pt-4 transition-colors duration-100"
>
	<Icon
		icon="weui:arrow-filled"
		class="h-6 w-6 transition-transform duration-150 {value ? 'rotate-90' : 'rotate-0'}"
	/>
	<span class="select-none font-bold">{label}</span>
	<input type="checkbox" class="hidden" bind:checked={value} />
</label>

{#if value}
	<div transition:slide={{ duration: 250 }}>
		{@render children()}
	</div>
{/if}
<div class="mt-2 h-[1px] w-full bg-gray-500"></div>

<style>
</style>
