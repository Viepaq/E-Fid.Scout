import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Anon client — used only for session refresh / getUser()
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
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — do not add any logic between createServerClient and
  // getUser(), as it may cause hard-to-debug session issues.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Service-role client — edge-runtime compatible (@supabase/ssr), bypasses RLS.
  // Used for role checks in middleware where the anon+cookie client may fail
  // for seeded users whose JWT sub doesn't match the profile id due to RLS.
  const serviceClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    // No cookie handling needed — service role doesn't use session cookies
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  return { response: supabaseResponse, user, supabase, serviceClient };
}
