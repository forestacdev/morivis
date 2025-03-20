<script lang="ts">
	let {
		label,
		group = $bindable(),
		options = $bindable()
	}: {
		label: string;
		group: string;
		options: {
			key: string;
			name: string;
		}[];
	} = $props();
</script>

<div class="flex flex-col gap-2">
	<div class="flex select-none items-center gap-2">
		<span>{label}</span>
	</div>
	<div class="flex w-full overflow-hidden rounded-full">
		{#each options as line (line.key)}
			<label
				for={line.key}
				class="text z-20 flex w-full cursor-pointer items-center justify-center bg-gray-400 p-2"
				class:bg-green-600={line.key === group}
			>
				<input type="radio" id={line.key} bind:group value={line.key} class="hidden" />
				<span class="select-none">{line.name}</span>
			</label>
		{/each}
	</div>
</div>

<style>
</style>
