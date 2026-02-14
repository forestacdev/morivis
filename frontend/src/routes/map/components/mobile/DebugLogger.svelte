<script lang="ts">
	import { isDebugMode } from '$routes/stores';
	import { debugLog, type DebugLogEntry } from '$routes/stores/debug';

	let showDebugWindow = $state(true);

	const logs = $derived($debugLog);

	const levelColor = (level: DebugLogEntry['level']) => {
		switch (level) {
			case 'info':
				return 'text-green-400';
			case 'warn':
				return 'text-yellow-400';
			case 'error':
				return 'text-red-400';
		}
	};

	const formatTime = (date: Date) => {
		return date.toLocaleTimeString('ja-JP', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			fractionalSecondDigits: 3
		});
	};
</script>

{#if showDebugWindow && $isDebugMode}
	<div class="absolute top-0 left-0 z-50 w-full max-w-md p-2 lg:hidden">
		<div class="max-h-64 overflow-y-auto rounded bg-black/80 p-2 text-white">
			<div class="mb-2 flex items-center justify-between">
				<h3 class="text-sm font-bold">Debug Logger</h3>
				<div class="flex gap-1">
					<button
						class="rounded bg-gray-600 px-2 py-0.5 text-xs hover:bg-gray-500"
						onclick={() => debugLog.clear()}
					>
						Clear
					</button>
					<button
						class="rounded bg-gray-600 px-2 py-0.5 text-xs hover:bg-gray-500"
						onclick={() => (showDebugWindow = false)}
					>
						Close
					</button>
				</div>
			</div>
			{#if logs.length === 0}
				<p class="text-xs text-gray-400">No logs yet.</p>
			{:else}
				<div class="space-y-0.5 font-mono text-xs">
					{#each logs as entry}
						<div class="flex gap-1">
							<span class="shrink-0 text-gray-500">{formatTime(entry.timestamp)}</span>
							<span class="{levelColor(entry.level)} shrink-0 uppercase">[{entry.level}]</span>
							<span class="break-all">{entry.message}</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{:else if $isDebugMode}
	<button
		class="absolute top-4 left-4 z-50 rounded bg-black/60 px-2 py-1 text-xs text-white hover:bg-black/80"
		onclick={() => (showDebugWindow = true)}
	>
		Debug
	</button>
{/if}
