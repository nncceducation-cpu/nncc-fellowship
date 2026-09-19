/* Persistent NNCC portal navigation. Loaded after portal-auth.js. */
(function () {
  if (!window.NNCC || !NNCC.configured) return;
  const GROUPS = [
    { label:"Learn", items:[
      ["portal.html","⌂","Dashboard","Your overview and next steps",false,null],
      ["learning.html","▶","Courses","Modules, bundles and progress",false,"modules"],
      ["library.html","▤","Digital Library","Guides, media and downloads",false,"resources"],
      ["assistant.html","✦","Teaching Assistant","Ask and review course concepts",false,null]]},
    { label:"Community", items:[
      ["events.html","◷","Coaching & Webinars","Live teaching and registration",false,null],
      ["forum.html","◌","Members’ Forum","Questions and case discussion",false,"forum"]]},
    { label:"Account", items:[
      ["profile.html","○","My Profile","Details, interests and access",false,null]]},
    { label:"Administration", admin:true, items:[
      ["authoring.html","◇","Course Builder","Courses, lessons and quizzes",true,null],
      ["people.html","◎","People & Enrollments","Users, groups, email and certificates",true,null],
      ["memberships.html","▣","Memberships","Bundles and access packages",true,null],
      ["team.html","♙","Team & Roles","Staff permissions",true,null],
      ["analytics.html","▥","Analytics","Progress and outcomes",true,null],
      ["admin.html","⚙","Portal Administration","Resources and certificate design",true,null],
      ["settings.html","⌘","Settings","Site and communication settings",true,null]]}
  ];
  document.addEventListener("DOMContentLoaded", async () => {
    const here=(location.pathname.split("/").pop()||"portal.html").toLowerCase();
    const rail=document.createElement("aside"); rail.className="side-rail"; rail.setAttribute("aria-label","Portal navigation");
    rail.innerHTML=`<div class="rail-top"><a class="rail-brand" href="portal.html"><img class="mark" src="logo-nncc.png" alt=""><span><b>NNCC Portal</b><small>Learning centre</small></span></a><button class="rail-close" type="button" aria-label="Close navigation">×</button></div>
      <label class="rail-search"><span>⌕</span><input type="search" placeholder="Find a page…" aria-label="Find a portal page"></label>
      <nav>${GROUPS.map(g=>`<section class="rail-group" data-admin-group="${!!g.admin}"><h2>${g.label}</h2>${g.items.map(([h,ic,l,d,adm,acc])=>`<a href="${h}" data-adm="${adm}" data-acc="${acc||""}" data-search="${(l+" "+d+" "+g.label).toLowerCase()}" class="${h===here?"active":""}" ${h===here?'aria-current="page"':''}><span class="ri">${ic}</span><span class="rail-copy"><b>${l}</b><small>${d}</small></span><span class="rail-arrow">›</span></a>`).join("")}</section>`).join("")}</nav>
      <div class="rail-empty" hidden>No matching page</div>
      <div class="rail-foot"><div class="rail-avatar" id="rail-avatar">N</div><div class="rail-identity"><b id="rail-user">Member</b><small id="rail-role">NNCC learner</small></div><a href="#" id="rail-signout" title="Sign out" aria-label="Sign out">↗</a></div>`;
    document.body.appendChild(rail); document.body.classList.add("has-rail");
    const shade=document.createElement("button"); shade.className="rail-shade"; shade.setAttribute("aria-label","Close navigation"); document.body.appendChild(shade);
    const toggle=document.createElement("button"); toggle.className="rail-toggle"; toggle.type="button"; toggle.setAttribute("aria-label","Open portal navigation"); toggle.innerHTML='<span>☰</span><b>Menu</b>'; document.body.appendChild(toggle);
    const open=()=>{rail.classList.add("open");shade.classList.add("open");toggle.setAttribute("aria-expanded","true");};
    const close=()=>{rail.classList.remove("open");shade.classList.remove("open");toggle.setAttribute("aria-expanded","false");};
    toggle.addEventListener("click",open); shade.addEventListener("click",close); rail.querySelector(".rail-close").addEventListener("click",close); document.addEventListener("keydown",e=>{if(e.key==="Escape")close();}); rail.querySelectorAll("nav a").forEach(a=>a.addEventListener("click",close));
    const search=rail.querySelector(".rail-search input"), empty=rail.querySelector(".rail-empty");
    search.addEventListener("input",()=>{const q=search.value.trim().toLowerCase();let shown=0;rail.querySelectorAll("nav a").forEach(a=>{const yes=!q||a.dataset.search.includes(q);a.hidden=!yes;if(yes)shown++;});rail.querySelectorAll(".rail-group").forEach(g=>g.hidden=![...g.querySelectorAll("a")].some(a=>!a.hidden));empty.hidden=!!shown;});
    rail.querySelector("#rail-signout").addEventListener("click",async e=>{e.preventDefault();await NNCC.signOut();location.href="login.html";});
    try{const p=await NNCC.profile();if(p){const name=p.full_name||p.email||"Member",admin=p.role==="admin";rail.querySelector("#rail-user").textContent=name;rail.querySelector("#rail-role").textContent=admin?"Portal administrator":"NNCC learner";rail.querySelector("#rail-avatar").textContent=name.trim().charAt(0).toUpperCase()||"N";rail.querySelectorAll('[data-adm="true"]').forEach(a=>{if(!admin)a.remove();});if(!admin)rail.querySelectorAll('[data-acc]').forEach(a=>{const area=a.dataset.acc;if(area&&p["acc_"+area]===false)a.remove();});rail.querySelectorAll(".rail-group").forEach(g=>{if(!g.querySelector("a"))g.remove();});}}catch(_){}
  });
})();
