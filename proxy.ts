// Next.js 16 renamed the `middleware` convention to `proxy`.
// Clerk's clerkMiddleware works here unchanged — it's the exported request handler.
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/practice(.*)",
  "/results(.*)",
  "/history(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpg|jpeg|gif|png|svg|ico|webp|woff2?|ttf|otf|map|txt)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
