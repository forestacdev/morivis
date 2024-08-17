<script lang="ts">
	import { goto } from '$app/navigation';
	import { signInWithPopup } from 'firebase/auth';
	import { auth, provider } from '$lib/firebase';
	import { authStore } from '$lib/store/store';

	async function handleLoginWithGoogle() {
		await signInWithPopup(auth, provider)
			.then((res) => {
				authStore.set({ ...$authStore, loggedIn: true, user: res.user });
				goto('/admin');
			})
			.catch((e) => {
				console.log(e);
			});
	}
</script>

<div>
	<button type="button" on:click={handleLoginWithGoogle}> Sign In with Google </button>
</div>

<style>
</style>
