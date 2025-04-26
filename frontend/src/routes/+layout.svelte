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

<svelte:window on:resize={() => (deviceWidth = window.innerWidth)} />

<div
	class="absolute h-full w-full"
>
	{@render children()}
</div>


