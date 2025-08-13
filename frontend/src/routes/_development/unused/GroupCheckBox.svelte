<script lang="ts">
	interface Props {
		label: string;
		value: string | number;
		group: (string | number)[];
	}

	let { label, value, group = $bindable() }: Props = $props();
</script>

<label class="flex grow cursor-pointer gap-2">
	<span>{label}</span>
	<input type="checkbox" class="custom-checkbox" bind:group {value} />
</label>
