<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade } from 'svelte/transition';

	import { checkPc } from '$routes/map/utils/ui';
	import { showNotification } from '$routes/stores/notification';

	import { formatFieldValue } from '$routes/map/data/types/vector/properties';
	import type { FieldDef } from '$routes/map/data/types/vector/properties';

	interface Props {
		key: string;
		value: string | number | true;
		field: FieldDef | undefined;
	}

	let { key, value, field }: Props = $props();

	let isHover = $state<boolean>(false);
	let formattedValue = $derived.by(() => formatFieldValue(value, field));

	// クリップボードにコピー
	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text);
		showNotification(`クリップボードに ${text} をコピーしました`, 'info');
	};
</script>

<div class="flex flex-col items-start justify-center">
	<div class="flex items-center justify-center gap-1">
		<span class="text-base text-sm">{field && field.label ? field.label : key}</span>
	</div>
	<div class="w-full pt-2 lg:pr-2">
		<button
			onclick={() => {
				if (checkPc()) copyToClipboard(formattedValue);
			}}
			onmouseover={() => {
				if (checkPc()) isHover = true;
			}}
			onmouseleave={() => {
				if (checkPc()) isHover = false;
			}}
			onfocus={() => {
				if (checkPc()) isHover = true;
			}}
			onblur={() => {
				if (checkPc()) isHover = false;
			}}
			class="text-accent relative flex w-full cursor-pointer items-center justify-between rounded-md bg-black p-2 pl-4 text-left transition-colors duration-150"
			><span class="">{formattedValue}</span>
			{#if isHover}
				<div transition:fade={{ duration: 100 }} class="absolute right-0 grid place-items-center">
					<Icon icon="majesticons:clipboard-line" class="mr-2 h-6 w-6 shrink-0 text-base" />
				</div>
			{/if}
		</button>
	</div>
</div>
