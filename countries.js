/* Shared country list (ISO 3166-1 alpha-2 code, name) + profession list.
   Used by login.html (request to join), people.html (add member / profile),
   and analytics.html (world map keys are ISO2 uppercase). */
window.COUNTRIES = [
["AF","Afghanistan"],["AL","Albania"],["DZ","Algeria"],["AR","Argentina"],["AM","Armenia"],
["AU","Australia"],["AT","Austria"],["AZ","Azerbaijan"],["BH","Bahrain"],["BD","Bangladesh"],
["BY","Belarus"],["BE","Belgium"],["BO","Bolivia"],["BA","Bosnia and Herzegovina"],["BR","Brazil"],
["BG","Bulgaria"],["KH","Cambodia"],["CM","Cameroon"],["CA","Canada"],["CL","Chile"],
["CN","China"],["CO","Colombia"],["CR","Costa Rica"],["HR","Croatia"],["CU","Cuba"],
["CY","Cyprus"],["CZ","Czechia"],["DK","Denmark"],["DO","Dominican Republic"],["EC","Ecuador"],
["EG","Egypt"],["SV","El Salvador"],["EE","Estonia"],["ET","Ethiopia"],["FI","Finland"],
["FR","France"],["GE","Georgia"],["DE","Germany"],["GH","Ghana"],["GR","Greece"],
["GT","Guatemala"],["HN","Honduras"],["HK","Hong Kong"],["HU","Hungary"],["IS","Iceland"],
["IN","India"],["ID","Indonesia"],["IR","Iran"],["IQ","Iraq"],["IE","Ireland"],
["IL","Israel"],["IT","Italy"],["JM","Jamaica"],["JP","Japan"],["JO","Jordan"],
["KZ","Kazakhstan"],["KE","Kenya"],["KW","Kuwait"],["LV","Latvia"],["LB","Lebanon"],
["LY","Libya"],["LT","Lithuania"],["LU","Luxembourg"],["MY","Malaysia"],["MT","Malta"],
["MX","Mexico"],["MD","Moldova"],["MA","Morocco"],["NP","Nepal"],["NL","Netherlands"],
["NZ","New Zealand"],["NG","Nigeria"],["MK","North Macedonia"],["NO","Norway"],["OM","Oman"],
["PK","Pakistan"],["PS","Palestine"],["PA","Panama"],["PY","Paraguay"],["PE","Peru"],
["PH","Philippines"],["PL","Poland"],["PT","Portugal"],["QA","Qatar"],["RO","Romania"],
["RU","Russia"],["SA","Saudi Arabia"],["RS","Serbia"],["SG","Singapore"],["SK","Slovakia"],
["SI","Slovenia"],["ZA","South Africa"],["KR","South Korea"],["ES","Spain"],["LK","Sri Lanka"],
["SD","Sudan"],["SE","Sweden"],["CH","Switzerland"],["SY","Syria"],["TW","Taiwan"],
["TZ","Tanzania"],["TH","Thailand"],["TN","Tunisia"],["TR","Turkey"],["UG","Uganda"],
["UA","Ukraine"],["AE","United Arab Emirates"],["GB","United Kingdom"],["US","United States"],["UY","Uruguay"],
["UZ","Uzbekistan"],["VE","Venezuela"],["VN","Vietnam"],["YE","Yemen"],["ZM","Zambia"],["ZW","Zimbabwe"]
];
window.PROFESSIONS = [
"Neonatologist","Pediatric / Child Neurologist","Neonatal-Perinatal Medicine Fellow",
"Neurology Fellow / Trainee","Resident Physician","Medical Student",
"Neonatal Nurse / NNP","Registered Nurse","Respiratory Therapist",
"Allied Health Professional","Researcher / Scientist","Sonographer / Imaging",
"Pharmacist","Educator / Faculty","Other"
];
window.countryName = (code) => { const c=(window.COUNTRIES||[]).find(x=>x[0]===code); return c?c[1]:(code||""); };
window.fillCountrySelect = (sel, selected) => {
  if(!sel) return;
  sel.innerHTML = '<option value="">— Select country —</option>' +
    (window.COUNTRIES||[]).map(([code,name])=>`<option value="${code}"${code===selected?' selected':''}>${name}</option>`).join("");
};
window.fillProfessionSelect = (sel, selected) => {
  if(!sel) return;
  sel.innerHTML = '<option value="">— Select profession —</option>' +
    (window.PROFESSIONS||[]).map(p=>`<option value="${p}"${p===selected?' selected':''}>${p}</option>`).join("");
};
