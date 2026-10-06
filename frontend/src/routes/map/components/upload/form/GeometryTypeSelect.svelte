<script lang="ts">
	import { VECTOR_GEOMETRY_LABELS } from './vector-entry-group';

	import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';

	let {
		options,
		selected = $bindable(),
		disabled = false
	}: {
		options: VectorEntryGeometryType[];
		selected: VectorEntryGeometryType[];
		disabled?: boolean;
	} = $props();
</script>

<fieldset class="w-full p-2" {disabled}>
	<legend class="text-sm text-gray-300">読み込む図形（複数選択可）</legend>
	<div class="flex flex-wrap gap-4">
		{#each options as type (type)}
			<label class="flex cursor-pointer items-center gap-2 text-sm">
				<input type="checkbox" value={type} bind:group={selected} class="accent-main" />
				{VECTOR_GEOMETRY_LABELS[type]}
			</label>
		{/each}
	</div>
</fieldset>
