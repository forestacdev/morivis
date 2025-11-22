<script lang="ts">
	interface Props {
		label?: string | null;
		value: string;
	}
	let { label, value = $bindable() }: Props = $props();
</script>

<label
	class="hover:text-accent flex cursor-pointer items-center justify-between py-2 pr-2 transition-colors duration-100"
>
	{#if label}
		<span class="select-none text-base">{label}</span>
	{/if}
	<div
		class="grid h-[30px] w-[30px] place-items-center rounded-full"
		style="background-color: {value}"
	>
		<input type="color" class="custom-color invisible" bind:value />
	</div>
</label>

<style>
</style>
