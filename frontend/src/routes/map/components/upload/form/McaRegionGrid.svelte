<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { cubicOut } from 'svelte/easing';
	import { prefersReducedMotion, Tween } from 'svelte/motion';

	import type { McaRegionPosition } from '$routes/map/utils/formats/mca/types';
	import { createMcaUploadGrid } from '$routes/map/utils/formats/mca/upload-grid';

	interface Props {
		files: Pick<File, 'name'>[];
		center?: McaRegionPosition;
	}
	let { files, center = $bindable() }: Props = $props();
	const grid = $derived(createMcaUploadGrid(files, center));
	const viewport = new Tween(
		untrack(() => grid.center),
		{ duration: 240, easing: cubicOut }
	);
	const rowHeight = 46.5;
	const anchorX = $derived(Math.floor(viewport.current.x));
	const anchorZ = $derived(Math.floor(viewport.current.z));
	const anchor = $derived({ x: anchorX, z: anchorZ });
	const bufferedGrid = $derived(createMcaUploadGrid(files, anchor, { columns: 11, rows: 9 }));
	const offset = $derived({ x: viewport.current.x - anchor.x, z: viewport.current.z - anchor.z });
	const origin = $derived.by(() => {
		if (!bufferedGrid.origin) return null;
		const column = bufferedGrid.origin.column - 1 - offset.x;
		const row = bufferedGrid.origin.row - 1 - offset.z;
		return column >= 0 && column <= grid.columns && row >= 0 && row <= grid.rows
			? { column, row }
			: null;
	});
	let navigationCenter: McaRegionPosition | undefined;
	let navigationFiles: Props['files'] | undefined;
	const setViewport = (next: McaRegionPosition, duration: number) => {
		// 直前のフレーム開始前でも古いTweenを終了し、現在位置から方向を切り替える。
		void viewport.set(viewport.current, { duration: 0 });
		void viewport.set(next, { duration });
	};
	const move = (x: number, z: number) => {
		center = { x: grid.center.x + x, z: grid.center.z + z };
		navigationCenter = center;
		navigationFiles = files;
		setViewport(grid.center, prefersReducedMotion.current ? 0 : 240);
	};
	$effect(() => {
		const next = grid.center;
		const externallyChanged = center !== navigationCenter || files !== navigationFiles;
		const reduceMotion = prefersReducedMotion.current;
		if (externallyChanged || reduceMotion) {
			untrack(() => setViewport(next, 0));
		}
	});
	onDestroy(() => {
		void viewport.set(viewport.current, { duration: 0 });
	});
</script>

<section class="flex flex-col gap-2" aria-label="選択した地形リージョンの配置図">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h3 class="font-bold">リージョン配置図</h3>
	</div>
	<div class="grid grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] items-center gap-1">
		<button
			type="button"
			class="c-btn-sub col-start-2 row-start-1 min-h-9 min-w-16 justify-self-center px-2 text-xs"
			aria-label="北へ3リージョン移動"
			onclick={() => move(0, -3)}>↑ 北</button
		>
		<button
			type="button"
			class="c-btn-sub col-start-1 row-start-2 flex min-h-12 w-9 flex-col items-center justify-center text-xs"
			aria-label="西へ4リージョン移動"
			onclick={() => move(-4, 0)}><span aria-hidden="true">←</span><span>西</span></button
		>
		<div class="relative col-start-2 row-start-2 min-w-0">
			<div
				class="overflow-hidden rounded ring-1 ring-white/20 ring-inset"
				style:height={`${grid.rows * rowHeight}px`}
			>
				<div
					class="grid grid-cols-11 grid-rows-9"
					style:height={`${bufferedGrid.rows * rowHeight}px`}
					style:width={`${(bufferedGrid.columns / grid.columns) * 100}%`}
					style:transform={`translate(${(-(1 + offset.x) / bufferedGrid.columns) * 100}%, ${(-(1 + offset.z) / bufferedGrid.rows) * 100}%)`}
					role="list"
					aria-label="9列7行のリージョン一覧"
				>
					{#each bufferedGrid.cells as cell (cell.name)}
						<div
							role="listitem"
							title={cell.loaded
								? `${cell.name}\n選択済み: ${cell.files.join(', ')}`
								: `${cell.name}\n未選択`}
							aria-label={`${cell.name} ${cell.loaded ? '選択済み' : '未選択'}`}
							class={[
								'flex min-w-0 flex-col items-center justify-center border-r border-b border-white/20 px-0.5 py-1 text-[10px] leading-tight',
								cell.loaded ? 'bg-cyan-700 text-white' : 'bg-gray-800 text-gray-400'
							]}
						>
							<span class="w-full truncate text-center">X {cell.x}</span>
							<span class="w-full truncate text-center">Z {cell.z}</span>
							<span aria-hidden="true">{cell.loaded ? '●' : '·'}</span>
						</div>
					{/each}
				</div>
			</div>
			{#if origin}
				<span
					role="img"
					title="ワールド原点 X=0, Z=0"
					aria-label="ワールド原点 X=0, Z=0"
					class="absolute z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-300 ring-2 ring-black/80"
					style:left={`${(origin.column / grid.columns) * 100}%`}
					style:top={`${(origin.row / grid.rows) * 100}%`}
				></span>
			{/if}
		</div>
		<button
			type="button"
			class="c-btn-sub col-start-3 row-start-2 flex min-h-12 w-9 flex-col items-center justify-center text-xs"
			aria-label="東へ4リージョン移動"
			onclick={() => move(4, 0)}><span aria-hidden="true">→</span><span>東</span></button
		>
		<button
			type="button"
			class="c-btn-sub col-start-2 row-start-3 min-h-9 min-w-16 justify-self-center px-2 text-xs"
			aria-label="南へ3リージョン移動"
			onclick={() => move(0, 3)}>↓ 南</button
		>
	</div>
	<div class="flex flex-wrap items-center justify-between gap-2 text-xs">
		<p><span class="text-cyan-300">● 選択済み</span> {grid.regionCount}リージョン</p>
		<p class="text-amber-300">◯ ワールド原点</p>
		<p>中心 X={grid.center.x}、Z={grid.center.z}</p>
	</div>
	{#if grid.outsideCount > 0}
		<p class="text-xs">
			範囲外: {grid.outsideCount}区画（一覧から移動）
		</p>
	{/if}
	<div class="flex justify-center">
		<button type="button" class="c-btn-sub px-2 py-1" onclick={() => (center = undefined)}
			>選択範囲へ戻る</button
		>
	</div>
</section>
