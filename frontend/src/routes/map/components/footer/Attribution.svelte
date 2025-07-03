<script lang="ts">
	import Icon from '@iconify/svelte';

	import {
		attributionMap,
		type AttributionKey,
		type Attribution
	} from '$routes/map/data/attribution';
	import { layerAttributions } from '$routes/stores/attributions';
	import { update } from 'es-toolkit/compat';
	import { debounce } from 'es-toolkit';

	let attributions = $state<Attribution[]>([]);

	const updateAttributions = debounce((items: AttributionKey[]) => {
		const newAttributions = items
			.map((item) => {
				const atl = attributionMap.get(item);
				if (atl) return atl; // `atl` が存在する場合のみ `name` を返す
				return undefined; // 明示的に `undefined` を返す（型推論のため）
			})
			.filter((atl): atl is Attribution => atl !== undefined); // `undefined` を除外

		if (newAttributions.length > 0) {
			attributions = newAttributions;
		}
	}, 100);

	// 基本的な関数
	const extractUniqueKeys = (data: { id: string; key: string }[]): AttributionKey[] => {
		return [...new Set(data.map((item) => item.key))] as AttributionKey[];
	};

	layerAttributions.subscribe((items) => {
		console.log('Attributions updated:', items);

		updateAttributions(extractUniqueKeys(items));
	});

	// layerAttributions.subscribe((layerAttributions) => {
	// 	const newAttributions = layerAttributions
	// 		.map((attribution) => {
	// 			const atl = attributionMap.get(attribution.key);
	// 			if (atl) return atl; // `atl` が存在する場合のみ `name` を返す
	// 			return undefined; // 明示的に `undefined` を返す（型推論のため）
	// 		})
	// 		.filter((atl): atl is Attribution => atl !== undefined); // `undefined` を除外

	// 	if (newAttributions.length > 0) {
	// 		attributions = newAttributions;
	// 	}

	// 	console.log('Attributions updated:', attributions);
	// });
</script>

{#if attributions}
	<div
		class="pointer-events-none absolute bottom-[4px] right-0 z-10 flex w-full shrink-0 justify-end gap-2 text-nowrap px-2 text-white"
	>
		<div class="flex gap-2">
			{#each attributions as atl}
				<a
					class="pointer-events-auto grid grow cursor-pointer select-none place-items-center rounded-full text-xs"
					href={atl.url}
					target="_blank"
					rel="noopener noreferrer"
					><span>{atl.name}</span>
				</a>
			{/each}
		</div>
		<span class="grid place-items-center rounded-full">
			<Icon icon="lets-icons:info-alt-fill" class="h-6 w-6" />
		</span>
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
