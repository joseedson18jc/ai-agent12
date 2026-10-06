import { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { BarChart3, Download, Printer, TrendingUp, Package, Users, DollarSign } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import reportService from "@/services/report.service";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

export default function Reports() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("vendas");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState<any>(null);
  const [financialData, setFinancialData] = useState<any>(null);
  const [stockData, setStockData] = useState<any>(null);
  const [customerData, setCustomerData] = useState<any>(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const filters = { startDate: dateFrom, endDate: dateTo };
      if (activeTab === "vendas") {
        const res = await reportService.getSalesReport(filters);
        setSalesData(res.data);
      } else if (activeTab === "financeiro") {
        const res = await reportService.getFinancialReport(filters);
        setFinancialData(res.data);
      } else if (activeTab === "estoque") {
        const res = await reportService.getStockReport();
        setStockData(res.data);
      } else if (activeTab === "clientes") {
        const res = await reportService.getCustomerReport(filters);
        setCustomerData(res.data);
      }
    } catch {
      toast({ title: "Erro", description: "Erro ao gerar relatório", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, [activeTab, dateFrom, dateTo]);

  const handlePrint = () => window.print();

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          </div>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" /> Imprimir
          </Button>
        </div>

        {/* Date filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <Label>Data Inicial</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div>
                <Label>Data Final</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <Button onClick={fetchReport} className="bg-blue-600 hover:bg-blue-700">Gerar Relatório</Button>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full max-w-lg">
            <TabsTrigger value="vendas" className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" /> Vendas
            </TabsTrigger>
            <TabsTrigger value="financeiro" className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" /> Financeiro
            </TabsTrigger>
            <TabsTrigger value="estoque" className="flex items-center gap-1">
              <Package className="h-4 w-4" /> Estoque
            </TabsTrigger>
            <TabsTrigger value="clientes" className="flex items-center gap-1">
              <Users className="h-4 w-4" /> Clientes
            </TabsTrigger>
          </TabsList>

          {/* VENDAS */}
          <TabsContent value="vendas">
            {loading ? (
              <div className="space-y-4"><Skeleton className="h-64 w-full" /><Skeleton className="h-48 w-full" /></div>
            ) : salesData ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-sm text-gray-500">Total Vendas</p>
                      <p className="text-2xl font-bold text-blue-600">{formatCurrency(salesData.totalSales || 0)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-sm text-gray-500">Qtd. Vendas</p>
                      <p className="text-2xl font-bold">{salesData.totalOrders || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-sm text-gray-500">Ticket Médio</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(salesData.averageTicket || 0)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-sm text-gray-500">Lucro Estimado</p>
                      <p className="text-2xl font-bold text-emerald-600">{formatCurrency(salesData.totalProfit || 0)}</p>
                    </CardContent>
                  </Card>
                </div>

                {salesData.salesByDay && salesData.salesByDay.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle>Vendas por Dia</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={salesData.salesByDay}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          <Line type="monotone" dataKey="total" stroke="#3B82F6" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {salesData.topProducts && salesData.topProducts.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle>Produtos Mais Vendidos</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={salesData.topProducts}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="quantity" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {salesData.salesByPayment && salesData.salesByPayment.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle>Vendas por Forma de Pagamento</CardTitle></CardHeader>
                    <CardContent className="flex justify-center">
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie data={salesData.salesByPayment} dataKey="total" nameKey="method" cx="50%" cy="50%" outerRadius={100} label>
                            {salesData.salesByPayment.map((_: any, i: number) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Selecione um período e clique em "Gerar Relatório"</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* FINANCEIRO */}
          <TabsContent value="financeiro">
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : financialData ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-sm text-gray-500">Receitas</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(financialData.totalRevenue || 0)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-sm text-gray-500">Despesas</p>
                      <p className="text-2xl font-bold text-red-600">{formatCurrency(financialData.totalExpenses || 0)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-sm text-gray-500">Lucro Líquido</p>
                      <p className="text-2xl font-bold text-blue-600">{formatCurrency((financialData.totalRevenue || 0) - (financialData.totalExpenses || 0))}</p>
                    </CardContent>
                  </Card>
                </div>

                {financialData.cashFlow && financialData.cashFlow.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle>Fluxo de Caixa</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={financialData.cashFlow}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="period" />
                          <YAxis />
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          <Legend />
                          <Bar dataKey="revenue" name="Receitas" fill="#10B981" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="expenses" name="Despesas" fill="#EF4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <p>Selecione um período para ver o relatório financeiro.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ESTOQUE */}
          <TabsContent value="estoque">
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : stockData ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-sm text-gray-500">Total de Produtos</p>
                      <p className="text-2xl font-bold">{stockData.totalProducts || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-sm text-gray-500">Valor do Estoque</p>
                      <p className="text-2xl font-bold text-blue-600">{formatCurrency(stockData.totalStockValue || 0)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-sm text-gray-500">Estoque Baixo</p>
                      <p className="text-2xl font-bold text-red-600">{stockData.lowStockCount || 0}</p>
                    </CardContent>
                  </Card>
                </div>

                {stockData.products && stockData.products.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle>Posição do Estoque</CardTitle></CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produto</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead className="text-right">Estoque</TableHead>
                            <TableHead className="text-right">Mínimo</TableHead>
                            <TableHead className="text-right">Valor Unit.</TableHead>
                            <TableHead className="text-right">Valor Total</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stockData.products.map((p: any) => (
                            <TableRow key={p.id} className={p.stock <= p.minStock ? "bg-red-50" : ""}>
                              <TableCell className="font-medium">{p.name}</TableCell>
                              <TableCell>{p.category}</TableCell>
                              <TableCell className="text-right">{p.stock}</TableCell>
                              <TableCell className="text-right">{p.minStock}</TableCell>
                              <TableCell className="text-right">{formatCurrency(p.sellingPrice)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(p.stock * p.sellingPrice)}</TableCell>
                              <TableCell>
                                {p.stock <= p.minStock ? (
                                  <Badge variant="destructive">Baixo</Badge>
                                ) : (
                                  <Badge className="bg-green-500">OK</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <p>Carregando dados do estoque...</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* CLIENTES */}
          <TabsContent value="clientes">
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : customerData ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-sm text-gray-500">Total de Clientes</p>
                      <p className="text-2xl font-bold">{customerData.totalCustomers || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-sm text-gray-500">Novos no Período</p>
                      <p className="text-2xl font-bold text-green-600">{customerData.newCustomers || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-sm text-gray-500">Com Pendências</p>
                      <p className="text-2xl font-bold text-red-600">{customerData.withDebts || 0}</p>
                    </CardContent>
                  </Card>
                </div>

                {customerData.topCustomers && customerData.topCustomers.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle>Clientes Mais Frequentes</CardTitle></CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Cliente</TableHead>
                            <TableHead className="text-right">Compras</TableHead>
                            <TableHead className="text-right">Total Gasto</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customerData.topCustomers.map((c: any) => (
                            <TableRow key={c.id}>
                              <TableCell className="font-medium">{c.name}</TableCell>
                              <TableCell className="text-right">{c.orderCount}</TableCell>
                              <TableCell className="text-right">{formatCurrency(c.totalSpent)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {customerData.birthdays && customerData.birthdays.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle>Aniversariantes do Mês</CardTitle></CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Data de Nascimento</TableHead>
                            <TableHead>Telefone</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customerData.birthdays.map((c: any) => (
                            <TableRow key={c.id}>
                              <TableCell className="font-medium">{c.name}</TableCell>
                              <TableCell>{formatDate(c.birthDate)}</TableCell>
                              <TableCell>{c.phone}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <p>Selecione um período para ver o relatório de clientes.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
