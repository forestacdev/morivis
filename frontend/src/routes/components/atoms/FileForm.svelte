<script lang="ts">
	interface Props {
		label: string;
		file: File | null;
		accept: string;
		error?: string;
		name: string;
	}
	let {
		label,
		file = $bindable(),
		accept = $bindable(),
		error,
		name = $bindable()
	}: Props = $props();

	const inputFile = (e: Event) => {
		const fileData = (e.target as HTMLInputElement).files?.[0];
		if (fileData) {
			file = fileData;
			name = fileData.name;
		}
	};

	let fileName = $state<string>('');
	$effect(() => {
		if (file) {
			fileName = file.name;
		} else {
			fileName = '';
		}
	});
</script>

<label
	class="bg-sub relative flex w-full max-w-[300px] cursor-pointer flex-col items-center gap-2 rounded-full p-4"
	><span>{label}</span>
	{#if name}
		<span class="text-sm">{name}</span>
	{/if}

	<span class="absolute bottom-0 text-red-500">{error ? error : ''}</span>
	<input type="file" {accept} class="hidden" onchange={(e) => inputFile(e)} />
</label>

<style>
</style>
