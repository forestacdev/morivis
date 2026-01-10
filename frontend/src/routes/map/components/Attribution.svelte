<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount, onDestroy } from 'svelte';

	import { mapAttributions } from '$routes/stores/attributions';

	const systemAttributionss = [
		'国土地理院',
		'© OpenMapTiles',
		'© OpenStreetMap contributors',
		'© U.S. Geological Survey'
	];

	let newAttributions = $derived.by(() => {
		const attributions = $mapAttributions;
		return [...attributions, ...systemAttributionss];
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

<div class="flex items-center justify-end gap-2">
	{#key currentIndex}
		<div class="fade-in">{newAttributions[currentIndex]}</div>
	{/key}
	<button class="p-0.1 cursor-pointer rounded-full bg-gray-300" onclick={open}>
		<Icon icon="humbleicons:info" class="text-main h-4 w-4" />
	</button>
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
