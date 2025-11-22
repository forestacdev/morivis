<script lang="ts">
	import { ColorMapManager } from '$routes/map/utils/color_mapping';

	const colorMapManager = new ColorMapManager();

	interface Props {
		isColorMap: string;
	}

	let { isColorMap }: Props = $props();
</script>

<div
	class="border-1 w-full rounded-full border-black p-3"
	style="background: {colorMapManager.createSimpleCSSGradient(isColorMap)}"
></div>
