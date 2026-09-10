<script lang="ts" generics="T extends Component<any>">
	import type { Component, Snippet } from 'svelte';

	let {
		load,
		children,
		onclose
	}: {
		load: () => Promise<{ default: T }>;
		children: Snippet<[T]>;
		onclose: () => void;
	} = $props();

	let componentPromise = $derived(load());
</script>

{#await componentPromise}
	<div class="bg-main fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 text-base">
		<p role="status">読み込み中…</p>
		<button type="button" class="bg-sub cursor-pointer rounded px-4 py-2" onclick={onclose}>
			キャンセル
		</button>
	</div>
{:then module}
	{@render children(module.default)}
{:catch}
	<div class="bg-main fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 text-base">
		<p role="alert">画面を読み込めませんでした。通信状態を確認してください。</p>
		<div class="flex gap-3">
			<button
				type="button"
				class="bg-accent cursor-pointer rounded px-4 py-2 text-white"
				onclick={() => (componentPromise = load())}>再試行</button
			>
			<button type="button" class="bg-sub cursor-pointer rounded px-4 py-2" onclick={onclose}>
				閉じる
			</button>
		</div>
	</div>
{/await}
