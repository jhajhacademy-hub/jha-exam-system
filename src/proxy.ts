import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ADMIN_PREFIX = "/admin";
const ADMIN_ONLY_PREFIXES = ["/admin/questions", "/admin/logo", "/admin/users"];
const STUDENT_PREFIXES = ["/mypage", "/exam"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getClaims はトークンの署名をその場で検証するのでSupabaseへの通信が要らない(期限切れ時のみ更新通信)。
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub ?? null;

  const { pathname } = request.nextUrl;
  const isAdminPath = pathname.startsWith(ADMIN_PREFIX);
  const isAdminOnlyPath = ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p));
  const isStudentPath = STUDENT_PREFIXES.some((p) => pathname.startsWith(p));

  if (!userId && (isAdminPath || isStudentPath)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (userId && (isAdminPath || isStudentPath || pathname === "/login")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", userId)
      .single();

    if (profile?.status !== "active") {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      url.searchParams.set("error", "disabled");
      return NextResponse.redirect(url);
    }

    const isStaff = profile.role === "admin" || profile.role === "operator";

    if (isAdminPath && !isStaff) {
      const url = request.nextUrl.clone();
      url.pathname = "/mypage";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (isAdminOnlyPath && profile.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (pathname === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = isStaff ? "/admin/dashboard" : "/mypage";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
