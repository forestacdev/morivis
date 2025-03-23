<script lang="ts">
	export let label: string | null = null;
	export let value: string;
</script>

<label
	class="hover:text-accent flex cursor-pointer items-center justify-between transition-colors duration-100"
>
	{#if label}
		<span class="select-none">{label}</span>
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
