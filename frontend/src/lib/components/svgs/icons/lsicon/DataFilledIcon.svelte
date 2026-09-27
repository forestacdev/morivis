<script lang="ts">
	import Svg from '../../Svg.svelte';
	import type { IconProps } from '../../types';
	// svelte-ignore custom_element_props_identifier
	let props: IconProps = $props();
</script>

<Svg {...props} viewBox="0 0 16 16" aspectRatio={1}>
	<path
		fill="currentColor"
		fill-rule="evenodd"
		d="M2.5 2a.5.5 0 0 0-.5.5v2a.5.5 0 0 0 .5.5h6a.5.5 0 0 0 .5-.5v-2a.5.5 0 0 0-.5-.5zm8 0a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-11a.5.5 0 0 0-.5-.5zM2 7a.5.5 0 0 1 .5-.5h6A.5.5 0 0 1 9 7v2a.5.5 0 0 1-.5.5h-6A.5.5 0 0 1 2 9zm.5 4a.5.5 0 0 0-.5.5v2a.5.5 0 0 0 .5.5h6a.5.5 0 0 0 .5-.5v-2a.5.5 0 0 0-.5-.5z"
		clip-rule="evenodd"
	/>
</Svg>
