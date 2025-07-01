<script lang="ts">
	export let value: boolean;
	export let label: string;
</script>

<button on:click={() => (value = !value)}>{label}</button>

<style>
</style>
