<script lang="ts">
	import Svg from '../../Svg.svelte';
	import type { IconProps } from '../../types';
	// svelte-ignore custom_element_props_identifier
	let props: IconProps = $props();
</script>

<Svg {...props} viewBox="0 0 32 32" aspectRatio={1}>
	<path
		fill="currentColor"
		d="M29.355 30.229H2.646c-1.025 0-1.848-.516-2.26-1.339a2.5 2.5 0 0 1 0-2.672L13.741 3.103c.511-.817 1.333-1.333 2.26-1.333c1.027 0 1.849.516 2.251 1.333l13.364 23.115a2.5 2.5 0 0 1 0 2.672c-.417.927-1.24 1.339-2.26 1.339z"
	/>
</Svg>
