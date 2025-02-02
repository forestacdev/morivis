<script lang="ts">
	import Icon from '@iconify/svelte';

	import { attributionMap, type AttributionKey, type Attribution } from '$map/data/attribution';
	import { layerAttributions } from '$map/store';

	let attributions = $state<Attribution[]>([]);

	layerAttributions.subscribe((layerAttributions) => {
		const newAttributions = layerAttributions
			.map((attribution) => {
				const atl = attributionMap.get(attribution);
				if (atl) return atl; // `atl` が存在する場合のみ `name` を返す
				return undefined; // 明示的に `undefined` を返す（型推論のため）
			})
			.filter((atl): atl is Attribution => atl !== undefined); // `undefined` を除外

		if (newAttributions.length > 0) {
			attributions = newAttributions;
		}
	});
</script>

{#if attributions}
	<div
		class="pointer-events-none absolute bottom-0 right-0 z-10 flex h-full w-full flex-shrink-0 justify-end gap-2 text-nowrap p-2 text-white"
	>
		<!-- ホバーで出典表記の説明を出す -->
		<span class="bg-base grid place-items-center rounded-full">
			<Icon icon="lets-icons:info-alt-fill" class="h-6 w-6" />
		</span>
		<div class="flex gap-2">
			{#each attributions as atl}
				<a
					class="bg-base pointer-events-auto grid flex-grow cursor-pointer select-none place-items-center rounded-full px-2 text-xs"
					href={atl.url}
					target="_blank"
					rel="noopener noreferrer"
					><span>{atl.name}</span>
				</a>
			{/each}
		</div>
	</div>
{/if}

<style>
	/* reset css */
	a {
		text-decoration: none;
	}

	a:active {
		color: inherit;
	}

	a:focus {
		outline: none;
	}
</style>
