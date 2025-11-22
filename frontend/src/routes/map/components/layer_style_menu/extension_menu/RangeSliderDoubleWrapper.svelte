<script lang="ts">
	import RangeSliderDouble from '$routes/map/components/atoms/RangeSliderDouble.svelte';
	import type { ColorStepExpression } from '$routes/map/data/types/vector/style';
	import { getSequentSchemeColors } from '$routes/map/utils/color/color-brewer';
	import { generateStepGradient } from '$routes/map/utils/color_mapping';

	interface Props {
		setStepExpression: ColorStepExpression;
	}

	let { setStepExpression = $bindable() }: Props = $props();

	const rangeMax = $state.raw(setStepExpression.mapping.range[1]);

	const rangeMin = $state.raw(setStepExpression.mapping.range[0]);
</script>

<RangeSliderDouble
	label="範囲"
	bind:lowerValue={setStepExpression.mapping.range[0]}
	bind:upperValue={setStepExpression.mapping.range[1]}
	max={rangeMax}
	min={rangeMin}
	step={0.01}
	primaryColor={generateStepGradient(
		getSequentSchemeColors(setStepExpression.mapping.scheme, setStepExpression.mapping.divisions)
	)}
	minRangeColor={'#000000'}
	maxRangeColor={getSequentSchemeColors(
		setStepExpression.mapping.scheme,
		setStepExpression.mapping.divisions
	).at(-1)}
/>
