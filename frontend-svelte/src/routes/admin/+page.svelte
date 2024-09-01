<script>
	import { goto } from '$app/navigation';
	import { signInWithPopup } from 'firebase/auth';
	import { auth, provider } from '$lib/firebase';
	import { authStore } from '$lib/store/store';
	import Map from '$lib/components/map/Map.svelte';
	import Logo from '$lib/components/Logo.svelte';
</script>

{#if $authStore.loggedIn}
	<div class="app flex h-screen flex-col text-white">
		<Map />
		<Logo />
	</div>
{/if}

<style>
</style>
