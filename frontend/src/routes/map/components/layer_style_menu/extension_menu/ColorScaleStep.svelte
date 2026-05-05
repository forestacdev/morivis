<script lang="ts">
	import {
		getSequentSchemeColors,
		type SequentialScheme
	} from '$routes/map/utils/color/color-brewer';
	import { generateStepGradient } from '$routes/map/utils/style/color-mapping';
	interface Props {
		isColorMap: SequentialScheme;
	}

	let { isColorMap }: Props = $props();
</script>

<div
	class="w-full rounded-full border border-black p-2"
	style="background: {generateStepGradient(getSequentSchemeColors(isColorMap, 5) as string[])}"
></div>
