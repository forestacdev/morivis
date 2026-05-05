<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	import {
		getAttribution,
		getAttributionName,
		type AttributionKey
	} from '$routes/map/data/entries/_meta_data/_attribution';
	import { mapAttributions } from '$routes/stores/attributions';

	const systemAttributionss: AttributionKey[] = ['国土地理院', 'OMT', 'OSM', 'USGS'];

	let newAttributions = $derived.by(() => {
		const attributions = $mapAttributions;
		return [...attributions, ...systemAttributionss].map((attribution) => {
			const resolvedAttribution = getAttribution(attribution);

			return {
				name: getAttributionName(attribution) ?? attribution,
				url: resolvedAttribution?.url ?? ''
			};
		});
	});

	let currentIndex = $state<number>(0);
	const INTERVAL = 10000; //

	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	function scheduleNext() {
		timeoutId = setTimeout(() => {
			currentIndex = (currentIndex + 1) % newAttributions.length;
			scheduleNext(); // 次の実行をスケジュール
		}, INTERVAL);
	}

	onMount(() => {
		scheduleNext();
	});

	onDestroy(() => {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
	});

	const nextMessage = () => {
		currentIndex = (currentIndex + 1) % newAttributions.length;
	};

	const prevMessage = () => {
		currentIndex = currentIndex === 0 ? newAttributions.length - 1 : currentIndex - 1;
	};

	const open = () => {};
</script>

<div class="flex items-center justify-end gap-2 pr-2 select-none">
	{#key currentIndex}
		{#if newAttributions[currentIndex]?.url}
			<a
				href={newAttributions[currentIndex].url}
				target="_blank"
				rel="noopener noreferrer"
				class="fade-in underline-offset-2 hover:underline"
			>
				{newAttributions[currentIndex].name}
			</a>
		{:else}
			<div class="fade-in">{newAttributions[currentIndex]?.name}</div>
		{/if}
	{/key}
</div>

<style>
	.fade-in {
		animation: fadeIn 0.8s ease-in-out;
	}

	@keyframes fadeIn {
		0% {
			opacity: 0;
		}
		100% {
			opacity: 1;
		}
	}
</style>
