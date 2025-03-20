<script lang="ts">
	let { label, value = $bindable() }: { label: string; value: boolean | undefined } = $props();
</script>

<label class="flex flex-grow cursor-pointer gap-2">
	<span class="">{label}</span>
	<input type="checkbox" class="custom-checkbox" bind:checked={value} />
</label>

<style>
</style>
