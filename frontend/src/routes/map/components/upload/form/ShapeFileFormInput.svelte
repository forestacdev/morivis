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

<div class="relative">
	<label
		class="relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg bg-white p-4"
		><span class="absolute">{label}</span>

		<div class="p-12 {file ? '' : ''}"></div>

		<span class="absolute bottom-0 text-sm text-red-500">{error ? error : ''}</span>
		<input type="file" {accept} class="hidden" onchange={(e) => inputFile(e)} />
		{#if name}
			<div
				class="pointer-events-none absolute grid place-items-center overflow-clip rounded-lg bg-white p-2 text-sm text-gray-500"
			>
				<span class="text-sm">{name}</span>
			</div>
		{/if}
	</label>
</div>

<style>
</style>
