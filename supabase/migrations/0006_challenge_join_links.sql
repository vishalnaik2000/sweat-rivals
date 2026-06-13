-- Shareable join links for challenges. A challenge gets an unguessable join_code;
-- a friend opening the link can preview and join WITHOUT knowing anyone's username
-- or email. Run AFTER 0003.
--
-- Joining is done via SECURITY DEFINER RPCs (not broad RLS), so:
--  - non-members still can't read arbitrary challenges,
--  - the only way in is possessing the code,
--  - capacity is enforced server-side.

alter table challenges add column if not exists join_code uuid not null default gen_random_uuid();
create unique index if not exists challenges_join_code on challenges (join_code);

-- Minimal public-ish preview so the invitee sees what they're joining.
create or replace function challenge_preview_by_code(p_code text)
returns table (
  id uuid,
  name text,
  start_date date,
  end_date date,
  participants int,
  metrics int,
  status text
)
language sql security definer stable
set search_path = public as $$
  select
    c.id, c.name, c.start_date, c.end_date,
    (select count(*)::int from challenge_participants p where p.challenge_id = c.id and p.status = 'accepted'),
    (select count(*)::int from challenge_metrics m where m.challenge_id = c.id),
    c.status
  from challenges c
  where c.join_code = p_code::uuid;
$$;

-- Join (or re-accept) the calling user into the challenge identified by the code.
create or replace function join_challenge_by_code(p_code text)
returns uuid
language plpgsql security definer
set search_path = public as $$
declare
  v_id uuid;
  v_max int;
  v_count int;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select id, max_participants into v_id, v_max
  from challenges where join_code = p_code::uuid;

  if v_id is null then
    raise exception 'challenge_not_found';
  end if;

  -- already invited/joined? just mark accepted
  if exists (select 1 from challenge_participants where challenge_id = v_id and user_id = v_uid) then
    update challenge_participants
      set status = 'accepted', joined_at = now()
      where challenge_id = v_id and user_id = v_uid;
    return v_id;
  end if;

  select count(*) into v_count
  from challenge_participants where challenge_id = v_id and status = 'accepted';
  if v_count >= v_max then
    raise exception 'challenge_full';
  end if;

  insert into challenge_participants (challenge_id, user_id, status, joined_at)
  values (v_id, v_uid, 'accepted', now());

  return v_id;
end;
$$;

grant execute on function challenge_preview_by_code(text) to authenticated;
grant execute on function join_challenge_by_code(text) to authenticated;
