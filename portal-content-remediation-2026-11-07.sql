-- NNCC portal remediation identified in the November 2026 learner review.
-- Safe to re-run: every change targets an immutable record UUID.

begin;

-- 1) Attach the missing Preterm Brain Injury cranial-ultrasound imaging guide.
update public.lessons
set file_url = 'https://www.dropbox.com/scl/fi/bpgk45ym4y9lsw1esxl41/Preterm-Brain-Injury-US-imaging-guide.pdf?rlkey=2o563ywalwn6u96q7zmqsjwyp&st=mv13pzmm&dl=1',
    lesson_type = 'pdf'
where id = '685390dd-0561-42c9-8f87-a01cd41a4228';

-- 2) Replace the Spanish preterm-brain-injury lecture with the working English lecture.
update public.lessons
set video_url = 'https://www.youtube.com/watch?v=Qc2EbrEkQg4',
    lesson_type = 'video'
where id = '699c4060-10b1-41e8-94ef-f6410994bf59';

-- 3) Repair the SCAN Module 2 lessons for which stable English sources already exist.
update public.lessons
set video_url = 'https://www.youtube.com/watch?v=mAw1mj5KQCs',
    lesson_type = 'video'
where id = '28c4df44-8d28-4b2f-bd49-01bc7d0a26a2';

update public.lessons
set video_url = 'https://www.youtube.com/watch?v=Qc2EbrEkQg4',
    lesson_type = 'video'
where id = '01407a60-77e3-432a-8d35-c7e9c626b444';

update public.lessons
set video_url = 'https://www.youtube.com/watch?v=NhEhrhPFAUg',
    lesson_type = 'video'
where id = '112f6fa6-8d9e-48fc-be4d-894562ed9024';

-- 4) These two prompts explicitly require multiple selections.
update public.quiz_questions
set qtype = 'multi'
where id in (
  '5992ac82-2c42-40b2-b26b-fed4bb399157',
  '23ccbb17-7020-4b89-961f-f5c7f2de78bc'
);

commit;

-- Deliberately excluded pending source/faculty confirmation:
-- * SCAN "Ultrasound knobology" still needs a durable copy of the original video.
-- * Drive IVH 20 AI tool needs its replacement URL.
-- * aEEG questions 12-21, 36, 40 and 42 require faculty content review rather
--   than a technical change to their marked answers.
-- * The two research-writing videos use different source files; neither is
--   deleted until the curriculum owner confirms which one is redundant.
