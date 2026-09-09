-- RCPSC MOC Section 3 accreditation metadata from the University of Calgary
-- approval letter dated June 7, 2024. Safe to run more than once.

alter table public.courses add column if not exists rcpsc_id text;
alter table public.courses add column if not exists accredited_hours integer;

update public.courses set
  title = 'Neonatal Neuro Critical Care Module 1: Conducting Research and Quality Improvement',
  rcpsc_id = '00017849', accredited_hours = 8
where lower(title) like '%conducting research%' and lower(title) like '%quality improvement%';

update public.courses set
  title = 'Neonatal Neuro Critical Care Module 2: Neonatal Cranial Ultrasonography',
  rcpsc_id = '00017850', accredited_hours = 5
where lower(title) like '%cranial ultrason%';

update public.courses set
  title = 'Neonatal Neuro Critical Care Module 3: Neurological Examination to Identify Neonates With HIE',
  rcpsc_id = '00017851', accredited_hours = 5
where lower(title) like '%neurological examination%' and lower(title) like '%hie%';

update public.courses set
  title = 'Neonatal Neuro Critical Care Module 4: Neonatal Follow Up Essentials',
  rcpsc_id = '00017852', accredited_hours = 4
where lower(title) like '%follow up essentials%'
   or lower(title) like '%follow-up essentials%'
   or lower(title) like '%follow-up education%';

update public.courses set
  title = 'Neonatal Neuro Critical Care Module 5: Neonatal Brain MRI',
  rcpsc_id = '00017853', accredited_hours = 8
where lower(title) like '%brain mri%';

update public.courses set
  title = 'Neonatal Neuro Critical Care Module 6: Neonatal Brain Monitoring',
  rcpsc_id = '00017854', accredited_hours = 9
where lower(title) like '%brain monitoring%';

update public.courses set
  title = 'Neonatal Neuro Critical Care Module 7: Nursing Care of Infants with HIE Certification',
  rcpsc_id = '00017855', accredited_hours = 10
where lower(title) like '%nursing care%' and lower(title) like '%hie%';

update public.courses set
  title = 'Neonatal Neuro Critical Care Module 8: Post Hemorrhagic Ventricular Dilatation Diagnosis and Management',
  rcpsc_id = '00017856', accredited_hours = 3
where lower(title) like '%post hemorrhagic ventricular dilatation%'
   or lower(title) like '%post-hemorrhagic ventricular dilatation%'
   or lower(title) like '%phvd diagnosis%';

update public.courses set
  title = 'Neonatal Neuro Critical Care Module 9: Neonatal Stroke',
  rcpsc_id = '00017857', accredited_hours = 2
where lower(title) like '%neonatal stroke%';

update public.courses set
  title = 'Neonatal Neuro Critical Care Module 10: Fetal monitoring to prevent HIE',
  rcpsc_id = '00017858', accredited_hours = 6
where lower(title) like '%fetal monitoring%' and lower(title) like '%prevent hie%';

select title, rcpsc_id, accredited_hours
from public.courses
where rcpsc_id is not null
order by accredited_hours desc, title;
