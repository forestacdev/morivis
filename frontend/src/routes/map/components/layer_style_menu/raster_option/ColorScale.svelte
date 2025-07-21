<script lang="ts">
	import { ColorMapManager } from '$routes/map/utils/color_mapping';

	const colorMapManager = new ColorMapManager();

	interface Props {
		isColorMap: string;
	}

	let { isColorMap }: Props = $props();
</script>

<div
	class="w-full rounded-full p-3"
	style="background: {colorMapManager.createSimpleCSSGradient(isColorMap)}"
></div>
