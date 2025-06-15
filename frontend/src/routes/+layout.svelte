<script lang="ts">
	import '../app.css';

	let { children } = $props();

	import { onMount } from 'svelte';

	import GoogleAnalytics from './GoogleAnalytics.svelte';

	import { beforeNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { MOBILE_WIDTH } from '$routes/constants';
	import { showTermsDialog } from '$routes/store';
	import { checkLocalStorage } from '$routes/utils/localStorage';
	import { isPc } from '$routes/utils/ui';

	// onNavigate((navigation) => {
	// 	if (!document.startViewTransition) return;

	// 	return new Promise((resolve) => {
	// 		document.startViewTransition(async () => {
	// 			resolve();
	// 			await navigation.complete;
	// 		});
	// 	});
	// });

	type Device = 'mobile' | 'pc' | '';

	let isDevice = $state<Device>('');
	let deviceWidth = $state<number>(window.innerWidth);

	// 環境ごとのファビコンの設定
	type EnvMode = 'development';

	const faviconDict: Record<EnvMode, string> = {
		development: '🚧' // develop環境
	};

	const faviconChar = faviconDict[import.meta.env.MODE as EnvMode];
	const faviconHref = faviconChar
		? `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${faviconChar}</text></svg>`
		: './favicon.svg';

	const onNextPage = async (toPage: string | null) => {
		if (!toPage) return;

		// 行き先の先頭時が_なら、ホームに遷移
		if (import.meta.env.MODE === 'production' && toPage.startsWith('/_')) {
			window.location.href = '/';
			return;
		}
	};

	beforeNavigate(async ({ cancel, to }) => {
		if (!to) return;

		const toPage = to.route.id;
		if (!toPage) return;

		if (import.meta.env.MODE === 'production' && toPage.startsWith('/_')) {
			cancel();

			return { path: '/' };
		}
	});

	onMount(async () => {
		await onNextPage(page.route.id);
	});

	onMount(() => {
		// スマホかPCかの判定
		if (isPc()) {
			isDevice = 'pc';
		} else {
			isDevice = 'mobile';
		}

		if (checkLocalStorage('isTermsAccepted')) {
			showTermsDialog.set(true);
		}
	});
</script>

<!-- Googleアナリティクスの設定 -->
<GoogleAnalytics id={import.meta.env.VITE_GA_UA} />

<svelte:window on:resize={() => (deviceWidth = window.innerWidth)} />

<svelte:head>
	<link rel="icon" href={faviconHref} />
</svelte:head>

<div class="absolute h-full w-full">
	{@render children()}
</div>
