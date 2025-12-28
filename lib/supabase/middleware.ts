import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Allow auth callback to complete without interference
  const isAuthCallback = request.nextUrl.pathname.startsWith('/auth/callback');
  if (isAuthCallback) {
    return supabaseResponse;
  }

  // Protected routes - redirect to login if not authenticated
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/app');
  
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('returnUrl', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from login page
  if (request.nextUrl.pathname === '/login' && user) {
    const returnUrl = request.nextUrl.searchParams.get('returnUrl') || '/app';
    const url = request.nextUrl.clone();
    url.pathname = returnUrl;
    url.searchParams.delete('returnUrl');
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

