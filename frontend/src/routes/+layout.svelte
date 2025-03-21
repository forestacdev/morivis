<script lang="ts">
	import '../app.css';

	let { children } = $props();

	import { onMount } from 'svelte';

	import GoogleAnalytics from './GoogleAnalytics.svelte';

	import { MOBILE_WIDTH } from '$routes/constants';
	import { showTermsDialog } from '$routes/store';
	import { checkLocalStorage } from '$routes/utils/localStorage';
	import { isPc } from '$routes/utils/ui';

	type Device = 'mobile' | 'pc' | '';

	let isDevice = $state<Device>('');
	let deviceWidth = $state<number>(window.innerWidth);

	onMount(() => {
		// スマホかPCかの判定
		if (isPc()) {
			isDevice = 'pc';
		} else {
			isDevice = 'mobile';
		}

		if (checkLocalStorage('userData')) {
			showTermsDialog.set(true);
		}
	});
</script>

<!-- Googleアナリティクスの設定 -->
<GoogleAnalytics id={import.meta.env.VITE_GA_UA} />

<svelte:head>
	<title>ENSHURIN View - 森林文化アカデミー</title>
	<link rel="icon" href="./favicon.ico" type="image/svg+xml" />
	<meta
		name="viewport"
		content="initial-scale=1,maximum-scale=1,user-scalable=no"
		prefix="og: http://ogp.me/ns# fb: http://ogp.me/ns/fb# article: http://ogp.me/ns/article#"
	/>
	<meta property="og:title" content="ENSHURIN View - 森林文化アカデミー" />
	<meta property="og:type" content="website" />
	<!-- TODO: url -->
	<meta property="og:url" content="" />
	<meta property="og:image" content="./OGPimage.jpg" />
	<meta property="og:description" content="森林文化アカデミー演習林のWebGIS" />
	<meta name="twitter:card" content="summary" />
</svelte:head>

<svelte:window on:resize={() => (deviceWidth = window.innerWidth)} />

<div
	class="absolute h-full w-full {(isDevice === 'mobile' && deviceWidth <= MOBILE_WIDTH) ||
	(isDevice === 'pc' && deviceWidth > MOBILE_WIDTH)
		? ''
		: 'invisible'}"
>
	{@render children()}
</div>

<div
	class="h-full w-full {(isDevice === 'mobile' && deviceWidth <= MOBILE_WIDTH) ||
	(isDevice === 'pc' && deviceWidth > MOBILE_WIDTH)
		? 'invisible'
		: 'block'}"
>
	<p>このデバイスは非対応です。再読み込みをしてください。</p>
</div>
