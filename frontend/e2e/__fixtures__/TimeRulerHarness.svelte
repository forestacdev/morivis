<script lang="ts">
	import TimeRuler from '../../src/routes/map/components/atoms/TimeRuler.svelte';
	import type { SharedDiscreteDimension } from '../../src/routes/map/data/types';

	const dimension: SharedDiscreteDimension = {
		type: 'time',
		values: Array.from({ length: 20 }, (_, index) => String(2000 + index))
	};
	let currentIndex = $state(0);
	let commitCount = $state(0);
	const preview = (index: number) => {
		currentIndex = index;
	};
	const commit = (index: number) => {
		currentIndex = index;
		commitCount += 1;
	};
</script>

<TimeRuler {dimension} {currentIndex} onPreview={preview} onCommit={commit} showPlayback />
<output data-testid="current-index">{currentIndex}</output>
<output data-testid="commit-count">{commitCount}</output>

<style>
	:global(.time-ruler) {
		width: 360px;
		height: 84px;
	}
</style>
