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
		<span class="text-base select-none">{label}</span>
	{/if}
	<div class="relative h-[30px] w-[30px] rounded-full" style="background-color: {value}">
		<input
			type="color"
			class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
			bind:value
		/>
	</div>
</label>

<style>
</style>
