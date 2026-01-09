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
	class="w-full rounded-full border-1 border-black p-3"
	style="background: {generateStepGradient(getSequentSchemeColors(isColorMap, 5) as string[])}"
></div>
