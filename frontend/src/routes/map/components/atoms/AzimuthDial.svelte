<script lang="ts">
	interface Props {
		label?: string;
		value: number;
	}
	let { label = '方位角', value = $bindable() }: Props = $props();
	let activePointer: number | undefined;
	const angle = $derived(((value % 360) + 360) % 360);
	const radians = $derived((angle * Math.PI) / 180);
	const setAngle = (next: number) => {
		const normalized = ((Math.round(next) % 360) + 360) % 360;
		if (normalized !== angle) value = normalized;
	};
	const updateFromPointer = (event: PointerEvent) => {
		const bounds =
			event.currentTarget instanceof HTMLElement
				? event.currentTarget.getBoundingClientRect()
				: undefined;
		if (!bounds) return;
		const dx = event.clientX - bounds.left - bounds.width / 2;
		const dy = event.clientY - bounds.top - bounds.height / 2;
		if (Math.hypot(dx, dy) < 8) return;
		setAngle((Math.atan2(dx, -dy) * 180) / Math.PI);
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
				next = 359;
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
		class="dial mx-auto rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
		role="slider"
		tabindex="0"
		aria-label={label}
		aria-valuemin={0}
		aria-valuemax={359}
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
		<svg viewBox="0 0 160 160" class="h-full w-full" aria-hidden="true">
			<circle
				cx="80"
				cy="80"
				r="53"
				fill="var(--color-sub)"
				stroke="currentColor"
				stroke-opacity="0.25"
			/>
			{#each [0, 45, 90, 135, 180, 225, 270, 315] as tick (tick)}
				<line
					x1="80"
					y1="28"
					x2="80"
					y2="34"
					transform={`rotate(${tick} 80 80)`}
					stroke="currentColor"
					stroke-opacity="0.4"
				/>
			{/each}
			<g fill="currentColor" text-anchor="middle" dominant-baseline="central" font-size="12">
				<text x="80" y="12">北</text>
				<text x="148" y="80">東</text>
				<text x="80" y="148">南</text>
				<text x="12" y="80">西</text>
			</g>
			<line
				x1="80"
				y1="54"
				x2="80"
				y2="28"
				transform={`rotate(${angle} 80 80)`}
				stroke="var(--color-accent)"
				stroke-width="3"
				stroke-linecap="round"
			/>
			<circle
				cx={80 + 52 * Math.sin(radians)}
				cy={80 - 52 * Math.cos(radians)}
				r="7"
				fill="var(--color-base)"
				stroke="var(--color-accent)"
				stroke-width="2"
			/>
			<text
				x="80"
				y="80"
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
		width: 176px;
		height: 176px;
		max-width: 100%;
		aspect-ratio: 1;
		cursor: grab;
		touch-action: none;
		user-select: none;
	}
	.dial:active {
		cursor: grabbing;
	}
</style>
