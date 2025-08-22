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
	import {
		isBlocked,
		isMobile,
		showDataMenu,
		showLayerMenu,
		showOtherMenu
	} from '$routes/stores/ui';
	import { MOBILE_WIDTH } from './constants';
	import { checkMobile, checkMobileWidth, checkPc } from '$routes/map/utils/ui';
	import { setDeferredPrompt, type BeforeInstallPromptEvent } from './map/utils/device';

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


	const onNextPage = async (toPage: string | null) => {
		if (!toPage) return;

		if (import.meta.env.MODE === 'production' && toPage.startsWith('/_')) {
			// 行き先の先頭時が_なら、ホームに遷移
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
		window.addEventListener('beforeinstallprompt', (event) => {
			event.preventDefault();
			setDeferredPrompt(event as BeforeInstallPromptEvent);
			return false;
		});
	});

	const initialized = () => {
		isInitialized = true;
	};

	const deviceType = checkMobile() ? 'mobile' : 'pc';
</script>

<!-- Googleアナリティクスの設定 -->
<GoogleAnalytics id={import.meta.env.VITE_GA_UA} />

<svelte:head>
	<!-- <link rel="icon" href={faviconHref} /> -->
	{@html webManifestLink}
</svelte:head>

<div class="absolute h-dvh w-full">
	{#if deviceType === 'mobile' && !$isMobile}
		<div class="bg-main z-100 absolute flex h-full w-full items-center justify-center text-base">
			<p class="text-2xl">端末を縦向きにしてください。</p>
			<Icon icon="circum:mobile-3" class="h-16 w-16" />
		</div>
	{/if}
	{#if isInitialized}
		{@render children()}
	{:else}
		<div class="flex h-full w-full items-center justify-center"></div>
	{/if}
</div>

<TermsOfServiceDialog />
<InfoDialog />
<WebGLScreen {initialized} />
<ScreenGuard />
