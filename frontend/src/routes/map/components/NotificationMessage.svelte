<script lang="ts">
	import { fly } from 'svelte/transition';

	import LayerIcon from '$routes/map/components/atoms/LayerIcon.svelte';
	import {
		notificationMessages,
		removeNotification,
		type NotificationMessage
	} from '$routes/stores/notification';

	const timeoutMap = new Map<number, ReturnType<typeof setTimeout>>();

	const getBgClass = (type: NotificationMessage['type']) =>
		type === 'error'
			? 'bg-red-500 text-base'
			: type === 'success'
				? 'bg-[#348163] text-base'
				: type === 'warning'
					? 'bg-yellow-500 text-base'
					: 'bg-main text-base';

	const scheduleRemove = (msg: NotificationMessage) => {
		if (msg.persistent || timeoutMap.has(msg.id)) return;
		const tid = setTimeout(() => {
			removeNotification(msg.id);
			timeoutMap.delete(msg.id);
		}, 3000);
		timeoutMap.set(msg.id, tid);
	};

	$effect(() => {
		for (const msg of $notificationMessages) {
			scheduleRemove(msg);
		}
	});
</script>

<div
	class="pointer-events-none absolute right-0 z-30 flex flex-col gap-2 max-lg:top-[calc(16px+env(safe-area-inset-top))] lg:top-[100px]"
>
	{#each $notificationMessages as msg (msg.id)}
		{#if msg.type === 'add'}
			<div
				transition:fly|global={{ duration: 300, x: 200 }}
				class="flex w-fit items-center gap-2 self-end overflow-hidden rounded-l-lg border-2 border-r-0 border-gray-200 bg-black pr-6 shadow-md"
			>
				{#if msg.entry}
					<div class="relative shrink-0 overflow-hidden max-lg:h-16 max-lg:w-16 lg:h-20 lg:w-20">
						<LayerIcon layerEntry={msg.entry} rounded={false} />
					</div>
				{/if}
				<span class="pl-3 text-sm text-gray-300">データを追加しました</span>
			</div>
		{:else}
			<div
				transition:fly|global={{ duration: 300, x: 200 }}
				class="w-fit self-end rounded-l-lg px-6 py-2 shadow-md {getBgClass(msg.type)}"
			>
				{msg.message}
			</div>
		{/if}
	{/each}
</div>

<style>
	.shine::after {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;
		width: 60%;
		height: 100%;
		background: linear-gradient(
			110deg,
			transparent 40%,
			rgba(255, 255, 255, 0.45) 50%,
			transparent 60%
		);
		animation: shine 0.7s ease-out 0.1s forwards;
		pointer-events: none;
	}

	@keyframes shine {
		from {
			left: -100%;
		}
		to {
			left: 150%;
		}
	}
</style>
