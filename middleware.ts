import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/create(.*)",
  "/demo(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  // Pages + API routes that call auth()/currentUser(); missing /api/**/* caused
  // "auth() was called but Clerk can't detect clerkMiddleware()" on POST /api/gifts/create.
  matcher: [
    "/dashboard/:path*",
    "/create/:path*",
    "/demo/:path*",
    "/api/dashboard/:path*",
    "/api/demo/:path*",
    "/api/gifts/:path*",
  ],
};
