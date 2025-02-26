import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { Actions } from './$types';

export const load: PageServerLoad = async ({ locals, parent }) => {
  const { user } = await parent();
  
  if (!user) {
    throw redirect(302, '/login');
  }

  return {
    tab: 'boltcard'
  };
};

export const actions: Actions = {
  default: async () => {
    // This is a no-op action that just returns success
    // All actual API calls are handled client-side
    return {
      success: true
    };
  }
}; 