<script lang="ts">
	import Icon from '@iconify/svelte';

	interface Props {
		label: string;
		value: boolean;
		icon?: string;
	}
	let { label, value = $bindable(), icon }: Props = $props();
</script>

<label
	class="hover:text-main-accent flex grow cursor-pointer items-start justify-between gap-2 py-2 pr-4 text-base transition-colors duration-100"
	><div class="flex items-center gap-1">
		{#if icon}
			<Icon icon={'akar-icons:eye'} class="h-6 w-6" />
		{/if}
		<span class="select-none font-bold">{label}</span>
	</div>
	<input type="checkbox" class="hidden" bind:checked={value} />
	<div
		class="relative flex h-[30px] w-[60px] items-center rounded-full {value
			? 'bg-main-accent'
			: 'bg-sub'}"
	>
		<div
			class="ml-[5px] h-[22px] w-[22px] rounded-full bg-white transition-transform duration-200 {value
				? 'translate-x-[28px]'
				: ''}"
		></div>
	</div>
</label>

<style>
</style>
