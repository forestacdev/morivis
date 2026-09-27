<script lang="ts">
	import Svg from '../../Svg.svelte';
	import type { IconProps } from '../../types';
	// svelte-ignore custom_element_props_identifier
	let props: IconProps = $props();
</script>

<Svg {...props} viewBox="0 0 24 24" aspectRatio={1}>
	<path
		fill="none"
		stroke="currentColor"
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="1.5"
		d="M12.002 17.247v6m0-22.5v6m-5.25 5.25h-6m22.5 0h-6m-13.5.001a8.25 8.25 0 1 0 16.5 0a8.25 8.25 0 0 0-16.5 0"
	/>
</Svg>
