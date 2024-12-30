<script setup lang="ts">
	export let options: string[];
	export let value: string;
</script>

<select class="custom-select" bind:value>
	{#each options as item (item)}
		<option value={item}>{item}</option>
	{/each}
</select>

<style>
</style>
