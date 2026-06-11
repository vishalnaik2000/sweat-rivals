-- Let a PENDING invitee read the challenge they were invited to (so they can see
-- it and accept). The original policies only allowed accepted participants; an
-- invited-but-not-yet-accepted user could not SELECT the challenge, its roster, or
-- its metrics. Run AFTER 0002.

create or replace function is_member(c uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from challenge_participants
    where challenge_id = c and user_id = auth.uid()
  );
$$;

drop policy if exists challenges_read on challenges;
create policy challenges_read on challenges for select to authenticated
  using (creator_id = auth.uid() or is_member(id));

drop policy if exists cp_read on challenge_participants;
create policy cp_read on challenge_participants for select to authenticated
  using (user_id = auth.uid() or is_member(challenge_id) or is_creator(challenge_id));

drop policy if exists cm_read on challenge_metrics;
create policy cm_read on challenge_metrics for select to authenticated
  using (is_member(challenge_id) or is_creator(challenge_id));

-- NOTE: entries cross-read (can_read_challenge_entry) still requires BOTH users to
-- be 'accepted' — pending invitees don't see anyone's logged data yet. That's intended.
