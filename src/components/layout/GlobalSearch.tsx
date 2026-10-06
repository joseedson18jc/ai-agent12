import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users, Package, ShoppingCart, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import customerService from "@/services/customer.service";
import productService from "@/services/product.service";
import salesService from "@/services/sales.service";

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: "customer" | "product" | "sale";
  path: string;
}

const typeConfig = {
  customer: {
    label: "Clientes",
    icon: Users,
    color: "text-blue-600 bg-blue-50",
  },
  product: {
    label: "Produtos",
    icon: Package,
    color: "text-green-600 bg-green-50",
  },
  sale: {
    label: "Vendas",
    icon: ShoppingCart,
    color: "text-purple-600 bg-purple-50",
  },
};

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsSearching(true);

    try {
      const [customersRes, productsRes, salesRes] = await Promise.allSettled([
        customerService.getAll(searchQuery, 1, 5),
        productService.getAll({ search: searchQuery, page: 1, limit: 5 }),
        salesService.getAll({ page: 1, limit: 5 }),
      ]);

      const searchResults: SearchResult[] = [];

      if (customersRes.status === "fulfilled" && customersRes.value.data) {
        customersRes.value.data.forEach((customer) => {
          searchResults.push({
            id: customer.id,
            title: customer.name,
            subtitle: customer.cpf || customer.phone || customer.email || "",
            type: "customer",
            path: `/clientes/${customer.id}`,
          });
        });
      }

      if (productsRes.status === "fulfilled" && productsRes.value.data) {
        productsRes.value.data.forEach((product) => {
          searchResults.push({
            id: product.id,
            title: product.name,
            subtitle: `${product.brand || ""} ${product.model || ""}`.trim() || product.sku || "",
            type: "product",
            path: `/produtos/${product.id}`,
          });
        });
      }

      if (salesRes.status === "fulfilled" && salesRes.value.data) {
        salesRes.value.data
          .filter(
            (sale) =>
              sale.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
              sale.customer?.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .forEach((sale) => {
            searchResults.push({
              id: sale.id,
              title: `OS #${sale.orderNumber}`,
              subtitle: sale.customer?.name || "",
              type: "sale",
              path: `/vendas/${sale.id}`,
            });
          });
      }

      setResults(searchResults);
      setIsOpen(searchResults.length > 0);
      setSelectedIndex(-1);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, performSearch]);

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (result: SearchResult) => {
    navigate(result.path);
    setQuery("");
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < results.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : results.length - 1
      );
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  // Agrupar resultados por tipo
  const groupedResults = results.reduce<Record<string, SearchResult[]>>(
    (acc, result) => {
      if (!acc[result.type]) acc[result.type] = [];
      acc[result.type].push(result);
      return acc;
    },
    {}
  );

  let flatIndex = -1;

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Buscar clientes, produtos, vendas..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          className="pl-10 pr-10 h-10 bg-gray-50 border-gray-200 focus:bg-white"
        />
        {query && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
              inputRef.current?.focus();
            }}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown de resultados */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50 max-h-96 overflow-y-auto">
          {isSearching ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              Buscando...
            </div>
          ) : (
            Object.entries(groupedResults).map(([type, items]) => {
              const config = typeConfig[type as keyof typeof typeConfig];
              const Icon = config.icon;

              return (
                <div key={type}>
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <Icon className="h-3.5 w-3.5" />
                      {config.label}
                    </div>
                  </div>
                  {items.map((result) => {
                    flatIndex++;
                    const currentIndex = flatIndex;

                    return (
                      <button
                        key={result.id}
                        className={cn(
                          "flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors",
                          selectedIndex === currentIndex && "bg-blue-50"
                        )}
                        onClick={() => handleSelect(result)}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                      >
                        <div
                          className={cn(
                            "flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0",
                            config.color
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {result.title}
                          </p>
                          {result.subtitle && (
                            <p className="text-xs text-gray-500 truncate">
                              {result.subtitle}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
