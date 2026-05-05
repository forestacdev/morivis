<script lang="ts">
	import PulldownSelectBox from '$routes/map/components/atoms/PulldownSelectBox.svelte';
	import type { LabelsExpressions, Labels } from '$routes/map/data/types/vector/style';

	interface Props {
		labels: Labels;
		icon: string;
	}
	let { labels = $bindable(), icon }: Props = $props();

	// セットされた式の設定
	let setLabel = $derived.by(() => {
		const target = labels.expressions.find((label) => label.key === labels.key);
		if (!target) return;
		return target;
	});

	// 式のリスト
	let labelsList = $derived.by(() => {
		return labels.expressions;
	});
	let labelItems = $derived.by(() => {
		return labelsList.map((label) => ({
			key: label.key,
			name: label.name,
			icon
		}));
	});
</script>

{#if setLabel}
	<PulldownSelectBox items={labelItems} bind:selectedKey={labels.key} />
{/if}

<style>
</style>
