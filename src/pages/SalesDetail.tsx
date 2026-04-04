import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate, formatDateTime } from "@/utils/formatters";
import { ArrowLeft, Printer, MessageCircle, XCircle, Clock, Package, CreditCard, FileText } from "lucide-react";
import api from "@/services/api";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  AWAITING_LENS: { label: "Aguardando Lente", color: "bg-blue-500" },
  IN_PRODUCTION: { label: "Em Produção", color: "bg-yellow-500" },
  READY_FOR_PICKUP: { label: "Pronta p/ Retirada", color: "bg-green-500" },
  DELIVERED: { label: "Entregue", color: "bg-gray-500" },
  CANCELLED: { label: "Cancelada", color: "bg-red-500" },
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Dinheiro", PIX: "PIX", CREDIT_CARD: "Cartão de Crédito",
  DEBIT_CARD: "Cartão de Débito", STORE_CREDIT: "Fiado / Crediário",
  INSURANCE: "Convênio", EXCHANGE: "Troca / Cortesia",
};

const INSTALLMENT_STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  PENDING: { label: "Pendente", variant: "secondary" },
  PAID: { label: "Paga", variant: "default" },
  OVERDUE: { label: "Atrasada", variant: "destructive" },
  RENEGOTIATED: { label: "Renegociada", variant: "secondary" },
};

export default function SalesDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const res = await api.get<any>(`/sales/${id}`);
      if (res.success) setOrder(res.data);
    } catch {
      toast({ title: "Erro", description: "Erro ao carregar venda", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrder(); }, [id]);

  const updateStatus = async (status: string) => {
    try {
      await api.put(`/sales/${id}/status`, { status });
      toast({ title: "Sucesso", description: "Status atualizado" });
      fetchOrder();
    } catch {
      toast({ title: "Erro", description: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast({ title: "Erro", description: "Motivo do cancelamento é obrigatório", variant: "destructive" });
      return;
    }
    setCancelling(true);
    try {
      await api.put(`/sales/${id}/cancel`, { reason: cancelReason });
      toast({ title: "Sucesso", description: "Venda cancelada" });
      setCancelDialogOpen(false);
      fetchOrder();
    } catch {
      toast({ title: "Erro", description: "Erro ao cancelar venda", variant: "destructive" });
    } finally {
      setCancelling(false);
    }
  };

  const openWhatsApp = () => {
    if (!order?.customer?.phone) return;
    const phone = order.customer.phone.replace(/\D/g, "");
    const number = phone.startsWith("55") ? phone : `55${phone}`;
    const msg = `Olá ${order.customer.name}! Sua OS nº ${order.orderNumber} está ${STATUS_CONFIG[order.status]?.label || order.status}. Obrigado pela preferência!`;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!order) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Venda não encontrada.</p>
          <Button variant="outline" onClick={() => navigate("/vendas")} className="mt-4">Voltar</Button>
        </div>
      </MainLayout>
    );
  }

  const statusConfig = STATUS_CONFIG[order.status] || { label: order.status, color: "bg-gray-400" };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/vendas")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">OS #{order.orderNumber}</h1>
              <p className="text-sm text-gray-500">{formatDateTime(order.date)}</p>
            </div>
            <Badge className={`${statusConfig.color} text-white ml-2`}>{statusConfig.label}</Badge>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={openWhatsApp}>
              <MessageCircle className="h-4 w-4 mr-1 text-green-600" /> WhatsApp
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1" /> Imprimir
            </Button>
            {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
              <Button variant="destructive" size="sm" onClick={() => setCancelDialogOpen(true)}>
                <XCircle className="h-4 w-4 mr-1" /> Cancelar
              </Button>
            )}
          </div>
        </div>

        {/* Status update */}
        {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Label className="whitespace-nowrap">Atualizar Status:</Label>
                <Select value={order.status} onValueChange={updateStatus}>
                  <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AWAITING_LENS">Aguardando Lente</SelectItem>
                    <SelectItem value="IN_PRODUCTION">Em Produção</SelectItem>
                    <SelectItem value="READY_FOR_PICKUP">Pronta para Retirada</SelectItem>
                    <SelectItem value="DELIVERED">Entregue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Info */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Cliente</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="text-gray-500">Nome:</span> <span className="font-medium">{order.customer?.name}</span></p>
              <p><span className="text-gray-500">Telefone:</span> {order.customer?.phone || "-"}</p>
              <p><span className="text-gray-500">CPF:</span> {order.customer?.cpf || "-"}</p>
              <p><span className="text-gray-500">Vendedor:</span> {order.seller?.name || "-"}</p>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Resumo</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal:</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Desconto:</span>
                  <span className="text-red-600">-{formatCurrency(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span className="text-green-600">{formatCurrency(order.total)}</span>
              </div>
              {isAdmin && order.estimatedProfit > 0 && (
                <div className="flex justify-between text-emerald-600 text-xs">
                  <span>Lucro estimado:</span>
                  <span>{formatCurrency(order.estimatedProfit)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Items */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Itens</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto / Serviço</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Preço Unit.</TableHead>
                  <TableHead className="text-right">Desconto</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items?.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.product?.name || item.description || "-"}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="text-right">{item.discountAmount > 0 ? formatCurrency(item.discountAmount) : "-"}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.subtotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Payments */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Pagamentos</CardTitle></CardHeader>
          <CardContent>
            {order.payments?.map((payment: any) => (
              <div key={payment.id} className="border rounded-lg p-3 mb-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">{PAYMENT_LABELS[payment.method] || payment.method}</span>
                    {payment.cardBrand && <span className="text-sm text-gray-500 ml-2">({payment.cardBrand} {payment.cardInstallments}x)</span>}
                  </div>
                  <span className="font-bold">{formatCurrency(payment.amount)}</span>
                </div>

                {/* Installments */}
                {payment.installments && payment.installments.length > 0 && (
                  <div className="mt-3 border-t pt-3">
                    <p className="text-sm font-medium mb-2">Parcelas:</p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nº</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Pago em</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payment.installments.map((inst: any) => {
                          const statusCfg = INSTALLMENT_STATUS[inst.status] || { label: inst.status, variant: "secondary" as const };
                          return (
                            <TableRow key={inst.id}>
                              <TableCell>{inst.number}</TableCell>
                              <TableCell>{formatDate(inst.dueDate)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(inst.amount)}</TableCell>
                              <TableCell>
                                <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                              </TableCell>
                              <TableCell>{inst.paidDate ? formatDate(inst.paidDate) : "-"}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Cancel reason if cancelled */}
        {order.status === "CANCELLED" && order.cancelReason && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-sm text-red-600 font-medium">Motivo do cancelamento:</p>
              <p className="text-sm text-red-800 mt-1">{order.cancelReason}</p>
            </CardContent>
          </Card>
        )}

        {order.notes && (
          <Card>
            <CardHeader><CardTitle>Observações</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">{order.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Venda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Tem certeza que deseja cancelar esta venda? O estoque será restaurado automaticamente.
            </p>
            <div>
              <Label>Motivo do cancelamento *</Label>
              <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Informe o motivo do cancelamento..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Voltar</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling || !cancelReason.trim()}>
              {cancelling ? "Cancelando..." : "Confirmar Cancelamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
