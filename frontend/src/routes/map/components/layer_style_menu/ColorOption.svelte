<script lang="ts">
	import Accordion from '$routes/map/components/atoms/Accordion.svelte';
	import ExpressionsPulldownBox from '$routes/map/components/atoms/ExpressionsPulldownBox.svelte';
	import Switch from '$routes/map/components/atoms/Switch.svelte';
	import type { ColorsStyle } from '$routes/map/data/types/vector/style';
	interface Props {
		colorStyle: ColorsStyle;
		showColorOption: boolean;
	}

	let { colorStyle = $bindable(), showColorOption = $bindable() }: Props = $props();
</script>

<Accordion label={'色の調整'} bind:value={showColorOption}>
	<Switch label={'塗りつぶし'} bind:value={colorStyle.show} />
	<ExpressionsPulldownBox bind:style={colorStyle} expressionType={'color'} />
</Accordion>
