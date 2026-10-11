-- SCAN bundle migration from Thinkific course bundle 127401.
-- Idempotent: courses, chapters and lessons are matched by title; quiz questions
-- for the three SCAN quizzes are replaced so their order and answer keys remain exact.

alter table public.lessons add column if not exists lesson_type text;
alter table public.lessons add column if not exists external_url text;
alter table public.lessons add column if not exists file_url text;
alter table public.lessons add column if not exists caption text;
alter table public.lessons add column if not exists quiz_pass_percent int default 70;
alter table public.lessons add column if not exists quiz_pass_required boolean default true;
alter table public.lessons add column if not exists thinkific_quiz_id bigint;
alter table public.quiz_questions add column if not exists image_url text;
alter table public.quiz_questions add column if not exists question_html text;
alter table public.quiz_questions add column if not exists explanation_html text;

do $scan$
declare
  c jsonb; l jsonb; q jsonb; o jsonb;
  cid uuid; mid uuid; lid uuid;
  opts jsonb; corr jsonb; n int;
  courses jsonb := $json$[
    {"title":"Concept of SCAN and US physics","description":"Foundations of Sonographic Clinical Assessment of the Newborn (SCAN), ultrasound physics and machine knobology.","cover":"https://import.cdn.thinkific.com/429249/courses/2019819/48PZffSfqqDTw8qYNIJQ_Untitled%20design%20%2810%29.png","chapter":"Concept of SCAN and ultrasound physics","order":61},
    {"title":"SCAN Module 2 : Cranial Sonographic Clinical Assessment of the Newborn","description":"Standardized neonatal cranial point-of-care ultrasound training with imaging guides, demonstrations and competency assessment.","cover":"https://import.cdn.thinkific.com/429249/courses/1119491/jURlOK7aSNWnkZCCehml_HUS%20poster.jpg","chapter":"Neonatal Cranial Ultrasonography","order":62},
    {"title":"Lung Sonographic Clinical Assessment of the Newborn","description":"Basic and advanced neonatal lung ultrasound within the SCAN curriculum.","cover":"https://import.cdn.thinkific.com/429249/courses/1120085/mCurjWrrSfiAzv2iCttU_LUNG.jpg","chapter":"Lung ultrasound","order":63},
    {"title":"Ultrasound Guided Sonographic clinical Assessment of the Newborn procedures","description":"Ultrasound assessment of central lines and ultrasound-guided neonatal procedures, with demonstrations and competency assessment.","cover":"https://import.cdn.thinkific.com/429249/DtpGeSrQeyWCmi2iJmMm_IV%20access.png","chapter":"Post Hemorrhagic Ventricular dilatation diagnosis and management","order":64},
    {"title":"SANTS Cardiac Sonographic Clinical Assessment of the Newborn","description":"Cardiac Sonographic Clinical Assessment of the Newborn: anatomy, systemic perfusion, scanning technique and competency assessment.","cover":"https://import.cdn.thinkific.com/429249/courses/1119492/scXESYN6QRytn6JklhHD_IMG_1842.jpg","chapter":"Sonographic Clinical Assessment of the Newborn","order":65}
  ]$json$::jsonb;
  lessons jsonb := $json$[
    {"course":"Concept of SCAN and US physics","title":"US physics","type":"pdf","file":"https://import.cdn.thinkific.com/278624/RRBblu8CTSG5KQWxlUPi_Point-of-Care-Ultrasound-Learning-Package.pdf","order":1},
    {"course":"Concept of SCAN and US physics","title":"The concept of SCAN","type":"video","video":"https://platform.thinkific.com/videoproxy/v1/play/cco58c5btlgb9cji4lag","order":2},
    {"course":"Concept of SCAN and US physics","title":"Ultrasound Physics","type":"video","video":"https://platform.thinkific.com/videoproxy/v1/play/cco59glbtlgb9cji4lc0","order":3},
    {"course":"Concept of SCAN and US physics","title":"Ultrasound machine knobology","type":"video","video":"https://platform.thinkific.com/videoproxy/v1/play/brsk9smkg7cnqndqqt10","order":4},

    {"course":"SCAN Module 2 : Cranial Sonographic Clinical Assessment of the Newborn","title":"Introduction and Orientation","type":"text","content":"<p>Welcome to the Neonatal Cranial Ultrasound course. The goal of this course is to standardize point of care ultrasound training for paediatric residents and neonatal-perinatal fellows. This is not meant in any way to replace the need for ultrasound technicians and radiologists. It is crucial to retain the support from your radiology department and ultrasound technicians to ensure that the quality of ultrasound studies remain up to standard, help maintain your skills and counsel families appropriately.</p><p>You can find a study conducted by the group showing the efficacy of this method:</p><p><a href=\"https://pubmed.ncbi.nlm.nih.gov/31876319/\">Point of care ultrasound study</a></p><p>To get your certificate of competency follow these steps:</p><p>Lesson 1: Watch basics of cranial ultrasonography lecture</p><p>Lesson 2: Read preterm brain injury classification document</p><p>Lesson 3: Watch preterm brain injury classification lecture</p><p>Lesson 4: Watch knobology video</p><p>Lesson 5: Watch how to perform cranial ultrasonography study lecture</p><p>Lesson 6: Answer the MCQs</p><p>Once you finish the online module, either attend one of our hands-on workshops, or ask your radiologist or neonatologist with expertise in cranial ultrasonography to demonstrate performing cranial ultrasonography to you.</p><p>The final step is to perform 5 full studies by yourself and upload (de-identified) images to the file upload link for scoring, or get your radiologist/neonatologist to score your studies using the scoring form at the end of this course.</p><p>The signing sheet and file uploading link are at the end.</p><p><strong>Neonatal Cranial Ultrasonography Online Module</strong></p><p><strong>Lesson 1: Basics of cranial ultrasonography video</strong></p><p><strong>Speaker:</strong> Dr. Khorshid Mohammad</p><p><strong>Objectives:</strong></p><ol><li>Explain techniques and standard views of cranial ultrasonography</li><li>Understand pros and cons of cranial ultrasonography</li><li>Explain normal and abnormal findings on cranial ultrasonography</li></ol><p><strong>Lesson 2: Preterm brain injury classification</strong></p><p><strong>Speaker:</strong> Dr. James Scott</p><p><strong>Objectives:</strong></p><ol><li>Explain the status and impact of variability in preterm brain injury diagnosis</li><li>Explain common brain injuries identified by cranial ultrasonography</li><li>Explain uncommon brain injuries and malformation by cranial ultrasound that can mimic common preterm brain injury</li></ol><p><strong>Lesson 3: Ultrasound Knobology</strong></p><p><strong>Speaker:</strong> Dr. Khorshid Mohammad</p><p><strong>Objectives:</strong></p><ol><li>Demonstrate the main machine functionality required to perform cranial ultrasonography</li><li>Explain the differences between types of probes and frequencies in the context of acquiring cranial ultrasound images</li></ol><p><strong>Lesson 4: Neonatal cranial ultrasonography demonstration</strong></p><p><strong>Speaker:</strong> Dr. Khorshid Mohammad</p><p><strong>Objectives:</strong></p><ol><li>Demonstrate performing cranial ultrasound study on a live infant</li><li>Demonstrate maneuvers to optimize images</li><li>Demonstrate ventricular size measurement technique</li></ol>","order":1},
    {"course":"SCAN Module 2 : Cranial Sonographic Clinical Assessment of the Newborn","title":"Watch basics of cranial ultrasonography video","type":"video","video":"https://platform.thinkific.com/videoproxy/v1/play/bundhbri57dcbr647d40","order":2},
    {"course":"SCAN Module 2 : Cranial Sonographic Clinical Assessment of the Newborn","title":"Read preterm brain injury classification document","type":"pdf","file":"https://import.cdn.thinkific.com/278624/PretermBrainInjuryDiagnosisconsensusstatement-200628-192332.pdf","order":3},
    {"course":"SCAN Module 2 : Cranial Sonographic Clinical Assessment of the Newborn","title":"Watch preterm brain injury classification lecture","type":"video","video":"https://platform.thinkific.com/videoproxy/v1/play/brsk8scobr2ovlip0rh0","order":4},
    {"course":"SCAN Module 2 : Cranial Sonographic Clinical Assessment of the Newborn","title":"Preterm Brain Injury US imaging guide","type":"multimedia","external":"https://www.dropbox.com/scl/fi/bpgk45ym4y9lsw1esxl41/Preterm-Brain-Injury-US-imaging-guide.pdf?rlkey=2o563ywalwn6u96q7zmqsjwyp&st=mv13pzmm&dl=0","order":5},
    {"course":"SCAN Module 2 : Cranial Sonographic Clinical Assessment of the Newborn","title":"Watch Knobology video","type":"video","video":"https://platform.thinkific.com/videoproxy/v1/play/brsk9smkg7cnqndqqt10","order":6},
    {"course":"SCAN Module 2 : Cranial Sonographic Clinical Assessment of the Newborn","title":"Watch how to perform cranial ultrasonography study lecture","type":"video","video":"https://platform.thinkific.com/videoproxy/v1/play/brskbfcobr2ovlip0rp0","order":7},
    {"course":"SCAN Module 2 : Cranial Sonographic Clinical Assessment of the Newborn","title":"Recommended reading resources","type":"text","content":"<p><a href=\"https://payhip.com/b/619EI\">Neonatal Cranial Ultrasound interactive software</a></p><p><a href=\"https://www.springer.com/gp/book/9783642213205\">Neonatal Cranial ultrasonography textbook</a></p>","order":8},
    {"course":"SCAN Module 2 : Cranial Sonographic Clinical Assessment of the Newborn","title":"Please answer the final quizzes. You need to score at least 90%","type":"quiz","quiz":46239825,"order":9},
    {"course":"SCAN Module 2 : Cranial Sonographic Clinical Assessment of the Newborn","title":"Sign off sheet and files upload link","type":"text","content":"<p>Download the image quality form: <a href=\"https://s3.amazonaws.com/thinkific/file_uploads/278624/attachments/497/ff1/b95/POCUS_assessment_form.pdf\">POCUS assessment form.pdf</a></p><p>Upload screenshots of the study and evaluation form: <a href=\"https://docs.google.com/forms/d/e/1FAIpQLSfPC1VXJzvPL66hZ6kEfQHCQrxmXE7b3_mw1l38UtW3cGKrbQ/viewform?usp=publish-editor\">upload form</a></p>","order":10},

    {"course":"Lung Sonographic Clinical Assessment of the Newborn","title":"Basics of lung ultrasound","type":"video","video":"https://platform.thinkific.com/videoproxy/v1/play/cco55pdbtlgb9cji4l50","order":1},
    {"course":"Lung Sonographic Clinical Assessment of the Newborn","title":"Advanced lung ultrasound","type":"video","video":"https://platform.thinkific.com/videoproxy/v1/play/cco564143s1n6hm1nk9g","order":2},
    {"course":"Lung Sonographic Clinical Assessment of the Newborn","title":"Upload your cases by clicking on this link","type":"text","content":"<p><a href=\"https://docs.google.com/forms/d/e/1FAIpQLSfPC1VXJzvPL66hZ6kEfQHCQrxmXE7b3_mw1l38UtW3cGKrbQ/viewform?usp=publish-editor\">Upload your cases</a></p>","order":3},

    {"course":"Ultrasound Guided Sonographic clinical Assessment of the Newborn procedures","title":"Introduction and orientation","type":"text","content":"<p>Welcome to the Post Hemorrhagic Ventricular Dilatation diagnosis and management. You will learn about the diagnosis and management of PHVD, reservoir insertion, tapping, and post tapping care</p><p>To get your certificate of competency follow these steps:</p><p>Lesson1: Watch Preterm brain injury lecture</p><p>Lesson 2: Watch Posthemorrhagic Ventricular dilatation diagnosis and management lecture</p><p>Lesson 3: Watch reservoir insertion video</p><p>Lesson 4: Watch reservoir tapping video</p><p>Lesson 5: Answer the MCQs</p><p>Once you finish the online module, you can perform just in time training before performing the tap in the unit</p><p>Do the first reservoir tap under supervision and get your supervisor to sign off your skill.</p><p>Here is a video of <a href=\"\">how to create your own reservoir tapping simulator</a></p><p>Specific objectives:</p><p><strong>Lesson1:</strong> Pre-term Brain Injury Lecture</p><p>Speaker: Dr. Hussein Zein</p><p><strong>Objectives:</strong></p><ol><li>Explain the normal brain anatomy on ultrasound</li><li>Explain the classic preterm brain injury on ultrasound</li></ol><p><strong>Lesson 2:</strong> Post Hemorrhagic Ventricular Dilatation in Preterm Infants</p><p>Speaker: Dr. Lara Leijser</p><p><strong>Objectives:</strong></p><ol><li>Explain different methods and definitions of ventricular dilatation</li><li>Explain different approaches to PHVD</li></ol><p><strong>Lesson 3:</strong> Reservoir Tapping video:</p><p><strong>Objective:</strong></p><ol><li>Demonstrate the correct technique of Reservoir tapping</li></ol>","order":1},
    {"course":"Ultrasound Guided Sonographic clinical Assessment of the Newborn procedures","title":"Watch central lines placement assessment using ultrasound lecture","type":"video","video":"https://platform.thinkific.com/videoproxy/v1/play/cco53o943s1n6hm1nk70","order":2},
    {"course":"Ultrasound Guided Sonographic clinical Assessment of the Newborn procedures","title":"Watch Ultrasound guided procedures lecture","type":"video","video":"https://platform.thinkific.com/videoproxy/v1/play/cco54hh43s1n6hm1nk7g","order":3},
    {"course":"Ultrasound Guided Sonographic clinical Assessment of the Newborn procedures","title":"Watch ultrasound guided vascular access demo","type":"video","video":"https://platform.thinkific.com/videoproxy/v1/play/cia55nvnvu4mo5amjagg","order":4},
    {"course":"Ultrasound Guided Sonographic clinical Assessment of the Newborn procedures","title":"Watch reservoir insertion video","type":"video","video":"https://platform.thinkific.com/videoproxy/v1/play/btpp9veh0ra1r4jel05g","order":5},
    {"course":"Ultrasound Guided Sonographic clinical Assessment of the Newborn procedures","title":"Watch reservoir tapping video","type":"video","video":"https://platform.thinkific.com/videoproxy/v1/play/bv01fveje35bt9cjfv30","order":6},
    {"course":"Ultrasound Guided Sonographic clinical Assessment of the Newborn procedures","title":"Quiz part 1: Please answer the final quizzes. You need to score at least 90%","type":"quiz","quiz":46239833,"order":7},
    {"course":"Ultrasound Guided Sonographic clinical Assessment of the Newborn procedures","title":"Sign off sheet and files upload link","type":"text","content":"<p>Upload screenshots of the study you set up and the evaluation form here (<a href=\"https://www.dropbox.com/request/LYAsTpL3ohqESHAqNvWn\">click here to upload</a>).</p>","order":8},
    {"course":"Ultrasound Guided Sonographic clinical Assessment of the Newborn procedures","title":"Watch pericardiocentesis demo","type":"video","video":"https://platform.thinkific.com/videoproxy/v1/play/cia56c6glu5ucevr9kmg","order":9},
    {"course":"Ultrasound Guided Sonographic clinical Assessment of the Newborn procedures","title":"Upload your cases here","type":"text","content":"<p><a href=\"https://www.dropbox.com/request/DKgVTQWB3lmffffNK7qQ\">Upload your cases here</a></p>","order":10},

    {"course":"SANTS Cardiac Sonographic Clinical Assessment of the Newborn","title":"Introduction and Orientation","type":"text","content":"<p>Welcome to the Cardiac Sonographic Clinical Assessment of the Newborn (SCAN) course. The goal of this course is to standardize cardiac point of care ultrasound training for paediatric residents and neonatal-perinatal fellows.</p><p>This course is not meant to in any way replace the need for ultrasound technicians, radiologists and cardiologists. It is crucial to have the support from your radiology department to ensure back-up for your ultrasound technology, quality of ultrasound studies are up to standards, maintenance of your skills and help in decision making.</p><p>You can find a study conducted by this group showing the efficacy of this method:</p><p><a href=\"https://pubmed.ncbi.nlm.nih.gov/31876319/\">Point of care ultrasound study 1</a></p><p><a href=\"https://pubmed.ncbi.nlm.nih.gov/31578971/\">Point of care ultrasound study 2</a></p><p>To get your certificate of competency follow these steps:</p><p>Lesson 1: Watch basics of cardiac ultrasonography lecture</p><p>Lesson 2: Watch Hypovolemia and Systemic perfusion lecture</p><p>Lesson 3: Answer the MCQs</p><p>Once you finish the online module, either attend one of our hands-on workshops or ask your radiologist or neonatologist with expertise in point of care ultrasonography to demonstrate performing cardiac, line placement, and bladder assessment ultrasonography to you.</p><p>Final step is to perform 5 full studies for each skill by yourself and upload (de-identified) images/clips to the file upload link for scoring, or get your radiologist/neonatologist to score your studies using the scoring form at the end of this course.</p><p>The signing sheet and file uploading link are at the end of this course.</p>","order":1},
    {"course":"SANTS Cardiac Sonographic Clinical Assessment of the Newborn","title":"Watch basics of cardiac ultrasonography lecture","type":"video","video":"https://platform.thinkific.com/videoproxy/v1/play/cco50e943s1n6hm1nk4g","order":2},
    {"course":"SANTS Cardiac Sonographic Clinical Assessment of the Newborn","title":"Hypovolemia and systemic perfusion","type":"video","video":"https://platform.thinkific.com/videoproxy/v1/play/cco56vlbtlgb9cji4l8g","order":3},
    {"course":"SANTS Cardiac Sonographic Clinical Assessment of the Newborn","title":"Watch Knobology video","type":"video","video":"https://platform.thinkific.com/videoproxy/v1/play/brsk9smkg7cnqndqqt10","order":4},
    {"course":"SANTS Cardiac Sonographic Clinical Assessment of the Newborn","title":"Cardiac SCAN demonstration","type":"video","video":"https://platform.thinkific.com/videoproxy/v1/play/cj1db98e4124chetb300","caption":"The Thinkific source asset is archived; its original asset reference is preserved.","order":5},
    {"course":"SANTS Cardiac Sonographic Clinical Assessment of the Newborn","title":"Cardiac SCAN quizzes: Please answer the final quizzes. You need to score at least 90%","type":"quiz","quiz":47131497,"order":6},
    {"course":"SANTS Cardiac Sonographic Clinical Assessment of the Newborn","title":"Sign off sheet and files upload link","type":"text","content":"<p>Upload screenshots of the study you set up and the evaluation form here (<a href=\"https://www.dropbox.com/request/LYAsTpL3ohqESHAqNvWn\">click here to upload</a>).</p>","order":7}
  ]$json$::jsonb;
begin
  for c in select value from jsonb_array_elements(courses) loop
    select id into cid from public.courses where title=c->>'title' order by created_at limit 1;
    if cid is null then
      insert into public.courses(title,description,cover_url,sort_order,published,enrollment_required,self_enroll,visibility)
      values(c->>'title',c->>'description',c->>'cover',(c->>'order')::int,true,true,false,'published') returning id into cid;
    else
      update public.courses set description=c->>'description',cover_url=c->>'cover',published=true,visibility='published',enrollment_required=true where id=cid;
    end if;
    select id into mid from public.modules where course_id=cid and title=c->>'chapter' order by created_at limit 1;
    if mid is null then insert into public.modules(course_id,title,sort_order) values(cid,c->>'chapter',1) returning id into mid; end if;
  end loop;

  for l in select value from jsonb_array_elements(lessons) loop
    select id into cid from public.courses where title=l->>'course' order by created_at limit 1;
    select id into mid from public.modules where course_id=cid order by sort_order,created_at limit 1;
    select id into lid from public.lessons where module_id=mid and title=l->>'title' order by created_at limit 1;
    if lid is null then
      insert into public.lessons(module_id,title,content,video_url,file_url,external_url,caption,lesson_type,sort_order,quiz_pass_percent,quiz_pass_required,thinkific_quiz_id)
      values(mid,l->>'title',l->>'content',l->>'video',l->>'file',l->>'external',l->>'caption',l->>'type',(l->>'order')::int,case when l->>'type'='quiz' then 90 else 70 end,l->>'type'='quiz',nullif(l->>'quiz','')::bigint) returning id into lid;
    else
      update public.lessons set content=l->>'content',video_url=l->>'video',file_url=l->>'file',external_url=l->>'external',caption=l->>'caption',lesson_type=l->>'type',sort_order=(l->>'order')::int,quiz_pass_percent=case when l->>'type'='quiz' then 90 else quiz_pass_percent end,quiz_pass_required=l->>'type'='quiz',thinkific_quiz_id=nullif(l->>'quiz','')::bigint where id=lid;
    end if;
  end loop;

  -- Questions are inserted below from an exact JSON transcription of Thinkific.
end $scan$;

-- The question payload and bundle link are kept in a second block to make review straightforward.
do $scan_quizzes$
declare q jsonb; x jsonb; lid uuid; opts jsonb; corr jsonb; idx int;
  payload jsonb := $json$[
    {"quiz":46239825,"questions":[
      ["What is the name of this view?",["Parasagittal","Anterior coronal","Posterior coronal","Mid-coronal","Mid-sagittal","Mastoid view"],3,"https://files.cdn.thinkific.com/file_uploads/278624/images/1a0/d26/b76/image_1.jpg"],
      ["What is the name of this view?",["Parasagittal","Anterior coronal","Posterior coronal","Mid-coronal","Mid-sagittal","Mastoid view"],5,"https://files.cdn.thinkific.com/file_uploads/278624/images/785/e87/b5a/image_2.jpg"],
      ["What is the name of this view?",["Parasagittal","Anterior coronal","Posterior coronal","Mid-coronal","Mid-sagittal","Mastoid view"],1,"https://files.cdn.thinkific.com/file_uploads/278624/images/8c9/6af/85d/image_4.jpg"],
      ["What is the name of this view?",["Parasagittal","Anterior coronal","Posterior coronal","Mid-coronal","Mid-sagittal","Mastoid view"],6,"https://files.cdn.thinkific.com/file_uploads/278624/images/1b9/d5a/165/Cerebellar_hemorrhage_.jpg"],
      ["What are the bilateral bright structures in the image?",["Grade II IVH","Choroid plexuses","Germinal matrix","Grade III IVH","Grade I IVH"],2,"https://files.cdn.thinkific.com/file_uploads/278624/images/e96/907/dca/image_1.jpg"],
      ["What is the bright structure in the image that the arrow points at?",["Grade II IVH","Choroid plexuses","Germinal matrix","Grade III IVH","Grade I IVH"],5,"https://files.cdn.thinkific.com/file_uploads/278624/images/5cb/460/6c0/image_5.gif"],
      ["What is the name of the marked structure?",["Anterior cerebral artery","Caudo-thalamic notch","Corpus callosum","Choroid plexus"],3,"https://files.cdn.thinkific.com/file_uploads/278624/images/20b/666/ecb/Slide1.GIF"],
      ["What is the name of the marked structure?",["Third ventricle","Foramen of Monro","Anterior horn of the lateral ventricle","Cavum septum pellucidum","Sylvian fissure","Corpus callosum"],3,"https://files.cdn.thinkific.com/file_uploads/278624/images/07a/101/a3e/Slide3.JPG"],
      ["What is the name of the marked structure?",["Third ventricle","Foramen of Monro","Anterior horn of the lateral ventricle","Cavum septum pellucidum","Sylvian fissure","Corpus callosum"],4,"https://files.cdn.thinkific.com/file_uploads/278624/images/e80/432/416/Slide4.JPG"],
      ["What is the name of the marked structure?",["Third ventricle","Foramen of Monro","Anterior horn of the lateral ventricle","Cavum septum pellucidum","Sylvian fissure","Corpus callosum"],1,"https://files.cdn.thinkific.com/file_uploads/278624/images/4b7/286/81f/Slide5.JPG"],
      ["What is the name of the marked structure?",["Third ventricle","Foramen of Monro","Anterior horn of the lateral ventricle","Cavum septum pellucidum","Sylvian fissure","Corpus callosum"],5,"https://files.cdn.thinkific.com/file_uploads/278624/images/f6b/70c/cac/image_12.jpg"],
      ["What is the name of the marked structure?",["Third ventricle","Foramen of Monro","Anterior horn of the lateral ventricle","Cavum septum pellucidum","Sylvian fissure","Corpus callosum"],6,"https://files.cdn.thinkific.com/file_uploads/278624/images/ec6/c6b/6bb/image_13.jpg"],
      ["What is the indicated structure?",["Caudate nucleus","Caudo-thalamic notch","Thalamus","Choroid plexus","Lateral ventricle","Third ventricle"],1,"https://files.cdn.thinkific.com/file_uploads/278624/images/0c1/e22/4c7/Slide1.JPG"],
      ["What is the indicated structure?",["Caudate nucleus","Caudo-thalamic notch","Thalamus","Choroid plexus","Lateral ventricle","Third ventricle"],2,"https://files.cdn.thinkific.com/file_uploads/278624/images/b4c/5bb/7e8/Slide2.JPG"],
      ["What is the indicated structure?",["Caudate nucleus","Caudo-thalamic notch","Thalamus","Choroid plexus","Lateral ventricle","Third ventricle"],4,"https://files.cdn.thinkific.com/file_uploads/278624/images/fd9/643/5fb/Slide3.JPG"],
      ["What is the indicated structure?",["Caudate nucleus","Caudo-thalamic notch","Thalamus","Choroid plexus","Lateral ventricle","Third ventricle"],3,"https://files.cdn.thinkific.com/file_uploads/278624/images/999/eb4/67b/Slide5.JPG"],
      ["What is the indicated structure?",["Caudate nucleus","Caudo-thalamic notch","Thalamus","Choroid plexus","Lateral ventricle","Third ventricle"],5,"https://files.cdn.thinkific.com/file_uploads/278624/images/e92/924/f36/Slide4.JPG"],
      ["On day 5 of life the cranial ultrasound showed this image. What type of brain injury is this?",["Grade I IVH","Grade II IVH","Grade III IVH","Periventricular hemorrhagic infarction","Cerebellar hemorrhage"],3,"https://files.cdn.thinkific.com/file_uploads/278624/images/088/fab/18e/grade_III.jpg"],
      ["On day 21 from birth cranial US showed this image. What is the diagnosis?",["Grade IV IVH","Cystic white matter injury","Posthemorrhagic ventricular dilatation","Porencephalic cyst","Normal","Grade III IVH"],4,"https://files.cdn.thinkific.com/file_uploads/278624/images/aa8/31e/cd0/Slide1.JPG"],
      ["On day 5 of life the cranial US showed this image. What type of brain injury is this?",["Grade I IVH","Grade II IVH","Grade III IVH","Periventricular hemorrhagic infarction","Cerebellar hemorrhage"],2,"https://files.cdn.thinkific.com/file_uploads/278624/images/267/0e5/e3a/image_17.jpg"],
      ["On day 5 of life the cranial US showed this image. What type of brain injury is this?",["Grade I IVH","Grade II IVH","Grade III IVH","Periventricular hemorrhagic infarction","Cerebellar hemorrhage"],4,"https://files.cdn.thinkific.com/file_uploads/278624/images/2a2/c17/61d/Slide1.JPG"],
      ["On day 5 of life the cranial US showed this image. What type of brain injury is this?",["Grade I IVH","Grade II IVH","Grade III IVH","Periventricular hemorrhagic infarction","Cerebellar hemorrhage"],5,"https://files.cdn.thinkific.com/file_uploads/278624/images/218/1b8/3d8/Cerebellar_hemorrhage_.jpg"],
      ["On day 21 from birth cranial US showed this image. What is the diagnosis?",["Grade IV IVH","Cystic white matter injury","Posthemorrhagic ventricular dilatation","Porencephalic cyst","Normal","Grade III IVH"],2,"https://files.cdn.thinkific.com/file_uploads/278624/images/c8d/535/3dc/Slide2.JPG"],
      ["On day 21 from birth cranial US showed this image. What is the diagnosis?",["Grade IV IVH","Cystic white matter injury","Posthemorrhagic ventricular dilatation","Porencephalic cyst","Normal","Grade III IVH"],3,"https://files.cdn.thinkific.com/file_uploads/278624/images/ba7/ffb/0e9/Slide3.JPG"]
    ]},
    {"quiz":46239833,"questions":[
      ["Name the structure marked by the arrow",["Inferior Vena Cava","Right atrium","Liver","Hepatic vein"],4,"https://s3.amazonaws.com/thinkific/file_uploads/278624/images/168/eb5/1aa/Slide1.JPG"],
      ["Name the structure marked by the arrow",["Inferior Vena Cava","Right atrium","Liver","Hepatic vein"],1,"https://s3.amazonaws.com/thinkific/file_uploads/278624/images/aca/b8c/8d2/Slide2.JPG"],
      ["Name the structure marked by the arrow",["Inferior Vena Cava","Right atrium","Liver","Hepatic vein"],3,"https://s3.amazonaws.com/thinkific/file_uploads/278624/images/11a/5b8/69b/Slide3.JPG"],
      ["Name the structure marked by the arrow",["Left atrium","Right atrium","UVC","Aorta","Right ventricle"],4,"https://s3.amazonaws.com/thinkific/file_uploads/278624/images/c8b/b86/8bb/Slide4.JPG"],
      ["Name the structure marked by the arrow",["Left atrium","Right atrium","UVC","Aorta","Right ventricle"],5,"https://s3.amazonaws.com/thinkific/file_uploads/278624/images/ec0/625/4ee/Slide5.JPG"],
      ["Name the structure marked by the arrow",["Left atrium","Right atrium","UVC","Aorta","Right ventricle"],3,"https://s3.amazonaws.com/thinkific/file_uploads/278624/images/f7c/b94/281/Slide6.JPG"],
      ["What is your assessment regarding the structure the arrow points at?",["Normal","Pleural effusion","Cardiac tamponade","Poor cardiac filling"],3,"https://s3.amazonaws.com/thinkific/file_uploads/278624/images/c85/273/276/Slide7.JPG"],
      ["Where is the tip of the central line",["In the liver","Deep in the heart","At the entrance of the right atrium","In the left atrium"],3,"https://s3.amazonaws.com/thinkific/file_uploads/278624/images/66d/435/18b/Slide8.JPG"],
      ["Name the cardiac ultrasound view",["Apical 4 chambers","Parasternal long axis","Parasternal short axis","Subcostal","High parasternal aortic arch","Ductal"],4,"https://s3.amazonaws.com/thinkific/file_uploads/278624/images/0dd/263/619/sub.png"]
    ]},
    {"quiz":47131497,"questions":[
      ["What is INCORRECT regarding cardiac anatomy?",["The ventricles are inferior to the atria","Right heart structures are anterior to the left heart structures","Left atrium is the most posterior cardiac chamber","The aorta is the most anterior structure of the heart"],4,null],
      ["Which view is the standard view to obtain images of the persistent ductus arteriosus (PDA)?",["Crab view","High Parasternal","Subcostal","Apical"],2,null],
      ["Name the structure marked by the arrow",["Left atrium","Right atrium","UVC","Aorta","Right ventricle"],4,"https://files.cdn.thinkific.com/file_uploads/278624/images/c8b/b86/8bb/Slide4.JPG"],
      ["Name the structure marked by the arrow",["Left atrium","Right atrium","UVC","Aorta","Right ventricle"],5,"https://files.cdn.thinkific.com/file_uploads/278624/images/ec0/625/4ee/Slide5.JPG"],
      ["Name the structure marked by the arrow",["Left atrium","Right atrium","UVC","Aorta","Right ventricle"],3,"https://files.cdn.thinkific.com/file_uploads/278624/images/f7c/b94/281/Slide6.JPG"],
      ["What is your assessment regarding the structure the arrow points at?",["Normal","Pleural effusion","Cardiac tamponade","Poor cardiac filling"],3,"https://files.cdn.thinkific.com/file_uploads/278624/images/c85/273/276/Slide7.JPG"],
      ["Name the cardiac ultrasound view",["Apical 4 chambers","Parasternal long axis","Parasternal short axis","Subcostal","High parasternal aortic arch","Ductal"],1,"https://files.cdn.thinkific.com/file_uploads/278624/images/8d6/74d/63f/4chambers.png"],
      ["Name the cardiac ultrasound view",["Apical 4 chambers","Parasternal long axis","Parasternal short axis","Subcostal","High parasternal aortic arch","Ductal"],6,"https://files.cdn.thinkific.com/file_uploads/278624/images/0f9/460/8fd/ductal.png"],
      ["Name the cardiac ultrasound view",["Apical 4 chambers","Parasternal long axis","Parasternal short axis","Subcostal","High parasternal aortic arch","Ductal"],2,"https://files.cdn.thinkific.com/file_uploads/278624/images/22c/23e/1aa/LAX.png"],
      ["Name the cardiac ultrasound view",["Apical 4 chambers","Parasternal long axis","Parasternal short axis","Subcostal","High parasternal aortic arch","Ductal"],3,"https://files.cdn.thinkific.com/file_uploads/278624/images/ae5/b16/90d/SAX.jpg"],
      ["Name the cardiac ultrasound view",["Apical 4 chambers","Parasternal long axis","Parasternal short axis","Subcostal","High parasternal aortic arch","Ductal"],4,"https://files.cdn.thinkific.com/file_uploads/278624/images/0dd/263/619/sub.png"],
      ["Name the cardiac ultrasound view",["Apical 4 chambers","Parasternal long axis","Parasternal short axis","Subcostal","High parasternal aortic arch","Ductal"],5,"https://files.cdn.thinkific.com/file_uploads/278624/images/728/c44/85d/aorta.png"],
      ["What is your assessment based on this clip?",["Normal cardiac contractility","Poor cardiac contractility","Under-filled cardiac chambers"],1,"https://platform.thinkific.com/videoproxy/v1/play/cj1dgobcl2bl6o2jeuo0"],
      ["What is your assessment based on this clip?",["Good cardiac contractility","Poor cardiac contractility","Under-filled cardiac chambers"],2,"https://platform.thinkific.com/videoproxy/v1/play/cj1dqn433se9kpqn0ki0"]
    ]}
  ]$json$::jsonb;
begin
  for q in select value from jsonb_array_elements(payload) loop
    select id into lid from public.lessons where thinkific_quiz_id=(q->>'quiz')::bigint order by created_at limit 1;
    if lid is null then raise exception 'SCAN quiz lesson % not found',q->>'quiz'; end if;
    delete from public.quiz_questions where lesson_id=lid;
    idx:=0;
    for x in select value from jsonb_array_elements(q->'questions') loop
      select coalesce(jsonb_agg(jsonb_build_object('id',chr(96+ord::int),'text',value) order by ord),'[]'::jsonb)
        into opts from jsonb_array_elements_text(x->1) with ordinality a(value,ord);
      corr:=jsonb_build_array(chr(96+(x->>2)::int));
      insert into public.quiz_questions(lesson_id,question,question_html,qtype,options,correct,sort_order,image_url)
      values(lid,x->>0,
        '<p>'||case when x->>3 is null then '' when (x->>3) like '%videoproxy%' then '<iframe src="'||(x->>3)||'" allowfullscreen></iframe>' else '<img src="'||(x->>3)||'" alt="Question media">' end||'</p><p>'||(x->>0)||'</p>',
        'single',opts,corr,idx,x->>3);
      idx:=idx+1;
    end loop;
  end loop;
end $scan_quizzes$;

do $scan_bundle$
declare bid uuid; cid uuid; t text; n int:=0;
begin
  select id into bid from public.bundles where title='SCAN (Sonographic Clinical Assessment of the Newborn)' order by created_at limit 1;
  if bid is null then
    insert into public.bundles(title,description,cover_url,visibility,self_enroll,sort_order)
    values('SCAN (Sonographic Clinical Assessment of the Newborn)','Five-course neonatal point-of-care ultrasound pathway covering SCAN foundations, cranial, lung, procedures and cardiac assessment.','https://import.cdn.thinkific.com/429249/courses/2019819/48PZffSfqqDTw8qYNIJQ_Untitled%20design%20%2810%29.png','published',false,20) returning id into bid;
  else update public.bundles set description='Five-course neonatal point-of-care ultrasound pathway covering SCAN foundations, cranial, lung, procedures and cardiac assessment.',visibility='published' where id=bid; end if;
  foreach t in array array['Concept of SCAN and US physics','SCAN Module 2 : Cranial Sonographic Clinical Assessment of the Newborn','Lung Sonographic Clinical Assessment of the Newborn','Ultrasound Guided Sonographic clinical Assessment of the Newborn procedures','SANTS Cardiac Sonographic Clinical Assessment of the Newborn'] loop
    select id into cid from public.courses where title=t order by created_at limit 1;
    insert into public.bundle_courses(bundle_id,course_id) values(bid,cid) on conflict do nothing;
  end loop;
end $scan_bundle$;

-- Verification query: should return 5 courses, 34 lessons and 47 questions.
select b.title, count(distinct bc.course_id) courses, count(distinct l.id) lessons, count(distinct q.id) questions
from public.bundles b join public.bundle_courses bc on bc.bundle_id=b.id
join public.modules m on m.course_id=bc.course_id join public.lessons l on l.module_id=m.id
left join public.quiz_questions q on q.lesson_id=l.id
where b.title='SCAN (Sonographic Clinical Assessment of the Newborn)'
group by b.title;
