<script lang="ts">
	import Svg from '../../Svg.svelte';
	import type { IconProps } from '../../types';
	// svelte-ignore custom_element_props_identifier
	let props: IconProps = $props();
</script>

<Svg {...props} viewBox="0 0 512 512" aspectRatio={1}>
	<path
		fill="currentColor"
		d="M140.6 280.3H1v139.6h139.6zm186.2-139.7H187.2v279.3h139.6zM373.4 1v418.9H513V1zM1 513h512v-46.5H1z"
	/>
</Svg>
