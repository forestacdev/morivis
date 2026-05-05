<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade, scale } from 'svelte/transition';

	import { ICONS } from '$lib/icons';
	import { getMorivisContributors, type GitHubContributor } from '$routes/map/api/github';
	import { entries } from '$routes/map/data/entries';
	import { getAttribution } from '$routes/map/data/entries/_meta_data/_attribution';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { showInfoDialog } from '$routes/stores/ui';

	interface DataProviderItem {
		key: string;
		name: string;
		url: string;
		datasets: {
			name: string;
			downloadUrl?: string;
		}[];
	}

	let contributors = $state<GitHubContributor[]>([]);
	let isLoadingContributors = $state(false);
	let contributorsLoaded = $state(false);
	let contributorsError = $state<string | null>(null);

	const dataProviders = (() => {
		const providerMap = new Map<string, DataProviderItem>();

		entries.forEach((entry: GeoDataEntry) => {
			if (entry.metaData.isUserUploaded) return;

			const attribution = getAttribution(entry.metaData.attribution);
			if (!attribution) return;

			const providerKey = `${entry.metaData.attribution}`;
			const currentProvider = providerMap.get(providerKey);
			const datasetName = entry.metaData.sourceDataName ?? entry.metaData.name;
			const dataset = {
				name: datasetName,
				downloadUrl: entry.metaData.downloadUrl
			};

			if (currentProvider) {
				if (
					!currentProvider.datasets.some((currentDataset) => currentDataset.name === datasetName)
				) {
					currentProvider.datasets.push(dataset);
				}
				return;
			}

			providerMap.set(providerKey, {
				key: providerKey,
				name: attribution.name,
				url: attribution.url,
				datasets: [dataset]
			});
		});

		return Array.from(providerMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'ja'));
	})();

	const loadContributors = async () => {
		if (isLoadingContributors || contributorsLoaded) return;

		isLoadingContributors = true;
		contributorsError = null;

		try {
			const result = await getMorivisContributors({ perPage: 20 });
			contributors = result.filter((contributor) => contributor.type !== 'Bot');
			contributorsLoaded = true;
		} catch (error) {
			contributorsError = error instanceof Error ? error.message : 'Failed to load contributors';
		} finally {
			isLoadingContributors = false;
		}
	};

	$effect(() => {
		if (!$showInfoDialog) return;
		void loadContributors();
	});
</script>

{#if $showInfoDialog}
	<div
		transition:fade={{ duration: 150 }}
		class="fixed bottom-0 z-30 flex h-dvh w-full items-center justify-center bg-black/50"
		style="padding-top: env(safe-area-inset-top);"
	>
		<div
			transition:scale={{ duration: 300, start: 0.9 }}
			class="bg-opacity-8 bg-main flex max-h-[600px] max-w-[800px] grow flex-col rounded-md p-4 text-base"
		>
			<div class="flex shrink-0 items-center justify-between pb-4">
				<span class="text-2xl font-bold">morivis（モリビス） について</span>
				<button
					onclick={() => showInfoDialog.set(false)}
					class="bg-base cursor-pointer rounded-full p-2"
				>
					<Icon icon={ICONS.close} class="text-main h-4 w-4" />
				</button>
			</div>
			<div class="flex-flex-col c-scroll overflow-x-hidden overflow-y-auto pr-2">
				<div class="pb-6">
					<div class="flex flex-col gap-1 text-justify">
						<span>
							morivis（モリビス）は、岐阜県立森林文化アカデミー演習林の森林地理情報をWebGIS上で表示するシステムです。演習林の地形、植生、林道などの基本情報を地図上で確認できるほか、全国の森林オープンデータも閲覧可能です。
						</span>
						<span
							>森林情報の可視化と共有を目的とした研究開発の一環として作成しており、現在も機能の追加や改善を継続しています。バグなどを見つけた場合は、お手数ですが<a
								class="text-accent"
								href="https://github.com/forestacdev/morivis/issues"
								target="_blank"
								rel="noopener noreferrer">GitHubのイシュー</a
							>にてご報告ください。</span
						>
					</div>
				</div>
				<div class="pb-6">
					<div class="pb-4 text-lg font-bold">Contributors / コントリビューターの皆さま</div>
					<div class="flex w-full justify-center">
						<div class="grid max-w-[600px] gap-4 max-lg:grid-cols-1 lg:grid-cols-2">
							{#if isLoadingContributors}
								<div
									class="rounded-full border-1 border-gray-500 bg-black p-3 text-sm text-gray-200"
								>
									コントリビューター情報を読み込み中です。
								</div>
							{:else if contributorsError}
								<div class="rounded-md border-1 border-gray-500 bg-black p-3 text-sm text-gray-200">
									コントリビューター情報を取得できませんでした。
								</div>
							{:else}
								{#each contributors as contributor (contributor.id)}
									<a
										class="lg:hover:bg-accent flex cursor-pointer items-center justify-start gap-2 rounded-full border-1 border-gray-500 bg-black p-2 transition-colors lg:hover:text-white"
										href={contributor.html_url}
										target="_blank"
										rel="noopener noreferrer"
									>
										<div
											class="relative grid h-[50px] w-[50px] place-items-center overflow-hidden rounded-full bg-gray-500"
										>
											<img
												class="c-no-drag-icon absolute block h-full w-full rounded-full object-cover"
												src={contributor.avatar_url}
												alt={`${contributor.login}'s Avatar`}
											/>
										</div>
										<div class="flex flex-col">
											<span>@{contributor.login}</span>
											<span class="text-sm text-gray-400"
												>{contributor.contributions} contributions</span
											>
										</div>
									</a>
								{/each}
							{/if}
							<a
								class="lg:hover:bg-main-accent flex cursor-pointer items-center justify-start gap-2 rounded-full border-1 border-gray-500 bg-black p-2 transition-colors lg:hover:text-white"
								href="https://www.forest.ac.jp/"
								target="_blank"
								rel="noopener noreferrer"
							>
								<div
									class="relative grid h-[50px] w-[50px] cursor-pointer place-items-center overflow-hidden rounded-full bg-gray-500"
								>
									<img
										class="pointer-events-none absolute block h-full w-full rounded-full object-cover"
										src="./images/fac_icon.webp"
										alt="岐阜県立森林文化アカデミー"
									/>
								</div>
								<div class="flex flex-col">
									<span>岐阜県立森林文化アカデミー</span>
									<span class="text-sm text-gray-400">データ提供・協力</span>
								</div>
							</a>
						</div>
					</div>
				</div>
				<div class="pb-6">
					<div class="pb-4 text-lg font-bold">Data Sources / 利用データ</div>

					<div class="flex flex-col gap-2">
						{#each dataProviders as provider (provider.key)}
							<div class="bg-sub rounded-md p-3">
								<div class="">
									<div class="flex items-center justify-between gap-4">
										<div class="min-w-0">
											<div class="truncate font-bold">{provider.name}</div>
											<!-- <div class="text-sm text-gray-400">
												{provider.datasets.length}件のデータを利用
											</div> -->
										</div>
										{#if provider.url}
											<a
												class="bg-main-accent shrink-0 rounded-full p-2 px-3 text-base text-sm"
												href={provider.url}
												target="_blank"
												rel="noopener noreferrer"
												onclick={(event) => event.stopPropagation()}
											>
												提供元
											</a>
										{/if}
									</div>
								</div>

								<div class="mt-3 flex flex-col gap-1 text-sm text-gray-200">
									{#each provider.datasets as dataset}
										{#if dataset.downloadUrl}
											<a
												class="self-start underline underline-offset-2"
												href={dataset.downloadUrl}
												target="_blank"
												rel="noopener noreferrer"
											>
												{dataset.name}
											</a>
										{:else}
											<div>{dataset.name}</div>
										{/if}
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
</style>
