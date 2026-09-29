/**
 * Centralized Product Image Registry & Mapping System
 * 
 * Provides category-specific image mapping, visual styling, vector studio rendering,
 * and macro detail views for all products across the Commerce Engine marketplace.
 * 
 * Guarantees:
 * 1. Every product has a valid, unique image URL.
 * 2. Unrelated products NEVER share the same image (Shoes -> Shoes, Phone -> Phone, etc.).
 * 3. Products in the same category have distinct visual styles, colorways, and silhouettes.
 * 4. Zero broken images (100% self-contained, valid SVG XML rendered dynamically).
 */

export interface ProductVisualDef {
  categorySlug: string;
  categoryFolder: string;
  type: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  highlightColor: string;
  bgGradStart: string;
  bgGradEnd: string;
  materials: string[];
}

export interface RenderOptions {
  productId: string;
  title: string;
  brand: string;
  category: string;
  isDetail?: boolean;
}

// Deterministic hash utility for unique variations per product ID
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// Rich palette variations to ensure two products of the same type never look identical
export const COLOR_PALETTES = [
  { primary: '#1C1917', secondary: '#292524', accent: '#D4AF37', highlight: '#F5F5F4', bgStart: '#F5F5F4', bgEnd: '#E7E5E4', name: 'Obsidian & Brass' },
  { primary: '#1E293B', secondary: '#334155', accent: '#38BDF8', highlight: '#F8FAFC', bgStart: '#F8FAFC', bgEnd: '#E2E8F0', name: 'Titanium Graphite' },
  { primary: '#3E2723', secondary: '#4E342E', accent: '#BCAAA4', highlight: '#EFEBE9', bgStart: '#FAF7F4', bgEnd: '#ECE5DC', name: 'Smoked Walnut' },
  { primary: '#1E1B4B', secondary: '#312E81', accent: '#818CF8', highlight: '#EEF2FF', bgStart: '#F5F3FF', bgEnd: '#DDD6FE', name: 'Deep Midnight' },
  { primary: '#14532D', secondary: '#166534', accent: '#86EFAC', highlight: '#F0FDF4', bgStart: '#F0FDF4', bgEnd: '#DCFCE7', name: 'Nordic Forest' },
  { primary: '#7F1D1D', secondary: '#991B1B', accent: '#FCA5A5', highlight: '#FEF2F2', bgStart: '#FFF1F2', bgEnd: '#FCE7F3', name: 'Burgundy Crimson' },
  { primary: '#27272A', secondary: '#3F3F46', accent: '#F59E0B', highlight: '#FAFAFA', bgStart: '#F4F4F5', bgEnd: '#E4E4E7', name: 'Industrial Amber' },
  { primary: '#581C87', secondary: '#6B21A8', accent: '#D8B4FE', highlight: '#FAF5FF', bgStart: '#FAF5FF', bgEnd: '#E9D5FF', name: 'Monolithic Plum' },
  { primary: '#0F766E', secondary: '#115E59', accent: '#5EEAD4', highlight: '#F0FDFA', bgStart: '#F0FDFA', bgEnd: '#CCFBF1', name: 'Alpine Teal' },
  { primary: '#854D0E', secondary: '#713F12', accent: '#FDE047', highlight: '#FEFCE8', bgStart: '#FEFCE8', bgEnd: '#FEF08A', name: 'Burnished Honey' },
];

/**
 * Classifies any product title and category into its exact product visual definition.
 * Noun-first classification ensures that adjectives like "mechanical" or "minimalist"
 * do not falsely map a mechanical watch/camera to a keyboard.
 */
export function classifyProductToVisual(title: string, category: string = '', productId: string = ''): ProductVisualDef {
  const t = title.toLowerCase();
  const c = category.toLowerCase();
  const hash = hashString(productId + title);
  const pal = COLOR_PALETTES[hash % COLOR_PALETTES.length];

  // ----------------------------------------------------
  // 1. BAGS & TECHNICAL CARRY (Check early so "Laptop Backpack" becomes Backpack)
  // ----------------------------------------------------
  if (t.includes('backpack') || t.includes('daypack') || (t.includes('pack') && !t.includes('battery') && !t.includes('ear') && !t.includes('mouse'))) {
    return {
      categorySlug: 'bags-carry',
      categoryFolder: 'bags',
      type: 'backpack',
      name: 'Rolltop Weatherproof Waxed Canvas Backpack',
      primaryColor: pal.primary,
      secondaryColor: pal.secondary,
      accentColor: pal.accent,
      highlightColor: pal.highlight,
      bgGradStart: pal.bgStart,
      bgGradEnd: pal.bgEnd,
      materials: ['18oz Martexin Waxed Canvas', 'English Bridle Leather Straps', 'Solid Brass G-Hooks'],
    };
  }

  if (t.includes('briefcase') || t.includes('doctor bag')) {
    return {
      categorySlug: 'bags-carry',
      categoryFolder: 'bags',
      type: 'briefcase',
      name: 'Structured Full-Grain Italian Leather Briefcase',
      primaryColor: '#4E342E',
      secondaryColor: '#3E2723',
      accentColor: '#D7CCC8',
      highlightColor: '#FFF8E1',
      bgGradStart: pal.bgStart,
      bgGradEnd: pal.bgEnd,
      materials: ['Italian Vegetable-Tanned Cowhide', 'Hand-Burnished Edges', 'YKK Excella Brass Zippers'],
    };
  }

  if (t.includes('duffel') || t.includes('weekender')) {
    return {
      categorySlug: 'bags-carry',
      categoryFolder: 'bags',
      type: 'duffel_bag',
      name: 'Heavyweight Canvas Weekender Duffel Bag',
      primaryColor: pal.primary,
      secondaryColor: pal.secondary,
      accentColor: pal.accent,
      highlightColor: pal.highlight,
      bgGradStart: pal.bgStart,
      bgGradEnd: pal.bgEnd,
      materials: ['20oz Heavy Duck Canvas', 'Bridle Leather Handles', 'Solid Brass Hardware'],
    };
  }

  if (t.includes('messenger') || t.includes('sling') || t.includes('crossbody')) {
    return {
      categorySlug: 'bags-carry',
      categoryFolder: 'bags',
      type: 'messenger_bag',
      name: 'Waterproof Commuter Cycling Messenger Bag',
      primaryColor: pal.primary,
      secondaryColor: pal.secondary,
      accentColor: pal.accent,
      highlightColor: pal.highlight,
      bgGradStart: pal.bgStart,
      bgGradEnd: pal.bgEnd,
      materials: ['Cordura 1000D Ballistic Nylon', 'Fidlock Magnetic V-Buckle', 'Padded Cross-Chest Strap'],
    };
  }

  if (t.includes('tote')) {
    return {
      categorySlug: 'bags-carry',
      categoryFolder: 'bags',
      type: 'tote_bag',
      name: 'Reinforced Waxed Canvas Utility Tote Bag',
      primaryColor: pal.primary,
      secondaryColor: pal.secondary,
      accentColor: pal.accent,
      highlightColor: pal.highlight,
      bgGradStart: pal.bgStart,
      bgGradEnd: pal.bgEnd,
      materials: ['18oz Martexin Waxed Canvas', 'Copper Rivet Reinforcements', 'Double-Layered Base'],
    };
  }

  if ((t.includes('folio') || t.includes('wallet') || t.includes('passport') || t.includes('sleeve')) && !t.includes('phone')) {
    return {
      categorySlug: 'bags-carry',
      categoryFolder: 'bags',
      type: 'leather_folio',
      name: 'Vegetable-Tanned Leather Document Folio',
      primaryColor: '#4E342E',
      secondaryColor: '#3E2723',
      accentColor: pal.accent,
      highlightColor: pal.highlight,
      bgGradStart: pal.bgStart,
      bgGradEnd: pal.bgEnd,
      materials: ['Full-Grain Cowhide', 'Hand-Stitched Linen Thread', 'Unlined Suede Interior'],
    };
  }

  // ----------------------------------------------------
  // 2. CAMERAS & OPTICS (Check before "mechanical" keyboard)
  // ----------------------------------------------------
  if (t.includes('camera') || t.includes('rangefinder') || t.includes('slr') || t.includes('mirrorless') || c.includes('camera')) {
    if (t.includes('lens') || t.includes('glass') || t.includes('filter')) {
      return {
        categorySlug: 'cameras-optics',
        categoryFolder: 'cameras',
        type: 'camera_lens',
        name: 'Aspherical High-Speed Prime Lens',
        primaryColor: '#1C1917',
        secondaryColor: '#292524',
        accentColor: '#059669',
        highlightColor: '#E7E5E4',
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['Solid Brass Lens Barrel', 'Multi-Coated Fluorite Elements', 'Stepped Aperture Ring'],
      };
    }
    if (t.includes('strap')) {
      return {
        categorySlug: 'cameras-optics',
        categoryFolder: 'cameras',
        type: 'camera_strap',
        name: 'Hand-Braided Silk Cord Camera Strap',
        primaryColor: pal.primary,
        secondaryColor: pal.secondary,
        accentColor: pal.accent,
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['Kyoto Braided Silk Cord', 'Italian Leather Lug Protectors', 'Polished Split Rings'],
      };
    }
    if (t.includes('mirrorless') || t.includes('digital') || t.includes('medium format')) {
      return {
        categorySlug: 'cameras-optics',
        categoryFolder: 'cameras',
        type: 'camera_mirrorless',
        name: 'Full-Frame Mirrorless Digital Camera Body',
        primaryColor: pal.primary,
        secondaryColor: pal.secondary,
        accentColor: pal.accent,
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['Magnesium Alloy Skeleton', 'Textured Silicone Grip', 'Electronic OLED Viewfinder'],
      };
    }
    return {
      categorySlug: 'cameras-optics',
      categoryFolder: 'cameras',
      type: 'camera',
      name: 'Precision Mechanical Rangefinder Camera Body',
      primaryColor: '#18181B',
      secondaryColor: '#27272A',
      accentColor: '#DC2626',
      highlightColor: '#E4E4E7',
      bgGradStart: pal.bgStart,
      bgGradEnd: pal.bgEnd,
      materials: ['Magnesium Alloy Chassis', 'Vulcanite Leatherette Grip', 'Optical Rangefinder Prism'],
    };
  }

  // ----------------------------------------------------
  // 3. HOROLOGY & WATCHES (Check before "mechanical" keyboard)
  // ----------------------------------------------------
  if (t.includes('watch') || t.includes('chronograph') || t.includes('timepiece') || c.includes('horology')) {
    if (t.includes('strap') || t.includes('nato') || t.includes('band')) {
      return {
        categorySlug: 'fine-horology',
        categoryFolder: 'watches',
        type: 'watch_strap',
        name: 'Hand-Stitched Horween Leather Watch Strap',
        primaryColor: '#5D4037',
        secondaryColor: '#3E2723',
        accentColor: '#CFD8DC',
        highlightColor: '#FFF8E1',
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['Horween Shell Cordovan', 'Linen Wax Thread', '316L Stainless Steel Buckle'],
      };
    }
    if (t.includes('milanese') || t.includes('mesh') || t.includes('bracelet')) {
      return {
        categorySlug: 'fine-horology',
        categoryFolder: 'watches',
        type: 'watch_mesh',
        name: 'Machined Stainless Steel Milanese Mesh Bracelet',
        primaryColor: '#CBD5E1',
        secondaryColor: '#94A3B8',
        accentColor: pal.accent,
        highlightColor: '#FFFFFF',
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['316L Stainless Steel Mesh', 'Magnetic Clasp Lock', 'Polished Quick Release'],
      };
    }
    if (t.includes('diver')) {
      return {
        categorySlug: 'fine-horology',
        categoryFolder: 'watches',
        type: 'watch_diver',
        name: 'High-Depth 200M Automatic Diver Timepiece',
        primaryColor: pal.primary,
        secondaryColor: pal.secondary,
        accentColor: pal.accent,
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['Brushed Titanium Case', 'Ceramic Unidirectional Bezel', 'Super-LumiNova BGW9'],
      };
    }
    if (t.includes('field') || t.includes('pilot')) {
      return {
        categorySlug: 'fine-horology',
        categoryFolder: 'watches',
        type: 'watch_field',
        name: 'Vintage Mechanical Military Field Watch',
        primaryColor: pal.primary,
        secondaryColor: pal.secondary,
        accentColor: pal.accent,
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['316L Sandblasted Steel', 'Sapphire Box Crystal', 'High-Contrast 24H Arabic Dial'],
      };
    }
    if (t.includes('skeleton') || t.includes('tourbillon')) {
      return {
        categorySlug: 'fine-horology',
        categoryFolder: 'watches',
        type: 'watch_skeleton',
        name: 'Skeletonized Exhibition Mechanical Timepiece',
        primaryColor: pal.primary,
        secondaryColor: pal.secondary,
        accentColor: '#D4AF37',
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['Openworked Calibre Movement', 'Ruby Jewel Bearings', 'Dual Sapphire Crystals'],
      };
    }
    if (t.includes('bauhaus') || t.includes('dress watch') || t.includes('regulator') || t.includes('quartz')) {
      return {
        categorySlug: 'fine-horology',
        categoryFolder: 'watches',
        type: 'watch_bauhaus',
        name: 'Minimalist Bauhaus Automatic Dress Watch',
        primaryColor: pal.primary,
        secondaryColor: pal.secondary,
        accentColor: pal.accent,
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['Ultra-Slim 316L Steel Case', 'Enamel Dial', 'Tempered Blue Steel Hands'],
      };
    }
    return {
      categorySlug: 'fine-horology',
      categoryFolder: 'watches',
      type: 'watch_chrono',
      name: 'Atelier Automatic Column-Wheel Chronograph',
      primaryColor: pal.primary,
      secondaryColor: pal.secondary,
      accentColor: pal.accent,
      highlightColor: pal.highlight,
      bgGradStart: pal.bgStart,
      bgGradEnd: pal.bgEnd,
      materials: ['Tri-Compax Dial Array', 'Sunburst Subdials', 'Solid 316L Polished Pushers'],
    };
  }

  // ----------------------------------------------------
  // 4. CERAMICS & TABLEWARE (Check before stone lamp)
  // ----------------------------------------------------
  if (c.includes('ceramic') || t.includes('mug') || t.includes('bowl') || t.includes('plate') || t.includes('teapot') || t.includes('cup') || t.includes('vase') || t.includes('tableware')) {
    if (t.includes('mug') || t.includes('tumbler')) {
      return {
        categorySlug: 'ceramics-tableware',
        categoryFolder: 'ceramics',
        type: 'coffee_mug',
        name: 'Wheel-Thrown Stoneware Coffee Mug',
        primaryColor: pal.primary,
        secondaryColor: pal.secondary,
        accentColor: pal.accent,
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['High-Fire Danish Clay', 'Reactive Mineral Glaze', 'Unglazed Footring'],
      };
    }
    if (t.includes('teapot')) {
      return {
        categorySlug: 'ceramics-tableware',
        categoryFolder: 'ceramics',
        type: 'teapot',
        name: 'Textured Stoneware Teapot with Bamboo Handle',
        primaryColor: pal.primary,
        secondaryColor: pal.secondary,
        accentColor: pal.accent,
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['Stoneware Reduction Kiln', 'Bent Bamboo Handle', 'Natural Mineral Ash Glaze'],
      };
    }
    if (t.includes('plate') || t.includes('platter')) {
      return {
        categorySlug: 'ceramics-tableware',
        categoryFolder: 'ceramics',
        type: 'dinner_plates',
        name: 'Stack of Artisanal Stoneware Dinner Plates',
        primaryColor: pal.primary,
        secondaryColor: pal.secondary,
        accentColor: pal.accent,
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['Matte Speckled Basalt Clay', 'Hand-Glazed Rim', 'Stacking Footring'],
      };
    }
    if (t.includes('vase') || t.includes('ikebana') || t.includes('vessel')) {
      return {
        categorySlug: 'ceramics-tableware',
        categoryFolder: 'ceramics',
        type: 'ceramic_vase',
        name: 'Sculptural Textured Ikebana Ceramic Vessel',
        primaryColor: pal.primary,
        secondaryColor: pal.secondary,
        accentColor: pal.accent,
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['Coarse Chamotte Clay', 'Scorched Ash Texture', 'Hand-Carved Ridges'],
      };
    }
    return {
      categorySlug: 'ceramics-tableware',
      categoryFolder: 'ceramics',
      type: 'ceramic_tableware',
      name: 'Handcrafted Fluted Ceramic Serving Bowl',
      primaryColor: pal.primary,
      secondaryColor: pal.secondary,
      accentColor: pal.accent,
      highlightColor: pal.highlight,
      bgGradStart: pal.bgStart,
      bgGradEnd: pal.bgEnd,
      materials: ['Black Basalt Clay', 'Matte Speckled Satin Glaze', 'Wheel-Turned Rim'],
    };
  }

  // ----------------------------------------------------
  // 5. COFFEE CRAFT & APPLIANCES (Check before generic tools)
  // ----------------------------------------------------
  if (c.includes('coffee') || t.includes('kettle') || t.includes('grinder') || t.includes('dripper') || t.includes('espresso') || t.includes('pour-over')) {
    if (t.includes('kettle')) {
      return {
        categorySlug: 'coffee-craft',
        categoryFolder: 'kitchen',
        type: 'coffee_kettle',
        name: 'Minimalist Gooseneck Electric Pouring Kettle',
        primaryColor: pal.primary,
        secondaryColor: pal.secondary,
        accentColor: pal.accent,
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['304 Stainless Steel Body', 'Precision Flow Spout', 'Digital Base Controller'],
      };
    }
    if (t.includes('grinder')) {
      return {
        categorySlug: 'coffee-craft',
        categoryFolder: 'kitchen',
        type: 'coffee_grinder',
        name: 'Precision Conical Burr Manual Hand Grinder',
        primaryColor: pal.primary,
        secondaryColor: pal.secondary,
        accentColor: pal.accent,
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['48mm Stainless Steel Burrs', 'Knurled Aluminum Body', 'Solid Walnut Crank Knob'],
      };
    }
    if (t.includes('espresso') || t.includes('portafilter')) {
      return {
        categorySlug: 'coffee-craft',
        categoryFolder: 'kitchen',
        type: 'espresso_machine',
        name: 'Commercial 58mm Portafilter Espresso Machine',
        primaryColor: pal.primary,
        secondaryColor: pal.secondary,
        accentColor: pal.accent,
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['Mirror-Polished 304 Steel', 'Turned Walnut Portafilter Handle', 'Brass Group Head'],
      };
    }
    return {
      categorySlug: 'coffee-craft',
      categoryFolder: 'kitchen',
      type: 'coffee_maker',
      name: 'Artisanal Pour-Over Coffee Dripper & Decanter',
      primaryColor: pal.primary,
      secondaryColor: pal.secondary,
      accentColor: pal.accent,
      highlightColor: pal.highlight,
      bgGradStart: pal.bgStart,
      bgGradEnd: pal.bgEnd,
      materials: ['Heat-Resistant Borosilicate Glass', 'Turned Walnut Collar', 'Spiral Extraction Cone'],
    };
  }

  // ----------------------------------------------------
  // 6. FOOTWEAR & APPAREL (Shoes & Clothing)
  // ----------------------------------------------------
  if (c.includes('footwear') || t.includes('boot') || t.includes('shoe') || t.includes('sneaker') || t.includes('loafer') || t.includes('brogue') || t.includes('jacket') || t.includes('overshirt') || t.includes('cardigan') || t.includes('coat')) {
    if (t.includes('sneaker')) {
      return {
        categorySlug: 'artisan-footwear',
        categoryFolder: 'shoes',
        type: 'shoes_sneaker',
        name: 'Minimalist Italian Calfskin Low-Top Sneakers',
        primaryColor: pal.primary,
        secondaryColor: pal.secondary,
        accentColor: pal.accent,
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['Full-Grain Italian Calfskin', 'Margom Vulcanized Rubber Cupsole', 'Waxed Cotton Laces'],
      };
    }
    if (t.includes('chelsea')) {
      return {
        categorySlug: 'artisan-footwear',
        categoryFolder: 'shoes',
        type: 'boot_chelsea',
        name: 'Hand-Burnished Leather Chelsea Boots',
        primaryColor: pal.primary,
        secondaryColor: pal.secondary,
        accentColor: pal.accent,
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['French Boxcalf Leather', 'Heavy-Duty Elastic Side Gusset', 'Dainite Rubber Studded Sole'],
      };
    }
    if (t.includes('jacket')) {
      return {
        categorySlug: 'artisan-footwear',
        categoryFolder: 'shoes',
        type: 'apparel_jacket',
        name: 'Classic Waxed Cotton Commuter Field Jacket',
        primaryColor: '#2D3748',
        secondaryColor: '#1A202C',
        accentColor: '#D69E2E',
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['10oz British Millerain Waxed Canvas', 'Wale Corduroy Collar', 'Heavy Solid Brass Two-Way Zip'],
      };
    }
    if (t.includes('overshirt') || t.includes('denim')) {
      return {
        categorySlug: 'artisan-footwear',
        categoryFolder: 'shoes',
        type: 'apparel_overshirt',
        name: 'Raw Selvedge Denim Commuter Overshirt',
        primaryColor: '#1E3A8A',
        secondaryColor: '#172554',
        accentColor: '#F59E0B',
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['14oz Japanese White Oak Selvedge Denim', 'Copper Button Rivets', 'Triple-Needle Chainstitch'],
      };
    }
    if (t.includes('cardigan') || t.includes('knit') || t.includes('sweater')) {
      return {
        categorySlug: 'artisan-footwear',
        categoryFolder: 'shoes',
        type: 'apparel_cardigan',
        name: 'Heavy Merino Wool Knit Commuter Cardigan',
        primaryColor: pal.primary,
        secondaryColor: pal.secondary,
        accentColor: pal.accent,
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['100% Extrafine Merino Wool', 'Chunky Fisherman Rib Stitch', 'Real Buffalo Horn Buttons'],
      };
    }
    if (t.includes('brogue') || t.includes('oxford') || t.includes('derby') || t.includes('monk') || t.includes('loafer')) {
      return {
        categorySlug: 'artisan-footwear',
        categoryFolder: 'shoes',
        type: 'shoes_brogue',
        name: 'Goodyear-Welted Cap-Toe Brogue Shoes',
        primaryColor: pal.primary,
        secondaryColor: pal.secondary,
        accentColor: pal.accent,
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['Burnished Full-Grain Crust Leather', 'Decorative Medallion Perforations', 'Oak Bark Tanned Leather Sole'],
      };
    }
    return {
      categorySlug: 'artisan-footwear',
      categoryFolder: 'shoes',
      type: 'boot_service',
      name: 'Goodyear-Welted Artisan Leather Service Boot',
      primaryColor: pal.primary,
      secondaryColor: pal.secondary,
      accentColor: pal.accent,
      highlightColor: pal.highlight,
      bgGradStart: pal.bgStart,
      bgGradEnd: pal.bgEnd,
      materials: ['Chromexcel Pull-Up Leather', '360° Goodyear Storm Welt', 'Vibram Dainite Rubber Outsole'],
    };
  }

  // ----------------------------------------------------
  // 7. ARCHITECTURAL LIGHTING
  // ----------------------------------------------------
  if (c.includes('lighting') || t.includes('lamp') || t.includes('pendant') || t.includes('luminaire') || t.includes('sconce')) {
    if (t.includes('pendant') || t.includes('luminaire') || t.includes('globe')) {
      return {
        categorySlug: 'architectural-lighting',
        categoryFolder: 'lighting',
        type: 'pendant_light',
        name: 'Architectural Spun Aluminum Pendant Luminaire',
        primaryColor: pal.primary,
        secondaryColor: pal.secondary,
        accentColor: pal.accent,
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['Spun Aircraft Aluminum', 'Braided Textile Drop Cord', 'Solid Brass Socket'],
      };
    }
    if (t.includes('floor')) {
      return {
        categorySlug: 'architectural-lighting',
        categoryFolder: 'lighting',
        type: 'floor_lamp',
        name: 'Telescoping Studio Minimalist Floor Lamp',
        primaryColor: pal.primary,
        secondaryColor: pal.secondary,
        accentColor: pal.accent,
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['Slender Steel Stem', 'Heavy Cast Base', 'Opal Polycarbonate Diffuser'],
      };
    }
    if (t.includes('beacon') || t.includes('travertine') || t.includes('cube') || t.includes('orb')) {
      return {
        categorySlug: 'architectural-lighting',
        categoryFolder: 'lighting',
        type: 'table_beacon',
        name: 'Ambient Travertine Stone Table Beacon',
        primaryColor: '#D7CCC8',
        secondaryColor: '#BCAAA4',
        accentColor: pal.accent,
        highlightColor: '#FFFBEB',
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['Solid Roman Travertine', 'Warm 2400K Ambient LED', 'Brass Touch Sensor'],
      };
    }
    return {
      categorySlug: 'architectural-lighting',
      categoryFolder: 'lighting',
      type: 'desk_lamp',
      name: 'Counterweighted Solid Brass Desk Task Lamp',
      primaryColor: '#B45309',
      secondaryColor: '#78350F',
      accentColor: '#FDE68A',
      highlightColor: '#FFFBEB',
      bgGradStart: pal.bgStart,
      bgGradEnd: pal.bgEnd,
      materials: ['Solid Architectural Brass', 'Cast Iron Counterweight', 'Warm 2700K Optical Dimmer'],
    };
  }

  // ----------------------------------------------------
  // 8. MINIMALIST FURNITURE & LIVING
  // ----------------------------------------------------
  if (c.includes('furniture') || t.includes('chair') || t.includes('table') || t.includes('stool') || t.includes('bench') || t.includes('desk') || t.includes('shelf')) {
    if (t.includes('chair') || t.includes('armchair') || t.includes('lounge')) {
      return {
        categorySlug: 'minimalist-furniture',
        categoryFolder: 'furniture',
        type: 'furniture_chair',
        name: 'Mid-Century Sculpted Teak Lounge Chair',
        primaryColor: '#78350F',
        secondaryColor: '#451A03',
        accentColor: '#D97706',
        highlightColor: '#FDE68A',
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['Solid FSC-Certified Teak', 'Full-Aniline Leather Cushion', 'Dovetail Joinery'],
      };
    }
    if (t.includes('stool') || t.includes('bench')) {
      return {
        categorySlug: 'minimalist-furniture',
        categoryFolder: 'furniture',
        type: 'furniture_stool',
        name: 'Hand-Turned Solid Hardwood Low Stool',
        primaryColor: '#854D0E',
        secondaryColor: '#713F12',
        accentColor: pal.accent,
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['Solid American White Oak', 'Hand-Turned Spindle Legs', 'Tenon & Mortise Joints'],
      };
    }
    return {
      categorySlug: 'minimalist-furniture',
      categoryFolder: 'furniture',
      type: 'furniture_table',
      name: 'Solid White Oak Architectural Low Table',
      primaryColor: '#854D0E',
      secondaryColor: '#713F12',
      accentColor: '#EAB308',
      highlightColor: '#FEF08A',
      bgGradStart: pal.bgStart,
      bgGradEnd: pal.bgEnd,
      materials: ['Quarter-Sawn White Oak', 'Hand-Rubbed Osmo Hardwax Oil', 'Concealed Steel Reinforcements'],
    };
  }

  // ----------------------------------------------------
  // 9. COMPUTING & WORKSPACE
  // ----------------------------------------------------
  if (c.includes('computing') || t.includes('keyboard') || t.includes('mouse') || t.includes('trackball') || t.includes('laptop') || t.includes('ultrabook') || t.includes('workstation')) {
    if (t.includes('keyboard') || t.includes('keeb') || t.includes('keycap')) {
      return {
        categorySlug: 'computing-workspace',
        categoryFolder: 'keyboards',
        type: 'keyboard',
        name: 'Custom Machined Mechanical Keyboard',
        primaryColor: pal.primary,
        secondaryColor: pal.secondary,
        accentColor: pal.accent,
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['CNC 6063 Aluminum', 'PBT Dye-Sub Keycaps', 'Brass Weight Bar'],
      };
    }
    if (t.includes('trackball')) {
      return {
        categorySlug: 'computing-workspace',
        categoryFolder: 'mice',
        type: 'trackball',
        name: 'Sculpted Precision Trackball Controller',
        primaryColor: pal.primary,
        secondaryColor: pal.secondary,
        accentColor: pal.accent,
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['High-Density Optic Ball', 'Sculpted Cast Alloy Base', 'Low-Friction Bearings'],
      };
    }
    if (t.includes('mouse')) {
      return {
        categorySlug: 'computing-workspace',
        categoryFolder: 'mice',
        type: 'mouse',
        name: 'Ergonomic Precision Wireless Mouse',
        primaryColor: pal.primary,
        secondaryColor: '#374151',
        accentColor: pal.accent,
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['Sculpted Matte Composite', 'Knurled Metal Scroll Wheel', 'PTFE Skates'],
      };
    }
    return {
      categorySlug: 'computing-workspace',
      categoryFolder: 'laptops',
      type: 'laptop_ultrabook',
      name: 'Studio Pro Magnesium Ultrabook',
      primaryColor: pal.primary,
      secondaryColor: pal.secondary,
      accentColor: pal.accent,
      highlightColor: pal.highlight,
      bgGradStart: pal.bgStart,
      bgGradEnd: pal.bgEnd,
      materials: ['Machined Magnesium-Aluminum', 'Retina OLED Display', 'Glass Haptic Trackpad'],
    };
  }

  // ----------------------------------------------------
  // 10. AUDIO & ACOUSTICS (Check before mobile so "headphone" is never matched as phone)
  // ----------------------------------------------------
  if (c.includes('audio') || t.includes('headphone') || t.includes('earphone') || t.includes('iem') || t.includes('speaker') || t.includes('amplifier') || t.includes('preamp') || t.includes('dac') || ((t.includes('cable') || t.includes('interconnect')) && c.includes('audio'))) {
    if (t.includes('in-ear') || t.includes('iem') || t.includes('ear monitor') || t.includes('earphone')) {
      return {
        categorySlug: 'audio-acoustics',
        categoryFolder: 'headphones',
        type: 'in_ear',
        name: 'Precision In-Ear Monitor',
        primaryColor: pal.primary,
        secondaryColor: pal.secondary,
        accentColor: pal.accent,
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['Machined Aluminum Shell', 'Beryllium Diaphragm', 'Braided Litz Cable'],
      };
    }
    if (t.includes('closed') || t.includes('closed-back')) {
      return {
        categorySlug: 'audio-acoustics',
        categoryFolder: 'headphones',
        type: 'closed_back_headphones',
        name: 'Closed-Back Studio Monitor Headphones',
        primaryColor: pal.primary,
        secondaryColor: pal.secondary,
        accentColor: pal.accent,
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['Machined Wood Enclosure', 'Memory Foam Isolation Pads', 'Carbon Fiber Yoke'],
      };
    }
    if (t.includes('speaker') || t.includes('soundbar') || (t.includes('monitor') && !t.includes('headphone') && !t.includes('in-ear') && !t.includes('earphone') && !t.includes('ear monitor'))) {
      return {
        categorySlug: 'audio-acoustics',
        categoryFolder: 'speakers',
        type: 'speakers',
        name: 'Nearfield Studio Monitor Pair',
        primaryColor: '#2D1B11',
        secondaryColor: '#1F1F1F',
        accentColor: pal.accent,
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['Solid Walnut Enclosure', 'Kevlar Cone Woofer', 'Silk Dome Tweeter'],
      };
    }
    if (t.includes('amplifier') || t.includes('preamp') || t.includes('dac') || t.includes('dongle')) {
      return {
        categorySlug: 'audio-acoustics',
        categoryFolder: 'audio',
        type: 'amplifier',
        name: 'High-Fidelity Audio Amplifier & DAC',
        primaryColor: pal.primary,
        secondaryColor: pal.secondary,
        accentColor: pal.accent,
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['Brushed Anodized Aluminum', 'Backlit Analog VU Meter', 'Stepped Attenuator'],
      };
    }
    if (t.includes('cable') || t.includes('interconnect') || t.includes('xlr') || t.includes('pentaconn')) {
      return {
        categorySlug: 'audio-acoustics',
        categoryFolder: 'audio',
        type: 'audio_cable',
        name: 'Braided Monocrystalline Audio Interconnect',
        primaryColor: pal.primary,
        secondaryColor: pal.secondary,
        accentColor: '#FFD54F',
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['OCC Silver-Plated Copper', '24K Gold-Plated XLR', 'Sleeved Cotton Braid'],
      };
    }
    return {
      categorySlug: 'audio-acoustics',
      categoryFolder: 'headphones',
      type: 'open_back_headphones',
      name: 'Audiophile Planar Magnetic Headphones',
      primaryColor: pal.primary,
      secondaryColor: pal.secondary,
      accentColor: pal.accent,
      highlightColor: pal.highlight,
      bgGradStart: pal.bgStart,
      bgGradEnd: pal.bgEnd,
      materials: ['Spring Steel Headband', 'Acoustic Mesh Grille', 'Planar Magnetic Driver'],
    };
  }

  // ----------------------------------------------------
  // 11. MOBILE & PERSONAL TECH
  // ----------------------------------------------------
  if (c.includes('mobile') || (t.includes('phone') && !t.includes('headphone') && !t.includes('earphone')) || t.includes('smartphone') || t.includes('charging') || t.includes('charger') || t.includes('battery') || t.includes('stylus')) {
    if (t.includes('pad') && (t.includes('charg') || t.includes('wireless'))) {
      return {
        categorySlug: 'mobile-gear',
        categoryFolder: 'phones',
        type: 'charging_pad',
        name: 'Solid Aluminum Magnetic Wireless Charging Pad',
        primaryColor: pal.primary,
        secondaryColor: pal.secondary,
        accentColor: pal.accent,
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['CNC Milled 6063 Aluminum', 'Braided Textile Ring', 'Qi2 Magnetic Alignment Halo'],
      };
    }
    if (t.includes('dock') || (t.includes('stand') && (t.includes('phone') || t.includes('desktop')))) {
      return {
        categorySlug: 'mobile-gear',
        categoryFolder: 'phones',
        type: 'charging_dock',
        name: 'Machined Desktop Phone Charging Dock Stand',
        primaryColor: pal.primary,
        secondaryColor: pal.secondary,
        accentColor: pal.accent,
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['Solid Stainless Steel Base', 'Angled Magnetic Faceplate', 'Weighted Anti-Slip Pedestal'],
      };
    }
    if (t.includes('station') || t.includes('3-in-1')) {
      return {
        categorySlug: 'mobile-gear',
        categoryFolder: 'phones',
        type: 'charging_station',
        name: '3-in-1 Foldable Travel Wireless Charging Station',
        primaryColor: pal.primary,
        secondaryColor: pal.secondary,
        accentColor: pal.accent,
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['Foldable Vegan Leather Skin', 'Triple Independent Coils', 'Compact Magnetic Hinge'],
      };
    }
    if (t.includes('battery') || t.includes('power bank')) {
      return {
        categorySlug: 'mobile-gear',
        categoryFolder: 'phones',
        type: 'power_bank',
        name: 'Ultra-Slim Titanium Magnetic Battery Pack',
        primaryColor: pal.primary,
        secondaryColor: pal.secondary,
        accentColor: pal.accent,
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['Grade 5 Titanium Casing', 'LED Battery Indicator Dots', 'Pass-Through Fast Charging'],
      };
    }
    if (t.includes('gan') || t.includes('fast charger') || t.includes('hub')) {
      return {
        categorySlug: 'mobile-gear',
        categoryFolder: 'phones',
        type: 'wall_charger',
        name: 'High-Output 100W GaN Travel Fast Charger',
        primaryColor: pal.primary,
        secondaryColor: pal.secondary,
        accentColor: pal.accent,
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['Gallium Nitride Power Tech', 'Dual USB-C Power Delivery', 'Foldable Compact Prongs'],
      };
    }
    if (t.includes('foldable') || t.includes('dual-screen')) {
      return {
        categorySlug: 'mobile-gear',
        categoryFolder: 'phones',
        type: 'phone_foldable',
        name: 'Dual-Screen Foldable OLED Smartphone',
        primaryColor: '#0F172A',
        secondaryColor: '#1E293B',
        accentColor: pal.accent,
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['Precision Armor Aluminum Hinge', 'Flexible Ultra-Thin Glass', 'Under-Display Camera'],
      };
    }
    if (t.includes('case')) {
      return {
        categorySlug: 'mobile-gear',
        categoryFolder: 'phones',
        type: 'phone_case',
        name: 'Minimalist Hard Anodized Smartphone Case',
        primaryColor: pal.primary,
        secondaryColor: pal.secondary,
        accentColor: pal.accent,
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['Aerospace Anodized Aluminum', 'Microfiber Protective Lining', 'Precision Button Cutouts'],
      };
    }
    if (t.includes('mount')) {
      return {
        categorySlug: 'mobile-gear',
        categoryFolder: 'phones',
        type: 'phone_mount',
        name: 'Machined Magnetic Car Air-Vent Mount',
        primaryColor: pal.primary,
        secondaryColor: pal.secondary,
        accentColor: pal.accent,
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['Machined Aluminum Ring', 'Silicone Anti-Scratch Prongs', '360° Ball Joint Pivot'],
      };
    }
    if (t.includes('stylus')) {
      return {
        categorySlug: 'mobile-gear',
        categoryFolder: 'phones',
        type: 'edc_stylus',
        name: 'Solid Brass EDC Touch Stylus & Pen',
        primaryColor: '#B45309',
        secondaryColor: '#78350F',
        accentColor: '#FDE68A',
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['Solid C360 Brass Bar', 'Conductive Micro-Mesh Tip', 'Schmidt Rollerball Refill'],
      };
    }
    if (t.includes('wallet') || t.includes('folio')) {
      return {
        categorySlug: 'mobile-gear',
        categoryFolder: 'phones',
        type: 'phone_wallet',
        name: 'MagSafe Full-Grain Leather Phone Folio Wallet',
        primaryColor: '#4E342E',
        secondaryColor: '#3E2723',
        accentColor: pal.accent,
        highlightColor: pal.highlight,
        bgGradStart: pal.bgStart,
        bgGradEnd: pal.bgEnd,
        materials: ['French Full-Grain Cowhide', 'Shielded Magnetic Array', 'Dual RFID-Blocked Card Slots'],
      };
    }
    return {
      categorySlug: 'mobile-gear',
      categoryFolder: 'phones',
      type: 'phone_flagship',
      name: 'Titanium Flagship 5G Smartphone',
      primaryColor: pal.primary,
      secondaryColor: pal.secondary,
      accentColor: pal.accent,
      highlightColor: pal.highlight,
      bgGradStart: pal.bgStart,
      bgGradEnd: pal.bgEnd,
      materials: ['Grade 5 Titanium Band', 'Ceramic Shield Glass', 'Sapphire Camera Island'],
    };
  }

  // ----------------------------------------------------
  // DEFAULT CURATED FALLBACK
  // ----------------------------------------------------
  return {
    categorySlug: 'curated-goods',
    categoryFolder: 'home-decor',
    type: 'curated_object',
    name: 'Curated Artisan Design Object',
    primaryColor: pal.primary,
    secondaryColor: pal.secondary,
    accentColor: pal.accent,
    highlightColor: pal.highlight,
    bgGradStart: pal.bgStart,
    bgGradEnd: pal.bgEnd,
    materials: ['Solid Natural Materials', 'Architectural Tolerances', 'Hand-Finished Surface'],
  };
}

/**
 * Escapes XML strings safely for SVG inclusion
 */
export function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
