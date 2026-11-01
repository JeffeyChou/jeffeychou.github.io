// Single source for everything on the Academic page except publications
// (those come from publications.bib). Content follows resume-2page.tex.

export const profile = {
  name: 'Jiefeng Zhou',
  nameZh: '周杰锋',
  role: 'Ph.D. Student, Computer Science and Engineering',
  affiliation: 'University of South Florida',
  lab: 'High Performance & Intelligence Lab (π\u00a0Lab)',
  advisor: { name: 'Prof. Jiajun Huang' },
  location: 'Tampa, FL',
  email: 'jiefeng@usf.edu',
  // Portrait: src/assets/photo.webp (or .png / .jpg, only one); without one an empty frame is shown.
  // Mailing address shown under the photo. Add your building / office line (e.g. 'ENB 3xx') when you have it.
  address: [
    'Department of Computer Science and Engineering',
    'Bellini College of AI, Cybersecurity and Computing',
    'University of South Florida',
    '4202 E. Fowler Avenue',
    'Tampa, FL 33620, USA',
  ],
  // Short bio in the usual academic format (trusted HTML, authored here).
  bio: [
    'I am a Ph.D. student in Computer Science and Engineering at the University of South Florida (USF), advised by <a href="https://jiajunhuang1999.github.io/" rel="noopener">Prof. Jiajun Huang</a> in the High Performance &amp; Intelligence Lab. I work on high-performance computing and systems for AI, with a focus on collective communication and lossy compression.',
    'Before joining USF, I received my B.S. in Mathematics-Physics Fundamental Science from the Yingcai Honors College at the University of Electronic Science and Technology of China (UESTC). There I was fortunate to be advised by <a href="https://scholar.google.com/citations?user=Zuhod6sAAAAJ" rel="noopener">Prof. Yong Deng</a> in the Information Fusion and Intelligent Systems Lab, where I worked on evidence theory and information theory.',
    // Optional (removed from the bio on 2026-10-31, kept here to restore easily):
    // 'I also completed my undergraduate thesis in the Tang Lab at the Peking University (PKU) Chengdu Academy for Advanced Interdisciplinary Biotechnologies, where I built a language model for single-cell perturbation prediction with <a href="https://scholar.google.com/citations?user=3SwUFtcAAAAJ" rel="noopener">Dr. Ning Yang</a>.',
  ],
  links: [
    { label: 'Email', href: 'mailto:jiefeng@usf.edu', kind: 'email' },
    { label: 'Google Scholar', href: 'https://scholar.google.com/citations?user=91LXriwAAAAJ', kind: 'scholar' },
    { label: 'GitHub', href: 'https://github.com/JeffeyChou', kind: 'github' },
    { label: 'ORCID', href: 'https://orcid.org/0009-0003-0424-2381', kind: 'orcid' },
    { label: 'CV', href: '/cv.pdf', kind: 'cv' },
  ],
} as const;

export interface NewsItem {
  date: string; // YYYY-MM or YYYY
  text: string; // inline HTML allowed (trusted, authored here)
}

export const news: NewsItem[] = [
  // Dates taken from resume-2page.tex; acceptance items carry the year only. Edit freely.
  { date: '2026-12', text: 'Joining the <em>ICS 2027</em> Junior Program Committee.' },
  { date: '2026-11', text: 'hZCCL2 at <strong>SC ’26</strong> in Chicago, plus the HV-Coll poster in the ACM Student Research Competition (SRC).' },
  { date: '2026-09', text: 'Received an <strong>SC26 ACM SRC travel grant</strong>.' },
  { date: '2026', text: '<strong>MAZ</strong> accepted to <em>PPoPP ’27</em>.' },
  { date: '2026', text: '<strong>hZCCL2</strong> accepted to <em>SC ’26</em>.' },
  { date: '2025-08', text: 'Joined Prof. Jiajun Huang’s High Performance &amp; Intelligence Lab at USF to study high-performance computing.' },
  { date: '2024-12', text: 'Joined the Tang Lab at the Peking University (PKU) Chengdu Academy for Advanced Interdisciplinary Biotechnologies as a research intern, where I will complete my undergraduate thesis on a language model for single-cell perturbation prediction with <a href="https://scholar.google.com/citations?user=3SwUFtcAAAAJ" rel="noopener">Dr. Ning Yang</a>.' },
  { date: '2023-02', text: 'Joined Prof. Yong Deng’s Information Fusion and Intelligent Systems Lab at UESTC as an undergraduate researcher, working on evidence theory and information theory.' },
];

export interface Position {
  org: string;
  place: string;
  role: string;
  dates: string;
  detail: string;
}

export const experience: Position[] = [
  {
    org: 'High Performance & Intelligence Lab (π\u00a0Lab)',
    place: 'University of South Florida · Tampa',
    role: 'Research Assistant · advisor Prof. Jiajun Huang',
    dates: '2025–now',
    detail: 'First-authored hZCCL2 (SC ’26) and MAZ (PPoPP ’27). Collaborating with Sheng Di’s group at Argonne and with Yanfei Guo (NVIDIA).',
  },
  {
    org: 'Tang Lab',
    place: 'Peking University (PKU) Chengdu Academy for Advanced Interdisciplinary Biotechnologies',
    role: 'Research Intern',
    dates: '2024–2025',
    detail: 'Built a language model for single-cell perturbation prediction (undergraduate thesis).',
  },
  {
    org: 'Information Fusion and Intelligent Systems Lab',
    place: 'UESTC · Chengdu',
    role: 'Undergraduate Research Assistant · advisor Prof. Yong Deng',
    dates: '2023–2024',
    detail: 'Four journal papers on evidence theory and information entropy (first author on three).',
  },
];

export const education = [
  {
    school: 'University of South Florida',
    degree: 'Ph.D., Computer Science and Engineering',
    dates: '2025–2030 (expected)',
    note: 'Bellini College of AI, Cybersecurity and Computing',
  },
  {
    school: 'University of Electronic Science and Technology of China',
    degree: 'B.S., Mathematics-Physics Fundamental Science',
    dates: '2021–2025',
    note: 'Yingcai Honors College',
  },
];

export const awards = [
  { date: '2026', text: 'Travel Grant, SC26 ACM Student Research Competition' },
  { date: '2022–24', text: 'National Grant ×3; Dream Scholarship, China Education Development Foundation' },
  { date: '2022–24', text: 'Model Student Scholarship ×2; Outstanding Undergraduate Scholarship' },
  { date: '2023', text: 'Top 7%, 17th IEEEXtreme Programming Competition' },
  { date: '2023', text: 'First Prize (top 5%), 23rd UESTC Mathematical Modeling Competition' },
];

export const service = [
  { date: '2026', text: 'Junior Program Committee, ACM International Conference on Supercomputing (ICS 2027)' },
  { date: '2023', text: 'Peer reviewer, Expert Systems with Applications' },
];
