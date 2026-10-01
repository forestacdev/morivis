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
		stroke-linejoin="round"
		stroke-width="2"
		d="M18.782 13.877a16 16 0 0 1 1.187 5.124c.034.55-.417.999-.969.999H5a1 1 0 0 1-1-1V5c0-.552.448-1.003 1-.969a16 16 0 0 1 13.782 9.846Z"
	/>
</Svg>
