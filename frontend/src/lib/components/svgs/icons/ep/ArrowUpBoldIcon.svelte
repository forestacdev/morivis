<script lang="ts">
	import Svg from '../../Svg.svelte';
	import type { IconProps } from '../../types';
	// svelte-ignore custom_element_props_identifier
	let props: IconProps = $props();
</script>

<Svg {...props} viewBox="0 0 1024 1024" aspectRatio={1}>
	<path
		fill="currentColor"
		d="M104.7 685.2a64 64 0 0 0 90.5 0L512 368.4l316.8 316.8a64 64 0 0 0 90.5-90.4l-362-362.1a64 64 0 0 0-90.5 0l-362.1 362a64 64 0 0 0 0 90.5"
	/>
</Svg>
