<script lang="ts">
	let name = $state('');
</script>

<div class="border-2 border-dashed bg-indigo-500 bg-red-500 p-4 text-end">
	<input bind:value={name} />
	<p>こんにちは、{name}</p>
</div>

