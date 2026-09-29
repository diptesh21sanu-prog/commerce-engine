import path from 'path';
import fs from 'fs';
import { queryOne } from './db.js';
import {
  classifyProductToVisual,
  escapeXml,
  hashString,
  ProductVisualDef,
} from './productImageRegistry.js';

export interface ProductVisual extends ProductVisualDef {
  photoPath?: string;
}

export function classifyProduct(title: string, category: string = '', productId: string = ''): ProductVisual {
  return classifyProductToVisual(title, category, productId);
}

/**
 * Generates an SVG silhouette for each distinct product type.
 * Uses hash to guarantee unique variations across products in the same category.
 */
function renderProductSilhouette(visual: ProductVisualDef, seed: number, hash: number, title: string = ''): string {
  const p = visual.primaryColor;
  const s = visual.secondaryColor;
  const a = visual.accentColor;
  const h = visual.highlightColor;

  // Algorithmic variations based on hash
  const clockHours = ((hash % 12) + 1);
  const clockMins = String((hash * 7) % 60).padStart(2, '0');
  const clockStr = `${clockHours}:${clockMins}`;
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const dayStr = days[hash % days.length];
  const dateStr = `${dayStr}, OCT ${(hash % 28) + 1}`;

  switch (visual.type) {
    // ====================================================
    // 1. SMARTPHONES & MOBILE TECH
    // ====================================================
    case 'phone_foldable':
      return `
        <!-- Dual-Screen Foldable OLED Smartphone -->
        <g transform="translate(180, 80)">
          <!-- Left Fold Display Panel -->
          <rect x="0" y="20" width="210" height="380" rx="16" fill="${p}" stroke="#0F172A" stroke-width="4"/>
          <rect x="8" y="28" width="194" height="364" rx="10" fill="#030712"/>
          <rect x="12" y="32" width="186" height="356" rx="8" fill="url(#screenGrad1)"/>
          <text x="105" y="140" font-family="-apple-system, sans-serif" font-size="34" font-weight="300" fill="#FFFFFF" text-anchor="middle">${clockStr}</text>
          <text x="105" y="165" font-family="-apple-system, sans-serif" font-size="10" font-weight="600" fill="${a}" text-anchor="middle">${dateStr}</text>
          <!-- Left App Widget Cards -->
          <rect x="25" y="220" width="160" height="50" rx="8" fill="#1E293B" opacity="0.8"/>
          <circle cx="50" cy="245" r="14" fill="${a}"/>
          <line x1="75" y1="240" x2="160" y2="240" stroke="#F8FAFC" stroke-width="2"/>
          <line x1="75" y1="252" x2="135" y2="252" stroke="#94A3B8" stroke-width="1.5"/>

          <!-- Armor Spine Hinge Mechanism -->
          <rect x="208" y="15" width="24" height="390" rx="6" fill="#475569" stroke="#0F172A" stroke-width="2"/>
          <line x1="220" y1="25" x2="220" y2="395" stroke="${a}" stroke-width="2" stroke-dasharray="8,6"/>

          <!-- Right Fold Display Panel -->
          <rect x="230" y="20" width="210" height="380" rx="16" fill="${p}" stroke="#0F172A" stroke-width="4"/>
          <rect x="238" y="28" width="194" height="364" rx="10" fill="#030712"/>
          <rect x="242" y="32" width="186" height="356" rx="8" fill="url(#screenGrad2)"/>
          <!-- Right Multitasking Windows -->
          <rect x="255" y="60" width="160" height="130" rx="8" fill="#0F172A" opacity="0.85"/>
          <line x1="270" y1="85" x2="390" y2="85" stroke="${a}" stroke-width="2"/>
          <line x1="270" y1="105" x2="370" y2="105" stroke="#94A3B8" stroke-width="2"/>
          <line x1="270" y1="125" x2="350" y2="125" stroke="#94A3B8" stroke-width="2"/>
          <rect x="255" y="210" width="160" height="150" rx="8" fill="#1E1B4B" opacity="0.85"/>
          <circle cx="335" cy="275" r="35" fill="none" stroke="${a}" stroke-width="3"/>
          <polygon points="330,265 345,275 330,285" fill="${a}"/>
        </g>
      `;

    case 'phone_compact':
      return `
        <!-- Compact Pocket Ceramic Smartphone -->
        <g transform="translate(290, 95)">
          <rect x="20" y="15" width="180" height="370" rx="30" fill="${p}" stroke="${s}" stroke-width="4"/>
          <rect x="28" y="23" width="164" height="354" rx="22" fill="#09090B"/>
          <rect x="32" y="27" width="156" height="346" rx="18" fill="url(#screenGrad2)"/>
          <!-- Punch Hole Camera -->
          <circle cx="110" cy="45" r="4.5" fill="#000000" stroke="#334155" stroke-width="1"/>
          <!-- Clean Clock -->
          <text x="110" y="130" font-family="-apple-system, sans-serif" font-size="38" font-weight="300" fill="#FFFFFF" text-anchor="middle">${clockStr}</text>
          <text x="110" y="155" font-family="-apple-system, sans-serif" font-size="10" font-weight="600" fill="#A1A1AA" text-anchor="middle">${dateStr}</text>
          <!-- Ceramic Lustre Glare -->
          <path d="M 32 60 Q 110 160 188 120" fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.3"/>
          <!-- Home Line -->
          <rect x="80" y="355" width="60" height="4" rx="2" fill="#FFFFFF" opacity="0.8"/>
        </g>
      `;

    case 'charging_pad':
      return `
        <!-- Circular Aluminum Magnetic Wireless Charging Puck -->
        <g transform="translate(250, 140)">
          <!-- Ground Shadow -->
          <ellipse cx="150" cy="190" rx="140" ry="40" fill="#000000" opacity="0.2" filter="blur(8px)"/>
          <!-- Outer Aluminum Ring -->
          <ellipse cx="150" cy="130" rx="135" ry="65" fill="${p}" stroke="#0F172A" stroke-width="4"/>
          <!-- Recessed Silicone Landing Mat -->
          <ellipse cx="150" cy="126" rx="115" ry="52" fill="#18181B"/>
          <!-- Qi Magnetic Alignment Halo Ring -->
          <ellipse cx="150" cy="126" rx="75" ry="34" fill="none" stroke="${a}" stroke-width="3" stroke-dasharray="6,4"/>
          <!-- Center Studio Emblem -->
          <circle cx="150" cy="126" r="14" fill="${s}"/>
          <path d="M 148 116 L 144 126 L 152 126 L 148 136" fill="none" stroke="${a}" stroke-width="2.5" stroke-linecap="round"/>
          <!-- Braided USB-C Cable Trail -->
          <path d="M 285 130 Q 360 145 420 120" fill="none" stroke="${s}" stroke-width="6" stroke-linecap="round"/>
        </g>
      `;

    case 'charging_dock':
      return `
        <!-- Machined Desktop Smartphone Charging Dock Stand -->
        <g transform="translate(260, 110)">
          <!-- Heavy Base Pedestal -->
          <polygon points="40,290 240,290 260,330 20,330" fill="${p}" stroke="#0F172A" stroke-width="3"/>
          <!-- Angled Upright Stem Column -->
          <polygon points="120,290 160,290 170,120 130,120" fill="${s}" stroke="#0F172A" stroke-width="2.5"/>
          <!-- Angled Magnetic Charging Cradle Head -->
          <g transform="translate(50, 60) rotate(-10)">
            <rect x="0" y="0" width="180" height="150" rx="14" fill="${p}" stroke="#0F172A" stroke-width="3"/>
            <ellipse cx="90" cy="75" rx="50" ry="50" fill="#18181B" stroke="${a}" stroke-width="2.5"/>
            <circle cx="90" cy="75" r="15" fill="${s}"/>
            <circle cx="90" cy="75" r="5" fill="${a}"/>
          </g>
        </g>
      `;

    case 'charging_station':
      return `
        <!-- 3-in-1 Foldable Travel Wireless Charging Station -->
        <g transform="translate(160, 150)">
          <!-- Pad 1: Phone Station -->
          <rect x="0" y="30" width="140" height="190" rx="12" fill="${p}" stroke="#0F172A" stroke-width="3"/>
          <ellipse cx="70" cy="120" rx="45" ry="55" fill="#18181B" stroke="${a}" stroke-width="2"/>
          <circle cx="70" cy="120" r="14" fill="${s}"/>
          <!-- Pad 2: Watch Station (Center) -->
          <rect x="160" y="40" width="130" height="170" rx="12" fill="${p}" stroke="#0F172A" stroke-width="3"/>
          <circle cx="225" cy="125" r="32" fill="#18181B" stroke="#64748B" stroke-width="2"/>
          <circle cx="225" cy="125" r="20" fill="${h}"/>
          <!-- Pad 3: Earbuds Station -->
          <rect x="310" y="50" width="140" height="150" rx="12" fill="${p}" stroke="#0F172A" stroke-width="3"/>
          <rect x="340" y="90" width="80" height="60" rx="20" fill="#18181B" stroke="${a}" stroke-width="2"/>
          <circle cx="380" cy="120" r="8" fill="${a}"/>
          <!-- Flexible Fabric Interconnect Hinges -->
          <rect x="140" y="100" width="20" height="40" fill="#334155"/>
          <rect x="290" y="100" width="20" height="40" fill="#334155"/>
        </g>
      `;

    case 'power_bank':
      return `
        <!-- Ultra-Slim Titanium Magnetic Battery Pack -->
        <g transform="translate(270, 120)">
          <!-- Battery Pack Body -->
          <rect x="20" y="20" width="220" height="320" rx="24" fill="${p}" stroke="#0F172A" stroke-width="4"/>
          <!-- Matte Grip Inset Panel -->
          <rect x="35" y="35" width="190" height="290" rx="16" fill="${s}"/>
          <!-- Magnetic Ring Target -->
          <circle cx="130" cy="160" r="65" fill="none" stroke="${a}" stroke-width="3" stroke-dasharray="10,6"/>
          <circle cx="130" cy="160" r="40" fill="#09090B"/>
          <!-- 4 Battery LED Fuel Gauge Dots -->
          <circle cx="100" cy="270" r="4" fill="${a}"/>
          <circle cx="120" cy="270" r="4" fill="${a}"/>
          <circle cx="140" cy="270" r="4" fill="${a}"/>
          <circle cx="160" cy="270" r="4" fill="#64748B"/>
          <!-- USB-C Fast Port at Bottom -->
          <rect x="105" y="325" width="50" height="12" rx="4" fill="#09090B" stroke="#475569" stroke-width="1.5"/>
        </g>
      `;

    case 'wall_charger':
      return `
        <!-- 65W/100W GaN Travel Fast Wall Charger -->
        <g transform="translate(280, 120)">
          <!-- Charger Compact Chassis Brick -->
          <rect x="20" y="40" width="200" height="240" rx="18" fill="${p}" stroke="#0F172A" stroke-width="4"/>
          <rect x="30" y="50" width="180" height="220" rx="12" fill="${s}"/>
          <!-- Dual USB-C Fast Ports -->
          <rect x="60" y="100" width="120" height="32" rx="8" fill="#09090B" stroke="${a}" stroke-width="2"/>
          <rect x="95" y="110" width="50" height="12" rx="3" fill="#1E293B"/>
          <text x="120" y="150" font-family="monospace" font-size="9" fill="${a}" text-anchor="middle">USB-C 100W GaN</text>

          <rect x="60" y="170" width="120" height="32" rx="8" fill="#09090B" stroke="#475569" stroke-width="1.5"/>
          <rect x="95" y="180" width="50" height="12" rx="3" fill="#1E293B"/>
          <text x="120" y="220" font-family="monospace" font-size="9" fill="#94A3B8" text-anchor="middle">USB-C 30W</text>
          <!-- Power Indicator Dot -->
          <circle cx="120" cy="75" r="4" fill="#10B981" filter="drop-shadow(0 0 4px #10B981)"/>
          <!-- Folding AC Prongs (Top Projection) -->
          <rect x="70" y="10" width="16" height="30" rx="3" fill="#94A3B8" stroke="#475569" stroke-width="1.5"/>
          <rect x="150" y="10" width="16" height="30" rx="3" fill="#94A3B8" stroke="#475569" stroke-width="1.5"/>
        </g>
      `;

    case 'phone_case':
      return `
        <!-- Minimalist Hard Anodized Smartphone Bumper Case -->
        <g transform="translate(280, 100)">
          <!-- Outer Anodized Shell -->
          <rect x="10" y="15" width="220" height="410" rx="32" fill="${p}" stroke="#0F172A" stroke-width="4"/>
          <!-- Interior Microfiber Bed -->
          <rect x="22" y="27" width="196" height="386" rx="22" fill="${s}"/>
          <!-- Camera Island Cutout (Top Left) -->
          <rect x="35" y="45" width="80" height="90" rx="16" fill="#09090B" stroke="${a}" stroke-width="2.5"/>
          <circle cx="60" cy="70" r="14" fill="#18181B" stroke="#3F3F46" stroke-width="1.5"/>
          <circle cx="90" cy="70" r="14" fill="#18181B" stroke="#3F3F46" stroke-width="1.5"/>
          <circle cx="75" cy="105" r="14" fill="#18181B" stroke="#3F3F46" stroke-width="1.5"/>
          <!-- MagSafe Alignment Circle Indentation -->
          <circle cx="120" cy="240" r="60" fill="none" stroke="${a}" stroke-width="2" stroke-dasharray="6,4"/>
        </g>
      `;

    case 'phone_mount':
      return `
        <!-- Machined Magnetic Car Air-Vent Phone Mount -->
        <g transform="translate(270, 130)">
          <!-- Dual Vent Gripper Claws (Rear) -->
          <rect x="110" y="240" width="16" height="70" rx="4" fill="#1E293B"/>
          <rect x="134" y="240" width="16" height="70" rx="4" fill="#1E293B"/>
          <!-- 360 Ball Pivot Joint -->
          <circle cx="130" cy="220" r="30" fill="${s}" stroke="#0F172A" stroke-width="3"/>
          <!-- Front Magnetic Disk Plate -->
          <ellipse cx="130" cy="140" rx="90" ry="70" fill="${p}" stroke="#0F172A" stroke-width="4"/>
          <ellipse cx="130" cy="140" rx="72" ry="54" fill="#18181B"/>
          <!-- Magnetic Ring -->
          <ellipse cx="130" cy="140" rx="48" ry="34" fill="none" stroke="${a}" stroke-width="3.5"/>
          <circle cx="130" cy="140" r="10" fill="${a}"/>
        </g>
      `;

    case 'phone_wallet':
      return `
        <!-- MagSafe Leather Phone Folio Wallet -->
        <g transform="translate(270, 110)">
          <!-- Main Leather Fold Body -->
          <rect x="15" y="20" width="230" height="380" rx="20" fill="${p}" stroke="#1F130B" stroke-width="3.5"/>
          <!-- Perimeter Edge Stitching -->
          <rect x="25" y="30" width="210" height="360" rx="14" fill="none" stroke="#FEF3C7" stroke-width="1.8" stroke-dasharray="6,4"/>
          <!-- Layered Credit Card Pocket Slits -->
          <rect x="40" y="160" width="180" height="75" rx="8" fill="${s}" stroke="#1F130B" stroke-width="2"/>
          <rect x="40" y="220" width="180" height="75" rx="8" fill="${p}" stroke="#1F130B" stroke-width="2"/>
          <rect x="40" y="280" width="180" height="85" rx="8" fill="${s}" stroke="#1F130B" stroke-width="2"/>
          <!-- Blind Debossed Studio Mark -->
          <circle cx="130" cy="90" r="18" fill="none" stroke="${a}" stroke-width="2"/>
        </g>
      `;

    case 'edc_stylus':
      return `
        <!-- Solid Brass EDC Touch Stylus & Pen -->
        <g transform="translate(230, 200) rotate(-30)">
          <!-- Stylus Main Hex Bar -->
          <rect x="0" y="40" width="380" height="24" rx="4" fill="${p}" stroke="#78350F" stroke-width="2.5"/>
          <!-- Knurled Grip Zone -->
          <rect x="40" y="38" width="80" height="28" fill="${s}" stroke="#78350F" stroke-width="2"/>
          ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `
            <line x1="${45 + i * 10}" y1="38" x2="${45 + i * 10}" y2="66" stroke="#FEF3C7" stroke-width="1.5"/>
          `).join('')}
          <!-- Conductive Soft Mesh Stylus Tip -->
          <path d="M 0 44 Q -25 52 0 60 Z" fill="#292524" stroke="#18181B" stroke-width="2"/>
          <!-- Pocket Clip -->
          <path d="M 280 34 L 350 34 Q 360 34 360 48" fill="none" stroke="${a}" stroke-width="4" stroke-linecap="round"/>
        </g>
      `;

    case 'phone_flagship':
      return `
        <!-- Titanium Flagship 5G Smartphone -->
        <g transform="translate(280, 85)">
          <rect x="15" y="10" width="210" height="425" rx="34" fill="${p}" stroke="#334155" stroke-width="4.5"/>
          <rect x="23" y="18" width="194" height="409" rx="26" fill="#020617"/>
          <rect x="27" y="22" width="186" height="401" rx="22" fill="url(#phoneScreenGrad)"/>
          <!-- Dynamic Island Notch -->
          <rect x="85" y="32" width="70" height="18" rx="9" fill="#000000"/>
          <circle cx="140" cy="41" r="3.5" fill="#1E293B"/>
          <!-- Clock & Date -->
          <text x="120" y="135" font-family="-apple-system, sans-serif" font-size="44" font-weight="200" fill="#FFFFFF" text-anchor="middle">${clockStr}</text>
          <text x="120" y="160" font-family="-apple-system, sans-serif" font-size="11" font-weight="500" fill="#94A3B8" text-anchor="middle">${dateStr}</text>
          <!-- Abstract Wallpaper Shape -->
          <circle cx="120" cy="270" r="45" fill="none" stroke="${a}" stroke-width="3" opacity="0.6"/>
          <ellipse cx="120" cy="270" rx="65" ry="30" fill="none" stroke="${h}" stroke-width="2" opacity="0.5" transform="rotate(${hash % 90} 120 270)"/>
          <!-- Home Bar -->
          <rect x="75" y="405" width="90" height="4" rx="2" fill="#FFFFFF" opacity="0.8"/>
        </g>
      `;

    // ====================================================
    // 2. COMPUTING & WORKSPACE
    // ====================================================
    case 'keyboard':
      return `
        <!-- Custom 65% Anodized Aluminum Mechanical Keyboard -->
        <g transform="translate(170, 150)">
          <rect x="0" y="15" width="460" height="210" rx="14" fill="${p}" stroke="#0F172A" stroke-width="4"/>
          <rect x="12" y="27" width="436" height="186" rx="8" fill="#18181B"/>
          ${[
            [0, 14, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 44],
            [35, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 35],
            [42, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 56],
            [50, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 52, 24],
            [35, 30, 35, 175, 35, 30, 24, 24, 24],
          ].map((row, rIdx) => {
            let curX = 22;
            const curY = 38 + rIdx * 30;
            return row.map((w, kIdx) => {
              const x = curX;
              curX += w + 4;
              const isAccent = (rIdx === 0 && kIdx === 0) || (rIdx === 2 && kIdx === row.length - 1) || (rIdx === 4 && kIdx === 3);
              const keyFill = isAccent ? a : (kIdx % 2 === 0 ? s : '#27272A');
              return `<rect x="${x}" y="${curY}" width="${w}" height="24" rx="4" fill="${keyFill}" stroke="#09090B" stroke-width="1.5"/>`;
            }).join('');
          }).join('')}
          <circle cx="420" cy="52" r="14" fill="#D4D4D8" stroke="#52525B" stroke-width="2.5"/>
          <circle cx="420" cy="52" r="10" fill="${a}"/>
        </g>
      `;

    case 'mouse':
      return `
        <!-- Ergonomic Precision Wireless Mouse -->
        <g transform="translate(270, 110)">
          <path d="M 60 70 Q 130 10 200 70 Q 260 130 240 260 Q 220 340 130 350 Q 40 340 20 260 Q 0 130 60 70 Z" fill="${p}" stroke="#0F172A" stroke-width="4"/>
          <path d="M 60 70 Q 130 10 130 140 L 40 150 Q 25 105 60 70 Z" fill="${s}" stroke="#0F172A" stroke-width="2"/>
          <path d="M 130 140 Q 130 10 200 70 Q 235 105 220 150 L 130 140 Z" fill="${s}" stroke="#0F172A" stroke-width="2"/>
          <rect x="120" y="60" width="20" height="48" rx="10" fill="#E4E4E7" stroke="#52525B" stroke-width="2"/>
          <rect x="123" y="125" width="14" height="18" rx="4" fill="${a}"/>
          <ellipse cx="130" cy="240" rx="55" ry="60" fill="#FFFFFF" opacity="0.08"/>
        </g>
      `;

    case 'trackball':
      return `
        <!-- Sculpted Precision Trackball Controller -->
        <g transform="translate(260, 110)">
          <path d="M 40 100 Q 140 20 240 100 Q 270 200 230 320 Q 140 350 50 320 Q 10 200 40 100 Z" fill="${p}" stroke="#0F172A" stroke-width="4"/>
          <!-- Huge Optic Trackball Sphere -->
          <circle cx="140" cy="150" r="55" fill="${a}" stroke="#0F172A" stroke-width="3"/>
          <circle cx="120" cy="130" r="16" fill="#FFFFFF" opacity="0.4"/>
          <path d="M 50 200 Q 140 270 230 200" fill="none" stroke="${s}" stroke-width="5"/>
        </g>
      `;

    case 'laptop_workstation':
    case 'laptop_ultrabook':
      return `
        <!-- Studio Pro Magnesium Ultrabook / Workstation -->
        <g transform="translate(160, 110)">
          <polygon points="60,30 420,30 450,190 30,190" fill="#0F172A" stroke="#334155" stroke-width="4"/>
          <polygon points="72,42 408,42 436,180 44,180" fill="url(#screenGrad1)"/>
          <!-- Code Editor Lines on Screen -->
          <line x1="85" y1="65" x2="210" y2="65" stroke="${a}" stroke-width="3" stroke-linecap="round"/>
          <line x1="85" y1="85" x2="310" y2="85" stroke="#38BDF8" stroke-width="2" stroke-linecap="round"/>
          <line x1="85" y1="105" x2="260" y2="105" stroke="#94A3B8" stroke-width="2" stroke-linecap="round"/>
          <line x1="85" y1="125" x2="340" y2="125" stroke="#38BDF8" stroke-width="2" stroke-linecap="round"/>
          <circle cx="240" cy="36" r="3" fill="#000000" stroke="#64748B" stroke-width="1"/>
          <!-- Laptop Base Deck -->
          <polygon points="10,195 470,195 490,320 -10,320" fill="${p}" stroke="#0F172A" stroke-width="4"/>
          <polygon points="65,208 415,208 425,275 55,275" fill="#09090B"/>
          <rect x="180" y="282" width="120" height="32" rx="4" fill="#334155" stroke="#475569" stroke-width="1.5"/>
        </g>
      `;

    case 'laptop_stand':
      return `
        <!-- Precision Aluminum Laptop Riser Elevator -->
        <g transform="translate(200, 140)">
          <!-- Base Plate -->
          <polygon points="40,240 360,240 380,270 20,270" fill="${p}" stroke="#0F172A" stroke-width="3"/>
          <!-- Cantilever Arms -->
          <polygon points="100,240 130,240 170,70 140,70" fill="${s}" stroke="#0F172A" stroke-width="2.5"/>
          <polygon points="270,240 300,240 340,70 310,70" fill="${s}" stroke="#0F172A" stroke-width="2.5"/>
          <!-- Angled Laptop Cradle Hooks -->
          <polygon points="60,70 380,70 400,100 40,100" fill="${p}" stroke="#0F172A" stroke-width="3"/>
          <rect x="50" y="60" width="20" height="35" rx="3" fill="${a}"/>
          <rect x="370" y="60" width="20" height="35" rx="3" fill="${a}"/>
        </g>
      `;

    case 'desk_mat':
      return `
        <!-- Full-Grain Bridle Leather Desk Mat -->
        <g transform="translate(180, 150)">
          <rect x="20" y="20" width="400" height="230" rx="14" fill="${p}" stroke="#1F130B" stroke-width="3.5"/>
          <rect x="30" y="30" width="380" height="210" rx="8" fill="none" stroke="#FEF3C7" stroke-width="1.8" stroke-dasharray="8,5"/>
          <!-- Natural Grain Texture -->
          <line x1="60" y1="80" x2="380" y2="80" stroke="${s}" stroke-width="2" opacity="0.6"/>
          <line x1="60" y1="140" x2="380" y2="140" stroke="${s}" stroke-width="2" opacity="0.6"/>
          <!-- Corner Brass Corner Guards -->
          <polygon points="20,20 60,20 20,60" fill="${a}"/>
          <polygon points="420,20 380,20 420,60" fill="${a}"/>
        </g>
      `;

    // ====================================================
    // 3. AUDIO & ACOUSTICS
    // ====================================================
    case 'in_ear':
      return `
        <!-- Precision In-Ear Monitors (IEMs) -->
        <g transform="translate(230, 140)">
          <g transform="translate(50, 40) rotate(-15)">
            <path d="M 20 20 Q 80 0 110 50 Q 120 100 80 120 Q 30 130 10 90 Z" fill="${p}" stroke="${s}" stroke-width="3"/>
            <circle cx="60" cy="65" r="16" fill="${a}"/>
            <ellipse cx="110" cy="50" rx="18" ry="12" fill="#E0E0E0" stroke="#BDBDBD" stroke-width="1.5"/>
          </g>
          <g transform="translate(210, 40) rotate(15)">
            <path d="M 90 20 Q 30 0 0 50 Q -10 100 30 120 Q 80 130 100 90 Z" fill="${p}" stroke="${s}" stroke-width="3"/>
            <circle cx="50" cy="65" r="16" fill="${a}"/>
            <ellipse cx="0" cy="50" rx="18" ry="12" fill="#E0E0E0" stroke="#BDBDBD" stroke-width="1.5"/>
          </g>
          <path d="M 60 130 Q 170 280 270 130" fill="none" stroke="${a}" stroke-width="4" stroke-dasharray="3,3"/>
        </g>
      `;

    case 'open_back_headphones':
      return `
        <!-- Reference Planar Open-Back Studio Headphones -->
        <g transform="translate(230, 90)">
          <path d="M 50 200 C 50 30, 290 30, 290 200" fill="none" stroke="${s}" stroke-width="6" stroke-linecap="round"/>
          <path d="M 75 160 C 95 85, 245 85, 265 160" fill="none" stroke="${p}" stroke-width="18" stroke-linecap="round"/>
          <!-- Left Ear Cup -->
          <g transform="translate(10, 170)">
            <rect x="0" y="5" width="60" height="130" rx="30" fill="#1C1917" stroke="#292524" stroke-width="3"/>
            <rect x="18" y="10" width="55" height="120" rx="27" fill="${p}" stroke="${s}" stroke-width="3"/>
            <circle cx="45" cy="70" r="28" fill="#18181B" stroke="${a}" stroke-width="2"/>
            <circle cx="45" cy="70" r="18" fill="none" stroke="${a}" stroke-width="1.5" stroke-dasharray="2,3"/>
          </g>
          <!-- Right Ear Cup -->
          <g transform="translate(270, 170)">
            <rect x="20" y="5" width="60" height="130" rx="30" fill="#1C1917" stroke="#292524" stroke-width="3"/>
            <rect x="7" y="10" width="55" height="120" rx="27" fill="${p}" stroke="${s}" stroke-width="3"/>
            <circle cx="35" cy="70" r="28" fill="#18181B" stroke="${a}" stroke-width="2"/>
            <circle cx="35" cy="70" r="18" fill="none" stroke="${a}" stroke-width="1.5" stroke-dasharray="2,3"/>
          </g>
          <path d="M 45 295 Q 60 380 170 380 Q 280 380 295 320" fill="none" stroke="#78716C" stroke-width="5" stroke-dasharray="3,3"/>
        </g>
      `;

    case 'closed_back_headphones':
      return `
        <!-- Closed-Back Wood Monitor Headphones -->
        <g transform="translate(230, 90)">
          <path d="M 50 200 C 50 30, 290 30, 290 200" fill="none" stroke="#334155" stroke-width="8" stroke-linecap="round"/>
          <path d="M 80 170 C 100 90, 240 90, 260 170" fill="none" stroke="${s}" stroke-width="16" stroke-linecap="round"/>
          <!-- Solid Turned Walnut Wooden Ear Cups -->
          <g transform="translate(5, 160)">
            <ellipse cx="40" cy="80" rx="42" ry="65" fill="#3E2723" stroke="#1F130B" stroke-width="4"/>
            <ellipse cx="40" cy="80" rx="30" ry="50" fill="${p}"/>
            <circle cx="40" cy="80" r="12" fill="${a}"/>
          </g>
          <g transform="translate(275, 160)">
            <ellipse cx="40" cy="80" rx="42" ry="65" fill="#3E2723" stroke="#1F130B" stroke-width="4"/>
            <ellipse cx="40" cy="80" rx="30" ry="50" fill="${p}"/>
            <circle cx="40" cy="80" r="12" fill="${a}"/>
          </g>
        </g>
      `;

    case 'headphone_stand':
      return `
        <!-- Sculpted Hardwood Headphone Stand -->
        <g transform="translate(260, 100)">
          <ellipse cx="140" cy="360" rx="90" ry="24" fill="${s}" stroke="#1F130B" stroke-width="3"/>
          <!-- Curved Steam-Bent Omega Arch -->
          <path d="M 70 350 C 60 180, 80 40, 140 40 C 200 40, 220 180, 210 350 Z" fill="${p}" stroke="#1F130B" stroke-width="4"/>
          <path d="M 100 340 C 90 200, 110 90, 140 90 C 170 90, 190 200, 180 340 Z" fill="${s}"/>
          <circle cx="140" cy="65" r="8" fill="${a}"/>
        </g>
      `;

    case 'speakers':
      return `
        <!-- Nearfield Walnut Studio Monitor Pair -->
        <g transform="translate(180, 120)">
          <rect x="0" y="20" width="190" height="290" rx="10" fill="${p}" stroke="#1F130B" stroke-width="4"/>
          <rect x="14" y="34" width="162" height="262" rx="6" fill="#18181B"/>
          <circle cx="95" cy="95" r="38" fill="#27272A" stroke="#3F3F46" stroke-width="2"/>
          <circle cx="95" cy="95" r="18" fill="${a}"/>
          <circle cx="95" cy="210" r="62" fill="#18181B" stroke="#3F3F46" stroke-width="3"/>
          <circle cx="95" cy="210" r="46" fill="#D97706" opacity="0.85"/>

          <rect x="250" y="20" width="190" height="290" rx="10" fill="${p}" stroke="#1F130B" stroke-width="4"/>
          <rect x="264" y="34" width="162" height="262" rx="6" fill="#18181B"/>
          <circle cx="345" cy="95" r="38" fill="#27272A" stroke="#3F3F46" stroke-width="2"/>
          <circle cx="345" cy="95" r="18" fill="${a}"/>
          <circle cx="345" cy="210" r="62" fill="#18181B" stroke="#3F3F46" stroke-width="3"/>
          <circle cx="345" cy="210" r="46" fill="#D97706" opacity="0.85"/>
        </g>
      `;

    case 'soundbar':
      return `
        <!-- Desktop Acoustic Studio Soundbar -->
        <g transform="translate(150, 180)">
          <rect x="0" y="40" width="500" height="110" rx="16" fill="${p}" stroke="#0F172A" stroke-width="4"/>
          <!-- Acoustic Woven Grille -->
          <rect x="15" y="52" width="470" height="86" rx="10" fill="#18181B"/>
          ${[50, 130, 210, 290, 370, 450].map((cx) => `
            <circle cx="${cx}" cy="95" r="28" fill="#27272A" stroke="#3F3F46" stroke-width="2"/>
            <circle cx="${cx}" cy="95" r="14" fill="${a}" opacity="0.8"/>
          `).join('')}
        </g>
      `;

    case 'amplifier':
      return `
        <!-- High-End Audio Amplifier / DAC Chassis -->
        <g transform="translate(180, 150)">
          <rect x="0" y="30" width="440" height="220" rx="10" fill="${p}" stroke="#1E293B" stroke-width="4"/>
          <rect x="12" y="42" width="416" height="196" rx="6" fill="#18181B"/>
          <!-- Dual Illuminated Analog VU Meters -->
          <rect x="35" y="70" width="135" height="90" rx="6" fill="#FEF3C7" stroke="#D97706" stroke-width="2.5"/>
          <path d="M 50 135 Q 102 95 155 135" fill="none" stroke="#92400E" stroke-width="2"/>
          <line x1="102" y1="150" x2="82" y2="92" stroke="#DC2626" stroke-width="2.5"/>
          <rect x="190" y="70" width="135" height="90" rx="6" fill="#FEF3C7" stroke="#D97706" stroke-width="2.5"/>
          <path d="M 205 135 Q 257 95 310 135" fill="none" stroke="#92400E" stroke-width="2"/>
          <line x1="257" y1="150" x2="272" y2="92" stroke="#DC2626" stroke-width="2.5"/>
          <!-- Master Dial -->
          <circle cx="375" cy="115" r="38" fill="#E2E8F0" stroke="#64748B" stroke-width="3"/>
          <circle cx="375" cy="115" r="28" fill="${p}"/>
          <line x1="375" y1="87" x2="375" y2="102" stroke="${a}" stroke-width="3"/>
        </g>
      `;

    case 'dac_dongle':
      return `
        <!-- Portable High-Res DAC & Headphone Amp Dongle -->
        <g transform="translate(250, 160)">
          <rect x="0" y="40" width="220" height="90" rx="14" fill="${p}" stroke="#0F172A" stroke-width="3"/>
          <rect x="25" y="55" width="80" height="60" rx="6" fill="#09090B"/>
          <text x="65" y="90" font-family="monospace" font-size="11" fill="${a}" text-anchor="middle">192kHz</text>
          <!-- Output Jacks -->
          <circle cx="160" cy="85" r="14" fill="#09090B" stroke="#475569" stroke-width="1.5"/>
          <circle cx="160" cy="85" r="6" fill="${a}"/>
          <circle cx="195" cy="85" r="10" fill="#09090B"/>
          <!-- Braided Interconnect Lead -->
          <path d="M 0 85 Q -60 85 -60 140 T 0 170" fill="none" stroke="${s}" stroke-width="6"/>
        </g>
      `;

    case 'audio_cable':
      return `
        <!-- High-Purity Braided Audiophile Audio Cable -->
        <g transform="translate(210, 130)">
          <ellipse cx="190" cy="180" rx="160" ry="100" fill="none" stroke="${p}" stroke-width="16" stroke-linecap="round"/>
          <ellipse cx="190" cy="180" rx="140" ry="85" fill="none" stroke="${s}" stroke-width="12" stroke-dasharray="6,4"/>
          <!-- Gold Plated XLR Connector -->
          <g transform="translate(20, 90) rotate(-35)">
            <rect x="0" y="0" width="85" height="28" rx="6" fill="${p}" stroke="#0F172A" stroke-width="3"/>
            <rect x="65" y="4" width="20" height="20" rx="3" fill="#E2E8F0"/>
            <circle cx="75" cy="10" r="2.5" fill="${a}"/>
            <circle cx="75" cy="18" r="2.5" fill="${a}"/>
          </g>
        </g>
      `;

    // ====================================================
    // 4. HOROLOGY & TIMEPIECES
    // ====================================================
    case 'watch_bauhaus':
      return `
        <!-- Minimalist Bauhaus Automatic Dress Watch -->
        <g transform="translate(250, 80)">
          <!-- Mesh/Leather Strap -->
          <rect x="115" y="0" width="70" height="120" rx="4" fill="${s}" stroke="#1E293B" stroke-width="2"/>
          <rect x="115" y="300" width="70" height="130" rx="4" fill="${s}" stroke="#1E293B" stroke-width="2"/>
          <!-- Clean Ultra-Slim Dial -->
          <circle cx="150" cy="210" r="100" fill="#F8FAFC" stroke="#64748B" stroke-width="4"/>
          <!-- Bauhaus Clean Baton Markers -->
          ${[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const x1 = 150 + Math.sin(rad) * 80;
            const y1 = 210 - Math.cos(rad) * 80;
            const x2 = 150 + Math.sin(rad) * 92;
            const y2 = 210 - Math.cos(rad) * 92;
            return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#1E293B" stroke-width="${deg % 90 === 0 ? '2.5' : '1.2'}"/>`;
          }).join('')}
          <!-- Needle Hands -->
          <line x1="150" y1="210" x2="150" y2="140" stroke="#0284C7" stroke-width="2" stroke-linecap="round"/>
          <line x1="150" y1="210" x2="200" y2="210" stroke="#0284C7" stroke-width="1.5" stroke-linecap="round"/>
          <circle cx="150" cy="210" r="3" fill="#0284C7"/>
        </g>
      `;

    case 'watch_diver':
      return `
        <!-- High-Depth 200M Automatic Diver Timepiece -->
        <g transform="translate(250, 80)">
          <rect x="105" y="0" width="90" height="120" rx="6" fill="#18181B" stroke="#09090B" stroke-width="2.5"/>
          <rect x="105" y="300" width="90" height="130" rx="6" fill="#18181B" stroke="#09090B" stroke-width="2.5"/>
          <!-- Heavy Diver Notched Bezel -->
          <circle cx="150" cy="210" r="110" fill="#0F172A" stroke="#475569" stroke-width="6"/>
          <circle cx="150" cy="210" r="92" fill="${p}"/>
          <!-- Luminescent Round Indices -->
          ${[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const cx = 150 + Math.sin(rad) * 75;
            const cy = 210 - Math.cos(rad) * 75;
            return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="6" fill="#E2E8F0" stroke="#059669" stroke-width="1.5"/>`;
          }).join('')}
          <line x1="150" y1="210" x2="150" y2="150" stroke="#F59E0B" stroke-width="4.5" stroke-linecap="round"/>
          <line x1="150" y1="210" x2="190" y2="230" stroke="#F59E0B" stroke-width="3" stroke-linecap="round"/>
        </g>
      `;

    case 'watch_field':
      return `
        <!-- Vintage Mechanical Military Field Watch -->
        <g transform="translate(250, 80)">
          <!-- Olive Drab / Tan NATO Strap -->
          <rect x="110" y="0" width="80" height="420" rx="4" fill="${s}" stroke="#1E293B" stroke-width="2"/>
          <circle cx="150" cy="210" r="98" fill="#18181B" stroke="#52525B" stroke-width="5"/>
          <!-- Arabic 12H and 24H Military Numbers -->
          <text x="150" y="145" font-family="-apple-system, sans-serif" font-size="14" font-weight="700" fill="#FEF3C7" text-anchor="middle">12</text>
          <text x="215" y="215" font-family="-apple-system, sans-serif" font-size="14" font-weight="700" fill="#FEF3C7" text-anchor="middle">3</text>
          <text x="150" y="285" font-family="-apple-system, sans-serif" font-size="14" font-weight="700" fill="#FEF3C7" text-anchor="middle">6</text>
          <text x="85" y="215" font-family="-apple-system, sans-serif" font-size="14" font-weight="700" fill="#FEF3C7" text-anchor="middle">9</text>
          <!-- Hands -->
          <line x1="150" y1="210" x2="150" y2="155" stroke="#F59E0B" stroke-width="3.5" stroke-linecap="round"/>
          <line x1="150" y1="210" x2="185" y2="185" stroke="#F59E0B" stroke-width="2.5" stroke-linecap="round"/>
        </g>
      `;

    case 'watch_skeleton':
      return `
        <!-- Skeletonized Mechanical Exhibition Watch -->
        <g transform="translate(250, 80)">
          <rect x="110" y="0" width="80" height="120" rx="4" fill="${s}" stroke="#0F172A" stroke-width="2"/>
          <rect x="110" y="300" width="80" height="130" rx="4" fill="${s}" stroke="#0F172A" stroke-width="2"/>
          <circle cx="150" cy="210" r="102" fill="#09090B" stroke="#64748B" stroke-width="4"/>
          <!-- Exposed Gear Train Mechanism -->
          <circle cx="130" cy="190" r="35" fill="none" stroke="${a}" stroke-width="5" stroke-dasharray="4,3"/>
          <circle cx="170" cy="230" r="30" fill="none" stroke="#D4AF37" stroke-width="4" stroke-dasharray="3,3"/>
          <circle cx="150" cy="210" r="18" fill="none" stroke="#E2E8F0" stroke-width="3"/>
          <circle cx="130" cy="190" r="6" fill="#DC2626"/>
          <circle cx="170" cy="230" r="5" fill="#DC2626"/>
        </g>
      `;

    case 'watch_strap':
      return `
        <!-- Handcrafted Horween Leather Watch Strap -->
        <g transform="translate(240, 140)">
          <g transform="translate(30, 0)">
            <rect x="0" y="30" width="80" height="160" rx="8" fill="${p}" stroke="${s}" stroke-width="3"/>
            <rect x="-10" y="5" width="100" height="36" rx="8" fill="#E2E8F0" stroke="#64748B" stroke-width="3.5"/>
            <line x1="10" y1="45" x2="10" y2="175" stroke="#FEF3C7" stroke-width="2" stroke-dasharray="5,4"/>
            <line x1="70" y1="45" x2="70" y2="175" stroke="#FEF3C7" stroke-width="2" stroke-dasharray="5,4"/>
          </g>
          <g transform="translate(170, 0)">
            <path d="M 0 30 L 80 30 L 80 200 Q 80 250 40 260 Q 0 250 0 200 Z" fill="${p}" stroke="${s}" stroke-width="3"/>
            ${[90, 120, 150, 180, 210].map((cy) => `<circle cx="40" cy="${cy}" r="4.5" fill="#1C1917"/>`).join('')}
          </g>
        </g>
      `;

    case 'watch_mesh':
      return `
        <!-- Milanese Stainless Steel Mesh Watch Band -->
        <g transform="translate(260, 120)">
          <rect x="20" y="20" width="100" height="280" rx="6" fill="#E2E8F0" stroke="#64748B" stroke-width="3"/>
          ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => `
            <line x1="25" y1="${35 + i * 20}" x2="115" y2="${35 + i * 20}" stroke="#94A3B8" stroke-width="2"/>
          `).join('')}
          <rect x="15" y="140" width="110" height="30" rx="4" fill="${p}" stroke="#0F172A" stroke-width="2"/>
        </g>
      `;

    case 'watch_box':
      return `
        <!-- Solid Walnut Watch Display Case -->
        <g transform="translate(200, 130)">
          <rect x="20" y="30" width="360" height="240" rx="14" fill="#3E2723" stroke="#1F130B" stroke-width="4"/>
          <!-- Glass Lid Inset -->
          <rect x="40" y="50" width="320" height="200" rx="8" fill="#F0FDFA" opacity="0.3" stroke="#D4AF37" stroke-width="2"/>
          <!-- 3 Display Pillows Inside -->
          <rect x="60" y="80" width="75" height="140" rx="20" fill="${s}"/>
          <rect x="162" y="80" width="75" height="140" rx="20" fill="${s}"/>
          <rect x="265" y="80" width="75" height="140" rx="20" fill="${s}"/>
        </g>
      `;

    case 'watch_chrono':
    default:
      if (visual.type.startsWith('watch')) {
        return `
          <!-- Atelier Automatic Column-Wheel Chronograph -->
          <g transform="translate(250, 80)">
            <rect x="105" y="0" width="90" height="120" rx="6" fill="${s}" stroke="#1F130B" stroke-width="2.5"/>
            <rect x="105" y="300" width="90" height="130" rx="6" fill="${s}" stroke="#1F130B" stroke-width="2.5"/>
            <circle cx="150" cy="210" r="105" fill="#E2E8F0" stroke="#64748B" stroke-width="5"/>
            <circle cx="150" cy="210" r="92" fill="${p}" stroke="#334155" stroke-width="2"/>
            <circle cx="115" cy="210" r="22" fill="#0F172A" stroke="#475569" stroke-width="1.5"/>
            <circle cx="185" cy="210" r="22" fill="#0F172A" stroke="#475569" stroke-width="1.5"/>
            <circle cx="150" cy="250" r="22" fill="#0F172A" stroke="#475569" stroke-width="1.5"/>
            <line x1="150" y1="210" x2="150" y2="150" stroke="${h}" stroke-width="4" stroke-linecap="round"/>
            <line x1="150" y1="210" x2="195" y2="195" stroke="${h}" stroke-width="3.5" stroke-linecap="round"/>
            <line x1="150" y1="225" x2="150" y2="135" stroke="${a}" stroke-width="2"/>
            <circle cx="150" cy="210" r="4.5" fill="${a}"/>
          </g>
        `;
      }
      break;
  }

  // ====================================================
  // 5. ARCHITECTURAL LIGHTING
  // ====================================================
  if (visual.type === 'pendant_light') {
    return `
      <!-- Architectural Spun Aluminum Pendant Luminaire -->
      <g transform="translate(250, 60)">
        <line x1="150" y1="0" x2="150" y2="180" stroke="#18181B" stroke-width="3.5"/>
        <rect x="140" y="170" width="20" height="25" rx="3" fill="#F59E0B" stroke="#B45309" stroke-width="1.5"/>
        <path d="M 30 250 C 60 185, 240 185, 270 250 Z" fill="${p}" stroke="#09090B" stroke-width="4"/>
        <ellipse cx="150" cy="250" rx="120" ry="24" fill="${a}" opacity="0.95"/>
        <polygon points="150,255 350,420 -50,420" fill="#FEF3C7" opacity="0.3"/>
      </g>
    `;
  }

  if (visual.type === 'floor_lamp') {
    return `
      <!-- Telescoping Minimalist Studio Floor Lamp -->
      <g transform="translate(270, 70)">
        <ellipse cx="130" cy="380" rx="80" ry="20" fill="${p}" stroke="#09090B" stroke-width="3"/>
        <line x1="130" y1="50" x2="130" y2="380" stroke="${s}" stroke-width="6"/>
        <ellipse cx="130" cy="50" rx="60" ry="18" fill="#F8FAFC" stroke="${a}" stroke-width="2"/>
        <polygon points="130,55 240,320 20,320" fill="#FEF3C7" opacity="0.25"/>
      </g>
    `;
  }

  if (visual.type === 'table_beacon') {
    return `
      <!-- Ambient Travertine Stone Table Beacon -->
      <g transform="translate(270, 110)">
        <rect x="30" y="80" width="180" height="240" rx="20" fill="#D7CCC8" stroke="#8D6E63" stroke-width="3"/>
        <ellipse cx="120" cy="80" rx="90" ry="30" fill="#BCAAA4"/>
        <circle cx="120" cy="80" r="28" fill="#FEF3C7" filter="drop-shadow(0 0 16px #FDE68A)"/>
      </g>
    `;
  }

  if (visual.type === 'desk_lamp') {
    return `
      <!-- Counterweighted Solid Brass Desk Task Lamp -->
      <g transform="translate(230, 90)">
        <ellipse cx="80" cy="350" rx="65" ry="20" fill="${p}" stroke="#78350F" stroke-width="3.5"/>
        <rect x="70" y="220" width="20" height="135" fill="${p}" stroke="#78350F" stroke-width="2"/>
        <circle cx="30" cy="170" r="28" fill="${s}" stroke="#78350F" stroke-width="3"/>
        <line x1="45" y1="175" x2="260" y2="135" stroke="${p}" stroke-width="9" stroke-linecap="round"/>
        <path d="M 250 115 L 325 160 L 270 205 Z" fill="${p}" stroke="#78350F" stroke-width="2.5"/>
        <polygon points="285,180 395,360 190,360" fill="#FEF3C7" opacity="0.35"/>
      </g>
    `;
  }

  // ====================================================
  // 6. CERAMICS & TABLEWARE
  // ====================================================
  if (visual.type === 'coffee_mug') {
    return `
      <!-- Hand-Thrown Stoneware Coffee Mug -->
      <g transform="translate(260, 140)">
        <rect x="60" y="40" width="170" height="210" rx="24" fill="${p}" stroke="${s}" stroke-width="4"/>
        <ellipse cx="145" cy="40" rx="85" ry="22" fill="#D7CCC8" stroke="${s}" stroke-width="3.5"/>
        <ellipse cx="145" cy="42" rx="72" ry="17" fill="#78350F"/>
        <path d="M 60 100 Q 145 135 230 100 L 230 230 Q 145 260 60 230 Z" fill="${s}" opacity="0.9"/>
        <path d="M 225 75 C 310 75, 310 205, 225 205" fill="none" stroke="${s}" stroke-width="28" stroke-linecap="round"/>
        <path d="M 225 75 C 300 75, 300 205, 225 205" fill="none" stroke="${p}" stroke-width="14" stroke-linecap="round"/>
      </g>
    `;
  }

  if (visual.type === 'teapot') {
    return `
      <!-- Stoneware Teapot with Bent Bamboo Handle -->
      <g transform="translate(220, 110)">
        <path d="M 80 180 C 80 30, 280 30, 280 180" fill="none" stroke="#D97706" stroke-width="16" stroke-linecap="round"/>
        <ellipse cx="180" cy="230" rx="140" ry="105" fill="${p}" stroke="${s}" stroke-width="4"/>
        <ellipse cx="180" cy="140" rx="60" ry="16" fill="${s}" stroke="#1E293B" stroke-width="3"/>
        <circle cx="180" cy="128" r="10" fill="${a}"/>
        <path d="M 60 210 Q 0 170 -10 130 Q 10 130 40 180 Z" fill="${p}" stroke="${s}" stroke-width="3"/>
      </g>
    `;
  }

  if (visual.type === 'dinner_plates') {
    return `
      <!-- Stack of Artisanal Stoneware Dinner Plates -->
      <g transform="translate(210, 160)">
        ${[0, 1, 2].map((i) => `
          <g transform="translate(0, ${i * 30})">
            <ellipse cx="190" cy="80" rx="170" ry="45" fill="${p}" stroke="${s}" stroke-width="3.5"/>
            <ellipse cx="190" cy="76" rx="150" ry="36" fill="${s}"/>
          </g>
        `).join('')}
      </g>
    `;
  }

  if (visual.type === 'ceramic_vase') {
    return `
      <!-- Sculptural Textured Ikebana Ceramic Vessel -->
      <g transform="translate(270, 100)">
        <path d="M 60 50 Q 130 30 180 80 Q 220 180 180 280 Q 130 330 60 290 Q 20 200 60 50 Z" fill="${p}" stroke="${s}" stroke-width="4"/>
        <ellipse cx="110" cy="50" rx="40" ry="12" fill="#18181B"/>
        <line x1="80" y1="120" x2="160" y2="120" stroke="${a}" stroke-width="2"/>
        <line x1="70" y1="180" x2="170" y2="180" stroke="${a}" stroke-width="2"/>
      </g>
    `;
  }

  if (visual.type === 'ceramic_tableware' || visual.type === 'espresso_cup') {
    return `
      <!-- Fluted Ceramic Serving Bowl -->
      <g transform="translate(190, 180)">
        <ellipse cx="210" cy="120" rx="200" ry="75" fill="${p}" stroke="#1E293B" stroke-width="4"/>
        <ellipse cx="210" cy="110" rx="180" ry="58" fill="${s}"/>
        <path d="M 40 120 Q 210 185 380 120" fill="none" stroke="${a}" stroke-width="2.5" opacity="0.7"/>
      </g>
    `;
  }

  // ====================================================
  // 7. COFFEE CRAFT & BREWING (APPLIANCES)
  // ====================================================
  if (visual.type === 'coffee_kettle') {
    return `
      <!-- Minimalist Gooseneck Electric Pouring Kettle -->
      <g transform="translate(220, 110)">
        <!-- Heated Electric Power Base -->
        <rect x="60" y="270" width="220" height="24" rx="6" fill="#18181B" stroke="#27272A" stroke-width="2"/>
        <!-- Kettle Body -->
        <path d="M 80 100 L 60 260 L 280 260 L 260 100 Z" fill="${p}" stroke="#0F172A" stroke-width="4"/>
        <rect x="130" y="80" width="80" height="22" rx="4" fill="${s}"/>
        <circle cx="170" cy="70" r="8" fill="${a}"/>
        <!-- Elegant Curved Gooseneck Spout -->
        <path d="M 70 240 Q -10 200 -5 90 Q -3 60 25 70" fill="none" stroke="${p}" stroke-width="12" stroke-linecap="round"/>
        <!-- Ergonomic Handle -->
        <path d="M 270 120 C 350 120, 350 250, 270 250" fill="none" stroke="${s}" stroke-width="18" stroke-linecap="round"/>
      </g>
    `;
  }

  if (visual.type === 'coffee_grinder') {
    return `
      <!-- Precision Conical Burr Manual Hand Grinder -->
      <g transform="translate(270, 80)">
        <!-- Slender Aluminum Cylinder Body -->
        <rect x="40" y="90" width="120" height="260" rx="12" fill="${p}" stroke="#0F172A" stroke-width="4"/>
        <!-- Diamond Knurled Grip Band -->
        <rect x="40" y="150" width="120" height="80" fill="${s}"/>
        <!-- Top Crank Handle -->
        <path d="M 100 90 L 100 40 L 220 40" fill="none" stroke="#64748B" stroke-width="10" stroke-linecap="round"/>
        <circle cx="220" cy="40" r="18" fill="#78350F" stroke="#451A03" stroke-width="2"/>
      </g>
    `;
  }

  if (visual.type === 'espresso_machine') {
    return `
      <!-- Commercial 58mm Portafilter Espresso Machine -->
      <g transform="translate(200, 90)">
        <rect x="30" y="20" width="340" height="320" rx="16" fill="${p}" stroke="#0F172A" stroke-width="4"/>
        <rect x="50" y="40" width="300" height="70" rx="8" fill="#18181B"/>
        <!-- Pressure Gauge -->
        <circle cx="110" cy="75" r="22" fill="#FEF3C7" stroke="#D97706" stroke-width="2"/>
        <line x1="110" y1="75" x2="122" y2="65" stroke="#DC2626" stroke-width="2"/>
        <!-- 58mm Brass Group Head & Portafilter -->
        <rect x="170" y="110" width="60" height="35" rx="4" fill="#B45309"/>
        <rect x="160" y="145" width="80" height="24" rx="4" fill="${s}"/>
        <path d="M 240 157 L 340 170" fill="none" stroke="#78350F" stroke-width="14" stroke-linecap="round"/>
      </g>
    `;
  }

  if (visual.type === 'coffee_maker' || visual.type === 'cold_brew_tower' || visual.type === 'coffee_scale') {
    return `
      <!-- Artisanal Pour-Over Coffee Dripper & Carafe -->
      <g transform="translate(250, 100)">
        <path d="M 80 160 L 40 320 Q 40 340 65 340 L 235 340 Q 260 340 260 320 L 220 160 Z" fill="#F0FDFA" opacity="0.7" stroke="#5EEAD4" stroke-width="2.5"/>
        <path d="M 54 260 Q 150 275 246 260 L 254 322 Q 254 334 235 334 L 65 334 Q 46 334 46 322 Z" fill="#78350F" opacity="0.9"/>
        <rect x="75" y="150" width="150" height="34" rx="6" fill="#92400E" stroke="#78350F" stroke-width="2"/>
        <path d="M 20 50 L 280 50 L 185 150 L 115 150 Z" fill="${p}" stroke="${s}" stroke-width="3"/>
        <ellipse cx="150" cy="50" rx="130" ry="26" fill="${s}" stroke="${p}" stroke-width="3"/>
      </g>
    `;
  }

  // ====================================================
  // 8. BAGS & TECHNICAL CARRY
  // ====================================================
  if (visual.type === 'briefcase') {
    return `
      <!-- Structured Italian Leather Briefcase -->
      <g transform="translate(190, 130)">
        <path d="M 170 50 C 170 0, 250 0, 250 50" fill="none" stroke="#78350F" stroke-width="16" stroke-linecap="round"/>
        <rect x="20" y="50" width="380" height="250" rx="16" fill="${p}" stroke="#1F130B" stroke-width="4"/>
        <path d="M 20 50 L 400 50 L 400 170 Q 210 210 20 170 Z" fill="${s}" stroke="#1F130B" stroke-width="3"/>
        <rect x="90" y="160" width="28" height="38" rx="4" fill="#F59E0B" stroke="#B45309" stroke-width="2"/>
        <rect x="300" y="160" width="28" height="38" rx="4" fill="#F59E0B" stroke="#B45309" stroke-width="2"/>
      </g>
    `;
  }

  if (visual.type === 'duffel_bag') {
    return `
      <!-- Heavyweight Canvas Weekender Duffel Bag -->
      <g transform="translate(190, 140)">
        <rect x="40" y="50" width="340" height="220" rx="60" fill="${p}" stroke="#1F130B" stroke-width="4"/>
        <path d="M 130 50 C 130 -10, 290 -10, 290 50" fill="none" stroke="#78350F" stroke-width="14" stroke-linecap="round"/>
        <line x1="80" y1="50" x2="80" y2="270" stroke="${s}" stroke-width="16"/>
        <line x1="340" y1="50" x2="340" y2="270" stroke="${s}" stroke-width="16"/>
      </g>
    `;
  }

  if (visual.type === 'messenger_bag' || visual.type === 'crossbody_sling') {
    return `
      <!-- Technical Messenger / Crossbody Sling Bag -->
      <g transform="translate(200, 130)">
        <path d="M 30 70 L 370 70 L 350 270 Q 200 300 50 270 Z" fill="${p}" stroke="#0F172A" stroke-width="4"/>
        <path d="M 20 70 L 380 70 L 350 180 Q 200 220 50 180 Z" fill="${s}" stroke="#0F172A" stroke-width="3"/>
        <rect x="180" y="160" width="40" height="32" rx="4" fill="#F59E0B"/>
        <path d="M 20 80 Q 200 -40 380 80" fill="none" stroke="#334155" stroke-width="18"/>
      </g>
    `;
  }

  if (visual.type === 'tote_bag') {
    return `
      <!-- Reinforced Waxed Canvas Tote Bag -->
      <g transform="translate(220, 90)">
        <path d="M 120 120 C 120 10, 240 10, 240 120" fill="none" stroke="#78350F" stroke-width="16" stroke-linecap="round"/>
        <polygon points="50,120 310,120 280,360 80,360" fill="${p}" stroke="#1F130B" stroke-width="4"/>
        <polygon points="80,360 280,360 290,290 70,290" fill="${s}"/>
      </g>
    `;
  }

  if (visual.type === 'backpack' || visual.type === 'leather_folio') {
    return `
      <!-- Rolltop Weatherproof Waxed Canvas Backpack -->
      <g transform="translate(230, 90)">
        <path d="M 40 120 L 40 340 Q 40 360 65 360 L 275 360 Q 300 360 300 340 L 300 120 Z" fill="${p}" stroke="#1C1917" stroke-width="4"/>
        <path d="M 30 120 L 310 120 L 290 60 L 50 60 Z" fill="${s}" stroke="#1C1917" stroke-width="3"/>
        <rect x="90" y="55" width="18" height="250" rx="3" fill="#78350F" stroke="#451A03" stroke-width="1.5"/>
        <rect x="230" y="55" width="18" height="250" rx="3" fill="#78350F" stroke="#451A03" stroke-width="1.5"/>
        <rect x="75" y="230" width="190" height="100" rx="8" fill="${s}" stroke="#1C1917" stroke-width="2.5"/>
      </g>
    `;
  }

  // ====================================================
  // 9. CAMERAS & OPTICS
  // ====================================================
  if (visual.type === 'camera_lens') {
    return `
      <!-- Fast Aspherical Prime Camera Lens -->
      <g transform="translate(260, 110)">
        <rect x="30" y="40" width="220" height="290" rx="14" fill="${p}" stroke="#0F172A" stroke-width="4"/>
        <rect x="30" y="100" width="220" height="90" fill="#27272A" stroke="#3F3F46" stroke-width="2"/>
        <ellipse cx="140" cy="40" rx="110" ry="32" fill="#18181B" stroke="#52525B" stroke-width="4"/>
        <ellipse cx="140" cy="40" rx="85" ry="24" fill="#064E3B" stroke="${a}" stroke-width="2"/>
        <ellipse cx="125" cy="35" rx="35" ry="10" fill="#FFFFFF" opacity="0.35"/>
      </g>
    `;
  }

  if (visual.type === 'camera' || visual.type === 'camera_mirrorless' || visual.type === 'camera_slr' || visual.type === 'camera_strap') {
    return `
      <!-- Mechanical 35mm Rangefinder Camera Body -->
      <g transform="translate(200, 140)">
        <rect x="0" y="40" width="400" height="240" rx="18" fill="${p}" stroke="#09090B" stroke-width="4"/>
        <rect x="0" y="90" width="400" height="175" rx="4" fill="${s}"/>
        <rect x="25" y="16" width="350" height="30" rx="6" fill="#D4D4D8" stroke="#52525B" stroke-width="2"/>
        <circle cx="105" cy="115" r="14" fill="${a}"/>
        <circle cx="200" cy="175" r="88" fill="#18181B" stroke="#52525B" stroke-width="5"/>
        <circle cx="200" cy="175" r="54" fill="#064E3B" stroke="#047857" stroke-width="2"/>
      </g>
    `;
  }

  // ====================================================
  // 10. ARTISAN FOOTWEAR & APPAREL
  // ====================================================
  if (visual.type === 'shoes_sneaker') {
    return `
      <!-- Minimalist Low-Top Calfskin Sneaker -->
      <g transform="translate(190, 160)">
        <!-- Clean Leather Upper -->
        <path d="M 60 140 Q 90 60 180 70 Q 260 80 320 120 Q 380 150 400 200 L 400 240 L 40 240 L 40 180 Z" fill="${p}" stroke="#1C1917" stroke-width="3.5"/>
        <!-- Clean White Cupsole -->
        <rect x="35" y="240" width="375" height="34" rx="6" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="2"/>
        <!-- Eyelets and Flat Laces -->
        ${[0, 1, 2, 3, 4].map((i) => `
          <circle cx="${180 + i * 20}" cy="${95 + i * 16}" r="3.5" fill="#E2E8F0"/>
          <line x1="${170 + i * 20}" y1="${95 + i * 16}" x2="${190 + i * 20}" y2="${95 + i * 16}" stroke="#F8FAFC" stroke-width="2"/>
        `).join('')}
      </g>
    `;
  }

  if (visual.type === 'boot_chelsea') {
    return `
      <!-- Hand-Burnished Leather Chelsea Boot -->
      <g transform="translate(200, 130)">
        <path d="M 120 40 L 200 40 L 210 120 Q 250 160 330 190 Q 390 210 395 250 L 380 280 L 70 280 L 60 190 Q 55 120 120 40 Z" fill="${p}" stroke="#1C1917" stroke-width="4"/>
        <!-- Elastic Side Gusset V-Gore -->
        <polygon points="125,50 175,50 165,160 135,160" fill="#18181B" stroke="#09090B" stroke-width="2"/>
        <!-- Stacked Heel & Sole -->
        <rect x="50" y="280" width="350" height="24" rx="4" fill="#78350F" stroke="#1C1917" stroke-width="2"/>
        <rect x="50" y="280" width="80" height="38" rx="4" fill="#18181B"/>
      </g>
    `;
  }

  if (visual.type === 'shoes_brogue' || visual.type === 'shoes_loafer' || visual.type === 'shoes_monk' || visual.type === 'boot_chukka') {
    return `
      <!-- Handcrafted Goodyear-Welted Leather Dress Shoe -->
      <g transform="translate(190, 160)">
        <path d="M 80 120 Q 120 60 200 70 Q 280 90 350 130 Q 390 150 400 210 L 390 240 L 50 240 L 50 170 Z" fill="${p}" stroke="#1C1917" stroke-width="4"/>
        <line x1="310" y1="130" x2="330" y2="240" stroke="#FEF3C7" stroke-width="2" stroke-dasharray="3,3"/>
        <rect x="40" y="240" width="370" height="25" rx="4" fill="#78350F" stroke="#1C1917" stroke-width="2"/>
        <rect x="40" y="240" width="85" height="38" rx="4" fill="#18181B"/>
      </g>
    `;
  }

  if (visual.type === 'apparel_jacket') {
    return `
      <!-- Classic Waxed Cotton Commuter Field Jacket -->
      <g transform="translate(200, 110)">
        <!-- Jacket Body -->
        <path d="M 80 40 L 140 10 L 260 10 L 320 40 L 370 200 L 310 210 L 300 340 L 100 340 L 90 210 L 30 200 Z" fill="${p}" stroke="#0F172A" stroke-width="4"/>
        <!-- Contrast Corduroy Collar -->
        <polygon points="140,10 200,45 150,85 100,50" fill="#78350F"/>
        <polygon points="260,10 200,45 250,85 300,50" fill="#78350F"/>
        <!-- Dual Bellows Flap Pockets -->
        <rect x="115" y="220" width="75" height="90" rx="6" fill="${s}" stroke="#0F172A" stroke-width="2"/>
        <rect x="210" y="220" width="75" height="90" rx="6" fill="${s}" stroke="#0F172A" stroke-width="2"/>
        <!-- Brass Center Zipper Storm Flap -->
        <line x1="200" y1="45" x2="200" y2="340" stroke="#F59E0B" stroke-width="3"/>
      </g>
    `;
  }

  if (visual.type === 'apparel_overshirt') {
    return `
      <!-- Raw Selvedge Denim Commuter Overshirt -->
      <g transform="translate(200, 110)">
        <path d="M 90 35 L 150 15 L 250 15 L 310 35 L 360 190 L 310 200 L 295 330 L 105 330 L 90 200 L 40 190 Z" fill="${p}" stroke="#172554" stroke-width="4"/>
        <polygon points="150,15 200,50 160,80 120,45" fill="${s}"/>
        <polygon points="250,15 200,50 240,80 280,45" fill="${s}"/>
        <!-- Twin Chest Pockets -->
        <rect x="120" y="100" width="65" height="75" rx="4" fill="${s}" stroke="#F59E0B" stroke-width="1.5"/>
        <rect x="215" y="100" width="65" height="75" rx="4" fill="${s}" stroke="#F59E0B" stroke-width="1.5"/>
      </g>
    `;
  }

  if (visual.type === 'apparel_cardigan') {
    return `
      <!-- Chunky Ribbed Merino Wool Knit Cardigan -->
      <g transform="translate(200, 110)">
        <path d="M 80 40 L 140 15 L 260 15 L 320 40 L 360 210 L 310 220 L 300 330 L 100 330 L 90 220 L 40 210 Z" fill="${p}" stroke="#1E293B" stroke-width="4"/>
        <!-- Shawl Collar V-Neck -->
        <path d="M 140 15 Q 200 130 180 330" fill="none" stroke="${s}" stroke-width="18"/>
        <path d="M 260 15 Q 200 130 220 330" fill="none" stroke="${s}" stroke-width="18"/>
        <!-- Horn Buttons -->
        ${[120, 170, 220, 270].map((cy) => `
          <circle cx="200" cy="${cy}" r="7" fill="#78350F" stroke="#451A03" stroke-width="2"/>
        `).join('')}
      </g>
    `;
  }

  if (visual.type === 'boot_service') {
    return `
      <!-- Goodyear-Welted Leather Service Boot -->
      <g transform="translate(200, 150)">
        <path d="M 120 20 L 190 20 L 195 100 Q 240 140 320 170 Q 380 190 390 230 L 380 260 L 70 260 L 60 170 Q 55 100 120 20 Z" fill="${p}" stroke="#1C1917" stroke-width="4"/>
        <line x1="50" y1="260" x2="400" y2="260" stroke="#F59E0B" stroke-width="4"/>
        <rect x="45" y="264" width="365" height="18" fill="#78350F" stroke="#1C1917" stroke-width="2"/>
        <rect x="45" y="282" width="365" height="24" rx="4" fill="#18181B" stroke="#000000" stroke-width="2"/>
        <rect x="45" y="282" width="85" height="36" rx="4" fill="#18181B"/>
      </g>
    `;
  }

  // ====================================================
  // 11. MINIMALIST FURNITURE & LIVING
  // ====================================================
  if (visual.type === 'furniture_chair') {
    return `
      <!-- Mid-Century Sculpted Teak Lounge Chair -->
      <g transform="translate(210, 120)">
        <path d="M 80 40 Q 180 20 280 40 L 260 190 Q 180 210 100 190 Z" fill="${p}" stroke="#451A03" stroke-width="4"/>
        <rect x="95" y="48" width="170" height="135" rx="20" fill="${s}" stroke="#1C1917" stroke-width="2.5"/>
        <ellipse cx="180" cy="225" rx="140" ry="38" fill="${s}" stroke="#1C1917" stroke-width="3"/>
        <path d="M 40 160 Q 80 130 110 170" fill="none" stroke="${p}" stroke-width="16" stroke-linecap="round"/>
        <path d="M 320 160 Q 280 130 250 170" fill="none" stroke="${p}" stroke-width="16" stroke-linecap="round"/>
        <line x1="180" y1="260" x2="180" y2="330" stroke="#94A3B8" stroke-width="14" stroke-linecap="round"/>
        <line x1="180" y1="330" x2="80" y2="360" stroke="#64748B" stroke-width="10" stroke-linecap="round"/>
        <line x1="180" y1="330" x2="280" y2="360" stroke="#64748B" stroke-width="10" stroke-linecap="round"/>
      </g>
    `;
  }

  if (visual.type === 'furniture_stool') {
    return `
      <!-- Hand-Turned Solid Hardwood Low Stool -->
      <g transform="translate(260, 150)">
        <ellipse cx="140" cy="70" rx="110" ry="35" fill="${p}" stroke="#713F12" stroke-width="4"/>
        <polygon points="60,95 80,95 40,280 20,280" fill="${s}"/>
        <polygon points="130,95 150,95 140,280 120,280" fill="${p}"/>
        <polygon points="200,95 220,95 240,280 220,280" fill="${s}"/>
      </g>
    `;
  }

  if (visual.type === 'furniture_table' || visual.type === 'furniture_desk' || visual.type === 'furniture_shelf') {
    return `
      <!-- Solid White Oak Architectural Low Table -->
      <g transform="translate(180, 160)">
        <polygon points="50,40 390,40 440,110 0,110" fill="${p}" stroke="#713F12" stroke-width="4"/>
        <rect x="0" y="110" width="440" height="26" rx="4" fill="${s}" stroke="#713F12" stroke-width="3"/>
        <polygon points="40,136 60,136 30,300 10,300" fill="${p}" stroke="#713F12" stroke-width="2.5"/>
        <polygon points="380,136 400,136 430,300 410,300" fill="${p}" stroke="#713F12" stroke-width="2.5"/>
      </g>
    `;
  }

  // Fallback Curated Object
  return `
    <!-- Curated Studio Artifact -->
    <g transform="translate(240, 140)">
      <rect x="40" y="40" width="240" height="240" rx="30" fill="${p}" stroke="#0F172A" stroke-width="4"/>
      <circle cx="160" cy="160" r="70" fill="${s}"/>
      <circle cx="160" cy="160" r="35" fill="${a}"/>
    </g>
  `;
}

/**
 * Macro detail craftsmanship view
 */
function renderMacroDetail(visual: ProductVisualDef, seed: number, hash: number, title: string): string {
  const p = visual.primaryColor;
  const s = visual.secondaryColor;
  const a = visual.accentColor;

  return `
    <g transform="translate(200, 100)">
      <!-- Studio Macro Loupe Frame -->
      <circle cx="200" cy="180" r="160" fill="${p}" stroke="#09090B" stroke-width="6"/>
      <circle cx="200" cy="180" r="148" fill="#18181B"/>
      
      <!-- Macro Craftsmanship Grain & Weave Texture -->
      <path d="M 80 180 Q 200 80 320 180" fill="none" stroke="${a}" stroke-width="4" opacity="0.8"/>
      <path d="M 80 210 Q 200 110 320 210" fill="none" stroke="${s}" stroke-width="4" opacity="0.8"/>
      <path d="M 80 150 Q 200 50 320 150" fill="none" stroke="${a}" stroke-width="3" opacity="0.6"/>
      <circle cx="200" cy="180" r="45" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-dasharray="6,4"/>

      <!-- Magnifier Glass Glare Streak -->
      <path d="M 90 100 A 150 150 0 0 1 310 100" fill="none" stroke="#FFFFFF" stroke-width="8" opacity="0.3"/>
    </g>
  `;
}

/**
 * Generates an SVG product showcase image for the product
 */
export function generateProductSvg(
  productId: string,
  title: string,
  brand: string,
  category: string,
  isDetail: boolean = false
): string {
  const visual = classifyProductToVisual(title, category, productId);
  const hash = hashString(productId + title);
  const seed = (hash % 100) / 100;
  const editionNumber = (hash % 9) + 1;
  const serialCode = String(1000 + (hash % 9000));

  const contentGraphic = isDetail
    ? renderMacroDetail(visual, seed, hash, title)
    : renderProductSilhouette(visual, seed, hash, title);

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <defs>
    <!-- Radial Studio Lighting Canvas -->
    <radialGradient id="studioLighting" cx="50%" cy="42%" r="75%">
      <stop offset="0%" stop-color="${visual.bgGradStart}"/>
      <stop offset="100%" stop-color="${visual.bgGradEnd}"/>
    </radialGradient>

    <!-- Laptop / Phone Screen Gradients -->
    <linearGradient id="screenGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F172A"/>
      <stop offset="50%" stop-color="#1E1B4B"/>
      <stop offset="100%" stop-color="#0284C7"/>
    </linearGradient>

    <linearGradient id="screenGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#18181B"/>
      <stop offset="50%" stop-color="#312E81"/>
      <stop offset="100%" stop-color="#4F46E5"/>
    </linearGradient>

    <linearGradient id="phoneScreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#09090B"/>
      <stop offset="50%" stop-color="${visual.primaryColor}"/>
      <stop offset="100%" stop-color="${visual.accentColor}"/>
    </linearGradient>

    <!-- Soft Drop Shadow -->
    <filter id="pedestalShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="16"/>
      <feOffset dx="0" dy="20" result="offsetblur"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.16"/>
      </feComponentTransfer>
      <feMerge> 
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Studio Background Canvas -->
  <rect width="800" height="600" fill="url(#studioLighting)"/>

  <!-- Architectural Pedestal Ground Shadow -->
  <ellipse cx="400" cy="495" rx="270" ry="24" fill="#000000" opacity="0.09" filter="blur(10px)"/>

  <!-- Main Product Subject Visual -->
  <g filter="url(#pedestalShadow)">
    ${contentGraphic}
  </g>

  <!-- Editorial Top Left Header -->
  <g transform="translate(48, 52)">
    <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#78716C" letter-spacing="1.5">
      ${escapeXml(brand.toUpperCase())} · ${escapeXml(visual.name.toUpperCase())}
    </text>
    <text x="0" y="24" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="17" font-weight="700" fill="#1C1917">
      ${escapeXml(title)}${isDetail ? ' (Macro Studio Detail)' : ''}
    </text>
  </g>

  <!-- Studio Archive Bottom Right Stamp -->
  <g transform="translate(752, 552)">
    <text text-anchor="end" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="10" font-weight="600" fill="#A8A29E" letter-spacing="0.5">
      EDITION M-${editionNumber} · ARCHIVE #${serialCode} · ${escapeXml(visual.categoryFolder.toUpperCase())}
    </text>
  </g>
</svg>
  `.trim();
}

/**
 * Handles HTTP requests for product images (both dynamic vector studio assets and static photos)
 */
export function handleProductImageRequest(req: any, res: any) {
  const { id } = req.params;
  const isDetail = id.includes('-detail');
  const cleanId = id.replace(/-detail/i, '').replace(/\.(svg|jpg|jpeg|png)$/i, '');

  const product = queryOne<{
    id: string;
    title: string;
    brand: string;
    category_name: string;
  }>(`
    SELECT p.id, p.title, p.brand, c.name as category_name
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE p.id = ?
  `, [cleanId]);

  const title = product ? product.title : 'Architectural Craft Edition';
  const brand = product ? product.brand : 'Studio Archive';
  const category = product ? product.category_name : 'Curated Goods';

  // Check if a dedicated static photo specifically for this exact cleanId exists
  const candidateStaticPaths = [
    path.resolve(process.cwd(), `src/assets/images/products/${cleanId}.jpg`),
    path.resolve(process.cwd(), `src/assets/images/products/${cleanId}.png`),
    path.resolve(process.cwd(), `src/assets/images/${cleanId}.jpg`),
  ];

  for (const staticPath of candidateStaticPaths) {
    if (fs.existsSync(staticPath) && !id.endsWith('.svg')) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.sendFile(staticPath);
    }
  }

  // Generate tailored SVG product showcase image
  const svg = generateProductSvg(cleanId, title, brand, category, isDetail);
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  return res.send(svg);
}

/**
 * Handles Category-Specific Fallback Image Requests
 */
export function handleCategoryFallbackImage(req: any, res: any) {
  const { categorySlug } = req.params;
  const dummyTitle = `${categorySlug.replace(/-/g, ' ').toUpperCase()} ARCHIVE EDITION`;
  const svg = generateProductSvg(`fallback-${categorySlug}`, dummyTitle, 'Studio Archive', categorySlug, false);
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  return res.send(svg);
}
