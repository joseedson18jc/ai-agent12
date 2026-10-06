import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CheckoutButton } from "./CheckoutButton";

const mockCheckout = vi.fn();
let mockLoading = false;

vi.mock("@/hooks/useCheckout", () => ({
  useCheckout: () => ({
    checkout: mockCheckout,
    loading: mockLoading,
  }),
}));

describe("CheckoutButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoading = false;
  });

  it("renders with the default Portuguese label", () => {
    render(<CheckoutButton priceId="price_pro" />);
    expect(screen.getByRole("button", { name: "Assinar agora" })).toBeInTheDocument();
  });

  it("renders with a custom label", () => {
    render(<CheckoutButton priceId="price_pro" label="Upgrade para Pro" />);
    expect(screen.getByRole("button", { name: "Upgrade para Pro" })).toBeInTheDocument();
  });

  it("shows spinner text when loading", () => {
    mockLoading = true;
    render(<CheckoutButton priceId="price_pro" />);

    expect(screen.getByText("Processando...")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("calls checkout with the correct priceId on click", async () => {
    const user = userEvent.setup();
    render(<CheckoutButton priceId="price_enterprise" />);

    await user.click(screen.getByRole("button"));
    expect(mockCheckout).toHaveBeenCalledWith("price_enterprise");
  });

  it("does not call checkout when the button is disabled (loading)", async () => {
    mockLoading = true;
    const user = userEvent.setup();
    render(<CheckoutButton priceId="price_basic" />);

    await user.click(screen.getByRole("button"));
    expect(mockCheckout).not.toHaveBeenCalled();
  });
});
