import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/registro', '/recuperar-senha', '/redefinir-senha', '/auth'];

export async function middleware(request: NextRequest) {
  // Se as variáveis de ambiente não estiverem configuradas, deixa passar
  // (evita crash em preview deployments sem env vars)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request: { headers: request.headers } });
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { pathname } = request.nextUrl;
  const isPublicRoute = PUBLIC_ROUTES.some(r => pathname.startsWith(r));

  try {
    // Usa getSession() com race contra timeout de 1s para não travar o middleware
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<{ data: { session: null } }>(resolve =>
      setTimeout(() => resolve({ data: { session: null } }), 1000)
    );

    const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);

    // Redirect unauthenticated users to login
    if (!session && !isPublicRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      const rawRedirect = pathname;
      if (rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')) {
        url.searchParams.set('redirect', rawRedirect);
      }
      return NextResponse.redirect(url);
    }

    // Redirect authenticated users away from auth pages
    if (session && isPublicRoute && !pathname.startsWith('/auth')) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  } catch {
    // Em caso de erro (Supabase offline, etc.), deixa passar para a rota
    // O layout server-side fará a verificação real de autenticação
    if (!isPublicRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
