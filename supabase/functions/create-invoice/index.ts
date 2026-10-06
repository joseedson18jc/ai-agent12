import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { description, amount, currency } = await req.json();
    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: "Valor inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2023-10-16",
    });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: customerData } = await supabaseAdmin
      .from("customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!customerData?.stripe_customer_id) {
      return new Response(JSON.stringify({ error: "Cliente não encontrado. Faça uma assinatura primeiro." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const invoice = await stripe.invoices.create({
      customer: customerData.stripe_customer_id,
      auto_advance: true,
      collection_method: "send_invoice",
      days_until_due: 30,
      metadata: { supabase_user_id: user.id },
    });

    await stripe.invoiceItems.create({
      customer: customerData.stripe_customer_id,
      invoice: invoice.id,
      amount: amount,
      currency: currency || "brl",
      description: description || "Serviço Insight Finance",
    });

    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

    await supabaseAdmin.from("invoices").upsert({
      user_id: user.id,
      stripe_invoice_id: finalizedInvoice.id,
      stripe_customer_id: customerData.stripe_customer_id,
      status: finalizedInvoice.status ?? "open",
      amount_due: finalizedInvoice.amount_due,
      amount_paid: finalizedInvoice.amount_paid ?? 0,
      currency: finalizedInvoice.currency,
      invoice_url: finalizedInvoice.hosted_invoice_url ?? null,
      invoice_pdf: finalizedInvoice.invoice_pdf ?? null,
      metadata: finalizedInvoice.metadata ?? {},
    }, { onConflict: "stripe_invoice_id" });

    return new Response(JSON.stringify({
      id: finalizedInvoice.id,
      url: finalizedInvoice.hosted_invoice_url,
      pdf: finalizedInvoice.invoice_pdf,
      status: finalizedInvoice.status,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
