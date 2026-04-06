import { useState, useEffect, useMemo } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/utils/formatters";
import {
  BarChart3, Printer, TrendingUp, Package, Users, DollarSign,
  Sparkles, ArrowUpRight, ArrowDownRight, AlertTriangle, ShoppingBag,
  Wallet, PieChart as PieChartIcon, Target, Award, Star,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart,
  RadialBarChart, RadialBar,
} from "recharts";
import reportService from "@/services/report.service";

const COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316"];
const GRADIENT_CARDS = [
  "from-blue-600 to-indigo-700",
  "from-emerald-500 to-teal-600",
  "from-violet-500 to-purple-600",
  "from-amber-500 to-orange-600",
];

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Dinheiro", PIX: "PIX", CREDIT_CARD: "Cartão Crédito",
  DEBIT_CARD: "Cartão Débito", STORE_CREDIT: "Crediário",
  INSURANCE: "Convênio", EXCHANGE: "Troca",
};

// AI insight generator for reports
function generateReportInsights(salesData: any, financialData: any, stockData: any): { text: string; type: "success" | "warning" | "tip" }[] {
  const insights: { text: string; type: "success" | "warning" | "tip" }[] = [];

  if (salesData) {
    const s = salesData.summary;
    if (s.totalOrders > 0) {
      if (s.averageTicket > 500) {
        insights.push({ text: `Ticket médio de ${formatCurrency(s.averageTicket)} está excelente! Foque em manter esse padrão.`, type: "success" });
      } else if (s.averageTicket > 0) {
        insights.push({ text: `Ticket médio de ${formatCurrency(s.averageTicket)}. Sugestão: ofereça lentes premium e tratamentos adicionais para aumentar.`, type: "tip" });
      }
      const margin = s.totalRevenue > 0 ? (s.totalProfit / s.totalRevenue * 100) : 0;
      if (margin > 30) {
        insights.push({ text: `Margem de ${margin.toFixed(1)}% está saudável. Continue assim!`, type: "success" });
      } else if (margin > 0) {
        insights.push({ text: `Margem de ${margin.toFixed(1)}% pode melhorar. Revise custos e negocie com fornecedores.`, type: "warning" });
      }
    }
  }

  if (stockData) {
    const ss = stockData.summary;
    if (ss.lowStockCount > 3) {
      insights.push({ text: `${ss.lowStockCount} produtos com estoque baixo. Faça pedidos antes que faltem!`, type: "warning" });
    }
    if (ss.outOfStockCount > 0) {
      insights.push({ text: `${ss.outOfStockCount} produtos zerados no estoque. Reabasteça urgente para não perder vendas!`, type: "warning" });
    }
  }

  if (financialData) {
    const dre = financialData.dre;
    if (dre.resultado_liquido > 0) {
      insights.push({ text: `Resultado líquido positivo de ${formatCurrency(dre.resultado_liquido)}. Operação saudável!`, type: "success" });
    } else if (dre.resultado_liquido < 0) {
      insights.push({ text: `Resultado líquido negativo de ${formatCurrency(Math.abs(dre.resultado_liquido))}. Corte despesas e aumente vendas!`, type: "warning" });
    }
    if (financialData.payables?.pending > 0) {
      insights.push({ text: `${formatCurrency(financialData.payables.pending)} em contas pendentes. Organize o fluxo de caixa.`, type: "tip" });
    }
  }

  if (insights.length === 0) {
    insights.push({ text: "Gere relatórios com dados do período para receber dicas personalizadas de IA.", type: "tip" });
  }

  return insights.slice(0, 5);
}

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

  useEffect(() => { fetchReport(); }, [activeTab]);

  const aiInsights = useMemo(() => generateReportInsights(salesData, financialData, stockData), [salesData, financialData, stockData]);

  const handlePrint = () => window.print();

  // Transform sales payment data for chart
  const paymentChartData = useMemo(() => {
    if (!salesData?.byPaymentMethod) return [];
    return Object.entries(salesData.byPaymentMethod).map(([method, val]: [string, any]) => ({
      method: PAYMENT_LABELS[method] || method,
      total: val.total,
      count: val.count,
    }));
  }, [salesData]);

  // Transform stock by category data for chart
  const stockCategoryData = useMemo(() => {
    if (!stockData?.byCategory) return [];
    return stockData.byCategory.map((c: any) => ({
      name: c.name,
      items: c.totalStock,
      value: c.totalValue,
    }));
  }, [stockData]);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
              <p className="text-sm text-gray-500">Análises detalhadas do seu negócio</p>
            </div>
          </div>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" /> Imprimir
          </Button>
        </div>

        {/* AI Insights Bar */}
        {aiInsights.length > 0 && (
          <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-indigo-600" />
                <h3 className="font-semibold text-indigo-800">Insights de IA</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {aiInsights.map((insight, i) => (
                  <div key={i} className={`flex items-start gap-2 p-2.5 rounded-lg text-sm ${
                    insight.type === "success" ? "bg-green-50 text-green-800 border border-green-200" :
                    insight.type === "warning" ? "bg-amber-50 text-amber-800 border border-amber-200" :
                    "bg-blue-50 text-blue-800 border border-blue-200"
                  }`}>
                    {insight.type === "success" ? <Star className="h-4 w-4 mt-0.5 shrink-0" /> :
                     insight.type === "warning" ? <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> :
                     <Target className="h-4 w-4 mt-0.5 shrink-0" />}
                    <span>{insight.text}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
              <Button onClick={fetchReport} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
                Gerar Relatório
              </Button>
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

          {/* ═══ VENDAS ═══ */}
          <TabsContent value="vendas">
            {loading ? (
              <div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>
            ) : salesData ? (
              <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Faturamento", value: formatCurrency(salesData.summary?.totalRevenue || 0), icon: DollarSign, gradient: GRADIENT_CARDS[0] },
                    { label: "Vendas", value: String(salesData.summary?.totalOrders || 0), icon: ShoppingBag, gradient: GRADIENT_CARDS[1] },
                    { label: "Ticket Médio", value: formatCurrency(salesData.summary?.averageTicket || 0), icon: Target, gradient: GRADIENT_CARDS[2] },
                    { label: "Lucro Estimado", value: formatCurrency(salesData.summary?.totalProfit || 0), icon: TrendingUp, gradient: GRADIENT_CARDS[3] },
                  ].map((kpi, i) => (
                    <Card key={i} className={`bg-gradient-to-br ${kpi.gradient} text-white border-0 shadow-lg`}>
                      <CardContent className="pt-5 pb-4">
                        <div className="flex items-center justify-between mb-2">
                          <kpi.icon className="h-5 w-5 opacity-80" />
                          <ArrowUpRight className="h-4 w-4 opacity-60" />
                        </div>
                        <p className="text-2xl font-bold">{kpi.value}</p>
                        <p className="text-sm opacity-80">{kpi.label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Sales by Seller */}
                {salesData.bySeller && salesData.bySeller.length > 0 && (
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-indigo-500" /> Vendas por Vendedor</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={salesData.bySeller} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                          <YAxis type="category" dataKey="name" width={120} />
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          <Bar dataKey="total" fill="#6366F1" radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Payment Methods Pie */}
                {paymentChartData.length > 0 && (
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><PieChartIcon className="h-5 w-5 text-indigo-500" /> Vendas por Forma de Pagamento</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={320}>
                        <PieChart>
                          <Pie data={paymentChartData} dataKey="total" nameKey="method" cx="50%" cy="50%" outerRadius={110} innerRadius={60} paddingAngle={3} label={({ method, percent }) => `${method} ${(percent * 100).toFixed(0)}%`}>
                            {paymentChartData.map((_: any, i: number) => (
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

                {/* Recent Orders Table */}
                {salesData.orders && salesData.orders.length > 0 && (
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle>Últimas Vendas do Período</CardTitle>
                      <CardDescription>{salesData.orders.length} vendas encontradas</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>OS</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Vendedor</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Lucro</TableHead>
                            <TableHead>Data</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {salesData.orders.slice(0, 15).map((o: any) => (
                            <TableRow key={o.id}>
                              <TableCell className="font-mono text-sm">{o.orderNumber}</TableCell>
                              <TableCell className="font-medium">{o.customer?.name || "—"}</TableCell>
                              <TableCell>{o.seller?.name || "—"}</TableCell>
                              <TableCell className="text-right font-semibold">{formatCurrency(o.total)}</TableCell>
                              <TableCell className="text-right text-green-600">{formatCurrency(o.estimatedProfit)}</TableCell>
                              <TableCell>{formatDate(o.date)}</TableCell>
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
                <CardContent className="py-16 text-center text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Selecione um período e clique em "Gerar Relatório"</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ═══ FINANCEIRO ═══ */}
          <TabsContent value="financeiro">
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : financialData ? (
              <div className="space-y-6">
                {/* DRE Summary */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Receita Bruta", value: formatCurrency(financialData.dre?.receita_bruta || 0), gradient: GRADIENT_CARDS[0], icon: ArrowUpRight },
                    { label: "Lucro Bruto", value: formatCurrency(financialData.dre?.lucro_bruto || 0), gradient: GRADIENT_CARDS[1], icon: TrendingUp },
                    { label: "Despesas", value: formatCurrency(financialData.dre?.despesas_operacionais || 0), gradient: "from-red-500 to-rose-600", icon: ArrowDownRight },
                    { label: "Resultado Líquido", value: formatCurrency(financialData.dre?.resultado_liquido || 0), gradient: (financialData.dre?.resultado_liquido || 0) >= 0 ? GRADIENT_CARDS[1] : "from-red-500 to-rose-600", icon: Wallet },
                  ].map((kpi, i) => (
                    <Card key={i} className={`bg-gradient-to-br ${kpi.gradient} text-white border-0 shadow-lg`}>
                      <CardContent className="pt-5 pb-4">
                        <kpi.icon className="h-5 w-5 opacity-80 mb-2" />
                        <p className="text-xl font-bold">{kpi.value}</p>
                        <p className="text-sm opacity-80">{kpi.label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* DRE Table */}
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-indigo-500" /> DRE — Demonstrativo de Resultados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableBody>
                        {[
                          { label: "Receita Bruta", value: financialData.dre?.receita_bruta, bold: true },
                          { label: "(-) Descontos Concedidos", value: -(financialData.dre?.descontos || 0), color: "text-red-600" },
                          { label: "= Receita Líquida", value: financialData.dre?.receita_liquida, bold: true, color: "text-blue-600" },
                          { label: "(-) Custo da Mercadoria", value: -(financialData.dre?.custo_mercadoria || 0), color: "text-red-600" },
                          { label: "= Lucro Bruto", value: financialData.dre?.lucro_bruto, bold: true, color: "text-green-600" },
                          { label: "(-) Despesas Operacionais", value: -(financialData.dre?.despesas_operacionais || 0), color: "text-red-600" },
                          { label: "= Resultado Líquido", value: financialData.dre?.resultado_liquido, bold: true, color: (financialData.dre?.resultado_liquido || 0) >= 0 ? "text-green-700" : "text-red-700" },
                        ].map((row, i) => (
                          <TableRow key={i} className={row.bold ? "bg-gray-50" : ""}>
                            <TableCell className={`${row.bold ? "font-bold" : ""}`}>{row.label}</TableCell>
                            <TableCell className={`text-right ${row.bold ? "font-bold text-lg" : ""} ${row.color || ""}`}>
                              {formatCurrency(Math.abs(row.value || 0))}
                              {(row.value || 0) < 0 && !row.bold ? " (-)": ""}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Cash Flow & Receivables/Payables */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="shadow-sm">
                    <CardHeader><CardTitle className="text-base">Fluxo de Caixa</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span className="text-sm font-medium text-green-800">Entradas</span>
                        <span className="font-bold text-green-700">{formatCurrency(financialData.cashFlow?.inflows || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <span className="text-sm font-medium text-blue-800">Parcelas Recebidas</span>
                        <span className="font-bold text-blue-700">{formatCurrency(financialData.cashFlow?.installmentsReceived || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                        <span className="text-sm font-medium text-red-800">Saídas</span>
                        <span className="font-bold text-red-700">{formatCurrency(financialData.cashFlow?.outflows || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-100 rounded-lg border-2 border-gray-200">
                        <span className="font-bold text-gray-800">Saldo</span>
                        <span className={`font-bold text-lg ${(financialData.cashFlow?.netCashFlow || 0) >= 0 ? "text-green-700" : "text-red-700"}`}>
                          {formatCurrency(financialData.cashFlow?.netCashFlow || 0)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="shadow-sm">
                    <CardHeader><CardTitle className="text-base">Pendências</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                        <p className="text-sm text-amber-600 mb-1">Contas a Receber</p>
                        <p className="text-2xl font-bold text-amber-800">{formatCurrency(financialData.receivables?.pending || 0)}</p>
                        <p className="text-xs text-amber-500">{financialData.receivables?.pendingCount || 0} parcelas pendentes</p>
                      </div>
                      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-sm text-red-600 mb-1">Contas a Pagar</p>
                        <p className="text-2xl font-bold text-red-800">{formatCurrency(financialData.payables?.pending || 0)}</p>
                        <p className="text-xs text-red-500">{financialData.payables?.pendingCount || 0} contas pendentes</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="py-16 text-center text-gray-500">
                  <Wallet className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Selecione um período para ver o relatório financeiro.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ═══ ESTOQUE ═══ */}
          <TabsContent value="estoque">
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : stockData ? (
              <div className="space-y-6">
                {/* KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Produtos", value: String(stockData.summary?.totalProducts || 0), sub: `${stockData.summary?.totalItems || 0} unidades`, gradient: GRADIENT_CARDS[0] },
                    { label: "Valor de Custo", value: formatCurrency(stockData.summary?.totalCostValue || 0), gradient: GRADIENT_CARDS[2] },
                    { label: "Valor de Venda", value: formatCurrency(stockData.summary?.totalSellingValue || 0), gradient: GRADIENT_CARDS[1] },
                    { label: "Estoque Baixo", value: String(stockData.summary?.lowStockCount || 0), sub: `${stockData.summary?.outOfStockCount || 0} zerados`, gradient: (stockData.summary?.lowStockCount || 0) > 0 ? "from-red-500 to-rose-600" : GRADIENT_CARDS[1] },
                  ].map((kpi, i) => (
                    <Card key={i} className={`bg-gradient-to-br ${kpi.gradient} text-white border-0 shadow-lg`}>
                      <CardContent className="pt-5 pb-4">
                        <p className="text-2xl font-bold">{kpi.value}</p>
                        <p className="text-sm opacity-80">{kpi.label}</p>
                        {kpi.sub && <p className="text-xs opacity-60 mt-1">{kpi.sub}</p>}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Stock by Category Chart */}
                {stockCategoryData.length > 0 && (
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-indigo-500" /> Estoque por Categoria</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={stockCategoryData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="name" angle={-15} textAnchor="end" height={60} tick={{ fontSize: 12 }} />
                          <YAxis />
                          <Tooltip formatter={(v: number, name: string) => name === "value" ? formatCurrency(v) : v} />
                          <Legend />
                          <Bar dataKey="items" name="Unidades" fill="#6366F1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Low Stock Alert */}
                {stockData.lowStock && stockData.lowStock.length > 0 && (
                  <Card className="shadow-sm border-amber-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-amber-700">
                        <AlertTriangle className="h-5 w-5" /> Produtos com Estoque Baixo
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produto</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead className="text-right">Estoque</TableHead>
                            <TableHead className="text-right">Mínimo</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stockData.lowStock.map((p: any) => (
                            <TableRow key={p.id} className={p.stock === 0 ? "bg-red-50" : "bg-amber-50"}>
                              <TableCell className="font-medium">{p.name}</TableCell>
                              <TableCell>{p.category?.name || "—"}</TableCell>
                              <TableCell className="text-right font-bold">{p.stock}</TableCell>
                              <TableCell className="text-right">{p.minStock}</TableCell>
                              <TableCell>
                                {p.stock === 0 ? (
                                  <Badge variant="destructive">Zerado</Badge>
                                ) : (
                                  <Badge className="bg-amber-500">Baixo</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {/* Full Stock Table */}
                {stockData.products && stockData.products.length > 0 && (
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle>Posição Completa do Estoque</CardTitle>
                      <CardDescription>{stockData.products.length} produtos cadastrados</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produto</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead>Marca</TableHead>
                            <TableHead className="text-right">Estoque</TableHead>
                            <TableHead className="text-right">Custo</TableHead>
                            <TableHead className="text-right">Venda</TableHead>
                            <TableHead className="text-right">Valor Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stockData.products.slice(0, 30).map((p: any) => (
                            <TableRow key={p.id} className={p.stock <= p.minStock ? "bg-red-50/50" : ""}>
                              <TableCell className="font-medium">{p.name}</TableCell>
                              <TableCell>{p.category?.name || "—"}</TableCell>
                              <TableCell>{p.brand || "—"}</TableCell>
                              <TableCell className="text-right">
                                <span className={`font-bold ${p.stock <= p.minStock ? "text-red-600" : "text-gray-900"}`}>{p.stock}</span>
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(p.costPrice)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(p.sellingPrice)}</TableCell>
                              <TableCell className="text-right font-semibold">{formatCurrency(p.stock * p.sellingPrice)}</TableCell>
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
                <CardContent className="py-16 text-center text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Clique em "Gerar Relatório" para ver o estoque.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ═══ CLIENTES ═══ */}
          <TabsContent value="clientes">
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : customerData ? (
              <div className="space-y-6">
                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className={`bg-gradient-to-br ${GRADIENT_CARDS[0]} text-white border-0 shadow-lg`}>
                    <CardContent className="pt-5 pb-4">
                      <Users className="h-5 w-5 opacity-80 mb-2" />
                      <p className="text-2xl font-bold">{customerData.topCustomers?.length || 0}</p>
                      <p className="text-sm opacity-80">Clientes Ativos</p>
                    </CardContent>
                  </Card>
                  <Card className={`bg-gradient-to-br ${GRADIENT_CARDS[1]} text-white border-0 shadow-lg`}>
                    <CardContent className="pt-5 pb-4">
                      <ArrowUpRight className="h-5 w-5 opacity-80 mb-2" />
                      <p className="text-2xl font-bold">{customerData.newCustomers?.count || 0}</p>
                      <p className="text-sm opacity-80">Novos no Período</p>
                    </CardContent>
                  </Card>
                  <Card className={`bg-gradient-to-br ${(customerData.debtors?.length || 0) > 0 ? "from-red-500 to-rose-600" : GRADIENT_CARDS[2]} text-white border-0 shadow-lg`}>
                    <CardContent className="pt-5 pb-4">
                      <AlertTriangle className="h-5 w-5 opacity-80 mb-2" />
                      <p className="text-2xl font-bold">{customerData.debtors?.length || 0}</p>
                      <p className="text-sm opacity-80">Com Pendências</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Top Customers */}
                {customerData.topCustomers && customerData.topCustomers.length > 0 && (
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-indigo-500" /> Ranking de Clientes</CardTitle>
                      <CardDescription>Por valor total de compras</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead className="text-right">Compras</TableHead>
                            <TableHead className="text-right">Total Gasto</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customerData.topCustomers.slice(0, 15).map((c: any, i: number) => (
                            <TableRow key={c.id}>
                              <TableCell>
                                {i < 3 ? (
                                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                                    i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-gray-100 text-gray-600" : "bg-amber-100 text-amber-700"
                                  }`}>{i + 1}</span>
                                ) : <span className="text-gray-400 ml-2">{i + 1}</span>}
                              </TableCell>
                              <TableCell className="font-medium">{c.name}</TableCell>
                              <TableCell className="text-right">{c.orderCount}</TableCell>
                              <TableCell className="text-right font-semibold text-green-600">{formatCurrency(c.totalSpent)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {/* Debtors */}
                {customerData.debtors && customerData.debtors.length > 0 && (
                  <Card className="shadow-sm border-red-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-700">
                        <AlertTriangle className="h-5 w-5" /> Clientes Inadimplentes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Telefone</TableHead>
                            <TableHead className="text-right">Parcelas</TableHead>
                            <TableHead className="text-right">Total Devido</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customerData.debtors.map((d: any) => (
                            <TableRow key={d.customer.id} className="bg-red-50/50">
                              <TableCell className="font-medium">{d.customer.name}</TableCell>
                              <TableCell>{d.customer.phone || "—"}</TableCell>
                              <TableCell className="text-right">{d.installments}</TableCell>
                              <TableCell className="text-right font-bold text-red-600">{formatCurrency(d.totalOwed)}</TableCell>
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
                <CardContent className="py-16 text-center text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
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
