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
	{#if options.length === 2}
		<div class="bg-sub relative flex w-full overflow-hidden rounded-full">
			<div
				class="bg-base absolute h-full w-1/2 rounded-full transition-transform duration-200 {options[0]
					.key === group
					? ''
					: 'translate-x-full'}"
			></div>
			{#each options as line (line.key)}
				<label class="z-10 flex w-full cursor-pointer items-center justify-center p-2 text-white">
					<input type="radio" bind:group value={line.key} class="hidden" />
					<span
						class="select-none transition-colors duration-200 {line.key === group
							? 'text-black'
							: ''}"
						>{line.name}
					</span>
				</label>
			{/each}
		</div>
	{/if}
	{#if options.length === 3}
		<div class="bg-sub relative flex w-full overflow-hidden rounded-full">
			<div
				class="bg-base absolute h-full w-1/3 rounded-full transition-transform duration-200 {options[0]
					.key === group
					? ''
					: options[1].key === group
						? 'translate-x-full'
						: 'translate-x-[200%]'}"
			></div>
			{#each options as line (line.key)}
				<label class="z-10 flex w-full cursor-pointer items-center justify-center p-2 text-white">
					<input type="radio" bind:group value={line.key} class="hidden" />
					<span
						class="select-none transition-colors duration-200 {line.key === group
							? 'text-black'
							: ''}"
						>{line.name}
					</span>
				</label>
			{/each}
		</div>
	{/if}
</div>

<style>
</style>
