<script lang="ts">
	import '../app.css';
	import WebGLScreen from '$routes/map/components/effect/screen/WebGLScreen.svelte';
	import { pwaInfo } from 'virtual:pwa-info';
	import TermsOfServiceDialog from '$lib/components/TermsOfServiceDialog.svelte';
	import ScreenGuard from '$lib/components/ScreenGuard.svelte';
	import Icon from '@iconify/svelte';

	import { onMount } from 'svelte';

	import GoogleAnalytics from './GoogleAnalytics.svelte';

	import { beforeNavigate, goto, onNavigate } from '$app/navigation';
	import InfoDialog from '$lib/components/InfoDialog.svelte';

	import { page } from '$app/state';

	import { delay } from 'es-toolkit';
	import { transitionPageScreen } from '$routes/stores/effect';
	import { isBlocked } from '$routes/stores/ui';
	import { MOBILE_WIDTH } from './constants';
	import { checkMobile, checkMobileWidth, checkPc } from '$routes/map/utils/ui';

	let { children } = $props();

	const webManifestLink = pwaInfo?.webManifest?.linkTag || '';

	onNavigate((navigation) => {
		// NOTE: URLパラメータの変更のみ無効
		if (navigation.from && navigation.to && navigation.from.route.id === navigation.to.route.id) {
			return;
		}
		return new Promise((resolve) => {
			isBlocked.set(true);
			// ページ遷移のアニメーションを制御
			transitionPageScreen.set(1);
			delay(1000).then(() => {
				resolve();
				navigation.complete;
				delay(300).then(() => {
					transitionPageScreen.set(-1);

					delay(1000).then(() => {
						isBlocked.set(false);
					});
				});
			});
		});
	});

	let isInitialized = $state<boolean>(false);

	// // 環境ごとのファビコンの設定
	// type EnvMode = 'development';

	// const faviconDict: Record<EnvMode, string> = {
	// 	development: '🚧' // develop環境
	// };

	// const faviconChar = faviconDict[import.meta.env.MODE as EnvMode];
	// const faviconHref = faviconChar
	// 	? `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${faviconChar}</text></svg>`
	// 	: './favicon.svg';

	const onNextPage = async (toPage: string | null) => {
		if (!toPage) return;

		// 行き先の先頭時が_なら、ホームに遷移
		if (import.meta.env.MODE === 'production' && toPage.startsWith('/_')) {
			window.location.href = '/morivis';
			return;
		}
	};

	beforeNavigate(async ({ cancel, to }) => {
		if (!to) return;

		const toPage = to.route.id;
		if (!toPage) return;

		if (import.meta.env.MODE === 'production' && toPage.startsWith('/_')) {
			cancel();

			return { path: '/morivis' };
		}
	});

	onMount(async () => {
		await onNextPage(page.route.id);
	});

	const initialized = () => {
		isInitialized = true;
	};

	const deviceType = checkMobile() ? 'mobile' : 'pc';

	let isMobileWidth = $state<boolean>(checkMobile());

	window.addEventListener('resize', () => {
		isMobileWidth = checkMobileWidth();
	});

	$effect(() => {
		if (isMobileWidth) {
		} else {
		}
	});
</script>

<!-- Googleアナリティクスの設定 -->
<GoogleAnalytics id={import.meta.env.VITE_GA_UA} />

<svelte:head>
	<!-- <link rel="icon" href={faviconHref} /> -->
	{@html webManifestLink}
</svelte:head>

<div class="absolute h-full w-full">
	{#if deviceType === 'mobile' && !isMobileWidth}
		<div class="bg-main flex h-full w-full items-center justify-center text-base">
			<p class="text-2xl">端末を縦向きにしてください。</p>
			<Icon icon="circum:mobile-3" class="h-16 w-16" />
		</div>
	{:else}
		{@render children()}
	{/if}
</div>

<TermsOfServiceDialog />
<InfoDialog />
<WebGLScreen {initialized} />
<ScreenGuard />
