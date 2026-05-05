<script lang="ts">
	interface Props {
		label?: string;
		group: string | number;
		options: {
			key: string | number;
			name: string;
		}[];
	}
	let { label, group = $bindable(), options = $bindable() }: Props = $props();

	const selectOption = (key: string | number) => {
		group = key;
	};

	let selectedIndex = $derived.by(() => {
		const index = options.findIndex((option) => option.key === group);
		return index >= 0 ? index : 0;
	});
</script>

<div class="flex flex-col gap-2">
	{#if label}
		<div class="flex items-center gap-2 text-base select-none">
			<span>{label}</span>
		</div>
	{/if}
	<div class="border-sub bg-sub relative flex w-full overflow-hidden rounded-full border-2">
		{#if options.length > 0}
			<div
				class="bg-main-accent absolute top-0 left-0 h-full rounded-full transition-transform duration-200"
				style="width: calc(100% / {options.length}); transform: translateX({selectedIndex * 100}%);"
			></div>
			{#each options as line (line.key)}
				<button
					class="z-10 flex w-full cursor-pointer items-center justify-center rounded-full p-2 text-white transition-colors duration-50 {line.key ===
					group
						? ''
						: 'hover:bg-base hover:text-black'}"
					onclick={() => selectOption(line.key)}
				>
					<span class="transition-colors duration-50 select-none {line.key === group ? '' : ''}"
						>{line.name}
					</span>
				</button>
			{/each}
		{/if}
	</div>
</div>

<style>
</style>
