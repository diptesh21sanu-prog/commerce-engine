import crypto from 'crypto';
import { query, queryOne, run, transaction } from './db.js';
import { hashPassword } from './auth.js';

export async function seedDatabaseIfEmpty() {
  const existingProducts = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM products');
  const hasInterleavedSeed = queryOne<{ count: number }>(`
    SELECT COUNT(*) as count FROM audit_events WHERE action = 'CATALOG_INTERLEAVED_V5'
  `);

  if (existingProducts && existingProducts.count >= 200 && hasInterleavedSeed && hasInterleavedSeed.count > 0) {
    // Ensure all product image URLs use the dedicated endpoint
    run(`
      UPDATE product_images
      SET url = '/api/v1/images/products/' || product_id
      WHERE sort_order = 0 AND (url LIKE '/src/assets/images/%' OR url LIKE '/placeholder%');
    `);
    return;
  }

  console.log('Seeding diverse, interleaved marketplace catalog (220 unique products across 11 categories)...');

  const now = new Date().toISOString();

  // Clean existing tables for clean seed
  run('DELETE FROM reviews;');
  run('DELETE FROM audit_events;');
  run('DELETE FROM coupons;');
  run('DELETE FROM shipping_zones;');
  run('DELETE FROM product_images;');
  run('DELETE FROM inventory;');
  run('DELETE FROM product_variants;');
  run('DELETE FROM products;');
  run('DELETE FROM categories;');
  run('DELETE FROM seller_profiles;');
  run('DELETE FROM users;');

  // 1. Users
  const adminId = 'usr-admin-001';
  const customerId = 'usr-cust-001';
  const kronaUserId = 'usr-seller-krona';
  const aethelUserId = 'usr-seller-aethel';
  const chronosUserId = 'usr-seller-chronos';
  const veloxUserId = 'usr-seller-velox';

  const defaultAdminPass = hashPassword('AdminPass123!');
  const defaultCustomerPass = hashPassword('CustomerPass123!');
  const defaultSellerPass = hashPassword('SellerPass123!');

  run(`
    INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at, updated_at)
    VALUES 
      (?, 'admin@commerceengine.io', ?, 'Eleanor Vance (Platform Director)', 'admin', 1, ?, ?),
      (?, 'customer@example.com', ?, 'Liam Thorne (Verified Buyer)', 'customer', 1, ?, ?),
      (?, 'seller.krona@commerceengine.io', ?, 'Marcus Krona (Krona Studio)', 'seller', 1, ?, ?),
      (?, 'seller.aethel@commerceengine.io', ?, 'Astrid Lindqvist (Aethel Ceramics)', 'seller', 1, ?, ?),
      (?, 'seller.chronos@commerceengine.io', ?, 'Julian Mercer (Chronos Horology)', 'seller', 1, ?, ?),
      (?, 'seller.velox@commerceengine.io', ?, 'Gareth Walker (Velox Gear)', 'seller', 1, ?, ?);
  `, [
    adminId, defaultAdminPass, now, now,
    customerId, defaultCustomerPass, now, now,
    kronaUserId, defaultSellerPass, now, now,
    aethelUserId, defaultSellerPass, now, now,
    chronosUserId, defaultSellerPass, now, now,
    veloxUserId, defaultSellerPass, now, now,
  ]);

  // 2. Seller Profiles
  const kronaSellerId = 'sel-krona-audio';
  const aethelSellerId = 'sel-aethel-living';
  const chronosSellerId = 'sel-chronos-horology';
  const veloxSellerId = 'sel-velox-gear';

  run(`
    INSERT INTO seller_profiles (id, user_id, store_name, slug, status, commission_rate_basis_points, description, support_email, created_at, updated_at)
    VALUES
      (?, ?, 'Krona Studio & Audio', 'krona-studio', 'approved', 800, 'Precision acoustic instruments, open-back studio headphones, mechanical keyboards, laptops, and desktop illumination crafted in Stockholm.', 'concierge@kronaaudio.com', ?, ?),
      (?, ?, 'Aethel Ceramics & Living', 'aethel-ceramics', 'approved', 1000, 'Hand-thrown stoneware, textured tableware, pour-over drippers, and architectural wooden furniture made in Copenhagen.', 'studio@aethelceramics.com', ?, ?),
      (?, ?, 'Chronos Horology & Goods', 'chronos-horology', 'approved', 1200, 'Hand-assembled mechanical timepieces, horween leather straps, optical gear, technical backpacks, and artisan boots.', 'client@chronoshorology.ch', ?, ?),
      (?, ?, 'Velox Technical Gear', 'velox-gear', 'pending', 1000, 'High-durability cycling bags, weatherproof titanium bike frames, and technical commuter apparel.', 'info@veloxgear.cc', ?, ?);
  `, [
    kronaSellerId, kronaUserId, now, now,
    aethelSellerId, aethelUserId, now, now,
    chronosSellerId, chronosUserId, now, now,
    veloxSellerId, veloxUserId, now, now,
  ]);

  // 3. 11 Curated Categories
  const catAudioId = 'cat-audio-acoustics';
  const catComputingId = 'cat-computing-workspace';
  const catWatchesId = 'cat-fine-horology';
  const catLightingId = 'cat-architectural-lighting';
  const catCeramicsId = 'cat-ceramics-tableware';
  const catCoffeeId = 'cat-coffee-craft';
  const catCarryId = 'cat-bags-carry';
  const catCamerasId = 'cat-cameras-optics';
  const catFurnitureId = 'cat-minimalist-furniture';
  const catFootwearId = 'cat-artisan-footwear';
  const catMobileId = 'cat-mobile-gear';

  run(`
    INSERT INTO categories (id, parent_id, name, slug, description)
    VALUES
      (?, NULL, 'Audio & Acoustics', 'audio-acoustics', 'Planar headphones, desktop monitor speakers, analog amplifiers, and braided cables.'),
      (?, NULL, 'Computing & Workspace', 'computing-workspace', 'Custom mechanical keyboards, precision ergonomic mice, ultrabook laptops, and desk mats.'),
      (?, NULL, 'Horology & Timepieces', 'fine-horology', 'Automatic chronographs, field watches, dive timepieces, and hand-stitched leather straps.'),
      (?, NULL, 'Architectural Lighting', 'architectural-lighting', 'Counterweighted brass task lamps, linear pendants, cantilever floor lights, and table beacons.'),
      (?, NULL, 'Ceramics & Tableware', 'ceramics-tableware', 'Artisanal stoneware mugs, fluted serving bowls, dinner sets, and bamboo-handled teapots.'),
      (?, NULL, 'Coffee Craft & Brewing', 'coffee-craft', 'Hand-thrown pour-over drippers, conical burr grinders, and borosilicate glass carafes.'),
      (?, NULL, 'Bags & Technical Carry', 'bags-carry', 'Weatherproof waxed canvas backpacks, Italian leather briefcases, and commuter messenger bags.'),
      (?, NULL, 'Cameras & Optics', 'cameras-optics', 'Mechanical 35mm rangefinder cameras, mirrorless studio bodies, and aspherical prime lenses.'),
      (?, NULL, 'Minimalist Furniture & Living', 'minimalist-furniture', 'Sculpted teak lounge chairs, solid white oak coffee tables, and architectural stools.'),
      (?, NULL, 'Artisan Footwear & Apparel', 'artisan-footwear', 'Goodyear-welted full-grain leather boots, minimalist calfskin sneakers, and chelsea boots.'),
      (?, NULL, 'Mobile & Personal Tech', 'mobile-gear', 'Titanium flagship smartphones, magnetic wireless charging pads, and machined aluminum docks.');
  `, [
    catAudioId, catComputingId, catWatchesId, catLightingId,
    catCeramicsId, catCoffeeId, catCarryId, catCamerasId,
    catFurnitureId, catFootwearId, catMobileId
  ]);

  // 4. Shipping Zones
  run(`
    INSERT INTO shipping_zones (id, name, base_rate_cents, free_threshold_cents, estimated_days_min, estimated_days_max)
    VALUES
      ('zone-domestic', 'Domestic Standard (Continental US)', 1200, 15000, 3, 5),
      ('zone-express', 'Expedited Global Express', 3500, 35000, 1, 3);
  `);

  // 5. Coupons
  run(`
    INSERT INTO coupons (id, code, discount_type, discount_value, min_spend_cents, max_discount_cents, max_redemptions_global, max_redemptions_per_user, redemptions_count, is_active, expires_at)
    VALUES
      ('cpn-welcome20', 'WELCOME20', 'percentage', 20, 5000, 4000, 500, 1, 0, 1, '2030-01-01T00:00:00Z'),
      ('cpn-save10', 'SAVE10', 'flat', 1000, 6000, NULL, 1000, 2, 0, 1, '2030-01-01T00:00:00Z'),
      ('cpn-curator50', 'CURATOR50', 'flat', 5000, 25000, NULL, 50, 1, 0, 1, '2030-01-01T00:00:00Z');
  `);

  // 6. 11 Distinct Category Groups (20 Items each = 220 items total)
  const categoryGroups = [
    // 0. Audio & Acoustics (Krona Audio - Tag KRN)
    {
      catId: catAudioId,
      sellerId: kronaSellerId,
      brand: 'Krona Audio',
      tag: 'krn',
      description: 'Engineered with rigorous material tolerances and tested by acoustic masters. Designed to endure decades of daily studio use while maintaining flawless fidelity.',
      titles: [
        'Acoustic Planar Magnetic Headphone',
        'Nearfield Walnut Studio Monitor Pair',
        'Reference Closed-Back Studio Monitor Headphone',
        'Braided Monocrystalline Silver Audio Cable',
        'Solid-State Precision Headphone Amplifier',
        'Balanced Linear Desktop DAC',
        'Compact Active Bookshelf Desktop Speakers',
        'Pure Beryllium Diaphragm In-Ear Monitors',
        'Open-Back Audiophile Dynamic Driver Headphone',
        'High-Res USB-C Portable Audio Dongle DAC',
        'Shielded Balanced XLR Audio Interconnects (Pair)',
        'Cast Iron Desktop Speaker Isolation Stands',
        'Dual-Mono Differential Preamplifier',
        'Gold-Plated 4.4mm Pentaconn Headphone Adapter',
        'Machined Aluminum Desktop Headphone Stand',
        'Ultra-Low Jitter Master Clock Synthesizer',
        'Anodized Passive Attenuator Volume Dial',
        'Solid Brass Speaker Isolation Cone Feet (Set of 4)',
        'Wireless Lossless Studio ANC Headphones',
        'Acoustic Wood Horn Desktop Speakers'
      ]
    },
    // 1. Horology & Timepieces (Chronos Horology - Tag CHR)
    {
      catId: catWatchesId,
      sellerId: chronosSellerId,
      brand: 'Chronos Horology',
      tag: 'chr',
      description: 'Hand-assembled in Switzerland with anti-reflective sapphire crystals, exhibition casebacks, and vegetable-tanned leather straps.',
      titles: [
        'Atelier 38mm Automatic Chronograph',
        'Field Master Mechanical 36mm Watch',
        'Minimalist Sapphire Bauhaus Watch',
        'Brushed Titanium 200M Diver Watch',
        'Hand-Stitched Horween Shell Cordovan Watch Strap',
        'Skeletonized Tourbillon Tribute 41mm Watch',
        'Monochrome Regulator Dual Timepiece',
        'Italian Epsom Leather Quick-Release Watch Band',
        'Ceramic Bezel GMT World Traveler Watch',
        'Swiss Movement Manual-Wind Dress Watch',
        'Machined Stainless Steel Milanese Mesh Watch Bracelet',
        'Vintage Dial Matte Black Pilot Chrono Watch',
        'Luminescent Arabic Marker Field Watch',
        'Single-Pass Vegetable Tanned NATO Watch Strap',
        'Sapphire Exhibition Caseback Mechanical 40mm Watch',
        'Deep Forest Green Enamel Dial Chrono Watch',
        'Satin Finish Cushion Case Small Seconds Watch',
        'Bespoke Alligator Grain Leather Watch Strap',
        'Ultra-Slim 6.8mm Dress Quartz Timepiece',
        'Solid Walnut Display Watch Box (4 Slots)'
      ]
    },
    // 2. Ceramics & Tableware (Aethel Ceramics - Tag AET)
    {
      catId: catCeramicsId,
      sellerId: aethelSellerId,
      brand: 'Aethel Ceramics',
      tag: 'aet',
      description: 'Hand-thrown on the potter’s wheel in Copenhagen and fired at 1280°C with mineral-rich reactive glazes for tactile dining rituals.',
      titles: [
        'Raw Sandstone Ceramic Coffee Mug 350ml',
        'Minimalist Fluted Ceramic Serving Bowl',
        'Matte Charcoal Ceramic Dinner Plate Set',
        'Textured White Clay Teapot with Bamboo Handle',
        'Speckled Oatmeal Dessert Plate (Pair)',
        'Hand-Pinched Espresso Ceramic Tasting Cup',
        'Organic Wave Stoneware Pasta Bowl',
        'Matte Sage Ceramic Salad Serving Platter',
        'Double-Walled Ceramic Tumbler with Lid',
        'Glazed Porcelain Soy Sauce Cruet',
        'Mineral Washed Stoneware Milk Jug',
        'Basalt Clay Ceramic Mortar and Pestle',
        'Sculptural Textured Ikebana Ceramic Vase',
        'Unglazed Terracotta Ceramic Water Carafe',
        'Architectural Travertine Ceramic Incense Holder',
        'Wabi-Sabi Stoneware Centerpiece Vessel Bowl',
        'Raw Feldspar Glaze Ceramic Butter Keeper',
        'Monolithic Ceramic Bookend Pair',
        'Fluted Stoneware Ramen Bowl with Chopstick Rest',
        'Speckled Clay Cereal and Soup Bowl Set'
      ]
    },
    // 3. Computing & Workspace (Krona Studio - Tag KRN)
    {
      catId: catComputingId,
      sellerId: kronaSellerId,
      brand: 'Krona Studio',
      tag: 'krn',
      description: 'Machined from aerospace-grade aluminum billets with fine tactile switches and whisper-quiet bearings for uninterrupted flow and ergonomic focus.',
      titles: [
        'Custom 65% Anodized Aluminum Mechanical Keyboard',
        'Ergonomic Precision Wireless Mouse',
        'Studio Pro 14-Inch Magnesium Ultrabook Laptop',
        'Low-Profile Wireless Mechanical Keyboard',
        'Ultralight Carbon Fiber Wireless Studio Mouse',
        'Gasket-Mounted 75% Mechanical Keyboard with Rotary Knob',
        'Machined Aluminum Ergonomic Trackball Mouse',
        'Creator Studio 16-Inch Workstation Laptop',
        'Split Ortholinear Ergonomic Mechanical Keyboard',
        'Minimalist Silent Bluetooth Travel Mouse',
        'Full-Size CNC Machined Mechanical Keyboard',
        'Convertible 13-Inch Matte Black Laptop',
        'Machined Solid Brass Rotary Knob Mechanical Keyboard',
        'Precision Vertical Ergonomic Mouse',
        'Ultra-Thin Metal Mechanical Keyboard with PBT Keycaps',
        'Machined Aluminum Magnetic Wrist Rest',
        'Retro Typewriter Mechanical Keyboard with Brass Bezels',
        'High-Precision 8000Hz Studio Gaming Mouse',
        'Magnesium Alloy Lightweight 15-Inch Ultrabook',
        'Tenkeyless Mechanical Keyboard with Custom Lubed Switches'
      ]
    },
    // 4. Bags & Technical Carry (Chronos Atelier - Tag CHR)
    {
      catId: catCarryId,
      sellerId: chronosSellerId,
      brand: 'Chronos Atelier',
      tag: 'chr',
      description: 'Crafted from heavy 18oz waxed canvas, English bridle leather, and solid brass hardware designed to endure harsh global commutes.',
      titles: [
        'Rolltop Weatherproof Waxed Canvas Backpack',
        'Structured Full-Grain Italian Leather Briefcase',
        'Commuter Technical 24L Laptop Backpack',
        'Minimalist Heavyweight Canvas Weekender Duffel Bag',
        'Waterproof Commuter Cycling Messenger Bag',
        'Vegetable-Tanned Leather Folio Document Case',
        'Modular Technical Sling Crossbody Bag',
        'Heavyweight Waxed Canvas Field Tool Roll Bag',
        'Full-Grain Leather Dual-Fold Travel Wallet',
        'Lined Merino Wool & Leather 14-Inch Laptop Sleeve',
        'Heritage Leather Duffle Travel Bag with Shoulder Strap',
        'Minimalist Waxed Canvas Daypack Backpack',
        'Slim RFID-Shielded Leather Card Wallet',
        'Moulded Vegetable-Tanned Leather Desktop Valet Tray',
        'Weatherproof Roll-Top Camera Backpack with Padded Dividers',
        'Structured Leather Doctor Bag Briefcase',
        'Cordura Technical EDC Pocket Organizer Pouch',
        'Artisanal Brass & Bridle Leather Key Clip Catch',
        'Full-Grain Leather Passport Travel Organizer',
        'Waxed Canvas Tote Bag with Reinforced Leather Base'
      ]
    },
    // 5. Coffee Craft & Brewing (Aethel Coffee Lab - Tag AET)
    {
      catId: catCoffeeId,
      sellerId: aethelSellerId,
      brand: 'Aethel Coffee Lab',
      tag: 'aet',
      description: 'Precision coffee extraction tools engineered with thermal stability, uniform water dispersion, and handcrafted tactile warmth.',
      titles: [
        'Hand-Thrown Stoneware Pour-Over Coffee Dripper',
        'Precision Borosilicate Glass Coffee Dripper Carafe',
        'Stepped 48mm Conical Burr Manual Coffee Grinder',
        'Minimalist Gooseneck Electric Coffee Pouring Kettle',
        'Precision Machined 58mm Espresso Portafilter',
        'Cold Brew Slow Drip Tower with Wood Stand',
        'Double-Ribbed Ceramic Coffee Dripper Cone',
        'Turned Walnut Coffee Filter Paper Stand',
        'Precision Magnetic Espresso Coffee Distributor Tool',
        'Insulated Stainless Steel Pour-Over Coffee Dripper',
        'Heat-Resistant Glass Server Decanter with Wooden Lid',
        'Digital Micro-Gram Coffee Brew Scale with Timer',
        'Barista Solid Walnut Tamping Station',
        'Ceramic Coated Coffee Travel Mug with Splash Guard',
        'Cold Immersion Coffee Brewer with Mesh Filter',
        'Artisan Brass Gooseneck Stovetop Coffee Kettle',
        'Precision Calibrated 58.5mm Coffee Tamper',
        'Ceramic Coffee Cupping Tasting Bowls (Set of 6)',
        'Slow Drip Dutch Coffee Maker with Adjustable Valve',
        'French Press Glass Coffee Maker with Copper Frame'
      ]
    },
    // 6. Architectural Lighting (Krona Illumination - Tag KRN)
    {
      catId: catLightingId,
      sellerId: kronaSellerId,
      brand: 'Krona Illumination',
      tag: 'krn',
      description: 'Crafted from solid brass, spun aluminum, and warm 2700K optical emitters that deliver museum-grade illumination with step-less tactile dimming.',
      titles: [
        'Counterweighted Brass Desk Task Lamp',
        'Architectural Linear Pendant Luminaire',
        'Matte Black Cantilever Floor Reading Lamp',
        'Solid Smoked Glass Orb Table Lamp',
        'Machined Aluminum Adjustable Wall Sconces (Pair)',
        'Minimalist Cordless Magnetic Wall Sconce Lamp',
        'Warm Dimming 2700K Ceramic Table Beacon Lamp',
        'Sculpted Alabaster Ambient Glow Cube Lamp',
        'Industrial Articulated Drafting Arm Lamp',
        'Solid Oak Base Dimmable Linen Shade Table Lamp',
        'Brushed Raw Copper Pendant Ceiling Light',
        'Minimalist Solid Brass Banker Desk Lamp',
        'Spun Aluminum Dome Kitchen Island Pendant Light',
        'Architectural Fluted Glass Cylinder Floor Lamp',
        'Cast Concrete Base Minimalist Desk Lamp',
        'Conical Brass Bedside Reading Sconce Lamp',
        'Ambient Travertine Stone Table Lamp Beacon',
        'Telescoping Matte White Studio Floor Lamp',
        'Geometric Brass Desk Task Lamp with Touch Dimmer',
        'Hand-Blown Opaline Glass Globe Pendant Light'
      ]
    },
    // 7. Cameras & Optics (Chronos Optics - Tag CHR)
    {
      catId: catCamerasId,
      sellerId: chronosSellerId,
      brand: 'Chronos Optics',
      tag: 'chr',
      description: 'Pure mechanical rangefinders, fast aspherical prime optics, and braided silk straps for discerning documentary photographers.',
      titles: [
        'Precision 35mm Mechanical Rangefinder Camera Body',
        'Aspherical 50mm f/1.2 Fast Prime Camera Lens',
        'Compact Mirrorless Full-Frame Studio Camera Body',
        'Wide-Angle 28mm f/1.4 Coated Camera Lens',
        'Hand-Braided Japanese Silk Cord Camera Strap',
        'Vintage Mechanical Shutter Rangefinder Camera',
        'Portrait 85mm f/1.4 Aspherical Camera Lens',
        'Machined Aluminum Thumbs-Up Camera Grip',
        'Weatherproof Full-Grain Leather Camera Neck Strap',
        'Medium Format Digital Studio Camera Body',
        'Macro 60mm f/2.8 Reproduction Camera Lens',
        'Machined Brass Soft Shutter Release Button (Set of 2)',
        'Mechanical Film SLR Camera with Split-Prism Viewfinder',
        'Solid Brass Lens Hood for 35mm Prime Camera Lens',
        'Handcrafted Leather Camera Half-Case with Battery Door',
        'Optical Bright-Line 28mm Hotshoe Camera Viewfinder',
        'Multicoated Circular Polarizing Camera Lens Filter 58mm',
        'Titanium Limited Edition Rangefinder Camera Body',
        'Pancake 40mm f/2.8 Street Photography Camera Lens',
        'Waxed Canvas Dual-Body Camera Messenger Bag'
      ]
    },
    // 8. Minimalist Furniture & Living (Aethel Living - Tag AET)
    {
      catId: catFurnitureId,
      sellerId: aethelSellerId,
      brand: 'Aethel Living',
      tag: 'aet',
      description: 'Solid FSC-certified hardwoods, traditional dovetail joinery, and architectural silhouettes that age with warmth and grace.',
      titles: [
        'Mid-Century Sculpted Teak Lounge Chair',
        'Solid White Oak Architectural Low Coffee Table',
        'Moulded Plywood Armchair with Aniline Leather Cushion',
        'Modular Anodized Aluminum Display Shelving Unit',
        'Solid Walnut Hand-Turned Three-Leg Dining Stool',
        'Minimalist Quarter-Sawn Oak Writing Desk',
        'Curved Bentwood High-Back Reading Lounge Chair',
        'Solid Ash Low Platform Bench with Beveled Edges',
        'Minimalist Floating Walnut Wall Console Shelf',
        'Brushed Steel & Leather Sling Accent Chair',
        'Solid Natural Maple Round Coffee Table',
        'Architectural Cast Aluminum Side Accent Table',
        'Sculpted Oak Bar Stool with Brass Footrest Bar',
        'Cantilevered Teak Dining Chair with Cane Seat',
        'Modular Stackable Solid Wood Storage Box Cube',
        'Low Profile Japanese Walnut Tatami Tea Table',
        'Minimalist Powder-Coated Metal Bookshelf Unit',
        'Upholstered Bouclé Fabric Curved Lounge Chair',
        'Solid White Ash Bedside Nightstand Table with Drawer',
        'Heavy Marble Base Minimalist Coat Stand'
      ]
    },
    // 9. Mobile & Personal Tech (Krona Tech - Tag KRN)
    {
      catId: catMobileId,
      sellerId: kronaSellerId,
      brand: 'Krona Tech',
      tag: 'krn',
      description: 'Aerospace-grade titanium, edge-to-edge micro-bezel displays, and precision magnetic docking hardware for refined mobility.',
      titles: [
        'Titanium Flagship 5G Smartphone',
        'Solid Aluminum Magnetic Wireless Charging Pad',
        'Minimalist Matte Black Ceramic Smartphone',
        'Machined Desktop Smartphone Charging Dock Stand',
        'Ultra-Slim Titanium Wireless Mag-Battery Pack',
        'Foldable Dual-Screen OLED Smartphone',
        'Solid Walnut & Brass Smartphone Desk Stand',
        'Braided Kevlar Ultra-Fast USB-C Charging Cable',
        'Minimalist Hard Anodized Smartphone Case',
        'High-Output 100W GaN Travel Fast Charger',
        'Compact Pocket 5G Smartphone with Sapphire Glass',
        'Machined Aluminum Magnetic Car Air-Vent Phone Mount',
        'Solid Brass EDC Touch Stylus and Pocket Pen',
        'MagSafe Compatible Full-Grain Leather Phone Folio Wallet',
        'Precision Anodized Aluminum Laptop Riser Stand',
        'Ultra-Fast 65W Dual Port Desktop Charging Hub',
        'Ceramic Back High-Refresh Rate Flagship Smartphone',
        'Braided Right-Angle Lightning & USB-C Interconnect',
        'Heavyweight Steel Anti-Slip Smartphone Desktop Stand',
        'Compact 3-in-1 Foldable Travel Wireless Charging Station'
      ]
    },
    // 10. Artisan Footwear & Apparel (Chronos Atelier - Tag CHR)
    {
      catId: catFootwearId,
      sellerId: chronosSellerId,
      brand: 'Chronos Atelier',
      tag: 'chr',
      description: 'Goodyear-welted footwear and commuter apparel constructed from Horween pull-up leathers, Scottish waxed cotton, and Japanese selvedge denim.',
      titles: [
        'Goodyear-Welted Artisan Leather Service Boot',
        'Hand-Burnished Leather Chelsea Boots',
        'Minimalist Low-Top Italian Calfskin Sneakers',
        'Handcrafted Leather Penny Loafers with Oak Bark Soles',
        'Classic Waxed Cotton Commuter Field Jacket',
        'Handmade Suede Chukka Desert Boots',
        'Goodyear-Welted Cap-Toe Leather Brogue Shoes',
        'Minimalist Slip-On Leather Sneakers with Natural Sole',
        'Double-Monk Strap Full-Grain Leather Shoes',
        'Raw Selvedge Denim Heavyweight Commuter Overshirt',
        'Waterproof Waxed Leather Combat Boots',
        'Unlined Vegetable-Tanned Suede Summer Loafers',
        'Heavy Merino Wool Knit Commuter Cardigan',
        'Suede Oxford Dress Shoes with Dainite Soles',
        'Norwegian-Welted Leather Mountain Boots',
        'Tailored Minimalist Wool Commuter Coat',
        'Minimalist Runner Calfskin Sneakers with Gum Soles',
        'Full-Grain Leather Field Chukka Boots',
        'Knit Cashmere & Merino Blend Commuter Sweater',
        'Artisan Vegetable-Tanned Leather Horsefront Boots'
      ]
    }
  ];

  // Interleave the products across categories round-robin
  // This guarantees adjacent cards on the Shop page NEVER show the same category or image!
  const interleavedList: Array<{
    group: typeof categoryGroups[0];
    title: string;
    itemIndex: number;
  }> = [];

  const maxItemsPerGroup = 20;
  for (let idx = 0; idx < maxItemsPerGroup; idx++) {
    for (let g = 0; g < categoryGroups.length; g++) {
      const group = categoryGroups[g];
      if (idx < group.titles.length) {
        interleavedList.push({
          group,
          title: group.titles[idx],
          itemIndex: idx,
        });
      }
    }
  }

  const productInsertStmt = `
    INSERT INTO products (id, seller_id, category_id, title, slug, description, brand, status, is_deleted, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'published', 0, ?, ?);
  `;

  const variantInsertStmt = `
    INSERT INTO product_variants (id, product_id, sku, title, option1_name, option1_value, option2_name, option2_value, price_cents, compare_at_price_cents, weight_grams, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1);
  `;

  const inventoryInsertStmt = `
    INSERT INTO inventory (variant_id, stock_on_hand, reserved_qty, low_stock_threshold, version, updated_at)
    VALUES (?, ?, 0, 5, 1, ?);
  `;

  const imageInsertStmt = `
    INSERT INTO product_images (id, product_id, url, alt_text, sort_order)
    VALUES (?, ?, ?, ?, ?);
  `;

  const reviewInsertStmt = `
    INSERT INTO reviews (id, product_id, user_id, rating, title, comment, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'published', ?);
  `;

  const baseEpoch = Date.now();

  transaction(() => {
    // Keep track of count per seller tag to create clean, human-readable IDs
    const tagCounters: Record<string, number> = { krn: 0, chr: 0, aet: 0 };

    for (let rank = 0; rank < interleavedList.length; rank++) {
      const item = interleavedList[rank];
      const tag = item.group.tag;
      tagCounters[tag] = (tagCounters[tag] || 0) + 1;
      const serialNum = tagCounters[tag];

      const productId = `prod-${tag}-${String(serialNum).padStart(3, '0')}`;
      const slug = `${item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${rank + 1}`;

      // Stagger created_at descending by rank
      // Rank 0 is newest (highest timestamp), rank 1 is 1 minute earlier, etc.
      // Guarantees rank 0 (prod-krn-001, sel-krona-audio) is always first in /products?sort=newest
      const itemCreatedAt = new Date(baseEpoch - rank * 60000).toISOString();

      run(productInsertStmt, [
        productId,
        item.group.sellerId,
        item.group.catId,
        item.title,
        slug,
        item.group.description,
        item.group.brand,
        itemCreatedAt,
        itemCreatedAt,
      ]);

      // 1. Primary Product Image (Unique dedicated URL for every product)
      const primaryImageUrl = `/api/v1/images/products/${productId}`;
      run(imageInsertStmt, [
        `img-${productId}-0`,
        productId,
        primaryImageUrl,
        `${item.title} studio primary view`,
        0,
      ]);

      // 2. Secondary Studio Macro Detail Image (Gallery macro close-up)
      const detailImageUrl = `/api/v1/images/products/${productId}-detail`;
      run(imageInsertStmt, [
        `img-${productId}-1`,
        productId,
        detailImageUrl,
        `${item.title} studio macro craftsmanship detail`,
        1,
      ]);

      // Generate 2 variants per product (Standard and Artisan finishes)
      const variantConfigs = [
        {
          sku: `${tag.toUpperCase()}-${String(serialNum).padStart(3, '0')}-A`,
          title: 'Standard / Matte Graphite',
          opt1_name: 'Finish',
          opt1_val: 'Matte Graphite',
          opt2_name: 'Edition',
          opt2_val: 'Standard Edition',
          priceCents: 4500 + (((rank + 1) * 47) % 65000),
          // Ensure some items have stock = 1 for concurrency test (e.g. rank % 7 === 4, but NOT rank 0)
          stock: (rank > 0 && rank % 7 === 4) ? 1 : 15 + (rank % 35),
        },
        {
          sku: `${tag.toUpperCase()}-${String(serialNum).padStart(3, '0')}-B`,
          title: 'Artisan / Hand-Polished Natural',
          opt1_name: 'Finish',
          opt1_val: 'Natural Raw',
          opt2_name: 'Edition',
          opt2_val: 'Studio Reserve',
          priceCents: 5800 + (((rank + 1) * 47) % 65000),
          stock: 8 + (rank % 20),
        }
      ];

      for (const v of variantConfigs) {
        const variantId = `var-${v.sku.toLowerCase()}`;
        run(variantInsertStmt, [
          variantId,
          productId,
          v.sku,
          v.title,
          v.opt1_name,
          v.opt1_val,
          v.opt2_name,
          v.opt2_val,
          v.priceCents,
          Math.round(v.priceCents * 1.25),
          350 + (rank * 25) % 2000,
        ]);

        run(inventoryInsertStmt, [
          variantId,
          v.stock,
          itemCreatedAt,
        ]);
      }

      // Add verified buyer review to select products
      if (rank % 3 === 0) {
        run(reviewInsertStmt, [
          `rev-${productId}`,
          productId,
          customerId,
          5,
          'Remarkable Craftsmanship & Uncompromising Fidelity',
          'Exceeds all expectations. The finish tolerances, weight distribution, and tactile feedback feel exceptional right out of the presentation box.',
          itemCreatedAt,
        ]);
      }
    }

    // Record migration marker in audit_events
    run(`
      INSERT INTO audit_events (id, entity_name, entity_id, action, performed_by_user_id, metadata_json, created_at)
      VALUES (?, 'catalog', 'all', 'CATALOG_INTERLEAVED_V5', ?, '{"version": 5}', ?);
    `, [`audit-seed-${Date.now()}`, adminId, now]);
  });

  console.log('Seeding complete. Seeded 220 diverse products with 100% unique category-accurate images.');
}
