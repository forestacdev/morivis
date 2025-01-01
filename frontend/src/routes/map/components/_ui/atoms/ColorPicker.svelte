<script setup lang="ts">
	export let label: string | null = null;
	export let value: string;
</script>

<label class="flex cursor-pointer gap-2">
	{#if label}
		<span class="">{label}</span>
	{/if}

	<input type="color" class="custom-color" bind:value />
</label>

<style>
</style>
