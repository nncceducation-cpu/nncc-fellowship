import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'migration-data', 'nncc-mcq-all.json');
const outputPath = path.join(root, 'nncc-mcq-migration.sql');
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

if (!Array.isArray(source.courses) || !source.courses.length) {
  throw new Error('No NNCC courses found in migration-data/nncc-mcq-all.json');
}

const total = source.courses.flatMap(c => c.quizzes || []).flatMap(q => q.questions || []).length;
if (total !== 415) throw new Error(`Expected 415 questions, found ${total}`);
if (source.courses.length !== 13) throw new Error(`Expected 13 NNCC modules, found ${source.courses.length}`);
if (source.courses.some(c => /\bAI in Medicine\b/i.test(c.name))) throw new Error('AI in Medicine must not be included');
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

create temporary table nncc_migrated_lessons(id uuid primary key) on commit preserve rows;

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
         and regexp_replace(lower(l.title),'[^a-z0-9]+','','g')=quiz_key
       order by l.created_at limit 1;

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
             external_url=null, quiz_pass_required=pass_required, quiz_pass_percent=pass_percent
       where id=target_lesson;

      insert into nncc_migrated_lessons(id) values(target_lesson) on conflict do nothing;

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

commit;

-- Verification: should return 415.
select count(*) as migrated_nncc_questions
from public.quiz_questions q
join nncc_migrated_lessons ml on ml.id=q.lesson_id;
`;

fs.writeFileSync(outputPath, sql, 'utf8');
console.log(`Wrote ${path.basename(outputPath)} with ${source.courses.length} modules, ${total} questions, and ${mediaQuestions} questions containing media.`);
