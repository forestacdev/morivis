<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade } from 'svelte/transition';

	import { showInfoDialog } from '$map/store';

	// export let mapBearing: number;
</script>

{#if $showInfoDialog}
	<div
		transition:fade={{ duration: 100 }}
		class="absolute bottom-0 z-30 flex h-full w-full items-center justify-center bg-black bg-opacity-50"
	>
		<div class="bg-opacity-8 bg-main h-[600px] w-[800px] rounded-md p-2">
			<div class="flex items-center justify-between pb-2">
				<span class="text-lg font-bold">演習林GISについて</span>
				<button onclick={() => showInfoDialog.set(false)} class="bg-base rounded-full p-2">
					<Icon icon="material-symbols:close-rounded" class="text-main w-4] h-4" />
				</button>
			</div>
			<div>
				岐阜県立森林文化アカデミーのクリエーター科20期生の課題研究<a
					class="text-accent"
					href="https://www.forest.ac.jp/wp-content/uploads/2022/02/b_03_%E8%AA%B2%E9%A1%8C%E7%A0%94%E7%A9%B6%E8%A6%81%E6%97%A8_%E5%B0%8F%E6%9D%BE%E8%81%96.pdf"
					target="_blank"
					rel="noopener noreferrer"
					>「WebGIS を活用したアカデミー演習林の情報共有化」
				</a>により作成したアカデミー演習林WebGISです。
			</div>
		</div>
	</div>
{/if}

<style>
</style>
