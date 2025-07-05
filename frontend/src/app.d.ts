// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

// モジュールの型定義を追加
declare module 'path';
declare module '@zumer/orbit/dist/orbit.js';
declare module 'shapefile';

declare module 'virtual:pwa-info' {
	export interface PWAInfo {
		pwaInDevEnvironment: boolean;
		webManifest: {
			href: string;
			useCredentials: boolean;
			linkTag: string;
		};
	}

	export const pwaInfo: PWAInfo | undefined;
}

export {};
