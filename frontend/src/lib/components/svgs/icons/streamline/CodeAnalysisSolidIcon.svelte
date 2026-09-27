<script lang="ts">
	import Svg from '../../Svg.svelte';
	import type { IconProps } from '../../types';
	// svelte-ignore custom_element_props_identifier
	let props: IconProps = $props();
</script>

<Svg {...props} viewBox="0 0 14 14" aspectRatio={1}>
	<path
		fill="currentColor"
		fill-rule="evenodd"
		d="M1.516 6.36a4.844 4.844 0 1 1 9.687 0a4.844 4.844 0 0 1-9.687 0M6.359.015a6.344 6.344 0 1 0 3.723 11.48l2.195 2.195a1 1 0 0 0 1.415-1.414l-2.196-2.195A6.344 6.344 0 0 0 6.36.016Zm-.745 4.026a.625.625 0 0 1 0 .884L4.056 6.484l1.558 1.558a.625.625 0 0 1-.884.884l-2-2a.625.625 0 0 1 0-.884l2-2a.625.625 0 0 1 .884 0Zm2.5 0a.625.625 0 0 0-.884.884l1.558 1.558L7.23 8.042a.625.625 0 0 0 .884.884l2-2a.625.625 0 0 0 0-.884z"
		clip-rule="evenodd"
	/>
</Svg>
