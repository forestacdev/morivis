<script lang="ts">
	import { checkMobile, type MobileActiveMenu } from '$routes/map/utils/ui';
	import { showLayerMenu, showDataMenu, showOtherMenu } from '$routes/stores/ui';
	import Icon from '@iconify/svelte';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { FeatureMenuData } from '$routes/map/types';
	import { fly } from 'svelte/transition';

	interface Props {
		featureMenuData: FeatureMenuData | null;
		layerEntries: GeoDataEntry[];
		showSelectionMarker: boolean;
	}

	let {
		featureMenuData = $bindable(),
		layerEntries,
		showSelectionMarker = $bindable()
	}: Props = $props();
</script>

<div class="space-y-4">
	<div class="rounded-lg bg-blue-50 p-4">
		<h3 class="text-lg font-semibold text-blue-900">セクション 1</h3>
		<p class="mt-2 text-blue-800">
			これはスクロール可能なコンテンツのサンプルです。カードを展開してアニメーションが完了すると、このエリアが通常のスクロール動作をします。
		</p>
	</div>

	<div class="rounded-lg bg-green-50 p-4">
		<h3 class="text-lg font-semibold text-green-900">セクション 2</h3>
		<p class="mt-2 text-green-800">
			Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut
			labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.
		</p>
		<ul class="mt-3 list-inside list-disc text-green-800">
			<li>リストアイテム 1</li>
			<li>リストアイテム 2</li>
			<li>リストアイテム 3</li>
		</ul>
	</div>

	<div class="rounded-lg bg-purple-50 p-4">
		<h3 class="text-lg font-semibold text-purple-900">セクション 3</h3>
		<p class="mt-2 text-purple-800">
			長いコンテンツをスクロールして確認できます。カードが展開完了状態の時のみ、内部スクロールが有効になります。
		</p>
	</div>

	<div class="rounded-lg bg-orange-50 p-4">
		<h3 class="text-lg font-semibold text-orange-900">セクション 4</h3>
		<p class="mt-2 text-orange-800">
			Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
			pariatur. Excepteur sint occaecat cupidatat non proident.
		</p>
	</div>

	<div class="rounded-lg bg-pink-50 p-4">
		<h3 class="text-lg font-semibold text-pink-900">セクション 5</h3>
		<p class="mt-2 text-pink-800">
			Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque
			laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore.
		</p>
		<div class="mt-3 grid grid-cols-2 gap-2">
			<div class="rounded bg-pink-100 p-2 text-sm">カード 1</div>
			<div class="rounded bg-pink-100 p-2 text-sm">カード 2</div>
			<div class="rounded bg-pink-100 p-2 text-sm">カード 3</div>
			<div class="rounded bg-pink-100 p-2 text-sm">カード 4</div>
		</div>
	</div>

	<div class="rounded-lg bg-indigo-50 p-4">
		<h3 class="text-lg font-semibold text-indigo-900">セクション 6</h3>
		<p class="mt-2 text-indigo-800">
			At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium
			voluptatum deleniti atque corrupti.
		</p>
	</div>

	<div class="rounded-lg bg-teal-50 p-4">
		<h3 class="text-lg font-semibold text-teal-900">セクション 7</h3>
		<p class="mt-2 text-teal-800">
			Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis
			est eligendi optio cumque.
		</p>
	</div>

	<div class="rounded-lg bg-red-50 p-4">
		<h3 class="text-lg font-semibold text-red-900">最終セクション</h3>
		<p class="mt-2 text-red-800">
			これが最後のセクションです。ここまでスクロールできれば、内部スクロール機能が正常に動作しています。
		</p>
		<div class="mt-4 rounded-lg bg-red-100 p-3">
			<p class="text-sm text-red-700">
				💡 ヒント:
				カードを展開してアニメーション完了後に、このエリア内でスクロールしてみてください。
			</p>
		</div>
	</div>

	<!-- スクロール確認用の余白 -->
	<div class="h-20"></div>
</div>

<style>
</style>
