import { useCallback, useEffect, useMemo, useState, type ElementType, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { cn } from "@/lib/utils";
import {
  CHART,
  CHART_COLORS,
  EmptyState,
  InitialsAvatar,
  InsightCard,
  PageHeader,
  Panel,
  StatCard,
  StatusPill,
  chartAxisProps,
  chartTooltipProps,
  rise,
} from "@/components/imperio";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Award,
  BarChart3,
  Boxes,
  CalendarRange,
  Crown,
  Download,
  Layers,
  Lock,
  Package,
  PieChart as PieChartIcon,
  PiggyBank,
  Printer,
  Receipt,
  RefreshCw,
  Scale,
  Search,
  ShoppingBag,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import reportService, {
  type CustomerReportData,
  type FinancialReportData,
  type SalesReportData,
  type StockReportData,
} from "@/services/report.service";

/* ─── constants & helpers ──────────────────────────────────── */

type TabKey = "vendas" | "financeiro" | "estoque" | "clientes";

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Dinheiro",
  PIX: "PIX",
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
  STORE_CREDIT: "Crediário",
  INSURANCE: "Convênio",
  EXCHANGE: "Troca / cortesia",
};

const SALE_STATUS: Record<string, { label: string; tone: "warning" | "info" | "success" | "navy" | "danger" }> = {
  AWAITING_LENS: { label: "Aguardando lente", tone: "warning" },
  IN_PRODUCTION: { label: "Em produção", tone: "info" },
  READY_FOR_PICKUP: { label: "Pronta p/ retirada", tone: "success" },
  DELIVERED: { label: "Entregue", tone: "navy" },
  CANCELLED: { label: "Cancelada", tone: "danger" },
};

/** rise() merged with extra classes (spreading rise() alone would override className). */
const rc = (i: number, extra: string) => ({ className: cn(extra, rise(i).className), style: rise(i).style });

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const PRESETS = [
  { key: "hoje", label: "Hoje" },
  { key: "7d", label: "7 dias" },
  { key: "mes", label: "Mês atual" },
  { key: "mes-ant", label: "Mês anterior" },
  { key: "ano", label: "Ano" },
] as const;
type PresetKey = (typeof PRESETS)[number]["key"];

function presetRange(key: PresetKey): { from: string; to: string } {
  const now = new Date();
  const today = toISO(now);
  switch (key) {
    case "hoje":
      return { from: today, to: today };
    case "7d":
      return { from: toISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)), to: today };
    case "mes":
      return { from: toISO(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
    case "mes-ant":
      return {
        from: toISO(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: toISO(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    case "ano":
      return { from: toISO(new Date(now.getFullYear(), 0, 1)), to: today };
  }
}

const compactMoney = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;
  return `R$ ${Math.round(v)}`;
};
const pct = (v: number, digits = 1) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: digits })}%`;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/* ─── CSV export ───────────────────────────────────────────── */

type CsvCell = string | number | null | undefined;
interface CsvSection {
  title?: string;
  headers: string[];
  rows: CsvCell[][];
}

function csvCell(v: CsvCell) {
  if (v == null) return "";
  // Numbers with comma decimal separator so Excel pt-BR reads them as numbers.
  const s = typeof v === "number" ? String(Math.round(v * 100) / 100).replace(".", ",") : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(filename: string, sections: CsvSection[]) {
  const lines: string[] = [];
  sections.forEach((sec, i) => {
    if (i > 0) lines.push("");
    if (sec.title) lines.push(csvCell(sec.title));
    lines.push(sec.headers.map(csvCell).join(";"));
    for (const row of sec.rows) lines.push(row.map(csvCell).join(";"));
  });
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ─── insights ─────────────────────────────────────────────── */

interface ReportInsight {
  key: string;
  icon: ElementType;
  tone: "success" | "warning" | "info" | "danger" | "gold";
  title: string;
  text: string;
  action?: { label: string; path: string };
}

function generateReportInsights(
  tab: TabKey,
  sales: SalesReportData | null,
  fin: FinancialReportData | null,
  stock: StockReportData | null,
  cust: CustomerReportData | null,
): ReportInsight[] {
  const out: ReportInsight[] = [];

  if (tab === "vendas" && sales && sales.summary.totalOrders > 0) {
    const s = sales.summary;
    const margin = s.totalRevenue > 0 ? (s.totalProfit / s.totalRevenue) * 100 : 0;
    if (margin > 0) {
      out.push(
        margin >= 45
          ? {
              key: "margin",
              icon: PiggyBank,
              tone: "success",
              title: `Margem estimada de ${pct(margin)}`,
              text: "Saudável para o varejo óptico. Os preços estão bem posicionados no período.",
            }
          : {
              key: "margin",
              icon: Scale,
              tone: "warning",
              title: `Margem estimada de ${pct(margin)}`,
              text: "Abaixo do ideal. Revise os descontos e o markup dos itens mais vendidos.",
              action: { label: "Ver produtos", path: "/produtos" },
            },
      );
    }
    const gross = s.totalRevenue + s.totalDiscount;
    const discShare = gross > 0 ? (s.totalDiscount / gross) * 100 : 0;
    if (discShare >= 8) {
      out.push({
        key: "discount",
        icon: TrendingDown,
        tone: "warning",
        title: `Descontos somam ${pct(discShare)} do bruto`,
        text: `Foram ${formatCurrency(s.totalDiscount)} em descontos. Considere limitar o desconto por vendedor ou trocar por brindes.`,
      });
    }
    if (sales.bySeller.length > 1) {
      const top = [...sales.bySeller].sort((a, b) => b.total - a.total)[0];
      const share = s.totalRevenue > 0 ? (top.total / s.totalRevenue) * 100 : 0;
      out.push({
        key: "seller",
        icon: Award,
        tone: "gold",
        title: `${top.name} lidera com ${pct(share, 0)} do faturamento`,
        text: `${plural(top.count, "venda", "vendas")} somando ${formatCurrency(top.total)}. Compartilhe as boas práticas com a equipe.`,
      });
    }
    const pay = Object.entries(sales.byPaymentMethod);
    const payTotal = pay.reduce((sum, [, v]) => sum + v.total, 0);
    const credit = sales.byPaymentMethod.STORE_CREDIT?.total ?? 0;
    if (payTotal > 0 && credit / payTotal >= 0.25) {
      out.push({
        key: "credit",
        icon: AlertTriangle,
        tone: "danger",
        title: `Crediário representa ${pct((credit / payTotal) * 100, 0)} dos recebimentos`,
        text: "Alta exposição a inadimplência. Incentive PIX ou cartão com um pequeno desconto à vista.",
        action: { label: "Ver contas a receber", path: "/financeiro/contas-receber" },
      });
    }
    if (s.averageTicket > 0 && s.averageTicket < 300) {
      out.push({
        key: "ticket",
        icon: Target,
        tone: "info",
        title: `Ticket médio de ${formatCurrency(s.averageTicket)}`,
        text: "Ofereça tratamentos de lente e um segundo par para elevar o valor por venda.",
      });
    }
  }

  if (tab === "financeiro" && fin) {
    const d = fin.dre;
    if (d.resultado_liquido !== 0) {
      out.push(
        d.resultado_liquido > 0
          ? {
              key: "result",
              icon: TrendingUp,
              tone: "success",
              title: `Resultado líquido de ${formatCurrency(d.resultado_liquido)}`,
              text:
                d.receita_bruta > 0
                  ? `Margem líquida de ${pct((d.resultado_liquido / d.receita_bruta) * 100)} sobre a receita do período.`
                  : "Operação no azul no período.",
            }
          : {
              key: "result",
              icon: TrendingDown,
              tone: "danger",
              title: `Resultado negativo de ${formatCurrency(Math.abs(d.resultado_liquido))}`,
              text: "As despesas pagas superaram a receita. Revise contas recorrentes e acelere a cobrança do crediário.",
              action: { label: "Ver contas a pagar", path: "/financeiro/contas-pagar" },
            },
      );
    }
    if (d.receita_bruta > 0 && d.despesas_operacionais / d.receita_bruta > 0.5) {
      out.push({
        key: "expenses",
        icon: Scale,
        tone: "warning",
        title: `Despesas consomem ${pct((d.despesas_operacionais / d.receita_bruta) * 100, 0)} da receita`,
        text: "Um patamar alto — identifique as maiores categorias de despesa e renegocie contratos.",
        action: { label: "Ver contas a pagar", path: "/financeiro/contas-pagar" },
      });
    }
    if (fin.payables.pending > 0 && fin.payables.pending > fin.receivables.pending) {
      out.push({
        key: "gap",
        icon: Wallet,
        tone: "warning",
        title: "A pagar supera o a receber no período",
        text: `${formatCurrency(fin.payables.pending)} em contas contra ${formatCurrency(fin.receivables.pending)} em parcelas a receber. Planeje o caixa com antecedência.`,
      });
    } else if (fin.receivables.pending > 0) {
      out.push({
        key: "receivables",
        icon: Receipt,
        tone: "info",
        title: `${formatCurrency(fin.receivables.pending)} a receber no período`,
        text: `${plural(fin.receivables.pendingCount, "parcela pendente", "parcelas pendentes")}. Lembretes antes do vencimento reduzem atrasos.`,
        action: { label: "Ver contas a receber", path: "/financeiro/contas-receber" },
      });
    }
  }

  if (tab === "estoque" && stock) {
    const s = stock.summary;
    if (s.outOfStockCount > 0) {
      out.push({
        key: "out",
        icon: AlertTriangle,
        tone: "danger",
        title: `${plural(s.outOfStockCount, "produto zerado", "produtos zerados")}`,
        text: "Itens sem estoque significam vendas perdidas. Priorize a reposição com os fornecedores.",
        action: { label: "Ver produtos", path: "/produtos" },
      });
    }
    const onlyLow = s.lowStockCount - s.outOfStockCount;
    if (onlyLow > 0) {
      out.push({
        key: "low",
        icon: Package,
        tone: "warning",
        title: `${plural(onlyLow, "produto", "produtos")} no estoque mínimo`,
        text: "Faça o pedido agora para não chegar a zero.",
        action: { label: "Ver produtos", path: "/produtos" },
      });
    }
    if (s.totalSellingValue > 0) {
      const m = ((s.totalSellingValue - s.totalCostValue) / s.totalSellingValue) * 100;
      out.push({
        key: "potential",
        icon: PiggyBank,
        tone: "gold",
        title: `${formatCurrency(s.totalSellingValue - s.totalCostValue)} de lucro potencial em estoque`,
        text: `Capital investido de ${formatCurrency(s.totalCostValue)} com margem potencial de ${pct(m)}.`,
      });
    }
    const topCat = [...stock.byCategory].sort((a, b) => b.totalValue - a.totalValue)[0];
    if (topCat && s.totalSellingValue > 0 && topCat.totalValue / s.totalSellingValue > 0.5) {
      out.push({
        key: "concentration",
        icon: Layers,
        tone: "info",
        title: `${topCat.name} concentra ${pct((topCat.totalValue / s.totalSellingValue) * 100, 0)} do estoque`,
        text: "Diversificar reduz o risco de capital parado em uma única categoria.",
      });
    }
  }

  if (tab === "clientes" && cust) {
    const owed = cust.debtors.reduce((sum, d) => sum + d.totalOwed, 0);
    if (cust.debtors.length > 0) {
      out.push({
        key: "debtors",
        icon: AlertTriangle,
        tone: "danger",
        title: `${plural(cust.debtors.length, "cliente inadimplente", "clientes inadimplentes")}`,
        text: `${formatCurrency(owed)} em parcelas vencidas. Comece pelos maiores valores da lista.`,
        action: { label: "Ver contas a receber", path: "/financeiro/contas-receber" },
      });
    }
    if (cust.newCustomers.count > 0) {
      out.push({
        key: "new",
        icon: UserPlus,
        tone: "success",
        title: `${plural(cust.newCustomers.count, "novo cliente", "novos clientes")} no período`,
        text: "Um contato de pós-venda 30 dias após a entrega fideliza e gera indicações.",
      });
    }
    const buyers = cust.topCustomers.filter((c) => c.totalSpent > 0);
    const totalTop = buyers.reduce((sum, c) => sum + c.totalSpent, 0);
    const top5 = buyers.slice(0, 5).reduce((sum, c) => sum + c.totalSpent, 0);
    if (buyers.length >= 8 && totalTop > 0) {
      out.push({
        key: "vip",
        icon: Crown,
        tone: "gold",
        title: `Top 5 clientes somam ${pct((top5 / totalTop) * 100, 0)} do ranking`,
        text: "Trate-os como VIP: pré-lançamentos de coleções e atendimento com hora marcada.",
      });
    }
  }

  return out.slice(0, 6);
}

/* ─── page ─────────────────────────────────────────────────── */

export default function Reports() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const initial = presetRange("mes");
  const [activeTab, setActiveTab] = useState<TabKey>("vendas");
  const [dateFrom, setDateFrom] = useState(initial.from);
  const [dateTo, setDateTo] = useState(initial.to);
  const [preset, setPreset] = useState<PresetKey | null>("mes");
  const [period, setPeriod] = useState(initial); // applied period
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<TabKey, string>>>({});
  const [salesData, setSalesData] = useState<SalesReportData | null>(null);
  const [financialData, setFinancialData] = useState<FinancialReportData | null>(null);
  const [stockData, setStockData] = useState<StockReportData | null>(null);
  const [customerData, setCustomerData] = useState<CustomerReportData | null>(null);

  const fetchTab = useCallback(
    async (tab: TabKey, range: { from: string; to: string }) => {
      setLoading(true);
      setErrors((e) => ({ ...e, [tab]: undefined }));
      try {
        const filters = { startDate: range.from, endDate: range.to };
        if (tab === "vendas") setSalesData((await reportService.getSalesReport(filters)).data);
        else if (tab === "financeiro") setFinancialData((await reportService.getFinancialReport(filters)).data);
        else if (tab === "estoque") setStockData((await reportService.getStockReport()).data);
        else setCustomerData((await reportService.getCustomerReport(filters)).data);
      } catch (err) {
        const msg = err instanceof Error && err.message ? err.message : "Erro ao gerar relatório.";
        setErrors((e) => ({ ...e, [tab]: msg }));
        toast({ title: "Erro ao gerar relatório", description: msg, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  const dataFor = (tab: TabKey) =>
    tab === "vendas" ? salesData : tab === "financeiro" ? financialData : tab === "estoque" ? stockData : customerData;

  // Load the active tab when it has no data yet.
  useEffect(() => {
    if (!isAdmin) return;
    if (!dataFor(activeTab) && !errors[activeTab]) fetchTab(activeTab, period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAdmin]);

  const applyPeriod = (range: { from: string; to: string }) => {
    if (range.from > range.to) {
      toast({ title: "Período inválido", description: "A data inicial deve ser anterior à final.", variant: "destructive" });
      return;
    }
    setPeriod(range);
    // Period-dependent reports become stale; the stock report is a snapshot and stays.
    if (activeTab !== "vendas") setSalesData(null);
    if (activeTab !== "financeiro") setFinancialData(null);
    if (activeTab !== "clientes") setCustomerData(null);
    setErrors({});
    fetchTab(activeTab, range);
  };

  const choosePreset = (key: PresetKey) => {
    const r = presetRange(key);
    setPreset(key);
    setDateFrom(r.from);
    setDateTo(r.to);
    applyPeriod(r);
  };

  const periodLabel =
    period.from === period.to
      ? formatDate(parseISO(period.from))
      : `${formatDate(parseISO(period.from))} a ${formatDate(parseISO(period.to))}`;

  const insights = useMemo(
    () => generateReportInsights(activeTab, salesData, financialData, stockData, customerData),
    [activeTab, salesData, financialData, stockData, customerData],
  );

  /* CSV of the tables visible on the active tab */
  const exportCsv = () => {
    const stamp = `${period.from}_a_${period.to}`;
    if (activeTab === "vendas" && salesData) {
      downloadCsv(`vendas_${stamp}.csv`, [
        {
          title: `Vendas — ${periodLabel}`,
          headers: ["OS", "Data", "Cliente", "Vendedor", "Status", "Desconto", "Total", "Lucro estimado", "Pagamento"],
          rows: salesData.orders.map((o) => [
            o.orderNumber,
            formatDate(o.date),
            o.customer?.name ?? "",
            o.seller?.name ?? "",
            SALE_STATUS[o.status]?.label ?? o.status,
            o.discountAmount,
            o.total,
            o.estimatedProfit,
            o.payments.map((p) => PAYMENT_LABELS[p.method] ?? p.method).join(" + "),
          ]),
        },
        {
          title: "Por vendedor",
          headers: ["Vendedor", "Vendas", "Total"],
          rows: salesData.bySeller.map((s) => [s.name, s.count, s.total]),
        },
        {
          title: "Por forma de pagamento",
          headers: ["Forma", "Pagamentos", "Total"],
          rows: Object.entries(salesData.byPaymentMethod).map(([m, v]) => [PAYMENT_LABELS[m] ?? m, v.count, v.total]),
        },
      ]);
    } else if (activeTab === "financeiro" && financialData) {
      const d = financialData.dre;
      downloadCsv(`dre_${stamp}.csv`, [
        {
          title: `DRE — ${periodLabel}`,
          headers: ["Conta", "Valor"],
          rows: [
            ["Receita bruta", d.receita_bruta],
            ["(-) Descontos concedidos", -d.descontos],
            ["(=) Receita líquida", d.receita_liquida],
            ["(-) Custo da mercadoria vendida", -d.custo_mercadoria],
            ["(=) Lucro bruto", d.lucro_bruto],
            ["(-) Despesas operacionais", -d.despesas_operacionais],
            ["(=) Resultado líquido", d.resultado_liquido],
          ],
        },
        {
          title: "Fluxo de caixa",
          headers: ["Item", "Valor"],
          rows: [
            ["Entradas (vendas)", financialData.cashFlow.inflows],
            ["Parcelas recebidas", financialData.cashFlow.installmentsReceived],
            ["Saídas (contas pagas)", -financialData.cashFlow.outflows],
            ["Saldo", financialData.cashFlow.netCashFlow],
          ],
        },
        {
          title: "Pendências",
          headers: ["Tipo", "Quantidade", "Valor"],
          rows: [
            ["Contas a receber", financialData.receivables.pendingCount, financialData.receivables.pending],
            ["Contas a pagar", financialData.payables.pendingCount, financialData.payables.pending],
          ],
        },
      ]);
    } else if (activeTab === "estoque" && stockData) {
      downloadCsv(`estoque_${toISO(new Date())}.csv`, [
        {
          title: "Posição do estoque",
          headers: ["Produto", "Categoria", "Marca", "Código", "Estoque", "Mínimo", "Custo total", "Preço de venda", "Valor em estoque"],
          rows: stockData.products.map((p) => [
            p.name,
            p.category?.name ?? "",
            p.brand ?? "",
            p.barcode ?? "",
            p.stock,
            p.minStock,
            p.totalCost,
            p.sellingPrice,
            p.stock * p.sellingPrice,
          ]),
        },
        {
          title: "Por categoria",
          headers: ["Categoria", "Produtos", "Unidades", "Valor de venda"],
          rows: stockData.byCategory.map((c) => [c.name, c.count, c.totalStock, c.totalValue]),
        },
      ]);
    } else if (activeTab === "clientes" && customerData) {
      downloadCsv(`clientes_${stamp}.csv`, [
        {
          title: "Ranking de clientes (histórico)",
          headers: ["Posição", "Cliente", "Telefone", "Compras", "Total gasto"],
          rows: customerData.topCustomers.map((c, i) => [i + 1, c.name, c.phone ?? "", c.orderCount, c.totalSpent]),
        },
        {
          title: "Clientes inadimplentes",
          headers: ["Cliente", "Telefone", "Parcelas vencidas", "Total devido"],
          rows: customerData.debtors.map((d) => [d.customer.name, d.customer.phone ?? "", d.installments, d.totalOwed]),
        },
        {
          title: `Novos clientes — ${periodLabel}`,
          headers: ["Cliente", "Telefone", "Cadastro"],
          rows: customerData.newCustomers.customers.map((c) => [c.name, c.phone ?? "", formatDate(c.createdAt)]),
        },
      ]);
    } else {
      toast({ title: "Nada para exportar", description: "Gere o relatório antes de exportar." });
      return;
    }
    toast({ title: "CSV gerado", description: "O download foi iniciado." });
  };

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <PageHeader eyebrow="Análises" title="Relatórios" icon={BarChart3} />
          <Panel>
            <EmptyState
              icon={Lock}
              title="Acesso restrito"
              description="Os relatórios gerenciais estão disponíveis apenas para administradores."
              action={<Button onClick={() => navigate("/dashboard")}>Voltar ao painel</Button>}
            />
          </Panel>
        </div>
      </MainLayout>
    );
  }

  const currentError = errors[activeTab];
  const currentData = dataFor(activeTab);

  const stateFor = (tab: TabKey, content: () => ReactNode) => {
    if (loading && activeTab === tab) return <TabSkeleton />;
    if (errors[tab])
      return (
        <Panel>
          <EmptyState
            icon={AlertTriangle}
            title="Não foi possível gerar o relatório"
            description={errors[tab]}
            action={
              <Button onClick={() => fetchTab(tab, period)}>
                <RefreshCw className="h-4 w-4 mr-1.5" /> Tentar novamente
              </Button>
            }
          />
        </Panel>
      );
    if (!dataFor(tab)) return <TabSkeleton />;
    return content();
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Análises"
          title="Relatórios"
          description={activeTab === "estoque" ? "Posição atual do estoque" : `Período: ${periodLabel}`}
          icon={BarChart3}
          actions={
            <div className="flex flex-wrap gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={exportCsv} disabled={!currentData || loading}>
                <Download className="h-4 w-4 mr-1.5" /> Exportar CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-1.5" /> Imprimir
              </Button>
            </div>
          }
        />

        {/* Period filter */}
        <Panel bodyClassName="p-4 sm:p-5" {...rc(1, "print:hidden")}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="eyebrow mb-2 flex items-center gap-1.5">
                <CalendarRange className="h-3.5 w-3.5" /> Período rápido
              </p>
              <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                {PRESETS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => choosePreset(p.key)}
                    disabled={loading}
                    className={cn(
                      "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60",
                      preset === p.key
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-gold/50 hover:text-foreground",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:flex sm:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="rep-from" className="text-xs">
                  Data inicial
                </Label>
                <Input
                  id="rep-from"
                  type="date"
                  value={dateFrom}
                  max={dateTo}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPreset(null);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rep-to" className="text-xs">
                  Data final
                </Label>
                <Input
                  id="rep-to"
                  type="date"
                  value={dateTo}
                  min={dateFrom}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPreset(null);
                  }}
                />
              </div>
              <Button
                className="col-span-2 sm:col-span-1"
                onClick={() => dateFrom && dateTo && applyPeriod({ from: dateFrom, to: dateTo })}
                disabled={loading || !dateFrom || !dateTo}
              >
                <RefreshCw className={cn("h-4 w-4 mr-1.5", loading && "animate-spin")} /> Gerar relatório
              </Button>
            </div>
          </div>
        </Panel>

        {/* Assistente Império */}
        {!loading && !currentError && insights.length > 0 && (
          <Panel
            title="Assistente Império"
            description="Leituras automáticas do relatório em tela"
            icon={Sparkles}
            {...rc(2, "print:hidden")}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {insights.map((ins) => (
                <InsightCard
                  key={ins.key}
                  icon={ins.icon}
                  tone={ins.tone}
                  title={ins.title}
                  action={
                    ins.action && (
                      <button
                        onClick={() => navigate(ins.action!.path)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-gold-foreground"
                      >
                        {ins.action.label} <ArrowRight className="h-3 w-3" />
                      </button>
                    )
                  }
                >
                  {ins.text}
                </InsightCard>
              ))}
            </div>
          </Panel>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)} className="space-y-6">
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 print:hidden">
            <TabsList className="h-auto w-max justify-start gap-1 rounded-xl border border-border bg-card p-1 shadow-sm">
              {(
                [
                  ["vendas", "Vendas", TrendingUp],
                  ["financeiro", "Financeiro", Wallet],
                  ["estoque", "Estoque", Package],
                  ["clientes", "Clientes", Users],
                ] as const
              ).map(([key, label, Icon]) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="gap-1.5 rounded-lg px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Icon className="h-4 w-4" /> {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="vendas" className="mt-0">
            {stateFor("vendas", () => <SalesTab data={salesData!} onOpenSale={(id) => navigate(`/vendas/${id}`)} period={period} />)}
          </TabsContent>
          <TabsContent value="financeiro" className="mt-0">
            {stateFor("financeiro", () => <FinancialTab data={financialData!} />)}
          </TabsContent>
          <TabsContent value="estoque" className="mt-0">
            {stateFor("estoque", () => <StockTab data={stockData!} />)}
          </TabsContent>
          <TabsContent value="clientes" className="mt-0">
            {stateFor("clientes", () => (
              <CustomersTab data={customerData!} onOpenCustomer={(id) => navigate(`/clientes/${id}`)} />
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

/* ─── shared bits ──────────────────────────────────────────── */

function TabSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[112px] rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-[300px] rounded-2xl" />
        <Skeleton className="h-[300px] rounded-2xl" />
      </div>
      <Skeleton className="h-[260px] rounded-2xl" />
    </div>
  );
}

function ShowMore({ total, shown, onToggle, expanded }: { total: number; shown: number; onToggle: () => void; expanded: boolean }) {
  if (total <= shown && !expanded) return null;
  return (
    <div className="border-t border-border p-3 text-center print:hidden">
      <Button variant="ghost" size="sm" className="text-xs" onClick={onToggle}>
        {expanded ? "Mostrar menos" : `Mostrar todos (${total})`}
      </Button>
    </div>
  );
}

function RankBadge({ i }: { i: number }) {
  return (
    <span
      className={cn(
        "num inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
        i === 0 ? "bg-gold text-primary" : i < 3 ? "bg-gold-soft text-gold-foreground" : "bg-muted text-muted-foreground",
      )}
    >
      {i + 1}
    </span>
  );
}

/* ─── Vendas ───────────────────────────────────────────────── */

function SalesTab({
  data,
  onOpenSale,
  period,
}: {
  data: SalesReportData;
  onOpenSale: (id: string) => void;
  period: { from: string; to: string };
}) {
  const [expanded, setExpanded] = useState(false);
  const s = data.summary;
  const margin = s.totalRevenue > 0 ? (s.totalProfit / s.totalRevenue) * 100 : 0;

  const payments = useMemo(() => {
    const rows = Object.entries(data.byPaymentMethod)
      .map(([method, v]) => ({ method, label: PAYMENT_LABELS[method] ?? method, total: v.total, count: v.count }))
      .sort((a, b) => b.total - a.total);
    const total = rows.reduce((sum, r) => sum + r.total, 0);
    return { rows, total };
  }, [data]);

  const sellers = useMemo(() => [...data.bySeller].sort((a, b) => b.total - a.total), [data]);

  const categories = useMemo(() => {
    const map = new Map<string, { name: string; total: number; qty: number }>();
    for (const o of data.orders)
      for (const it of o.items) {
        const name = it.product?.category?.name ?? (it.product ? "Sem categoria" : "Serviços e avulsos");
        const cur = map.get(name) ?? { name, total: 0, qty: 0 };
        cur.total += it.subtotal;
        cur.qty += it.quantity;
        map.set(name, cur);
      }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [data]);

  // Daily (or monthly for long ranges) revenue series, gap-filled.
  const series = useMemo(() => {
    const start = parseISO(period.from);
    const end = parseISO(period.to);
    const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
    const monthly = days > 62;
    const keyOf = (d: Date) => (monthly ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}` : toISO(d));
    const map = new Map<string, { total: number; count: number }>();
    for (const o of data.orders) {
      const k = keyOf(new Date(o.date));
      const cur = map.get(k) ?? { total: 0, count: 0 };
      cur.total += o.total;
      cur.count += 1;
      map.set(k, cur);
    }
    const out: { label: string; total: number; count: number }[] = [];
    if (monthly) {
      const d = new Date(start.getFullYear(), start.getMonth(), 1);
      while (d <= end) {
        const k = keyOf(d);
        out.push({ label: `${MONTHS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`, ...(map.get(k) ?? { total: 0, count: 0 }) });
        d.setMonth(d.getMonth() + 1);
      }
    } else {
      const d = new Date(start);
      while (d <= end) {
        const k = keyOf(d);
        out.push({ label: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`, ...(map.get(k) ?? { total: 0, count: 0 }) });
        d.setDate(d.getDate() + 1);
      }
    }
    return out;
  }, [data, period]);

  if (s.totalOrders === 0) {
    return (
      <Panel>
        <EmptyState
          icon={ShoppingBag}
          title="Nenhuma venda no período"
          description="Escolha outro período ou registre novas vendas para ver o relatório."
        />
      </Panel>
    );
  }

  const orders = expanded ? data.orders : data.orders.slice(0, 15);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          featured
          label="Faturamento"
          value={formatCurrency(s.totalRevenue)}
          hint={`${plural(s.totalOrders, "venda", "vendas")} no período`}
          icon={Crown}
          className={cn("col-span-2 lg:col-span-1", rise(0).className)}
          style={rise(0).style}
        />
        <StatCard label="Vendas" value={<span className="num">{s.totalOrders}</span>} icon={ShoppingBag} tone="info" {...rise(1)} />
        <StatCard label="Ticket médio" value={formatCurrency(s.averageTicket)} icon={Target} tone="navy" {...rise(2)} />
        <StatCard
          label="Lucro estimado"
          value={formatCurrency(s.totalProfit)}
          hint={`Margem de ${pct(margin)}`}
          icon={PiggyBank}
          tone="success"
          {...rise(3)}
        />
        <StatCard
          label="Descontos concedidos"
          value={formatCurrency(s.totalDiscount)}
          icon={TrendingDown}
          tone="warning"
          className={cn("col-span-2 lg:col-span-1", rise(4).className)}
          style={rise(4).style}
        />
      </div>

      <Panel title="Faturamento no período" icon={BarChart3} bodyClassName="px-2 pb-4 pt-4 sm:px-4" {...rise(5)}>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="repSalesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART.navy} stopOpacity={0.28} />
                <stop offset="100%" stopColor={CHART.navy} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="label" {...chartAxisProps} interval="preserveStartEnd" minTickGap={16} />
            <YAxis {...chartAxisProps} width={56} tickFormatter={compactMoney} />
            <Tooltip
              {...chartTooltipProps}
              cursor={{ stroke: CHART.gold, strokeWidth: 1, strokeDasharray: "3 3" }}
              formatter={(v: number, _n, item) => [
                `${formatCurrency(v)} · ${plural(item?.payload?.count ?? 0, "venda", "vendas")}`,
                "Faturamento",
              ]}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke={CHART.navy}
              strokeWidth={2.25}
              fill="url(#repSalesFill)"
              dot={series.length <= 14 ? { r: 3, fill: CHART.navy, strokeWidth: 0 } : false}
              activeDot={{ r: 5, fill: CHART.gold, stroke: "white", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Formas de pagamento" description="Participação no valor recebido" icon={PieChartIcon} {...rise(6)}>
          {payments.rows.length === 0 ? (
            <EmptyState icon={PieChartIcon} title="Sem pagamentos registrados" className="py-8" />
          ) : (
            <div className="flex flex-col items-center gap-5 sm:flex-row">
              <div className="relative h-[190px] w-[190px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={payments.rows}
                      dataKey="total"
                      nameKey="label"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {payments.rows.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...chartTooltipProps} formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="eyebrow">Total</span>
                  <span className="num font-display text-sm font-semibold">{compactMoney(payments.total)}</span>
                </div>
              </div>
              <ul className="w-full space-y-2.5">
                {payments.rows.map((r, i) => (
                  <li key={r.method} className="flex items-center gap-2.5 text-sm">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="min-w-0 flex-1 truncate">{r.label}</span>
                    <span className="num text-xs text-muted-foreground">
                      {payments.total > 0 ? pct((r.total / payments.total) * 100, 0) : "—"}
                    </span>
                    <span className="num w-24 text-right font-medium">{formatCurrency(r.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>

        <Panel title="Vendas por vendedor" description="Faturamento no período" icon={Award} {...rise(7)}>
          {sellers.length === 0 ? (
            <EmptyState icon={Users} title="Sem vendedores no período" className="py-8" />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(160, sellers.length * 44 + 24)}>
              <BarChart data={sellers} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={CHART.grid} horizontal={false} />
                <XAxis type="number" {...chartAxisProps} tickFormatter={compactMoney} />
                <YAxis
                  type="category"
                  dataKey="name"
                  {...chartAxisProps}
                  width={96}
                  tickFormatter={(v: string) => (v.length > 14 ? `${v.slice(0, 13)}…` : v)}
                />
                <Tooltip
                  {...chartTooltipProps}
                  formatter={(v: number, _n, item) => [
                    `${formatCurrency(v)} · ${plural(item?.payload?.count ?? 0, "venda", "vendas")}`,
                    "Faturamento",
                  ]}
                />
                <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={20}>
                  {sellers.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? CHART.gold : CHART.navy} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      {categories.length > 0 && (
        <Panel title="Vendas por categoria" description="Soma dos itens vendidos" icon={Layers} {...rise(8)}>
          <ul className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
            {categories.map((c, i) => (
              <li key={c.name}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{c.name}</span>
                  <span className="num shrink-0">
                    <span className="mr-2 text-xs text-muted-foreground">{c.qty} un.</span>
                    <span className="font-semibold">{formatCurrency(c.total)}</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(4, (c.total / (categories[0].total || 1)) * 100)}%`,
                      background: CHART_COLORS[i % CHART_COLORS.length],
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel
        title="Vendas do período"
        description={plural(data.orders.length, "venda encontrada", "vendas encontradas")}
        icon={Receipt}
        bodyClassName="p-0"
        {...rise(9)}
      >
        {/* mobile */}
        <ul className="divide-y divide-border md:hidden">
          {orders.map((o) => (
            <li key={o.id}>
              <button onClick={() => onOpenSale(o.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent">
                <InitialsAvatar name={o.customer?.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{o.customer?.name ?? "—"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    <span className="num">#{o.orderNumber}</span> · {formatDate(o.date)} · {o.seller?.name ?? "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="num font-display text-sm font-semibold">{formatCurrency(o.total)}</p>
                  <p className="num text-[11px] text-success">+{formatCurrency(o.estimatedProfit)}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
        {/* desktop */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">OS</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="pr-5 text-right">Lucro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id} className="cursor-pointer" onClick={() => onOpenSale(o.id)}>
                  <TableCell className="num pl-5 text-muted-foreground">#{o.orderNumber}</TableCell>
                  <TableCell className="num">{formatDate(o.date)}</TableCell>
                  <TableCell className="font-medium">{o.customer?.name ?? "—"}</TableCell>
                  <TableCell>{o.seller?.name ?? "—"}</TableCell>
                  <TableCell>
                    {SALE_STATUS[o.status] ? (
                      <StatusPill tone={SALE_STATUS[o.status].tone}>{SALE_STATUS[o.status].label}</StatusPill>
                    ) : (
                      o.status
                    )}
                  </TableCell>
                  <TableCell className="num text-right font-semibold">{formatCurrency(o.total)}</TableCell>
                  <TableCell className="num pr-5 text-right text-success">{formatCurrency(o.estimatedProfit)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <ShowMore total={data.orders.length} shown={15} expanded={expanded} onToggle={() => setExpanded((v) => !v)} />
      </Panel>
    </div>
  );
}

/* ─── Financeiro ───────────────────────────────────────────── */

function FinancialTab({ data }: { data: FinancialReportData }) {
  const d = data.dre;
  const base = d.receita_bruta || 0;
  const share = (v: number) => (base > 0 ? pct((Math.abs(v) / base) * 100) : "—");
  const positive = d.resultado_liquido >= 0;

  const ledger: { label: string; value: number; kind: "base" | "minus" | "total" | "result" }[] = [
    { label: "Receita bruta de vendas", value: d.receita_bruta, kind: "base" },
    { label: "Descontos concedidos", value: -d.descontos, kind: "minus" },
    { label: "Receita líquida", value: d.receita_liquida, kind: "total" },
    { label: "Custo da mercadoria vendida", value: -d.custo_mercadoria, kind: "minus" },
    { label: "Lucro bruto", value: d.lucro_bruto, kind: "total" },
    { label: "Despesas operacionais (contas pagas)", value: -d.despesas_operacionais, kind: "minus" },
    { label: "Resultado líquido", value: d.resultado_liquido, kind: "result" },
  ];

  const cash = data.cashFlow;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          featured
          label="Resultado líquido"
          value={formatCurrency(d.resultado_liquido)}
          hint={base > 0 ? `Margem líquida de ${share(d.resultado_liquido)}` : "Sem receita no período"}
          icon={positive ? TrendingUp : TrendingDown}
          className={cn("col-span-2 lg:col-span-1", rise(0).className)}
          style={rise(0).style}
        />
        <StatCard label="Receita bruta" value={formatCurrency(d.receita_bruta)} icon={ArrowUpRight} tone="navy" {...rise(1)} />
        <StatCard label="Lucro bruto" value={formatCurrency(d.lucro_bruto)} hint={`${share(d.lucro_bruto)} da receita`} icon={PiggyBank} tone="success" {...rise(2)} />
        <StatCard
          label="Despesas pagas"
          value={formatCurrency(d.despesas_operacionais)}
          hint={`${share(d.despesas_operacionais)} da receita`}
          icon={ArrowDownRight}
          tone="danger"
          {...rise(3)}
        />
      </div>

      <Panel
        title="DRE — Demonstrativo de Resultado"
        description="Regime de competência para vendas, caixa para despesas"
        icon={Scale}
        bodyClassName="p-0"
        {...rise(4)}
      >
        <div className="divide-y divide-border">
          <div className="hidden grid-cols-[1fr_auto_5rem] gap-4 px-5 py-2.5 sm:grid">
            <span className="eyebrow">Conta</span>
            <span className="eyebrow text-right">Valor</span>
            <span className="eyebrow text-right">% receita</span>
          </div>
          {ledger.map((row) => (
            <div
              key={row.label}
              className={cn(
                "grid grid-cols-[1fr_auto] items-baseline gap-4 px-5 py-3 sm:grid-cols-[1fr_auto_5rem]",
                row.kind === "total" && "bg-muted/60",
                row.kind === "result" && (positive ? "bg-success-soft" : "bg-danger-soft"),
              )}
            >
              <span
                className={cn(
                  "text-sm",
                  row.kind === "minus" && "pl-4 text-muted-foreground",
                  (row.kind === "total" || row.kind === "base") && "font-semibold",
                  row.kind === "result" && "font-display text-base font-semibold",
                )}
              >
                {row.kind === "minus" ? "(−) " : row.kind === "total" || row.kind === "result" ? "(=) " : ""}
                {row.label}
              </span>
              <span
                className={cn(
                  "num text-right",
                  row.kind === "minus" && "text-danger",
                  row.kind === "total" && "font-semibold",
                  row.kind === "base" && "font-semibold",
                  row.kind === "result" && cn("font-display text-lg font-semibold", positive ? "text-success" : "text-danger"),
                )}
              >
                {row.kind === "minus" && row.value !== 0 ? "− " : ""}
                {formatCurrency(Math.abs(row.value))}
              </span>
              <span className="num hidden text-right text-xs text-muted-foreground sm:block">{share(row.value)}</span>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Panel title="Fluxo de caixa" icon={Wallet} {...rise(5)}>
          <dl className="space-y-3 text-sm">
            {[
              { label: "Entradas (vendas)", value: cash.inflows, tone: "text-success", sign: "+" },
              { label: "Parcelas recebidas", value: cash.installmentsReceived, tone: "text-success", sign: "+" },
              { label: "Saídas (contas pagas)", value: cash.outflows, tone: "text-danger", sign: "−" },
            ].map((r) => (
              <div key={r.label} className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">{r.label}</dt>
                <dd className={cn("num font-medium", r.tone)}>
                  {r.sign} {formatCurrency(r.value)}
                </dd>
              </div>
            ))}
            <div className="gold-rule" />
            <div className="flex items-baseline justify-between gap-3">
              <dt className="font-semibold">Saldo do período</dt>
              <dd className={cn("num font-display text-xl font-semibold", cash.netCashFlow >= 0 ? "text-success" : "text-danger")}>
                {formatCurrency(cash.netCashFlow)}
              </dd>
            </div>
          </dl>
        </Panel>

        <Panel title="Pendências do período" description="Vencimentos dentro do período" icon={Receipt} {...rise(6)}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
            <div className="rounded-xl border border-border bg-info-soft/60 p-4">
              <p className="eyebrow text-info">A receber</p>
              <p className="num mt-1 font-display text-2xl font-semibold">{formatCurrency(data.receivables.pending)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {plural(data.receivables.pendingCount, "parcela pendente", "parcelas pendentes")}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-warning-soft/60 p-4">
              <p className="eyebrow text-warning">A pagar</p>
              <p className="num mt-1 font-display text-2xl font-semibold">{formatCurrency(data.payables.pending)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {plural(data.payables.pendingCount, "conta pendente", "contas pendentes")}
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ─── Estoque ──────────────────────────────────────────────── */

function StockTab({ data }: { data: StockReportData }) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const s = data.summary;

  const categories = useMemo(() => [...data.byCategory].sort((a, b) => b.totalValue - a.totalValue), [data]);
  const lowStock = useMemo(() => [...data.lowStock].sort((a, b) => a.stock - b.stock), [data]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.products;
    return data.products.filter((p) =>
      [p.name, p.brand, p.model, p.barcode, p.category?.name].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [data, query]);
  const products = expanded ? filtered : filtered.slice(0, 25);

  if (s.totalProducts === 0) {
    return (
      <Panel>
        <EmptyState icon={Package} title="Nenhum produto cadastrado" description="Cadastre produtos para acompanhar o estoque." />
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          featured
          label="Valor de venda em estoque"
          value={formatCurrency(s.totalSellingValue)}
          hint={`${plural(s.totalItems, "unidade", "unidades")} em ${plural(s.totalProducts, "produto", "produtos")}`}
          icon={Crown}
          className={cn("col-span-2 lg:col-span-1", rise(0).className)}
          style={rise(0).style}
        />
        <StatCard label="Valor de custo" value={formatCurrency(s.totalCostValue)} hint="Capital investido" icon={Wallet} tone="navy" {...rise(1)} />
        <StatCard
          label="Lucro potencial"
          value={formatCurrency(s.totalSellingValue - s.totalCostValue)}
          icon={PiggyBank}
          tone="success"
          {...rise(2)}
        />
        <StatCard
          label="Estoque baixo"
          value={<span className="num">{s.lowStockCount}</span>}
          hint={`${plural(s.outOfStockCount, "zerado", "zerados")}`}
          icon={AlertTriangle}
          tone={s.lowStockCount > 0 ? "danger" : "neutral"}
          className={cn("col-span-2 lg:col-span-1", rise(3).className)}
          style={rise(3).style}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Panel title="Estoque por categoria" description="Unidades em estoque" icon={Boxes} bodyClassName="px-2 pb-4 pt-4 sm:px-4" {...rc(4, "lg:col-span-3")}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={categories} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis
                dataKey="name"
                {...chartAxisProps}
                interval={0}
                tickFormatter={(v: string) => (v.length > 10 ? `${v.slice(0, 9)}…` : v)}
              />
              <YAxis {...chartAxisProps} width={40} allowDecimals={false} />
              <Tooltip
                {...chartTooltipProps}
                formatter={(v: number, _n, item) => [
                  `${v} un. · ${formatCurrency(item?.payload?.totalValue ?? 0)}`,
                  "Estoque",
                ]}
              />
              <Bar dataKey="totalStock" radius={[6, 6, 0, 0]} maxBarSize={44}>
                {categories.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Valor por categoria" icon={Layers} {...rc(5, "lg:col-span-2")}>
          <ul className="space-y-3">
            {categories.map((c, i) => (
              <li key={c.name} className="flex items-center gap-2.5 text-sm">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                <span className="min-w-0 flex-1 truncate">
                  {c.name} <span className="text-xs text-muted-foreground">· {plural(c.count, "produto", "produtos")}</span>
                </span>
                <span className="num font-medium">{formatCurrency(c.totalValue)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {lowStock.length > 0 && (
        <Panel
          title="Reposição necessária"
          description="Produtos no estoque mínimo ou abaixo"
          icon={AlertTriangle}
          bodyClassName="p-0"
          {...rise(6)}
        >
          <ul className="divide-y divide-border md:hidden">
            {lowStock.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.category?.name ?? "—"} · mínimo {p.minStock}
                  </p>
                </div>
                <span className="num font-display text-lg font-semibold">{p.stock}</span>
                <StatusPill tone={p.stock === 0 ? "danger" : "warning"}>{p.stock === 0 ? "Zerado" : "Baixo"}</StatusPill>
              </li>
            ))}
          </ul>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                  <TableHead className="text-right">Mínimo</TableHead>
                  <TableHead className="pr-5">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStock.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="pl-5 font-medium">{p.name}</TableCell>
                    <TableCell>{p.category?.name ?? "—"}</TableCell>
                    <TableCell>{p.supplier?.name ?? "—"}</TableCell>
                    <TableCell className="num text-right font-semibold">{p.stock}</TableCell>
                    <TableCell className="num text-right text-muted-foreground">{p.minStock}</TableCell>
                    <TableCell className="pr-5">
                      <StatusPill tone={p.stock === 0 ? "danger" : "warning"}>{p.stock === 0 ? "Zerado" : "Baixo"}</StatusPill>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>
      )}

      <Panel
        title="Posição completa do estoque"
        description={plural(filtered.length, "produto", "produtos")}
        icon={Package}
        bodyClassName="p-0"
        actions={
          <div className="relative w-full sm:w-64 print:hidden">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar produto, marca, código…"
              className="h-9 pl-9"
            />
          </div>
        }
        {...rise(7)}
      >
        {filtered.length === 0 ? (
          <EmptyState icon={Search} title="Nenhum produto encontrado" description="Tente outro termo de busca." className="py-10" />
        ) : (
          <>
            <ul className="divide-y divide-border md:hidden">
              {products.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[p.category?.name, p.brand].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn("num text-sm font-semibold", p.stock <= p.minStock && "text-danger")}>{p.stock} un.</p>
                    <p className="num text-[11px] text-muted-foreground">{formatCurrency(p.sellingPrice)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">Produto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead className="text-right">Estoque</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                    <TableHead className="text-right">Venda</TableHead>
                    <TableHead className="pr-5 text-right">Valor total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="pl-5 font-medium">{p.name}</TableCell>
                      <TableCell>{p.category?.name ?? "—"}</TableCell>
                      <TableCell>{p.brand || "—"}</TableCell>
                      <TableCell className={cn("num text-right font-semibold", p.stock <= p.minStock && "text-danger")}>
                        {p.stock}
                      </TableCell>
                      <TableCell className="num text-right text-muted-foreground">{formatCurrency(p.totalCost)}</TableCell>
                      <TableCell className="num text-right">{formatCurrency(p.sellingPrice)}</TableCell>
                      <TableCell className="num pr-5 text-right font-semibold">{formatCurrency(p.stock * p.sellingPrice)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ShowMore total={filtered.length} shown={25} expanded={expanded} onToggle={() => setExpanded((v) => !v)} />
          </>
        )}
      </Panel>
    </div>
  );
}

/* ─── Clientes ─────────────────────────────────────────────── */

function CustomersTab({ data, onOpenCustomer }: { data: CustomerReportData; onOpenCustomer: (id: string) => void }) {
  const ranking = data.topCustomers.filter((c) => c.orderCount > 0);
  const owed = data.debtors.reduce((sum, d) => sum + d.totalOwed, 0);
  const rankingTotal = ranking.reduce((sum, c) => sum + c.totalSpent, 0);
  const maxSpent = ranking[0]?.totalSpent || 1;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          featured
          label="Novos clientes no período"
          value={<span className="num">{data.newCustomers.count}</span>}
          icon={UserPlus}
          className={cn("col-span-2 lg:col-span-1", rise(0).className)}
          style={rise(0).style}
        />
        <StatCard
          label="Clientes no ranking"
          value={<span className="num">{ranking.length}</span>}
          hint={`${formatCurrency(rankingTotal)} em compras`}
          icon={Award}
          tone="gold"
          {...rise(1)}
        />
        <StatCard
          label="Inadimplentes"
          value={<span className="num">{data.debtors.length}</span>}
          icon={AlertTriangle}
          tone={data.debtors.length > 0 ? "danger" : "neutral"}
          {...rise(2)}
        />
        <StatCard
          label="Total em atraso"
          value={formatCurrency(owed)}
          icon={Wallet}
          tone={owed > 0 ? "warning" : "neutral"}
          className={cn("col-span-2 lg:col-span-1", rise(3).className)}
          style={rise(3).style}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Panel
          title="Ranking de clientes"
          description="Por valor total de compras (histórico)"
          icon={Crown}
          bodyClassName="p-0"
          {...rc(4, "xl:col-span-3")}
        >
          {ranking.length === 0 ? (
            <EmptyState icon={Users} title="Nenhuma compra registrada" className="py-10" />
          ) : (
            <ul className="divide-y divide-border">
              {ranking.slice(0, 20).map((c, i) => (
                <li key={c.id}>
                  <button
                    onClick={() => onOpenCustomer(c.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent sm:px-5"
                  >
                    <RankBadge i={i} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="truncate text-sm font-medium">{c.name}</p>
                        <p className="num shrink-0 font-display text-sm font-semibold">{formatCurrency(c.totalSpent)}</p>
                      </div>
                      <div className="mt-1 flex items-center gap-3">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn("h-full rounded-full", i === 0 ? "bg-gold" : "bg-primary/60")}
                            style={{ width: `${Math.max(4, (c.totalSpent / maxSpent) * 100)}%` }}
                          />
                        </div>
                        <span className="num shrink-0 text-[11px] text-muted-foreground">
                          {plural(c.orderCount, "compra", "compras")}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-6 xl:col-span-2">
          <Panel title="Clientes inadimplentes" description="Parcelas vencidas e não pagas" icon={AlertTriangle} bodyClassName="p-0" {...rise(5)}>
            {data.debtors.length === 0 ? (
              <EmptyState icon={Wallet} title="Nenhum cliente em atraso" description="Todas as parcelas estão em dia." className="py-10" />
            ) : (
              <ul className="divide-y divide-border">
                {data.debtors.map((d) => (
                  <li key={d.customer.id}>
                    <button
                      onClick={() => onOpenCustomer(d.customer.id)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent sm:px-5"
                    >
                      <InitialsAvatar name={d.customer.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{d.customer.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {d.customer.phone || "Sem telefone"} · {plural(d.installments, "parcela", "parcelas")}
                        </p>
                      </div>
                      <span className="num font-display text-sm font-semibold text-danger">{formatCurrency(d.totalOwed)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Novos clientes" description="Cadastrados no período" icon={UserPlus} bodyClassName="p-0" {...rise(6)}>
            {data.newCustomers.customers.length === 0 ? (
              <EmptyState icon={UserPlus} title="Nenhum cadastro no período" className="py-10" />
            ) : (
              <ul className="max-h-[360px] divide-y divide-border overflow-y-auto">
                {data.newCustomers.customers.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => onOpenCustomer(c.id)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent sm:px-5"
                    >
                      <InitialsAvatar name={c.name} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.name}</span>
                      <span className="num text-xs text-muted-foreground">{formatDate(c.createdAt)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
