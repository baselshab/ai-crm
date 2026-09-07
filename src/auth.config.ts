import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const protectedRoutes = [
        "/dashboard",
        "/leads",
        "/contacts",
        "/pipeline",
        "/tasks",
        "/notes",
      ];
      const authRoutes = ["/login", "/register"];

      const isProtectedRoute = protectedRoutes.some((route) =>
        nextUrl.pathname.startsWith(route)
      );
      const isAuthRoute = authRoutes.some((route) =>
        nextUrl.pathname.startsWith(route)
      );

      if (isProtectedRoute) {
        if (isLoggedIn) return true;
        return false; // Redirects to /login
      } else if (isAuthRoute) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
        return true;
      }
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
