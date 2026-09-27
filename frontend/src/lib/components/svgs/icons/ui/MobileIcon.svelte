<script lang="ts">
	import Svg from '../../Svg.svelte';
	import type { IconProps } from '../../types';
	// svelte-ignore custom_element_props_identifier
	let props: IconProps = $props();
</script>

<Svg {...props} viewBox="0 0 24 24" aspectRatio={1}>
	<path
		fill="currentColor"
		d="M16.73 2.065H7.27a2.386 2.386 0 0 0-2.24 2.5v14.87a2.386 2.386 0 0 0 2.24 2.5h9.46a2.386 2.386 0 0 0 2.24-2.5V4.565a2.386 2.386 0 0 0-2.24-2.5m1.24 17.37a1.39 1.39 0 0 1-1.24 1.5H7.27a1.39 1.39 0 0 1-1.24-1.5V4.565a1.39 1.39 0 0 1 1.24-1.5H8.8v.51a1 1 0 0 0 1 1h4.4a1 1 0 0 0 1-1v-.51h1.53a1.39 1.39 0 0 1 1.24 1.5Z"
	/><path fill="currentColor" d="M10 18.934h4a.5.5 0 0 0 0-1h-4a.5.5 0 0 0 0 1" />
</Svg>
