<script lang="ts">
	import Svg from '../../Svg.svelte';
	import type { IconProps } from '../../types';
	// svelte-ignore custom_element_props_identifier
	let props: IconProps = $props();
</script>

<Svg {...props} viewBox="0 0 24 24" aspectRatio={1}>
	<g fill="none" stroke="currentColor" stroke-width="2"
		><circle cx="12" cy="12" r="10" /><path stroke-linecap="round" d="M12 7h.01" /><path
			stroke-linecap="round"
			stroke-linejoin="round"
			d="M10 11h2v5m-2 0h4"
		/></g
	>
</Svg>
