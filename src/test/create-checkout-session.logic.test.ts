/**
 * Edge Function Logic Tests — create-checkout-session
 *
 * Tests the validation and customer lookup/creation logic used by the
 * create-checkout-session edge function. Since the actual function runs
 * on Deno, we test the core decision logic in isolation.
 */
import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Extracted logic from the edge function
// ---------------------------------------------------------------------------
const ALLOWED_PRICE_IDS = new Set([
  "price_basic",
  "price_pro",
  "price_enterprise",
]);

function validatePriceId(priceId: unknown): { valid: boolean; error?: string } {
  if (!priceId) {
    return { valid: false, error: "priceId é obrigatório" };
  }
  if (typeof priceId !== "string") {
    return { valid: false, error: "priceId é obrigatório" };
  }
  if (!ALLOWED_PRICE_IDS.has(priceId)) {
    return { valid: false, error: "Plano inválido" };
  }
  return { valid: true };
}

function shouldCreateNewCustomer(
  existingCustomer: { stripe_customer_id: string } | null
): boolean {
  return !existingCustomer?.stripe_customer_id;
}

function buildCheckoutSessionParams(
  stripeCustomerId: string,
  priceId: string,
  userId: string,
  origin: string
) {
  return {
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: `${origin}/billing?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pricing`,
    metadata: { supabase_user_id: userId },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("create-checkout-session logic", () => {
  describe("priceId validation", () => {
    it("accepts price_basic", () => {
      expect(validatePriceId("price_basic")).toEqual({ valid: true });
    });

    it("accepts price_pro", () => {
      expect(validatePriceId("price_pro")).toEqual({ valid: true });
    });

    it("accepts price_enterprise", () => {
      expect(validatePriceId("price_enterprise")).toEqual({ valid: true });
    });

    it("rejects an empty string", () => {
      const result = validatePriceId("");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("priceId é obrigatório");
    });

    it("rejects null/undefined", () => {
      expect(validatePriceId(null).valid).toBe(false);
      expect(validatePriceId(undefined).valid).toBe(false);
    });

    it("rejects an unknown price id", () => {
      const result = validatePriceId("price_premium_gold");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Plano inválido");
    });

    it("rejects a numeric priceId", () => {
      const result = validatePriceId(12345);
      expect(result.valid).toBe(false);
    });
  });

  describe("customer lookup / creation decision", () => {
    it("requires creation when no existing customer record is found", () => {
      expect(shouldCreateNewCustomer(null)).toBe(true);
    });

    it("requires creation when stripe_customer_id is empty", () => {
      expect(shouldCreateNewCustomer({ stripe_customer_id: "" })).toBe(true);
    });

    it("skips creation when a valid stripe_customer_id exists", () => {
      expect(shouldCreateNewCustomer({ stripe_customer_id: "cus_abc123" })).toBe(false);
    });
  });

  describe("checkout session params", () => {
    it("builds correct params for subscription mode", () => {
      const params = buildCheckoutSessionParams(
        "cus_test_123",
        "price_pro",
        "user-uuid-456",
        "https://myapp.com"
      );

      expect(params.customer).toBe("cus_test_123");
      expect(params.mode).toBe("subscription");
      expect(params.line_items).toEqual([{ price: "price_pro", quantity: 1 }]);
      expect(params.success_url).toBe(
        "https://myapp.com/billing?session_id={CHECKOUT_SESSION_ID}"
      );
      expect(params.cancel_url).toBe("https://myapp.com/pricing");
      expect(params.metadata.supabase_user_id).toBe("user-uuid-456");
    });

    it("handles empty origin gracefully", () => {
      const params = buildCheckoutSessionParams(
        "cus_test_123",
        "price_basic",
        "user-uuid-789",
        ""
      );

      expect(params.success_url).toBe("/billing?session_id={CHECKOUT_SESSION_ID}");
      expect(params.cancel_url).toBe("/pricing");
    });
  });
});
