<script lang="ts">
	import { generateStepGradient } from '$routes/map/utils/color_mapping';
	import {
		getSequentSchemeColors,
		type SequentialScheme
	} from '$routes/map/utils/color/color-brewer';
	interface Props {
		isColorMap: SequentialScheme;
	}

	let { isColorMap }: Props = $props();
</script>

<div
	class="border-1 w-full rounded-full border-black p-3"
	style="background: {generateStepGradient(getSequentSchemeColors(isColorMap, 5) as string[])}"
></div>
