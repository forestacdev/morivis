<script lang="ts">
	interface Props {
		label: string;
		value: string;
		error?: string;
	}
	let { label, value = $bindable(), error }: Props = $props();
</script>

<label class="relative flex w-full grow cursor-pointer flex-col items-start gap-2 pb-8">
	<span class="text-base font-bold select-none">{label}</span>
	<input type="text" class="bg-base text-main w-full rounded-lg p-2 focus:outline-0" bind:value />
	<span class="absolute bottom-0 text-red-500">{error ? error : ''}</span>
</label>

<style>
</style>
