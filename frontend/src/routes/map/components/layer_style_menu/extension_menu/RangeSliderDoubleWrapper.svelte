<script lang="ts">
	import RangeSliderDouble from '$routes/map/components/atoms/RangeSliderDouble.svelte';
	import { createAdjustableRange, type AdjustableRange } from '$routes/map/data/types';
	import type { ColorStepExpression } from '$routes/map/data/types/vector/style';
	import { getSequentSchemeColors } from '$routes/map/utils/color/color-brewer';
	import { generateStepGradient } from '$routes/map/utils/style/color-mapping';

	interface Props {
		setStepExpression: ColorStepExpression;
	}

	let { setStepExpression = $bindable() }: Props = $props();
	const range = $derived.by<AdjustableRange>(() => {
		const mappingRange = setStepExpression.mapping.range;
		return Array.isArray(mappingRange)
			? createAdjustableRange(mappingRange[0], mappingRange[1])
			: mappingRange;
	});

	const rangeMax = $derived(range.domain[1]);

	const rangeMin = $derived(range.domain[0]);
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
