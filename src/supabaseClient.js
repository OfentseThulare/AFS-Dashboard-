import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseMissing = !supabaseUrl || !supabaseKey

// Create a real client or a no-op placeholder so the app always renders
export const supabase = supabaseMissing
  ? createNoopClient()
  : createClient(supabaseUrl, supabaseKey)

function createNoopClient() {
  console.warn('Missing Supabase environment variables. Running in offline mode.')
  const noopError = { data: null, error: { message: 'Supabase not configured — please check your environment variables.' } }
  const noop = () => Promise.resolve(noopError)
  const noopAuth = {
    getSession: () => Promise.resolve({ data: { session: null } }),
    signInWithPassword: noop,
    signOut: () => Promise.resolve({}),
  }
  // Every chainable method must return a thenable that resolves to { data, error }
  const noopChain = () => {
    const chain = {
      select: () => noop(),
      insert: () => noop(),
      update: () => noop(),
      delete: () => noop(),
      eq: () => chain,
      order: () => chain,
      limit: () => chain,
      single: () => noop(),
      then: (resolve) => noop().then(resolve),
    }
    return chain
  }
  const noopStorage = {
    from: () => ({
      upload: () => Promise.resolve(noopError),
      getPublicUrl: () => ({ data: { publicUrl: null } }),
    }),
  }
  return { from: noopChain, auth: noopAuth, storage: noopStorage }
}
