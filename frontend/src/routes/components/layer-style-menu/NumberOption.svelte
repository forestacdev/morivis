<script lang="ts">
	import Accordion from '$routes/components/atoms/Accordion.svelte';
	import ExpressionsPulldownBox from '$routes/components/atoms/ExpressionsPulldownBox.svelte';
	import type { NumbersStyle } from '$routes/data/types/vector/style';

	interface Props {
		label: string;
		numberStyle: NumbersStyle;
	}

	let { label, numberStyle = $bindable() }: Props = $props();

	let showNumberOption = $state<boolean>(false);
</script>

<Accordion {label} bind:value={showNumberOption}>
	<ExpressionsPulldownBox bind:style={numberStyle} expressionType={'number'} />
</Accordion>
