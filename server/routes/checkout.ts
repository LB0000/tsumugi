import { Router } from 'express';
import { randomUUID } from 'crypto';
import { squareClient, locationId } from '../lib/square';

export const checkoutRouter = Router();

interface CartItemPayload {
  name: string;
  quantity: number;
  price: number; // JPY integer
}

interface ShippingAddressPayload {
  lastName: string;
  firstName: string;
  email: string;
  phone: string;
  postalCode: string;
  prefecture: string;
  city: string;
  addressLine: string;
}

// POST /api/checkout/create-order
checkoutRouter.post('/create-order', async (req, res) => {
  try {
    const { items, shippingAddress } = req.body as {
      items: CartItemPayload[];
      shippingAddress: ShippingAddressPayload;
    };

    if (!items || items.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'EMPTY_CART', message: 'カートが空です' },
      });
      return;
    }

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shippingCost = subtotal >= 5000 ? 0 : 500;

    const lineItems = items.map((item) => ({
      name: item.name,
      quantity: String(item.quantity),
      basePriceMoney: {
        amount: BigInt(item.price),
        currency: 'JPY' as const,
      },
    }));

    // Add shipping as a line item if applicable
    if (shippingCost > 0) {
      lineItems.push({
        name: '送料',
        quantity: '1',
        basePriceMoney: {
          amount: BigInt(shippingCost),
          currency: 'JPY' as const,
        },
      });
    }

    const response = await squareClient.orders.create({
      order: {
        locationId,
        lineItems,
        ...(shippingAddress && {
          fulfillments: [
            {
              type: 'SHIPMENT',
              state: 'PROPOSED',
              shipmentDetails: {
                recipient: {
                  displayName: `${shippingAddress.lastName} ${shippingAddress.firstName}`,
                  emailAddress: shippingAddress.email,
                  phoneNumber: shippingAddress.phone,
                  address: {
                    postalCode: shippingAddress.postalCode,
                    administrativeDistrictLevel1: shippingAddress.prefecture,
                    locality: shippingAddress.city,
                    addressLine1: shippingAddress.addressLine,
                    country: 'JP',
                  },
                },
              },
            },
          ],
        }),
      },
      idempotencyKey: randomUUID(),
    });

    const order = response.order;
    if (!order) {
      throw new Error('Order creation failed: no order returned');
    }

    res.json({
      success: true,
      orderId: order.id,
      totalAmount: Number(order.totalMoney?.amount ?? 0),
    });
  } catch (error) {
    console.error('Create order error:', error);
    const message = error instanceof Error ? error.message : '注文の作成に失敗しました';
    res.status(500).json({
      success: false,
      error: { code: 'ORDER_CREATION_FAILED', message },
    });
  }
});

// POST /api/checkout/process-payment
checkoutRouter.post('/process-payment', async (req, res) => {
  try {
    const { sourceId, orderId, buyerEmail, totalAmount } = req.body as {
      sourceId: string;
      orderId: string;
      buyerEmail: string;
      totalAmount: number;
    };

    if (!sourceId || !orderId) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: '決済情報が不足しています' },
      });
      return;
    }

    const response = await squareClient.payments.create({
      sourceId,
      idempotencyKey: randomUUID(),
      amountMoney: {
        amount: BigInt(totalAmount),
        currency: 'JPY',
      },
      orderId,
      locationId,
      buyerEmailAddress: buyerEmail,
    });

    const payment = response.payment;
    if (!payment) {
      throw new Error('Payment creation failed: no payment returned');
    }

    res.json({
      success: true,
      paymentId: payment.id,
      orderId,
      status: payment.status,
      receiptUrl: payment.receiptUrl,
    });
  } catch (error) {
    console.error('Process payment error:', error);
    const message = error instanceof Error ? error.message : '決済処理に失敗しました';
    res.status(500).json({
      success: false,
      error: { code: 'PAYMENT_FAILED', message },
    });
  }
});

// POST /api/checkout/webhook (for future use)
checkoutRouter.post('/webhook', (req, res) => {
  // TODO: Validate webhook signature with SQUARE_WEBHOOK_SIGNATURE_KEY
  // TODO: Handle payment.completed events
  console.log('Square webhook received:', req.body?.type);
  res.json({ success: true });
});
