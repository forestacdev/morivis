<script lang="ts">
	import Svg from '../../Svg.svelte';
	import type { IconProps } from '../../types';
	// svelte-ignore custom_element_props_identifier
	let props: IconProps = $props();
</script>

<Svg {...props} viewBox="0 0 24 24" aspectRatio={1}>
	<path
		fill="currentColor"
		d="M10 2v2.26l2 1.33V4h10v15h-5v2h7V2zM7.5 5L0 10v11h15V10zM14 6v.93L15.61 8H16V6zm4 0v2h2V6zM7.5 7.5L13 11v8h-3v-6H5v6H2v-8zM18 10v2h2v-2zm0 4v2h2v-2z"
	/>
</Svg>
