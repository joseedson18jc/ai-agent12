import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import CustomerForm from "./pages/CustomerForm";
import CustomerDetail from "./pages/CustomerDetail";
import Products from "./pages/Products";
import ProductForm from "./pages/ProductForm";
import Sales from "./pages/Sales";
import SalesForm from "./pages/SalesForm";
import SalesDetail from "./pages/SalesDetail";
import Financial from "./pages/Financial";
import Suppliers from "./pages/Suppliers";
import SupplierForm from "./pages/SupplierForm";
import Laboratories from "./pages/Laboratories";
import Prescriptions from "./pages/Prescriptions";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Auth */}
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Dashboard */}
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Clientes */}
            <Route path="/clientes" element={<Customers />} />
            <Route path="/clientes/novo" element={<CustomerForm />} />
            <Route path="/clientes/:id" element={<CustomerDetail />} />
            <Route path="/clientes/:id/editar" element={<CustomerForm />} />

            {/* Produtos */}
            <Route path="/produtos" element={<Products />} />
            <Route path="/produtos/novo" element={<ProductForm />} />
            <Route path="/produtos/:id/editar" element={<ProductForm />} />

            {/* Vendas / OS */}
            <Route path="/vendas" element={<Sales />} />
            <Route path="/vendas/nova" element={<SalesForm />} />
            <Route path="/vendas/:id" element={<SalesDetail />} />

            {/* Financeiro */}
            <Route path="/financeiro" element={<Financial />} />
            <Route path="/financeiro/contas-pagar" element={<Financial />} />
            <Route path="/financeiro/contas-receber" element={<Financial />} />
            <Route path="/financeiro/caixa" element={<Financial />} />

            {/* Fornecedores */}
            <Route path="/fornecedores" element={<Suppliers />} />
            <Route path="/fornecedores/novo" element={<SupplierForm />} />
            <Route path="/fornecedores/:id/editar" element={<SupplierForm />} />

            {/* Laboratórios */}
            <Route path="/laboratorios" element={<Laboratories />} />

            {/* Receitas */}
            <Route path="/receitas" element={<Prescriptions />} />

            {/* Relatórios */}
            <Route path="/relatorios" element={<Reports />} />

            {/* Configurações */}
            <Route path="/configuracoes" element={<Settings />} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
