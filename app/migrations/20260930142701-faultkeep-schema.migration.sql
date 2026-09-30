-- faultkeep schema

create or replace function touchUpdatedAt()
returns trigger
language plpgsql
as $$
begin
  new.updatedAt = now();
  return new;
end;
$$;

create table users (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  email text not null unique,
  name text not null,
  passwordHash text not null
);

create trigger usersTouchUpdatedAt
  before update on users
  for each row execute function touchUpdatedAt();

create table projects (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  name text not null,
  dsnKey text not null unique default ('fk_' || encode(gen_random_bytes(16), 'hex'))
);

create trigger projectsTouchUpdatedAt
  before update on projects
  for each row execute function touchUpdatedAt();

create table projectMembers (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  projectId uuid not null references projects(id) on delete cascade,
  userId uuid not null references users(id) on delete cascade,
  unique (projectId, userId)
);

create trigger projectMembersTouchUpdatedAt
  before update on projectMembers
  for each row execute function touchUpdatedAt();

create table issues (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  projectId uuid not null references projects(id) on delete cascade,
  fingerprint text not null,
  title text not null,
  culprit text not null default '',
  status text not null default 'unresolved' check (status in ('unresolved', 'resolved', 'ignored')),
  assigneeId uuid references users(id) on delete set null,
  eventCount integer not null default 0,
  userCount integer not null default 0,
  firstSeen timestamptz not null,
  lastSeen timestamptz not null,
  resolvedAt timestamptz,
  regressedAt timestamptz,
  unique (projectId, fingerprint)
);

create index issuesProjectLastSeenIdx on issues (projectId, lastSeen desc);

create trigger issuesTouchUpdatedAt
  before update on issues
  for each row execute function touchUpdatedAt();

create table events (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  projectId uuid not null references projects(id) on delete cascade,
  issueId uuid not null references issues(id) on delete cascade,
  errorType text not null default '',
  message text not null default '',
  stack text not null default '',
  url text not null default '',
  browser text not null default '',
  os text not null default '',
  userAgent text not null default '',
  release text not null default '',
  userKey text not null default ''
);

create index eventsIssueCreatedAtIdx on events (issueId, createdAt desc);

create trigger eventsTouchUpdatedAt
  before update on events
  for each row execute function touchUpdatedAt();

create table issueUsers (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  issueId uuid not null references issues(id) on delete cascade,
  userKey text not null,
  unique (issueId, userKey)
);

create trigger issueUsersTouchUpdatedAt
  before update on issueUsers
  for each row execute function touchUpdatedAt();

create table issueTags (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  issueId uuid not null references issues(id) on delete cascade,
  key text not null,
  value text not null,
  timesSeen integer not null default 0,
  unique (issueId, key, value)
);

create trigger issueTagsTouchUpdatedAt
  before update on issueTags
  for each row execute function touchUpdatedAt();

create table issueBuckets (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  issueId uuid not null references issues(id) on delete cascade,
  bucketAt timestamptz not null,
  total integer not null default 0,
  unique (issueId, bucketAt)
);

create trigger issueBucketsTouchUpdatedAt
  before update on issueBuckets
  for each row execute function touchUpdatedAt();

-- Grouping. A stack frame is reduced to its function and its file, with the
-- line, the column, the host, the query string and any content hash in the
-- bundle name dropped, so a redeploy that moves code still lands on the same
-- issue.

create or replace function fkFile(pUrl text) returns text
language sql immutable as $$
  select regexp_replace(
    regexp_replace(regexp_replace(pUrl, '^[a-z-]+://[^/]+', ''), '[?#].*$', ''),
    '[.-][0-9a-f]{6,}(\.[a-z]+)$', '\1'
  );
$$;

create or replace function fkFrames(pStack text) returns text[]
language sql immutable as $$
  select coalesce(array_agg(frame order by n), '{}')
  from (
    select n, frame
    from (
      select l.n,
             case
               when m.a is not null then m.a[1] || ' ' || fkFile(m.a[2])
               when m.b is not null then '<anonymous> ' || fkFile(m.b[1])
               when m.c is not null then coalesce(nullif(m.c[1], ''), '<anonymous>') || ' ' || fkFile(m.c[2])
             end as frame
      from regexp_split_to_table(pStack, E'\n') with ordinality as l(line, n)
      cross join lateral (
        select regexp_match(l.line, '^\s*at\s+(.*)\s+\((.*):[0-9]+:[0-9]+\)\s*$') as a,
               regexp_match(l.line, '^\s*at\s+(.*):[0-9]+:[0-9]+\s*$') as b,
               regexp_match(l.line, '^(.*)@(.*):[0-9]+:[0-9]+\s*$') as c
      ) m
    ) f
    where frame is not null
    order by n
    limit 5
  ) top;
$$;

create or replace function fkFingerprint(pType text, pMessage text, pStack text) returns text
language plpgsql immutable as $$
declare
  vFrames text[] := fkFrames(coalesce(pStack, ''));
begin
  if cardinality(vFrames) > 0 then
    return md5(coalesce(pType, '') || E'\n' || array_to_string(vFrames, E'\n'));
  end if;

  -- No frames to go on: group by the message with its variable parts blanked.
  return md5(coalesce(pType, '') || E'\n' || regexp_replace(
    regexp_replace(coalesce(pMessage, ''), '''[^'']*''|"[^"]*"', '?', 'g'),
    '[0-9]+', '0', 'g'
  ));
end;
$$;

-- One event in, every aggregate updated: the issue row, users affected, tag
-- counts and the hourly bucket. The ingest endpoint and the seed both call it.
create or replace function ingestEvent(
  pProjectId uuid,
  pType text,
  pMessage text,
  pStack text,
  pUrl text,
  pBrowser text,
  pOs text,
  pUserAgent text,
  pRelease text,
  pUserKey text,
  pAt timestamptz
) returns table (rIssueId uuid, rEventId uuid, rIsNew boolean, rRegressed boolean)
language plpgsql as $$
declare
  vFingerprint text := fkFingerprint(pType, pMessage, pStack);
  vFrames text[] := fkFrames(coalesce(pStack, ''));
  vIssue issues%rowtype;
  vIsNew boolean := false;
  vRegressed boolean := false;
  vNewUser integer := 0;
  vEventId uuid;
begin
  select * into vIssue from issues
   where projectId = pProjectId and fingerprint = vFingerprint
   for update;

  if not found then
    insert into issues (projectId, fingerprint, title, culprit, firstSeen, lastSeen)
         values (pProjectId,
                 vFingerprint,
                 left(case when coalesce(pType, '') = '' then pMessage else pType || ': ' || pMessage end, 300),
                 coalesce(vFrames[1], ''),
                 pAt,
                 pAt)
    on conflict (projectId, fingerprint) do nothing
    returning * into vIssue;

    if found then
      vIsNew := true;
    else
      select * into vIssue from issues
       where projectId = pProjectId and fingerprint = vFingerprint
       for update;
    end if;
  end if;

  vRegressed := vIssue.status = 'resolved';

  insert into events (projectId, issueId, errorType, message, stack, url, browser, os, userAgent, release, userKey, createdAt)
       values (pProjectId, vIssue.id, coalesce(pType, ''), coalesce(pMessage, ''), coalesce(pStack, ''),
               coalesce(pUrl, ''), coalesce(pBrowser, ''), coalesce(pOs, ''), coalesce(pUserAgent, ''),
               coalesce(pRelease, ''), coalesce(pUserKey, ''), pAt)
  returning id into vEventId;

  if coalesce(pUserKey, '') <> '' then
    insert into issueUsers (issueId, userKey) values (vIssue.id, pUserKey)
    on conflict (issueId, userKey) do nothing;

    if found then
      vNewUser := 1;
    end if;
  end if;

  insert into issueTags (issueId, key, value, timesSeen)
  select vIssue.id, t.k, t.v, 1
    from (values ('browser', pBrowser), ('os', pOs), ('release', pRelease), ('url', fkFile(coalesce(pUrl, '')))) as t(k, v)
   where coalesce(t.v, '') <> ''
  on conflict (issueId, key, value) do update set timesSeen = issueTags.timesSeen + 1;

  insert into issueBuckets (issueId, bucketAt, total)
       values (vIssue.id, date_trunc('hour', pAt), 1)
  on conflict (issueId, bucketAt) do update set total = issueBuckets.total + 1;

  update issues
     set eventCount = eventCount + 1,
         userCount = userCount + vNewUser,
         lastSeen = greatest(lastSeen, pAt),
         firstSeen = least(firstSeen, pAt),
         status = case when vRegressed then 'unresolved' else status end,
         resolvedAt = case when vRegressed then null else resolvedAt end,
         regressedAt = case when vRegressed then pAt else regressedAt end
   where id = vIssue.id;

  return query select vIssue.id, vEventId, vIsNew, vRegressed;
end;
$$;

-- Live updates. Ingest writes with plain sql, so these triggers are what
-- carry a new event or a changed count to the pages watching.

create or replace function fkDate(pAt timestamptz) returns json
language sql immutable as $$
  select case when pAt is null then null
              else json_build_object('$type', 'Date', '$value', (extract(epoch from pAt) * 1000)::bigint) end;
$$;

create or replace function fkPayload(pOp text, pId uuid, pData json) returns text
language plpgsql as $$
declare
  vPayload text := json_build_object('op', pOp, 'data', pData)::text;
begin
  -- NOTIFY takes under 8000 bytes. A larger row goes as its id, and the
  -- server reads it back.
  if octet_length(vPayload) >= 8000 then
    vPayload := json_build_object('op', pOp, 'id', pId)::text;
  end if;

  return vPayload;
end;
$$;

create or replace function issuesNotify() returns trigger
language plpgsql as $$
declare
  r record := coalesce(new, old);
  vData json := json_build_object(
    'id', r.id,
    'createdAt', fkDate(r.createdAt),
    'projectId', r.projectId,
    'title', r.title,
    'culprit', r.culprit,
    'status', r.status,
    'assigneeId', r.assigneeId,
    'eventCount', r.eventCount,
    'userCount', r.userCount,
    'firstSeen', fkDate(r.firstSeen),
    'lastSeen', fkDate(r.lastSeen),
    'resolvedAt', fkDate(r.resolvedAt),
    'regressedAt', fkDate(r.regressedAt)
  );
begin
  perform pg_notify(channel_name('issues'), fkPayload(lower(tg_op), r.id, vData));

  return r;
end;
$$;

create trigger issuesNotifyTrigger
  after insert or update or delete on issues
  for each row execute function issuesNotify();

create or replace function eventsNotify() returns trigger
language plpgsql as $$
declare
  r record := coalesce(new, old);
begin
  perform pg_notify(channel_name('events'), fkPayload(lower(tg_op), r.id, json_build_object(
    'id', r.id,
    'createdAt', fkDate(r.createdAt),
    'projectId', r.projectId,
    'issueId', r.issueId,
    'errorType', r.errorType,
    'message', r.message,
    'stack', r.stack,
    'url', r.url,
    'browser', r.browser,
    'os', r.os,
    'userAgent', r.userAgent,
    'release', r.release,
    'userKey', r.userKey
  )));

  return r;
end;
$$;

create trigger eventsNotifyTrigger
  after insert or update or delete on events
  for each row execute function eventsNotify();

create or replace function issueTagsNotify() returns trigger
language plpgsql as $$
declare
  r record := coalesce(new, old);
begin
  perform pg_notify(channel_name('issue_tags'), fkPayload(lower(tg_op), r.id, json_build_object(
    'id', r.id,
    'issueId', r.issueId,
    'key', r.key,
    'value', r.value,
    'timesSeen', r.timesSeen
  )));

  return r;
end;
$$;

create trigger issueTagsNotifyTrigger
  after insert or update or delete on issueTags
  for each row execute function issueTagsNotify();

create or replace function issueBucketsNotify() returns trigger
language plpgsql as $$
declare
  r record := coalesce(new, old);
begin
  -- The row carries its project too: the issue page watches one issue's
  -- buckets, and the issue list draws a sparkline per row from every bucket
  -- in the project.
  perform pg_notify(channel_name('issue_buckets'), fkPayload(lower(tg_op), r.id, json_build_object(
    'id', r.id,
    'projectId', (select i.projectId from issues i where i.id = r.issueId),
    'issueId', r.issueId,
    'bucketAt', fkDate(r.bucketAt),
    'total', r.total
  )));

  return r;
end;
$$;

create trigger issueBucketsNotifyTrigger
  after insert or update or delete on issueBuckets
  for each row execute function issueBucketsNotify();
