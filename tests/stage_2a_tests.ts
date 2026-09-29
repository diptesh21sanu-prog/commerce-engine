import express from 'express';
import http from 'http';
import { getDb } from '../src/server/db.js';
import { seedDatabaseIfEmpty } from '../src/server/seed.js';
import apiRouter from '../src/server/api.js';

let server: http.Server;
let baseUrl = '';

async function setup() {
  await getDb();
  await seedDatabaseIfEmpty();

  // Reset Velox to pending for repeatable lifecycle testing
  const { run } = await import('../src/server/db.js');
  run("UPDATE seller_profiles SET status = 'pending' WHERE slug = 'velox-gear';");
  run("DELETE FROM inventory WHERE variant_id IN (SELECT id FROM product_variants WHERE sku LIKE 'VLX-%');");
  run("DELETE FROM product_variants WHERE sku LIKE 'VLX-%';");
  run("DELETE FROM products WHERE title LIKE 'Velox%';");

  const app = express();
  app.use(express.json());
  app.use('/api/v1', apiRouter);

  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const address = server.address() as any;
      baseUrl = `http://127.0.0.1:${address.port}/api/v1`;
      resolve();
    });
  });
}

async function teardown() {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('=== COMMERCE ENGINE: STAGE 2(a) TEST SUITE ===\n');
  await setup();

  try {
    // ----------------------------------------------------
    // TEST 1: Catalog Scale & Seed Verification (>= 200 products)
    // ----------------------------------------------------
    console.log('[Suite 1: Catalog & Taxonomy]');
    const prodRes = await fetch(`${baseUrl}/products?limit=100`);
    const prodData = await prodRes.json();
    assert(prodRes.status === 200, 'Catalog endpoint returns 200 OK');
    assert(prodData.pagination.total >= 200, `Catalog seeded with >= 200 products (Found: ${prodData.pagination.total})`);
    
    // Test Category list
    const catRes = await fetch(`${baseUrl}/categories`);
    const catData = await catRes.json();
    assert(catRes.status === 200 && catData.categories.length >= 5, 'Taxonomy returns 5 core marketplace categories');

    // Test Single Product with SKU Variants
    const firstProd = prodData.products[0];
    const detailRes = await fetch(`${baseUrl}/products/${firstProd.id}`);
    const detailData = await detailRes.json();
    assert(detailRes.status === 200, 'Product details fetch succeeded');
    assert(detailData.product.variants.length >= 2, 'Product has multi-variant SKU configuration (>= 2 variants)');
    assert(typeof detailData.product.variants[0].available_qty === 'number', 'Variant returns live available inventory');

    // ----------------------------------------------------
    // TEST 2: Auth, Password Verification & Token Issuance
    // ----------------------------------------------------
    console.log('\n[Suite 2: Authentication & RBAC]');
    // 2.1 Customer Login
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@example.com', password: 'CustomerPass123!' })
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200 && !!loginData.token, 'Customer login succeeds and returns JWT');
    const customerToken = loginData.token;

    // 2.2 Invalid Credentials
    const badLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@example.com', password: 'WrongPassword999' })
    });
    assert(badLoginRes.status === 401, 'Invalid password correctly rejected with 401 Unauthorized');

    // 2.3 RBAC Protection: Customer attempts Admin endpoint
    const forbiddenAdminRes = await fetch(`${baseUrl}/admin/sellers`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    assert(forbiddenAdminRes.status === 403, 'Customer forbidden from accessing admin routes (403)');

    // 2.4 Admin Login
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@commerceengine.io', password: 'AdminPass123!' })
    });
    const adminData = await adminLoginRes.json();
    assert(adminLoginRes.status === 200 && adminData.user.role === 'admin', 'Admin login succeeded');
    const adminToken = adminData.token;

    // ----------------------------------------------------
    // TEST 3: Multi-Tenant Seller Isolation (Hard Isolation)
    // ----------------------------------------------------
    console.log('\n[Suite 3: Seller Tenancy & Cross-Tenant Access Protection]');
    
    // Seller 1: Krona Audio
    const kronaLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'seller.krona@commerceengine.io', password: 'SellerPass123!' })
    });
    const kronaData = await kronaLogin.json();
    const kronaToken = kronaData.token;

    // Seller 2: Aethel Ceramics
    const aethelLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'seller.aethel@commerceengine.io', password: 'SellerPass123!' })
    });
    const aethelData = await aethelLogin.json();
    const aethelToken = aethelData.token;

    // Krona views products (must only see Krona's)
    const kronaProductsRes = await fetch(`${baseUrl}/seller/products`, {
      headers: { 'Authorization': `Bearer ${kronaToken}` }
    });
    const kronaProducts = await kronaProductsRes.json();
    assert(kronaProductsRes.status === 200, 'Seller Krona can fetch own inventory');
    const allBelongToKrona = kronaProducts.products.every((p: any) => p.seller_id === kronaData.user.seller.id);
    assert(allBelongToKrona, 'Strict Tenancy: All returned products belong exclusively to Krona');

    // Find an Aethel product
    const aethelProductsRes = await fetch(`${baseUrl}/seller/products`, {
      headers: { 'Authorization': `Bearer ${aethelToken}` }
    });
    const aethelProducts = await aethelProductsRes.json();
    const targetAethelProduct = aethelProducts.products[0];

    // ATTEMPT CROSS-TENANT MUTATION: Krona tries to update Aethel's product
    const illegalEditRes = await fetch(`${baseUrl}/seller/products/${targetAethelProduct.id}`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${kronaToken}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ title: 'HACKED TITLE BY RIVAL SELLER' })
    });
    assert(illegalEditRes.status === 403, 'Cross-Tenant Guard: Seller A cannot update Seller B product (Denied 403)');

    // ATTEMPT CROSS-TENANT DELETION: Krona tries to delete Aethel's product
    const illegalDeleteRes = await fetch(`${baseUrl}/seller/products/${targetAethelProduct.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${kronaToken}` }
    });
    assert(illegalDeleteRes.status === 403, 'Cross-Tenant Guard: Seller A cannot delete Seller B product (Denied 403)');

    // ----------------------------------------------------
    // TEST 4: Admin Moderation & Seller Approval Workflow
    // ----------------------------------------------------
    console.log('\n[Suite 4: Admin Moderation & Seller Lifecycle]');
    
    // Admin lists sellers
    const sellersListRes = await fetch(`${baseUrl}/admin/sellers`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const sellersData = await sellersListRes.json();
    assert(sellersListRes.status === 200, 'Admin can view all seller profiles and applications');
    const pendingSeller = sellersData.sellers.find((s: any) => s.status === 'pending');
    assert(!!pendingSeller, 'Found pending seller application (Velox Technical Gear)');

    // Unapproved seller cannot publish listings
    const veloxLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'seller.velox@commerceengine.io', password: 'SellerPass123!' })
    });
    const veloxData = await veloxLogin.json();
    const veloxToken = veloxData.token;

    const unapprovedListingRes = await fetch(`${baseUrl}/seller/products`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${veloxToken}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        title: 'Velox Titanium Road Frame',
        categoryId: catData.categories[0].id,
        description: 'Aerodynamic custom frame.',
        variants: [{ sku: 'VLX-FRM-01', title: '54cm / Raw', priceCents: 120000, stockOnHand: 5 }]
      })
    });
    assert(unapprovedListingRes.status === 403, 'Pending/unapproved seller prohibited from publishing products (403)');

    // Admin approves Velox
    const approveRes = await fetch(`${baseUrl}/admin/sellers/${pendingSeller.id}/status`, {
      method: 'PATCH',
      headers: { 
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ status: 'approved' })
    });
    assert(approveRes.status === 200, 'Admin successfully approves pending seller');

    // Now Velox can post products
    // Re-login to refresh seller status token context
    const veloxLogin2 = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'seller.velox@commerceengine.io', password: 'SellerPass123!' })
    });
    const veloxToken2 = (await veloxLogin2.json()).token;

    const approvedListingRes = await fetch(`${baseUrl}/seller/products`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${veloxToken2}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        title: 'Velox Titanium Road Frame',
        categoryId: catData.categories[0].id,
        description: 'Aerodynamic custom frame with internal cable routing.',
        variants: [
          { sku: 'VLX-FRM-54', title: '54cm / Satin Titanium', priceCents: 185000, stockOnHand: 4 },
          { sku: 'VLX-FRM-56', title: '56cm / Satin Titanium', priceCents: 185000, stockOnHand: 6 }
        ]
      })
    });
    assert(approvedListingRes.status === 201, 'Approved seller can publish multi-variant SKU listing (201 Created)');

    // Listing Moderation by Admin
    const createdProdId = (await approvedListingRes.json()).productId;
    const modRes = await fetch(`${baseUrl}/admin/products/${createdProdId}/moderation`, {
      method: 'PATCH',
      headers: { 
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ status: 'archived' })
    });
    assert(modRes.status === 200, 'Admin can moderate and archive listings');

    // ----------------------------------------------------
    // TEST 5: Search, Facets & Price Filtering
    // ----------------------------------------------------
    console.log('\n[Suite 5: Search & Catalog Filters]');
    const searchRes = await fetch(`${baseUrl}/products?search=chronograph&limit=10`);
    const searchData = await searchRes.json();
    assert(searchRes.status === 200 && searchData.products.length > 0, 'Keyword search matches products by title/description');
    
    const catFilterRes = await fetch(`${baseUrl}/products?category=audio-acoustics&limit=5`);
    const catFilterData = await catFilterRes.json();
    assert(catFilterRes.status === 200 && catFilterData.products.every((p: any) => p.category_slug === 'audio-acoustics'), 'Category filter returns category-scoped results');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await teardown();
    console.log(`\n========================================`);
    console.log(`STAGE 2(a) RESULTS: ${passed} passed, ${failed} failed`);
    console.log(`========================================\n`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
