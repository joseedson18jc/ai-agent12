import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Download, ExternalLink } from "lucide-react";
import { useInvoices } from "@/hooks/useInvoices";

const statusLabels: Record<string, string> = {
  paid: "Paga",
  open: "Aberta",
  draft: "Rascunho",
  void: "Cancelada",
  uncollectible: "Inadimplente",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  paid: "default",
  open: "secondary",
  draft: "outline",
  void: "destructive",
  uncollectible: "destructive",
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

export function InvoiceHistory() {
  const { data: invoices, isLoading } = useInvoices();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Histórico de Faturas
        </CardTitle>
        <CardDescription>Suas faturas e pagamentos anteriores</CardDescription>
      </CardHeader>
      <CardContent>
        {!invoices || invoices.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">Nenhuma fatura encontrada.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    {new Date(invoice.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>{formatCurrency(invoice.amount_due, invoice.currency)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[invoice.status] || "outline"}>
                      {statusLabels[invoice.status] || invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {invoice.invoice_url && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={invoice.invoice_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {invoice.invoice_pdf && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={invoice.invoice_pdf} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
