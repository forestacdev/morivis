<script lang="ts">
	import Svg from '../../Svg.svelte';
	import type { IconProps } from '../../types';
	// svelte-ignore custom_element_props_identifier
	let props: IconProps = $props();
</script>

<Svg {...props} viewBox="0 0 24 24" aspectRatio={1}>
	<path
		fill="currentColor"
		d="M17.45 15.18L22 7.31V21H2V3h2v12.54L9.5 6L16 9.78l4.24-7.33l1.73 1l-5.23 9.05l-6.51-3.75L4.31 19h2.26l4.39-7.56z"
	/>
</Svg>
