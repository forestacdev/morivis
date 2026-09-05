<script lang="ts">
	interface Props {
		lng: number;
		lat: number;
		altitude: number;
	}

	let { lng = $bindable(), lat = $bindable(), altitude = $bindable() }: Props = $props();
</script>

<div class="c-scroll flex h-full w-full grow flex-col gap-4 overflow-x-hidden overflow-y-auto px-2">
	<div class="rounded-md bg-black/15 p-3 text-sm text-gray-200">
		地図上のマーカーをドラッグするか、座標を入力してモデルの配置位置を指定してください。
	</div>
	<label class="flex w-full flex-col gap-1 text-sm">
		<span>経度</span>
		<input class="c-input w-full" type="number" step="any" bind:value={lng} />
	</label>
	<label class="flex w-full flex-col gap-1 text-sm">
		<span>緯度</span>
		<input class="c-input w-full" type="number" step="any" bind:value={lat} />
	</label>
	<label class="flex w-full flex-col gap-1 text-sm">
		<span>高さ (m)</span>
		<input class="c-input w-full" type="number" step="0.1" bind:value={altitude} />
	</label>
</div>
