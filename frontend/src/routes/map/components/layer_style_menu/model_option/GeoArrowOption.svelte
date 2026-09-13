<script lang="ts">
	import ColorPicker from '$routes/map/components/atoms/ColorPicker.svelte';
	import type { DeckVectorEntry } from '$routes/map/data/types/model';
	import { getGeoJsonColorProperties } from '$routes/map/utils/deck/geojson-color';
	import { mapStore } from '$routes/stores/map';

	interface Props {
		layerEntry: DeckVectorEntry;
		showColorOption: boolean;
	}

	let { layerEntry = $bindable(), showColorOption = $bindable() }: Props = $props();

	void showColorOption;
	const colorProperties = $derived(
		layerEntry.format.type === 'geojson-3d' ? getGeoJsonColorProperties(layerEntry.format.data) : []
	);

	$effect(() => {
		$state.snapshot(layerEntry.style.color);
		mapStore.setDeckVectorColor(
			layerEntry.id,
			layerEntry.style.color,
			layerEntry.style.colorProperty
		);
	});
</script>

<div class="mt-8 flex flex-col gap-4">
	{#if layerEntry.format.type === 'geojson-3d' && (colorProperties.length || layerEntry.style.colorProperty)}
		<label class="flex flex-col gap-2 text-sm">
			<span>色分け</span>
			<select
				class="rounded border border-white/20 bg-[#252525] px-3 py-2"
				value={layerEntry.style.colorProperty ?? ''}
				onchange={(event) => {
					layerEntry.style.colorProperty = event.currentTarget.value || undefined;
				}}
			>
				<option value="">単色</option>
				{#each colorProperties as key (key)}
					<option value={key}>属性の色（{key}）</option>
				{/each}
				{#if layerEntry.style.colorProperty && !colorProperties.includes(layerEntry.style.colorProperty)}
					<option value={layerEntry.style.colorProperty}>
						属性の色（{layerEntry.style.colorProperty}・有効な色なし）
					</option>
				{/if}
			</select>
		</label>
	{/if}
	<ColorPicker
		label={layerEntry.style.colorProperty ? '色がない部分の色' : '色'}
		bind:value={layerEntry.style.color}
	/>
</div>
