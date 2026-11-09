/* Published programme-specific rules, with provenance retained for editorial review. */
window.ANEligibilityRules = {
  programmes: [
    ...[
      'Agribusiness', 'Agricultural Economics', 'Agronomy', 'Agricultural Extension',
      'Agriculture Technology', 'Agriculture Genomics', 'Animal Behaviour and Welfare',
      'Animal Production', 'Animal Science', 'Aquaculture', 'Entomology',
      'Horticulture', 'Land Resource Management', 'Pest Management', 'Plant Pathology',
      'Plant Science', 'Soil Science'
    ].map((field, index) => ({
      id: 'upm-agri-msc-' + index, institution: 'Universiti Putra Malaysia', host: 'upm.edu.my',
      name: 'MSc by Research · ' + field, level: 'Master',
      source: 'https://agri.upm.edu.my/postgraduates/programme_by_research_phd_master/master_of_science-119',
      academicSource: 'https://sgs.upm.edu.my/content/academic_requirement-40575',
      checked: '2026-11-09', minimum: 2.75, previous: 'Bachelor',
      thresholdScope: 'UPM standard research master’s entry',
      english: { IELTS: 6, 'TOEFL iBT': 65, 'PTE Academic': 59, MUET: 4 },
      englishNotes: 'Standard registration scores from the 2026 UPM handbook. IELTS means Academic. TOEFL iBT/Home Edition score is on the 0–120 scale in this handbook. IELTS Academic 5.5 is B2 Entry and IELTS Academic 5.0 is B1, with additional English study required on these pathways.',
      englishSource: 'https://sgs.upm.edu.my/upload/dokumen/20260408095929Postgraduate_Student_Handbook_2026_-_with_cover_compressed.pdf',
      moi: 'A standalone MOI letter is not accepted in place of a test. A separate exemption can apply to a completed, fully English-taught degree from an MQA-recognised Malaysian institution. Other published exemption categories may also apply.',
      rejectsMoi: true, malaysiaEnglishDegreeWaiver: true, proposalRequired: true,
      intakes: ['March','October'],
      intake: 'UPM’s dual-semester schedule lists March and October. International application deadlines are generally 30 November and 30 June, respectively.',
      application: 'Submit the postgraduate application through UPM’s online admissions system and include the Faculty of Agriculture research proposal.',
      documents: 'Degree certificate and transcripts, passport, English test or evidence of a published exemption, and a research proposal.',
      exemptionSource: 'https://sgs.upm.edu.my/upload/dokumen/20260423002721PG_REGISTRATION_GUIDELINES_10.03.2026.pdf',
      conditionalMinimum: 2.5, experienceMinimum: 2, experienceYears: 5,
      subject: 'Relevant previous qualification and a research proposal aligned with faculty expertise',
      alternative: 'A relevant Bachelor’s CGPA from 2.500 to 2.749 may be considered after a rigorous faculty assessment. CGPA 2.000–2.499 requires five years of relevant work plus a rigorous assessment. The faculty also assesses prerequisite and research proposal requirements.'
    })),

    ...[
      'Aquaculture', 'Aquaculture System & Technology', 'Aquaculture Health', 'Aquaculture Nutrition',
      'Aquaculture Biotechnology', 'Aquaculture Economics & Management', 'Aquaculture Breeding Technology'
    ].map((field, index) => ({
      id: 'umt-aquatrop-msc-' + index, institution: 'Universiti Malaysia Terengganu', host: 'umt.edu.my',
      name: 'MSc by Research · ' + field, level: 'Master',
      source: 'https://akuatrop.umt.edu.my/programmes-by-research/',
      checked: '2026-11-09', minimum: 2.75, previous: 'Bachelor',
      subject: 'A related field from a Senate-recognised institution',
      english: { IELTS: 5, 'TOEFL iBT': 60, 'TOEFL PBT': 500, 'TOEFL CBT': 173, MUET: 3 },
      cefr: 'B1',
      englishNotes: 'UMT also publishes a conditional English pathway tied to meeting the specified test requirement before graduation.',
      alternative: 'Below 2.75, UMT may consider a relevant Bachelor’s degree with evidence of adequate research or work experience recognised by its Senate.',
      moi: 'UMT allows a waiver for applicants whose qualifying institution teaches primarily in English. Evidence is required.',
      conditionalExperience: true
    })),
    {
      id: 'um-data-science', institution: 'Universiti Malaya', host: 'um.edu.my',
      name: 'Master of Data Science · Coursework', level: 'Master',
      source: 'https://study.um.edu.my/master-of-data-science-coursework',
      checked: '2026-11-09', previous: 'Bachelor',
      streamMinimum: { Science: 3.30, 'Non-science': 3.50 }, honours: true,
      subject: 'Bachelor’s with Honours. Published non-science fields include Business and Economics, Statistics and Mathematics, and Accounting and Finance.',
      english: { IELTS: 6, 'TOEFL iBT': 60, 'TOEFL Essentials': 8.5, 'PTE Academic': 59, MUET: 4, 'Cambridge English': 169 },
      englishNotes: 'IELTS Academic and centre-based TOEFL iBT. Cambridge English applies to B1 Preliminary, B2 First, C1 Advanced or C2 Proficiency.',
      intakes: ['March','October'],
      intake: 'March and October, subject to programme availability.'
    },
    {
      id: 'um-statistics', institution: 'Universiti Malaya', host: 'um.edu.my',
      name: 'MSc in Statistics · Coursework', level: 'Master',
      source: 'https://study.um.edu.my/master-of-science-in-statistics',
      checked: '2026-11-09', previous: 'Bachelor', minimum: 3, conditionalMinimum: 2.5,
      subject: 'Bachelor’s in Statistics, Applied Statistics, Mathematics, Applied Mathematics, Actuarial Science, Operations Research, Data Science, Economics or Computer Science.',
      alternative: 'CGPA 2.50–2.99 requires at least one published alternative: UM graduation, one year of related work, related publications, a scholarship, government agency employment, or passing a faculty interview or special assessment.',
      english: { IELTS: 6, 'TOEFL iBT': 60, 'TOEFL Essentials': 8.5, 'PTE Academic': 59, MUET: 4, 'Cambridge English': 169, OET: 250 },
      englishNotes: 'IELTS Academic and centre-based TOEFL iBT. Cambridge English applies to B1 Preliminary, B2 First, C1 Advanced or C2 Proficiency.',
      intakes: ['March','October'],
      intake: 'March and October, subject to programme availability.'
    },
    {
      id: 'hohenheim-agecon', institution: 'University of Hohenheim', host: 'uni-hohenheim.de', country: 'Germany',
      name: 'MSc Agricultural Sciences · Agricultural Economics', level: 'Master', previous: 'Bachelor',
      source: 'https://dein-studium.uni-hohenheim.de/en/applying-and-enrollment/applying/apply-for-a-masters-degree-in-agricultural-sciences-agricultural-economics-major',
      checked: '2026-11-09', academicText: 'Above-average related Bachelor’s degree of at least three years or equivalent (180 ECTS). No direct 4-point CGPA conversion is published in the programme summary.',
      subject: 'Agricultural sciences, business/economics or another accepted related field, plus at least 6 ECTS in microeconomics and statistics as specified by the university.',
      english: { IELTS: 6.5, 'TOEFL iBT': 90, Duolingo: 125 },
      englishNotes: 'IELTS must be Academic. TOEFL iBT is stated on the 0–120 scale.',
      alternative: 'Relevant practical experience, an academic recommendation or a motivation letter may document special aptitude when the degree is below average or its fit is unclear. This is assessed by the university.',
      intakes: ['Winter semester'],
      intake: 'First-semester entry is offered for the winter semester only. The published non-EU deadline is 15 March.',
      application: 'Submit the online application through HohCampus and complete the required AgEcon microeconomics and statistics pre-tests.',
      documents: 'School-leaving qualification, Bachelor’s certificate and transcript, English evidence and AgEcon pre-test result. Add special-aptitude evidence where applicable.',
      costs: 'Standard non-EU tuition is €1,500 per semester where the fee applies. Check exemption eligibility and budget separately for semester contributions and living expenses.',
      costSource: 'https://www.uni-hohenheim.de/en/faq-tuition-fees-international-students'
    },
    {
      id: 'uitm-at750', institution: 'Universiti Teknologi MARA', host: 'uitm.edu.my',
      name: 'AT750 MSc by Research · Aquaculture', level: 'Master',
      source: 'https://fpa.uitm.edu.my/index.php/en/component/content/article/19-at750-master-of-science-by-research?Itemid=352&catid=69',
      checked: '2026-11-09', minimum: 2.75, previous: 'Bachelor',
      subject: 'A science-related field from a Senate-recognised institution',
      englishNotes: 'UiTM requires English proficiency evidence valid within two years. It publishes a six-month English course route and exemptions for qualifications taught in English.',
      moi: 'UiTM’s international postgraduate guide allows an exemption for graduates of a higher education institution that uses English as its teaching language.',
      englishSource: 'https://uitmglobal.uitm.edu.my/staging/images/news/2024/General_Guide.pdf',
      alternative: 'Second-class honours or an equivalent recognised qualification with relevant experience may be considered.'
    }
  ],
  scholarships: {
    chevening: { workHours: 2800, source: 'https://www.chevening.org/resource-hub/guidance/eligibility/', checked: '2026-11-09' },
    'lt-vtech-ba-full': { minimum: 80, cefr: 'B2', checked: '2026-11-09' },
    'lt-vtech-ba-partial': { minimum: 70, cefr: 'B2', checked: '2026-11-09' }
  }
};
