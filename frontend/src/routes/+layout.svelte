<script lang="ts">
	import '../app.css';
	let { children } = $props();

	import { onNavigate } from '$app/navigation';

	onNavigate((navigation) => {
		if (!document.startViewTransition) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<svelte:head>
	<title>演習林WebMap</title>
	<link
		rel="icon"
		href="https://raw.githubusercontent.com/ensyurinGIS/map/main/sozai/favicon.svg"
		type="image/svg+xml"
	/>
	<meta
		name="viewport"
		content="initial-scale=1,maximum-scale=1,user-scalable=no"
		prefix="og: http://ogp.me/ns# fb: http://ogp.me/ns/fb# article: http://ogp.me/ns/article#"
	/>
	<meta property="og:title" content="演習林WebMap - 森林文化アカデミー" />
	<meta property="og:type" content="website" />
	<!-- TODO: url -->
	<meta property="og:url" content="" />
	<meta property="og:image" content="./OGPimage.jpg" />
	<meta property="og:description" content="森林文化アカデミーの演習林WebGIS" />
	<meta name="twitter:card" content="summary" />
</svelte:head>

{@render children()}
