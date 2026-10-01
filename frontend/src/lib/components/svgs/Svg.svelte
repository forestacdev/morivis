<script lang="ts">
	import type { Snippet } from 'svelte';

	import type { IconProps } from './types';

	interface Props extends IconProps {
		viewBox: string;
		aspectRatio: number;
		children: Snippet;
	}
	// svelte-ignore custom_element_props_identifier
	let { width, height, aspectRatio, viewBox, children, ...attributes }: Props = $props();
	const scale = (size: string | number, ratio: number) => {
		if (typeof size === 'number') return size * ratio;
		const match = /^([\d.]+)(.*)$/.exec(size);
		return match ? `${Number(match[1]) * ratio}${match[2]}` : size;
	};
	const svgWidth = $derived(width ?? scale(height ?? '1em', aspectRatio));
	const svgHeight = $derived(height ?? (width == null ? '1em' : scale(width, 1 / aspectRatio)));
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={svgWidth}
	height={svgHeight}
	{viewBox}
	role="img"
	aria-hidden={attributes['aria-label'] || attributes['aria-labelledby'] ? undefined : true}
	focusable="false"
	{...attributes}
>
	{@render children()}
</svg>
