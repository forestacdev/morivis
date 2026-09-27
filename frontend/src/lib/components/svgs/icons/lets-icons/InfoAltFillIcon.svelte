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
		d="M12 21a9 9 0 1 1 0-18a9 9 0 0 1 0 18m0-14a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2zm-1.5 4a1 1 0 1 0 0 2h.5v3a1 1 0 0 0 1 1h2a1 1 0 1 0 0-2h-1v-3a1 1 0 0 0-1-1z"
		clip-rule="evenodd"
	/>
</Svg>
