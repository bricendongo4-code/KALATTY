# Security deployment prerequisite

The proposed Supabase authentication hardening now requires a public or publishable key at backend startup.

Before merging or deploying, verify the Railway backend environment contains either:
- SUPABASE_KEY
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

Do not put SUPABASE_SERVICE_ROLE_KEY in a public variable or frontend bundle.

If neither public key is present, backend startup will intentionally fail rather than initialize its authentication client with a privileged key. This is a proposed branch-only change; no production configuration has been verified or modified.

The password recovery flow still needs an independent security review and a purpose-bound token protocol before it can be considered secure.
