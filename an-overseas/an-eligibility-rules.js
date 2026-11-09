/* Programme-specific rules with official sources. Unmapped fields require review. */
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
      thresholdScope: 'UPM general research master’s benchmark',
      subject: 'Relevant previous qualification and a research proposal aligned with faculty expertise',
      alternative: 'The faculty assesses programme-specific requirements, including any alternative entry route.'
    })),

    {
      id: 'umt-aquatrop-msc', institution: 'Universiti Malaysia Terengganu', host: 'umt.edu.my',
      name: 'MSc by Research · Aquaculture Biotechnology', level: 'Master',
      source: 'https://akuatrop.umt.edu.my/programmes-by-research/',
      checked: '2026-11-09', minimum: 2.75, previous: 'Bachelor',
      subject: 'A related field from a Senate-recognised institution',
      english: { IELTS: 5, 'TOEFL iBT': 60, MUET: 3 }, cefr: 'B1',
      alternative: 'Alternative academic entry routes are assessed by UMT.',
      moi: 'UMT publishes a waiver route for previous qualifications from an institution whose main teaching language is English. Evidence is required.'
    },
    {
      id: 'uitm-at750', institution: 'Universiti Teknologi MARA', host: 'uitm.edu.my',
      name: 'AT750 MSc by Research · Aquaculture', level: 'Master',
      source: 'https://fpa.uitm.edu.my/index.php/en/component/content/article/19-at750-master-of-science-by-research?Itemid=352&catid=69',
      checked: '2026-11-09', minimum: 2.75, previous: 'Bachelor',
      subject: 'A science-related field from a Senate-recognised institution',
      alternative: 'Second-class honours or an equivalent recognised qualification with relevant experience may be considered.'
    }
  ],
  scholarships: {
    'lt-vtech-ba-full': { minimum: 80, checked: '2026-11-09' },
    'lt-vtech-ba-partial': { minimum: 70, checked: '2026-11-09' }
  }
};
