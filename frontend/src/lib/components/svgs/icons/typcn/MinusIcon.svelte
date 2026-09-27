<script lang="ts">
	import Svg from '../../Svg.svelte';
	import type { IconProps } from '../../types';
	// svelte-ignore custom_element_props_identifier
	let props: IconProps = $props();
</script>

<Svg {...props} viewBox="0 0 24 24" aspectRatio={1}>
	<path fill="currentColor" d="M18 11H6a2 2 0 0 0 0 4h12a2 2 0 0 0 0-4" />
</Svg>
