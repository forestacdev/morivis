<script lang="ts">
	import { onMount } from 'svelte';

	import { transitionPageScreenCss } from '$routes/stores/effect';

	interface Props {
		initialized(): void;
	}

	let { initialized }: Props = $props();
	let isVisible = $state(false);
	let phase = $state<'cover' | 'reveal'>('cover');
	let animationKey = $state(0);
	let hideTimerId: number | null = null;
	let isSubscribed = false;

	const ANIMATION_DURATION_MS = 900;

	const clearHideTimer = () => {
		if (hideTimerId !== null) {
			clearTimeout(hideTimerId);
			hideTimerId = null;
		}
	};

	const startCover = () => {
		clearHideTimer();
		isVisible = true;
		phase = 'cover';
		animationKey += 1;
	};

	const startReveal = () => {
		if (!isVisible) return;

		clearHideTimer();
		phase = 'reveal';
		animationKey += 1;
		hideTimerId = window.setTimeout(() => {
			isVisible = false;
			hideTimerId = null;
		}, ANIMATION_DURATION_MS);
	};

	onMount(() => {
		initialized();

		const unsubscribe = transitionPageScreenCss.subscribe((transition) => {
			if (!isSubscribed) {
				isSubscribed = true;
				return;
			}

			if (transition === 1) {
				startCover();
				return;
			}

			if (transition === -1) {
				startReveal();
			}
		});

		return () => {
			unsubscribe();
			clearHideTimer();
		};
	});
</script>

{#if isVisible}
	{#key `${phase}-${animationKey}`}
		<div class="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
			<div class={['screen-veil', phase === 'cover' ? 'is-cover' : 'is-reveal']}>
				<div class="screen-core"></div>
				<div class="screen-grid"></div>
				<div class="screen-glow"></div>
			</div>
		</div>
	{/key}
{/if}

<style>
	.screen-veil {
		position: absolute;
		inset: 0;
		background:
			radial-gradient(circle at 50% 50%, rgba(255, 244, 214, 0.14) 0 12%, transparent 42%),
			linear-gradient(135deg, rgba(11, 15, 25, 0.98), rgba(24, 36, 45, 0.94) 40%, rgba(65, 33, 17, 0.9));
		opacity: 0;
	}

	.screen-core,
	.screen-grid,
	.screen-glow {
		position: absolute;
		inset: 0;
	}

	.screen-core {
		background:
			radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.26), transparent 26%),
			radial-gradient(circle at 50% 50%, rgba(245, 159, 11, 0.2), transparent 54%);
		mix-blend-mode: screen;
	}

	.screen-grid {
		background-image:
			linear-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px);
		background-size: 24px 24px;
		mask-image: radial-gradient(circle at center, black 28%, transparent 82%);
		opacity: 0.5;
	}

	.screen-glow {
		background:
			linear-gradient(
				90deg,
				transparent 0%,
				rgba(255, 255, 255, 0.16) 45%,
				rgba(255, 255, 255, 0.28) 50%,
				rgba(255, 255, 255, 0.16) 55%,
				transparent 100%
			);
		mix-blend-mode: screen;
		transform: translateX(-100%);
	}

	.is-cover {
		animation: screen-cover var(--screen-duration, 900ms) cubic-bezier(0.2, 0.9, 0.2, 1) forwards;
	}

	.is-cover .screen-core {
		animation: core-cover var(--screen-duration, 900ms) cubic-bezier(0.2, 0.9, 0.2, 1) forwards;
	}

	.is-cover .screen-glow {
		animation: glow-sweep 720ms cubic-bezier(0.16, 1, 0.3, 1) 120ms forwards;
	}

	.is-reveal {
		animation: screen-reveal var(--screen-duration, 900ms) cubic-bezier(0.7, 0, 0.84, 0) forwards;
	}

	.is-reveal .screen-core {
		animation: core-reveal var(--screen-duration, 900ms) cubic-bezier(0.7, 0, 0.84, 0) forwards;
	}

	.is-reveal .screen-glow {
		animation: glow-sweep 560ms cubic-bezier(0.16, 1, 0.3, 1) forwards reverse;
	}

	@keyframes screen-cover {
		0% {
			opacity: 0;
			backdrop-filter: blur(0px);
			clip-path: circle(0% at 50% 50%);
		}
		35% {
			opacity: 1;
		}
		100% {
			opacity: 1;
			backdrop-filter: blur(14px);
			clip-path: circle(110% at 50% 50%);
		}
	}

	@keyframes screen-reveal {
		0% {
			opacity: 1;
			backdrop-filter: blur(14px);
			clip-path: circle(110% at 50% 50%);
		}
		100% {
			opacity: 0;
			backdrop-filter: blur(0px);
			clip-path: circle(0% at 50% 50%);
		}
	}

	@keyframes core-cover {
		0% {
			transform: scale(0.4);
			filter: blur(28px);
			opacity: 0.2;
		}
		100% {
			transform: scale(1);
			filter: blur(0px);
			opacity: 1;
		}
	}

	@keyframes core-reveal {
		0% {
			transform: scale(1);
			filter: blur(0px);
			opacity: 1;
		}
		100% {
			transform: scale(1.2);
			filter: blur(22px);
			opacity: 0;
		}
	}

	@keyframes glow-sweep {
		0% {
			transform: translateX(-120%);
			opacity: 0;
		}
		30% {
			opacity: 1;
		}
		100% {
			transform: translateX(120%);
			opacity: 0;
		}
	}
</style>
