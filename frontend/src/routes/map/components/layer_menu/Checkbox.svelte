<script lang="ts">
	import Icon from '@iconify/svelte';

	interface Props {
		label: string;
		value: boolean;
		icon?: string;
		disabled?: boolean; // 追加: チェックボックスを無効化するためのプロパティ
	}
	let { label, value = $bindable(), icon, disabled }: Props = $props();
</script>

<label
	class="flex w-full shrink-0 cursor-pointer items-center justify-start gap-2 select-none {disabled
		? 'cursor-not-allowed opacity-50'
		: ''}"
>
	<span
		class="block aspect-square h-4 rounded-sm border-1 {value
			? ' bg-accent border-accent'
			: 'border-base/80'}"
	></span>
	<input type="checkbox" class="hidden" bind:checked={value} {disabled} />
	<span>{label}</span>
</label>

<style>
</style>
