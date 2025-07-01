<script lang="ts">
	import '../app.css';
	import WebGLScreen from '$routes/map/components/effect/screen/WebGLScreen.svelte';

	let { children } = $props();

	import { onMount } from 'svelte';

	import GoogleAnalytics from './GoogleAnalytics.svelte';

	import { beforeNavigate, goto, onNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { MOBILE_WIDTH } from '$routes/constants';
	import { showTermsDialog } from '$routes/store';
	import { checkToTermsAccepted } from '$routes/map/utils/localStorage';
	import { isPc } from '$routes/map/utils/ui';
	import { delay } from 'es-toolkit';
	import { transitionPageScreen } from '$routes/store/effect';

	onNavigate((navigation) => {
		// NOTE: URLパラメータの変更のみ無効
		if (navigation.from && navigation.to && navigation.from.route.id === navigation.to.route.id) {
			return;
		}
		return new Promise((resolve) => {
			// ページ遷移のアニメーションを制御
			transitionPageScreen.set(1);
			delay(1000).then(() => {
				resolve();
				navigation.complete;
				delay(300).then(() => {
					transitionPageScreen.set(-1);
				});
			});
		});
	});

	type Device = 'mobile' | 'pc' | '';

	let isDevice = $state<Device>('');
	let deviceWidth = $state<number>(window.innerWidth);
	let isInitialized = $state<boolean>(false);

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

		if (checkToTermsAccepted()) {
			showTermsDialog.set(true);
		}
	});

	const initialized = () => {
		isInitialized = true;
	};
</script>

<WebGLScreen {initialized} />

<!-- Googleアナリティクスの設定 -->
<GoogleAnalytics id={import.meta.env.VITE_GA_UA} />

<svelte:window on:resize={() => (deviceWidth = window.innerWidth)} />

<svelte:head>
	<link rel="icon" href={faviconHref} />
</svelte:head>

<div class="absolute h-full w-full">
	{#if isInitialized}
		{@render children()}
	{/if}
</div>
