<script lang="ts">
	let { label, value = $bindable() }: { label: string; value: string } = $props();
</script>

<label class="flex w-full grow cursor-pointer flex-col items-start gap-2">
	<span class="select-none text-base font-bold">{label}</span>
	<input type="text" class="bg-base text-main w-full rounded-lg p-2 focus:outline-0" bind:value />
</label>

<style>
</style>
