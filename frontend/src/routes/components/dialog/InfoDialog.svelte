<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade } from 'svelte/transition';

	import { showInfoDialog } from '$routes/store';

	// export let mapBearing: number;
</script>

{#if $showInfoDialog}
	<div
		transition:fade={{ duration: 100 }}
		class="absolute bottom-0 z-30 flex h-full w-full items-center justify-center bg-black bg-opacity-50"
	>
		<div class="bg-opacity-8 bg-main h-[600px] w-[800px] rounded-md p-4">
			<div class="flex flex-shrink-0 items-center justify-between pb-4">
				<span class="text-2xl font-bold">ENSHURIN View について</span>
				<button onclick={() => showInfoDialog.set(false)} class="bg-base rounded-full p-2">
					<Icon icon="material-symbols:close-rounded" class="text-main w-4] h-4" />
				</button>
			</div>
			<div class="flex-flex-col c-scroll overflow-y-auto overflow-x-hidden p-2">
				<div class="pb-4">
					<div class="pb-2 text-lg font-bold">概要</div>
					<div class="">
						岐阜県立森林文化アカデミーのクリエーター科20期生の課題研究<a
							class="text-accent"
							href="https://www.forest.ac.jp/wp-content/uploads/2022/02/b_03_%E8%AA%B2%E9%A1%8C%E7%A0%94%E7%A9%B6%E8%A6%81%E6%97%A8_%E5%B0%8F%E6%9D%BE%E8%81%96.pdf"
							target="_blank"
							rel="noopener noreferrer"
							>「WebGIS を活用したアカデミー演習林の情報共有化」
						</a> により作成したアカデミー演習林のWebGISです。
					</div>
				</div>

				<div class="pb-4">
					バグなどを見つけた場合は、お手数ですが<a
						class="text-accent"
						href="https://github.com/forestacdev/enshurin-viewer/issues"
						target="_blank"
						rel="noopener noreferrer">GitHubのイシュー</a
					>にてご報告ください。
				</div>
				<div class="pb-4">
					<div class="pb-2 text-lg font-bold">Contributors / コントリビューターの皆さま</div>
					<div class="pb-2">
						このプロジェクトに貢献してくださった皆さま、ありがとうございます！
						貢献してくださる方は、ぜひPull Requestを送ってください 🙌
					</div>
					<div class="flex max-w-[300px] flex-col gap-2">
						<a
							class="lg:hover:bg-accent flex cursor-pointer items-center justify-start gap-2 rounded-full border-2 border-gray-300 p-2 transition-colors lg:hover:text-white"
							href="https://github.com/satoshi7190"
							target="_blank"
							rel="noopener noreferrer"
						>
							<div
								class="relative grid h-[50px] w-[50px] place-items-center overflow-hidden rounded-full bg-gray-500"
							>
								<img
									class="absolute block h-full w-full rounded-full object-cover"
									src="https://github.com/satoshi7190.png"
									alt="satoshi7190's Avatar"
								/>
							</div>
							<div class="flex flex-col">
								<span>Satoshi Komatsu</span><span>(@satoshi7190)</span>
							</div>
						</a>
						<a
							class="lg:hover:bg-accent flex cursor-pointer items-center justify-start gap-2 rounded-full border-2 border-gray-300 p-2 transition-colors lg:hover:text-white"
							href="https://www.forest.ac.jp/"
							target="_blank"
							rel="noopener noreferrer"
						>
							<div
								class="relative grid h-[50px] w-[50px] cursor-pointer place-items-center overflow-hidden rounded-full bg-gray-500"
							>
								<img
									class="pointer-events-none absolute block h-full w-full rounded-full object-cover"
									src="https://pbs.twimg.com/profile_images/1349232244909510656/US-2oTws_400x400.jpg"
									alt="岐阜県立森林文化アカデミー"
								/>
							</div>
							<div class="flex flex-col">
								<span>岐阜県立森林文化アカデミー</span>
								<span>関係者の方々</span>
							</div>
						</a>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
</style>
