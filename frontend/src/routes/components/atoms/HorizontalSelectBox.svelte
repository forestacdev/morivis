<script lang="ts">
	interface Props {
		label?: string;
		group: string;
		options: {
			key: string;
			name: string;
		}[];
	}
	let { label, group = $bindable(), options = $bindable() }: Props = $props();
</script>

<div class="flex flex-col gap-2">
	{#if label}
		<div class="flex select-none items-center gap-2 text-base">
			<span>{label}</span>
		</div>
	{/if}
	<div class="relative flex w-full overflow-hidden rounded-full bg-gray-400">
		<div
			class="bg-accent absolute h-full w-1/2 rounded-full transition-transform duration-200 {options[0]
				.key === group
				? ''
				: 'translate-x-full'}"
		></div>
		{#each options as line (line.key)}
			<label
				for={line.key}
				class="z-10 flex w-full cursor-pointer items-center justify-center p-2 text-white"
			>
				<input type="radio" id={line.key} bind:group value={line.key} class="hidden" />
				<span class="select-none">{line.name}</span>
			</label>
		{/each}
	</div>
</div>

<style>
</style>
