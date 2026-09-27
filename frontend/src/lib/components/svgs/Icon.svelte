<script lang="ts">
	import { getIconComponent } from './registry';
	import type { IconComponent, IconProps } from './types';

	interface Props extends IconProps {
		icon?: string | IconComponent | null;
	}
	// svelte-ignore custom_element_props_identifier
	let { icon, ...attributes }: Props = $props();
	const SvgIcon = $derived(typeof icon === 'string' ? getIconComponent(icon) : icon);
</script>

{#if SvgIcon}
	<SvgIcon {...attributes} />
{/if}
