import { elasticOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';

interface SpinTransitionOptions {
	duration?: number;
}

export const customSpin: (node: Element, options?: SpinTransitionOptions) => TransitionConfig = (
	node,
	{ duration = 400 } = {}
) => {
	return {
		duration,
		css: (t: number, u: number) => {
			const eased = elasticOut(t);

			return `
        transform: scale(${eased}) rotate(${eased * 1080}deg);
        color: hsl(
          ${Math.trunc(t * 360)},
          ${Math.min(100, 1000 * u)}%,
          ${Math.min(50, 500 * u)}%
        );`;
		}
	};
};
