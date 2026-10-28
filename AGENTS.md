<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- The app uses the school's own external Supabase project (client in src/integrations/supabase/client.ts); schema changes live in supabase/migrations and must be applied by the owner in their Supabase SQL editor, since Lovable cannot run them there.
- Student enrollment lists use the shared React Query cache in src/hooks/useMatriculasQuery.ts with optimistic mutations and A-Z sorting via src/lib/studentOrder.ts; why: instant, consistent ordering after insert/edit/delete. Database SQL for the external project is kept in docs/sql and applied by the owner.
- Start independent dashboard reads concurrently, count paginated school data only on its first page, and resolve missing class links only when needed; why: avoid serial network waits and redundant database work ; school-data reads (src/lib/schoolData selectAll) share one request for a few seconds, then serve the previous result instantly while refreshing in the background for a few minutes, cleared on sign-in/out and after saves so accounts never see each other's data; React Query defaults to a 60s staleTime with no refetch on window focus.
- Session user, role and student-link checks are shared per signed-in user (src/hooks/useAuth, useUserRole, useAutoVinculo) and cleared on sign-out; why: every guard/header/layout used to repeat the same reads on each page change.
- Never store images or large values in auth user metadata (signUp options.data / updateUser); why: metadata is copied into the session token sent with every request, and an oversized token makes the database reject all requests.
