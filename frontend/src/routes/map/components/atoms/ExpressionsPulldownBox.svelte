<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fly } from 'svelte/transition';

	import ColorExpressionsOption from '$routes/map/components/layer_style_menu/extension_menu/ColorExpressionsOption.svelte';
	import NumberExpressionsOption from '$routes/map/components/layer_style_menu/extension_menu/NumberExpressionsOption.svelte';
	import type {
		ColorsExpression,
		NumbersExpression,
		ColorsStyle,
		NumbersStyle,
		ExpressionType,
		RawExpression
	} from '$routes/map/data/types/vector/style';
	import { getIconStyle } from '$routes/map/utils/ui';

	interface Props {
		style: ColorsStyle | NumbersStyle;
		expressionType: ExpressionType;
	}
	let { style = $bindable(), expressionType }: Props = $props();
	let showPullDown = $state<boolean>(false);

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

	let containerRef = $state<HTMLElement>();

	$effect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (showPullDown && containerRef && !containerRef.contains(event.target as Node)) {
				showPullDown = false;
			}
		};

		if (showPullDown) {
			document.addEventListener('click', handleClickOutside);
		}

		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});
</script>

{#if setExpression}
	<div bind:this={containerRef} class="relative py-2">
		<button
			onclick={() => (showPullDown = !showPullDown)}
			class="c-select flex w-full justify-between"
		>
			<div class="flex items-center gap-2">
				<Icon icon={getIconStyle(setExpression.type, expressionType)} width={20} />

				<span> {expressionsList.find((exp) => exp.key === style.key)?.name}</span>
			</div>
			<Icon icon="iconamoon:arrow-down-2-duotone" class="h-7 w-7" />
		</button>
		{#if showPullDown}
			<div
				transition:fly={{ duration: 200, y: -20 }}
				class="bg-sub c-scroll-sub absolute top-[60px] left-0 z-10 max-h-60 w-full divide-y divide-gray-400 overflow-hidden overflow-y-auto rounded-lg shadow-md"
			>
				{#each expressionsList as expressionItem (expressionItem.key)}
					<label
						class="flex w-full cursor-pointer items-center justify-between gap-2 p-2 transition-colors duration-100 {expressionItem.key ===
						style.key
							? 'bg-base text-main'
							: 'hover:text-accent text-white'}"
					>
						<input
							type="radio"
							bind:group={style.key}
							value={expressionItem.key}
							class="hidden"
							onchange={() => (showPullDown = false)}
						/>
						<div class="flex items-center gap-2">
							<Icon icon={getIconStyle(expressionItem.type, expressionType)} width={20} />
							<span class="select-none">{expressionItem.name}</span>
						</div>
					</label>
				{/each}
			</div>
		{/if}
	</div>
	<!-- 色分け選択 -->
	<div class="flex grow flex-col gap-2 overflow-visible pt-2">
		{#if expressionType === 'color'}
			<ColorExpressionsOption bind:setExpression={setExpression as ColorsExpression} />
		{/if}
		{#if expressionType === 'number'}
			<NumberExpressionsOption bind:setExpression={setExpression as NumbersExpression} />
		{/if}
	</div>
{/if}

<style>
</style>
