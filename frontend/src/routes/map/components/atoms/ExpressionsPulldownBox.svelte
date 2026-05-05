<script lang="ts">
	import ColorExpressionsOption from '$routes/map/components/layer_style_menu/extension_menu/ColorExpressionsOption.svelte';
	import NumberExpressionsOption from '$routes/map/components/layer_style_menu/extension_menu/NumberExpressionsOption.svelte';
	import PulldownSelectBox from '$routes/map/components/atoms/PulldownSelectBox.svelte';
	import type {
		ColorsExpression,
		NumbersExpression,
		ColorsStyle,
		NumbersStyle,
		ExpressionType,
		RawExpression,
		VectorLayerType
	} from '$routes/map/data/types/vector/style';
	import { getIconStyle } from '$routes/map/utils/style/mapping-icon';

	interface Props {
		style: ColorsStyle | NumbersStyle;
		expressionType: ExpressionType;
		layerType?: VectorLayerType;
	}
	let { style = $bindable(), expressionType, layerType }: Props = $props();

	// セットされた式の設定
	let setExpression: ColorsExpression | NumbersExpression | RawExpression | undefined = $derived.by(
		() => {
			const target = style.expressions.find((color) => color.key === style.key);
			if (!target) return;
			return target;
		}
	);

	// 式のリスト
	let expressionsList = $derived.by(() => {
		return style.expressions;
	});
	let expressionItems = $derived.by(() => {
		return expressionsList.map((expression) => ({
			key: expression.key,
			name: expression.name,
			icon: getIconStyle(expression.type, expressionType)
		}));
	});
</script>

{#if setExpression}
	<PulldownSelectBox items={expressionItems} bind:selectedKey={style.key}>
		{#snippet children()}
		{#if expressionType === 'color'}
			<ColorExpressionsOption bind:setExpression={setExpression as ColorsExpression} {layerType} />
		{/if}
		{#if expressionType === 'number'}
			<NumberExpressionsOption bind:setExpression={setExpression as NumbersExpression} />
		{/if}
		{/snippet}
	</PulldownSelectBox>
{/if}

<style>
</style>
