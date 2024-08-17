<!-- src/routes/[...catchall]/+page.svelte -->
<script context="module" lang="ts">
	// export const prerender = true; // SSG用に静的レンダリングを有効にする
</script>

<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	// クライアントサイドでリダイレクトする
	onMount(() => {
		goto('/'); // 存在しないページはルートにリダイレクト
	});
</script>

<!-- リダイレクトする間の簡単なメッセージを表示 -->
<p>Redirecting to home...</p>
