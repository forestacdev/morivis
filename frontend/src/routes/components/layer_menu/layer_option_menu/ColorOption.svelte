<script lang="ts">
	import Accordion from '$routes/components/atoms/Accordion.svelte';
	import ExpressionsPulldownBox from '$routes/components/atoms/ExpressionsPulldownBox.svelte';
	import Switch from '$routes/components/atoms/Switch.svelte';
	import type { ColorsStyle } from '$routes/data/types/vector/style';
	interface Props {
		colorStyle: ColorsStyle;
	}

	let { colorStyle = $bindable() }: Props = $props();

	let showColorOption = $state<boolean>(false);
</script>

<Accordion label={'色の調整'} bind:value={showColorOption}>
	<Switch label={'塗りつぶし'} bind:value={colorStyle.show} />
	<ExpressionsPulldownBox bind:style={colorStyle} expressionType={'color'} />
</Accordion>
