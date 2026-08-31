-- =============================================================
--  Feedback Haven — Supabase 테이블 생성 SQL
--  Supabase 대시보드 → SQL Editor 에 붙여넣고 [Run] 하세요.
-- =============================================================

create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  pdf_id      text        not null,
  page        int         not null,
  x           real        not null,          -- 페이지 내 가로 위치 (0~1)
  y           real        not null,          -- 페이지 내 세로 위치 (0~1)
  w           real        not null default 0, -- 범위(형광펜) 너비 (0이면 점 피드백)
  h           real        not null default 0, -- 범위(형광펜) 높이
  type        text        not null check (type in ('question','impression')),
  comment     text        not null default '',
  author      text,
  client_id   text,                          -- 작성 브라우저 식별용(자기 글 삭제)
  created_at  timestamptz not null default now()
);

create index if not exists feedback_pdf_id_idx on public.feedback (pdf_id);

-- 이미 feedback 테이블을 만든 경우: 범위(형광펜) 컬럼 추가 (한 번만 실행)
alter table public.feedback add column if not exists w real not null default 0;
alter table public.feedback add column if not exists h real not null default 0;

-- 행 수준 보안(RLS) 켜기
alter table public.feedback enable row level security;

-- 익명(anon) 키로 읽기/쓰기/삭제 허용 (소규모 신뢰 그룹 기준)
-- 필요하면 정책을 더 엄격하게 바꿀 수 있습니다.
drop policy if exists "feedback read"   on public.feedback;
drop policy if exists "feedback insert" on public.feedback;
drop policy if exists "feedback delete" on public.feedback;

create policy "feedback read"   on public.feedback for select using (true);
create policy "feedback insert" on public.feedback for insert with check (true);
create policy "feedback delete" on public.feedback for delete using (true);

-- =============================================================
--  댓글 테이블 (각 피드백에 달리는 댓글)
-- =============================================================
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  feedback_id uuid        not null references public.feedback(id) on delete cascade,
  pdf_id      text        not null,
  comment     text        not null default '',
  author      text,
  client_id   text,
  created_at  timestamptz not null default now()
);

create index if not exists comments_feedback_id_idx on public.comments (feedback_id);
create index if not exists comments_pdf_id_idx on public.comments (pdf_id);

alter table public.comments enable row level security;

drop policy if exists "comments read"   on public.comments;
drop policy if exists "comments insert" on public.comments;
drop policy if exists "comments delete" on public.comments;

create policy "comments read"   on public.comments for select using (true);
create policy "comments insert" on public.comments for insert with check (true);
create policy "comments delete" on public.comments for delete using (true);

-- 실시간(Realtime) 반영을 위해 테이블을 publication 에 추가
-- (이미 추가되어 있으면 오류가 날 수 있는데 무시해도 됩니다)
alter publication supabase_realtime add table public.feedback;
alter publication supabase_realtime add table public.comments;
