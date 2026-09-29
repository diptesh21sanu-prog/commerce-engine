/**
 * Category-Specific Image Fallback Utility
 * 
 * Provides category-matching fallback images when an image fails to load.
 * Never uses a single generic fallback for all products.
 */

export function getCategoryFallbackImage(category?: string): string {
  const c = (category || '').toLowerCase();

  if (c.includes('audio') || c.includes('acoustic') || c.includes('headphone') || c.includes('speaker')) {
    return '/api/v1/images/fallback/audio-acoustics';
  }
  if (c.includes('comput') || c.includes('workspace') || c.includes('keyboard') || c.includes('laptop')) {
    return '/api/v1/images/fallback/computing-workspace';
  }
  if (c.includes('watch') || c.includes('horology') || c.includes('timepiece')) {
    return '/api/v1/images/fallback/fine-horology';
  }
  if (c.includes('light') || c.includes('lamp') || c.includes('luminaire')) {
    return '/api/v1/images/fallback/architectural-lighting';
  }
  if (c.includes('ceramic') || c.includes('tableware') || c.includes('mug') || c.includes('bowl')) {
    return '/api/v1/images/fallback/ceramics-tableware';
  }
  if (c.includes('coffee') || c.includes('brew') || c.includes('kettle') || c.includes('dripper')) {
    return '/api/v1/images/fallback/coffee-craft';
  }
  if (c.includes('bag') || c.includes('carry') || c.includes('pack') || c.includes('briefcase')) {
    return '/api/v1/images/fallback/bags-carry';
  }
  if (c.includes('camera') || c.includes('optic') || c.includes('lens')) {
    return '/api/v1/images/fallback/cameras-optics';
  }
  if (c.includes('furniture') || c.includes('chair') || c.includes('table') || c.includes('living')) {
    return '/api/v1/images/fallback/minimalist-furniture';
  }
  if (c.includes('footwear') || c.includes('shoe') || c.includes('boot') || c.includes('apparel') || c.includes('jacket')) {
    return '/api/v1/images/fallback/artisan-footwear';
  }
  if (c.includes('mobile') || c.includes('phone') || c.includes('tech') || c.includes('charger')) {
    return '/api/v1/images/fallback/mobile-gear';
  }

  return '/api/v1/images/fallback/curated-goods';
}

/**
 * Returns inline SVG data URI as immediate zero-latency fallback
 */
export function getCategoryFallbackDataUri(category?: string): string {
  const c = (category || '').toLowerCase();
  let iconSvg = '';
  let label = 'CURATED GOODS';
  let bg = '#F4F4F5';
  let accent = '#71717A';

  if (c.includes('audio') || c.includes('headphone')) {
    label = 'AUDIO & ACOUSTICS';
    bg = '#F1F5F9';
    accent = '#475569';
    iconSvg = '<path d="M12 4v16m-6-12v8m12-8v8m-18-4v0m24 0v0" stroke="' + accent + '" stroke-width="2" stroke-linecap="round"/>';
  } else if (c.includes('comput') || c.includes('keyboard') || c.includes('laptop')) {
    label = 'COMPUTING & WORKSPACE';
    bg = '#F8FAFC';
    accent = '#334155';
    iconSvg = '<rect x="3" y="5" width="18" height="12" rx="2" stroke="' + accent + '" stroke-width="2" fill="none"/><line x1="2" y1="19" x2="22" y2="19" stroke="' + accent + '" stroke-width="2"/>';
  } else if (c.includes('watch') || c.includes('horology')) {
    label = 'FINE HOROLOGY';
    bg = '#FAF5FF';
    accent = '#6B21A8';
    iconSvg = '<circle cx="12" cy="12" r="7" stroke="' + accent + '" stroke-width="2" fill="none"/><polyline points="12 9 12 12 14 14" stroke="' + accent + '" stroke-width="2"/>';
  } else if (c.includes('light')) {
    label = 'ARCHITECTURAL LIGHTING';
    bg = '#FEFCE8';
    accent = '#A16207';
    iconSvg = '<path d="M9 18h6m-5 3h4M12 2a7 7 0 0 0-4 12.7v1.3h8v-1.3A7 7 0 0 0 12 2z" stroke="' + accent + '" stroke-width="2" fill="none"/>';
  } else if (c.includes('ceramic') || c.includes('tableware')) {
    label = 'CERAMICS & TABLEWARE';
    bg = '#FDF4FF';
    accent = '#86198F';
    iconSvg = '<path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" stroke="' + accent + '" stroke-width="2" fill="none"/>';
  } else if (c.includes('coffee')) {
    label = 'COFFEE CRAFT & BREWING';
    bg = '#FFFBEB';
    accent = '#92400E';
    iconSvg = '<path d="M6 3h12l-2 8H8L6 3zM6 15h12v4a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-4z" stroke="' + accent + '" stroke-width="2" fill="none"/>';
  } else if (c.includes('bag') || c.includes('carry')) {
    label = 'BAGS & TECHNICAL CARRY';
    bg = '#FDF6B2';
    accent = '#723B13';
    iconSvg = '<path d="M6 20h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2zM9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" stroke="' + accent + '" stroke-width="2" fill="none"/>';
  } else if (c.includes('camera') || c.includes('optic')) {
    label = 'CAMERAS & OPTICS';
    bg = '#F4F4F5';
    accent = '#18181B';
    iconSvg = '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="' + accent + '" stroke-width="2" fill="none"/><circle cx="12" cy="13" r="4" stroke="' + accent + '" stroke-width="2" fill="none"/>';
  } else if (c.includes('furniture')) {
    label = 'MINIMALIST FURNITURE';
    bg = '#FEF3C7';
    accent = '#78350F';
    iconSvg = '<path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3M5 19v2M19 19v2M5 14h14a2 2 0 0 0 2-2v-3H3v3a2 2 0 0 0 2 2z" stroke="' + accent + '" stroke-width="2" fill="none"/>';
  } else if (c.includes('footwear') || c.includes('shoe') || c.includes('apparel')) {
    label = 'ARTISAN FOOTWEAR';
    bg = '#F5F5F4';
    accent = '#292524';
    iconSvg = '<path d="M4 16v-3a4 4 0 0 1 4-4h2l4 4h6a2 2 0 0 1 2 2v1H4zM4 16v3h18v-3" stroke="' + accent + '" stroke-width="2" fill="none"/>';
  } else if (c.includes('mobile') || c.includes('phone')) {
    label = 'MOBILE & PERSONAL TECH';
    bg = '#F0FDF4';
    accent = '#166534';
    iconSvg = '<rect x="6" y="2" width="12" height="20" rx="3" stroke="' + accent + '" stroke-width="2" fill="none"/><line x1="11" y1="18" x2="13" y2="18" stroke="' + accent + '" stroke-width="2"/>';
  }

  const rawSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
    <rect width="400" height="300" fill="${bg}"/>
    <g transform="translate(180, 110) scale(1.6)">
      ${iconSvg}
    </g>
    <text x="200" y="210" font-family="-apple-system, sans-serif" font-size="11" font-weight="700" fill="${accent}" text-anchor="middle" letter-spacing="1.5">
      ${label}
    </text>
    <text x="200" y="230" font-family="-apple-system, sans-serif" font-size="9" font-weight="500" fill="#9CA3AF" text-anchor="middle" letter-spacing="0.5">
      STUDIO ARCHIVE RESERVED EDITION
    </text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(rawSvg)}`;
}
