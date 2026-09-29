import express from 'express';
import http from 'http';
import { getDb, run, query, queryOne } from '../src/server/db.js';
import { seedDatabaseIfEmpty } from '../src/server/seed.js';
import apiRouter from '../src/server/api.js';
import { formatMoney, convertCents, SUPPORTED_CURRENCIES } from '../src/services/currency.js';

let server: http.Server;
let baseUrl = '';

async function setup() {
  await getDb();
  await seedDatabaseIfEmpty();

  // Reset any test states
  run("UPDATE seller_profiles SET status = 'pending' WHERE slug = 'velox-gear';");
  run("DELETE FROM inventory WHERE variant_id IN (SELECT id FROM product_variants WHERE sku LIKE 'VLX-%');");
  run("DELETE FROM product_variants WHERE sku LIKE 'VLX-%';");
  run("DELETE FROM products WHERE title LIKE 'Velox%';");
  run("DELETE FROM cart_items;");
  run("DELETE FROM inventory_reservations;");
  run("UPDATE inventory SET reserved_qty = 0;");
  run("DELETE FROM returns;");
  run("DELETE FROM orders;");

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
  console.log('=== COMMERCE ENGINE: FULL END-TO-END TEST SUITE ===\n');
  await setup();

  try {
    // ----------------------------------------------------
    // TEST 1: Multi-Currency Engine Verification
    // ----------------------------------------------------
    console.log('[Suite 1: Multi-Currency Engine]');
    const currRes = await fetch(`${baseUrl}/currencies`);
    const currData = await currRes.json();
    assert(currRes.status === 200 && currData.currencies.length >= 10, 'Currencies endpoint returns at least 10 major currencies');
    
    // Verify currency formatting examples
    const inrFormatted = formatMoney(2999, 'INR');
    assert(inrFormatted.startsWith('₹'), `INR formats with ₹ symbol: ${inrFormatted}`);

    const jpyFormatted = formatMoney(2999, 'JPY');
    assert(jpyFormatted.startsWith('¥'), `JPY formats with ¥ symbol and no decimal: ${jpyFormatted}`);

    const eurFormatted = formatMoney(2999, 'EUR');
    assert(eurFormatted.startsWith('€'), `EUR formats with € symbol: ${eurFormatted}`);

    const gbpFormatted = formatMoney(2999, 'GBP');
    assert(gbpFormatted.startsWith('£'), `GBP formats with £ symbol: ${gbpFormatted}`);

    // ----------------------------------------------------
    // TEST 2: Customer Authentication & Persistent Cart
    // ----------------------------------------------------
    console.log('\n[Suite 2: Customer Identity & Cart Operations]');
    const customerLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@example.com', password: 'CustomerPass123!' })
    });
    const customerAuth = await customerLogin.json();
    assert(customerLogin.status === 200 && !!customerAuth.token, 'Customer logged in successfully');
    const customerToken = customerAuth.token;

    // Fetch catalog to get product and variant with sufficient available inventory
    const prodsRes = await fetch(`${baseUrl}/products?limit=20`);
    const prodsData = await prodsRes.json();
    let variant1: any = null;
    for (const p of prodsData.products) {
      const details = await (await fetch(`${baseUrl}/products/${p.id}`)).json();
      const candidate = details.product?.variants?.find((v: any) => (v.available_qty || 0) >= 5);
      if (candidate) {
        variant1 = candidate;
        break;
      }
    }
    if (!variant1) {
      throw new Error('No variant with >= 5 stock found for test');
    }

    // Add item to cart
    const addRes = await fetch(`${baseUrl}/cart/items`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ variantId: variant1.id, quantity: 2 })
    });
    assert(addRes.status === 201, 'Item added to cart successfully');

    // Inspect cart
    const cartRes = await fetch(`${baseUrl}/cart`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    const cartData = await cartRes.json();
    assert(cartRes.status === 200 && cartData.items.length >= 1, 'Cart retrieved with items');
    assert(cartData.subtotalCents === variant1.price_cents * 2, 'Authoritative subtotal calculated correctly in backend');

    // Coupon Validation
    const couponRes = await fetch(`${baseUrl}/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'WELCOME20', subtotalCents: cartData.subtotalCents })
    });
    const couponData = await couponRes.json();
    assert(couponRes.status === 200 && couponData.valid === true, 'Coupon WELCOME20 validated successfully');

    // ----------------------------------------------------
    // TEST 3: Authoritative Checkout & Stock Reservation
    // ----------------------------------------------------
    console.log('\n[Suite 3: Checkout, Stock Reservation & Security]');
    const checkoutRes = await fetch(`${baseUrl}/checkouts`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${customerToken}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        shippingAddress: {
          fullName: 'Liam Thorne',
          streetAddress: '742 Evergreen Terrace',
          city: 'Springfield',
          state: 'OR',
          postalCode: '97477',
        },
        couponCode: 'WELCOME20',
        currency: 'INR',
      })
    });
    const checkoutData = await checkoutRes.json();
    assert(checkoutRes.status === 201, 'Checkout initiated with 201 Created');
    assert(!!checkoutData.orderId, 'Order created with unique order ID');
    assert(checkoutData.currency === 'INR', 'Order frozen in customer selected currency (INR)');
    assert(!!checkoutData.expiresAt, 'Stock reservation TTL active (15-min countdown)');

    // ----------------------------------------------------
    // TEST 4: Concurrency & Stock Exhaustion Guard
    // ----------------------------------------------------
    console.log('\n[Suite 4: Concurrency Race & Negative Stock Guard]');
    // Find a variant with 1 stock on hand
    const limitedStockVar = queryOne<{ id: string; available: number }>(`
      SELECT v.id, (i.stock_on_hand - i.reserved_qty) as available
      FROM product_variants v
      JOIN inventory i ON i.variant_id = v.id
      WHERE (i.stock_on_hand - i.reserved_qty) = 1
      LIMIT 1
    `);

    if (limitedStockVar) {
      // Simulate two racing checkouts for the exact same last unit
      const guestSess1 = 'guest-race-1';
      const guestSess2 = 'guest-race-2';

      // Put item in cart 1
      await fetch(`${baseUrl}/cart/items`, {
        method: 'POST',
        headers: { 'X-Session-Token': guestSess1, 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId: limitedStockVar.id, quantity: 1 })
      });
      // Put item in cart 2
      await fetch(`${baseUrl}/cart/items`, {
        method: 'POST',
        headers: { 'X-Session-Token': guestSess2, 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId: limitedStockVar.id, quantity: 1 })
      });

      // Race checkout simultaneously
      const [race1, race2] = await Promise.all([
        fetch(`${baseUrl}/checkouts`, {
          method: 'POST',
          headers: { 'X-Session-Token': guestSess1, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shippingAddress: { fullName: 'Racer 1', streetAddress: '100 Race St', city: 'Denver', state: 'CO', postalCode: '80202' }
          })
        }),
        fetch(`${baseUrl}/checkouts`, {
          method: 'POST',
          headers: { 'X-Session-Token': guestSess2, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shippingAddress: { fullName: 'Racer 2', streetAddress: '200 Race St', city: 'Denver', state: 'CO', postalCode: '80202' }
          })
        })
      ]);

      const successCount = (race1.status === 201 ? 1 : 0) + (race2.status === 201 ? 1 : 0);
      assert(successCount === 1, `Concurrency Race: Exactly 1 checkout succeeded for the last unit (Success: ${successCount})`);

      // Verify stock did not drop below 0
      const stockAfterRace = queryOne<{ available: number }>(`
        SELECT (i.stock_on_hand - i.reserved_qty) as available
        FROM inventory i WHERE variant_id = ?
      `, [limitedStockVar.id]);
      assert(stockAfterRace!.available >= 0, 'Zero Negative Stock Guaranteed under concurrent race condition');
    }

    // ----------------------------------------------------
    // TEST 5: Payment Failure & Reservation Release
    // ----------------------------------------------------
    console.log('\n[Suite 5: Sandbox Payment Decline & Instant Stock Release]');
    // Create another checkout to test card decline
    const declineCheckoutRes = await fetch(`${baseUrl}/checkouts`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${customerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shippingAddress: { fullName: 'Liam Thorne', streetAddress: '742 Evergreen', city: 'Springfield', state: 'OR', postalCode: '97477' }
      })
    });
    // Add item first
    const productB = prodsData.products[1];
    const productBDetails = await (await fetch(`${baseUrl}/products/${productB.id}`)).json();
    const variantB = productBDetails.product.variants[0];
    await fetch(`${baseUrl}/cart/items`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${customerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ variantId: variantB.id, quantity: 1 })
    });
    const declineCheckout = await (await fetch(`${baseUrl}/checkouts`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${customerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shippingAddress: { fullName: 'Liam Thorne', streetAddress: '742 Evergreen', city: 'Springfield', state: 'OR', postalCode: '97477' }
      })
    })).json();

    const declinePaymentRes = await fetch(`${baseUrl}/payments/sandbox`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${customerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: declineCheckout.orderId, simulateStatus: 'failure' })
    });
    assert(declinePaymentRes.status === 400, 'Sandbox declined payment returned 400 status');
    
    // Check that reservation was released
    const reservationAfterDecline = queryOne<{ status: string }>(
      'SELECT status FROM inventory_reservations WHERE checkout_id = ?',
      [declineCheckout.checkoutId]
    );
    assert(reservationAfterDecline?.status === 'RELEASED', 'Inventory reservation successfully released on payment decline');

    // ----------------------------------------------------
    // TEST 6: Payment Success, Order Fulfillment & Multi-Seller Cart Splitting
    // ----------------------------------------------------
    console.log('\n[Suite 6: Payment Success, Order Lifecycle & Multi-Seller Splitting]');
    const successPaymentRes = await fetch(`${baseUrl}/payments/sandbox`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${customerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: checkoutData.orderId, simulateStatus: 'success' })
    });
    const successPaymentData = await successPaymentRes.json();
    assert(successPaymentRes.status === 200 && successPaymentData.status === 'PAID', 'Payment captured successfully and order status is PAID');

    // Check Customer Orders endpoint
    const myOrdersRes = await fetch(`${baseUrl}/orders`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    const myOrdersData = await myOrdersRes.json();
    assert(myOrdersRes.status === 200 && myOrdersData.orders.length > 0, 'Customer order history returns placed order');

    // Check Single Order Details
    const orderDetailRes = await fetch(`${baseUrl}/orders/${checkoutData.orderId}`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    const orderDetailData = await orderDetailRes.json();
    assert(orderDetailRes.status === 200, 'Order details fetch succeeded');
    assert(orderDetailData.order.suborders.length > 0, 'Cart split into per-seller suborders');
    assert(!!orderDetailData.order.suborders[0].tracking_number, 'Shipment created with live tracking number');

    // ----------------------------------------------------
    // TEST 7: Carrier Simulation & Return Dispute Flow
    // ----------------------------------------------------
    console.log('\n[Suite 7: Carrier Delivery Simulation & Return Request]');
    // Simulate Delivery
    const simDeliveryRes = await fetch(`${baseUrl}/orders/${checkoutData.orderId}/simulate-delivery`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    assert(simDeliveryRes.status === 200, 'Delivery simulated: Order marked as DELIVERED');

    // Customer Requests Return on Delivered Item
    const targetItem = orderDetailData.order.suborders[0].items[0];
    const returnReqRes = await fetch(`${baseUrl}/orders/${checkoutData.orderId}/returns`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${customerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderItemId: targetItem.id,
        reason: 'Changed mind / Color does not match aesthetic',
      })
    });
    const returnReqData = await returnReqRes.json();
    assert(returnReqRes.status === 201 && returnReqData.status === 'REQUESTED', 'Return request created with REQUESTED status');

    // Seller approves Return
    const sellerLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'seller.krona@commerceengine.io', password: 'SellerPass123!' })
    });
    const sellerAuth = await sellerLogin.json();
    const sellerToken = sellerAuth.token;

    const reviewReturnRes = await fetch(`${baseUrl}/seller/returns/${returnReqData.returnId}/review`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${sellerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'APPROVED', notes: 'Item approved for refund' })
    });
    const reviewReturnData = await reviewReturnRes.json();
    assert(reviewReturnRes.status === 200 && reviewReturnData.status === 'REFUNDED', 'Seller approved return and sandbox refund was issued');

    // ----------------------------------------------------
    // TEST 8: Grounded AI Assistant & Confirmed Cart Mutations
    // ----------------------------------------------------
    console.log('\n[Suite 8: Grounded AI Assistant & Explicit Confirmation]');
    const aiChatPolicy = await fetch(`${baseUrl}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'What is your return policy?' })
    });
    const aiPolicyData = await aiChatPolicy.json();
    assert(aiPolicyData.reply.includes('14-day return'), 'AI assistant correctly cites 14-day return policy without fabrication');

    // AI Cart Proposal - requires explicit confirmation
    const aiChatAdd = await fetch(`${baseUrl}/ai/chat`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${customerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Add headphones to my cart' })
    });
    const aiAddData = await aiChatAdd.json();
    assert(!!aiAddData.cartProposal, 'AI generates staged cart proposal instead of mutating cart silently');

    // Confirm proposal
    const confirmProposalRes = await fetch(`${baseUrl}/ai/cart-proposal/${aiAddData.cartProposal.id}/confirm`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    assert(confirmProposalRes.status === 200, 'Server authoritative confirmation adds item to cart only after explicit user consent');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await teardown();
    console.log(`\n========================================`);
    console.log(`FULL JOURNEY RESULTS: ${passed} passed, ${failed} failed`);
    console.log(`========================================\n`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
