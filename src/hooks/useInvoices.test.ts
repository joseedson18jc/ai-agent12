import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useInvoices, type Invoice } from "./useInvoices";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const mockInvoices: Invoice[] = [
  {
    id: "inv-uuid-1",
    customer_id: "cust-uuid-1",
    stripe_invoice_id: "in_stripe_001",
    stripe_subscription_id: "sub_stripe_123",
    amount_due: 2990,
    amount_paid: 2990,
    currency: "brl",
    status: "paid",
    invoice_url: "https://pay.stripe.com/invoice/pdf_001",
    hosted_invoice_url: "https://invoice.stripe.com/i/inv_001",
    metadata: {},
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-15T10:00:00Z",
  },
  {
    id: "inv-uuid-2",
    customer_id: "cust-uuid-1",
    stripe_invoice_id: "in_stripe_002",
    stripe_subscription_id: "sub_stripe_123",
    amount_due: 2990,
    amount_paid: 0,
    currency: "brl",
    status: "open",
    invoice_url: null,
    hosted_invoice_url: "https://invoice.stripe.com/i/inv_002",
    metadata: {},
    created_at: "2024-02-15T10:00:00Z",
    updated_at: "2024-02-15T10:00:00Z",
  },
];

describe("useInvoices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty array when there is no authenticated user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { result } = renderHook(() => useInvoices(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns a list of invoices for an authenticated user", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
    });

    const chainMock = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockInvoices, error: null }),
    };
    mockFrom.mockReturnValue(chainMock);

    const { result } = renderHook(() => useInvoices(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data![0].stripe_invoice_id).toBe("in_stripe_001");
    expect(result.current.data![1].status).toBe("open");
  });

  it("orders invoices by created_at descending", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
    });

    const chainMock = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockFrom.mockReturnValue(chainMock);

    const { result } = renderHook(() => useInvoices(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(chainMock.order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("throws when the database query fails", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
    });

    const chainMock = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: new Error("Connection refused") }),
    };
    mockFrom.mockReturnValue(chainMock);

    const { result } = renderHook(() => useInvoices(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });
});
