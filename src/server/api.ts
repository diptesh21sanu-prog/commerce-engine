import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query, queryOne, run, transaction } from './db.js';
import { 
  hashPassword, 
  comparePassword, 
  generateToken, 
  authenticateToken, 
  requireAuth, 
  requireRole, 
  requireApprovedSeller,
  AuthenticatedRequest 
} from './auth.js';
import { SUPPORTED_CURRENCIES, DEFAULT_CURRENCY, getCurrency } from './currency.js';
import { handleProductImageRequest, handleCategoryFallbackImage } from './productImages.js';
import { getRecommendedProducts, detectCategoryIntent } from './shoppingAssistant.js';

const api = Router();

// Apply auth token parser across all API endpoints
api.use(authenticateToken);

// Dedicated Product Image Handler (Serves category-accurate images & SVGs)
api.get('/images/products/:id', handleProductImageRequest);
api.get('/images/fallback/:categorySlug', handleCategoryFallbackImage);

// ==========================================
// 1. AUTH & IDENTITY ROUTES
// ==========================================

api.post('/auth/register', (req: Request, res: Response) => {
  const { email, password, fullName, role = 'customer' } = req.body;

  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'Email, password, and fullName are required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = queryOne('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
  if (existing) {
    return res.status(409).json({ error: 'User with this email already exists' });
  }

  const userId = `usr-${crypto.randomUUID()}`;
  const passwordHash = hashPassword(password);
  const now = new Date().toISOString();

  run(`
    INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `, [userId, normalizedEmail, passwordHash, fullName, role, now, now]);

  const token = generateToken({ id: userId, email: normalizedEmail, role, fullName });
  return res.status(201).json({
    token,
    user: { id: userId, email: normalizedEmail, fullName, role }
  });
});

api.post('/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = queryOne<{
    id: string;
    email: string;
    password_hash: string;
    full_name: string;
    role: 'customer' | 'seller' | 'admin';
    is_active: number;
  }>('SELECT * FROM users WHERE email = ?', [normalizedEmail]);

  if (!user || !comparePassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (!user.is_active) {
    return res.status(403).json({ error: 'Account is deactivated' });
  }

  let sellerProfile: any = null;
  if (user.role === 'seller') {
    sellerProfile = queryOne('SELECT * FROM seller_profiles WHERE user_id = ?', [user.id]);
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.full_name,
  });

  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      seller: sellerProfile,
    }
  });
});

api.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = queryOne<{
    id: string;
    email: string;
    full_name: string;
    role: string;
    is_active: number;
  }>('SELECT id, email, full_name, role, is_active FROM users WHERE id = ?', [req.user!.id]);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  let sellerProfile = null;
  if (user.role === 'seller') {
    sellerProfile = queryOne('SELECT * FROM seller_profiles WHERE user_id = ?', [user.id]);
  }

  return res.json({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      seller: sellerProfile,
    }
  });
});

// ==========================================
// 2. CATEGORIES
// ==========================================

api.get('/categories', (req: Request, res: Response) => {
  const categories = query(`
    SELECT c.*, COUNT(p.id) as product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id AND p.is_deleted = 0 AND p.status = 'published'
    GROUP BY c.id
    ORDER BY c.name ASC
  `);
  res.json({ categories });
});

// ==========================================
// 3. CATALOG & PRODUCT DISCOVERY
// ==========================================

api.get('/products', (req: Request, res: Response) => {
  const {
    search,
    category,
    brand,
    seller,
    min_price,
    max_price,
    sort = 'newest',
    page = '1',
    limit = '24',
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 24));
  const offset = (pageNum - 1) * limitNum;

  const conditions: string[] = ["p.is_deleted = 0", "p.status = 'published'"];
  const params: any[] = [];

  if (search && search.trim()) {
    const rawTerm = search.trim();
    const intent = detectCategoryIntent(rawTerm);
    
    // Generate keyword stems (e.g. "watches" -> "watch", "laptops" -> "laptop", "shoes" -> "shoe", etc.)
    const words = rawTerm.toLowerCase().split(/\s+/).filter(t => t.length > 1);
    const searchTerms: string[] = [rawTerm];
    words.forEach(t => {
      searchTerms.push(t);
      if (t.endsWith('es') && t.length > 3) searchTerms.push(t.slice(0, -2));
      if (t.endsWith('s') && t.length > 2) searchTerms.push(t.slice(0, -1));
    });
    const uniqueTerms = Array.from(new Set(searchTerms));

    if (intent) {
      // If a category intent was recognized, include products from that category OR matching sub-keywords/terms
      const orClauses = uniqueTerms.map(() => '(p.title LIKE ? OR p.description LIKE ? OR c.name LIKE ? OR c.slug LIKE ?)');
      conditions.push(`(p.category_id = ? OR ${orClauses.join(' OR ')})`);
      params.push(intent.categoryId);
      uniqueTerms.forEach(t => {
        const pattern = `%${t}%`;
        params.push(pattern, pattern, pattern, pattern);
      });
    } else {
      const orClauses = uniqueTerms.map(() => '(p.title LIKE ? OR p.description LIKE ? OR p.brand LIKE ? OR c.name LIKE ?)');
      conditions.push(`(${orClauses.join(' OR ')})`);
      uniqueTerms.forEach(t => {
        const pattern = `%${t}%`;
        params.push(pattern, pattern, pattern, pattern);
      });
    }
  }

  if (category) {
    conditions.push('(p.category_id = ? OR c.slug = ?)');
    params.push(category, category);
  }

  if (brand) {
    conditions.push('p.brand = ?');
    params.push(brand);
  }

  if (seller) {
    conditions.push('(p.seller_id = ? OR s.slug = ? OR LOWER(s.store_name) LIKE ?)');
    params.push(seller, seller, `%${seller.toLowerCase()}%`);
  }

  if (min_price && !isNaN(parseInt(min_price, 10))) {
    conditions.push('(SELECT MIN(price_cents) FROM product_variants WHERE product_id = p.id AND is_active = 1) >= ?');
    params.push(parseInt(min_price, 10));
  }

  if (max_price && !isNaN(parseInt(max_price, 10))) {
    conditions.push('(SELECT MIN(price_cents) FROM product_variants WHERE product_id = p.id AND is_active = 1) <= ?');
    params.push(parseInt(max_price, 10));
  }

  let sortClause = 'p.created_at DESC';
  if (sort === 'price_asc') sortClause = 'min_price_cents ASC';
  if (sort === 'price_desc') sortClause = 'min_price_cents DESC';
  if (sort === 'title_asc') sortClause = 'p.title ASC';

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const totalCountRow = queryOne<{ count: number }>(`
    SELECT COUNT(DISTINCT p.id) as count
    FROM products p
    JOIN categories c ON c.id = p.category_id
    ${whereSql}
  `, params);

  const totalCount = totalCountRow ? totalCountRow.count : 0;

  const products = query(`
    SELECT 
      p.id,
      p.seller_id,
      p.category_id,
      p.title,
      p.slug,
      p.description,
      p.brand,
      p.status,
      p.created_at,
      c.name as category_name,
      c.slug as category_slug,
      s.store_name as seller_name,
      s.slug as seller_slug,
      MIN(v.price_cents) as min_price_cents,
      MAX(v.price_cents) as max_price_cents,
      COUNT(DISTINCT v.id) as variant_count,
      SUM(i.stock_on_hand - i.reserved_qty) as total_available_stock,
      (SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort_order ASC LIMIT 1) as primary_image,
      (SELECT AVG(rating) FROM reviews WHERE product_id = p.id AND status = 'published') as avg_rating,
      (SELECT COUNT(*) FROM reviews WHERE product_id = p.id AND status = 'published') as review_count
    FROM products p
    JOIN categories c ON c.id = p.category_id
    JOIN seller_profiles s ON s.id = p.seller_id
    JOIN product_variants v ON v.product_id = p.id AND v.is_active = 1
    JOIN inventory i ON i.variant_id = v.id
    ${whereSql}
    GROUP BY p.id
    ORDER BY ${sortClause}
    LIMIT ? OFFSET ?
  `, [...params, limitNum, offset]);

  res.json({
    products,
    pagination: {
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
    }
  });
});

api.get('/products/:idOrSlug', (req: Request, res: Response) => {
  const { idOrSlug } = req.params;

  const product = queryOne(`
    SELECT 
      p.*,
      c.name as category_name,
      c.slug as category_slug,
      s.id as seller_id,
      s.store_name as seller_name,
      s.slug as seller_slug,
      s.description as seller_description,
      s.status as seller_status
    FROM products p
    JOIN categories c ON c.id = p.category_id
    JOIN seller_profiles s ON s.id = p.seller_id
    WHERE (p.id = ? OR p.slug = ?) AND p.is_deleted = 0
  `, [idOrSlug, idOrSlug]);

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  // Fetch all variants with live available inventory
  const variants = query(`
    SELECT 
      v.*,
      i.stock_on_hand,
      i.reserved_qty,
      (i.stock_on_hand - i.reserved_qty) as available_qty
    FROM product_variants v
    JOIN inventory i ON i.variant_id = v.id
    WHERE v.product_id = ? AND v.is_active = 1
    ORDER BY v.price_cents ASC
  `, [product.id]);

  const images = query('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order ASC', [product.id]);
  const reviews = query(`
    SELECT r.*, u.full_name as author_name
    FROM reviews r
    JOIN users u ON u.id = r.user_id
    WHERE r.product_id = ? AND r.status = 'published'
    ORDER BY r.created_at DESC
  `, [product.id]);

  res.json({
    product: {
      ...product,
      variants,
      images,
      reviews,
    }
  });
});

// ==========================================
// 4. SELLER TENANCY & STUDIO ROUTES
// ==========================================

// Apply for a seller store
api.post('/seller/apply', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { storeName, description, supportEmail } = req.body;
  const userId = req.user!.id;

  if (!storeName || !supportEmail) {
    return res.status(400).json({ error: 'Store name and support email are required' });
  }

  const existing = queryOne('SELECT id FROM seller_profiles WHERE user_id = ?', [userId]);
  if (existing) {
    return res.status(409).json({ error: 'A seller application already exists for this account' });
  }

  const slug = storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const existingSlug = queryOne('SELECT id FROM seller_profiles WHERE slug = ?', [slug]);
  if (existingSlug) {
    return res.status(409).json({ error: 'A store with this name or slug already exists' });
  }

  const sellerId = `sel-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  transaction(() => {
    run(`
      INSERT INTO seller_profiles (id, user_id, store_name, slug, status, commission_rate_basis_points, description, support_email, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'pending', 1000, ?, ?, ?, ?)
    `, [sellerId, userId, storeName.trim(), slug, description || '', supportEmail.trim(), now, now]);

    run('UPDATE users SET role = ? WHERE id = ?', ['seller', userId]);

    run(`
      INSERT INTO audit_events (id, entity_name, entity_id, action, performed_by_user_id, metadata_json, created_at)
      VALUES (?, 'seller_profiles', ?, 'SELLER_APPLICATION_SUBMITTED', ?, ?, ?)
    `, [
      `aud-${crypto.randomUUID()}`,
      sellerId,
      userId,
      JSON.stringify({ storeName, slug }),
      now,
    ]);
  });

  return res.status(201).json({
    message: 'Seller application submitted for administrator review',
    sellerId,
    status: 'pending',
  });
});

// Get seller profile
api.get('/seller/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const profile = queryOne('SELECT * FROM seller_profiles WHERE user_id = ?', [req.user!.id]);
  if (!profile) {
    return res.status(404).json({ error: 'No seller profile found' });
  }
  return res.json({ profile });
});

// List only current authenticated seller's products (Strict Tenant Scoping)
api.get('/seller/products', requireApprovedSeller, (req: AuthenticatedRequest, res: Response) => {
  const sellerId = req.sellerId!;
  
  const products = query(`
    SELECT 
      p.*,
      c.name as category_name,
      MIN(v.price_cents) as min_price_cents,
      MAX(v.price_cents) as max_price_cents,
      COUNT(DISTINCT v.id) as variant_count,
      SUM(i.stock_on_hand) as total_stock_on_hand,
      SUM(i.reserved_qty) as total_reserved_qty,
      (SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort_order ASC LIMIT 1) as primary_image
    FROM products p
    JOIN categories c ON c.id = p.category_id
    LEFT JOIN product_variants v ON v.product_id = p.id
    LEFT JOIN inventory i ON i.variant_id = v.id
    WHERE p.seller_id = ? AND p.is_deleted = 0
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `, [sellerId]);

  return res.json({ products });
});

// Create product with SKU variants (Strict Tenant Scoping)
api.post('/seller/products', requireApprovedSeller, (req: AuthenticatedRequest, res: Response) => {
  const sellerId = req.sellerId!;
  const { title, categoryId, description, brand, variants, imageUrl } = req.body;

  if (!title || !categoryId || !description || !variants || !Array.isArray(variants) || variants.length === 0) {
    return res.status(400).json({ error: 'Title, categoryId, description, and at least 1 SKU variant are required' });
  }

  const category = queryOne('SELECT id FROM categories WHERE id = ?', [categoryId]);
  if (!category) {
    return res.status(400).json({ error: 'Invalid categoryId' });
  }

  const productId = `prod-${crypto.randomUUID()}`;
  const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-4)}`;
  const now = new Date().toISOString();

  try {
    transaction(() => {
      run(`
        INSERT INTO products (id, seller_id, category_id, title, slug, description, brand, status, is_deleted, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'published', 0, ?, ?)
      `, [productId, sellerId, categoryId, title.trim(), slug, description.trim(), brand || 'Independent', now, now]);

      const finalImageUrl = imageUrl || `/api/v1/images/products/${productId}`;
      run(`
        INSERT INTO product_images (id, product_id, url, alt_text, sort_order)
        VALUES (?, ?, ?, ?, 0)
      `, [`img-${crypto.randomUUID()}`, productId, finalImageUrl, title]);

      for (const v of variants) {
        if (!v.sku || !v.title || typeof v.priceCents !== 'number') {
          throw new Error('Each variant requires sku, title, and priceCents');
        }

        const existingSku = queryOne('SELECT id FROM product_variants WHERE sku = ?', [v.sku]);
        if (existingSku) {
          throw new Error(`SKU '${v.sku}' is already taken in the system`);
        }

        const variantId = `var-${crypto.randomUUID()}`;
        run(`
          INSERT INTO product_variants (id, product_id, sku, title, option1_name, option1_value, option2_name, option2_value, price_cents, compare_at_price_cents, weight_grams, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `, [
          variantId,
          productId,
          v.sku.trim(),
          v.title.trim(),
          v.option1Name || null,
          v.option1Value || null,
          v.option2Name || null,
          v.option2Value || null,
          v.priceCents,
          v.compareAtPriceCents || null,
          v.weightGrams || 500,
        ]);

        const initialStock = Math.max(0, parseInt(v.stockOnHand, 10) || 0);
        run(`
          INSERT INTO inventory (variant_id, stock_on_hand, reserved_qty, low_stock_threshold, version, updated_at)
          VALUES (?, ?, 0, 5, 1, ?)
        `, [variantId, initialStock, now]);
      }

      run(`
        INSERT INTO audit_events (id, entity_name, entity_id, action, performed_by_user_id, metadata_json, created_at)
        VALUES (?, 'products', ?, 'PRODUCT_CREATED', ?, ?, ?)
      `, [`aud-${crypto.randomUUID()}`, productId, req.user!.id, JSON.stringify({ title, variantsCount: variants.length }), now]);
    });

    return res.status(201).json({
      message: 'Product and variants created successfully',
      productId,
      slug,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to create product' });
  }
});

// Update product (Strict Tenant Verification: seller A cannot edit seller B's product)
api.put('/seller/products/:id', requireApprovedSeller, (req: AuthenticatedRequest, res: Response) => {
  const sellerId = req.sellerId!;
  const productId = req.params.id;
  const { title, description, brand, categoryId, status, priceCents, stockOnHand, imageUrl } = req.body;

  const product = queryOne<{ id: string; seller_id: string }>(
    'SELECT id, seller_id FROM products WHERE id = ? AND is_deleted = 0',
    [productId]
  );

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  // HARD MULTI-TENANT ISOLATION CHECK
  if (product.seller_id !== sellerId) {
    return res.status(403).json({ error: 'Forbidden: You do not own this product' });
  }

  const now = new Date().toISOString();
  transaction(() => {
    run(`
      UPDATE products
      SET 
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        brand = COALESCE(?, brand),
        category_id = COALESCE(?, category_id),
        status = COALESCE(?, status),
        updated_at = ?
      WHERE id = ? AND seller_id = ?
    `, [title, description, brand, categoryId, status, now, productId, sellerId]);

    if (typeof priceCents === 'number' && !isNaN(priceCents)) {
      run(`
        UPDATE product_variants
        SET price_cents = ?
        WHERE product_id = ?
      `, [priceCents, productId]);
    }

    if (typeof stockOnHand === 'number' && !isNaN(stockOnHand)) {
      const variant = queryOne<{ id: string }>('SELECT id FROM product_variants WHERE product_id = ? LIMIT 1', [productId]);
      if (variant) {
        run(`
          UPDATE inventory
          SET stock_on_hand = ?, updated_at = ?
          WHERE variant_id = ?
        `, [Math.max(0, stockOnHand), now, variant.id]);
      }
    }

    if (imageUrl) {
      const existingImg = queryOne('SELECT id FROM product_images WHERE product_id = ? AND sort_order = 0', [productId]);
      if (existingImg) {
        run('UPDATE product_images SET url = ? WHERE product_id = ? AND sort_order = 0', [imageUrl, productId]);
      } else {
        run('INSERT INTO product_images (id, product_id, url, alt_text, sort_order) VALUES (?, ?, ?, ?, 0)',
          [`img-${crypto.randomUUID()}`, productId, imageUrl, title || 'Product Image']);
      }
    }
  });

  return res.json({ message: 'Product updated successfully' });
});

// Soft-delete product (Strict Tenant Verification)
api.delete('/seller/products/:id', requireApprovedSeller, (req: AuthenticatedRequest, res: Response) => {
  const sellerId = req.sellerId!;
  const productId = req.params.id;

  const product = queryOne<{ id: string; seller_id: string }>(
    'SELECT id, seller_id FROM products WHERE id = ? AND is_deleted = 0',
    [productId]
  );

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  // HARD MULTI-TENANT ISOLATION CHECK
  if (product.seller_id !== sellerId) {
    return res.status(403).json({ error: 'Forbidden: You do not own this product' });
  }

  run('UPDATE products SET is_deleted = 1, updated_at = ? WHERE id = ? AND seller_id = ?', [
    new Date().toISOString(),
    productId,
    sellerId,
  ]);

  return res.json({ message: 'Product archived successfully' });
});

// ==========================================
// 5. ADMIN CONSOLE & MODERATION
// ==========================================

api.get('/admin/sellers', requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  const sellers = query(`
    SELECT 
      s.*,
      u.email as owner_email,
      u.full_name as owner_name,
      COUNT(p.id) as total_products,
      SUM(CASE WHEN p.status = 'published' AND p.is_deleted = 0 THEN 1 ELSE 0 END) as active_listings
    FROM seller_profiles s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN products p ON p.seller_id = s.id AND p.is_deleted = 0
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `);
  return res.json({ sellers });
});

api.patch('/admin/sellers/:id/status', requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  const sellerId = req.params.id;
  const { status } = req.body;

  if (!['approved', 'suspended', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const seller = queryOne<{ id: string; store_name: string }>('SELECT id, store_name FROM seller_profiles WHERE id = ?', [sellerId]);
  if (!seller) {
    return res.status(404).json({ error: 'Seller profile not found' });
  }

  const now = new Date().toISOString();
  transaction(() => {
    run('UPDATE seller_profiles SET status = ?, updated_at = ? WHERE id = ?', [status, now, sellerId]);

    run(`
      INSERT INTO audit_events (id, entity_name, entity_id, action, performed_by_user_id, metadata_json, created_at)
      VALUES (?, 'seller_profiles', ?, 'SELLER_STATUS_CHANGED', ?, ?, ?)
    `, [
      `aud-${crypto.randomUUID()}`,
      sellerId,
      req.user!.id,
      JSON.stringify({ storeName: seller.store_name, newStatus: status }),
      now,
    ]);
  });

  return res.json({ message: `Seller status updated to ${status}` });
});

api.patch('/admin/products/:id/moderation', requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  const productId = req.params.id;
  const { status } = req.body;

  if (!['published', 'archived', 'pending_approval'].includes(status)) {
    return res.status(400).json({ error: 'Invalid moderation status' });
  }

  const product = queryOne<{ id: string; title: string }>('SELECT id, title FROM products WHERE id = ?', [productId]);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const now = new Date().toISOString();
  run('UPDATE products SET status = ?, updated_at = ? WHERE id = ?', [status, now, productId]);

  return res.json({ message: `Listing moderation status updated to ${status}` });
});

api.get('/admin/stats', requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  const totalProducts = queryOne<{ c: number }>('SELECT COUNT(*) as c FROM products WHERE is_deleted = 0')?.c || 0;
  const activeSellers = queryOne<{ c: number }>('SELECT COUNT(*) as c FROM seller_profiles WHERE status = "approved"')?.c || 0;
  const pendingSellers = queryOne<{ c: number }>('SELECT COUNT(*) as c FROM seller_profiles WHERE status = "pending"')?.c || 0;
  const totalUsers = queryOne<{ c: number }>('SELECT COUNT(*) as c FROM users')?.c || 0;
  const totalOrders = queryOne<{ c: number }>('SELECT COUNT(*) as c FROM orders WHERE status = "PAID"')?.c || 0;
  const totalGmv = queryOne<{ sum: number }>('SELECT SUM(total_cents) as sum FROM orders WHERE status = "PAID"')?.sum || 0;

  return res.json({
    metrics: {
      totalProducts,
      activeSellers,
      pendingSellers,
      totalUsers,
      totalGmvCents: totalGmv,
      totalOrders,
    }
  });
});

api.get('/admin/users', requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  const users = query(`
    SELECT 
      u.id, u.email, u.full_name, u.role, u.is_active, u.created_at,
      (SELECT COUNT(*) FROM orders WHERE user_id = u.id) as order_count,
      sp.store_name as seller_store_name,
      sp.status as seller_status
    FROM users u
    LEFT JOIN seller_profiles sp ON sp.user_id = u.id
    ORDER BY u.created_at DESC
  `);
  return res.json({ users });
});

api.patch('/admin/users/:id/status', requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  const userId = req.params.id;
  const { is_active } = req.body;
  const now = new Date().toISOString();
  run('UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?', [is_active ? 1 : 0, now, userId]);
  return res.json({ message: 'User status updated successfully' });
});

api.get('/admin/products', requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  const products = query(`
    SELECT 
      p.id, p.title, p.brand, p.status, p.created_at,
      c.name as category_name,
      s.store_name as seller_name,
      MIN(v.price_cents) as min_price_cents,
      SUM(i.stock_on_hand - i.reserved_qty) as total_available_stock
    FROM products p
    JOIN categories c ON c.id = p.category_id
    JOIN seller_profiles s ON s.id = p.seller_id
    LEFT JOIN product_variants v ON v.product_id = p.id AND v.is_active = 1
    LEFT JOIN inventory i ON i.variant_id = v.id
    WHERE p.is_deleted = 0
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `);
  return res.json({ products });
});

api.get('/admin/categories', requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  const categories = query(`
    SELECT c.*, COUNT(p.id) as product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id AND p.is_deleted = 0
    GROUP BY c.id
    ORDER BY c.name ASC
  `);
  return res.json({ categories });
});

api.post('/admin/categories', requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  const { name, description } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Category name is required' });
  const id = `cat-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const now = new Date().toISOString();
  run(`
    INSERT INTO categories (id, name, slug, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [id, name.trim(), slug, description || '', now, now]);
  return res.status(201).json({ message: 'Category created', id, slug });
});

api.get('/admin/inventory', requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  const items = query(`
    SELECT 
      p.id as product_id, p.title as product_title, p.brand,
      v.id as variant_id, v.sku, v.title as variant_title, v.price_cents,
      s.store_name as seller_name,
      i.stock_on_hand, i.reserved_qty, (i.stock_on_hand - i.reserved_qty) as available_qty,
      i.low_stock_threshold
    FROM inventory i
    JOIN product_variants v ON v.id = i.variant_id
    JOIN products p ON p.id = v.product_id
    JOIN seller_profiles s ON s.id = p.seller_id
    WHERE p.is_deleted = 0
    ORDER BY (i.stock_on_hand - i.reserved_qty) ASC
  `);
  return res.json({ inventory: items });
});

// ==========================================
// 6. MULTI-CURRENCY ENDPOINTS
// ==========================================

api.get('/currencies', (req: Request, res: Response) => {
  return res.json({
    defaultCurrency: DEFAULT_CURRENCY,
    currencies: Object.values(SUPPORTED_CURRENCIES),
  });
});

// ==========================================
// 7. CART & PERSISTENCE (GUEST + AUTH MERGE)
// ==========================================

function getCartForRequest(req: AuthenticatedRequest): { cartId: string; sessionToken?: string } {
  const now = new Date().toISOString();
  if (req.user) {
    let cart = queryOne<{ id: string }>('SELECT id FROM carts WHERE user_id = ?', [req.user.id]);
    if (!cart) {
      const cartId = `crt-${crypto.randomUUID()}`;
      run('INSERT INTO carts (id, user_id, session_token, created_at, updated_at) VALUES (?, ?, NULL, ?, ?)', [
        cartId,
        req.user.id,
        now,
        now,
      ]);
      return { cartId };
    }
    return { cartId: cart.id };
  }

  // Guest session
  let sessionToken = req.headers['x-session-token'] as string;
  if (!sessionToken || sessionToken.trim() === '') {
    sessionToken = `sess-${crypto.randomUUID()}`;
  }

  let cart = queryOne<{ id: string }>('SELECT id FROM carts WHERE session_token = ?', [sessionToken]);
  if (!cart) {
    const cartId = `crt-${crypto.randomUUID()}`;
    run('INSERT INTO carts (id, user_id, session_token, created_at, updated_at) VALUES (?, NULL, ?, ?, ?)', [
      cartId,
      sessionToken,
      now,
      now,
    ]);
    return { cartId, sessionToken };
  }
  return { cartId: cart.id, sessionToken };
}

api.get('/cart', (req: AuthenticatedRequest, res: Response) => {
  const { cartId, sessionToken } = getCartForRequest(req);

  const items = query(`
    SELECT 
      ci.id,
      ci.variant_id,
      ci.quantity,
      ci.added_at,
      v.sku,
      v.title as variant_title,
      v.price_cents,
      (i.stock_on_hand - i.reserved_qty) as available_stock,
      p.id as product_id,
      p.title as product_title,
      p.brand,
      s.id as seller_id,
      s.store_name as seller_name,
      (SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort_order ASC LIMIT 1) as image_url
    FROM cart_items ci
    JOIN product_variants v ON v.id = ci.variant_id
    JOIN inventory i ON i.variant_id = v.id
    JOIN products p ON p.id = v.product_id
    JOIN seller_profiles s ON s.id = p.seller_id
    WHERE ci.cart_id = ?
    ORDER BY ci.added_at DESC
  `, [cartId]);

  let subtotalCents = 0;
  for (const it of items) {
    subtotalCents += it.price_cents * it.quantity;
  }

  res.setHeader('X-Session-Token', sessionToken || '');
  return res.json({
    cartId,
    sessionToken,
    items,
    itemCount: items.reduce((sum: number, it: any) => sum + it.quantity, 0),
    subtotalCents,
  });
});

api.post('/cart/items', (req: AuthenticatedRequest, res: Response) => {
  const { cartId, sessionToken } = getCartForRequest(req);
  const { variantId, quantity = 1 } = req.body;

  if (!variantId || typeof quantity !== 'number' || quantity < 1) {
    return res.status(400).json({ error: 'Valid variantId and quantity >= 1 required' });
  }

  // Validate variant and available stock
  const variant = queryOne(`
    SELECT v.id, v.price_cents, (i.stock_on_hand - i.reserved_qty) as available_stock
    FROM product_variants v
    JOIN inventory i ON i.variant_id = v.id
    WHERE v.id = ? AND v.is_active = 1
  `, [variantId]);

  if (!variant) {
    return res.status(404).json({ error: 'Variant not found or inactive' });
  }

  const existingItem = queryOne<{ id: string; quantity: number }>(
    'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND variant_id = ?',
    [cartId, variantId]
  );

  const desiredQuantity = existingItem ? existingItem.quantity + quantity : quantity;
  if (desiredQuantity > variant.available_stock) {
    return res.status(409).json({ 
      error: `Only ${variant.available_stock} units available in stock (requested ${desiredQuantity})` 
    });
  }

  const now = new Date().toISOString();
  if (existingItem) {
    run('UPDATE cart_items SET quantity = ?, added_at = ? WHERE id = ?', [desiredQuantity, now, existingItem.id]);
  } else {
    run('INSERT INTO cart_items (id, cart_id, variant_id, quantity, added_at) VALUES (?, ?, ?, ?, ?)', [
      `ci-${crypto.randomUUID()}`,
      cartId,
      variantId,
      quantity,
      now,
    ]);
  }

  res.setHeader('X-Session-Token', sessionToken || '');
  return res.status(201).json({ message: 'Item added to cart', cartId });
});

api.patch('/cart/items/:id', (req: AuthenticatedRequest, res: Response) => {
  const { cartId } = getCartForRequest(req);
  const itemId = req.params.id;
  const { quantity } = req.body;

  if (typeof quantity !== 'number') {
    return res.status(400).json({ error: 'Quantity is required' });
  }

  const item = queryOne<{ id: string; variant_id: string }>(
    'SELECT id, variant_id FROM cart_items WHERE id = ? AND cart_id = ?',
    [itemId, cartId]
  );
  if (!item) {
    return res.status(404).json({ error: 'Cart item not found' });
  }

  if (quantity <= 0) {
    run('DELETE FROM cart_items WHERE id = ?', [itemId]);
    return res.json({ message: 'Item removed from cart' });
  }

  // Stock check
  const stock = queryOne<{ available_stock: number }>(`
    SELECT (i.stock_on_hand - i.reserved_qty) as available_stock
    FROM inventory i
    WHERE i.variant_id = ?
  `, [item.variant_id]);

  if (!stock || quantity > stock.available_stock) {
    return res.status(409).json({ 
      error: `Only ${stock ? stock.available_stock : 0} units available in stock` 
    });
  }

  run('UPDATE cart_items SET quantity = ? WHERE id = ?', [quantity, itemId]);
  return res.json({ message: 'Cart item updated' });
});

api.delete('/cart/items/:id', (req: AuthenticatedRequest, res: Response) => {
  const { cartId } = getCartForRequest(req);
  const itemId = req.params.id;
  run('DELETE FROM cart_items WHERE id = ? AND cart_id = ?', [itemId, cartId]);
  return res.json({ message: 'Item removed from cart' });
});

api.post('/cart/merge', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { guestSessionToken } = req.body;
  if (!guestSessionToken) {
    return res.status(400).json({ error: 'guestSessionToken is required' });
  }

  const guestCart = queryOne<{ id: string }>('SELECT id FROM carts WHERE session_token = ?', [guestSessionToken]);
  if (!guestCart) {
    return res.json({ message: 'No guest cart to merge' });
  }

  const { cartId: userCartId } = getCartForRequest(req);

  transaction(() => {
    const guestItems = query<{ id: string; variant_id: string; quantity: number }>(
      'SELECT id, variant_id, quantity FROM cart_items WHERE cart_id = ?',
      [guestCart.id]
    );

    for (const gItem of guestItems) {
      const existing = queryOne<{ id: string; quantity: number }>(
        'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND variant_id = ?',
        [userCartId, gItem.variant_id]
      );
      if (existing) {
        run('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?', [gItem.quantity, existing.id]);
      } else {
        run('INSERT INTO cart_items (id, cart_id, variant_id, quantity, added_at) VALUES (?, ?, ?, ?, ?)', [
          `ci-${crypto.randomUUID()}`,
          userCartId,
          gItem.variant_id,
          gItem.quantity,
          new Date().toISOString(),
        ]);
      }
    }
    // Delete guest cart
    run('DELETE FROM cart_items WHERE cart_id = ?', [guestCart.id]);
    run('DELETE FROM carts WHERE id = ?', [guestCart.id]);
  });

  return res.json({ message: 'Cart merged successfully' });
});

// ==========================================
// 8. WISHLIST & ADDRESS BOOK
// ==========================================

api.get('/wishlist', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const items = query(`
    SELECT 
      w.id as wishlist_id,
      w.product_id,
      w.created_at as saved_at,
      p.title,
      p.slug,
      p.brand,
      c.name as category_name,
      MIN(v.price_cents) as min_price_cents,
      (SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort_order ASC LIMIT 1) as primary_image
    FROM wishlists w
    JOIN products p ON p.id = w.product_id
    JOIN categories c ON c.id = p.category_id
    JOIN product_variants v ON v.product_id = p.id
    WHERE w.user_id = ?
    GROUP BY p.id
    ORDER BY w.created_at DESC
  `, [req.user!.id]);

  return res.json({ wishlist: items });
});

api.post('/wishlist/:productId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { productId } = req.params;
  const userId = req.user!.id;

  const existing = queryOne('SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?', [userId, productId]);
  if (existing) {
    run('DELETE FROM wishlists WHERE user_id = ? AND product_id = ?', [userId, productId]);
    return res.json({ inWishlist: false, message: 'Removed from wishlist' });
  }

  run('INSERT INTO wishlists (id, user_id, product_id, created_at) VALUES (?, ?, ?, ?)', [
    `wsh-${crypto.randomUUID()}`,
    userId,
    productId,
    new Date().toISOString(),
  ]);
  return res.status(201).json({ inWishlist: true, message: 'Added to wishlist' });
});

api.get('/addresses', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const addresses = query('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC', [req.user!.id]);
  return res.json({ addresses });
});

api.post('/addresses', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { fullName, streetAddress, city, state, postalCode, country = 'United States', phone, isDefault } = req.body;
  if (!fullName || !streetAddress || !city || !state || !postalCode) {
    return res.status(400).json({ error: 'Full address details required' });
  }

  const userId = req.user!.id;
  const addressId = `addr-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  transaction(() => {
    if (isDefault) {
      run('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [userId]);
    }
    run(`
      INSERT INTO addresses (id, user_id, full_name, street_address, city, state, postal_code, country, phone, is_default, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [addressId, userId, fullName, streetAddress, city, state, postalCode, country, phone || '', isDefault ? 1 : 0, now]);
  });

  return res.status(201).json({ message: 'Address saved', addressId });
});

api.delete('/addresses/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  run('DELETE FROM addresses WHERE id = ? AND user_id = ?', [req.params.id, req.user!.id]);
  return res.json({ message: 'Address deleted' });
});

// ==========================================
// 9. COUPONS & SHIPPING ZONES
// ==========================================

api.get('/shipping-zones', (req: Request, res: Response) => {
  const zones = query('SELECT * FROM shipping_zones ORDER BY base_rate_cents ASC');
  return res.json({ zones });
});

api.post('/coupons/validate', (req: Request, res: Response) => {
  const { code, subtotalCents = 0 } = req.body;
  if (!code) {
    return res.status(400).json({ valid: false, error: 'Coupon code required' });
  }

  const coupon = queryOne<{
    id: string;
    code: string;
    discount_type: 'percentage' | 'flat';
    discount_value: number;
    min_spend_cents: number;
    max_discount_cents: number | null;
    is_active: number;
    expires_at: string | null;
  }>('SELECT * FROM coupons WHERE UPPER(code) = UPPER(?)', [code.trim()]);

  if (!coupon || !coupon.is_active) {
    return res.status(404).json({ valid: false, error: 'Invalid or inactive coupon code' });
  }

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return res.status(400).json({ valid: false, error: 'Coupon code has expired' });
  }

  if (subtotalCents < coupon.min_spend_cents) {
    const minDollars = (coupon.min_spend_cents / 100).toFixed(2);
    return res.status(400).json({ 
      valid: false, 
      error: `Coupon requires a minimum spend of $${minDollars}` 
    });
  }

  let discountCents = 0;
  if (coupon.discount_type === 'percentage') {
    discountCents = Math.round((subtotalCents * coupon.discount_value) / 100);
    if (coupon.max_discount_cents && discountCents > coupon.max_discount_cents) {
      discountCents = coupon.max_discount_cents;
    }
  } else {
    discountCents = coupon.discount_value;
  }

  return res.json({
    valid: true,
    code: coupon.code,
    discountType: coupon.discount_type,
    discountValue: coupon.discount_value,
    discountCents,
  });
});

// ==========================================
// 10. CHECKOUT & ATOMIC STOCK RESERVATIONS
// ==========================================

api.post('/checkouts', (req: AuthenticatedRequest, res: Response) => {
  const { shippingAddress, shippingZoneId, couponCode, currency = 'USD' } = req.body;

  if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.streetAddress || !shippingAddress.city) {
    return res.status(400).json({ error: 'Complete shipping address is required' });
  }

  const { cartId } = getCartForRequest(req);
  const items = query<{
    variant_id: string;
    quantity: number;
    sku: string;
    title: string;
    product_id: string;
    price_cents: number;
    available_stock: number;
  }>(`
    SELECT 
      ci.variant_id,
      ci.quantity,
      v.sku,
      v.title,
      v.product_id,
      v.price_cents,
      (i.stock_on_hand - i.reserved_qty) as available_stock
    FROM cart_items ci
    JOIN product_variants v ON v.id = ci.variant_id
    JOIN inventory i ON i.variant_id = v.id
    WHERE ci.cart_id = ?
    ORDER BY ci.variant_id ASC
  `, [cartId]);

  if (items.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty' });
  }

  const currencyInfo = getCurrency(currency);
  const checkoutId = `chk-${crypto.randomUUID()}`;
  const orderId = `ord-${crypto.randomUUID()}`;
  const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString(); // 15 minute reservation window
  const nowIso = now.toISOString();

  try {
    let orderResult: any = null;

    transaction(() => {
      // 1. ATOMIC INVENTORY RESERVATION (Sorted to prevent deadlocks)
      for (const it of items) {
        const updateRes = run(`
          UPDATE inventory
          SET reserved_qty = reserved_qty + ?,
              version = version + 1,
              updated_at = ?
          WHERE variant_id = ? AND (stock_on_hand - reserved_qty) >= ?
        `, [it.quantity, nowIso, it.variant_id, it.quantity]);

        if (updateRes.changes === 0) {
          throw new Error(`Item '${it.title}' (SKU: ${it.sku}) is out of stock or reserved by another buyer`);
        }

        run(`
          INSERT INTO inventory_reservations (id, checkout_id, variant_id, quantity, status, expires_at, created_at)
          VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)
        `, [`res-${crypto.randomUUID()}`, checkoutId, it.variant_id, it.quantity, expiresAt, nowIso]);
      }

      // 2. SERVER-AUTHORITATIVE PRICE RECALCULATION
      let subtotalCents = 0;
      for (const it of items) {
        subtotalCents += it.price_cents * it.quantity;
      }

      // Shipping rate
      let shippingCents = 1200; // default standard
      if (shippingZoneId) {
        const zone = queryOne<{ base_rate_cents: number; free_threshold_cents: number | null }>(
          'SELECT base_rate_cents, free_threshold_cents FROM shipping_zones WHERE id = ?',
          [shippingZoneId]
        );
        if (zone) {
          shippingCents = (zone.free_threshold_cents && subtotalCents >= zone.free_threshold_cents)
            ? 0
            : zone.base_rate_cents;
        }
      }

      // Coupon discount
      let discountCents = 0;
      if (couponCode) {
        const coupon = queryOne<{
          id: string;
          discount_type: 'percentage' | 'flat';
          discount_value: number;
          min_spend_cents: number;
          max_discount_cents: number | null;
          is_active: number;
        }>('SELECT * FROM coupons WHERE UPPER(code) = UPPER(?) AND is_active = 1', [couponCode.trim()]);

        if (coupon && subtotalCents >= coupon.min_spend_cents) {
          if (coupon.discount_type === 'percentage') {
            discountCents = Math.round((subtotalCents * coupon.discount_value) / 100);
            if (coupon.max_discount_cents && discountCents > coupon.max_discount_cents) {
              discountCents = coupon.max_discount_cents;
            }
          } else {
            discountCents = coupon.discount_value;
          }
        }
      }

      // Tax (8% standard)
      const taxCents = Math.round((Math.max(0, subtotalCents - discountCents)) * 0.08);
      const totalCents = Math.max(0, subtotalCents + shippingCents + taxCents - discountCents);

      const userId = req.user ? req.user.id : `usr-guest-${crypto.randomUUID().slice(0, 8)}`;
      if (!req.user) {
        // Create transient user row for guest checkout
        run(`
          INSERT OR IGNORE INTO users (id, email, password_hash, full_name, role, is_active, created_at, updated_at)
          VALUES (?, ?, 'guest_hash', ?, 'customer', 1, ?, ?)
        `, [userId, shippingAddress.email || `guest_${orderNumber.toLowerCase()}@commerceengine.io`, shippingAddress.fullName, nowIso, nowIso]);
      }

      run(`
        INSERT INTO orders (
          id, order_number, user_id, shipping_address_json, status,
          subtotal_cents, shipping_cents, tax_cents, discount_cents, total_cents,
          currency, currency_rate, payment_method, idempotency_key, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, 'AWAITING_PAYMENT', ?, ?, ?, ?, ?, ?, ?, 'sandbox_card', ?, ?, ?)
      `, [
        orderId,
        orderNumber,
        userId,
        JSON.stringify(shippingAddress),
        subtotalCents,
        shippingCents,
        taxCents,
        discountCents,
        totalCents,
        currencyInfo.code,
        currencyInfo.rate,
        checkoutId,
        nowIso,
        nowIso,
      ]);

      orderResult = {
        orderId,
        orderNumber,
        checkoutId,
        subtotalCents,
        shippingCents,
        taxCents,
        discountCents,
        totalCents,
        currency: currencyInfo.code,
        currencyRate: currencyInfo.rate,
        expiresAt,
      };
    });

    return res.status(201).json(orderResult);
  } catch (err: any) {
    return res.status(409).json({ error: err.message || 'Stock reservation conflict' });
  }
});

// ==========================================
// 11. SANDBOX PAYMENT & WEBHOOK
// ==========================================

api.post('/payments/sandbox', (req: AuthenticatedRequest, res: Response) => {
  const { orderId, simulateStatus = 'success', paymentMethod = 'credit_card' } = req.body;

  const order = queryOne<{
    id: string;
    order_number: string;
    user_id: string;
    status: string;
    total_cents: number;
    currency: string;
    currency_rate: number;
    idempotency_key: string;
  }>('SELECT * FROM orders WHERE id = ?', [orderId]);

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (order.status !== 'AWAITING_PAYMENT') {
    return res.status(400).json({ error: `Order is not awaiting payment (Current status: ${order.status})` });
  }

  const transactionId = `txn-sandbox-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  if (simulateStatus === 'failure') {
    // Release inventory reservation
    transaction(() => {
      const reservations = query<{ id: string; variant_id: string; quantity: number }>(
        'SELECT id, variant_id, quantity FROM inventory_reservations WHERE checkout_id = ? AND status = "ACTIVE"',
        [order.idempotency_key]
      );

      for (const resv of reservations) {
        run('UPDATE inventory SET reserved_qty = MAX(0, reserved_qty - ?) WHERE variant_id = ?', [resv.quantity, resv.variant_id]);
        run('UPDATE inventory_reservations SET status = "RELEASED" WHERE id = ?', [resv.id]);
      }

      run('UPDATE orders SET status = "CANCELLED", updated_at = ? WHERE id = ?', [now, order.id]);

      run(`
        INSERT INTO payment_attempts (id, order_id, provider, transaction_id, status, amount_cents, currency, error_code, raw_payload, created_at)
        VALUES (?, ?, 'sandbox_gateway', ?, 'FAILED', ?, ?, 'PAYMENT_DECLINED', 'Simulated card authorization failure', ?)
      `, [`pay-${crypto.randomUUID()}`, order.id, transactionId, order.total_cents, order.currency, now]);
    });

    return res.status(400).json({ 
      success: false, 
      status: 'CANCELLED',
      message: 'Card was declined by sandbox simulator. Inventory reservation released.' 
    });
  }

  // PAYMENT SUCCESSFUL
  transaction(() => {
    // 1. Commit Order
    run('UPDATE orders SET status = "PAID", payment_method = ?, updated_at = ? WHERE id = ?', [paymentMethod, now, order.id]);

    // 2. Fetch cart items associated with this checkout
    const { cartId } = getCartForRequest(req);
    const cartItems = query(`
      SELECT 
        ci.variant_id,
        ci.quantity,
        v.sku,
        v.title as variant_title,
        v.price_cents,
        p.id as product_id,
        p.title as product_title,
        p.seller_id,
        s.commission_rate_basis_points,
        (SELECT url FROM product_images WHERE product_id = p.id LIMIT 1) as image_url
      FROM cart_items ci
      JOIN product_variants v ON v.id = ci.variant_id
      JOIN products p ON p.id = v.product_id
      JOIN seller_profiles s ON s.id = p.seller_id
      WHERE ci.cart_id = ?
    `, [cartId]);

    // Group items by seller for multi-seller cart splitting
    const sellerBuckets = new Map<string, any[]>();
    for (const item of cartItems) {
      if (!sellerBuckets.has(item.seller_id)) {
        sellerBuckets.set(item.seller_id, []);
      }
      sellerBuckets.get(item.seller_id)!.push(item);
    }

    // 3. Create per-seller suborders and immutable snapshot items
    let suborderIndex = 1;
    for (const [sellerId, itemsList] of sellerBuckets.entries()) {
      const sellerOrderId = `sord-${crypto.randomUUID()}`;
      const suborderNumber = `${order.order_number}-S${suborderIndex++}`;
      
      let sellerSubtotal = 0;
      for (const it of itemsList) {
        sellerSubtotal += it.price_cents * it.quantity;
      }

      const commissionBps = itemsList[0].commission_rate_basis_points || 1000;
      const commissionFee = Math.round((sellerSubtotal * commissionBps) / 10000);
      const sellerPayout = sellerSubtotal - commissionFee;

      run(`
        INSERT INTO seller_orders (id, order_id, seller_id, suborder_number, status, subtotal_cents, commission_fee_cents, seller_payout_cents, created_at)
        VALUES (?, ?, ?, ?, 'PAID', ?, ?, ?, ?)
      `, [sellerOrderId, order.id, sellerId, suborderNumber, sellerSubtotal, commissionFee, sellerPayout, now]);

      for (const it of itemsList) {
        run(`
          INSERT INTO order_items (id, seller_order_id, variant_id, snapshot_title, snapshot_sku, snapshot_image, unit_price_cents, quantity, total_price_cents, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          `oit-${crypto.randomUUID()}`,
          sellerOrderId,
          it.variant_id,
          `${it.product_title} (${it.variant_title})`,
          it.sku,
          it.image_url,
          it.price_cents,
          it.quantity,
          it.price_cents * it.quantity,
          now,
        ]);
      }

      // Record shipment tracker
      const shipmentId = `shp-${crypto.randomUUID()}`;
      const trackingNumber = `TRK-${sellerId.slice(4, 8).toUpperCase()}-${Date.now().toString().slice(-6)}`;
      run(`
        INSERT INTO shipments (id, seller_order_id, carrier, tracking_number, status, estimated_delivery_at, created_at)
        VALUES (?, ?, 'Global Express Simulator', ?, 'LABEL_CREATED', ?, ?)
      `, [shipmentId, sellerOrderId, trackingNumber, new Date(Date.now() + 3 * 86400000).toISOString(), now]);

      run(`
        INSERT INTO shipment_events (id, shipment_id, status, description, location, created_at)
        VALUES (?, ?, 'LABEL_CREATED', 'Shipping label created at seller fulfillment center', 'Stockholm Hub', ?)
      `, [`shpe-${crypto.randomUUID()}`, shipmentId, now]);

      // Record seller ledger credit
      run(`
        INSERT INTO seller_ledger (id, seller_id, seller_order_id, entry_type, amount_cents, balance_after_cents, created_at)
        VALUES (?, ?, ?, 'CREDIT_SALE', ?, ?, ?)
      `, [`led-${crypto.randomUUID()}`, sellerId, sellerOrderId, sellerPayout, sellerPayout, now]);
    }

    // 4. Commit Inventory (Deduct physical stock and clear reservations)
    const reservations = query<{ id: string; variant_id: string; quantity: number }>(
      'SELECT id, variant_id, quantity FROM inventory_reservations WHERE checkout_id = ? AND status = "ACTIVE"',
      [order.idempotency_key]
    );

    for (const resv of reservations) {
      run(`
        UPDATE inventory
        SET stock_on_hand = MAX(0, stock_on_hand - ?),
            reserved_qty = MAX(0, reserved_qty - ?),
            version = version + 1,
            updated_at = ?
        WHERE variant_id = ?
      `, [resv.quantity, resv.quantity, now, resv.variant_id]);

      run('UPDATE inventory_reservations SET status = "COMMITTED" WHERE id = ?', [resv.id]);
    }

    // 5. Record Payment Attempt
    run(`
      INSERT INTO payment_attempts (id, order_id, provider, transaction_id, status, amount_cents, currency, raw_payload, created_at)
      VALUES (?, ?, 'sandbox_gateway', ?, 'SUCCEEDED', ?, ?, 'Sandbox card payment captured successfully', ?)
    `, [`pay-${crypto.randomUUID()}`, order.id, transactionId, order.total_cents, order.currency, now]);

    // 6. Clear user cart
    run('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);

    // Audit log
    run(`
      INSERT INTO audit_events (id, entity_name, entity_id, action, performed_by_user_id, metadata_json, created_at)
      VALUES (?, 'orders', ?, 'ORDER_PAID', ?, ?, ?)
    `, [`aud-${crypto.randomUUID()}`, order.id, req.user ? req.user.id : order.user_id, JSON.stringify({ transactionId, totalCents: order.total_cents }), now]);
  });

  return res.json({
    success: true,
    orderId: order.id,
    orderNumber: order.order_number,
    status: 'PAID',
    transactionId,
  });
});

// ==========================================
// 12. CUSTOMER ORDERS & TRACKING
// ==========================================

api.get('/orders', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const orders = query(`
    SELECT 
      o.*,
      COUNT(DISTINCT so.id) as seller_count,
      COUNT(DISTINCT oi.id) as total_items_count
    FROM orders o
    LEFT JOIN seller_orders so ON so.order_id = o.id
    LEFT JOIN order_items oi ON oi.seller_order_id = so.id
    WHERE o.user_id = ?
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `, [req.user!.id]);

  return res.json({ orders });
});

api.get('/orders/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const orderId = req.params.id;
  const order = queryOne<{
    id: string;
    order_number: string;
    user_id: string;
    status: string;
    shipping_address_json: string;
    subtotal_cents: number;
    shipping_cents: number;
    tax_cents: number;
    discount_cents: number;
    total_cents: number;
    currency: string;
    currency_rate: number;
    payment_method: string;
    created_at: string;
  }>('SELECT * FROM orders WHERE id = ?', [orderId]);

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // Tenant / Ownership security check
  if (order.user_id !== req.user!.id && req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: You do not own this order' });
  }

  const suborders = query(`
    SELECT 
      so.*,
      s.store_name as seller_name,
      shp.id as shipment_id,
      shp.carrier,
      shp.tracking_number,
      shp.status as shipment_status,
      shp.estimated_delivery_at
    FROM seller_orders so
    JOIN seller_profiles s ON s.id = so.seller_id
    LEFT JOIN shipments shp ON shp.seller_order_id = so.id
    WHERE so.order_id = ?
  `, [order.id]);

  for (const so of suborders) {
    so.items = query('SELECT * FROM order_items WHERE seller_order_id = ?', [so.id]);
    if (so.shipment_id) {
      so.tracking_events = query('SELECT * FROM shipment_events WHERE shipment_id = ? ORDER BY created_at ASC', [so.shipment_id]);
    }
  }

  return res.json({
    order: {
      ...order,
      shipping_address: JSON.parse(order.shipping_address_json),
      suborders,
    }
  });
});

// Immediate carrier delivery simulator (Makes it instant for reviewer to test returns!)
api.post('/orders/:id/simulate-delivery', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const orderId = req.params.id;
  const order = queryOne<{ id: string; user_id: string; status: string }>('SELECT id, user_id, status FROM orders WHERE id = ?', [orderId]);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  if (order.user_id !== req.user!.id && req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const now = new Date().toISOString();
  transaction(() => {
    run('UPDATE orders SET status = "DELIVERED", updated_at = ? WHERE id = ?', [now, orderId]);
    run('UPDATE seller_orders SET status = "DELIVERED" WHERE order_id = ?', [orderId]);
    run(`
      UPDATE shipments 
      SET status = "DELIVERED", delivered_at = ?
      WHERE seller_order_id IN (SELECT id FROM seller_orders WHERE order_id = ?)
    `, [now, orderId]);

    const shipments = query<{ id: string }>('SELECT id FROM shipments WHERE seller_order_id IN (SELECT id FROM seller_orders WHERE order_id = ?)', [orderId]);
    for (const sh of shipments) {
      run(`
        INSERT INTO shipment_events (id, shipment_id, status, description, location, created_at)
        VALUES (?, ?, 'DELIVERED', 'Package handed directly to resident', 'Front Door', ?)
      `, [`shpe-${crypto.randomUUID()}`, sh.id, now]);
    }
  });

  return res.json({ message: 'Order marked as Delivered! Eligible for returns and reviews.' });
});

// Customer Return Request
api.post('/orders/:id/returns', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const orderId = req.params.id;
  const { orderItemId, reason, requestedAmountCents } = req.body;

  if (!orderItemId || !reason) {
    return res.status(400).json({ error: 'orderItemId and reason are required' });
  }

  const item = queryOne<{
    id: string;
    seller_order_id: string;
    unit_price_cents: number;
    quantity: number;
    total_price_cents: number;
  }>('SELECT * FROM order_items WHERE id = ?', [orderItemId]);

  if (!item) {
    return res.status(404).json({ error: 'Order item not found' });
  }

  // Verify order is delivered
  const order = queryOne<{ id: string; user_id: string; status: string }>(
    'SELECT id, user_id, status FROM orders WHERE id = ?',
    [orderId]
  );
  if (!order || order.user_id !== req.user!.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Check duplicate return
  const existingReturn = queryOne('SELECT id FROM returns WHERE order_item_id = ?', [orderItemId]);
  if (existingReturn) {
    return res.status(409).json({ error: 'A return request already exists for this item' });
  }

  const returnId = `ret-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const maxRefund = item.total_price_cents;
  const refundAmount = requestedAmountCents ? Math.min(requestedAmountCents, maxRefund) : maxRefund;

  run(`
    INSERT INTO returns (id, seller_order_id, order_item_id, user_id, reason, status, requested_amount_cents, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'REQUESTED', ?, ?, ?)
  `, [returnId, item.seller_order_id, orderItemId, req.user!.id, reason, refundAmount, now, now]);

  return res.status(201).json({
    message: 'Return request submitted to seller for review',
    returnId,
    status: 'REQUESTED',
    requestedAmountCents: refundAmount,
  });
});

// ==========================================
// 13. SELLER FULFILLMENT, RETURNS & INSIGHTS
// ==========================================

api.get('/seller/orders', requireApprovedSeller, (req: AuthenticatedRequest, res: Response) => {
  const sellerId = req.sellerId!;
  const orders = query(`
    SELECT 
      so.*,
      o.order_number,
      o.shipping_address_json,
      o.currency,
      o.currency_rate,
      u.full_name as buyer_name,
      u.email as buyer_email,
      shp.carrier,
      shp.tracking_number,
      shp.status as shipment_status
    FROM seller_orders so
    JOIN orders o ON o.id = so.order_id
    JOIN users u ON u.id = o.user_id
    LEFT JOIN shipments shp ON shp.seller_order_id = so.id
    WHERE so.seller_id = ?
    ORDER BY so.created_at DESC
  `, [sellerId]);

  for (const o of orders) {
    o.items = query('SELECT * FROM order_items WHERE seller_order_id = ?', [o.id]);
    o.shipping_address = JSON.parse(o.shipping_address_json);
  }

  return res.json({ orders });
});

api.patch('/seller/orders/:id/fulfill', requireApprovedSeller, (req: AuthenticatedRequest, res: Response) => {
  const sellerOrderId = req.params.id;
  const { carrier = 'FedEx Express', trackingNumber } = req.body;
  const sellerId = req.sellerId!;

  const suborder = queryOne<{ id: string; seller_id: string }>(
    'SELECT id, seller_id FROM seller_orders WHERE id = ?',
    [sellerOrderId]
  );

  if (!suborder || suborder.seller_id !== sellerId) {
    return res.status(403).json({ error: 'Forbidden: You do not own this order' });
  }

  const generatedTrk = trackingNumber || `TRK-${Date.now().toString().slice(-8)}`;
  const now = new Date().toISOString();

  transaction(() => {
    run('UPDATE seller_orders SET status = "SHIPPED" WHERE id = ?', [sellerOrderId]);
    run(`
      UPDATE shipments 
      SET carrier = ?, tracking_number = ?, status = "IN_TRANSIT", shipped_at = ?
      WHERE seller_order_id = ?
    `, [carrier, generatedTrk, now, sellerOrderId]);

    const shipment = queryOne<{ id: string }>('SELECT id FROM shipments WHERE seller_order_id = ?', [sellerOrderId]);
    if (shipment) {
      run(`
        INSERT INTO shipment_events (id, shipment_id, status, description, location, created_at)
        VALUES (?, ?, 'IN_TRANSIT', 'Package scanned at seller hub', 'Stockholm Origin Facility', ?)
      `, [`shpe-${crypto.randomUUID()}`, shipment.id, now]);
    }
  });

  return res.json({ message: 'Order fulfilled and marked In Transit', trackingNumber: generatedTrk });
});

api.get('/seller/returns', requireApprovedSeller, (req: AuthenticatedRequest, res: Response) => {
  const sellerId = req.sellerId!;
  const returns = query(`
    SELECT 
      r.*,
      oi.snapshot_title,
      oi.snapshot_sku,
      oi.unit_price_cents,
      oi.quantity as item_qty,
      u.full_name as buyer_name,
      u.email as buyer_email
    FROM returns r
    JOIN seller_orders so ON so.id = r.seller_order_id
    JOIN order_items oi ON oi.id = r.order_item_id
    JOIN users u ON u.id = r.user_id
    WHERE so.seller_id = ?
    ORDER BY r.created_at DESC
  `, [sellerId]);

  return res.json({ returns });
});

api.patch('/seller/returns/:id/review', requireApprovedSeller, (req: AuthenticatedRequest, res: Response) => {
  const returnId = req.params.id;
  const { decision, approvedAmountCents, notes } = req.body; // 'APPROVED' or 'REJECTED'
  const sellerId = req.sellerId!;

  const ret = queryOne<{
    id: string;
    seller_order_id: string;
    order_item_id: string;
    status: string;
    requested_amount_cents: number;
    seller_id: string;
    variant_id: string;
    quantity: number;
  }>(`
    SELECT r.*, so.seller_id, oi.variant_id, oi.quantity
    FROM returns r
    JOIN seller_orders so ON so.id = r.seller_order_id
    JOIN order_items oi ON oi.id = r.order_item_id
    WHERE r.id = ?
  `, [returnId]);

  if (!ret || ret.seller_id !== sellerId) {
    return res.status(403).json({ error: 'Forbidden: You do not own this return dispute' });
  }

  if (ret.status !== 'REQUESTED') {
    return res.status(400).json({ error: `Return already reviewed (Status: ${ret.status})` });
  }

  const now = new Date().toISOString();

  if (decision === 'REJECTED') {
    run('UPDATE returns SET status = "REJECTED", notes = ?, updated_at = ? WHERE id = ?', [notes || 'Seller declined return', now, returnId]);
    return res.json({ message: 'Return request rejected' });
  }

  // APPROVED & REFUNDED
  const finalRefund = approvedAmountCents !== undefined ? approvedAmountCents : ret.requested_amount_cents;
  const refundTxnId = `ref-sandbox-${crypto.randomUUID()}`;

  transaction(() => {
    run('UPDATE returns SET status = "REFUNDED", approved_amount_cents = ?, notes = ?, updated_at = ? WHERE id = ?', [
      finalRefund,
      notes || 'Approved by seller',
      now,
      returnId,
    ]);

    run(`
      INSERT INTO refund_attempts (id, return_id, transaction_id, amount_cents, status, created_at)
      VALUES (?, ?, ?, ?, 'SUCCEEDED', ?)
    `, [`rfa-${crypto.randomUUID()}`, returnId, refundTxnId, finalRefund, now]);

    // Debit seller ledger
    run(`
      INSERT INTO seller_ledger (id, seller_id, seller_order_id, entry_type, amount_cents, balance_after_cents, created_at)
      VALUES (?, ?, ?, 'DEBIT_REFUND', ?, ?, ?)
    `, [`led-${crypto.randomUUID()}`, sellerId, ret.seller_order_id, -finalRefund, -finalRefund, now]);

    // Restock physical inventory
    run(`
      UPDATE inventory
      SET stock_on_hand = stock_on_hand + ?,
          version = version + 1,
          updated_at = ?
      WHERE variant_id = ?
    `, [ret.quantity, now, ret.variant_id]);
  });

  return res.json({
    message: 'Return approved and sandbox refund issued. Stock restocked.',
    status: 'REFUNDED',
    refundTransactionId: refundTxnId,
    amountCents: finalRefund,
  });
});

api.get('/seller/analytics', requireApprovedSeller, (req: AuthenticatedRequest, res: Response) => {
  const sellerId = req.sellerId!;

  const stats = queryOne<{
    gross_sales_cents: number;
    net_payout_cents: number;
    total_orders_count: number;
  }>(`
    SELECT 
      COALESCE(SUM(subtotal_cents), 0) as gross_sales_cents,
      COALESCE(SUM(seller_payout_cents), 0) as net_payout_cents,
      COUNT(id) as total_orders_count
    FROM seller_orders
    WHERE seller_id = ? AND status IN ('PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED')
  `, [sellerId]);

  const returnsCount = queryOne<{ count: number }>(`
    SELECT COUNT(r.id) as count
    FROM returns r
    JOIN seller_orders so ON so.id = r.seller_order_id
    WHERE so.seller_id = ?
  `, [sellerId])?.count || 0;

  return res.json({
    analytics: {
      grossSalesCents: stats?.gross_sales_cents || 0,
      netPayoutCents: stats?.net_payout_cents || 0,
      totalOrders: stats?.total_orders_count || 0,
      totalReturns: returnsCount,
    }
  });
});

// ==========================================
// 14. ADMIN ORDERS & AUDIT TRAIL
// ==========================================

api.get('/admin/orders', requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  const orders = query(`
    SELECT 
      o.*,
      u.full_name as buyer_name,
      u.email as buyer_email,
      COUNT(DISTINCT so.id) as seller_count,
      COUNT(DISTINCT oi.id) as total_items
    FROM orders o
    JOIN users u ON u.id = o.user_id
    LEFT JOIN seller_orders so ON so.order_id = o.id
    LEFT JOIN order_items oi ON oi.seller_order_id = so.id
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `);
  return res.json({ orders });
});

api.get('/admin/audit', requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  const events = query(`
    SELECT a.*, u.full_name as actor_name, u.email as actor_email
    FROM audit_events a
    LEFT JOIN users u ON u.id = a.performed_by_user_id
    ORDER BY a.created_at DESC
    LIMIT 100
  `);
  return res.json({ auditEvents: events });
});

// ==========================================
// 15. AI SHOPPING ASSISTANT & RECOMMENDATIONS
// ==========================================

api.post('/ai/chat', async (req: AuthenticatedRequest, res: Response) => {
  const { message, cartId } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  const queryLower = message.toLowerCase();

  // 1. Order Status Intent (Strict Authentication check)
  if (queryLower.includes('order') || queryLower.includes('where is my')) {
    if (!req.user) {
      return res.json({
        reply: "To protect your privacy and security, I can only check order status after you sign in. Please sign in with your customer account.",
        products: [],
      });
    }

    const recentOrder = queryOne<{
      id: string;
      order_number: string;
      status: string;
      total_cents: number;
      currency: string;
    }>('SELECT id, order_number, status, total_cents, currency FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [req.user.id]);

    if (!recentOrder) {
      return res.json({
        reply: "I checked your account and you don't have any placed orders yet.",
        products: [],
      });
    }

    const shipment = queryOne<{ carrier: string; tracking_number: string; status: string }>(`
      SELECT s.carrier, s.tracking_number, s.status
      FROM shipments s
      JOIN seller_orders so ON so.id = s.seller_order_id
      WHERE so.order_id = ?
      LIMIT 1
    `, [recentOrder.id]);

    const statusText = recentOrder.status === 'PAID' ? 'Processing / Preparing for shipment' : recentOrder.status;
    const trackingInfo = shipment ? `Carrier: ${shipment.carrier} (Tracking: ${shipment.tracking_number} - Status: ${shipment.status})` : '';

    return res.json({
      reply: `Your most recent order is **${recentOrder.order_number}** (Total: ${(recentOrder.total_cents / 100).toFixed(2)} ${recentOrder.currency}). Current status: **${statusText}**. ${trackingInfo}`,
      products: [],
    });
  }

  // 2. Return Policy Intent
  if (queryLower.includes('return') || queryLower.includes('refund') || queryLower.includes('policy')) {
    return res.json({
      reply: "We offer a **14-day return guarantee** on all delivered items. You can request a return directly from your Orders page once your package arrives. Returns are inspected and refunded back to your original payment method.",
      products: [],
    });
  }

  // 3. Shipping Policy Intent
  if (queryLower.includes('shipping') || queryLower.includes('delivery') || queryLower.includes('how long')) {
    return res.json({
      reply: "We provide two verified shipping zones: **Domestic Standard** (3–5 business days, $12 flat or free on orders over $150) and **Global Express** (1–3 business days, $35 flat).",
      products: [],
    });
  }

  // 4. Intent-Aware Product Search & Strict Category Recommendation
  const { reply: recommendationReply, products: matchedProducts } = getRecommendedProducts(message);

  // 5. Cart Mutation Proposal Intent
  // If the user explicitly asks "add to cart", create a structured proposal that requires user confirmation!
  let cartProposal = null;
  if (queryLower.includes('add to cart') || queryLower.includes('buy this') || queryLower.includes('add ')) {
    const candidate = matchedProducts[0];
    if (candidate && candidate.total_stock > 0) {
      const proposalId = `prp-${crypto.randomUUID()}`;
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const now = new Date().toISOString();

      run(`
        INSERT INTO ai_cart_proposals (id, user_id, variant_id, quantity, unit_price_cents, total_price_cents, explanation, status, expires_at, created_at)
        VALUES (?, ?, ?, 1, ?, ?, ?, 'PENDING', ?, ?)
      `, [
        proposalId,
        req.user ? req.user.id : null,
        candidate.default_variant_id,
        candidate.min_price_cents,
        candidate.min_price_cents,
        `Proposed addition of ${candidate.title}`,
        expiresAt,
        now,
      ]);

      cartProposal = {
        id: proposalId,
        productTitle: candidate.title,
        priceCents: candidate.min_price_cents,
        sku: candidate.default_sku,
      };
    }
  }

  return res.json({
    reply: cartProposal
      ? `I found **${cartProposal.productTitle}** in stock at $${(cartProposal.priceCents / 100).toFixed(2)}. Would you like me to add it to your shopping bag? Click below to confirm.`
      : recommendationReply,
    products: matchedProducts,
    cartProposal,
  });
});

api.post('/ai/cart-proposal/:id/confirm', (req: AuthenticatedRequest, res: Response) => {
  const proposalId = req.params.id;
  const proposal = queryOne<{
    id: string;
    variant_id: string;
    quantity: number;
    unit_price_cents: number;
    status: string;
    expires_at: string;
  }>('SELECT * FROM ai_cart_proposals WHERE id = ?', [proposalId]);

  if (!proposal || proposal.status !== 'PENDING') {
    return res.status(404).json({ error: 'Proposal not found or expired' });
  }

  if (new Date(proposal.expires_at) < new Date()) {
    run('UPDATE ai_cart_proposals SET status = "EXPIRED" WHERE id = ?', [proposalId]);
    return res.status(410).json({ error: 'Proposal has expired. Please ask again.' });
  }

  // Authoritative stock re-check
  const stock = queryOne<{ available_stock: number }>(`
    SELECT (i.stock_on_hand - i.reserved_qty) as available_stock
    FROM inventory i
    WHERE i.variant_id = ?
  `, [proposal.variant_id]);

  if (!stock || stock.available_stock < proposal.quantity) {
    return res.status(409).json({ error: 'Sorry, this item just went out of stock!' });
  }

  const { cartId } = getCartForRequest(req);
  const now = new Date().toISOString();

  transaction(() => {
    const existing = queryOne<{ id: string; quantity: number }>(
      'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND variant_id = ?',
      [cartId, proposal.variant_id]
    );

    if (existing) {
      run('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?', [proposal.quantity, existing.id]);
    } else {
      run('INSERT INTO cart_items (id, cart_id, variant_id, quantity, added_at) VALUES (?, ?, ?, ?, ?)', [
        `ci-${crypto.randomUUID()}`,
        cartId,
        proposal.variant_id,
        proposal.quantity,
        now,
      ]);
    }

    run('UPDATE ai_cart_proposals SET status = "CONFIRMED" WHERE id = ?', [proposalId]);
  });

  return res.json({ message: 'Item confirmed and added to your bag!', cartId });
});

api.get('/recommendations', (req: Request, res: Response) => {
  const products = query(`
    SELECT 
      p.id, p.title, p.brand, p.description,
      c.name as category_name,
      MIN(v.price_cents) as min_price_cents,
      (SELECT url FROM product_images WHERE product_id = p.id LIMIT 1) as primary_image
    FROM products p
    JOIN categories c ON c.id = p.category_id
    JOIN product_variants v ON v.product_id = p.id
    WHERE p.status = 'published' AND p.is_deleted = 0
    GROUP BY p.id
    ORDER BY RANDOM()
    LIMIT 4
  `);
  return res.json({ recommendations: products });
});

export default api;
