import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { message: "Missing signature" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json(
      { message: "Invalid signature" },
      { status: 400 }
    );
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      const userId = session.metadata?.userId;
      const credits = parseInt(session.metadata?.credits || "0", 10);
      const packageId = session.metadata?.packageId;

      if (!userId || !credits) {
        console.error("Missing metadata in checkout session");
        break;
      }

      try {
        // Add credits to user
        await db.user.update({
          where: { id: userId },
          data: {
            credits: { increment: credits },
          },
        });

        // Create transaction record
        await db.transaction.create({
          data: {
            userId,
            type: "PURCHASE",
            amount: credits,
            description: `Purchased ${credits} credits (${packageId} package)`,
            stripePaymentId: session.payment_intent as string,
          },
        });

        // Save credit package purchase record
        await db.creditPackage.create({
          data: {
            userId,
            packageId: packageId || "unknown",
            credits,
            amountPaid: session.amount_total || 0,
            stripeSessionId: session.id,
          },
        });

        console.log(`Added ${credits} credits to user ${userId}`);
      } catch (error) {
        console.error("Failed to add credits:", error);
        return NextResponse.json(
          { message: "Failed to process payment" },
          { status: 500 }
        );
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.error("Payment failed:", paymentIntent.last_payment_error?.message);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
