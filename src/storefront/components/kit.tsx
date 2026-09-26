import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useStoreInfo } from "../lib/api";
import { whatsappLink } from "../lib/store";

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1320px] px-4 sm:px-6 lg:px-10", className)}>{children}</div>;
}

/** WhatsApp-style glyph (speech bubble with handset). */
export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12.04 2a9.9 9.9 0 0 0-8.53 14.94L2 22l5.2-1.46A9.9 9.9 0 1 0 12.04 2Zm0 18.05a8.1 8.1 0 0 1-4.14-1.13l-.3-.18-3.08.86.82-3-.2-.31a8.14 8.14 0 1 1 6.9 3.76Zm4.46-6.08c-.24-.12-1.45-.72-1.67-.8-.23-.08-.39-.12-.55.12-.16.25-.63.8-.78.97-.14.16-.28.18-.53.06a6.66 6.66 0 0 1-3.3-2.88c-.25-.43.25-.4.71-1.33.08-.16.04-.3-.02-.42-.06-.12-.55-1.32-.75-1.8-.2-.48-.4-.41-.55-.42h-.47a.9.9 0 0 0-.65.3 2.73 2.73 0 0 0-.85 2.03 4.74 4.74 0 0 0 1 2.52 10.86 10.86 0 0 0 4.15 3.67c1.55.67 2.16.72 2.93.6.47-.07 1.45-.59 1.66-1.17.2-.57.2-1.06.14-1.17-.06-.1-.22-.16-.47-.28Z" />
    </svg>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = "left",
  className,
  id,
  dark,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  align?: "left" | "center";
  className?: string;
  id?: string;
  dark?: boolean;
}) {
  return (
    <div
      className={cn(
        "mb-8 flex flex-col gap-4 sm:mb-10",
        align === "center" ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow && (
          <p className={cn("eyebrow mb-3 flex items-center gap-2 !text-gold", align === "center" && "justify-center")}>
            <span className="h-px w-6 bg-gold" aria-hidden="true" />
            {eyebrow}
          </p>
        )}
        <h2
          id={id}
          className={cn(
            "font-display text-[1.9rem] font-medium leading-[1.08] sm:text-[2.6rem]",
            dark ? "text-white" : "text-foreground",
          )}
        >
          {title}
        </h2>
        {description && (
          <p className={cn("mt-3 text-[15px] leading-relaxed sm:text-base", dark ? "text-sidebar-foreground/75" : "text-muted-foreground")}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Gold italic emphasis inside Fraunces headlines. */
export function Em({ children }: { children: ReactNode }) {
  return <em className="font-display italic text-gold [font-variation-settings:'opsz'_144]">{children}</em>;
}

export function WhatsAppButton({
  message,
  children,
  className,
  variant = "whatsapp",
  size = "lg",
}: {
  message: string;
  children: ReactNode;
  className?: string;
  variant?: "whatsapp" | "outline" | "ghost-dark";
  size?: "lg" | "default" | "sm";
}) {
  const { data: store } = useStoreInfo();
  const href = whatsappLink(store, message);
  if (!href) return null;
  const styles = {
    whatsapp: "bg-success text-white hover:bg-success/90 shadow-sm",
    outline: "border border-success/40 bg-card text-success hover:bg-success-soft",
    "ghost-dark": "border border-white/20 bg-white/5 text-white hover:bg-white/10",
  }[variant];
  const sizes = { lg: "h-12 px-6 text-[15px]", default: "h-11 px-5 text-sm", sm: "h-9 px-3.5 text-sm" }[size];
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        styles,
        sizes,
        className,
      )}
    >
      <WhatsAppIcon className="h-[18px] w-[18px] shrink-0" />
      {children}
    </a>
  );
}

export function ErrorBlock({
  title = "Não conseguimos carregar agora",
  onRetry,
  className,
}: {
  title?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-3xl border border-dashed border-border bg-card/60 px-6 py-12 text-center", className)} role="alert">
      <p className="font-display text-xl font-medium">{title}</p>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Pode ser a conexão. Tente de novo — ou fale direto com a gente, respondemos pelo WhatsApp.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {onRetry && (
          <Button variant="outline" className="h-11 rounded-full px-5" onClick={onRetry}>
            <RotateCcw /> Tentar de novo
          </Button>
        )}
        <WhatsAppButton message="Olá! Tentei ver os produtos no site e não carregou. Podem me ajudar?" size="default">
          Chamar no WhatsApp
        </WhatsAppButton>
      </div>
    </div>
  );
}

/** Accessible slide-over panel built on Radix Dialog. */
export function SlideOver({
  open,
  onOpenChange,
  side = "right",
  title,
  description,
  children,
  footer,
  className,
  hideHeader,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  side?: "right" | "left" | "bottom" | "top";
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  hideHeader?: boolean;
}) {
  const pos = {
    right: "inset-y-0 right-0 h-full w-[92vw] max-w-md border-l data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
    left: "inset-y-0 left-0 h-full w-[86vw] max-w-sm border-r data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left",
    bottom: "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-3xl border-t data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
    top: "inset-x-0 top-0 max-h-[92dvh] rounded-b-3xl border-b data-[state=open]:slide-in-from-top data-[state=closed]:slide-out-to-top",
  }[side];
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-primary/35 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed z-50 flex flex-col bg-background shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:duration-300 data-[state=closed]:duration-200 motion-reduce:!animate-none",
            pos,
            className,
          )}
        >
          <div
            className={cn(
              "flex items-start justify-between gap-4 border-b border-border px-5 py-4",
              hideHeader && "absolute right-2 top-2 z-10 border-0 p-2 sm:right-4 sm:top-4",
            )}
          >
            <div className={cn("min-w-0", hideHeader && "sr-only")}>
              <DialogPrimitive.Title className="font-display text-xl font-medium leading-tight">{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-0.5 text-sm text-muted-foreground">{description}</DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">{typeof title === "string" ? title : "Painel"}</DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              className="-mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
          {footer && <div className="border-t border-border bg-card px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Visually hidden honeypot — bots fill it, people never see it. */
export function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
      <label>
        Não preencha este campo
        <input type="text" name="website" tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}
