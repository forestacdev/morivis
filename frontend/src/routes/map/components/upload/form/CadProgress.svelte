<script lang="ts">
	import { onMount } from 'svelte';

	import type { DwgConversionProgress } from '$routes/map/utils/formats/dwg/analyze';

	let {
		label,
		progress = null
	}: {
		label: string;
		progress?: DwgConversionProgress | null;
	} = $props();
	let elapsedSeconds = $state(0);
	const counts = $derived(progress?.phase === 'meshing' && progress.total > 0 ? progress : null);
	const percentage = $derived(counts ? Math.floor((counts.completed / counts.total) * 100) : null);
	const elapsed = $derived(
		`${Math.floor(elapsedSeconds / 60)}:${String(elapsedSeconds % 60).padStart(2, '0')}`
	);

	onMount(() => {
		const started = performance.now();
		const timer = setInterval(() => {
			elapsedSeconds = Math.floor((performance.now() - started) / 1000);
		}, 1000);
		return () => clearInterval(timer);
	});
</script>

<section class="shrink-0 space-y-2 px-2 pt-3 text-sm" aria-label="DWGの処理状況">
	<div class="flex items-center justify-between gap-3">
		<p role="status">{label}</p>
		<span class="shrink-0 tabular-nums text-gray-400">経過 {elapsed}</span>
	</div>
	<progress
		aria-label="DWGの処理進捗"
		aria-valuetext={counts
			? `${counts.total.toLocaleString('ja-JP')}部品中${counts.completed.toLocaleString('ja-JP')}部品を処理済み`
			: label}
		max={counts?.total ?? 1}
		value={counts?.completed}
	></progress>
	{#if counts}
		<div class="flex justify-between gap-3 text-gray-300 tabular-nums">
			<span
				>処理済み {counts.completed.toLocaleString('ja-JP')} / {counts.total.toLocaleString(
					'ja-JP'
				)} 部品</span
			>
			<span>{percentage}%</span>
		</div>
		<p class="text-xs text-gray-400">部品ごとに処理時間が異なります。</p>
	{/if}
</section>

<style>
	progress {
		display: block;
		width: 100%;
		height: 0.5rem;
		border: 0;
		border-radius: 9999px;
		overflow: hidden;
		appearance: none;
		background: rgb(255 255 255 / 12%);
		color: var(--color-accent);
	}
	progress::-webkit-progress-bar {
		background: rgb(255 255 255 / 12%);
		border-radius: 9999px;
	}
	progress::-webkit-progress-value {
		background: var(--color-accent);
		border-radius: 9999px;
	}
	progress::-moz-progress-bar {
		background: var(--color-accent);
		border-radius: 9999px;
	}
	progress:indeterminate,
	progress:indeterminate::-webkit-progress-bar {
		background:
			linear-gradient(90deg, transparent, var(--color-accent), transparent) left / 40% 100%
				no-repeat,
			rgb(255 255 255 / 12%);
		animation: processing 1.5s ease-in-out infinite alternate;
	}
	@keyframes processing {
		to {
			background-position: right;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		progress:indeterminate,
		progress:indeterminate::-webkit-progress-bar {
			animation: none;
			background-position: center;
		}
	}
</style>
