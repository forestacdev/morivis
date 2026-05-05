<script lang="ts">
	import Accordion from '$routes/map/components/atoms/Accordion.svelte';
	import ExpressionSelect from '$routes/map/components/atoms/select/ExpressionSelect.svelte';
	import type { NumbersStyle } from '$routes/map/data/types/vector/style';

	interface Props {
		label: string;
		icon: string;
		numberStyle: NumbersStyle;
	}

	let { label, numberStyle = $bindable(), icon }: Props = $props();

	let showNumberOption = $state<boolean>(false);
</script>

<Accordion {label} {icon} bind:value={showNumberOption}>
	<ExpressionSelect bind:style={numberStyle} expressionType={'number'} />
</Accordion>
