<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { Snippet } from 'svelte';
	import { slide } from 'svelte/transition';
	interface Props {
		label: string;
		value?: boolean;
		children: Snippet;
	}
	let { label, value = $bindable(), children }: Props = $props();
</script>

<label class="group flex grow cursor-pointer items-center justify-between gap-2 pb-2 pt-4">
	<span
		class="group-hover:text-accent select-none text-base font-bold transition-colors duration-100"
		>{label}</span
	>
	<Icon
		icon="iconamoon:arrow-up-2-duotone"
		class="h-8 w-8 text-base transition-transform duration-150 {value ? 'rotate-0' : 'rotate-180'}"
	/>

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
