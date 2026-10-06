import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BillingPortal } from "./BillingPortal";
import type { Subscription } from "@/hooks/useSubscription";

let mockSubscriptionData: Subscription | null | undefined = undefined;
let mockIsLoading = false;

vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({
    data: mockSubscriptionData,
    isLoading: mockIsLoading,
  }),
}));

const mockToast = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

const mockInvoke = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

describe("BillingPortal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscriptionData = undefined;
    mockIsLoading = false;
    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "" },
    });
  });

  it("shows a loading spinner when subscription data is being fetched", () => {
    mockIsLoading = true;
    const { container } = render(<BillingPortal />);

    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("shows the no-subscription state when subscription is null", () => {
    mockSubscriptionData = null;
    render(<BillingPortal />);

    expect(
      screen.getByText("Você ainda não possui uma assinatura ativa.")
    ).toBeInTheDocument();
    expect(screen.getByText("Ver planos disponíveis")).toBeInTheDocument();
  });

  it("displays subscription info when an active subscription exists", () => {
    mockSubscriptionData = {
      id: "sub-uuid-1",
      customer_id: "cust-uuid-1",
      stripe_subscription_id: "sub_stripe_123",
      stripe_price_id: "price_pro",
      status: "active",
      current_period_start: "2024-01-01T00:00:00Z",
      current_period_end: "2024-02-01T00:00:00Z",
      cancel_at_period_end: false,
      canceled_at: null,
      metadata: {},
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    render(<BillingPortal />);

    expect(screen.getByText("Ativa")).toBeInTheDocument();
    expect(screen.getByText("Gerenciar assinatura")).toBeInTheDocument();
    expect(screen.getByText("Assinatura")).toBeInTheDocument();
  });

  it("shows cancellation warning when cancel_at_period_end is true", () => {
    mockSubscriptionData = {
      id: "sub-uuid-1",
      customer_id: "cust-uuid-1",
      stripe_subscription_id: "sub_stripe_123",
      stripe_price_id: "price_pro",
      status: "active",
      current_period_start: "2024-01-01T00:00:00Z",
      current_period_end: "2024-02-01T00:00:00Z",
      cancel_at_period_end: true,
      canceled_at: null,
      metadata: {},
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    render(<BillingPortal />);

    expect(
      screen.getByText("Sua assinatura será cancelada ao final do período atual.")
    ).toBeInTheDocument();
  });

  it("displays the correct status label for trialing subscriptions", () => {
    mockSubscriptionData = {
      id: "sub-uuid-2",
      customer_id: "cust-uuid-1",
      stripe_subscription_id: "sub_stripe_456",
      stripe_price_id: "price_basic",
      status: "trialing",
      current_period_start: "2024-06-01T00:00:00Z",
      current_period_end: "2024-06-15T00:00:00Z",
      cancel_at_period_end: false,
      canceled_at: null,
      metadata: {},
      created_at: "2024-06-01T00:00:00Z",
      updated_at: "2024-06-01T00:00:00Z",
    };

    render(<BillingPortal />);

    expect(screen.getByText("Período de teste")).toBeInTheDocument();
  });

  it("calls customer-portal function and redirects when manage button is clicked", async () => {
    mockSubscriptionData = {
      id: "sub-uuid-1",
      customer_id: "cust-uuid-1",
      stripe_subscription_id: "sub_stripe_123",
      stripe_price_id: "price_pro",
      status: "active",
      current_period_start: "2024-01-01T00:00:00Z",
      current_period_end: "2024-02-01T00:00:00Z",
      cancel_at_period_end: false,
      canceled_at: null,
      metadata: {},
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    mockInvoke.mockResolvedValue({
      data: { url: "https://billing.stripe.com/p/session_abc" },
      error: null,
    });

    const user = userEvent.setup();
    render(<BillingPortal />);

    await user.click(screen.getByText("Gerenciar assinatura"));

    expect(mockInvoke).toHaveBeenCalledWith("customer-portal", { body: {} });
    expect(window.location.href).toBe("https://billing.stripe.com/p/session_abc");
  });

  it("shows error toast when portal function fails", async () => {
    mockSubscriptionData = {
      id: "sub-uuid-1",
      customer_id: "cust-uuid-1",
      stripe_subscription_id: "sub_stripe_123",
      stripe_price_id: "price_pro",
      status: "active",
      current_period_start: "2024-01-01T00:00:00Z",
      current_period_end: "2024-02-01T00:00:00Z",
      cancel_at_period_end: false,
      canceled_at: null,
      metadata: {},
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };

    mockInvoke.mockResolvedValue({
      data: null,
      error: new Error("Portal unavailable"),
    });

    const user = userEvent.setup();
    render(<BillingPortal />);

    await user.click(screen.getByText("Gerenciar assinatura"));

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Erro",
        variant: "destructive",
      })
    );
  });
});
