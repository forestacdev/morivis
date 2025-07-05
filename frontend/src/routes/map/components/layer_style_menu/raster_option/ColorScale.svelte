<script lang="ts">
	import { ColorMapManager } from '$routes/map/utils/color_mapping';

	const colorMapManager = new ColorMapManager();

	interface Props {
		isColorMap: string;
	}

	let { isColorMap }: Props = $props();
</script>

<div
	class="mb-4 w-full rounded-md p-4"
	style="background: {colorMapManager.createSimpleCSSGradient(isColorMap)}"
></div>
