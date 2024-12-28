import { BASEMAP_IMAGE_TILE } from '$lib/constants';
import { fade, slide } from 'svelte/transition';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export const tweenMe = (node: Node, x: gsap.TweenValue = '-100%') => {
	const tl = gsap.timeline();
	const duration = 0.5; // アニメーションの長さを0.5秒に設定

	tl.from(node, {
		duration: duration,
		opacity: 0,
		x: x, // 左から右へスライド
		ease: 'power2.out' // スムーズな動きのためのイージング
	});

	return {
		duration: tl.totalDuration() * 1000, // ミリ秒に変換
		tick: (t: number) => {
			tl.progress(t);
		}
	};
};
