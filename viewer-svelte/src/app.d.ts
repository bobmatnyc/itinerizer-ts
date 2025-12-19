// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

import type { Services } from './hooks.server';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			services: Services;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
