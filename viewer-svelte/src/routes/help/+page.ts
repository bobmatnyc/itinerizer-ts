import { redirect } from '@sveltejs/kit';

export function load() {
  // Redirect to itineraries page with help mode
  throw redirect(307, '/itineraries?mode=help');
}
