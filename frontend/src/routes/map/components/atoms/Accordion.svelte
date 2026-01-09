<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { Snippet } from 'svelte';
	import { slide } from 'svelte/transition';
	interface Props {
		label: string;
		value?: boolean;
		icon?: string;
		children: Snippet;
	}
	let { label, value = $bindable(), icon, children }: Props = $props();
</script>

<label class="group flex grow cursor-pointer items-center justify-between gap-2 pt-4 pr-2 pb-2">
	<div class="flex items-center gap-2">
		{#if icon}
			<Icon {icon} class=" h-7 w-7 text-base transition-transform duration-100" />
		{/if}
		<span
			class="group-hover:text-accent text-base font-bold transition-colors duration-100 select-none"
			>{label}</span
		>
	</div>
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
