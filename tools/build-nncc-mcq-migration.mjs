import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'migration-data', 'nncc-mcq-all.json');
const outputPath = path.join(root, 'nncc-mcq-migration.sql');
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

// Thinkific's course-player proxy refuses to load outside Thinkific. These IDs
// resolve the protected proxy URLs to the same publicly embeddable Wistia clips.
const wistiaMediaIds = new Map([
  ['https://nncceducation.thinkific.com/api/course_player/v2/contents/19127880/play/3318915', 'v78cyc1xsv'],
  ['https://nncceducation.thinkific.com/api/course_player/v2/contents/19127880/play/3318905', 'lbg1jmqvi0'],
  ['https://nncceducation.thinkific.com/api/course_player/v2/contents/19127880/play/3318899', 'wsca5pdime'],
  ['https://nncceducation.thinkific.com/api/course_player/v2/contents/19127880/play/3318922', '31n5g219qu'],
  ['https://nncceducation.thinkific.com/api/course_player/v2/contents/19127880/play/3318945', 'vfvcsxq97s'],
  ['https://nncceducation.thinkific.com/api/course_player/v2/contents/19127880/play/3318911', 'ek27rw4mt5'],
  ['https://nncceducation.thinkific.com/api/course_player/v2/contents/19127880/play/3318909', 'mjg884y3kp'],
  ['https://nncceducation.thinkific.com/api/course_player/v2/contents/16129800/play/3308710', 'gebebbwesn'],
  ['https://nncceducation.thinkific.com/api/course_player/v2/contents/16129800/play/3308783', '74ecytitqd'],
  ['https://nncceducation.thinkific.com/api/course_player/v2/contents/16129800/play/3308803', 'mb6xn9plit'],
  ['https://nncceducation.thinkific.com/api/course_player/v2/contents/16129800/play/3308821', 'lzl6dsqake'],
  ['https://nncceducation.thinkific.com/api/course_player/v2/contents/16129800/play/3308837', 'afygdwhqkr'],
  ['https://nncceducation.thinkific.com/api/course_player/v2/contents/16129800/play/3308860', 'c8pm3s6m12'],
  ['https://nncceducation.thinkific.com/api/course_player/v2/contents/16129800/play/3308876', 'nsphdbl0bu'],
  ['https://nncceducation.thinkific.com/api/course_player/v2/contents/16129800/play/3308932', 'zdbe5tss4k'],
  ['https://nncceducation.thinkific.com/api/course_player/v2/contents/16129800/play/3309029', '3rwky30jwq'],
  ['https://nncceducation.thinkific.com/api/course_player/v2/contents/16129800/play/3309037', 'kkhff83o0h'],
  ['https://nncceducation.thinkific.com/api/course_player/v2/contents/16129800/play/3317476', 'f6biy172x8'],
  ['https://nncceducation.thinkific.com/api/course_player/v2/contents/16129800/play/3317491', 'olkpj9w9lr'],
  ['https://nncceducation.thinkific.com/api/course_player/v2/contents/16129800/play/3317550', 'nlofpaq3zc'],
  ['https://nncceducation.thinkific.com/api/course_player/v2/contents/16129800/play/3317582', 'raaqa8rbaj'],
  ['https://nncceducation.thinkific.com/api/course_player/v2/contents/16129800/play/3317636', '746e6ai3q5'],
  ['https://nncceducation.thinkific.com/api/course_player/v2/contents/16129800/play/3317685', 'uzimp17l6d'],
  ['https://nncceducation.thinkific.com/api/course_player/v2/contents/16129800/play/3317727', 'o3ssj6r95b'],
  ['https://nncceducation.thinkific.com/api/course_player/v2/contents/16129800/play/3317747', 'dx0ygnbqvu'],
  ['https://nncceducation.thinkific.com/api/course_player/v2/contents/16129800/play/3317778', 'pjr88lgq7i'],
  ['https://nncceducation.thinkific.com/api/course_player/v2/contents/16129800/play/3317813', 'vsj07cc2i4'],
  ['https://nncceducation.thinkific.com/api/course_player/v2/contents/16171030/play/3318911', 'ek27rw4mt5'],
  ['https://nncceducation.thinkific.com/api/course_player/v2/contents/16171030/play/3318915', 'v78cyc1xsv'],
  ['https://nncceducation.thinkific.com/api/course_player/v2/contents/16171030/play/3318905', 'lbg1jmqvi0'],
  ['https://nncceducation.thinkific.com/api/course_player/v2/contents/16171030/play/3318917', 'oo5yld3tg6'],
  ['https://nncceducation.thinkific.com/api/course_player/v2/contents/16171030/play/3318899', 'wsca5pdime'],
  ['https://nncceducation.thinkific.com/api/course_player/v2/contents/16171030/play/3318944', 'xqmd7gjfv0'],
  ['https://nncceducation.thinkific.com/api/course_player/v2/contents/16171030/play/3318922', '31n5g219qu'],
  ['https://nncceducation.thinkific.com/api/course_player/v2/contents/16171030/play/3318945', 'vfvcsxq97s'],
  ['https://nncceducation.thinkific.com/api/course_player/v2/contents/16171030/play/3318909', 'mjg884y3kp'],
]);

function replaceThinkificMedia(html = '') {
  for (const [url, mediaId] of wistiaMediaIds) {
    html = html.replaceAll(url, `https://fast.wistia.net/embed/iframe/${mediaId}?videoFoam=true`);
  }
  return html;
}

for (const course of source.courses || []) for (const quiz of course.quizzes || []) {
  for (const question of quiz.questions || []) {
    question.prompt = replaceThinkificMedia(question.prompt);
    question.explanation = replaceThinkificMedia(question.explanation);
    for (const option of question.options || []) option.text = replaceThinkificMedia(option.text);
  }
}

if (!Array.isArray(source.courses) || !source.courses.length) {
  throw new Error('No NNCC courses found in migration-data/nncc-mcq-all.json');
}

const total = source.courses.flatMap(c => c.quizzes || []).flatMap(q => q.questions || []).length;
if (total !== 415) throw new Error(`Expected 415 questions, found ${total}`);
if (source.courses.length !== 13) throw new Error(`Expected 13 NNCC modules, found ${source.courses.length}`);
if (source.courses.some(c => /\bAI in Medicine\b/i.test(c.name))) throw new Error('AI in Medicine must not be included');
if (JSON.stringify(source).includes('nncceducation.thinkific.com/api/course_player/')) {
  throw new Error('One or more protected Thinkific media URLs were not replaced');
}
for (const course of source.courses) for (const quiz of course.quizzes || []) {
  if (quiz.question_count !== quiz.questions?.length) throw new Error(`Question-count mismatch: ${course.name} / ${quiz.title}`);
  for (const q of quiz.questions) {
    if (!q.prompt?.trim()) throw new Error(`Question ${q.id} has no prompt`);
    if (!q.options?.length) throw new Error(`Question ${q.id} has no options`);
    if (!q.options.some(o => o.correct)) throw new Error(`Question ${q.id} has no correct answer`);
  }
}
const mediaQuestions = source.courses.flatMap(c => c.quizzes || []).flatMap(q => q.questions || [])
  .filter(q => /<(?:img|iframe|video|audio)\b/i.test(`${q.prompt || ''}${q.explanation || ''}`)).length;

const json = JSON.stringify(source).replaceAll('$nncc_json$', '$nncc json$');
const sql = `-- =====================================================================
-- NNCC Thinkific MCQ migration: 13 modules, ${total} questions
-- Generated from migration-data/nncc-mcq-all.json.
-- AI in Medicine is deliberately excluded.
-- Safe to re-run: matched quiz lessons are replaced, not duplicated.
-- =====================================================================

begin;

alter table public.quiz_questions add column if not exists image_url text;
alter table public.quiz_questions add column if not exists question_html text;
alter table public.quiz_questions add column if not exists explanation_html text;
alter table public.lessons add column if not exists quiz_pass_percent int default 70;
alter table public.lessons add column if not exists quiz_pass_required boolean default true;
alter table public.lessons add column if not exists thinkific_quiz_id bigint;

drop table if exists nncc_migrated_lessons;
create temporary table nncc_migrated_lessons(id uuid primary key, quiz_id bigint unique) on commit preserve rows;

do $nncc_migration$
declare
  payload jsonb := $nncc_json$${json}$nncc_json$::jsonb;
  course_entry jsonb;
  quiz_entry jsonb;
  question_entry jsonb;
  target_course uuid;
  target_chapter uuid;
  target_lesson uuid;
  source_title text;
  source_base text;
  source_slug text;
  quiz_title text;
  quiz_key text;
  question_text text;
  explanation_text text;
  options_json jsonb;
  correct_json jsonb;
  first_media text;
  pass_required boolean;
  pass_percent int;
  question_order int;
begin
  for course_entry in select value from jsonb_array_elements(payload->'courses') loop
    source_title := btrim(course_entry->>'name');
    source_slug := lower(course_entry->>'slug');
    source_base := btrim(regexp_replace(source_title, '\\s*\\([^)]*(hours?|credits?).*$', '', 'i'));

    select c.id into target_course
      from public.courses c
     where regexp_replace(lower(c.title),'[^a-z0-9]+','','g') = regexp_replace(lower(source_title),'[^a-z0-9]+','','g')
        or regexp_replace(lower(c.title),'[^a-z0-9]+','','g') = regexp_replace(lower(source_base),'[^a-z0-9]+','','g')
        or regexp_replace(lower(c.title),'[^a-z0-9]+','','g') like '%' || regexp_replace(lower(source_base),'[^a-z0-9]+','','g') || '%'
        or regexp_replace(lower(source_base),'[^a-z0-9]+','','g') like '%' || regexp_replace(lower(c.title),'[^a-z0-9]+','','g') || '%'
     order by
       (regexp_replace(lower(c.title),'[^a-z0-9]+','','g') = regexp_replace(lower(source_title),'[^a-z0-9]+','','g')) desc,
       length(c.title)
     limit 1;

    if target_course is null then
      insert into public.courses(title,description,sort_order,published)
      values(source_title,'Migrated from the NNCC Thinkific bundle.',100,true)
      returning id into target_course;
    end if;

    select m.id into target_chapter
      from public.modules m
     where m.course_id=target_course
       and regexp_replace(lower(m.title),'[^a-z0-9]+','','g') in ('quizzes','quiz','knowledgechecks','knowledgecheck','assessments','assessment')
     order by m.sort_order nulls last limit 1;

    if target_chapter is null then
      insert into public.modules(course_id,title,sort_order)
      values(target_course,'Knowledge Checks',999)
      returning id into target_chapter;
    end if;

    for quiz_entry in select value from jsonb_array_elements(course_entry->'quizzes') loop
      quiz_title := btrim(quiz_entry->>'title');
      quiz_key := regexp_replace(lower(quiz_title),'[^a-z0-9]+','','g');

      select l.id into target_lesson
        from public.lessons l
        join public.modules m on m.id=l.module_id
       where m.course_id=target_course
         and l.thinkific_quiz_id=(quiz_entry->>'quiz_id')::bigint
       order by l.created_at limit 1;

      if target_lesson is null then
        select l.id into target_lesson
          from public.lessons l
          join public.modules m on m.id=l.module_id
         where m.course_id=target_course
         and regexp_replace(lower(l.title),'[^a-z0-9]+','','g')=quiz_key
           and not exists (select 1 from nncc_migrated_lessons ml where ml.id=l.id)
         order by l.created_at limit 1;
      end if;

      if target_lesson is null then
        insert into public.lessons(module_id,title,content,lesson_type,sort_order)
        values(target_chapter,quiz_title,'Answer the questions below to complete this quiz.','quiz',999)
        returning id into target_lesson;
      end if;

      pass_required := case
        when (quiz_entry->>'quiz_id')::bigint = 4502486 then true
        when (quiz_entry->>'quiz_id')::bigint = 1129153 then false
        when source_slug='fetal-monitoring-to-prevent-hie' then false
        when source_slug in ('neonatal-stroke-teaching-module','neonatalbrainmri-teaching','neonatal-brain-monitoring','nfu-education','phvd-dagnosis-and-management','aeeg--module','aeegeegtrendsmodule','neonatal-eeg-setup','targeted-neuro-exam-hie') then true
        when lower(quiz_title) ~ '(at least|score of|score at least|need to score).*(80|90)%' then true
        else false end;
      pass_percent := case
        when (quiz_entry->>'quiz_id')::bigint = 4502486 then 80
        when lower(quiz_title) like '%80%' then 80
        when pass_required then 90
        else 70 end;

      update public.lessons
         set lesson_type='quiz', content='Answer the questions below to complete this quiz.',
             external_url=null, quiz_pass_required=pass_required, quiz_pass_percent=pass_percent,
             thinkific_quiz_id=(quiz_entry->>'quiz_id')::bigint
       where id=target_lesson;

      insert into nncc_migrated_lessons(id,quiz_id)
      values(target_lesson,(quiz_entry->>'quiz_id')::bigint) on conflict do nothing;

      delete from public.quiz_questions where lesson_id=target_lesson;
      question_order := 0;

      for question_entry in select value from jsonb_array_elements(quiz_entry->'questions') loop
        question_text := btrim(regexp_replace(regexp_replace(coalesce(question_entry->>'prompt',''), '<[^>]*>', ' ', 'g'), '\\s+', ' ', 'g'));
        explanation_text := btrim(regexp_replace(regexp_replace(coalesce(question_entry->>'explanation',''), '<[^>]*>', ' ', 'g'), '\\s+', ' ', 'g'));
        first_media := substring(coalesce(question_entry->>'prompt','') from '(?i)src=["'']([^"'']+)["'']');

        select coalesce(jsonb_agg(jsonb_build_object(
                 'id', chr(96 + o.ord::int),
                 'text', btrim(regexp_replace(regexp_replace(coalesce(o.value->>'text',''), '<[^>]*>', ' ', 'g'), '\\s+', ' ', 'g')),
                 'html', coalesce(o.value->>'text','')) order by o.ord), '[]'::jsonb),
               coalesce(jsonb_agg(to_jsonb(chr(96 + o.ord::int))) filter (where coalesce((o.value->>'correct')::boolean,false)), '[]'::jsonb)
          into options_json, correct_json
          from jsonb_array_elements(question_entry->'options') with ordinality o(value,ord);

        insert into public.quiz_questions(
          lesson_id,question,question_html,qtype,options,correct,
          explanation,explanation_html,sort_order,image_url)
        values(
          target_lesson,coalesce(nullif(question_text,''),'Question '||(question_order+1)),question_entry->>'prompt',
          case when question_entry->>'type'='checkbox' or jsonb_array_length(correct_json)>1 then 'multi' else 'single' end,
          options_json,correct_json,nullif(explanation_text,''),nullif(question_entry->>'explanation',''),question_order,first_media);
        question_order := question_order + 1;
      end loop;
    end loop;
  end loop;
end $nncc_migration$;

-- Move newly-created Knowledge Checks back into corresponding original
-- quiz lessons when the Thinkific import used a slightly different title.
drop table if exists nncc_reconcile_claimed;
create temporary table nncc_reconcile_claimed(id uuid primary key) on commit preserve rows;

do $nncc_reconcile$
declare
  source_lesson record;
  destination_lesson uuid;
begin
  for source_lesson in
    select l.*, m.course_id
      from public.lessons l
      join public.modules m on m.id=l.module_id
     where l.thinkific_quiz_id is not null
       and regexp_replace(lower(m.title),'[^a-z0-9]+','','g')='knowledgechecks'
     order by l.created_at
  loop
    destination_lesson := null;

    if source_lesson.thinkific_quiz_id=4480125
       and exists(select 1 from public.lessons where id='0bf57298-c24a-4e4a-ba04-8f63c0448c49') then
      destination_lesson := '0bf57298-c24a-4e4a-ba04-8f63c0448c49';
    elsif source_lesson.thinkific_quiz_id=1325514
       and exists(select 1 from public.lessons where id='14d7c83b-6998-4bbc-a69d-e56b5c2583fa') then
      destination_lesson := '14d7c83b-6998-4bbc-a69d-e56b5c2583fa';
    else
      select candidate.id into destination_lesson
        from public.lessons candidate
        join public.modules cm on cm.id=candidate.module_id
       where cm.course_id=source_lesson.course_id
         and candidate.id<>source_lesson.id
         and candidate.thinkific_quiz_id is null
         and not exists(select 1 from nncc_reconcile_claimed claimed where claimed.id=candidate.id)
         and (
           regexp_replace(lower(candidate.title),'[^a-z0-9]+','','g') = regexp_replace(lower(source_lesson.title),'[^a-z0-9]+','','g')
           or regexp_replace(lower(candidate.title),'[^a-z0-9]+','','g') like '%' || regexp_replace(lower(source_lesson.title),'[^a-z0-9]+','','g') || '%'
           or regexp_replace(lower(source_lesson.title),'[^a-z0-9]+','','g') like '%' || regexp_replace(lower(candidate.title),'[^a-z0-9]+','','g') || '%'
         )
       order by
         case
           when regexp_replace(lower(candidate.title),'[^a-z0-9]+','','g') = regexp_replace(lower(source_lesson.title),'[^a-z0-9]+','','g') then 0
           else 1 end,
         candidate.sort_order nulls last, candidate.created_at
       limit 1;
    end if;

    if destination_lesson is not null and destination_lesson<>source_lesson.id then
      delete from public.quiz_questions where lesson_id=destination_lesson;
      update public.quiz_questions set lesson_id=destination_lesson where lesson_id=source_lesson.id;
      update public.lessons
         set lesson_type='quiz', content=source_lesson.content, external_url=null,
             quiz_pass_required=source_lesson.quiz_pass_required,
             quiz_pass_percent=source_lesson.quiz_pass_percent,
             thinkific_quiz_id=source_lesson.thinkific_quiz_id
       where id=destination_lesson;
      insert into nncc_reconcile_claimed(id) values(destination_lesson) on conflict do nothing;
      delete from public.lessons where id=source_lesson.id;
    end if;
  end loop;

  delete from public.modules m
   where regexp_replace(lower(m.title),'[^a-z0-9]+','','g')='knowledgechecks'
     and not exists(select 1 from public.lessons l where l.module_id=m.id);
end $nncc_reconcile$;

commit;

-- Verification: should return 415.
select count(*) as migrated_nncc_questions
from public.quiz_questions q
join public.lessons l on l.id=q.lesson_id
where l.thinkific_quiz_id is not null;
`;

fs.writeFileSync(outputPath, sql, 'utf8');
console.log(`Wrote ${path.basename(outputPath)} with ${source.courses.length} modules, ${total} questions, and ${mediaQuestions} questions containing media.`);
