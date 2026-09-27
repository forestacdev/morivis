<script lang="ts">
	import Svg from '../../Svg.svelte';
	import type { IconProps } from '../../types';
	// svelte-ignore custom_element_props_identifier
	let props: IconProps = $props();
</script>

<Svg {...props} viewBox="0 0 24 24" aspectRatio={1}>
	<path
		fill="currentColor"
		d="m4 17l2.75-2.75l-.03-.02c-.58-.59-.58-1.54 0-2.12l4.74-4.74l4.24 4.24l-4.74 4.74c-.57.58-1.5.58-2.09.02l-.63.63zM15.91 2.91c.59-.58 1.54-.58 2.12 0l2.13 2.12c.58.59.58 1.54 0 2.13l-3.3 3.29l-4.24-4.24z"
	/>
</Svg>
