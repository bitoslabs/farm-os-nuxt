import { useSettings } from '~/composables/useSettings'

/**
 * Global auth guard.
 * - Requires a signed-in Nostr identity for every route except public ones.
 * - Redirects authenticated users away from /login & /register.
 * - Supports `?redirect=` to return the user after signing in.
 */
const PUBLIC_PATHS = new Set(['/login', '/register'])

export default defineNuxtRouteMiddleware((to) => {
  const { isLoggedIn } = useSettings()
  const isPublic = PUBLIC_PATHS.has(to.path) || to.meta.public === true

  // not signed in → go to login (remember where they were going)
  if (!isLoggedIn.value && !isPublic) {
    const redirect = encodeURIComponent(to.fullPath)
    return navigateTo(`/login?redirect=${redirect}`)
  }

  // already signed in → never show the auth pages
  if (isLoggedIn.value && PUBLIC_PATHS.has(to.path)) {
    return navigateTo('/')
  }
})
