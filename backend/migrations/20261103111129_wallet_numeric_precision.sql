-- JSON numeric sums retain scale (e.g. 17000.00); compare them as numeric.
create or replace function public.request_teacher_payout(teacher uuid,requested_amount bigint,idempotency_key uuid)
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
 if requested_amount < (w->>'minimumFcfa')::bigint or requested_amount > (w->>'availableFcfa')::numeric or requested_amount>700000 then
 raise exception 'Insufficient available funds or minimum not reached'; end if;
 insert into public.teacher_payout_requests(teacher_id,request_key,amount_fcfa,method,phone,holder_name)
 values(teacher,idempotency_key,requested_amount,a.method,a.phone,a.holder_name) returning * into r;
 return r;
end; $$;

