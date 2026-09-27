<script lang="ts">
	import Svg from '../../Svg.svelte';
	import type { IconProps } from '../../types';
	// svelte-ignore custom_element_props_identifier
	let props: IconProps = $props();
</script>

<Svg {...props} viewBox="0 0 24 24" aspectRatio={1}>
	<path fill="currentColor" d="M12 7a5 5 0 1 1-4.995 5.217L7 12l.005-.217A5 5 0 0 1 12 7" />
</Svg>
