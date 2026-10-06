import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

serve(async (req) => {
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
    apiVersion: "2023-10-16",
  });

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing stripe-signature" }), { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? ""
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        if (!userId) break;

        const { data: customer } = await supabaseAdmin.from("customers").upsert({
          user_id: userId,
          stripe_customer_id: session.customer as string,
          email: session.customer_details?.email ?? "",
        }, { onConflict: "user_id" }).select("id").single();

        if (!customer) break;

        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          await supabaseAdmin.from("subscriptions").upsert({
            customer_id: customer.id,
            stripe_subscription_id: subscription.id,
            status: subscription.status,
            stripe_price_id: subscription.items.data[0]?.price.id ?? "",
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            metadata: subscription.metadata ?? {},
          }, { onConflict: "stripe_subscription_id" });
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeCustomerId = subscription.customer as string;

        const { data: customer } = await supabaseAdmin
          .from("customers")
          .select("id")
          .eq("stripe_customer_id", stripeCustomerId)
          .maybeSingle();

        if (!customer) break;

        await supabaseAdmin.from("subscriptions").upsert({
          customer_id: customer.id,
          stripe_subscription_id: subscription.id,
          status: subscription.status,
          stripe_price_id: subscription.items.data[0]?.price.id ?? "",
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          canceled_at: subscription.canceled_at
            ? new Date(subscription.canceled_at * 1000).toISOString()
            : null,
          metadata: subscription.metadata ?? {},
        }, { onConflict: "stripe_subscription_id" });
        break;
      }

      case "invoice.paid":
      case "invoice.payment_failed":
      case "invoice.finalized": {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeCustomerId = invoice.customer as string;

        const { data: customer } = await supabaseAdmin
          .from("customers")
          .select("id")
          .eq("stripe_customer_id", stripeCustomerId)
          .maybeSingle();

        if (!customer) break;

        await supabaseAdmin.from("invoices").upsert({
          customer_id: customer.id,
          stripe_invoice_id: invoice.id,
          stripe_subscription_id: (invoice.subscription as string) ?? null,
          status: invoice.status ?? "draft",
          amount_due: invoice.amount_due,
          amount_paid: invoice.amount_paid,
          currency: invoice.currency,
          hosted_invoice_url: invoice.hosted_invoice_url ?? null,
          invoice_url: invoice.invoice_pdf ?? null,
          metadata: invoice.metadata ?? {},
        }, { onConflict: "stripe_invoice_id" });
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook processing error:", err.message);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
