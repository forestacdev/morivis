<script lang="ts">
	import { ColorMapManager } from '$routes/map/utils/style/color-mapping';

	const colorMapManager = new ColorMapManager();

	interface Props {
		isColorMap: string;
	}

	let { isColorMap }: Props = $props();
</script>

<div
	class="w-full rounded-full border border-black p-2"
	style="background: {colorMapManager.createSimpleCSSGradient(isColorMap)}"
></div>
