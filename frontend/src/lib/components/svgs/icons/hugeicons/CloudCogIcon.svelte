<script lang="ts">
	import Svg from '../../Svg.svelte';
	import type { IconProps } from '../../types';
	// svelte-ignore custom_element_props_identifier
	let props: IconProps = $props();
</script>

<Svg {...props} viewBox="0 0 24 24" aspectRatio={1}>
	<path
		fill="none"
		stroke="currentColor"
		stroke-linecap="round"
		stroke-linejoin="round"
		stroke-width="1.5"
		d="M17.478 9h.022a4.5 4.5 0 0 1 1.5 8.744M16.9 11a5.5 5.5 0 0 0 .6-2.5a5.5 5.5 0 0 0-10.98-.477m0 0A5 5 0 0 0 5 17.584m1.52-9.561Q6.757 8 7 8c.711 0 1.388.148 2 .416M12.028 19a2 2 0 1 0 0-4m0 4a2 2 0 1 1 0-4m0 4v2m0-6v-2m1.735 2.996l1.732-1m-5.196 3l-1.733 1m5.202-1l1.732 1m-5.196-3l-1.733-1"
	/>
</Svg>
