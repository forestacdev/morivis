<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade } from 'svelte/transition';

	import { showTermsDialog } from '$routes/store';
</script>

{#if $showTermsDialog}
	<div
		transition:fade={{ duration: 100 }}
		class="absolute bottom-0 z-30 flex h-full w-full items-center justify-center bg-black bg-opacity-50"
	>
		<div class="bg-opacity-8 bg-main h-[600px] w-[800px] rounded-md p-2">
			<div class="flex flex-shrink-0 items-center justify-between pb-2">
				<span class="text-lg font-bold">利用規約</span>
			</div>
			<div class="c-scroll h-full flex-grow overflow-y-auto overflow-x-hidden">
				<div class="pb-2">
					本規約は、本アプリケーション（以下、「本アプリ」）の利用に関する条件を定めるものです。本アプリをご利用いただくことで、本規約に同意したものとみなします。
				</div>
				<div class="pb-2">
					本アプリは、地図情報の閲覧および関連機能の提供を目的としています。以下の行為を禁止します：
					<div class="pl-2">
						<div>1. 本アプリの機能やコンテンツを不正に利用する行為</div>
						<div>2. 他のユーザーや第三者の権利を侵害する行為</div>
						<div>3. サーバーやネットワークに過度な負荷を与える行為</div>
						<div>4. 法律や公序良俗に反する行為</div>
					</div>
				</div>
				<div class="pb-2">
					本アプリで提供される地図情報およびその他のコンテンツの正確性や最新性について保証するものではありません。本アプリの利用によって生じたいかなる損害についても、当社は一切の責任を負いません。
					サーバー障害、メンテナンス、その他の理由により本アプリのサービスを一時的または永久に停止することがあります。この場合、当社は事前通知を行う義務を負いません。
				</div>
				<div class="pb-2">
					本アプリ内の地図データ、画像、プログラムその他のコンテンツに関する著作権、商標権その他の知的財産権は、当社または正当な権利を有する第三者に帰属します。これらを無断で複製、改変、再配布することを禁止します。
				</div>
				<div class="pb-2">
					本アプリの利用に際して取得した個人情報は、当社のプライバシーポリシーに基づき適切に取り扱います。本アプリでは、サービスの品質向上および利用状況の分析のために、Google
					アナリティクスを利用しています。Google アナリティクスは、トラフィックデータの収集のために
					Cookie
					を使用しています。このデータは匿名で収集されており、個人を特定するものではありません。Google
					によるデータの取扱いについては、Google のポリシーをご参照ください。
				</div>
				<div class="pb-2">
					事前通知なしに本アプリの内容や機能を変更、または提供を終了する場合があります。
				</div>
				<div class="pb-2">
					事前通知なしに本アプリの内容や機能を変更、または提供を終了する場合があります。
				</div>
				<div class="pb-2">
					事前通知なしに本アプリの内容や機能を変更、または提供を終了する場合があります。
				</div>
				<div class="pb-2">
					事前通知なしに本アプリの内容や機能を変更、または提供を終了する場合があります。
				</div>
				<div class="pb-2">
					事前通知なしに本アプリの内容や機能を変更、または提供を終了する場合があります。
				</div>
				<div class="pb-2">
					事前通知なしに本アプリの内容や機能を変更、または提供を終了する場合があります。
				</div>
			</div>
			<div>
				<button onclick={() => showTermsDialog.set(false)} class="c-btn-confirm"> 同意する </button>
			</div>
		</div>
	</div>
{/if}

<style>
</style>
