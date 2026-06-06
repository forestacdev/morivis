<script lang="ts">
	import RangeSliderDouble from '$routes/map/components/atoms/RangeSliderDouble.svelte';
	import type { AdjustableRange } from '$routes/map/data/types';
	import type { ColorStepExpression } from '$routes/map/data/types/vector/style';
	import { getSequentSchemeColors } from '$routes/map/utils/color/color-brewer';
	import { generateStepGradient } from '$routes/map/utils/style/color-mapping';

	interface Props {
		setStepExpression: ColorStepExpression;
	}

	let { setStepExpression = $bindable() }: Props = $props();
	const range = setStepExpression.mapping.range as AdjustableRange;

	const rangeMax = $state.raw(range.domain[1]);

	const rangeMin = $state.raw(range.domain[0]);
</script>

<RangeSliderDouble
	label="範囲"
	bind:lowerValue={range.value[0]}
	bind:upperValue={range.value[1]}
	max={rangeMax}
	min={rangeMin}
	step={0.01}
	primaryColor={generateStepGradient(
		getSequentSchemeColors(setStepExpression.mapping.scheme, setStepExpression.mapping.divisions)
	)}
	minRangeColor={getSequentSchemeColors(
		setStepExpression.mapping.scheme,
		setStepExpression.mapping.divisions
	).at(0)}
	maxRangeColor={getSequentSchemeColors(
		setStepExpression.mapping.scheme,
		setStepExpression.mapping.divisions
	).at(-1)}
/>
