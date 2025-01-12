<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade } from 'svelte/transition';

	import { showTermsDialog } from '$map/store';
</script>

{#if $showTermsDialog}
	<div
		transition:fade={{ duration: 100 }}
		class="absolute bottom-0 z-30 flex h-full w-full items-center justify-center bg-black bg-opacity-50"
	>
		<div class="bg-opacity-8 bg-main h-[600px] w-[800px] rounded-md p-2">
			<div class="flex items-center justify-between pb-2">
				<span class="text-lg font-bold">利用規約</span>
				<button onclick={() => showTermsDialog.set(false)} class="bg-base rounded-full p-2">
					<Icon icon="material-symbols:close-rounded" class="text-main w-4] h-4" />
				</button>
			</div>
			<div>
				本規約は、本アプリケーション（以下、「本アプリ」）の利用に関する条件を定めるものです。本アプリをご利用いただくことで、本規約に同意したものとみなします。
			</div>
			<div>
				本アプリは、地図情報の閲覧および関連機能の提供を目的としています。以下の行為を禁止します：
				1. 本アプリの機能やコンテンツを不正に利用する行為 2.
				他のユーザーや第三者の権利を侵害する行為 3. サーバーやネットワークに過度な負荷を与える行為
				4. 法律や公序良俗に反する行為
			</div>
			<div>
				1.
				本アプリで提供される地図情報およびその他のコンテンツの正確性や最新性について保証するものではありません。
				2. 本アプリの利用によって生じたいかなる損害についても、当社は一切の責任を負いません。 3.
				サーバー障害、メンテナンス、その他の理由により本アプリのサービスを一時的または永久に停止することがあります。この場合、当社は事前通知を行う義務を負いません。
			</div>
			<div>
				本アプリ内の地図データ、画像、プログラムその他のコンテンツに関する著作権、商標権その他の知的財産権は、当社または正当な権利を有する第三者に帰属します。これらを無断で複製、改変、再配布することを禁止します。
			</div>
			<div>
				本アプリの利用に際して取得した個人情報は、当社のプライバシーポリシーに基づき適切に取り扱います。詳細はプライバシーポリシーをご確認ください。
			</div>
			<div>
				当社は、事前通知なしに本アプリの内容や機能を変更、または提供を終了する場合があります。
			</div>
			<div>
				本規約は、日本法に準拠し解釈されます。本規約に関する紛争が生じた場合、東京地方裁判所を第一審の専属管轄裁判所とします。
			</div>
			<div>
				本規約は、2025年1月13日より適用されます。規約の改訂は随時行われることがあり、最新の規約が適用されます。
			</div>
		</div>
	</div>
{/if}

<style>
</style>
