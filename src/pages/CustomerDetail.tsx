import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import customerService from "@/services/customer.service";
import { formatCPF, formatPhone, formatCurrency } from "@/utils/formatters";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, Pencil, MessageCircle, Mail, MapPin, Phone,
  User, Calendar, ShoppingBag, FileText, CreditCard, Eye as EyeIcon,
  AlertTriangle,
} from "lucide-react";

export default function CustomerDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadCustomer();
  }, [id]);

  const loadCustomer = async () => {
    setLoading(true);
    try {
      const response = await customerService.getById(id!);
      setCustomer(response.data);
    } catch {
      setError("Não foi possível carregar os dados do cliente.");
    } finally {
      setLoading(false);
    }
  };

  const openWhatsApp = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    const number = cleaned.startsWith("55") ? cleaned : `55${cleaned}`;
    window.open(`https://wa.me/${number}`, "_blank");
  };

  const getInstallmentStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-700 border-green-200">Pago</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Pendente</Badge>;
      case "overdue":
        return <Badge variant="destructive">Atrasada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-48" />
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <Skeleton className="w-20 h-20 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Skeleton className="h-[400px] w-full" />
        </div>
      </MainLayout>
    );
  }

  if (error || !customer) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
          <p className="text-gray-600 mb-4">{error || "Cliente não encontrado."}</p>
          <Button onClick={() => navigate("/clientes")}>Voltar para Clientes</Button>
        </div>
      </MainLayout>
    );
  }

  const address = [customer.street, customer.number, customer.complement, customer.neighborhood, customer.city, customer.state]
    .filter(Boolean)
    .join(", ");

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/clientes")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Detalhes do Cliente</h1>
          </div>
          <Button onClick={() => navigate(`/customers/${id}/edit`)}>
            <Pencil className="w-4 h-4 mr-2" /> Editar
          </Button>
        </div>

        {/* Customer Info Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              {/* Photo */}
              <div className="flex-shrink-0">
                {customer.photo ? (
                  <img
                    src={customer.photo}
                    alt={customer.name}
                    className="w-24 h-24 rounded-full object-cover border-4 border-gray-100"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold border-4 border-gray-100">
                    {customer.name?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-gray-900">{customer.name}</h2>
                  <Badge variant={customer.status === "active" ? "default" : "secondary"}>
                    {customer.status === "active" ? "Ativo" : "Inativo"}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span>CPF: {formatCPF(customer.cpf)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{formatPhone(customer.phone)}</span>
                  </div>
                  {customer.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span>{customer.email}</span>
                    </div>
                  )}
                  {customer.birthDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{new Date(customer.birthDate).toLocaleDateString("pt-BR")}</span>
                    </div>
                  )}
                  {address && (
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span>{address}</span>
                    </div>
                  )}
                </div>

                {/* WhatsApp Button */}
                {customer.phone && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openWhatsApp(customer.phone)}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Enviar WhatsApp
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="purchases">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="purchases" className="gap-2">
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Compras</span>
            </TabsTrigger>
            <TabsTrigger value="prescriptions" className="gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Receitas</span>
            </TabsTrigger>
            <TabsTrigger value="financial" className="gap-2">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Financeiro</span>
            </TabsTrigger>
          </TabsList>

          {/* Purchases Tab */}
          <TabsContent value="purchases">
            <Card>
              <CardContent className="p-0">
                {!customer.salesOrders?.length ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <ShoppingBag className="w-10 h-10 mb-2" />
                    <p className="text-sm">Nenhuma compra registrada.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Itens</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customer.salesOrders.map((order: any) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-sm">#{order.orderNumber || order.id}</TableCell>
                          <TableCell>{new Date(order.date).toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell>{order.items?.length || 0} item(ns)</TableCell>
                          <TableCell className="font-semibold">{formatCurrency(order.total)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                order.status === "completed"
                                  ? "default"
                                  : order.status === "cancelled"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {order.status === "completed"
                                ? "Concluído"
                                : order.status === "pending"
                                ? "Pendente"
                                : order.status === "cancelled"
                                ? "Cancelado"
                                : order.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/sales/${order.id}`)}
                            >
                              <EyeIcon className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prescriptions Tab */}
          <TabsContent value="prescriptions">
            <Card>
              <CardContent className="p-0">
                {!customer.prescriptions?.length ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <FileText className="w-10 h-10 mb-2" />
                    <p className="text-sm">Nenhuma receita registrada.</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {customer.prescriptions.map((rx: any) => (
                      <div key={rx.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Dr(a). {rx.doctorName || "Não informado"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(rx.date).toLocaleDateString("pt-BR")}
                              {rx.crm && ` - CRM: ${rx.crm}`}
                            </p>
                          </div>
                          {rx.expiresAt && (
                            <Badge
                              variant={new Date(rx.expiresAt) < new Date() ? "destructive" : "secondary"}
                            >
                              {new Date(rx.expiresAt) < new Date() ? "Vencida" : "Válida"}
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div className="space-y-1">
                            <p className="font-semibold text-gray-700">Olho Direito (OD)</p>
                            <p className="text-gray-500">
                              Esf: {rx.rightEye?.spherical ?? "-"} | Cil: {rx.rightEye?.cylindrical ?? "-"} | Eixo: {rx.rightEye?.axis ?? "-"}
                            </p>
                            {rx.rightEye?.addition && (
                              <p className="text-gray-500">Adição: {rx.rightEye.addition}</p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="font-semibold text-gray-700">Olho Esquerdo (OE)</p>
                            <p className="text-gray-500">
                              Esf: {rx.leftEye?.spherical ?? "-"} | Cil: {rx.leftEye?.cylindrical ?? "-"} | Eixo: {rx.leftEye?.axis ?? "-"}
                            </p>
                            {rx.leftEye?.addition && (
                              <p className="text-gray-500">Adição: {rx.leftEye.addition}</p>
                            )}
                          </div>
                        </div>
                        {rx.notes && (
                          <p className="text-xs text-gray-400 mt-2">Obs: {rx.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial">
            <Card>
              <CardContent className="p-0">
                {!customer.installments?.length ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <CreditCard className="w-10 h-10 mb-2" />
                    <p className="text-sm">Nenhuma parcela registrada.</p>
                  </div>
                ) : (
                  <>
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 border-b">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Total Pendente</p>
                        <p className="text-lg font-bold text-yellow-600">
                          {formatCurrency(
                            customer.installments
                              .filter((i: any) => i.status === "pending")
                              .reduce((sum: number, i: any) => sum + (i.amount || 0), 0)
                          )}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Total Pago</p>
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(
                            customer.installments
                              .filter((i: any) => i.status === "paid")
                              .reduce((sum: number, i: any) => sum + (i.amount || 0), 0)
                          )}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Atrasadas</p>
                        <p className="text-lg font-bold text-red-600">
                          {formatCurrency(
                            customer.installments
                              .filter((i: any) => i.status === "overdue")
                              .reduce((sum: number, i: any) => sum + (i.amount || 0), 0)
                          )}
                        </p>
                      </div>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Parcela</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Pagamento</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customer.installments.map((inst: any, idx: number) => (
                          <TableRow
                            key={inst.id || idx}
                            className={inst.status === "overdue" ? "bg-red-50" : ""}
                          >
                            <TableCell className="font-mono text-sm">
                              {inst.number || idx + 1}/{customer.installments.length}
                            </TableCell>
                            <TableCell>
                              {new Date(inst.dueDate).toLocaleDateString("pt-BR")}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {formatCurrency(inst.amount)}
                            </TableCell>
                            <TableCell>{getInstallmentStatusBadge(inst.status)}</TableCell>
                            <TableCell className="text-sm text-gray-500">
                              {inst.paidAt
                                ? new Date(inst.paidAt).toLocaleDateString("pt-BR")
                                : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
