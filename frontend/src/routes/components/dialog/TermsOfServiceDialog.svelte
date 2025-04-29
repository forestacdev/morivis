<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade } from 'svelte/transition';

	import { showTermsDialog } from '$routes/store';
</script>

{#if $showTermsDialog}
	<div
		transition:fade={{ duration: 100 }}
		class="absolute bottom-0 z-30 flex h-full w-full items-center justify-center bg-black/50"
	>
		<div
			class="bg-opacity-8 bg-main flex max-h-[600px] max-w-[900px] grow flex-col rounded-md p-4 text-base"
		>
			<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
				<span class="text-2xl font-bold">利用規約</span>
			</div>
			<div class="c-scroll flex h-full grow flex-col overflow-y-auto overflow-x-hidden pb-4">
				<div class="pb-4">
					本規約は、本アプリケーション（以下、「本アプリ」）の利用に関する条件を定めるものです。本アプリをご利用いただくことで、本規約に同意したものとみなします。
				</div>
				<div class="pb-4">
					<div class="text-lg font-bold">本アプリの目的と禁止事項</div>
					本アプリは、地図情報の閲覧および関連機能の提供を目的としています。 ご利用にあたり、以下の行為を禁止します：
					<div class="pl-2">
						<div>1. 本アプリの機能やコンテンツを不正に利用する行為</div>
						<div>2. 他のユーザーや第三者の権利を侵害する行為</div>
						<div>3. サーバーやネットワークに過度な負荷を与える行為</div>
						<div>4. 法律や公序良俗に反する行為</div>
					</div>
				</div>
				<div class="pb-4">
					<div class="text-lg font-bold">サービスの変更・停止</div>
					<div>
						サーバー障害、メンテナンス、その他の理由により、本アプリのサービスを一時的または永久に停止することがあります。その際、当社は事前に通知を行う義務を負いません。
					</div>
				</div>
				<div class="pb-4">
					<div class="text-lg font-bold">知的財産権について</div>
					<div>
						本アプリ内の地図データ、画像、プログラムその他のコンテンツに関する著作権、商標権その他の知的財産権は、当社または正当な権利を有する第三者に帰属します。これらを無断で複製、改変、再配布することを禁止します。
					</div>
				</div>
				<div class="pb-4">
					<div class="text-lg font-bold">地図情報に関する注意および免責事項</div>
					<div>
						本アプリで表示される地図は、岐阜県立森林文化アカデミーの演習林を対象としたものであり、当該施設とは直接の関係はありません。個人が制作したものであり、正式な地図や情報と異なる場合があります。内容の正確性・最新性は保証されませんので、参考情報としてご利用ください。
						また、本アプリの利用により生じたいかなる損害についても、当社は一切の責任を負いません。
					</div>
				</div>
				<div class="pb-4">
					<div class="text-lg font-bold">個人情報の取扱いについて</div>
					<div>
						本アプリの利用に際して取得した個人情報は、当社のプライバシーポリシーに基づき、適切に取り扱います。
					</div>
				</div>
				<div class="pb-4">
					<div class="text-lg font-bold">Google アナリティクスの利用について</div>
					<div>
						本アプリでは、サービスの品質向上および利用状況の分析のために、Google
						アナリティクスを使用しています。Google
						アナリティクスは、トラフィックデータの収集のために Cookie
						を使用しており、データは匿名で収集され、個人を特定するものではありません。Google
						によるデータの取扱いについては、<a
							class="text-accent underline"
							target="_blank"
							href="https://policies.google.com/privacy"
							rel="noopener noreferrer">Google のプライバシーポリシー</a
						>をご確認ください。
					</div>
				</div>
				<div class="pb-4">
					<div class="text-lg font-bold">本規約の変更について</div>
					<div>
						事前の通知なしに、本アプリの内容や機能を変更、または提供を終了する場合があります。
					</div>
				</div>
			</div>
			<div class="flex shrink-0 justify-center overflow-auto pt-2">
				<button onclick={() => showTermsDialog.set(false)} class="c-btn-confirm px-12 py-6 text-lg">
					同意する
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
</style>
