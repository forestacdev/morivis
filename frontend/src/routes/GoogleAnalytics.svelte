<script lang="ts">
	// TODO: 利用明記をどこかに追加する
	import { browser } from '$app/environment';
	export let id: string;

	if (browser) {
		window.dataLayer = window.dataLayer || [];
		window.gtag = function gtag(): void {
			window.dataLayer.push(arguments);
		};
		window.gtag('js', new Date());
		window.gtag('config', id);
	}
</script>

<svelte:head>
	<script async src="https://www.googletagmanager.com/gtag/js?id={id}"></script>
</svelte:head>
