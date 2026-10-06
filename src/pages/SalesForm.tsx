import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/utils/formatters";
import { ShoppingCart, Search, Plus, Trash2, ArrowLeft, ArrowRight, Check, AlertTriangle } from "lucide-react";
import type { Customer, Product, Prescription } from "@/types";
import api from "@/services/api";

interface CartItem {
  productId?: string;
  name: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  subtotal: number;
  costPrice: number;
  minimumPrice: number;
  isManual: boolean;
}

interface PaymentEntry {
  method: string;
  amount: number;
  cardBrand?: string;
  cardInstallments?: number;
  storeInstallments?: number;
  downPayment?: number;
  interestRate?: number;
  justification?: string;
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Dinheiro", PIX: "PIX", CREDIT_CARD: "Cartão de Crédito",
  DEBIT_CARD: "Cartão de Débito", STORE_CREDIT: "Fiado / Crediário",
  INSURANCE: "Convênio", EXCHANGE: "Troca / Cortesia",
};

export default function SalesForm() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Customer
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchingCustomers, setSearchingCustomers] = useState(false);

  // Step 2: Prescription
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [selectedPrescription, setSelectedPrescription] = useState<string | null>(null);

  // Step 3: Items
  const [productSearch, setProductSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [manualDesc, setManualDesc] = useState("");
  const [manualPrice, setManualPrice] = useState("");

  // Step 4: Payment
  const [payments, setPayments] = useState<PaymentEntry[]>([{ method: "CASH", amount: 0 }]);
  const [notes, setNotes] = useState("");

  // Search customers
  const searchCustomers = async () => {
    if (!customerSearch.trim()) return;
    setSearchingCustomers(true);
    try {
      const res = await api.get<any>(`/customers?search=${encodeURIComponent(customerSearch)}&limit=10`);
      if (res.success) setCustomers(res.data || []);
    } catch { /* ignore */ }
    finally { setSearchingCustomers(false); }
  };

  useEffect(() => {
    const timer = setTimeout(() => { if (customerSearch.length >= 2) searchCustomers(); }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  // Load prescriptions when customer selected
  useEffect(() => {
    if (selectedCustomer) {
      api.get<any>(`/prescriptions/customer/${selectedCustomer.id}`).then((res) => {
        if (res.success) setPrescriptions(res.data || []);
      });
    }
  }, [selectedCustomer]);

  // Search products
  const searchProducts = async () => {
    if (!productSearch.trim()) return;
    try {
      const res = await api.get<any>(`/products?search=${encodeURIComponent(productSearch)}&limit=10`);
      if (res.success) setProducts(res.data || []);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    const timer = setTimeout(() => { if (productSearch.length >= 2) searchProducts(); }, 300);
    return () => clearTimeout(timer);
  }, [productSearch]);

  const addProduct = (p: Product) => {
    const existing = cart.find((c) => c.productId === p.id);
    if (existing) {
      toast({ title: "Aviso", description: "Produto já adicionado. Altere a quantidade." });
      return;
    }
    setCart([...cart, {
      productId: p.id, name: p.name, unitPrice: p.sellingPrice,
      quantity: 1, discount: 0, subtotal: p.sellingPrice,
      costPrice: p.totalCost, minimumPrice: p.minimumPrice, isManual: false,
    }]);
    setProductSearch("");
    setProducts([]);
  };

  const addManualItem = () => {
    if (!manualDesc.trim() || !manualPrice) return;
    const price = parseFloat(manualPrice);
    setCart([...cart, {
      name: manualDesc, unitPrice: price, quantity: 1, discount: 0,
      subtotal: price, costPrice: 0, minimumPrice: 0, isManual: true,
    }]);
    setManualDesc("");
    setManualPrice("");
  };

  const updateCartItem = (index: number, field: string, value: number) => {
    setCart(cart.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, [field]: value };
      updated.subtotal = (updated.unitPrice * updated.quantity) - updated.discount;
      return updated;
    }));
  };

  const removeCartItem = (index: number) => setCart(cart.filter((_, i) => i !== index));

  const cartTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const cartProfit = cart.reduce((sum, item) => sum + (item.subtotal - (item.costPrice * item.quantity)), 0);
  const paymentTotal = payments.reduce((sum, p) => sum + p.amount, 0);

  const updatePayment = (index: number, field: string, value: any) => {
    setPayments(payments.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const addPaymentMethod = () => {
    setPayments([...payments, { method: "CASH", amount: Math.max(0, cartTotal - paymentTotal) }]);
  };

  const removePayment = (index: number) => {
    if (payments.length <= 1) return;
    setPayments(payments.filter((_, i) => i !== index));
  };

  const canProceed = () => {
    if (step === 1) return !!selectedCustomer;
    if (step === 2) return true;
    if (step === 3) return cart.length > 0;
    if (step === 4) return Math.abs(paymentTotal - cartTotal) < 0.01;
    return false;
  };

  const handleSubmit = async () => {
    if (!selectedCustomer || cart.length === 0) return;
    setSubmitting(true);
    try {
      const payload = {
        customerId: selectedCustomer.id,
        prescriptionId: selectedPrescription || undefined,
        sellerId: user?.id,
        items: cart.map((item) => ({
          productId: item.productId || undefined,
          description: item.isManual ? item.name : undefined,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          discountAmount: item.discount,
          subtotal: item.subtotal,
          costPrice: item.costPrice,
        })),
        payments: payments.map((p) => ({
          method: p.method,
          amount: p.amount,
          cardBrand: p.cardBrand,
          cardInstallments: p.cardInstallments,
          interestRate: p.interestRate,
          justification: p.justification,
          installmentCount: p.storeInstallments,
          downPayment: p.downPayment,
        })),
        notes,
        subtotal: cartTotal,
        discountAmount: 0,
        total: cartTotal,
        estimatedProfit: cartProfit,
      };
      const res = await api.post<any>("/sales", payload);
      if (res.success) {
        toast({ title: "Sucesso", description: "Venda registrada com sucesso!" });
        navigate(`/vendas/${res.data?.id || ""}`);
      } else {
        toast({ title: "Erro", description: res.error || "Erro ao registrar venda", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro", description: "Erro ao registrar venda", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/vendas")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <ShoppingCart className="h-8 w-8 text-green-600" />
          <h1 className="text-2xl font-bold text-gray-900">Nova Venda</h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                s < step ? "bg-green-500 text-white" : s === step ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
              }`}>
                {s < step ? <Check className="h-4 w-4" /> : s}
              </div>
              <span className={`text-sm hidden sm:inline ${s === step ? "font-semibold" : "text-gray-500"}`}>
                {s === 1 ? "Cliente" : s === 2 ? "Receita" : s === 3 ? "Produtos" : "Pagamento"}
              </span>
              {s < 4 && <div className="w-8 h-0.5 bg-gray-200" />}
            </div>
          ))}
        </div>

        {/* Step 1: Customer */}
        {step === 1 && (
          <Card>
            <CardHeader><CardTitle>Selecionar Cliente</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar cliente por nome, CPF ou telefone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              {searchingCustomers && <Skeleton className="h-20 w-full" />}
              {customers.length > 0 && !selectedCustomer && (
                <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                  {customers.map((c) => (
                    <div key={c.id} className="p-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center"
                      onClick={() => { setSelectedCustomer(c); setCustomers([]); }}>
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-sm text-gray-500">{c.phone} {c.cpf ? `• CPF: ${c.cpf}` : ""}</p>
                      </div>
                      <Plus className="h-4 w-4 text-blue-600" />
                    </div>
                  ))}
                </div>
              )}
              {selectedCustomer && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-blue-800">{selectedCustomer.name}</p>
                    <p className="text-sm text-blue-600">{selectedCustomer.phone} {selectedCustomer.cpf ? `• ${selectedCustomer.cpf}` : ""}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedCustomer(null); setCustomerSearch(""); }}>
                    Trocar
                  </Button>
                </div>
              )}
              <Button variant="outline" onClick={() => navigate("/clientes/novo")}>
                <Plus className="h-4 w-4 mr-2" /> Cadastrar Novo Cliente
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Prescription */}
        {step === 2 && (
          <Card>
            <CardHeader><CardTitle>Receita Óptica (Opcional)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {prescriptions.length === 0 ? (
                <p className="text-gray-500">Nenhuma receita cadastrada para este cliente. Você pode pular esta etapa.</p>
              ) : (
                <div className="space-y-2">
                  {prescriptions.map((p) => (
                    <div key={p.id}
                      className={`border rounded-lg p-3 cursor-pointer ${selectedPrescription === p.id ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"}`}
                      onClick={() => setSelectedPrescription(selectedPrescription === p.id ? null : p.id)}>
                      <div className="flex justify-between">
                        <span className="font-medium">Dr(a). {p.doctor || "Não informado"}</span>
                        <Badge variant={p.isExpired ? "destructive" : "secondary"}>
                          {p.isExpired ? "Vencida" : "Válida"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">
                        Data: {new Date(p.date).toLocaleDateString("pt-BR")} •
                        OD: {p.odSpherical || "-"} / OE: {p.oeSphrical || "-"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Products */}
        {step === 3 && (
          <Card>
            <CardHeader><CardTitle>Adicionar Produtos e Serviços</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Product search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar produto por nome, marca ou código..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              {products.length > 0 && (
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {products.map((p) => (
                    <div key={p.id} className="p-3 hover:bg-green-50 cursor-pointer flex justify-between items-center"
                      onClick={() => addProduct(p)}>
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-sm text-gray-500">{p.brand || ""} • Estoque: {p.stock} • {formatCurrency(p.sellingPrice)}</p>
                      </div>
                      <Plus className="h-4 w-4 text-green-600" />
                    </div>
                  ))}
                </div>
              )}

              {/* Manual service */}
              <div className="flex gap-2 items-end border-t pt-4">
                <div className="flex-1">
                  <Label>Serviço Manual</Label>
                  <Input placeholder="Descrição (ajuste, conserto...)" value={manualDesc} onChange={(e) => setManualDesc(e.target.value)} />
                </div>
                <div className="w-32">
                  <Label>Valor (R$)</Label>
                  <Input type="number" step="0.01" value={manualPrice} onChange={(e) => setManualPrice(e.target.value)} />
                </div>
                <Button variant="outline" onClick={addManualItem} disabled={!manualDesc || !manualPrice}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Cart */}
              {cart.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="w-20">Qtd</TableHead>
                        <TableHead className="w-28">Preço Unit.</TableHead>
                        <TableHead className="w-28">Desconto</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cart.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <span className="font-medium">{item.name}</span>
                            {!item.isManual && item.unitPrice < item.minimumPrice && (
                              <div className="flex items-center gap-1 text-red-500 text-xs mt-1">
                                <AlertTriangle className="h-3 w-3" /> Abaixo do preço mínimo ({formatCurrency(item.minimumPrice)})
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Input type="number" min="1" value={item.quantity}
                              onChange={(e) => updateCartItem(i, "quantity", parseInt(e.target.value) || 1)}
                              className="w-16 h-8" />
                          </TableCell>
                          <TableCell>
                            <Input type="number" step="0.01" value={item.unitPrice}
                              onChange={(e) => updateCartItem(i, "unitPrice", parseFloat(e.target.value) || 0)}
                              className="w-24 h-8" />
                          </TableCell>
                          <TableCell>
                            <Input type="number" step="0.01" value={item.discount}
                              onChange={(e) => updateCartItem(i, "discount", parseFloat(e.target.value) || 0)}
                              className="w-24 h-8" />
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(item.subtotal)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => removeCartItem(i)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="bg-gray-50 p-4 flex justify-between items-center">
                    <span className="font-semibold text-lg">Total:</span>
                    <span className="font-bold text-xl text-green-600">{formatCurrency(cartTotal)}</span>
                  </div>
                  {isAdmin && (
                    <div className="bg-emerald-50 px-4 py-2 flex justify-between text-sm">
                      <span className="text-emerald-700">Lucro estimado:</span>
                      <span className="font-semibold text-emerald-700">{formatCurrency(cartProfit)}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 4: Payment */}
        {step === 4 && (
          <Card>
            <CardHeader><CardTitle>Forma de Pagamento</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                <span className="text-sm text-blue-600">Valor total da venda:</span>
                <span className="text-xl font-bold text-blue-800 ml-2">{formatCurrency(cartTotal)}</span>
              </div>

              {payments.map((payment, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="font-semibold">Pagamento {i + 1}</Label>
                    {payments.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removePayment(i)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Forma</Label>
                      <Select value={payment.method} onValueChange={(v) => updatePayment(i, "method", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(PAYMENT_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Valor (R$)</Label>
                      <Input type="number" step="0.01" value={payment.amount || ""}
                        onChange={(e) => updatePayment(i, "amount", parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>

                  {payment.method === "CREDIT_CARD" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Bandeira</Label>
                        <Select value={payment.cardBrand || ""} onValueChange={(v) => updatePayment(i, "cardBrand", v)}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Visa">Visa</SelectItem>
                            <SelectItem value="Mastercard">Mastercard</SelectItem>
                            <SelectItem value="Elo">Elo</SelectItem>
                            <SelectItem value="Amex">American Express</SelectItem>
                            <SelectItem value="Hipercard">Hipercard</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Parcelas</Label>
                        <Select value={String(payment.cardInstallments || 1)} onValueChange={(v) => updatePayment(i, "cardInstallments", parseInt(v))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                              <SelectItem key={n} value={String(n)}>{n}x {n === 1 ? "(à vista)" : ""}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {payment.method === "STORE_CREDIT" && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t pt-3">
                      <div>
                        <Label>Entrada (R$)</Label>
                        <Input type="number" step="0.01" value={payment.downPayment || ""}
                          onChange={(e) => updatePayment(i, "downPayment", parseFloat(e.target.value) || 0)} />
                      </div>
                      <div>
                        <Label>Nº Parcelas</Label>
                        <Select value={String(payment.storeInstallments || 1)} onValueChange={(v) => updatePayment(i, "storeInstallments", parseInt(v))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                              <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Juros (% a.m.)</Label>
                        <Input type="number" step="0.1" value={payment.interestRate || ""}
                          onChange={(e) => updatePayment(i, "interestRate", parseFloat(e.target.value) || 0)}
                          placeholder="0" />
                      </div>
                      {payment.storeInstallments && payment.storeInstallments > 0 && (
                        <div className="md:col-span-3 bg-gray-50 rounded p-3 text-sm">
                          <p>Valor financiado: {formatCurrency(payment.amount - (payment.downPayment || 0))}</p>
                          <p>Parcelas de: {formatCurrency((payment.amount - (payment.downPayment || 0)) / payment.storeInstallments)}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {payment.method === "EXCHANGE" && (
                    <div>
                      <Label>Justificativa *</Label>
                      <Textarea value={payment.justification || ""}
                        onChange={(e) => updatePayment(i, "justification", e.target.value)}
                        placeholder="Motivo da troca ou cortesia..." />
                    </div>
                  )}
                </div>
              ))}

              <Button variant="outline" onClick={addPaymentMethod}>
                <Plus className="h-4 w-4 mr-2" /> Adicionar Forma de Pagamento
              </Button>

              <div className={`rounded-lg p-3 text-center ${Math.abs(paymentTotal - cartTotal) < 0.01 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"} border`}>
                <span className="text-sm">Total pago: </span>
                <span className="font-bold">{formatCurrency(paymentTotal)}</span>
                {Math.abs(paymentTotal - cartTotal) >= 0.01 && (
                  <p className="text-red-600 text-sm mt-1">
                    Diferença: {formatCurrency(cartTotal - paymentTotal)} — O valor pago deve ser igual ao total da venda.
                  </p>
                )}
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas sobre a venda..." />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => step > 1 ? setStep(step - 1) : navigate("/vendas")}
            disabled={submitting}>
            <ArrowLeft className="h-4 w-4 mr-2" /> {step === 1 ? "Cancelar" : "Voltar"}
          </Button>
          {step < 4 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}
              className="bg-blue-600 hover:bg-blue-700">
              Próximo <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canProceed() || submitting}
              className="bg-green-600 hover:bg-green-700">
              <Check className="h-4 w-4 mr-2" /> {submitting ? "Registrando..." : "Confirmar Venda"}
            </Button>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
