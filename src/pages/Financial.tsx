import { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { DollarSign, Plus, Check, AlertTriangle, Wallet, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import financialService from "@/services/financial.service";

const BILL_STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  PENDING: { label: "Pendente", variant: "secondary" },
  PAID: { label: "Paga", variant: "default" },
  OVERDUE: { label: "Atrasada", variant: "destructive" },
  CANCELLED: { label: "Cancelada", variant: "secondary" },
};

const INSTALLMENT_STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  PENDING: { label: "Pendente", variant: "secondary" },
  PAID: { label: "Paga", variant: "default" },
  OVERDUE: { label: "Atrasada", variant: "destructive" },
  RENEGOTIATED: { label: "Renegociada", variant: "secondary" },
};

export default function Financial() {
  const { toast } = useToast();

  // Bills
  const [bills, setBills] = useState<any[]>([]);
  const [billsLoading, setBillsLoading] = useState(true);
  const [billFilter, setBillFilter] = useState("all");
  const [billDialogOpen, setBillDialogOpen] = useState(false);
  const [billForm, setBillForm] = useState({
    description: "", categoryId: "", amount: "", dueDate: "",
    isRecurring: false, frequency: "MONTHLY", notes: "",
  });

  // Receivables (installments)
  const [receivables, setReceivables] = useState<any[]>([]);
  const [receivablesLoading, setReceivablesLoading] = useState(true);
  const [receivableFilter, setReceivableFilter] = useState("all");

  // Cash register
  const [cashRegister, setCashRegister] = useState<any>(null);
  const [cashLoading, setCashLoading] = useState(true);
  const [openBalanceInput, setOpenBalanceInput] = useState("");
  const [closeBalanceInput, setCloseBalanceInput] = useState("");
  const [cashMovements, setCashMovements] = useState<any[]>([]);

  // Open/close dialogs
  const [openCashDialog, setOpenCashDialog] = useState(false);
  const [closeCashDialog, setCloseCashDialog] = useState(false);

  const fetchBills = async () => {
    setBillsLoading(true);
    try {
      let res;
      if (billFilter === "overdue") res = await financialService.getOverdueBills();
      else if (billFilter === "upcoming") res = await financialService.getUpcomingBills();
      else res = await financialService.getAllBills();
      if (res.success) setBills(res.data || []);
    } catch {
      toast({ title: "Erro", description: "Erro ao carregar contas", variant: "destructive" });
    } finally { setBillsLoading(false); }
  };

  const fetchReceivables = async () => {
    setReceivablesLoading(true);
    try {
      const params: any = {};
      if (receivableFilter !== "all") params.status = receivableFilter;
      const res = await financialService.getReceivables(params);
      if (res.success) setReceivables(res.data || []);
    } catch {
      toast({ title: "Erro", description: "Erro ao carregar parcelas", variant: "destructive" });
    } finally { setReceivablesLoading(false); }
  };

  const fetchCash = async () => {
    setCashLoading(true);
    try {
      const res = await financialService.getCurrentCash();
      if (res.success) {
        setCashRegister(res.data);
        if (res.data?.movements) setCashMovements(res.data.movements);
      }
    } catch { /* no register open */ }
    finally { setCashLoading(false); }
  };

  useEffect(() => { fetchBills(); }, [billFilter]);
  useEffect(() => { fetchReceivables(); }, [receivableFilter]);
  useEffect(() => { fetchCash(); }, []);

  const handlePayBill = async (billId: string) => {
    try {
      await financialService.payBill(billId, { paidDate: new Date().toISOString(), paymentMethod: "PIX" });
      toast({ title: "Sucesso", description: "Conta marcada como paga" });
      fetchBills();
    } catch {
      toast({ title: "Erro", description: "Erro ao pagar conta", variant: "destructive" });
    }
  };

  const handlePayInstallment = async (installmentId: string) => {
    try {
      await financialService.payInstallment(installmentId, {
        paidDate: new Date().toISOString(), paymentMethod: "PIX", paidAmount: 0,
      });
      toast({ title: "Sucesso", description: "Parcela registrada como paga" });
      fetchReceivables();
    } catch {
      toast({ title: "Erro", description: "Erro ao registrar pagamento", variant: "destructive" });
    }
  };

  const handleCreateBill = async () => {
    if (!billForm.description || !billForm.amount || !billForm.dueDate) {
      toast({ title: "Erro", description: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    try {
      await financialService.createBill({
        description: billForm.description,
        categoryId: billForm.categoryId || undefined,
        amount: parseFloat(billForm.amount),
        dueDate: billForm.dueDate,
        isRecurring: billForm.isRecurring,
        frequency: billForm.isRecurring ? billForm.frequency : undefined,
        notes: billForm.notes || undefined,
      });
      toast({ title: "Sucesso", description: "Conta cadastrada" });
      setBillDialogOpen(false);
      setBillForm({ description: "", categoryId: "", amount: "", dueDate: "", isRecurring: false, frequency: "MONTHLY", notes: "" });
      fetchBills();
    } catch {
      toast({ title: "Erro", description: "Erro ao criar conta", variant: "destructive" });
    }
  };

  const handleOpenCash = async () => {
    const balance = parseFloat(openBalanceInput);
    if (isNaN(balance)) {
      toast({ title: "Erro", description: "Informe o valor de abertura", variant: "destructive" });
      return;
    }
    try {
      await financialService.openCashRegister({ openingBalance: balance });
      toast({ title: "Sucesso", description: "Caixa aberto" });
      setOpenCashDialog(false);
      setOpenBalanceInput("");
      fetchCash();
    } catch {
      toast({ title: "Erro", description: "Erro ao abrir caixa", variant: "destructive" });
    }
  };

  const handleCloseCash = async () => {
    const reported = parseFloat(closeBalanceInput);
    if (isNaN(reported)) {
      toast({ title: "Erro", description: "Informe o valor em caixa", variant: "destructive" });
      return;
    }
    try {
      await financialService.closeCashRegister({ reportedBalance: reported });
      toast({ title: "Sucesso", description: "Caixa fechado" });
      setCloseCashDialog(false);
      setCloseBalanceInput("");
      fetchCash();
    } catch {
      toast({ title: "Erro", description: "Erro ao fechar caixa", variant: "destructive" });
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <DollarSign className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
        </div>

        <Tabs defaultValue="pagar">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="pagar" className="flex items-center gap-1">
              <ArrowUpCircle className="h-4 w-4" /> Contas a Pagar
            </TabsTrigger>
            <TabsTrigger value="receber" className="flex items-center gap-1">
              <ArrowDownCircle className="h-4 w-4" /> Contas a Receber
            </TabsTrigger>
            <TabsTrigger value="caixa" className="flex items-center gap-1">
              <Wallet className="h-4 w-4" /> Caixa
            </TabsTrigger>
          </TabsList>

          {/* CONTAS A PAGAR */}
          <TabsContent value="pagar">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <CardTitle>Contas a Pagar</CardTitle>
                  <div className="flex gap-2">
                    <Select value={billFilter} onValueChange={setBillFilter}>
                      <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="upcoming">Próximas (7 dias)</SelectItem>
                        <SelectItem value="overdue">Atrasadas</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={() => setBillDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="h-4 w-4 mr-1" /> Nova Conta
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {billsLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : bills.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <DollarSign className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                    <p>Nenhuma conta encontrada.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bills.map((bill) => {
                        const st = BILL_STATUS_CONFIG[bill.status] || { label: bill.status, variant: "secondary" as const };
                        return (
                          <TableRow key={bill.id} className={bill.status === "OVERDUE" ? "bg-red-50" : ""}>
                            <TableCell className="font-medium">{bill.description}</TableCell>
                            <TableCell>{formatDate(bill.dueDate)}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(bill.amount)}</TableCell>
                            <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                            <TableCell className="text-right">
                              {bill.status !== "PAID" && bill.status !== "CANCELLED" && (
                                <Button size="sm" variant="outline" onClick={() => handlePayBill(bill.id)}>
                                  <Check className="h-3 w-3 mr-1" /> Pagar
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CONTAS A RECEBER */}
          <TabsContent value="receber">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <CardTitle>Contas a Receber (Parcelas)</CardTitle>
                  <Select value={receivableFilter} onValueChange={setReceivableFilter}>
                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="PENDING">Pendentes</SelectItem>
                      <SelectItem value="OVERDUE">Atrasadas</SelectItem>
                      <SelectItem value="PAID">Pagas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {receivablesLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : receivables.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <ArrowDownCircle className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                    <p>Nenhuma parcela encontrada.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Parcela</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receivables.map((inst) => {
                        const st = INSTALLMENT_STATUS_CONFIG[inst.status] || { label: inst.status, variant: "secondary" as const };
                        return (
                          <TableRow key={inst.id} className={inst.status === "OVERDUE" ? "bg-red-50" : ""}>
                            <TableCell className="font-medium">{inst.customerName || "-"}</TableCell>
                            <TableCell>{inst.number}ª</TableCell>
                            <TableCell>{formatDate(inst.dueDate)}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(inst.amount)}</TableCell>
                            <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                            <TableCell className="text-right">
                              {(inst.status === "PENDING" || inst.status === "OVERDUE") && (
                                <Button size="sm" variant="outline" onClick={() => handlePayInstallment(inst.id)}>
                                  <Check className="h-3 w-3 mr-1" /> Receber
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CAIXA */}
          <TabsContent value="caixa">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Caixa do Dia</CardTitle>
                  {!cashRegister || cashRegister.isClosed ? (
                    <Button onClick={() => setOpenCashDialog(true)} className="bg-green-600 hover:bg-green-700">
                      <Wallet className="h-4 w-4 mr-1" /> Abrir Caixa
                    </Button>
                  ) : (
                    <Button onClick={() => setCloseCashDialog(true)} variant="destructive">
                      <Wallet className="h-4 w-4 mr-1" /> Fechar Caixa
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {cashLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : !cashRegister || cashRegister.isClosed ? (
                  <div className="text-center py-8 text-gray-500">
                    <Wallet className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                    <p>Caixa não está aberto. Clique em "Abrir Caixa" para começar.</p>
                    {cashRegister?.isClosed && (
                      <div className="mt-4 bg-gray-50 rounded-lg p-4 max-w-sm mx-auto text-sm">
                        <p>Último fechamento: {formatDate(cashRegister.date)}</p>
                        <p>Saldo final: {formatCurrency(cashRegister.closingBalance || 0)}</p>
                        {cashRegister.difference !== null && cashRegister.difference !== 0 && (
                          <p className={cashRegister.difference > 0 ? "text-green-600" : "text-red-600"}>
                            Diferença: {formatCurrency(cashRegister.difference)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4 text-center">
                        <p className="text-sm text-blue-600">Abertura</p>
                        <p className="text-xl font-bold text-blue-800">{formatCurrency(cashRegister.openingBalance)}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4 text-center">
                        <p className="text-sm text-green-600">Entradas</p>
                        <p className="text-xl font-bold text-green-800">
                          {formatCurrency(cashMovements.filter((m: any) => m.type === "INFLOW").reduce((s: number, m: any) => s + m.amount, 0))}
                        </p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-4 text-center">
                        <p className="text-sm text-red-600">Saídas</p>
                        <p className="text-xl font-bold text-red-800">
                          {formatCurrency(cashMovements.filter((m: any) => ["OUTFLOW", "WITHDRAWAL"].includes(m.type)).reduce((s: number, m: any) => s + m.amount, 0))}
                        </p>
                      </div>
                    </div>

                    {cashMovements.length > 0 && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead>Hora</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cashMovements.map((mov: any) => (
                            <TableRow key={mov.id}>
                              <TableCell>
                                <Badge variant={["INFLOW", "SUPPLEMENT"].includes(mov.type) ? "default" : "destructive"}>
                                  {mov.type === "INFLOW" ? "Entrada" : mov.type === "OUTFLOW" ? "Saída" :
                                    mov.type === "WITHDRAWAL" ? "Sangria" : mov.type === "SUPPLEMENT" ? "Suprimento" : mov.type}
                                </Badge>
                              </TableCell>
                              <TableCell>{mov.description || "-"}</TableCell>
                              <TableCell className="text-right font-medium">
                                <span className={["INFLOW", "SUPPLEMENT"].includes(mov.type) ? "text-green-600" : "text-red-600"}>
                                  {formatCurrency(mov.amount)}
                                </span>
                              </TableCell>
                              <TableCell>{new Date(mov.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* New Bill Dialog */}
      <Dialog open={billDialogOpen} onOpenChange={setBillDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Conta a Pagar</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Descrição *</Label>
              <Input value={billForm.description} onChange={(e) => setBillForm((p) => ({ ...p, description: e.target.value }))} placeholder="Ex: Aluguel, Fornecedor X" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor (R$) *</Label>
                <Input type="number" step="0.01" value={billForm.amount} onChange={(e) => setBillForm((p) => ({ ...p, amount: e.target.value }))} />
              </div>
              <div>
                <Label>Vencimento *</Label>
                <Input type="date" value={billForm.dueDate} onChange={(e) => setBillForm((p) => ({ ...p, dueDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={billForm.notes} onChange={(e) => setBillForm((p) => ({ ...p, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBillDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateBill} className="bg-blue-600 hover:bg-blue-700">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Open Cash Dialog */}
      <Dialog open={openCashDialog} onOpenChange={setOpenCashDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Abrir Caixa</DialogTitle></DialogHeader>
          <div className="py-4">
            <Label>Valor de Abertura (R$)</Label>
            <Input type="number" step="0.01" value={openBalanceInput} onChange={(e) => setOpenBalanceInput(e.target.value)}
              placeholder="0.00" />
            <p className="text-xs text-gray-500 mt-1">Informe o valor em dinheiro que está no caixa.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCashDialog(false)}>Cancelar</Button>
            <Button onClick={handleOpenCash} className="bg-green-600 hover:bg-green-700">Abrir Caixa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Cash Dialog */}
      <Dialog open={closeCashDialog} onOpenChange={setCloseCashDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Fechar Caixa</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label>Valor Contado no Caixa (R$)</Label>
              <Input type="number" step="0.01" value={closeBalanceInput} onChange={(e) => setCloseBalanceInput(e.target.value)}
                placeholder="0.00" />
            </div>
            {cashRegister && (
              <div className="bg-gray-50 rounded p-3 text-sm">
                <p>Saldo esperado pelo sistema: <strong>{formatCurrency(cashRegister.openingBalance + cashMovements.filter((m: any) => ["INFLOW", "SUPPLEMENT"].includes(m.type)).reduce((s: number, m: any) => s + m.amount, 0) - cashMovements.filter((m: any) => ["OUTFLOW", "WITHDRAWAL"].includes(m.type)).reduce((s: number, m: any) => s + m.amount, 0))}</strong></p>
                {closeBalanceInput && (
                  <p className="mt-1">
                    Diferença: <strong className={parseFloat(closeBalanceInput) - (cashRegister.openingBalance + cashMovements.filter((m: any) => ["INFLOW", "SUPPLEMENT"].includes(m.type)).reduce((s: number, m: any) => s + m.amount, 0) - cashMovements.filter((m: any) => ["OUTFLOW", "WITHDRAWAL"].includes(m.type)).reduce((s: number, m: any) => s + m.amount, 0)) >= 0 ? "text-green-600" : "text-red-600"}>
                      {formatCurrency(parseFloat(closeBalanceInput) - (cashRegister.openingBalance + cashMovements.filter((m: any) => ["INFLOW", "SUPPLEMENT"].includes(m.type)).reduce((s: number, m: any) => s + m.amount, 0) - cashMovements.filter((m: any) => ["OUTFLOW", "WITHDRAWAL"].includes(m.type)).reduce((s: number, m: any) => s + m.amount, 0)))}
                    </strong>
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseCashDialog(false)}>Cancelar</Button>
            <Button onClick={handleCloseCash} variant="destructive">Fechar Caixa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
