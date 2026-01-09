import { elasticOut, cubicOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';
import gsap from 'gsap';
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

export const anticipatedFly = (node: Element, { delay = 0, duration = 400, x = 0, y = 0 }) => {
	return {
		delay,
		duration: duration * 1.3, // 予備動作分の時間延長
		css: (t: number, u: number) => {
			// 予備動作期間（最初の30%）
			if (t < 0.3) {
				const anticipationT = t / 0.3;
				// 逆方向に少し動く（予備動作）
				const anticipationX = x * -0.2 * (1 - anticipationT);
				const anticipationY = y * -0.2 * (1 - anticipationT);

				return `
                    transform: translate(${anticipationX}px, ${anticipationY}px);
                    opacity: ${anticipationT * 0.3};
                `;
			}

			// メイン動作期間（残りの70%）
			const mainT = (t - 0.3) / 0.7;
			const eased = cubicOut(mainT);

			return `
                transform: translate(${x * (1 - eased)}px, ${y * (1 - eased)}px);
                opacity: ${0.3 + eased * 0.7};
            `;
		}
	};
};

export const gsapTweenMe = (node: Element) => {
	let tl = gsap.timeline();
	const duration = 1;

	tl.from(node, {
		duration,
		opacity: 0
	}).from(
		node,
		{
			duration,
			xPercent: 100,
			rotation: -90,
			yPercent: 100,
			ease: 'bounce.out'
		},
		`-=${duration * 0.75}`
	);

	return {
		/* GSAP's duration is in seconds. Svelte's is in miliseconds */
		duration: tl.totalDuration() * 1000,
		tick: (t: number) => {
			tl.progress(t);
		}
	};
};
