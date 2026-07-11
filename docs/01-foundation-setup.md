# Step 1: Foundation — Next.js App + Supabase Project + Google OAuth Login

**Goal by the end of this step:** A running Next.js app where a user can click "Sign in with Google" and land on a logged-in dashboard page, with their session persisted.

---

## 1.1 Create the Next.js project

```bash
npx create-next-app@latest agentlab
```

When prompted, choose:
- TypeScript: **Yes**
- ESLint: **Yes**
- Tailwind CSS: **Yes**
- App Router: **Yes**
- `src/` directory: **Yes** (keeps things tidy)

```bash
cd agentlab
```

---

## 1.2 Create the Supabase project

1. Go to https://supabase.com → New Project.
2. Pick a name (e.g., `agentlab`), a strong DB password (save it somewhere safe), and the region closest to your users.
3. Wait for provisioning (~2 minutes).
4. From **Project Settings → API**, copy:
   - `Project URL`
   - `anon public` key
   - `service_role` key (keep this secret — server-side only, never expose to the browser)

---

## 1.3 Install Supabase client libraries

```bash
npm install @supabase/supabase-js @supabase/ssr
```

`@supabase/ssr` is the officially recommended package for using Supabase Auth correctly in Next.js App Router (handles cookies for server components).

---

## 1.4 Environment variables

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Add `.env.local` to `.gitignore` (Next.js does this by default, but double-check).

---

## 1.5 Supabase client helpers

Create `src/lib/supabase/client.ts` (for use in Client Components):

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

Create `src/lib/supabase/server.ts` (for use in Server Components / Route Handlers):

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — safe to ignore
            // if you have middleware refreshing sessions.
          }
        },
      },
    }
  )
}
```

---

## 1.6 Middleware to keep sessions fresh

Create `src/middleware.ts`:

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refreshes the session if expired
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

## 1.7 Set up Google OAuth credentials

1. Go to https://console.cloud.google.com → create a new project (or use an existing one).
2. Navigate to **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
3. Application type: **Web application**.
4. Under **Authorized redirect URIs**, add your Supabase callback URL:
   ```
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```
5. Copy the generated **Client ID** and **Client Secret**.

---

## 1.8 Enable Google provider in Supabase

1. In Supabase dashboard → **Authentication → Providers → Google**.
2. Toggle it on, paste in the **Client ID** and **Client Secret** from step 1.7.
3. Save.

---

## 1.9 Login button (Client Component)

Create `src/app/login/page.tsx`:

```tsx
'use client'

import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <button
        onClick={handleGoogleLogin}
        className="rounded-lg bg-black px-6 py-3 text-white"
      >
        Sign in with Google
      </button>
    </div>
  )
}
```

---

## 1.10 OAuth callback route

Create `src/app/auth/callback/route.ts`:

```ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
```

---

## 1.11 Protected dashboard page

Create `src/app/dashboard/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Welcome, {user.email}</h1>
      <p>You are logged in via Google OAuth.</p>
    </div>
  )
}
```

---

## 1.12 Auto-create a profile row on first login

In Supabase SQL Editor, create a trigger so every new `auth.users` row automatically gets a matching `profiles` row (the `profiles` table itself is created in Step 2):

```sql
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

Run this **after** creating the `profiles` table in Step 2.

---

## 1.13 Test it

```bash
npm run dev
```

Visit `http://localhost:3000/login`, click "Sign in with Google," complete the Google consent screen, and confirm you land on `/dashboard` showing your email.

---

## Checklist before moving to Step 2
- [ ] Next.js app runs locally
- [ ] Supabase project created, keys in `.env.local`
- [ ] Google OAuth client created, redirect URI set to Supabase callback
- [ ] Google provider enabled in Supabase
- [ ] Login → callback → dashboard flow works end-to-end
- [ ] Session persists on page refresh (thanks to middleware)
