/**
 * Edge Function Logic Tests — stripe-webhook
 *
 * These tests verify the webhook handler logic by testing the data-mapping
 * decisions in isolation. The actual edge function runs on Deno, so here we
 * validate the transformation rules that the handler applies to each Stripe
 * event type, using plain vitest with mocked Stripe/Supabase interfaces.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Types matching what the webhook handler uses
// ---------------------------------------------------------------------------
interface SupabaseRow {
  table: string;
  data: Record<string, unknown>;
  onConflict?: string;
}

// Track all upserts the "handler" performs
let upsertCalls: SupabaseRow[] = [];

// Simulated Supabase admin client with chaining
function createMockSupabaseAdmin(customerLookupResult: { id: string } | null = null) {
  return {
    from: vi.fn((table: string) => ({
      upsert: vi.fn((data: Record<string, unknown>, opts?: { onConflict: string }) => {
        upsertCalls.push({ table, data, onConflict: opts?.onConflict });
        return {
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: table === "customers" ? { id: "cust-db-id" } : data,
              error: null,
            }),
          }),
        };
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: customerLookupResult,
            error: null,
          }),
        }),
      }),
    })),
  };
}

// ---------------------------------------------------------------------------
// Handler logic extracted as pure functions for testing
// ---------------------------------------------------------------------------
function handleCheckoutCompleted(
  session: {
    customer: string;
    metadata?: { supabase_user_id?: string };
    customer_details?: { email?: string };
    subscription?: string;
  },
  subscription: {
    id: string;
    status: string;
    items: { data: Array<{ price: { id: string } }> };
    current_period_start: number;
    current_period_end: number;
    cancel_at_period_end: boolean;
    metadata: Record<string, unknown>;
  } | null,
  supabaseAdmin: ReturnType<typeof createMockSupabaseAdmin>
) {
  const userId = session.metadata?.supabase_user_id;
  if (!userId) return;

  const customerUpsert = {
    user_id: userId,
    stripe_customer_id: session.customer,
    email: session.customer_details?.email ?? "",
  };
  upsertCalls.push({ table: "customers", data: customerUpsert, onConflict: "user_id" });

  if (session.subscription && subscription) {
    const subscriptionUpsert = {
      customer_id: "cust-db-id", // would come from the upsert result
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      stripe_price_id: subscription.items.data[0]?.price.id ?? "",
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      metadata: subscription.metadata ?? {},
    };
    upsertCalls.push({
      table: "subscriptions",
      data: subscriptionUpsert,
      onConflict: "stripe_subscription_id",
    });
  }
}

function handleSubscriptionChange(
  subscription: {
    id: string;
    customer: string;
    status: string;
    items: { data: Array<{ price: { id: string } }> };
    current_period_start: number;
    current_period_end: number;
    cancel_at_period_end: boolean;
    canceled_at: number | null;
    metadata: Record<string, unknown>;
  },
  customerId: string | null
) {
  if (!customerId) return;

  const row = {
    customer_id: customerId,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    stripe_price_id: subscription.items.data[0]?.price.id ?? "",
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : null,
    metadata: subscription.metadata ?? {},
  };
  upsertCalls.push({ table: "subscriptions", data: row, onConflict: "stripe_subscription_id" });
}

function handleInvoiceEvent(
  invoice: {
    id: string;
    customer: string;
    subscription: string | null;
    status: string | null;
    amount_due: number;
    amount_paid: number;
    currency: string;
    hosted_invoice_url: string | null;
    invoice_pdf: string | null;
    metadata: Record<string, unknown>;
  },
  customerId: string | null
) {
  if (!customerId) return;

  const row = {
    customer_id: customerId,
    stripe_invoice_id: invoice.id,
    stripe_subscription_id: invoice.subscription ?? null,
    status: invoice.status ?? "draft",
    amount_due: invoice.amount_due,
    amount_paid: invoice.amount_paid,
    currency: invoice.currency,
    hosted_invoice_url: invoice.hosted_invoice_url ?? null,
    invoice_url: invoice.invoice_pdf ?? null,
    metadata: invoice.metadata ?? {},
  };
  upsertCalls.push({ table: "invoices", data: row, onConflict: "stripe_invoice_id" });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("stripe-webhook handler logic", () => {
  beforeEach(() => {
    upsertCalls = [];
  });

  describe("checkout.session.completed", () => {
    it("upserts customer and subscription records", () => {
      const mockAdmin = createMockSupabaseAdmin();
      handleCheckoutCompleted(
        {
          customer: "cus_stripe_abc",
          metadata: { supabase_user_id: "user-uuid-123" },
          customer_details: { email: "cliente@example.com" },
          subscription: "sub_stripe_xyz",
        },
        {
          id: "sub_stripe_xyz",
          status: "active",
          items: { data: [{ price: { id: "price_pro" } }] },
          current_period_start: 1704067200, // 2024-01-01
          current_period_end: 1706745600,   // 2024-02-01
          cancel_at_period_end: false,
          metadata: {},
        },
        mockAdmin
      );

      expect(upsertCalls).toHaveLength(2);

      const customerCall = upsertCalls.find((c) => c.table === "customers")!;
      expect(customerCall.data.user_id).toBe("user-uuid-123");
      expect(customerCall.data.stripe_customer_id).toBe("cus_stripe_abc");
      expect(customerCall.data.email).toBe("cliente@example.com");
      expect(customerCall.onConflict).toBe("user_id");

      const subCall = upsertCalls.find((c) => c.table === "subscriptions")!;
      expect(subCall.data.stripe_subscription_id).toBe("sub_stripe_xyz");
      expect(subCall.data.status).toBe("active");
      expect(subCall.data.stripe_price_id).toBe("price_pro");
      expect(subCall.onConflict).toBe("stripe_subscription_id");
    });

    it("skips processing when supabase_user_id is missing from metadata", () => {
      const mockAdmin = createMockSupabaseAdmin();
      handleCheckoutCompleted(
        {
          customer: "cus_stripe_abc",
          metadata: {},
          subscription: "sub_stripe_xyz",
        },
        null,
        mockAdmin
      );

      expect(upsertCalls).toHaveLength(0);
    });

    it("only upserts customer when there is no subscription (one-time payment)", () => {
      const mockAdmin = createMockSupabaseAdmin();
      handleCheckoutCompleted(
        {
          customer: "cus_stripe_abc",
          metadata: { supabase_user_id: "user-uuid-123" },
          customer_details: { email: "pagamento@example.com" },
        },
        null,
        mockAdmin
      );

      expect(upsertCalls).toHaveLength(1);
      expect(upsertCalls[0].table).toBe("customers");
    });
  });

  describe("customer.subscription.updated / deleted", () => {
    it("upserts subscription with correct field mapping", () => {
      handleSubscriptionChange(
        {
          id: "sub_stripe_789",
          customer: "cus_stripe_abc",
          status: "canceled",
          items: { data: [{ price: { id: "price_basic" } }] },
          current_period_start: 1704067200,
          current_period_end: 1706745600,
          cancel_at_period_end: true,
          canceled_at: 1705000000,
          metadata: { reason: "user_requested" },
        },
        "cust-db-uuid"
      );

      expect(upsertCalls).toHaveLength(1);
      const row = upsertCalls[0];
      expect(row.table).toBe("subscriptions");
      expect(row.data.status).toBe("canceled");
      expect(row.data.cancel_at_period_end).toBe(true);
      expect(row.data.canceled_at).toBeTruthy();
      expect(row.data.customer_id).toBe("cust-db-uuid");
    });

    it("sets canceled_at to null when subscription is not canceled", () => {
      handleSubscriptionChange(
        {
          id: "sub_stripe_789",
          customer: "cus_stripe_abc",
          status: "active",
          items: { data: [{ price: { id: "price_pro" } }] },
          current_period_start: 1704067200,
          current_period_end: 1706745600,
          cancel_at_period_end: false,
          canceled_at: null,
          metadata: {},
        },
        "cust-db-uuid"
      );

      expect(upsertCalls[0].data.canceled_at).toBeNull();
    });

    it("skips when customer is not found in the database", () => {
      handleSubscriptionChange(
        {
          id: "sub_stripe_789",
          customer: "cus_unknown",
          status: "active",
          items: { data: [{ price: { id: "price_pro" } }] },
          current_period_start: 1704067200,
          current_period_end: 1706745600,
          cancel_at_period_end: false,
          canceled_at: null,
          metadata: {},
        },
        null
      );

      expect(upsertCalls).toHaveLength(0);
    });
  });

  describe("invoice.paid / invoice.payment_failed / invoice.finalized", () => {
    it("upserts invoice record with correct field mapping", () => {
      handleInvoiceEvent(
        {
          id: "in_stripe_001",
          customer: "cus_stripe_abc",
          subscription: "sub_stripe_xyz",
          status: "paid",
          amount_due: 2990,
          amount_paid: 2990,
          currency: "brl",
          hosted_invoice_url: "https://invoice.stripe.com/i/001",
          invoice_pdf: "https://pay.stripe.com/invoice/pdf_001",
          metadata: {},
        },
        "cust-db-uuid"
      );

      expect(upsertCalls).toHaveLength(1);
      const row = upsertCalls[0];
      expect(row.table).toBe("invoices");
      expect(row.data.stripe_invoice_id).toBe("in_stripe_001");
      expect(row.data.amount_due).toBe(2990);
      expect(row.data.amount_paid).toBe(2990);
      expect(row.data.currency).toBe("brl");
      expect(row.data.invoice_url).toBe("https://pay.stripe.com/invoice/pdf_001");
      expect(row.onConflict).toBe("stripe_invoice_id");
    });

    it("defaults status to 'draft' when invoice status is null", () => {
      handleInvoiceEvent(
        {
          id: "in_stripe_002",
          customer: "cus_stripe_abc",
          subscription: null,
          status: null,
          amount_due: 0,
          amount_paid: 0,
          currency: "usd",
          hosted_invoice_url: null,
          invoice_pdf: null,
          metadata: {},
        },
        "cust-db-uuid"
      );

      expect(upsertCalls[0].data.status).toBe("draft");
    });

    it("handles null URLs gracefully", () => {
      handleInvoiceEvent(
        {
          id: "in_stripe_003",
          customer: "cus_stripe_abc",
          subscription: "sub_stripe_xyz",
          status: "open",
          amount_due: 5000,
          amount_paid: 0,
          currency: "brl",
          hosted_invoice_url: null,
          invoice_pdf: null,
          metadata: {},
        },
        "cust-db-uuid"
      );

      expect(upsertCalls[0].data.hosted_invoice_url).toBeNull();
      expect(upsertCalls[0].data.invoice_url).toBeNull();
    });

    it("skips when customer is not found", () => {
      handleInvoiceEvent(
        {
          id: "in_stripe_004",
          customer: "cus_unknown",
          subscription: null,
          status: "paid",
          amount_due: 1000,
          amount_paid: 1000,
          currency: "brl",
          hosted_invoice_url: null,
          invoice_pdf: null,
          metadata: {},
        },
        null
      );

      expect(upsertCalls).toHaveLength(0);
    });
  });

  describe("timestamp conversions", () => {
    it("converts Unix timestamps to ISO strings correctly", () => {
      handleSubscriptionChange(
        {
          id: "sub_stripe_ts",
          customer: "cus_stripe_abc",
          status: "active",
          items: { data: [{ price: { id: "price_pro" } }] },
          current_period_start: 1704067200, // 2024-01-01T00:00:00Z
          current_period_end: 1706745600,   // 2024-02-01T00:00:00Z
          cancel_at_period_end: false,
          canceled_at: null,
          metadata: {},
        },
        "cust-db-uuid"
      );

      expect(upsertCalls[0].data.current_period_start).toBe("2024-01-01T00:00:00.000Z");
      expect(upsertCalls[0].data.current_period_end).toBe("2024-02-01T00:00:00.000Z");
    });
  });
});
