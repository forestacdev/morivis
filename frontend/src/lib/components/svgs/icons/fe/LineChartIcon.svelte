<script lang="ts">
	import Svg from '../../Svg.svelte';
	import type { IconProps } from '../../types';
	// svelte-ignore custom_element_props_identifier
	let props: IconProps = $props();
</script>

<Svg {...props} viewBox="0 0 24 24" aspectRatio={1}>
	<path
		fill="currentColor"
		fill-rule="evenodd"
		d="M5.823 14.177a2 2 0 1 1-1-1l2.354-2.354a2 2 0 1 1 3.646 0l2.354 2.354a2 2 0 0 1 1.646 0l3.354-3.354a2 2 0 1 1 1 1l-3.354 3.354a2 2 0 1 1-3.646 0l-2.354-2.354a2 2 0 0 1-1.646 0z"
	/>
</Svg>
