// Academic facts are paraphrased from AUIS sources. Scenery, characters,
// puzzles and all in-game dialogue are original fictional adaptations.
export const VERIFIED_AT = '2026-10-06';

const official = (path) => `https://www.auis.edu.krd/${path}`;
const source = (title, url) => ({ title, url, verifiedAt: VERIFIED_AT });
const program = (name, type, url, note) => ({ name, type, url, verifiedAt: VERIFIED_AT, ...(note ? { note } : {}) });
const faculty = (name, specialty, path) => ({ name, specialty, url: official(path), verifiedAt: VERIFIED_AT });
const catalogUrl = 'https://auis.edu.krd/sites/default/files/2025-09/Academic%20Catalog%2025-26%20UPDATED-.pdf';

export const academics = [
  {
    id: 'engineering', unit: 'Department of Engineering', type: 'department', fantasy: 'Department of Engineering',
    summary: 'Engineering combines mathematics and science with design, experimentation, practical projects and teamwork. Students investigate infrastructure, machines and energy systems.',
    degrees: [
      program('Civil Engineering', 'Bachelor of Science (B.S.)', official('bs-civil-engineering')),
      program('Mechanical Engineering', 'Bachelor of Science (B.S.)', official('bs-mechanical-engineering')),
      program('Energy Engineering', 'Bachelor of Science (B.S.)', official('bs-energy-engineering')),
      program('Artificial Intelligence and Robotics', 'Bachelor of Science (B.S.)', official('department-engineering'), 'Listed on the department page; its degree link returns to that page. The 2025–26 catalog also confirms the degree.'),
    ],
    minors: [],
    subjects: ['engineering design', 'structural engineering', 'mechanics of materials', 'materials science', 'manufacturing', 'renewable energy', 'solar energy', 'robotics'],
    faculty: [
      faculty('Nathaniel Switzner', 'Teaches mechanics of materials, materials science, manufacturing, measurements laboratory and senior design; researches steel and pipe metallurgy and failure analysis.', 'nathaniel-switzner'),
      faculty('Ali H. A. Al-Waeli', 'Researches energy efficiency, renewable and sustainable energy, and solar energy, especially photovoltaics and hybrid photovoltaic thermal collectors.', 'ali-h-al-waeli'),
    ],
    sources: [
      source('Engineering department', official('department-engineering')),
      source('Civil Engineering degree', official('bs-civil-engineering')),
      source('Mechanical Engineering degree', official('bs-mechanical-engineering')),
      source('Energy Engineering degree', official('bs-energy-engineering')),
      source('Nathaniel Switzner faculty profile', official('nathaniel-switzner')),
      source('Ali H. A. Al-Waeli faculty profile', official('ali-h-al-waeli')),
      source('AUIS Academic Catalog 2025–26', catalogUrl),
    ],
  },
  {
    id: 'computing', unit: 'Department of Computing and Informatics', type: 'department', fantasy: 'Department of Computing and Informatics',
    summary: 'Computing and Informatics develops programming, software design and problem-solving skills through laboratories and projects. Its subjects include databases, networks, web technologies and information security.',
    degrees: [
      program('Information Technology', 'Bachelor of Science (B.S.)', official('bs-information-technology')),
      program('Cybersecurity', 'Bachelor of Science (B.S.)', official('department-computing-and-informatics'), 'The department lists this degree; the linked detail page could not be retrieved during verification.'),
      program('Software Engineering', 'Bachelor of Science (B.S.)', official('bachelor-science-software-engineering')),
    ],
    minors: [
      program('Information Technology', 'minor', 'https://auis.edu.krd/minor-information-technology'),
      program('Applied Artificial Intelligence', 'minor', 'https://auis.edu.krd/minor-applied-artificial-intelligence'),
    ],
    subjects: ['programming', 'software engineering', 'databases', 'networking', 'information security', 'web technologies', 'AI applications and ethics'],
    faculty: [faculty('Hoger Mahmud', 'Research interests include software engineering, system analysis and design, model-driven development, virtual collaboration and human–computer interaction.', 'hoger-mahmud')],
    sources: [
      source('Computing and Informatics department', official('department-computing-and-informatics')),
      source('Information Technology degree', official('bs-information-technology')),
      source('Software Engineering degree', official('bachelor-science-software-engineering')),
      source('Information Technology minor', 'https://auis.edu.krd/minor-information-technology'),
      source('Applied Artificial Intelligence minor', 'https://auis.edu.krd/minor-applied-artificial-intelligence'),
      source('Hoger Mahmud faculty profile', official('hoger-mahmud')),
    ],
  },
  {
    id: 'business', unit: 'Department of Business Administration', type: 'department', fantasy: 'Department of Business Administration',
    summary: 'Business Administration connects economics, accounting, finance, management and marketing with ethics and strategic problem solving. The department lists three undergraduate majors and an MBA.',
    degrees: [
      program('Business Administration', 'Bachelor of Science (B.S.)', official('bs-business-administration')),
      program('Human Resources Management', 'Bachelor of Science (B.S.)', official('bs-human-resources-management-hrm'), 'The department link says Human Resource Management; the degree page uses Human Resources Management.'),
      program('Digital Marketing and Social Media', 'Bachelor of Science (B.S.)', official('bs-digital-marketing-and-social-media-dmsm')),
      program('Master of Business Administration (MBA)', 'master’s degree', official('mba')),
    ],
    minors: [
      program('Business Administration', 'minor', official('minors')),
      program('Business Management', 'minor', official('minors')),
      program('Economics', 'minor', official('minors')),
    ],
    subjects: ['economics', 'accounting', 'finance', 'management', 'marketing', 'human resource management', 'business ethics'],
    faculty: [faculty('Fahrettin Sümer', 'Expertise includes economics, international political economy, globalization and financial crises. His research mainly concerns international political economy.', 'fahrettin-sumer')],
    sources: [
      source('Business Administration department', official('department-business-administration')),
      source('Business Administration degree', official('bs-business-administration')),
      source('Human Resources Management degree', official('bs-human-resources-management-hrm')),
      source('Digital Marketing and Social Media degree', official('bs-digital-marketing-and-social-media-dmsm')),
      source('MBA', official('mba')),
      source('Business minors', official('minors')),
      source('Fahrettin Sümer faculty profile', official('fahrettin-sumer')),
    ],
  },
  {
    id: 'english', unit: 'Department of English', type: 'department', fantasy: 'Department of English',
    summary: 'English encourages thoughtful reading, critical interpretation and clear writing. Literature, journalism and translation connect close attention to language with creative and practical work.',
    degrees: [
      program('English – Literature', 'Bachelor of Arts (B.A.)', official('ba-english-literature')),
      program('English – Journalism', 'Bachelor of Arts (B.A.)', official('ba-english-journalism')),
      program('Translation', 'Bachelor of Arts (B.A.)', official('ba-translation')),
    ],
    minors: [
      program('English Literature', 'minor', official('department-english')),
      program('English Journalism', 'minor', official('department-english')),
      program('Gender Studies', 'minor', official('department-english')),
    ],
    subjects: ['literature', 'critical reading', 'writing', 'journalism', 'translation', 'linguistics', 'gender studies'],
    faculty: [faculty('Choman Hardi', 'Research and teaching interests include poetry, feminist literature, feminist literary criticism and gender studies. Her public profile identifies her as a scholar, poet and translator.', 'choman-hardi')],
    sources: [
      source('English department', official('department-english')),
      source('English Literature degree', official('ba-english-literature')),
      source('English Journalism degree', official('ba-english-journalism')),
      source('Translation degree', official('ba-translation')),
      source('Choman Hardi faculty profile', official('choman-hardi')),
    ],
  },
  {
    id: 'medical', unit: 'Department of Medical & Health Sciences', type: 'department', fantasy: 'Department of Medical & Health Sciences',
    summary: 'Medical and Health Sciences teaches laboratory analysis alongside clinical training and research. The department offers Medical Laboratory Science and a Public Health minor.',
    degrees: [program('Medical Laboratory Science', 'Bachelor of Science (B.S.)', official('bs-medical-laboratory-science'))],
    minors: [program('Public Health', 'minor', official('minor-public-health'))],
    subjects: ['hematology', 'pathology', 'microbiology', 'immunology', 'molecular diagnostics', 'laboratory quality control', 'public health'],
    faculty: [faculty('Mohanad Nada', 'A hematologist whose academic expertise includes hematology, pathology and immunology; researches cancer immunotherapy and hematopoietic stem cell transplantation.', 'mohanad-nada')],
    sources: [
      source('Medical & Health Sciences department', official('department-medical-health-sciences')),
      source('Medical Laboratory Science degree', official('bs-medical-laboratory-science')),
      source('Public Health minor', official('minor-public-health')),
      source('Mohanad Nada faculty profile', official('mohanad-nada')),
    ],
  },
  {
    id: 'social', unit: 'Department of Social Sciences and Law', type: 'department', fantasy: 'Department of Social Sciences and Law',
    summary: 'Social Sciences and Law considers societies through history, politics, economics and geography. The department describes International Studies and International Relations, including international law and research methods.',
    degrees: [
      program('International Studies', 'Bachelor of Arts (B.A.)', official('department-social-sciences-and-law'), 'Described as a degree on the department page; also listed in the 2025–26 catalog.'),
      program('International Relations', 'Bachelor of Arts (B.A.)', official('ba-international-relations')),
    ],
    minors: [],
    subjects: ['history', 'politics', 'economics', 'geography', 'international relations', 'international law', 'comparative politics'],
    faculty: [faculty('Robert Perrins', 'A historian whose teaching and research include modern China and Japan and global histories of science, medicine, disease and pandemics.', 'robert-perrins')],
    sources: [
      source('Social Sciences and Law department', official('department-social-sciences-and-law')),
      source('International Relations degree', official('ba-international-relations')),
      source('Robert Perrins faculty profile', official('robert-perrins')),
      source('AUIS Academic Catalog 2025–26', catalogUrl),
    ],
  },
  {
    id: 'mathematics', unit: 'Department of Mathematics and Natural Sciences', type: 'department', fantasy: 'Department of Mathematics and Natural Sciences',
    summary: 'Mathematics and Natural Sciences provides quantitative and scientific foundations across AUIS programs. It offers a Mathematics minor and peer tutoring through the Math & Science Center.',
    degrees: [],
    minors: [program('Mathematics', 'minor', official('department-mathematics-and-natural-sciences'))],
    subjects: ['mathematics', 'scientific reasoning', 'data analysis', 'calculus', 'linear algebra', 'discrete mathematics', 'physics'],
    faculty: [faculty('Dastan Khalid', 'Research interests include atom–light interaction, coherent control of atomic systems, magnetometry and precision measurement. Directs the Math & Science Center.', 'dastan-khalid')],
    sources: [
      source('Mathematics and Natural Sciences department', official('department-mathematics-and-natural-sciences')),
      source('Dastan Khalid faculty profile', official('dastan-khalid')),
    ],
  },
  {
    id: 'dentistry', unit: 'College of Dentistry', type: 'college', fantasy: 'College of Dentistry',
    summary: 'Dentistry offers a five-year, ten-semester Dental Surgery degree. Its curriculum spans basic sciences, preclinical and clinical dentistry, research and professional ethics.',
    degrees: [program('Dental Surgery (BDS)', 'bachelor’s degree', official('bachelors-degree-dental-surgery-bds'))],
    minors: [],
    subjects: ['anatomy', 'tooth morphology', 'dental materials', 'clinical dentistry', 'oral health', 'research', 'ethics'],
    faculty: [faculty('Tara Ali Rasheed', 'Interim Dean of the College of Dentistry. Her public profile documents postgraduate teaching and supervision in orthodontics and research on dental arch and tooth measurements.', 'tara-ali-rasheed')],
    sources: [
      source('College of Dentistry', official('college-dentistry')),
      source('Dental Surgery degree', official('bachelors-degree-dental-surgery-bds')),
      source('Tara Ali Rasheed faculty profile', official('tara-ali-rasheed')),
    ],
  },
  {
    id: 'pharmacy', unit: 'College of Pharmacy', type: 'college', fantasy: 'College of Pharmacy',
    summary: 'Pharmacy connects pharmaceutical sciences with clinical pharmacy, biotechnology and drug development. Students investigate formulations, quality testing and evidence-based pharmaceutical care.',
    degrees: [program('Pharmacy', 'Bachelor of Pharmacy (BSc. Pharm.)', 'https://auis.edu.krd/bsc-pharmacy')],
    minors: [],
    subjects: ['pharmaceutical sciences', 'clinical pharmacy', 'biotechnology', 'drug development', 'formulations', 'quality control', 'natural products'],
    faculty: [faculty('Mohammed Nawzad Sabir', 'Research interests include biotechnology, drug development and discovery, and natural products.', 'mohammed-nawzad-sabir')],
    sources: [
      source('College of Pharmacy', official('college-pharmacy')),
      source('Pharmacy degree', 'https://auis.edu.krd/bsc-pharmacy'),
      source('Mohammed Nawzad Sabir faculty profile', official('mohammed-nawzad-sabir')),
    ],
  },
];

export const preparatory = {
  id: 'preparatory', unit: 'Academic Preparatory Program (APP)', type: 'preparatory program', fantasy: 'Academic Preparatory Program',
  summary: 'APP prepares students for undergraduate study through academic English, critical thinking and study skills. Reading, writing, listening, speaking and organizing information are central learning goals.',
  subjects: ['academic English', 'critical thinking', 'study habits', 'reading', 'writing', 'listening', 'speaking'],
  sources: [source('About APP', official('about-app')), source('Academic Programs overview', official('academic-programs'))],
  verifiedAt: VERIFIED_AT,
};

export const library = {
  id: 'library', unit: 'Moulakis Library', type: 'library', fantasy: 'Moulakis Archive',
  summary: 'The Moulakis Library supports research and learning, integrates information literacy into the curriculum, and hosts reading and writing centers. The game archive is a fictional interpretation of those learning roles.',
  subjects: ['research', 'information literacy', 'reading', 'writing'],
  sources: [source('AUIS Library', official('library'))],
  verifiedAt: VERIFIED_AT,
};

export const academicAudit = {
  title: 'AUIS academic-unit count and source audit',
  verifiedAt: VERIFIED_AT,
  status: 'unresolved official-source mismatch',
  overviewClaim: 'The Academic Programs overview says eight departments and two colleges.',
  observed: 'Its links name seven departments and two colleges. The separate Academic directory repeats those nine units.',
  corroboration: 'The official 2025–26 Academic Catalog explicitly describes seven departments and two colleges (printed page 13; PDF page index 12).',
  conclusion: 'This release represents the seven named departments and two named colleges. The reason for the eight-department statement remains unverified; no eighth department is invented. APP is kept as a preparatory program.',
  notes: [
    'Unit names follow current English department and college pages. Older catalogs use Information Technology and English and Translation as department labels; these are not counted as additional units.',
    'The Engineering AI and Robotics link and English minor links return to their department pages. Their listed names are verified, while separate detail URLs are not inferred.',
    'Some www AUIS detail pages were not retrievable by the research browser. Information Technology minor, Applied AI minor and Pharmacy degree were verified on the official non-www domain instead.',
    'Human Resource Management on the department link is Human Resources Management on the degree page; the degree-page name is displayed.',
    'International Studies and International Relations are both described on the current Social Sciences and Law page. They are presented separately. The 2025–26 catalog also lists Law and additional minors not linked on that current page; this release does not claim a complete admissions catalog.',
    'Mathematics and Natural Sciences is a department, but its current page lists a Mathematics minor and foundational teaching rather than a standalone bachelor’s degree.',
    'Pharmacy pages use Bachelor of Pharmacy, BSc. Pharm., and Bachelor Science of Pharmacy. The degree detail page label is used; no accreditation claim is included in the game.',
    'Faculty names, unit affiliations and specialties were verified from official public profiles. Fantasy roles, appearances, dialogue and activities are adaptations, not quotations or endorsements.',
  ],
  sources: [
    source('Academic Programs overview', official('academic-programs')),
    source('Academic directory', official('academic')),
    source('AUIS Academic Catalog 2025–26', catalogUrl),
    source('Faculty directory', official('faculty')),
  ],
};

export const academicsById = Object.fromEntries(academics.map((unit) => [unit.id, unit]));
