<script lang="ts">
	import {
		getJapanPlaneRectangularInfo,
		getJapanPlaneRectangularSystems
	} from '$routes/map/utils/proj/japan-plane-rectangular';
	import { planeGridZone } from '$routes/stores/layers';

	const id = $props.id();
	const systems = getJapanPlaneRectangularSystems();
	const selected = $derived(getJapanPlaneRectangularInfo($planeGridZone));
</script>

<div class="flex min-w-0 flex-col gap-2 rounded-lg border border-base p-2 text-xs">
	<label for={id}>平面直角座標系</label>
	<select {id} bind:value={$planeGridZone} class="bg-main w-full rounded border border-base p-2">
		{#each systems as system (system.zone)}
			<option value={system.zone}>第{system.zone}系（{system.epsg.jgd2011}）</option>
		{/each}
	</select>
	<p>JGD2011 ／ X：北方向・Y：東方向（m）</p>
	<p class="line-clamp-2" title={selected?.areaOfUse}>適用区域：{selected?.areaOfUse}</p>
	<p>方眼間隔はズームに応じて10 m〜100 km</p>
</div>
