import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { InvoiceHistory } from "./InvoiceHistory";
import type { Invoice } from "@/hooks/useInvoices";

let mockInvoicesData: Invoice[] | undefined = undefined;
let mockIsLoading = false;

vi.mock("@/hooks/useInvoices", () => ({
  useInvoices: () => ({
    data: mockInvoicesData,
    isLoading: mockIsLoading,
  }),
}));

describe("InvoiceHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoicesData = undefined;
    mockIsLoading = false;
  });

  it("shows a loading spinner when data is being fetched", () => {
    mockIsLoading = true;
    const { container } = render(<InvoiceHistory />);

    // Loader2 renders an SVG with animate-spin class
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("shows empty state message when there are no invoices", () => {
    mockInvoicesData = [];
    render(<InvoiceHistory />);

    expect(screen.getByText("Nenhuma fatura encontrada.")).toBeInTheDocument();
  });

  it("renders the invoice table with correct data", () => {
    mockInvoicesData = [
      {
        id: "inv-1",
        customer_id: "cust-1",
        stripe_invoice_id: "in_001",
        stripe_subscription_id: "sub_001",
        amount_due: 4990,
        amount_paid: 4990,
        currency: "brl",
        status: "paid",
        invoice_url: "https://stripe.com/invoice/pdf",
        hosted_invoice_url: "https://stripe.com/invoice/hosted",
        metadata: {},
        created_at: "2024-03-15T14:30:00Z",
        updated_at: "2024-03-15T14:30:00Z",
      },
      {
        id: "inv-2",
        customer_id: "cust-1",
        stripe_invoice_id: "in_002",
        stripe_subscription_id: "sub_001",
        amount_due: 4990,
        amount_paid: 0,
        currency: "brl",
        status: "open",
        invoice_url: null,
        hosted_invoice_url: null,
        metadata: {},
        created_at: "2024-04-15T14:30:00Z",
        updated_at: "2024-04-15T14:30:00Z",
      },
    ];

    render(<InvoiceHistory />);

    // Check that the table header is rendered
    expect(screen.getByText("Histórico de Faturas")).toBeInTheDocument();

    // Check status badges with Portuguese labels
    expect(screen.getByText("Paga")).toBeInTheDocument();
    expect(screen.getByText("Aberta")).toBeInTheDocument();

    // Check that currency formatting works (R$ for BRL)
    // amount_due 4990 cents = R$ 49,90
    const formattedAmounts = screen.getAllByText(/R\$/);
    expect(formattedAmounts.length).toBeGreaterThanOrEqual(2);
  });

  it("renders external link buttons for invoices with URLs", () => {
    mockInvoicesData = [
      {
        id: "inv-1",
        customer_id: "cust-1",
        stripe_invoice_id: "in_001",
        stripe_subscription_id: null,
        amount_due: 1000,
        amount_paid: 1000,
        currency: "brl",
        status: "paid",
        invoice_url: "https://stripe.com/invoice/pdf_link",
        hosted_invoice_url: "https://stripe.com/invoice/hosted_link",
        metadata: {},
        created_at: "2024-05-01T00:00:00Z",
        updated_at: "2024-05-01T00:00:00Z",
      },
    ];

    render(<InvoiceHistory />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "https://stripe.com/invoice/hosted_link");
    expect(links[1]).toHaveAttribute("href", "https://stripe.com/invoice/pdf_link");
  });

  it("does not render link buttons when invoice URLs are null", () => {
    mockInvoicesData = [
      {
        id: "inv-1",
        customer_id: "cust-1",
        stripe_invoice_id: "in_001",
        stripe_subscription_id: null,
        amount_due: 500,
        amount_paid: 0,
        currency: "brl",
        status: "draft",
        invoice_url: null,
        hosted_invoice_url: null,
        metadata: {},
        created_at: "2024-06-01T00:00:00Z",
        updated_at: "2024-06-01T00:00:00Z",
      },
    ];

    render(<InvoiceHistory />);

    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});
