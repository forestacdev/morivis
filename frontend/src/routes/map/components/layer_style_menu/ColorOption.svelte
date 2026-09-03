<script lang="ts">
	import { slide } from 'svelte/transition';

	import Accordion from '$routes/map/components/atoms/Accordion.svelte';
	import ExpressionSelect from '$routes/map/components/atoms/select/ExpressionSelect.svelte';
	import Switch from '$routes/map/components/atoms/Switch.svelte';
	import type { ColorsStyle, VectorLayerType } from '$routes/map/data/types/vector/style';
	interface Props {
		colorStyle: ColorsStyle;
		showColorOption: boolean;
		layerType?: VectorLayerType;
		showExpressionWhenDisabled?: boolean;
	}

	let {
		colorStyle = $bindable(),
		showColorOption = $bindable(),
		layerType,
		showExpressionWhenDisabled = false
	}: Props = $props();
</script>

<Accordion label={'色の調整'} icon={'mdi:paint'} bind:value={showColorOption}>
	<Switch label={'塗りつぶし'} bind:value={colorStyle.show} />
	{#if colorStyle.show || showExpressionWhenDisabled}
		<div transition:slide={{ duration: 300 }}>
			<ExpressionSelect bind:style={colorStyle} expressionType={'color'} {layerType} />
		</div>
	{/if}
</Accordion>
