<script lang="ts">
	interface Props {
		label: string;
		items: { key: string; name: string; detail: string; code?: string }[];
		selected: string[];
		disabled?: boolean;
	}
	let { label, items, selected = $bindable(), disabled = false }: Props = $props();
</script>

<fieldset class="c-scroll min-h-0 overflow-y-auto rounded border border-white/15 p-3" {disabled}>
	<legend class="px-1 text-sm">{label}</legend>
	{#each items as item (item.key)}
		<label class="flex items-start gap-3 py-2 text-sm">
			<input type="checkbox" bind:group={selected} value={item.key} class="mt-1" />
			<span class="min-w-0 break-words">
				{#if item.code}<span class="font-mono text-gray-400">{item.code}</span>{/if}
				{item.name}
				<span class="block text-xs text-gray-400">{item.detail}</span>
			</span>
		</label>
	{/each}
</fieldset>
