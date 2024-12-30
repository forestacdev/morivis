import { BASEMAP_IMAGE_TILE } from '$routes/map/constants';
import { fade, slide } from 'svelte/transition';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { elasticOut } from 'svelte/easing';

export const spin = (node, { duration }) => {
	return {
		duration,
		css: (t) => {
			const eased = elasticOut(t);

			return `
					transform: scale(${eased}) rotate(${eased * 1080}deg);
					color: hsl(
						${Math.trunc(t * 360)},
						${Math.min(100, 1000 * (1 - t))}%,
						${Math.min(50, 500 * (1 - t))}%
					);`;
		}
	};
};
