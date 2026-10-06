import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCheckout } from "./useCheckout";

const mockToast = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

const mockInvoke = vi.fn();
const mockGetSession = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

describe("useCheckout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Prevent jsdom from throwing on navigation
    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "" },
    });
  });

  it("calls supabase.functions.invoke with the correct priceId", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "tok_123" } },
    });
    mockInvoke.mockResolvedValue({ data: { url: "https://checkout.stripe.com/pay" }, error: null });

    const { result } = renderHook(() => useCheckout());

    await act(async () => {
      await result.current.checkout("price_pro");
    });

    expect(mockInvoke).toHaveBeenCalledWith("create-checkout-session", {
      body: { priceId: "price_pro" },
    });
  });

  it("shows an error toast when no auth session exists", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const { result } = renderHook(() => useCheckout());

    await act(async () => {
      await result.current.checkout("price_basic");
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Erro",
        description: "Faça login para continuar.",
        variant: "destructive",
      })
    );
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("shows an error toast when the function invoke fails", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "tok_123" } },
    });
    mockInvoke.mockResolvedValue({
      data: null,
      error: new Error("Edge function timeout"),
    });

    const { result } = renderHook(() => useCheckout());

    await act(async () => {
      await result.current.checkout("price_pro");
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Erro no checkout",
        variant: "destructive",
      })
    );
  });

  it("redirects to the checkout URL on success", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "tok_123" } },
    });
    mockInvoke.mockResolvedValue({
      data: { url: "https://checkout.stripe.com/c/pay_abc" },
      error: null,
    });

    const { result } = renderHook(() => useCheckout());

    await act(async () => {
      await result.current.checkout("price_enterprise");
    });

    expect(window.location.href).toBe("https://checkout.stripe.com/c/pay_abc");
  });

  it("sets loading to true during checkout and false after", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "tok_123" } },
    });
    mockInvoke.mockResolvedValue({ data: { url: "https://example.com" }, error: null });

    const { result } = renderHook(() => useCheckout());
    expect(result.current.loading).toBe(false);

    await act(async () => {
      await result.current.checkout("price_basic");
    });

    expect(result.current.loading).toBe(false);
  });
});
