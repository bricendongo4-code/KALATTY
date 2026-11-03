-- All monetary writes go through the backend service role. No client can approve or pay itself.
alter table public.payments add column if not exists verification_source text not null default 'legacy';
alter table public.payments add column if not exists verified_at timestamptz;
alter table public.payments add column if not exists provider_fee_fcfa bigint;
alter table public.payments enable row level security;
revoke insert,update,delete,truncate,references,trigger on public.payments from anon,authenticated;

create table public.commerce_settings (
 id boolean primary key default true check(id),
 withdrawal_min_fcfa bigint not null default 5000 check(withdrawal_min_fcfa between 500 and 700000),
 withdrawal_hold_days integer not null default 7 check(withdrawal_hold_days between 0 and 90),
 updated_by uuid references public.profiles(id), updated_at timestamptz not null default now()
);
insert into public.commerce_settings(id) values(true);
create table public.app_feedback (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),
 rating integer not null check(rating between 1 and 5),
 category text not null check(category in ('payment','bug','usability','course','suggestion','other')),
 body text not null check(char_length(body) between 10 and 3000),
 suggested_department text not null, routing_reason text not null,
 assigned_department text, status text not null default 'new' check(status in ('new','routed','in_progress','resolved')),
 decision_note text not null default '', proposal_id uuid references public.ai_agent_proposals(id),
 version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on public.app_feedback(user_id,created_at desc);
create index on public.app_feedback(status,created_at);
create table public.finance_expenses (
 id uuid primary key default gen_random_uuid(), created_by uuid not null references public.profiles(id),
 label text not null check(char_length(label) between 3 and 160),
 category text not null check(category in ('hosting','ai','payment_fees','marketing','operations','other')),
 amount_fcfa bigint not null check(amount_fcfa > 0), expense_date date not null,
 status text not null check(status in ('paid','planned')),reference text not null check(char_length(reference) between 3 and 250),
 voided_at timestamptz,voided_by uuid references public.profiles(id),void_reason text,
 created_at timestamptz not null default now()
);
create table public.teacher_payout_accounts (
 teacher_id uuid primary key references public.profiles(id),
 method text not null check(method in ('orange_money','mtn_momo')),
 phone text not null check(phone ~ '^2376[0-9]{8}$'),
 holder_name text not null check(char_length(holder_name) between 3 and 120),
 updated_at timestamptz not null default now()
);
create table public.teacher_payout_requests (
 id uuid primary key default gen_random_uuid(),teacher_id uuid not null references public.profiles(id),
 request_key uuid not null unique,amount_fcfa bigint not null check(amount_fcfa between 500 and 700000),
 method text not null check(method in ('orange_money','mtn_momo')),phone text not null,holder_name text not null,
 status text not null default 'requested' check(status in ('requested','approved','rejected','paid','unknown')),
 decision_note text not null default '',decided_by uuid references public.profiles(id),
 provider_reference text unique,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(status <> 'paid' or provider_reference is not null)
);
create index on public.teacher_payout_requests(teacher_id,status);
create table public.institution_billing_payments (
 id uuid primary key default gen_random_uuid(),institution_id uuid not null references public.institutions(id),
 user_id uuid not null references public.profiles(id),plan_name text not null check(plan_name in ('starter','growth','campus')),
 amount_fcfa bigint not null check(amount_fcfa > 0),max_students integer not null,max_rooms integer not null,
 duration_days integer not null default 30 check(duration_days = 30),
 status text not null default 'pending' check(status in ('pending','processing','failed','paid','refunded')),
 verification_source text not null default 'unverified',verified_at timestamptz,provider_fee_fcfa bigint,
 created_at timestamptz not null default now()
);
create index on public.institution_billing_payments(institution_id,created_at desc);
alter table public.institutions add column if not exists paid_until timestamptz;
create table public.commerce_events (
 id uuid primary key default gen_random_uuid(),table_name text not null,record_id text not null,
 operation text not null,old_record jsonb,new_record jsonb,created_at timestamptz not null default now()
);
create function public.audit_commerce_change() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
 insert into public.commerce_events(table_name,record_id,operation,old_record,new_record)
 values(tg_table_name,coalesce(to_jsonb(new)->>'id',to_jsonb(new)->>'teacher_id'),tg_op,
 case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
 return new;
end; $$;
revoke all on function public.audit_commerce_change() from public,anon,authenticated;
grant execute on function public.audit_commerce_change() to service_role;
do $$ declare t text; begin
 foreach t in array array['commerce_settings','app_feedback','finance_expenses','teacher_payout_accounts','teacher_payout_requests','institution_billing_payments','commerce_events'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on table public.%I from anon,authenticated',t);
 execute format('grant all on table public.%I to service_role',t);
 if t <> 'commerce_events' then
 execute format('create trigger audit_change after insert or update on public.%I for each row execute function public.audit_commerce_change()',t);
 end if;
 end loop;
end $$;

-- Owner-only service endpoint supplies the actor after live identity verification.
create function public.route_app_feedback(feedback_id uuid,actor uuid,expected_version integer,target_department text,note text)
returns public.app_feedback language plpgsql security invoker set search_path = '' as $$
declare f public.app_feedback;p uuid;
begin
 if target_department not in ('support','finance','developer','ux','product','security','qa','marketing','sales','analytics','crm') then raise exception 'Invalid department'; end if;
 select * into f from public.app_feedback where id=feedback_id for update;
 if not found or f.version<>expected_version then raise exception 'Feedback changed; reload'; end if;
 if f.proposal_id is not null then raise exception 'Feedback already routed'; end if;
 insert into public.ai_agent_proposals(department,title,rationale,status,created_by,source_key,evidence)
 values(target_department,'Avis utilisateur à examiner',left(note,500),'pending',actor,'feedback:'||f.id::text,
 jsonb_build_object('feedbackId',f.id,'rating',f.rating,'category',f.category,'requiresFeedbackReview',true)) returning id into p;
 update public.app_feedback set assigned_department=target_department,status='routed',decision_note=note,
 proposal_id=p,version=version+1,updated_at=now() where id=f.id returning * into f;
 return f;
end; $$;

create function public.teacher_wallet(teacher uuid) returns jsonb language sql security invoker set search_path = '' as $$
 with earnings as (
 select coalesce(sum(teacher_earning_fcfa) filter(where status='paid' and verification_source='cinetpay'),0) total,
 coalesce(sum(teacher_earning_fcfa) filter(where status='paid' and verification_source='cinetpay'
 and verified_at <= now()-make_interval(days=>(select withdrawal_hold_days from public.commerce_settings where id))),0) eligible
 from public.payments where teacher_id=teacher), reservations as (
 select coalesce(sum(amount_fcfa) filter(where status in ('requested','approved','unknown')),0) reserved,
 coalesce(sum(amount_fcfa) filter(where status='paid'),0) withdrawn from public.teacher_payout_requests where teacher_id=teacher)
 select jsonb_build_object('confirmedEarningsFcfa',total,'eligibleFcfa',eligible,'reservedFcfa',reserved,'withdrawnFcfa',withdrawn,
 'availableFcfa',greatest(eligible-reserved-withdrawn,0),'heldFcfa',greatest(total-eligible,0),
 'minimumFcfa',(select withdrawal_min_fcfa from public.commerce_settings where id),
 'holdDays',(select withdrawal_hold_days from public.commerce_settings where id),
 'payoutConnected',false) from earnings,reservations;
$$;
create function public.request_teacher_payout(teacher uuid,requested_amount bigint,idempotency_key uuid)
returns public.teacher_payout_requests language plpgsql security invoker set search_path = '' as $$
declare a public.teacher_payout_accounts;r public.teacher_payout_requests;w jsonb;
begin
 -- Every concurrent request for a teacher shares this lock, including duplicate keys.
 perform 1 from public.profiles where id=teacher and role='teacher' for update;
 if not found then raise exception 'Teacher required'; end if;
 select * into r from public.teacher_payout_requests where request_key=idempotency_key;
 if found then
 if r.teacher_id<>teacher or r.amount_fcfa<>requested_amount then raise exception 'Idempotency conflict'; end if;
 return r; end if;
 select * into a from public.teacher_payout_accounts where teacher_id=teacher;
 if not found then raise exception 'Payout account required'; end if;
 w:=public.teacher_wallet(teacher);
 if requested_amount < (w->>'minimumFcfa')::bigint or requested_amount > (w->>'availableFcfa')::bigint or requested_amount>700000 then
 raise exception 'Insufficient available funds or minimum not reached'; end if;
 insert into public.teacher_payout_requests(teacher_id,request_key,amount_fcfa,method,phone,holder_name)
 values(teacher,idempotency_key,requested_amount,a.method,a.phone,a.holder_name) returning * into r;
 return r;
end; $$;

-- Verified server-to-server result only. Row lock makes duplicate webhooks harmless.
create function public.confirm_institution_payment(payment uuid) returns void language plpgsql security invoker set search_path = '' as $$
declare p public.institution_billing_payments;
begin
 select * into p from public.institution_billing_payments where id=payment for update;
 if not found then raise exception 'Payment not found'; end if;
 if p.status='paid' then return; end if;
 if p.status='refunded' then raise exception 'Refunded payment'; end if;
 update public.institution_billing_payments set status='paid',verification_source='cinetpay',verified_at=now() where id=p.id;
 update public.institutions set plan_name=p.plan_name,subscription_status='active',max_students=p.max_students,max_rooms=p.max_rooms,
 paid_until=greatest(coalesce(paid_until,now()),now())+make_interval(days=>p.duration_days),updated_at=now(),is_active=true
 where id=p.institution_id;
end; $$;
create function public.finance_totals(date_from timestamptz,date_to timestamptz) returns jsonb language sql security invoker set search_path = '' as $$
 with p as (select * from public.payments where verification_source='cinetpay' and status='paid' and verified_at>=date_from and verified_at<date_to),
 i as (select * from public.institution_billing_payments where verification_source='cinetpay' and status='paid' and verified_at>=date_from and verified_at<date_to),
 e as (select * from public.finance_expenses where voided_at is null and expense_date>=date_from::date and expense_date<date_to::date),
 v as (select coalesce((select sum(amount_fcfa) from p),0)+coalesce((select sum(amount_fcfa) from i),0) gross,
 coalesce((select sum(platform_fee_fcfa) from p),0)+coalesce((select sum(amount_fcfa) from i),0) revenue,
 coalesce((select sum(teacher_earning_fcfa) from p),0) teachers,
 coalesce((select sum(amount_fcfa) from e where status='paid'),0) expenses,
 coalesce((select sum(amount_fcfa) from e where status='planned'),0) planned,
 coalesce((select sum(provider_fee_fcfa) from p),0)+coalesce((select sum(provider_fee_fcfa) from i),0) provider_fees,
 (select count(*) from p where provider_fee_fcfa is null)+(select count(*) from i where provider_fee_fcfa is null) unknown_fees)
 select jsonb_build_object('grossCollectedFcfa',gross,'kalattyRevenueFcfa',revenue,'teacherShareFcfa',teachers,
 'paidExpensesFcfa',expenses,'plannedExpensesFcfa',planned,'providerFeesFcfa',provider_fees,'unknownProviderFees',unknown_fees,
 'operatingResultFcfa',revenue-expenses-provider_fees,
 'unverifiedPaidCount',(select count(*) from public.payments where status='paid' and verification_source<>'cinetpay'),
 'reservedPayoutsFcfa',(select coalesce(sum(amount_fcfa),0) from public.teacher_payout_requests where status in ('requested','approved','unknown')),
 'teacherLiabilityFcfa',(select coalesce(sum(teacher_earning_fcfa),0) from public.payments where status='paid' and verification_source='cinetpay')-
 (select coalesce(sum(amount_fcfa),0) from public.teacher_payout_requests where status='paid')) from v;
$$;
revoke all on function public.route_app_feedback(uuid,uuid,integer,text,text),public.teacher_wallet(uuid),public.request_teacher_payout(uuid,bigint,uuid),public.confirm_institution_payment(uuid),public.finance_totals(timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.route_app_feedback(uuid,uuid,integer,text,text),public.teacher_wallet(uuid),public.request_teacher_payout(uuid,bigint,uuid),public.confirm_institution_payment(uuid),public.finance_totals(timestamptz,timestamptz) to service_role;
create function public.submit_app_feedback(actor uuid,stars integer,kind text,message text,department text,reason text)
returns public.app_feedback language plpgsql security invoker set search_path = '' as $$
declare f public.app_feedback;
begin
 perform 1 from public.profiles where id=actor for update;
 if not found then raise exception 'Account not found'; end if;
 if (select count(*) from public.app_feedback where user_id=actor and created_at>=now()-interval '1 day')>=5 then raise exception 'Maximum 5 avis par jour'; end if;
 insert into public.app_feedback(user_id,rating,category,body,suggested_department,routing_reason)
 values(actor,stars,kind,message,department,reason) returning * into f;
 return f;
end; $$;
create function public.finance_ledger(date_from timestamptz,date_to timestamptz,page_number integer)
returns jsonb language sql security invoker set search_path = '' as $$
 with entries as (
 select p.id,'course'::text kind,p.user_id,p.teacher_id,p.course_id,null::uuid institution_id,p.amount_fcfa,p.platform_fee_fcfa,
 p.teacher_earning_fcfa,p.provider_fee_fcfa,p.status,p.verification_source,p.created_at,p.verified_at,
 c.title label from public.payments p left join public.courses c on c.id=p.course_id
 union all
 select p.id,'institution',p.user_id,null::uuid,null::uuid,p.institution_id,p.amount_fcfa,p.amount_fcfa,0,p.provider_fee_fcfa,p.status,p.verification_source,p.created_at,p.verified_at,
 i.name||' · '||p.plan_name from public.institution_billing_payments p join public.institutions i on i.id=p.institution_id
 ),filtered as (select * from entries where coalesce(verified_at,created_at)>=date_from and coalesce(verified_at,created_at)<date_to),
 page as (select f.*,a.fullname payer_name,t.fullname teacher_name from filtered f left join public.profiles a on a.id=f.user_id
 left join public.profiles t on t.id=f.teacher_id order by coalesce(f.verified_at,f.created_at) desc,f.id offset greatest(page_number,0)*50 limit 50)
 select jsonb_build_object('total',(select count(*) from filtered),'page',greatest(page_number,0),'pageSize',50,
 'transactions',coalesce((select jsonb_agg(to_jsonb(page) order by coalesce(verified_at,created_at) desc,id) from page),'[]'::jsonb));
$$;
revoke all on function public.submit_app_feedback(uuid,integer,text,text,text,text),public.finance_ledger(timestamptz,timestamptz,integer) from public,anon,authenticated;
grant execute on function public.submit_app_feedback(uuid,integer,text,text,text,text),public.finance_ledger(timestamptz,timestamptz,integer) to service_role;
create function public.confirm_course_payment(payment uuid) returns void language plpgsql security invoker set search_path = '' as $$
declare p public.payments;
begin
 select * into p from public.payments where id=payment for update;
 if not found or p.status='refunded' then raise exception 'Payment unavailable'; end if;
 if p.status<>'paid' or p.verification_source<>'cinetpay' then
 update public.payments set status='paid',verification_source='cinetpay',verified_at=now() where id=p.id;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p.user_id::text||p.course_id::text,0));
 if not exists(select 1 from public.enrollments where user_id=p.user_id and course_id=p.course_id) then
 insert into public.enrollments(user_id,course_id) values(p.user_id,p.course_id);
 end if;
end; $$;
revoke all on function public.confirm_course_payment(uuid) from public,anon,authenticated;
grant execute on function public.confirm_course_payment(uuid) to service_role;
create unique index institution_one_pending_plan on public.institution_billing_payments(institution_id,user_id,plan_name) where status in ('pending','processing');
create trigger audit_payment_confirmation after update on public.payments for each row execute function public.audit_commerce_change();
-- A pending course checkout always reuses one reference, including concurrent requests.
create unique index if not exists course_one_pending_payment on public.payments(user_id,course_id) where status in ('pending','processing');
alter table public.payments add column provider_fee_reference text;
alter table public.payments add column provider_fee_recorded_by uuid references public.profiles(id);
alter table public.payments add constraint payment_provider_fee_nonnegative check(provider_fee_fcfa is null or provider_fee_fcfa between 0 and amount_fcfa);
alter table public.institution_billing_payments add column provider_fee_reference text;
alter table public.institution_billing_payments add column provider_fee_recorded_by uuid references public.profiles(id);
alter table public.institution_billing_payments add constraint institution_provider_fee_nonnegative check(provider_fee_fcfa is null or provider_fee_fcfa between 0 and amount_fcfa);
