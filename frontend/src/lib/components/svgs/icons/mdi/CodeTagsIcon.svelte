<script lang="ts">
	import Svg from '../../Svg.svelte';
	import type { IconProps } from '../../types';
	// svelte-ignore custom_element_props_identifier
	let props: IconProps = $props();
</script>

<Svg {...props} viewBox="0 0 24 24" aspectRatio={1}>
	<path
		fill="currentColor"
		d="m14.6 16.6l4.6-4.6l-4.6-4.6L16 6l6 6l-6 6zm-5.2 0L4.8 12l4.6-4.6L8 6l-6 6l6 6z"
	/>
</Svg>
