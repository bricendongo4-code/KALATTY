# Password recovery rollout requirements

The reset endpoint now verifies a Supabase OTP with `type: 'recovery'`. A generic session access token is rejected. The frontend reads `token_hash` and `type=recovery` from the reset URL query string, not `access_token` from a session URL fragment.

**Before merging or deploying**, configure the Supabase **Reset Password email template** to link to the application with a recovery token hash. Example template destination (replace the hostname with the actual frontend origin):

`https://YOUR-FRONTEND-HOST/reset-password?token_hash={{ .TokenHash }}&type=recovery`

Ensure the Supabase redirect allowlist and the deployed frontend origin match. Verify the actual template rendering and one-time expiry semantics in a staging environment. The previous implicit session-fragment link will no longer work with this revised flow.

Also confirm the Railway backend has `SUPABASE_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`; the auth client no longer accepts a service-role fallback.

Required staging acceptance checks:
1. An ordinary signed-in session access token must not authorize password reset.
2. A valid emailed recovery link changes the password once.
3. Reusing an expired or consumed recovery token fails.
4. An invalid recovery link displays an actionable error.
5. A new login succeeds with the new password.

No Supabase dashboard or Railway settings were changed by this commit. Do not merge/deploy before these checks.
