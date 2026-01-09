<script lang="ts">
	import { fade, scale } from 'svelte/transition';

	import { showPwaManuelDialog, showTermsDialog } from '$routes/stores/ui';
	import { saveToTermsAccepted } from '$routes/map/utils/local_storage';
</script>

{#if $showPwaManuelDialog}
	<div
		transition:fade={{ duration: 200 }}
		class="fixed bottom-0 z-30 flex h-dvh w-full bg-black/50 max-lg:p-4 max-lg:py-8 lg:items-center lg:justify-center"
		style="padding-top: env(safe-area-inset-top);"
	>
		<div
			transition:scale={{ duration: 300, start: 0.9 }}
			class="bg-opacity-8 bg-main flex max-w-[900px] grow flex-col rounded-lg text-base max-lg:p-3 lg:h-full lg:max-h-[600px] lg:p-6"
		>
			<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
				<span class="text-2xl font-bold">アプリのインストール手順</span>
			</div>
			<div
				class="c-scroll flex h-full grow flex-col overflow-x-hidden overflow-y-auto pb-4 text-justify"
			>
				<div class="pb-4">画面下部のアドレスバーから共有アイコンをタップします。</div>
				<img
					src="./images/pwa/ios_Install_1.webp"
					alt="共有アイコン"
					class="bg-base mx-auto mb-6 rounded-lg"
				/>
				<div class="pb-4">「ホーム画面に追加」をタップします。</div>
				<img
					src="./images/pwa/ios_Install_2.webp"
					alt="ホーム画面に追加"
					class="bg-base mx-auto mb-6 rounded-lg"
				/>
				<div class="pb-4">「追加」をタップしてアプリをインストールします。</div>
				<img
					src="./images/pwa/ios_Install_3.webp"
					alt="追加"
					class="bg-base mx-auto mb-6 rounded-lg"
				/>
			</div>
			<div class="flex shrink-0 justify-center overflow-auto pt-2">
				<button
					onclick={() => {
						showPwaManuelDialog.set(false);
					}}
					class="c-btn-confirm px-12 py-6 text-lg"
				>
					OK
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
</style>
