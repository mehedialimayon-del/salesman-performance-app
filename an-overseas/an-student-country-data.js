/* A&N International Student Planning - sourced country policy registry.
   Snapshot 05 November 2026. NOT legal advice, employment guarantee, admission offer or real-time quote.
   Country-wide examples must never be presented as institution-specific promises. */
(function(){
'use strict';
const currencies={
 Malaysia:['MYR','Malaysian Ringgit'], 'United Kingdom':['GBP','British Pound Sterling'],
 Canada:['CAD','Canadian Dollar'],Australia:['AUD','Australian Dollar'],
 'South Korea':['KRW','South Korean Won'],China:['CNY','Chinese Yuan Renminbi'],
 Japan:['JPY','Japanese Yen'],Germany:['EUR','Euro'],'United States':['USD','United States Dollar'],
 'New Zealand':['NZD','New Zealand Dollar'],Ireland:['EUR','Euro'],
 France:['EUR','Euro'],Italy:['EUR','Euro'],Netherlands:['EUR','Euro'],Sweden:['SEK','Swedish Krona'],
 Finland:['EUR','Euro'],Singapore:['SGD','Singapore Dollar'],
 'United Arab Emirates':['AED','United Arab Emirates Dirham'],Turkey:['TRY','Turkish Lira'],
 Thailand:['THB','Thai Baht'],Austria:['EUR','Euro'],Belgium:['EUR','Euro'],
 'Czech Republic':['CZK','Czech Koruna'],Denmark:['DKK','Danish Krone'],
 Greece:['EUR','Euro'],Hungary:['HUF','Hungarian Forint'],Luxembourg:['EUR','Euro'],
 Norway:['NOK','Norwegian Krone'],Poland:['PLN','Polish Zloty'],Portugal:['EUR','Euro'],
 Spain:['EUR','Euro'],Switzerland:['CHF','Swiss Franc']
};
// Approximate cross-rate derived from the published Alliance Bank Malaysia 05 Nov 2026
// foreign exchange bid / ask table. Cross rates are estimates, not cash remittance quotes.
// MYR / 100 BDT rate ≈ midpoint (3.7110 + 2.9550)/2 = 3.3330.
const midMYR={
 MYR:1,GBP:(5.603+5.345)/2,CAD:(2.986+2.839)/2,AUD:(2.926+2.777)/2,
 CNY:(0.632+0.574)/2,JPY:(0.02648+0.02493)/2,EUR:(4.670+4.461)/2,
 USD:(4.150+3.980)/2,NZD:(2.351+2.225)/2,SEK:(0.4446+0.3857)/2,
 SGD:(3.243+3.112)/2,AED:(1.151+1.075)/2,THB:(0.1309+0.1104)/2,
 DKK:(0.6415+0.5821)/2,NOK:(0.464+0.4045)/2,CHF:(5.075+4.880)/2
};
const bdtCross={};Object.keys(midMYR).forEach(key=>bdtCross[key]=midMYR[key]*100/3.333);
// 05 Nov 2026 indicative mid-market BDT rates for currencies absent from the Malaysian bank table (Currency World / published historical observations).
Object.assign(bdtCross,{KRW:0.09265,TRY:2.487,PLN:31.953,CZK:5.756,HUF:0.386573});
const fxSource='https://www.allianceonline.com.my/personal/rate_charges/foreign_exchange_rate_kiosk_view.do';
const common={
 work:'Work conditions depend on your visa category, institution and approved employment. Do not assume a part-time job is automatically permitted.',
 workUrl:'',
 spouse:'A spouse/partner permit is not guaranteed. Eligibility depends on programme, visa, marriage documentation and funds; verify the official immigration route.',
 spouseUrl:'',
 pr:'Student status or graduation alone does not grant permanent residence. A separate post-study/work/family route may exist.',
 prUrl:'',
 living:null, livingType:'Budget scenario — not a quoted city living cost',livingUrl:'',
 research:'Check university graduate-school research groups, supervisors, funded projects and assistantships. Research vacancies and PhD scholarships require individual applications.',
 scholarship:'Check university international scholarships, government grants and programme-specific research assistantships. No scholarship is promised.',
 scholarshipUrl:'',
 visaUrl:'',
 jobsUrl:'',
};
const policy={
 'Malaysia':{
 work:'A valid university Student Pass does not grant unrestricted work. Immigration approval is required; the stated limit is 20 hours/week in approved sectors, with break-period conditions explained by EMGS. Verify both current Immigration and EMGS instructions.',
 workUrl:'https://www.imi.gov.my/index.php/en/main-services/pass/student-pass/',
 spouse:'Eligible postgraduate students may apply to bring qualifying dependants under Immigration rules. Student Pass dependants are not permitted to work on their dependant status.',
 spouseUrl:'https://www.imi.gov.my/index.php/en/main-services/pass/student-pass/',
 pr:'A Malaysian Student Pass is temporary and does not itself lead to PR. An appropriate independent immigration status and approval are required.',
 prUrl:'https://www.imi.gov.my/',
 visaUrl:'https://visa.educationmalaysia.gov.my/',
 scholarshipUrl:'https://educationmalaysia.gov.my/',
 living:[1200,2500],livingType:'Illustrative monthly student budget, NOT an official university quote',livingUrl:'https://educationmalaysia.gov.my/'
 },
 'United Kingdom':{
 work:'Eligible degree-level Student visa holders at a qualifying sponsor may work up to 20 hours/week during term and full-time outside term; other course categories have different conditions.',
 workUrl:'https://www.gov.uk/guidance/immigration-rules/immigration-rules-appendix-student',
 spouse:'For courses starting from January 2024, most taught Master’s students cannot bring dependants through the Student route. Doctoral/research higher degrees and some government-sponsored students may qualify. Partner work restrictions depend on the dependant visa.',
 spouseUrl:'https://www.gov.uk/student-visa/family-members',
 pr:'An eligible Graduate visa is temporary, not settlement. Qualifying non-doctoral graduates applying on/after 1 Jan 2027 get 18 months; doctorates receive 3 years. Longer-term stay usually requires a different route.',
 prUrl:'https://www.gov.uk/graduate-visa',
 visaUrl:'https://www.gov.uk/student-visa',
 scholarshipUrl:'https://www.chevening.org/scholarships/',
 living:[1171,1529],livingType:'UK visa maintenance benchmark: outside London / London, NOT individual monthly rent',livingUrl:'https://www.gov.uk/student-visa/money'
 },
 'Canada':{
 work:'Eligible international students may work up to 24 hours/week off campus during regular academic sessions, and full time during qualifying scheduled breaks. Permit/course restrictions apply.',
 workUrl:'https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/work-off-campus.html',
 spouse:'An open work permit for a spouse may be available where the student is on a qualifying Master’s (at least 16 months), PhD or eligible professional programme. It is NOT automatic for all students.',
 spouseUrl:'https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/help-your-spouse-common-law-partner-work-canada.html',
 pr:'Some graduates may qualify for a post-graduation work permit and, separately, an economic immigration pathway. Neither degree nor PGWP guarantees PR.',
 prUrl:'https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/after-graduation.html',
 visaUrl:'https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html',
 scholarshipUrl:'https://www.educanada.ca/scholarships-bourses/index.aspx?lang=eng',
 living:[1954,1954],livingType:'2026 proof-of-funds living benchmark outside Quebec: CAD 23,448/year ÷12, excluding tuition/travel; not an actual expense guarantee',livingUrl:'https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/get-documents/financial-support.html'
 },
 'Australia':{
 work:'Standard student visa subclass 500: up to 48 hours/fortnight while course is in session and unlimited during scheduled breaks. Master’s by research/PhD holders have different work entitlements.',
 workUrl:'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500',
 spouse:'Family inclusion rules changed on 2 Oct 2026: family can be included only where an exemption applies, and cannot simply be added later. Where allowed, partner work hours depend on the principal student’s course and visa conditions.',
 spouseUrl:'https://www.studyaustralia.gov.au/en/plan-your-move/your-guide-to-visas/student-visa-subclass-500',
 pr:'Post-study visa or skilled migration depends on the current visa rules, qualifications, occupation and assessment. Student visa alone never promises PR.',
 prUrl:'https://immi.homeaffairs.gov.au/visas/working-in-australia',
 visaUrl:'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500',
 scholarshipUrl:'https://www.studyaustralia.gov.au/en/plan-your-studies/scholarships',
 living:[2000,3500],livingType:'Planning scenario only — verify local city costs and the current official financial-capacity threshold',
 livingUrl:'https://www.studyaustralia.gov.au/en/life-in-australia/living-and-education-costs'
 },
 'Germany':{
 work:'Eligible non-EU students may generally work 140 full days or 280 half-days/year, or within the 20-hour/week framework, subject to visa conditions.',
 workUrl:'https://www.make-it-in-germany.com/en/visa-residence/types/studying',
 spouse:'Family reunion may be possible subject to residence duration, accommodation, funds and other requirements; family work rights depend on the issued permit.',
 spouseUrl:'https://www.make-it-in-germany.com/en/living-in-germany/family-life/spouses-joining',
 pr:'Graduates may qualify for a job-seeking residence route; permanent settlement requires an independent immigration category and qualifying residence/work history.',
 prUrl:'https://www.make-it-in-germany.com/en/visa-residence/living-permanently/settlement-permit',
 scholarshipUrl:'https://www.daad.de/en/studying-in-germany/scholarships/',
 visaUrl:'https://www.make-it-in-germany.com/en/visa-residence/types/studying',
 living:[900,1200],livingType:'DAAD student monthly living cost range, varies by city',livingUrl:'https://www.daad.de/en/studying-in-germany/living-in-germany/finances/'
 },
 'New Zealand':{
 work:'Eligible student visas issued under current conditions may allow up to 25 hours/week while studying and full-time in qualifying holidays; check the individual eVisa.',
 workUrl:'https://www.immigration.govt.nz/study/once-you-have-a-student-visa/working-on-a-student-visa/',
 spouse:'A partner applies for a separate, relationship-based visa. Eligibility for an open work visa depends on the type and level of the student’s qualification.',
 spouseUrl:'https://www.immigration.govt.nz/',
 pr:'Eligible graduates may seek a Post Study Work Visa, but residence requires meeting a distinct residence pathway.',
 prUrl:'https://www.immigration.govt.nz/',
 visaUrl:'https://www.immigration.govt.nz/visas/fee-paying-student-visa/',
 scholarshipUrl:'https://www.nzscholarships.govt.nz/',
 living:[1700,2600],livingType:'Illustrative monthly planning allowance; obtain university/city quotes'
 },
 'France':{
 work:'Qualifying non-EU students with a valid student residence permit/VLS-TS may work up to 964 hours/year, not an unrestricted 20-hour guarantee.',
 workUrl:'https://www.campusfrance.org/en/working-student',
 spouse:'Family reunion/residence status and work rights require a separate immigration assessment; do not assume immediate dependant work permission.',
 spouseUrl:'https://france-visas.gouv.fr/',
 visaUrl:'https://france-visas.gouv.fr/',
 scholarshipUrl:'https://www.campusfrance.org/en/bursaries-foreign-students',
 living:[850,1400],livingType:'Provisional student planning scenario; Paris is generally more costly'
 },
 'Netherlands':{
 work:'For eligible non-EU student residence holders, an employer normally needs a TWV work permit. Choose up to 16 hours/week or full-time work in June–August.',
 workUrl:'https://ind.nl/en/residence-permits/study/student-residence-permit-for-university-or-higher-professional-education',
 spouse:'A partner may qualify for a residence permit but work conditions must be checked on the issued permit, not assumed.',
 spouseUrl:'https://ind.nl/en/residence-permits/family-and-partner',
 pr:'Eligible graduates may qualify for an orientation-year permit; PR is a separate application and is not granted merely for graduating.',
 prUrl:'https://ind.nl/en/residence-permits/work/residence-permit-for-orientation-year',
 visaUrl:'https://ind.nl/en/residence-permits/study/student-residence-permit-for-university-or-higher-professional-education',
 scholarshipUrl:'https://www.studyinnl.org/finances',
 living:[1000,1700],livingType:'Provisional monthly planning allowance, city-dependent'
 },
 'Sweden':{
 work:'For Bachelor/Master permits granted on or after 11 June 2026, standard work limit is 15 hours/week during academic terms, with listed exemptions including summer months and certain university duties.',
 workUrl:'https://www.migrationsverket.se/en/you-want-to-apply/study/higher-education',
 spouse:'Family may apply with the main student subject to qualifying residence, maintenance and relationship evidence; check family employment conditions independently.',
 spouseUrl:'https://www.migrationsverket.se/en/you-want-to-apply/study/higher-education',
 visaUrl:'https://www.migrationsverket.se/en/you-want-to-apply/study/higher-education',
 scholarshipUrl:'https://si.se/en/apply/scholarships/',
 living:[10000,16000],livingType:'Illustrative monthly planning allowance, not an official city quotation'
 },
 'Ireland':{
 work:'Eligible Stamp 2 students may work up to 20 hours/week in term and 40 hours/week during the authorised holiday periods.',
 workUrl:'https://www.irishimmigration.ie/registering-your-immigration-permission/information-on-registering/immigration-permission-stamps/',
 spouse:'Ordinary international students are typically not allowed to bring family under the study route; exceptional cases are assessed individually.',
 spouseUrl:'https://www.irishimmigration.ie/coming-to-study-in-ireland/frequently-asked-questions-for-students/',
 pr:'Stamp 2 student time does not count toward Irish naturalisation reckonable residence; a qualifying later permission may.',
 prUrl:'https://www.irishimmigration.ie/',
 visaUrl:'https://www.irishimmigration.ie/coming-to-study-in-ireland/',
 scholarshipUrl:'https://hea.ie/policy/internationalisation/goi-ies/',
 living:[1100,1900],livingType:'Illustrative monthly planning budget; Dublin varies substantially'
 },
 'South Korea':{
 work:'Part-time employment for D-2/D-4 students requires immigration permission and may depend on Korean language skill, degree level and institution. Do NOT assume fixed universal hours.',
 workUrl:'https://www.studyinkorea.go.kr/ko/work/aboutForeignerEmploymentSystem.do?tab=part-time',
 visaUrl:'https://www.studyinkorea.go.kr/',
 scholarshipUrl:'https://www.studyinkorea.go.kr/',
 living:[800000,1500000],livingType:'Illustrative monthly allowance; regional living costs vary'
 },
 'United States':{
 work:'F-1 off-campus work generally needs specific authorisation; do not treat ordinary employment as automatically allowed. On-campus limits and CPT/OPT rules depend on study status.',
 workUrl:'https://www.uscis.gov/working-in-the-united-states/students-and-exchange-visitors/students-and-employment',
 spouse:'F-2 spouses cannot work in F-2 status. Other dependent categories vary; check USCIS.',
 spouseUrl:'https://www.uscis.gov/',
 pr:'F-1 study and post-completion OPT do not confer permanent residence. Any immigrant petition uses a separate statutory route.',
 prUrl:'https://www.uscis.gov/green-card',
 visaUrl:'https://travel.state.gov/content/travel/en/us-visas/study/student-visa.html',
 scholarshipUrl:'https://educationusa.state.gov/your-5-steps-us-study/finance-your-studies',
 living:[1400,2800],livingType:'Illustrative monthly budget; metropolitan cost varies greatly'
 },
 'Japan':{
 work:'Students must obtain permission for activities outside student status; common part-time limits are 28 hours/week during term. Confirm current student immigration rules and permitted activities.',
 workUrl:'https://www.studyinjapan.go.jp/en/life/part-time-jobs/',
 scholarshipUrl:'https://www.studyinjapan.go.jp/en/planning/scholarships/',
 visaUrl:'https://www.studyinjapan.go.jp/en/planning/immigration-procedures/',
 living:[100000,160000],livingType:'Illustrative monthly planning range; verify city and university dorm rates'
 },
 'Singapore':{
 work:'Student’s Pass work permission depends on whether the institution/course meets Ministry of Manpower criteria; confirm before accepting employment.',
 workUrl:'https://www.mom.gov.sg/passes-and-permits/work-pass-exemption-for-foreign-students',
 visaUrl:'https://www.ica.gov.sg/information-and-e-services/long-term-visit-and-study/student-s-pass',
 living:[1400,2600],livingType:'Illustrative monthly planning range'
 }
};
const defaultLiving={
 'China':[2500,4500],'Austria':[950,1500],'Belgium':[950,1500],'Czech Republic':[14000,26000],
 'Denmark':[7500,12500],'Finland':[800,1400],'Greece':[650,1100],'Hungary':[180000,350000],
 'Italy':[800,1450],'Luxembourg':[1200,2200],'Norway':[12000,19000],
 'Poland':[2200,4200],'Portugal':[700,1250],'Spain':[800,1450],
 'Switzerland':[1600,2500],'Thailand':[15000,30000],'Turkey':[14000,28000],
 'United Arab Emirates':[2500,5500]
};
const sourceNote='Country-wide guidance, last checked 05 Nov 2026. Immigration rules may change and individual visa conditions control. Approximate budgets are NOT admission/visa quotes.';
const get=country=>{
 const curr=currencies[country]||['','Local currency – verify official code'];
 const p=policy[country]||{},base=Object.assign({},common,p);
 return Object.assign(base,{country,currency:curr[0],currencyName:curr[1],
 living:base.living||defaultLiving[country]||null,
 livingType:base.livingType===common.livingType&&!p.livingType?'Illustrative student budget range; verify campus-city accommodation and daily costs':base.livingType});
};
const cash=(amount,code)=>Number.isFinite(Number(amount))?Number(amount).toLocaleString('en-US',{maximumFractionDigits:0})+' '+code:'Not verified';
const bdt= (amount,code)=>{
 const rate=bdtCross[code];if(!rate||!Number.isFinite(Number(amount)))return '(৳ conversion needs a verified rate)';
 return '(≈ ৳'+(Math.round(amount*rate/100)*100).toLocaleString('en-US')+')';
};
const withBdt=(amount,code)=>cash(amount,code)+' '+bdt(amount,code);
window.ANStudyCountry={get,currencies,policy,bdtCross,fxSource,secondaryFxSource:'https://currency.world/exchange_rates/BDT',cash,bdt,withBdt,sourceNote};
})();