# Supabase setup for collection sync

The site is still static on GitHub Pages. Supabase would provide email sign-in and a database row per account. The collection JSON includes directory favorites, personal source details, notes and folders. The provider can read this JSON; this configuration does not encrypt it. No collection data is uploaded until account sync is explicitly enabled and the user signs in.

## Create the project

1. Create a Supabase account and a project. A free tier may be enough for a small personal collection; check the current limits and terms in Supabase before relying on it.
2. In the SQL editor, run [`schema.sql`](schema.sql). It creates a single JSON snapshot row per user and enables row-level security. The policy restricts reads and writes to the authenticated user whose ID matches `user_id`.
3. In Authentication settings, enable email OTP/magic-link sign-in and set the site's production URL and local test URL as allowed redirect URLs.
4. Keep the project URL and the publishable/anon key for the browser client. These are public client configuration values; row-level security is the protection boundary. Never put a `service_role` key in the website, source code, or Pages settings.

## Before enabling the website client

The account sync UI and client connection still need the project's URL and publishable/anon key. The chosen design stores provider-readable collection data and needs an explicit conflict rule for edits made on multiple devices. Existing JSON backup/export remains available as a separate recovery path. Do not upload real collection data until the project, email redirects and row-level policy have been tested with two separate accounts.
