<script lang="ts">
	interface Props {
		label?: string;
		value: number;
	}
	let { label = '高度角', value = $bindable() }: Props = $props();
	let activePointer: number | undefined;
	const angle = $derived(Math.min(90, Math.max(0, value)));
	const radians = $derived((angle * Math.PI) / 180);
	const setAngle = (next: number) => {
		const normalized = Math.min(90, Math.max(0, Math.round(next)));
		if (normalized !== angle) value = normalized;
	};
	const updateFromPointer = (event: PointerEvent) => {
		const bounds =
			event.currentTarget instanceof HTMLElement
				? event.currentTarget.getBoundingClientRect()
				: undefined;
		if (!bounds) return;
		// SVG と同じ座標系に変換し、扇の左下を回転の中心にする。
		const dx = ((event.clientX - bounds.left) / bounds.width) * 200 - 24;
		const dy = 132 - ((event.clientY - bounds.top) / bounds.height) * 160;
		if (Math.hypot(dx, dy) < 8) return;
		// 扇の外へドラッグしたときは、水平または真上で止める。
		if (dx <= 0 && dy <= 0) return;
		setAngle((Math.atan2(Math.max(0, dy), Math.max(0, dx)) * 180) / Math.PI);
	};
	const startDrag = (event: PointerEvent) => {
		if (!event.isPrimary || event.button !== 0 || activePointer !== undefined) return;
		const target = event.currentTarget as HTMLElement;
		target.focus({ preventScroll: true });
		target.setPointerCapture(event.pointerId);
		activePointer = event.pointerId;
		updateFromPointer(event);
	};
	const moveDrag = (event: PointerEvent) => {
		if (event.pointerId === activePointer) updateFromPointer(event);
	};
	const endDrag = (event: PointerEvent) => {
		if (event.pointerId !== activePointer) return;
		if (event.type === 'pointerup') updateFromPointer(event);
		activePointer = undefined;
		const target = event.currentTarget as HTMLElement;
		if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
	};
	const handleKeydown = (event: KeyboardEvent) => {
		const step = event.shiftKey ? 15 : 1;
		let next: number;
		switch (event.key) {
			case 'ArrowRight':
			case 'ArrowUp':
				next = angle + step;
				break;
			case 'ArrowLeft':
			case 'ArrowDown':
				next = angle - step;
				break;
			case 'PageUp':
				next = angle + 15;
				break;
			case 'PageDown':
				next = angle - 15;
				break;
			case 'Home':
				next = 0;
				break;
			case 'End':
				next = 90;
				break;
			default:
				return;
		}
		event.preventDefault();
		setAngle(next);
	};
</script>

<div class="flex flex-col gap-2 text-base">
	<span>{label}</span>
	<div
		class="dial mx-auto rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
		role="slider"
		tabindex="0"
		aria-label={label}
		aria-valuemin={0}
		aria-valuemax={90}
		aria-valuenow={angle}
		aria-valuetext={`${angle}°`}
		onpointerdown={startDrag}
		onpointermove={moveDrag}
		onpointerup={endDrag}
		onpointercancel={endDrag}
		onlostpointercapture={() => {
			activePointer = undefined;
		}}
		onkeydown={handleKeydown}
	>
		<svg viewBox="0 0 200 160" class="h-full w-full" aria-hidden="true">
			<path
				d="M 24 132 L 120 132 A 96 96 0 0 0 24 36 Z"
				fill="var(--color-sub)"
				stroke="currentColor"
				stroke-opacity="0.25"
			/>
			{#each [0, 15, 30, 45, 60, 75, 90] as tick (tick)}
				<line
					x1="120"
					y1="132"
					x2="113"
					y2="132"
					transform={`rotate(${-tick} 24 132)`}
					stroke="currentColor"
					stroke-opacity="0.4"
				/>
			{/each}
			<g fill="currentColor" dominant-baseline="central" font-size="12">
				<text x="24" y="16">真上 90°</text>
				<text x="132" y="132">水平 0°</text>
			</g>
			<line
				x1="24"
				y1="132"
				x2={24 + 96 * Math.cos(radians)}
				y2={132 - 96 * Math.sin(radians)}
				stroke="var(--color-accent)"
				stroke-width="3"
				stroke-linecap="round"
			/>
			<circle cx="24" cy="132" r="3" fill="var(--color-accent)" />
			<circle
				cx={24 + 96 * Math.cos(radians)}
				cy={132 - 96 * Math.sin(radians)}
				r="7"
				fill="var(--color-base)"
				stroke="var(--color-accent)"
				stroke-width="2"
			/>
			<rect x="28" y="100" width="48" height="28" rx="8" fill="var(--color-sub)" />
			<text
				x="52"
				y="114"
				fill="currentColor"
				text-anchor="middle"
				dominant-baseline="central"
				font-size="18"
				font-weight="600">{angle}°</text
			>
		</svg>
	</div>
</div>

<style>
	.dial {
		width: 220px;
		max-width: 100%;
		aspect-ratio: 5 / 4;
		cursor: grab;
		touch-action: none;
		user-select: none;
	}
	.dial:active {
		cursor: grabbing;
	}
</style>
