<script>
	import GoMapButton from './GoMapButton.svelte';
	const click = () => {
		window.location.href = '/map';
	};
</script>

<div class="app relative flex h-screen w-screen">
	<div class="h-[480px]">
		<GoMapButton href="/map" />
	</div>
</div>

<style>
</style>
