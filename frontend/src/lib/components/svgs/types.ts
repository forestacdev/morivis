import type { Component } from 'svelte';
import type { SVGAttributes } from 'svelte/elements';

export type IconProps = Omit<SVGAttributes<SVGSVGElement>, 'children'>;
export type IconComponent = Component<IconProps>;
