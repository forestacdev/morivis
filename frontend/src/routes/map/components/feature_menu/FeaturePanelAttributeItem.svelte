<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade } from 'svelte/transition';

	import { formatFieldValue } from '$routes/map/data/types/vector/properties';
	import type { FieldDef } from '$routes/map/data/types/vector/properties';
	import { checkPc } from '$routes/map/utils/platform/viewport';
	import { showNotification } from '$routes/stores/notification';

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

<div class="bg-sub flex flex-col items-start justify-center overflow-hidden rounded">
	<div
		class="flex w-full items-center justify-start gap-1 bg-linear-[to_right,var(--color-main-accent),var(--color-main)] px-2 py-1"
	>
		<span class="text-base text-sm">{field && field.label ? field.label : key}</span>
	</div>
	<div class="w-full lg:pr-2">
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
			class="relative flex w-full cursor-pointer items-center justify-between rounded-md p-2 pl-3 text-left text-base transition-colors duration-150"
		>
			<span class="min-w-0 break-all">{formattedValue}</span>
			{#if isHover}
				<div transition:fade={{ duration: 100 }} class="absolute right-0 grid place-items-center">
					<Icon icon="majesticons:clipboard-line" class="mr-2 h-6 w-6 shrink-0 text-base" />
				</div>
			{/if}
		</button>
	</div>
</div>
