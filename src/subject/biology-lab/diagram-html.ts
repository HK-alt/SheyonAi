import { getDiagramCatalogEntry, type DiagramId } from '@/subject/biology-lab/diagram-catalog';
import type { ParsedDiagram } from '@/subject/biology-lab/diagram-parser';
import { buildDiagramDocumentShell } from '@/subject/diagram-document-shell';

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function labelCallouts(labels: ParsedDiagram['labels']): string {
  if (!labels.length) return '';
  const items = labels
    .map(
      (l) =>
        `<li><strong>${esc(l.title)}</strong>${l.detail ? ` — ${esc(l.detail)}` : ''}</li>`,
    )
    .join('');
  return `<aside class="callouts"><h2>Key structures</h2><ul>${items}</ul></aside>`;
}

/** Organ-level kidney (left) + nephron side panel (right) — never overlaid. */
function svgKidney(): string {
  return `<svg class="fig" viewBox="0 0 920 520" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Kidney anatomy with nephron panel">
  <defs>
    <linearGradient id="kg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fda4af"/>
      <stop offset="55%" stop-color="#fb7185"/>
      <stop offset="100%" stop-color="#e11d48"/>
    </linearGradient>
    <linearGradient id="med" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fecdd3"/>
      <stop offset="100%" stop-color="#fda4af"/>
    </linearGradient>
    <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="#0f766e"/>
    </marker>
  </defs>

  <!-- LEFT: organ -->
  <g transform="translate(20,30)">
    <text x="200" y="0" text-anchor="middle" class="panel-title">Kidney (coronal section)</text>
    <!-- vessels -->
    <path d="M8 200 C40 190, 70 185, 95 195" fill="none" stroke="#dc2626" stroke-width="10" stroke-linecap="round"/>
    <path d="M8 230 C42 240, 72 245, 98 235" fill="none" stroke="#1d4ed8" stroke-width="10" stroke-linecap="round"/>
    <text x="4" y="185" class="lbl">Renal artery</text>
    <text x="4" y="268" class="lbl">Renal vein</text>

    <!-- kidney body -->
    <ellipse cx="230" cy="230" rx="150" ry="175" fill="url(#kg)" stroke="#9f1239" stroke-width="2.5"/>
    <!-- cortex band -->
    <ellipse cx="230" cy="230" rx="150" ry="175" fill="none" stroke="#be123c" stroke-width="28" opacity="0.35"/>
    <!-- medulla pyramids -->
    <polygon points="175,120 210,230 140,230" fill="url(#med)" stroke="#9f1239" stroke-width="1.2"/>
    <polygon points="230,105 265,225 195,225" fill="url(#med)" stroke="#9f1239" stroke-width="1.2"/>
    <polygon points="285,120 320,230 250,230" fill="url(#med)" stroke="#9f1239" stroke-width="1.2"/>
    <polygon points="195,250 230,355 160,300" fill="url(#med)" stroke="#9f1239" stroke-width="1.2"/>
    <polygon points="265,250 300,300 230,355" fill="url(#med)" stroke="#9f1239" stroke-width="1.2"/>
    <!-- pelvis / hilum -->
    <path d="M95 195 C130 210, 145 220, 155 235 C145 250, 125 265, 98 235 Z" fill="#fef3c7" stroke="#b45309" stroke-width="1.5"/>
    <path d="M70 215 C100 220, 115 228, 120 235 C110 245, 90 250, 72 228" fill="#fde68a" stroke="#b45309" stroke-width="1.2"/>
    <text x="55" y="205" class="lbl-sm">Pelvis</text>

    <!-- callout leaders -->
    <line x1="340" y1="90" x2="380" y2="55" stroke="#64748b" stroke-width="1.2"/>
    <text x="385" y="52" class="lbl">Cortex</text>
    <line x1="265" y1="170" x2="380" y2="150" stroke="#64748b" stroke-width="1.2"/>
    <text x="385" y="154" class="lbl">Medulla (pyramid)</text>
    <line x1="130" y1="235" x2="60" y2="310" stroke="#64748b" stroke-width="1.2"/>
    <text x="8" y="328" class="lbl">Hilum</text>
    <line x1="230" y1="355" x2="300" y2="420" stroke="#64748b" stroke-width="1.2"/>
    <text x="305" y="430" class="lbl">Ureter (out)</text>
    <path d="M230 390 C235 420, 250 445, 270 460" fill="none" stroke="#b45309" stroke-width="8" stroke-linecap="round"/>
  </g>

  <!-- divider -->
  <line x1="480" y1="40" x2="480" y2="480" stroke="#e2e8f0" stroke-width="2" stroke-dasharray="6 6"/>

  <!-- RIGHT: nephron panel -->
  <g transform="translate(500,30)">
    <text x="190" y="0" text-anchor="middle" class="panel-title">Nephron (schematic)</text>
    <rect x="0" y="20" width="380" height="430" rx="14" fill="#f8fafc" stroke="#e2e8f0"/>
    <!-- glomerulus -->
    <circle cx="95" cy="90" r="28" fill="#fecaca" stroke="#dc2626" stroke-width="2"/>
    <circle cx="88" cy="84" r="6" fill="#f87171"/>
    <circle cx="102" cy="88" r="5" fill="#ef4444"/>
    <circle cx="94" cy="98" r="5" fill="#f87171"/>
    <ellipse cx="95" cy="90" rx="38" ry="34" fill="none" stroke="#0f766e" stroke-width="2.5"/>
    <text x="145" y="78" class="lbl-sm">Bowman's capsule</text>
    <text x="145" y="98" class="lbl-sm">Glomerulus</text>
    <!-- proximal -->
    <path d="M130 105 C170 130, 175 160, 150 175 C130 188, 115 175, 125 160" fill="none" stroke="#0f766e" stroke-width="7" stroke-linecap="round"/>
    <text x="185" y="155" class="lbl-sm">Proximal tubule</text>
    <!-- loop of Henle -->
    <path d="M125 175 C120 220, 110 280, 125 340 C140 380, 165 360, 155 300 C148 250, 160 210, 155 185" fill="none" stroke="#1d4ed8" stroke-width="6" stroke-linecap="round"/>
    <text x="175" y="320" class="lbl-sm">Loop of Henle</text>
    <!-- distal -->
    <path d="M155 185 C190 170, 220 155, 250 140 C280 125, 300 115, 310 100" fill="none" stroke="#0f766e" stroke-width="6" stroke-linecap="round"/>
    <text x="255" y="175" class="lbl-sm">Distal tubule</text>
    <!-- collecting duct -->
    <path d="M310 100 C320 140, 325 220, 328 380" fill="none" stroke="#b45309" stroke-width="8" stroke-linecap="round" marker-end="url(#arr)"/>
    <text x="250" y="250" class="lbl-sm">Collecting duct</text>
    <text x="250" y="400" class="lbl">→ to pelvis / ureter</text>
  </g>
</svg>`;
}

function svgNephron(): string {
  return `<svg class="fig" viewBox="0 0 720 560" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Nephron pathway">
  <defs>
    <marker id="nArr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="#0f766e"/>
    </marker>
  </defs>
  <rect x="24" y="24" width="672" height="512" rx="16" fill="#ffffff" stroke="#e2e8f0"/>
  <!-- afferent / efferent -->
  <path d="M80 120 C140 100, 180 105, 220 130" fill="none" stroke="#dc2626" stroke-width="8" stroke-linecap="round"/>
  <path d="M220 150 C180 175, 140 180, 90 165" fill="none" stroke="#b91c1c" stroke-width="7" stroke-linecap="round"/>
  <text x="70" y="100" class="lbl">Afferent arteriole</text>
  <text x="70" y="190" class="lbl">Efferent arteriole</text>
  <!-- glomerulus + capsule -->
  <circle cx="260" cy="150" r="42" fill="#fecaca" stroke="#dc2626" stroke-width="2.5"/>
  <circle cx="248" cy="140" r="8" fill="#f87171"/><circle cx="268" cy="148" r="7" fill="#ef4444"/>
  <circle cx="255" cy="162" r="7" fill="#f87171"/><circle cx="275" cy="158" r="6" fill="#fca5a5"/>
  <ellipse cx="260" cy="150" rx="58" ry="52" fill="none" stroke="#0f766e" stroke-width="3"/>
  <text x="330" y="120" class="lbl">Bowman's capsule</text>
  <text x="330" y="142" class="lbl">Glomerulus (filtration)</text>
  <!-- PCT -->
  <path d="M310 180 C380 210, 400 250, 360 280 C330 300, 300 275, 320 250 C340 230, 370 245, 390 270"
    fill="none" stroke="#0f766e" stroke-width="10" stroke-linecap="round" marker-end="url(#nArr)"/>
  <text x="410" y="240" class="lbl">Proximal convoluted tubule</text>
  <!-- Loop -->
  <path d="M390 275 C400 330, 390 400, 410 470 C430 510, 470 490, 455 430 C440 360, 460 310, 470 290"
    fill="none" stroke="#1d4ed8" stroke-width="9" stroke-linecap="round"/>
  <text x="480" y="400" class="lbl">Loop of Henle</text>
  <text x="300" y="500" class="lbl-sm">descending</text>
  <text x="470" y="510" class="lbl-sm">ascending</text>
  <!-- DCT -->
  <path d="M470 290 C510 270, 550 250, 580 220 C600 200, 610 180, 600 160"
    fill="none" stroke="#0f766e" stroke-width="9" stroke-linecap="round"/>
  <text x="560" y="270" class="lbl">Distal tubule</text>
  <!-- Collecting -->
  <path d="M600 160 C620 220, 630 320, 635 480" fill="none" stroke="#b45309" stroke-width="12" stroke-linecap="round" marker-end="url(#nArr)"/>
  <text x="520" y="360" class="lbl">Collecting duct</text>
  <text x="520" y="520" class="lbl">Urine → pelvis</text>
</svg>`;
}

function svgAnimalCell(): string {
  return `<svg class="fig" viewBox="0 0 860 560" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Animal cell">
  <ellipse cx="380" cy="280" rx="250" ry="210" fill="#ecfdf5" stroke="#0f766e" stroke-width="4"/>
  <ellipse cx="380" cy="280" rx="238" ry="198" fill="none" stroke="#99f6e4" stroke-width="2" stroke-dasharray="4 3"/>
  <!-- nucleus -->
  <circle cx="340" cy="250" r="70" fill="#dbeafe" stroke="#1d4ed8" stroke-width="2.5"/>
  <circle cx="340" cy="250" r="28" fill="#93c5fd" stroke="#1e40af" stroke-width="1.5"/>
  <text x="340" y="255" text-anchor="middle" class="lbl-sm">Nucleolus</text>
  <!-- mitochondria -->
  <ellipse cx="480" cy="200" rx="36" ry="18" fill="#fecaca" stroke="#dc2626" stroke-width="1.8" transform="rotate(-20 480 200)"/>
  <path d="M455 195 Q480 185 505 205" fill="none" stroke="#b91c1c" stroke-width="1.5"/>
  <ellipse cx="450" cy="340" rx="32" ry="16" fill="#fecaca" stroke="#dc2626" stroke-width="1.8" transform="rotate(25 450 340)"/>
  <!-- ER -->
  <path d="M250 300 C270 290, 290 310, 310 300 C330 290, 340 310, 360 305" fill="none" stroke="#b45309" stroke-width="3"/>
  <path d="M255 315 C275 305, 295 325, 315 315 C335 305, 345 325, 365 320" fill="none" stroke="#b45309" stroke-width="3"/>
  <!-- Golgi -->
  <path d="M480 280 C510 270, 530 275, 545 290" fill="none" stroke="#7c3aed" stroke-width="4"/>
  <path d="M485 295 C515 285, 535 290, 548 305" fill="none" stroke="#7c3aed" stroke-width="4"/>
  <path d="M490 310 C518 300, 536 305, 550 318" fill="none" stroke="#7c3aed" stroke-width="4"/>
  <!-- lysosome -->
  <circle cx="300" cy="380" r="16" fill="#fde68a" stroke="#b45309" stroke-width="1.8"/>
  <!-- ribosomes -->
  <circle cx="420" cy="160" r="4" fill="#0f766e"/><circle cx="435" cy="168" r="4" fill="#0f766e"/>
  <circle cx="410" cy="175" r="4" fill="#0f766e"/>
  <!-- cytoplasm label area -->
  <text x="380" y="420" text-anchor="middle" class="lbl-sm" fill="#64748b">Cytoplasm</text>

  <!-- external labels -->
  <line x1="600" y1="140" x2="680" y2="80" stroke="#64748b"/><text x="685" y="78" class="lbl">Plasma membrane</text>
  <line x1="400" y1="200" x2="680" y2="130" stroke="#64748b"/><text x="685" y="134" class="lbl">Nucleus</text>
  <line x1="505" y1="195" x2="680" y2="190" stroke="#64748b"/><text x="685" y="194" class="lbl">Mitochondrion</text>
  <line x1="545" y1="290" x2="680" y2="260" stroke="#64748b"/><text x="685" y="264" class="lbl">Golgi apparatus</text>
  <line x1="300" y1="310" x2="680" y2="330" stroke="#64748b"/><text x="685" y="334" class="lbl">Endoplasmic reticulum</text>
  <line x1="300" y1="380" x2="680" y2="400" stroke="#64748b"/><text x="685" y="404" class="lbl">Lysosome</text>
  <line x1="420" y1="165" x2="680" y2="460" stroke="#64748b"/><text x="685" y="464" class="lbl">Ribosomes</text>
  <line x1="380" y1="450" x2="520" y2="520" stroke="#64748b"/><text x="525" y="530" class="lbl">Cytoplasm</text>
</svg>`;
}

function svgMitosis(): string {
  const stages: { title: string; draw: string }[] = [
    {
      title: 'Interphase',
      draw: `<circle cx="90" cy="55" r="40" fill="#ecfdf5" stroke="#0f766e" stroke-width="2"/>
        <circle cx="90" cy="55" r="18" fill="#dbeafe" stroke="#1d4ed8"/>
        <path d="M78 50 Q90 42 102 55" fill="none" stroke="#1e40af" stroke-width="2"/>`,
    },
    {
      title: 'Prophase',
      draw: `<circle cx="90" cy="55" r="40" fill="#ecfdf5" stroke="#0f766e" stroke-width="2"/>
        <line x1="70" y1="40" x2="85" y2="70" stroke="#7c3aed" stroke-width="3"/>
        <line x1="95" y1="38" x2="110" y2="68" stroke="#7c3aed" stroke-width="3"/>
        <line x1="75" y1="55" x2="105" y2="50" stroke="#7c3aed" stroke-width="2.5"/>`,
    },
    {
      title: 'Metaphase',
      draw: `<circle cx="90" cy="55" r="40" fill="#ecfdf5" stroke="#0f766e" stroke-width="2"/>
        <line x1="50" y1="55" x2="130" y2="55" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3 2"/>
        <line x1="82" y1="42" x2="82" y2="68" stroke="#7c3aed" stroke-width="3.5"/>
        <line x1="98" y1="42" x2="98" y2="68" stroke="#7c3aed" stroke-width="3.5"/>
        <circle cx="50" cy="55" r="4" fill="#b45309"/><circle cx="130" cy="55" r="4" fill="#b45309"/>`,
    },
    {
      title: 'Anaphase',
      draw: `<circle cx="90" cy="55" r="40" fill="#ecfdf5" stroke="#0f766e" stroke-width="2"/>
        <line x1="60" y1="40" x2="60" y2="55" stroke="#7c3aed" stroke-width="3"/>
        <line x1="70" y1="45" x2="70" y2="58" stroke="#7c3aed" stroke-width="3"/>
        <line x1="110" y1="52" x2="110" y2="70" stroke="#7c3aed" stroke-width="3"/>
        <line x1="120" y1="50" x2="120" y2="68" stroke="#7c3aed" stroke-width="3"/>`,
    },
    {
      title: 'Telophase',
      draw: `<ellipse cx="90" cy="55" rx="48" ry="38" fill="#ecfdf5" stroke="#0f766e" stroke-width="2"/>
        <circle cx="68" cy="55" r="14" fill="#dbeafe" stroke="#1d4ed8"/>
        <circle cx="112" cy="55" r="14" fill="#dbeafe" stroke="#1d4ed8"/>
        <path d="M90 30 Q90 55 90 80" fill="none" stroke="#0f766e" stroke-width="2" stroke-dasharray="3 2"/>`,
    },
    {
      title: 'Cytokinesis',
      draw: `<circle cx="58" cy="55" r="28" fill="#ecfdf5" stroke="#0f766e" stroke-width="2"/>
        <circle cx="122" cy="55" r="28" fill="#ecfdf5" stroke="#0f766e" stroke-width="2"/>
        <circle cx="58" cy="55" r="10" fill="#dbeafe" stroke="#1d4ed8"/>
        <circle cx="122" cy="55" r="10" fill="#dbeafe" stroke="#1d4ed8"/>`,
    },
  ];
  const rows = stages
    .map(
      (s, i) => `<g transform="translate(40, ${28 + i * 88})">
      <rect x="0" y="0" width="780" height="78" rx="12" fill="#ffffff" stroke="#e2e8f0"/>
      <text x="24" y="28" class="stage-num">${i + 1}</text>
      <text x="52" y="28" class="panel-title">${s.title}</text>
      <g transform="translate(520, -5)">${s.draw}</g>
    </g>`,
    )
    .join('\n');
  return `<svg class="fig" viewBox="0 0 860 580" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mitosis stages">${rows}</svg>`;
}

function svgHeartFlow(): string {
  return `<svg class="fig" viewBox="0 0 820 520" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Heart blood flow">
  <defs>
    <marker id="hBlue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="#1d4ed8"/>
    </marker>
    <marker id="hRed" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="#dc2626"/>
    </marker>
  </defs>
  <!-- chambers -->
  <path d="M280 80 C220 100, 180 160, 190 230 C200 300, 240 360, 310 400 C360 430, 400 420, 410 380 L410 200 C400 120, 340 70, 280 80 Z"
    fill="#dbeafe" stroke="#1d4ed8" stroke-width="2.5"/>
  <path d="M430 80 C490 100, 530 160, 520 230 C510 300, 470 360, 400 400 C350 430, 310 420, 300 380 L300 200 C310 120, 370 70, 430 80 Z"
    fill="#fecaca" stroke="#dc2626" stroke-width="2.5"/>
  <!-- septum hint -->
  <line x1="360" y1="120" x2="360" y2="380" stroke="#64748b" stroke-width="3" stroke-dasharray="6 4"/>
  <!-- RA / RV labels -->
  <text x="250" y="180" text-anchor="middle" class="lbl">Right atrium</text>
  <text x="250" y="310" text-anchor="middle" class="lbl">Right ventricle</text>
  <text x="470" y="180" text-anchor="middle" class="lbl">Left atrium</text>
  <text x="470" y="310" text-anchor="middle" class="lbl">Left ventricle</text>
  <!-- blue flow: body → RA → RV → lungs -->
  <path d="M120 160 C160 150, 200 155, 230 170" fill="none" stroke="#1d4ed8" stroke-width="5" marker-end="url(#hBlue)"/>
  <text x="100" y="145" class="lbl-sm">Vena cava</text>
  <path d="M250 220 C240 260, 245 290, 255 320" fill="none" stroke="#1d4ed8" stroke-width="4" marker-end="url(#hBlue)"/>
  <path d="M200 350 C140 320, 110 260, 130 200" fill="none" stroke="#1d4ed8" stroke-width="5" marker-end="url(#hBlue)"/>
  <text x="70" y="280" class="lbl-sm">Pulmonary artery</text>
  <!-- red flow: lungs → LA → LV → aorta -->
  <path d="M620 160 C580 150, 530 155, 500 170" fill="none" stroke="#dc2626" stroke-width="5" marker-end="url(#hRed)"/>
  <text x="580" y="145" class="lbl-sm">Pulmonary veins</text>
  <path d="M470 220 C480 260, 475 290, 465 320" fill="none" stroke="#dc2626" stroke-width="4" marker-end="url(#hRed)"/>
  <path d="M500 120 C520 80, 500 50, 460 45 C420 40, 400 55, 400 70" fill="none" stroke="#dc2626" stroke-width="6" marker-end="url(#hRed)"/>
  <text x="520" y="55" class="lbl">Aorta</text>
  <!-- legend -->
  <rect x="40" y="440" width="18" height="12" rx="2" fill="#1d4ed8"/>
  <text x="66" y="450" class="lbl-sm">Deoxygenated</text>
  <rect x="200" y="440" width="18" height="12" rx="2" fill="#dc2626"/>
  <text x="226" y="450" class="lbl-sm">Oxygenated</text>
</svg>`;
}

function svgFoodWeb(): string {
  return `<svg class="fig" viewBox="0 0 820 520" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Grassland food web">
  <defs>
    <marker id="fw" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="#64748b"/>
    </marker>
  </defs>
  <!-- sun -->
  <circle cx="100" cy="70" r="28" fill="#fde68a" stroke="#b45309" stroke-width="2"/>
  <text x="100" y="120" text-anchor="middle" class="lbl-sm">Sunlight</text>
  <!-- producers -->
  <rect x="280" y="40" width="120" height="44" rx="10" fill="#d1fae5" stroke="#0f766e" stroke-width="2"/>
  <text x="340" y="68" text-anchor="middle" class="lbl">Grass</text>
  <rect x="440" y="40" width="120" height="44" rx="10" fill="#d1fae5" stroke="#0f766e" stroke-width="2"/>
  <text x="500" y="68" text-anchor="middle" class="lbl">Shrubs</text>
  <text x="400" y="28" text-anchor="middle" class="panel-title">Producers</text>
  <!-- primary consumers -->
  <rect x="200" y="180" width="110" height="44" rx="10" fill="#e0e7ff" stroke="#4338ca" stroke-width="2"/>
  <text x="255" y="208" text-anchor="middle" class="lbl">Grasshopper</text>
  <rect x="340" y="180" width="110" height="44" rx="10" fill="#e0e7ff" stroke="#4338ca" stroke-width="2"/>
  <text x="395" y="208" text-anchor="middle" class="lbl">Rabbit</text>
  <rect x="480" y="180" width="110" height="44" rx="10" fill="#e0e7ff" stroke="#4338ca" stroke-width="2"/>
  <text x="535" y="208" text-anchor="middle" class="lbl">Mouse</text>
  <text x="400" y="168" text-anchor="middle" class="panel-title">Primary consumers</text>
  <!-- secondary -->
  <rect x="260" y="320" width="110" height="44" rx="10" fill="#ffedd5" stroke="#c2410c" stroke-width="2"/>
  <text x="315" y="348" text-anchor="middle" class="lbl">Snake</text>
  <rect x="420" y="320" width="110" height="44" rx="10" fill="#ffedd5" stroke="#c2410c" stroke-width="2"/>
  <text x="475" y="348" text-anchor="middle" class="lbl">Fox</text>
  <text x="400" y="308" text-anchor="middle" class="panel-title">Secondary consumers</text>
  <!-- tertiary -->
  <rect x="340" y="440" width="120" height="44" rx="10" fill="#fee2e2" stroke="#b91c1c" stroke-width="2"/>
  <text x="400" y="468" text-anchor="middle" class="lbl">Hawk</text>
  <text x="400" y="428" text-anchor="middle" class="panel-title">Tertiary</text>
  <!-- arrows energy flow -->
  <line x1="128" y1="70" x2="275" y2="60" stroke="#b45309" stroke-width="1.5" marker-end="url(#fw)"/>
  <line x1="340" y1="84" x2="255" y2="180" stroke="#64748b" stroke-width="1.5" marker-end="url(#fw)"/>
  <line x1="340" y1="84" x2="395" y2="180" stroke="#64748b" stroke-width="1.5" marker-end="url(#fw)"/>
  <line x1="500" y1="84" x2="395" y2="180" stroke="#64748b" stroke-width="1.5" marker-end="url(#fw)"/>
  <line x1="500" y1="84" x2="535" y2="180" stroke="#64748b" stroke-width="1.5" marker-end="url(#fw)"/>
  <line x1="255" y1="224" x2="315" y2="320" stroke="#64748b" stroke-width="1.5" marker-end="url(#fw)"/>
  <line x1="395" y1="224" x2="315" y2="320" stroke="#64748b" stroke-width="1.5" marker-end="url(#fw)"/>
  <line x1="395" y1="224" x2="475" y2="320" stroke="#64748b" stroke-width="1.5" marker-end="url(#fw)"/>
  <line x1="535" y1="224" x2="475" y2="320" stroke="#64748b" stroke-width="1.5" marker-end="url(#fw)"/>
  <line x1="315" y1="364" x2="380" y2="440" stroke="#64748b" stroke-width="1.5" marker-end="url(#fw)"/>
  <line x1="475" y1="364" x2="420" y2="440" stroke="#64748b" stroke-width="1.5" marker-end="url(#fw)"/>
  <text x="700" y="260" class="lbl-sm">Arrows = energy flow</text>
</svg>`;
}

function svgPhotosynthesis(): string {
  return `<svg class="fig" viewBox="0 0 960 620" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Photosynthesis overview">
  <defs>
    <marker id="pArr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="#166534"/>
    </marker>
    <linearGradient id="chloro" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#bbf7d0"/>
      <stop offset="100%" stop-color="#86efac"/>
    </linearGradient>
  </defs>
  <!-- title bar -->
  <rect x="0" y="0" width="960" height="48" fill="#166534"/>
  <text x="480" y="32" text-anchor="middle" fill="#fff" font-size="20" font-weight="700" font-family="system-ui,sans-serif" letter-spacing="0.08em">PHOTOSYNTHESIS</text>
  <text x="480" y="78" text-anchor="middle" class="lbl">6CO₂ + 6H₂O + Light Energy → C₆H₁₂O₆ + 6O₂</text>

  <!-- LEFT: plant -->
  <g transform="translate(20,100)">
    <text x="200" y="0" text-anchor="middle" class="panel-title">Plant overview</text>
    <circle cx="40" cy="50" r="28" fill="#fde047" stroke="#ca8a04" stroke-width="2"/>
    <text x="40" y="55" text-anchor="middle" class="lbl-sm" font-weight="700">Sun</text>
    <path d="M70 55 L130 90" stroke="#facc15" stroke-width="4" marker-end="url(#pArr)"/>
    <!-- CO2 -->
    <circle cx="70" cy="140" r="22" fill="#475569"/><text x="70" y="145" text-anchor="middle" fill="#fff" font-size="11" font-weight="700" font-family="system-ui">CO₂</text>
    <path d="M92 140 L150 150" stroke="#475569" stroke-width="2" marker-end="url(#pArr)"/>
    <!-- plant -->
    <ellipse cx="210" cy="400" rx="90" ry="28" fill="#a16207"/>
    <path d="M210 400 L210 220" stroke="#15803d" stroke-width="14" stroke-linecap="round"/>
    <ellipse cx="170" cy="200" rx="36" ry="18" fill="#22c55e" stroke="#15803d" transform="rotate(-35 170 200)"/>
    <ellipse cx="250" cy="190" rx="40" ry="18" fill="#16a34a" stroke="#15803d" transform="rotate(30 250 190)"/>
    <ellipse cx="190" cy="250" rx="34" ry="16" fill="#4ade80" stroke="#15803d" transform="rotate(-20 190 250)"/>
    <ellipse cx="240" cy="260" rx="32" ry="15" fill="#22c55e" stroke="#15803d" transform="rotate(25 240 260)"/>
    <circle cx="210" cy="160" r="14" fill="#f472b6" stroke="#db2777"/>
    <!-- roots -->
    <path d="M210 400 C190 430, 170 450, 160 470" fill="none" stroke="#854d0e" stroke-width="4"/>
    <path d="M210 400 C230 435, 250 455, 260 475" fill="none" stroke="#854d0e" stroke-width="4"/>
    <path d="M210 400 C210 440, 205 460, 200 480" fill="none" stroke="#a16207" stroke-width="3"/>
    <!-- H2O -->
    <circle cx="70" cy="430" r="22" fill="#2563eb"/><text x="70" y="435" text-anchor="middle" fill="#fff" font-size="11" font-weight="700" font-family="system-ui">H₂O</text>
    <path d="M92 430 L150 430" stroke="#2563eb" stroke-width="2" marker-end="url(#pArr)"/>
    <!-- O2 out -->
    <circle cx="340" cy="150" r="22" fill="#16a34a"/><text x="340" y="155" text-anchor="middle" fill="#fff" font-size="11" font-weight="700" font-family="system-ui">O₂</text>
    <path d="M280 170 L318 155" stroke="#16a34a" stroke-width="2" marker-end="url(#pArr)"/>
    <!-- bridge -->
    <path d="M360 280 L420 280" stroke="#166534" stroke-width="10" marker-end="url(#pArr)"/>
    <text x="390" y="265" text-anchor="middle" class="lbl-sm" fill="#166534" font-weight="700">Chloroplast</text>
  </g>

  <!-- RIGHT: chloroplast -->
  <g transform="translate(450,100)">
    <text x="240" y="0" text-anchor="middle" class="panel-title">Chloroplast detail</text>
    <ellipse cx="240" cy="260" rx="230" ry="200" fill="url(#chloro)" stroke="#166534" stroke-width="3"/>
    <!-- light reactions -->
    <text x="120" y="60" text-anchor="middle" class="lbl" font-weight="700">Light-dependent</text>
    <rect x="50" y="120" width="70" height="14" rx="3" fill="#15803d"/>
    <rect x="55" y="138" width="70" height="14" rx="3" fill="#16a34a"/>
    <rect x="60" y="156" width="70" height="14" rx="3" fill="#22c55e"/>
    <rect x="65" y="174" width="70" height="14" rx="3" fill="#4ade80"/>
    <text x="100" y="210" text-anchor="middle" class="lbl-sm">Thylakoid</text>
    <circle cx="40" cy="90" r="18" fill="#ea580c"/><text x="40" y="94" text-anchor="middle" fill="#fff" font-size="10" font-weight="700" font-family="system-ui">Light</text>
    <path d="M55 100 L80 130" stroke="#ea580c" stroke-width="2" marker-end="url(#pArr)"/>
    <circle cx="40" cy="250" r="16" fill="#2563eb"/><text x="40" y="254" text-anchor="middle" fill="#fff" font-size="9" font-weight="700" font-family="system-ui">H₂O</text>
    <path d="M56 250 L90 200" stroke="#2563eb" stroke-width="2" marker-end="url(#pArr)"/>
    <circle cx="100" cy="300" r="18" fill="#16a34a"/><text x="100" y="304" text-anchor="middle" fill="#fff" font-size="10" font-weight="700" font-family="system-ui">O₂</text>
    <path d="M100 220 L100 280" stroke="#16a34a" stroke-width="2" marker-end="url(#pArr)"/>
    <!-- energy carriers -->
    <polygon points="180,140 200,155 180,170 160,155" fill="#fbbf24" stroke="#b45309"/>
    <text x="180" y="158" text-anchor="middle" font-size="8" font-weight="700" font-family="system-ui">ATP</text>
    <polygon points="180,190 205,208 180,226 155,208" fill="#f59e0b" stroke="#b45309"/>
    <text x="180" y="212" text-anchor="middle" font-size="7" font-weight="700" font-family="system-ui">NADPH</text>
    <path d="M205 155 L260 180" stroke="#b45309" stroke-width="2" marker-end="url(#pArr)"/>
    <path d="M205 208 L260 210" stroke="#b45309" stroke-width="2" marker-end="url(#pArr)"/>
    <!-- calvin -->
    <text x="340" y="60" text-anchor="middle" class="lbl" font-weight="700">Light-independent</text>
    <text x="340" y="130" text-anchor="middle" class="lbl-sm">Stroma</text>
    <circle cx="340" cy="180" r="48" fill="none" stroke="#166534" stroke-width="3" stroke-dasharray="6 4"/>
    <path d="M340 132 A48 48 0 0 1 380 200" fill="none" stroke="#15803d" stroke-width="2" marker-end="url(#pArr)"/>
    <circle cx="400" cy="120" r="16" fill="#78716c"/><text x="400" y="124" text-anchor="middle" fill="#fff" font-size="9" font-weight="700" font-family="system-ui">CO₂</text>
    <path d="M385 130 L360 155" stroke="#78716c" stroke-width="2" marker-end="url(#pArr)"/>
    <circle cx="380" cy="300" r="22" fill="#15803d"/><text x="380" y="304" text-anchor="middle" fill="#fff" font-size="9" font-weight="700" font-family="system-ui">Glucose</text>
    <path d="M360 220 L375 278" stroke="#15803d" stroke-width="2" marker-end="url(#pArr)"/>
    <!-- recycle -->
    <circle cx="250" cy="280" r="12" fill="#94a3b8"/><text x="250" y="283" text-anchor="middle" fill="#fff" font-size="7" font-family="system-ui">ADP</text>
    <circle cx="250" cy="320" r="12" fill="#64748b"/><text x="250" y="323" text-anchor="middle" fill="#fff" font-size="6" font-family="system-ui">NADP⁺</text>
    <path d="M300 230 L265 275" stroke="#64748b" stroke-width="1.5" marker-end="url(#pArr)"/>
    <path d="M300 250 L265 315" stroke="#64748b" stroke-width="1.5" marker-end="url(#pArr)"/>
  </g>
</svg>`;
}

function svgNeuronSynapse(): string {
  return `<svg class="fig" viewBox="0 0 900 520" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Neuron and synapse">
  <defs>
    <marker id="nArr2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="#4f46e5"/>
    </marker>
  </defs>
  <text x="450" y="28" text-anchor="middle" class="panel-title">Neuron with chemical synapse</text>
  <!-- dendrites -->
  <path d="M40 120 L120 180" stroke="#6366f1" stroke-width="4" stroke-linecap="round"/>
  <path d="M30 200 L120 190" stroke="#6366f1" stroke-width="4" stroke-linecap="round"/>
  <path d="M50 280 L120 210" stroke="#6366f1" stroke-width="4" stroke-linecap="round"/>
  <text x="20" y="100" class="lbl">Dendrites</text>
  <!-- soma -->
  <circle cx="170" cy="200" r="55" fill="#c7d2fe" stroke="#4338ca" stroke-width="2.5"/>
  <circle cx="170" cy="200" r="18" fill="#a5b4fc" stroke="#4338ca"/>
  <text x="170" y="280" text-anchor="middle" class="lbl">Cell body</text>
  <!-- axon -->
  <path d="M225 200 L520 200" stroke="#4f46e5" stroke-width="14" stroke-linecap="round"/>
  <text x="370" y="175" text-anchor="middle" class="lbl">Axon</text>
  <!-- myelin -->
  <ellipse cx="300" cy="200" rx="28" ry="18" fill="#fef3c7" stroke="#b45309" stroke-width="1.5"/>
  <ellipse cx="380" cy="200" rx="28" ry="18" fill="#fef3c7" stroke="#b45309" stroke-width="1.5"/>
  <ellipse cx="460" cy="200" rx="28" ry="18" fill="#fef3c7" stroke="#b45309" stroke-width="1.5"/>
  <text x="380" y="245" text-anchor="middle" class="lbl-sm">Myelin sheath</text>
  <!-- terminal -->
  <path d="M520 200 C560 190, 580 170, 590 150" fill="none" stroke="#4f46e5" stroke-width="8" stroke-linecap="round"/>
  <path d="M520 200 C560 210, 580 230, 590 250" fill="none" stroke="#4f46e5" stroke-width="8" stroke-linecap="round"/>
  <ellipse cx="600" cy="140" rx="22" ry="16" fill="#a5b4fc" stroke="#4338ca"/>
  <ellipse cx="600" cy="260" rx="22" ry="16" fill="#a5b4fc" stroke="#4338ca"/>
  <text x="600" y="100" text-anchor="middle" class="lbl-sm">Axon terminal</text>
  <!-- synapse zoom -->
  <rect x="640" y="80" width="240" height="360" rx="14" fill="#f8fafc" stroke="#e2e8f0"/>
  <text x="760" y="110" text-anchor="middle" class="panel-title">Synapse (detail)</text>
  <path d="M680 180 C720 160, 760 160, 800 180" fill="none" stroke="#4f46e5" stroke-width="6"/>
  <text x="740" y="150" text-anchor="middle" class="lbl-sm">Presynaptic</text>
  <circle cx="720" cy="200" r="8" fill="#7c3aed"/><circle cx="750" cy="195" r="8" fill="#7c3aed"/>
  <circle cx="780" cy="205" r="8" fill="#7c3aed"/>
  <text x="750" y="235" text-anchor="middle" class="lbl-sm">Vesicles (neurotransmitter)</text>
  <line x1="700" y1="260" x2="820" y2="260" stroke="#94a3b8" stroke-width="2" stroke-dasharray="4 3"/>
  <text x="760" y="280" text-anchor="middle" class="lbl-sm">Synaptic cleft</text>
  <path d="M700 320 C740 300, 780 300, 820 320" fill="none" stroke="#0f766e" stroke-width="6"/>
  <text x="760" y="360" text-anchor="middle" class="lbl-sm">Postsynaptic receptors</text>
  <path d="M600 200 L655 200" stroke="#4f46e5" stroke-width="2" marker-end="url(#nArr2)"/>
  <text x="170" y="480" text-anchor="middle" class="lbl-sm">Signal direction →</text>
</svg>`;
}

function svgDigestiveTract(): string {
  return `<svg class="fig" viewBox="0 0 720 600" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Digestive tract">
  <text x="360" y="28" text-anchor="middle" class="panel-title">Human digestive tract</text>
  <!-- mouth -->
  <ellipse cx="360" cy="70" rx="50" ry="28" fill="#fecaca" stroke="#b91c1c" stroke-width="2"/>
  <text x="360" y="75" text-anchor="middle" class="lbl">Mouth</text>
  <path d="M360 98 L360 130" stroke="#64748b" stroke-width="8" stroke-linecap="round"/>
  <text x="400" y="120" class="lbl-sm">Esophagus</text>
  <!-- stomach -->
  <ellipse cx="340" cy="200" rx="70" ry="50" fill="#fdba74" stroke="#c2410c" stroke-width="2.5"/>
  <text x="340" y="205" text-anchor="middle" class="lbl">Stomach</text>
  <!-- liver -->
  <path d="M420 150 C470 140, 500 170, 490 210 C480 240, 440 250, 410 230 C400 210, 405 170, 420 150 Z"
    fill="#a3e635" stroke="#65a30d" stroke-width="2"/>
  <text x="455" y="195" text-anchor="middle" class="lbl-sm">Liver</text>
  <!-- pancreas -->
  <ellipse cx="420" cy="250" rx="40" ry="16" fill="#fde68a" stroke="#b45309" stroke-width="1.5"/>
  <text x="480" y="255" class="lbl-sm">Pancreas</text>
  <!-- small intestine coils -->
  <path d="M340 250 C280 280, 260 320, 300 350 C340 380, 380 340, 360 310 C340 280, 300 300, 320 340 C350 390, 420 400, 450 360 C480 320, 440 280, 400 300"
    fill="none" stroke="#f97316" stroke-width="14" stroke-linecap="round"/>
  <text x="200" y="340" class="lbl">Small intestine</text>
  <!-- large intestine frame -->
  <path d="M280 400 L280 480 L440 480 L440 400" fill="none" stroke="#ea580c" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M280 400 L440 400" fill="none" stroke="#ea580c" stroke-width="18" stroke-linecap="round"/>
  <text x="360" y="520" text-anchor="middle" class="lbl">Large intestine</text>
  <ellipse cx="460" cy="470" rx="22" ry="18" fill="#fdba74" stroke="#c2410c"/>
  <text x="500" y="475" class="lbl-sm">Rectum</text>
  <text x="360" y="570" text-anchor="middle" class="lbl-sm">Teaching schematic — not anatomical proportions</text>
</svg>`;
}

function svgRespiratorySystem(): string {
  return `<svg class="fig" viewBox="0 0 820 560" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Respiratory system">
  <defs>
    <marker id="rArr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="#0284c7"/>
    </marker>
  </defs>
  <text x="410" y="28" text-anchor="middle" class="panel-title">Human respiratory system</text>
  <!-- nasal -->
  <ellipse cx="410" cy="70" rx="36" ry="22" fill="#bae6fd" stroke="#0284c7" stroke-width="2"/>
  <text x="410" y="75" text-anchor="middle" class="lbl-sm">Nasal cavity</text>
  <path d="M410 92 L410 130" stroke="#0284c7" stroke-width="10" stroke-linecap="round"/>
  <text x="440" y="120" class="lbl-sm">Pharynx / larynx</text>
  <!-- trachea -->
  <rect x="395" y="130" width="30" height="90" rx="6" fill="#e0f2fe" stroke="#0284c7" stroke-width="2"/>
  <line x1="398" y1="150" x2="422" y2="150" stroke="#7dd3fc"/><line x1="398" y1="170" x2="422" y2="170" stroke="#7dd3fc"/>
  <line x1="398" y1="190" x2="422" y2="190" stroke="#7dd3fc"/>
  <text x="440" y="180" class="lbl">Trachea</text>
  <!-- bronchi -->
  <path d="M410 220 L320 280" stroke="#0284c7" stroke-width="12" stroke-linecap="round"/>
  <path d="M410 220 L500 280" stroke="#0284c7" stroke-width="12" stroke-linecap="round"/>
  <text x="280" y="250" class="lbl-sm">Bronchi</text>
  <!-- lungs -->
  <ellipse cx="300" cy="360" rx="110" ry="140" fill="#fecaca" stroke="#e11d48" stroke-width="2.5" opacity="0.85"/>
  <ellipse cx="520" cy="360" rx="110" ry="140" fill="#fecaca" stroke="#e11d48" stroke-width="2.5" opacity="0.85"/>
  <text x="300" y="330" text-anchor="middle" class="lbl">Left lung</text>
  <text x="520" y="330" text-anchor="middle" class="lbl">Right lung</text>
  <!-- bronchioles hint -->
  <path d="M320 280 C280 320, 270 360, 290 400" fill="none" stroke="#f87171" stroke-width="3"/>
  <path d="M320 280 C340 330, 330 380, 310 420" fill="none" stroke="#f87171" stroke-width="3"/>
  <path d="M500 280 C540 320, 550 360, 530 400" fill="none" stroke="#f87171" stroke-width="3"/>
  <path d="M500 280 C480 330, 490 380, 510 420" fill="none" stroke="#f87171" stroke-width="3"/>
  <!-- alveoli inset -->
  <rect x="640" y="200" width="160" height="220" rx="12" fill="#fff" stroke="#e2e8f0"/>
  <text x="720" y="228" text-anchor="middle" class="panel-title">Alveoli</text>
  <circle cx="700" cy="300" r="28" fill="#fecaca" stroke="#e11d48" stroke-width="2"/>
  <circle cx="745" cy="320" r="24" fill="#fecaca" stroke="#e11d48" stroke-width="2"/>
  <circle cx="715" cy="350" r="20" fill="#fecaca" stroke="#e11d48" stroke-width="2"/>
  <path d="M680 280 C690 290, 695 300, 700 300" stroke="#0284c7" stroke-width="3" fill="none"/>
  <text x="720" y="400" text-anchor="middle" class="lbl-sm">Gas exchange</text>
  <text x="720" y="418" text-anchor="middle" class="lbl-sm">O₂ ↔ CO₂</text>
  <path d="M560 360 L635 310" stroke="#0284c7" stroke-width="1.5" marker-end="url(#rArr)"/>
  <!-- diaphragm -->
  <path d="M190 500 Q410 540 630 500" fill="none" stroke="#64748b" stroke-width="4"/>
  <text x="410" y="545" text-anchor="middle" class="lbl-sm">Diaphragm</text>
</svg>`;
}

const FIGURES: Record<DiagramId, () => string> = {
  kidney: svgKidney,
  nephron: svgNephron,
  animal_cell: svgAnimalCell,
  mitosis: svgMitosis,
  heart_flow: svgHeartFlow,
  food_web: svgFoodWeb,
  photosynthesis: svgPhotosynthesis,
  neuron_synapse: svgNeuronSynapse,
  digestive_tract: svgDigestiveTract,
  respiratory_system: svgRespiratorySystem,
};

export function buildDiagramViewerHtml(parsed: ParsedDiagram): string {
  const entry = getDiagramCatalogEntry(parsed.diagramId);
  return buildDiagramDocumentShell({
    title: parsed.title || entry.title,
    goal: parsed.focus || entry.learningGoal,
    note: parsed.closestNote ?? '',
    bodyHtml: FIGURES[parsed.diagramId](),
    caption: entry.attribution,
    calloutsHtml: labelCallouts(parsed.labels),
  });
}
