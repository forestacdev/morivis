<script setup lang="ts">
	export let label: string;
	export let value: boolean;
</script>

<label class="flex flex-grow cursor-pointer gap-2">
	<span class="">{label}</span>
	<input type="checkbox" class="custom-checkbox" bind:checked={value} />
</label>

<style>
</style>
