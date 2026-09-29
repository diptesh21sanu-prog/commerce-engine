import { query } from './db.js';

export interface CategoryIntent {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  responseLabel: string;
  subKeywords?: string[];
  excludeKeywords?: string[];
}

/**
 * Detect user shopping category intent from natural language query.
 * Evaluates compound phrases first, then domain-specific category terms.
 */
export function detectCategoryIntent(message: string): CategoryIntent | null {
  const q = message.toLowerCase().trim();

  // 1. Compound phrase overrides (e.g. "laptop bag" belongs to bags, not computing)
  if (/\b(laptop bag|camera bag|messenger bag|tool bag|duffel bag|weekender bag|travel bag|crossbody bag|sling bag)\b/.test(q)) {
    return {
      categoryId: 'cat-bags-carry',
      categoryName: 'Bags & Technical Carry',
      categorySlug: 'bags-carry',
      responseLabel: 'weatherproof bags and technical carry essentials',
      subKeywords: ['bag', 'backpack', 'briefcase', 'messenger', 'duffel'],
    };
  }

  if (/\b(coffee mug|ceramic mug|coffee cup|tea cup|espresso cup|tasting cup|stoneware cup)\b/.test(q)) {
    return {
      categoryId: 'cat-ceramics-tableware',
      categoryName: 'Ceramics & Tableware',
      categorySlug: 'ceramics-tableware',
      responseLabel: 'handcrafted ceramic cups and artisanal mugs',
      subKeywords: ['mug', 'cup', 'stoneware', 'ceramic'],
    };
  }

  if (/\b(coffee grinder|coffee dripper|pour over|espresso maker|coffee kettle|coffee drippers)\b/.test(q)) {
    return {
      categoryId: 'cat-coffee-craft',
      categoryName: 'Coffee Craft & Brewing',
      categorySlug: 'coffee-craft',
      responseLabel: 'precision coffee brewing and espresso equipment',
      subKeywords: ['coffee', 'dripper', 'grinder', 'kettle', 'carafe'],
    };
  }

  if (/\b(desk lamp|floor lamp|table lamp|wall lamp|reading lamp|task lamp|wall sconce)\b/.test(q)) {
    return {
      categoryId: 'cat-architectural-lighting',
      categoryName: 'Architectural Lighting',
      categorySlug: 'architectural-lighting',
      responseLabel: 'architectural lighting and solid brass lamps',
      subKeywords: ['lamp', 'luminaire', 'sconce', 'light'],
    };
  }

  // 2. Watches & Horology (Fine Horology)
  // Queries: "best watches", "show me watches", "tell me best watches", "I want a good watch", "chronograph", "timepiece"
  if (/\b(watch|watches|timepiece|timepieces|chronograph|chronographs|horology|dive watch|diver watch|mechanical watch|automatic watch|wrist watch|wristwatch|wristwatches|tourbillon)\b/.test(q)) {
    return {
      categoryId: 'cat-fine-horology',
      categoryName: 'Horology & Timepieces',
      categorySlug: 'fine-horology',
      responseLabel: 'handcrafted mechanical timepieces and watches',
      subKeywords: ['watch', 'chronograph', 'timepiece', 'tourbillon', 'diver', 'gmt'],
      excludeKeywords: ['strap', 'band', 'bracelet'],
    };
  }

  // 3. Audio & Headphones
  // Queries: "best headphones", "show me headphones", "audio gear", "studio monitors"
  if (/\b(headphone|headphones|headset|headsets|earphone|earphones|earbuds|iem|iems|audiophile|acoustic|acoustics|audio|speaker|speakers|desktop monitor|studio monitor|amplifier|dac)\b/.test(q)) {
    const isHeadphoneSpecific = /\b(headphone|headphones|headset|earphone|earphones|earbuds|iem|iems)\b/.test(q);
    return {
      categoryId: 'cat-audio-acoustics',
      categoryName: 'Audio & Acoustics',
      categorySlug: 'audio-acoustics',
      responseLabel: isHeadphoneSpecific ? 'audiophile headphones and acoustic monitors' : 'precision audio and acoustic systems',
      subKeywords: isHeadphoneSpecific ? ['headphone', 'earphone', 'in-ear', 'iem'] : undefined,
      excludeKeywords: isHeadphoneSpecific ? ['amplifier', 'dac', 'cable', 'interconnect'] : undefined,
    };
  }

  // 4. Laptops & Computing
  // Queries: "show me laptops", "best laptops", "ultrabook", "keyboards", "computing"
  if (/\b(laptop|laptops|ultrabook|ultrabooks|notebook|notebooks|macbook|computer|computers|pc|workstation|computing|mechanical keyboard|keyboards|keyboard|trackball|ergonomic mouse|mice)\b/.test(q)) {
    const isLaptopSpecific = /\b(laptop|laptops|ultrabook|ultrabooks|notebook|notebooks|workstation)\b/.test(q);
    return {
      categoryId: 'cat-computing-workspace',
      categoryName: 'Computing & Workspace',
      categorySlug: 'computing-workspace',
      responseLabel: isLaptopSpecific ? 'high-performance laptops and workstations' : 'computing and ergonomic workspace tools',
      subKeywords: isLaptopSpecific ? ['laptop', 'ultrabook', 'workstation'] : undefined,
      excludeKeywords: isLaptopSpecific ? ['keyboard', 'mouse', 'trackball', 'mat', 'stand'] : undefined,
    };
  }

  // 5. Shoes & Footwear
  // Queries: "show me shoes", "find me shoes", "best shoes", "footwear", "boots", "sneakers", "loafers"
  if (/\b(shoe|shoes|footwear|boot|boots|sneaker|sneakers|loafer|loafers|brogue|brogues|chelsea|derby|oxford|chukka|dress shoe|service boot)\b/.test(q)) {
    return {
      categoryId: 'cat-artisan-footwear',
      categoryName: 'Artisan Footwear & Apparel',
      categorySlug: 'artisan-footwear',
      responseLabel: 'handcrafted artisan footwear and shoes',
      subKeywords: ['shoe', 'boot', 'sneaker', 'loafer', 'brogue', 'chelsea', 'chukka'],
      excludeKeywords: ['coat', 'jacket', 'overshirt', 'cardigan'],
    };
  }

  // General Apparel query (within same category)
  if (/\b(apparel|clothing|coat|jacket|overshirt|cardigan|field jacket)\b/.test(q)) {
    return {
      categoryId: 'cat-artisan-footwear',
      categoryName: 'Artisan Footwear & Apparel',
      categorySlug: 'artisan-footwear',
      responseLabel: 'tailored commuter apparel and outerwear',
      subKeywords: ['coat', 'jacket', 'overshirt', 'cardigan'],
    };
  }

  // 6. Bags & Technical Carry
  // Queries: "best bags", "show me bags", "backpack", "briefcase", "messenger"
  if (/\b(bag|bags|backpack|backpacks|briefcase|briefcases|messenger|duffel|duffle|carry|luggage|travel pack|tool roll|tote|totes|crossbody)\b/.test(q)) {
    return {
      categoryId: 'cat-bags-carry',
      categoryName: 'Bags & Technical Carry',
      categorySlug: 'bags-carry',
      responseLabel: 'weatherproof bags and technical carry essentials',
      subKeywords: ['bag', 'backpack', 'briefcase', 'messenger', 'duffel'],
    };
  }

  // 7. Smartphones & Mobile Tech
  // Queries: "show me smartphones", "best smartphones", "phones", "smartphones", "mobile gear"
  if (/\b(smartphone|smartphones|phone|phones|mobile gear|mobile tech|charging pad|wireless charger|magsafe|power bank)\b/.test(q)) {
    const isPhoneSpecific = /\b(smartphone|smartphones|phone|phones)\b/.test(q);
    return {
      categoryId: 'cat-mobile-gear',
      categoryName: 'Mobile & Personal Tech',
      categorySlug: 'mobile-gear',
      responseLabel: isPhoneSpecific ? 'premium titanium and ceramic smartphones' : 'mobile tech and personal charging gear',
      subKeywords: isPhoneSpecific ? ['smartphone', 'phone'] : undefined,
      excludeKeywords: isPhoneSpecific ? ['dock', 'stand', 'charger', 'charging', 'pad', 'case', 'cable', 'battery'] : undefined,
    };
  }

  // 8. Cameras & Optics
  // Queries: "cameras", "best camera", "prime lens", "optics", "photography"
  if (/\b(camera|cameras|lens|lenses|optics|rangefinder|photography|photo|mirrorless|shutter)\b/.test(q)) {
    return {
      categoryId: 'cat-cameras-optics',
      categoryName: 'Cameras & Optics',
      categorySlug: 'cameras-optics',
      responseLabel: 'mechanical cameras and precision optical lenses',
      subKeywords: ['camera', 'lens', 'rangefinder', 'optic'],
    };
  }

  // 9. Coffee Craft & Brewing
  // Queries: "coffee", "espresso", "grinder", "pour over", "brewing"
  if (/\b(coffee|espresso|grinder|grinders|pour over|dripper|brewing|kettle|carafe|portafilter)\b/.test(q)) {
    return {
      categoryId: 'cat-coffee-craft',
      categoryName: 'Coffee Craft & Brewing',
      categorySlug: 'coffee-craft',
      responseLabel: 'precision coffee brewing tools and grinders',
      subKeywords: ['coffee', 'grinder', 'dripper', 'kettle', 'carafe'],
    };
  }

  // 10. Ceramics & Tableware
  // Queries: "ceramics", "tableware", "mug", "bowl", "plate", "teapot", "dinnerware"
  if (/\b(ceramic|ceramics|tableware|mug|mugs|bowl|bowls|plate|plates|dinnerware|stoneware|teapot|platter)\b/.test(q)) {
    return {
      categoryId: 'cat-ceramics-tableware',
      categoryName: 'Ceramics & Tableware',
      categorySlug: 'ceramics-tableware',
      responseLabel: 'hand-thrown ceramics and stoneware tableware',
      subKeywords: ['ceramic', 'mug', 'bowl', 'plate', 'teapot', 'stoneware'],
    };
  }

  // 11. Minimalist Furniture & Living
  // Queries: "furniture", "chair", "table", "stool", "desk", "shelf", "bench"
  if (/\b(furniture|chair|chairs|lounge chair|armchair|table|tables|coffee table|stool|stools|bench|benches|desk|shelf|shelving)\b/.test(q)) {
    return {
      categoryId: 'cat-minimalist-furniture',
      categoryName: 'Minimalist Furniture & Living',
      categorySlug: 'minimalist-furniture',
      responseLabel: 'minimalist hardwood furniture and living designs',
      subKeywords: ['chair', 'table', 'stool', 'bench', 'desk', 'shelf'],
    };
  }

  // 12. Architectural Lighting
  // Queries: "lighting", "light", "lights", "lamp", "lamps", "pendant", "sconce"
  if (/\b(lighting|light|lights|lamp|lamps|task lamp|pendant|luminaire|sconce|sconces|lantern)\b/.test(q)) {
    return {
      categoryId: 'cat-architectural-lighting',
      categoryName: 'Architectural Lighting',
      categorySlug: 'architectural-lighting',
      responseLabel: 'architectural lighting and brass luminaire designs',
      subKeywords: ['lamp', 'luminaire', 'pendant', 'sconce', 'light'],
    };
  }

  return null;
}

/**
 * Executes Intent-Aware Product Search.
 * STRICT ENFORCEMENT:
 * 1. If intent matches a category, filter by that category ID BEFORE ranking.
 * 2. Enforce published status and positive stock availability rules.
 * 3. Rank products matching sub-intent keywords first.
 * 4. Return preserved real product attributes (id, name, title, category, price, image, seller).
 */
export function getRecommendedProducts(message: string): {
  reply: string;
  products: any[];
  categoryIntent: CategoryIntent | null;
} {
  const intent = detectCategoryIntent(message);

  if (intent) {
    // Pipeline:
    // User query -> Detect intent/category -> Filter products by valid category -> Apply availability/stock rules -> Rank relevant products
    let rows: any[] = [];

    if (intent.subKeywords && intent.subKeywords.length > 0) {
      // First attempt: filter strictly within category AND matching sub-keywords (e.g. "laptop" within Computing, "shoes" within Footwear)
      const subLikeClauses = intent.subKeywords
        .map(() => '(LOWER(p.title) LIKE ? OR LOWER(p.description) LIKE ?)')
        .join(' OR ');
      const subParams: any[] = [intent.categoryId];
      intent.subKeywords.forEach((kw) => {
        const pattern = `%${kw.toLowerCase()}%`;
        subParams.push(pattern, pattern);
      });

      let excludeClauses = '';
      if (intent.excludeKeywords && intent.excludeKeywords.length > 0) {
        excludeClauses = ' AND ' + intent.excludeKeywords.map(() => '(LOWER(p.title) NOT LIKE ?)').join(' AND ');
        intent.excludeKeywords.forEach((kw) => {
          subParams.push(`%${kw.toLowerCase()}%`);
        });
      }

      rows = query(`
        SELECT 
          p.id,
          p.title,
          p.brand,
          p.description,
          c.name as category_name,
          c.slug as category_slug,
          sp.store_name as seller_name,
          MIN(v.price_cents) as min_price_cents,
          SUM(i.stock_on_hand - i.reserved_qty) as total_stock,
          (SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort_order ASC LIMIT 1) as primary_image,
          v.id as default_variant_id,
          v.sku as default_sku
        FROM products p
        JOIN categories c ON c.id = p.category_id
        JOIN seller_profiles sp ON sp.id = p.seller_id
        JOIN product_variants v ON v.product_id = p.id
        JOIN inventory i ON i.variant_id = v.id
        WHERE p.status = 'published' 
          AND p.is_deleted = 0 
          AND p.category_id = ?
          AND (${subLikeClauses})
          ${excludeClauses}
        GROUP BY p.id
        HAVING total_stock > 0
        ORDER BY p.created_at DESC
        LIMIT 4
      `, subParams);
    }

    // If subKeywords did not match or weren't specified, fetch all in-stock products strictly from this category
    if (rows.length === 0) {
      rows = query(`
        SELECT 
          p.id,
          p.title,
          p.brand,
          p.description,
          c.name as category_name,
          c.slug as category_slug,
          sp.store_name as seller_name,
          MIN(v.price_cents) as min_price_cents,
          SUM(i.stock_on_hand - i.reserved_qty) as total_stock,
          (SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort_order ASC LIMIT 1) as primary_image,
          v.id as default_variant_id,
          v.sku as default_sku
        FROM products p
        JOIN categories c ON c.id = p.category_id
        JOIN seller_profiles sp ON sp.id = p.seller_id
        JOIN product_variants v ON v.product_id = p.id
        JOIN inventory i ON i.variant_id = v.id
        WHERE p.status = 'published' 
          AND p.is_deleted = 0 
          AND p.category_id = ?
        GROUP BY p.id
        HAVING total_stock > 0
        ORDER BY p.created_at DESC
        LIMIT 4
      `, [intent.categoryId]);
    }

    // Format products, preserving all required properties with both aliases
    const formattedProducts = rows.map((p) => ({
      id: p.id,
      name: p.title,
      title: p.title,
      category: p.category_name,
      category_name: p.category_name,
      category_slug: p.category_slug,
      seller: p.seller_name,
      seller_name: p.seller_name,
      brand: p.brand,
      description: p.description,
      price: p.min_price_cents,
      min_price_cents: p.min_price_cents,
      image: p.primary_image || `/api/v1/images/products/${p.id}`,
      primary_image: p.primary_image || `/api/v1/images/products/${p.id}`,
      total_stock: p.total_stock,
      default_variant_id: p.default_variant_id,
      default_sku: p.default_sku,
    }));

    return {
      reply: `Here are our top handcrafted picks for **${intent.responseLabel}**:`,
      products: formattedProducts,
      categoryIntent: intent,
    };
  }

  // 3. Fallback when no specific category is requested
  // Filter out stop words and search generally across published in-stock items
  const stopWords = new Set([
    'a', 'an', 'the', 'in', 'on', 'of', 'for', 'to', 'at', 'by', 'from',
    'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did',
    'and', 'or', 'but', 'if', 'so', 'me', 'my', 'i', 'you', 'we', 'they',
    'show', 'tell', 'find', 'give', 'get', 'want', 'need', 'look', 'looking',
    'best', 'good', 'top', 'great', 'some', 'any', 'item', 'items', 'product', 'products',
    'please', 'can', 'could', 'would', 'what', 'which', 'recommend', 'suggestion', 'curated'
  ]);

  const rawTerms = message.toLowerCase().split(/\s+/).filter((t) => t.length > 2 && !stopWords.has(t));

  let generalRows: any[] = [];

  if (rawTerms.length > 0) {
    const likeClauses = rawTerms
      .map(() => '(LOWER(p.title) LIKE ? OR LOWER(p.description) LIKE ? OR LOWER(c.name) LIKE ?)')
      .join(' OR ');
    const params: any[] = [];
    rawTerms.forEach((t) => {
      const wildcard = `%${t}%`;
      params.push(wildcard, wildcard, wildcard);
    });

    generalRows = query(`
      SELECT 
        p.id,
        p.title,
        p.brand,
        p.description,
        c.name as category_name,
        c.slug as category_slug,
        sp.store_name as seller_name,
        MIN(v.price_cents) as min_price_cents,
        SUM(i.stock_on_hand - i.reserved_qty) as total_stock,
        (SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort_order ASC LIMIT 1) as primary_image,
        v.id as default_variant_id,
        v.sku as default_sku
      FROM products p
      JOIN categories c ON c.id = p.category_id
      JOIN seller_profiles sp ON sp.id = p.seller_id
      JOIN product_variants v ON v.product_id = p.id
      JOIN inventory i ON i.variant_id = v.id
      WHERE p.status = 'published' 
        AND p.is_deleted = 0 
        AND (${likeClauses})
      GROUP BY p.id
      HAVING total_stock > 0
      ORDER BY p.created_at DESC
      LIMIT 4
    `, params);
  }

  // If still empty, return top featured in-stock products
  if (generalRows.length === 0) {
    generalRows = query(`
      SELECT 
        p.id,
        p.title,
        p.brand,
        p.description,
        c.name as category_name,
        c.slug as category_slug,
        sp.store_name as seller_name,
        MIN(v.price_cents) as min_price_cents,
        SUM(i.stock_on_hand - i.reserved_qty) as total_stock,
        (SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort_order ASC LIMIT 1) as primary_image,
        v.id as default_variant_id,
        v.sku as default_sku
      FROM products p
      JOIN categories c ON c.id = p.category_id
      JOIN seller_profiles sp ON sp.id = p.seller_id
      JOIN product_variants v ON v.product_id = p.id
      JOIN inventory i ON i.variant_id = v.id
      WHERE p.status = 'published' 
        AND p.is_deleted = 0
      GROUP BY p.id
      HAVING total_stock > 0
      ORDER BY p.created_at DESC
      LIMIT 4
    `);
  }

  const formattedGeneral = generalRows.map((p) => ({
    id: p.id,
    name: p.title,
    title: p.title,
    category: p.category_name,
    category_name: p.category_name,
    category_slug: p.category_slug,
    seller: p.seller_name,
    seller_name: p.seller_name,
    brand: p.brand,
    description: p.description,
    price: p.min_price_cents,
    min_price_cents: p.min_price_cents,
    image: p.primary_image || `/api/v1/images/products/${p.id}`,
    primary_image: p.primary_image || `/api/v1/images/products/${p.id}`,
    total_stock: p.total_stock,
    default_variant_id: p.default_variant_id,
    default_sku: p.default_sku,
  }));

  return {
    reply: `Here are our top handcrafted picks matching "${message}":`,
    products: formattedGeneral,
    categoryIntent: null,
  };
}
