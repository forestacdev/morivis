<script lang="ts">
	import { page } from '$app/state';

	// トップページへのリダイレクト
	if (import.meta.env.MODE === 'production') {
		window.location.href = '/morivis';
	}

	if (import.meta.env.MODE === 'mobile') {
		window.location.href = '/';
	}
</script>

<h3>Requested page path is {page.url.pathname}</h3>
