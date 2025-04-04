<script lang="ts">
	interface Props {
		label: string;
		value: boolean;
	}
	let { label, value = $bindable() }: Props = $props();
</script>

<label
	class="hover:text-accent flex flex-grow cursor-pointer items-start justify-between gap-2 py-2 transition-colors duration-100"
>
	<span class="select-none text-base font-bold">{label}</span>
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

<style>
</style>
