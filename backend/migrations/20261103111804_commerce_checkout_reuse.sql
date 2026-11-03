alter table public.payments add column checkout_url text;
alter table public.payments add column checkout_channel text;
alter table public.institution_billing_payments add column checkout_url text;
alter table public.institution_billing_payments add column checkout_channel text;
-- Billing terms cannot be changed by direct Data API writes, including by institution admins.
-- Registration and all institution mutations already go through the authorized backend.
revoke insert,update,delete,truncate,references,trigger on public.institutions from anon,authenticated;
grant all on public.institutions to service_role;
