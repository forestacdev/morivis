<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { DataDrivenPropertyValueSpecification, ColorSpecification } from 'maplibre-gl';
	import { onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fade, fly, slide } from 'svelte/transition';

	import Accordion from '$routes/components/atoms/Accordion.svelte';
	import CheckBox from '$routes/components/atoms/CheckBox.svelte';
	import ColorPicker from '$routes/components/atoms/ColorPicker.svelte';
	import ExpressionsPulldownBox from '$routes/components/atoms/ExpressionsPulldownBox.svelte';
	import HorizontalSelectBox from '$routes/components/atoms/HorizontalSelectBox.svelte';
	import RangeSlider from '$routes/components/atoms/RangeSlider.svelte';
	import Switch from '$routes/components/atoms/Switch.svelte';
	import type { GeoDataEntry } from '$routes/data/types';
	import type {
		GeometryType,
		VectorEntry,
		GeoJsonMetaData,
		TileMetaData
	} from '$routes/data/types/vector';
	import type {
		VectorLayerType,
		ColorsExpression,
		LabelsExpressions,
		ColorsStyle
	} from '$routes/data/types/vector/style';
	import { selectedLayerId } from '$routes/store';
	import { mapStore } from '$routes/store/map';
	import { generateNumberAndColorMap, generateColorPalette } from '$routes/utils/colorMapping';

	interface Props {
		label: string;
		numberStyle: NumbersStyle;
	}

	let { numberStyle = $bindable() }: Props = $props();

	let showNumberOption = $state<boolean>(false);
</script>

<Accordion {label} bind:value={showNumberOption}>
	<ExpressionsPulldownBox bind:style={numberStyle} expressionType={'numbers'} />
</Accordion>
