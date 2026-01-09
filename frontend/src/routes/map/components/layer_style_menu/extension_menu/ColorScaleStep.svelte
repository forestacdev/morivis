<script lang="ts">
	import {
		getSequentSchemeColors,
		type SequentialScheme
	} from '$routes/map/utils/color/color-brewer';
	import { generateStepGradient } from '$routes/map/utils/color_mapping';
	interface Props {
		isColorMap: SequentialScheme;
	}

	let { isColorMap }: Props = $props();
</script>

<div
	class="w-full rounded-full border-1 border-black p-3"
	style="background: {generateStepGradient(getSequentSchemeColors(isColorMap, 5) as string[])}"
></div>
