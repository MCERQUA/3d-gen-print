import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { stripe, getCreditPackage } from "@/lib/stripe";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { packageId } = body;

    const creditPackage = getCreditPackage(packageId);
    if (!creditPackage) {
      return NextResponse.json(
        { message: "Invalid package" },
        { status: 400 }
      );
    }

    // Get user email for Stripe
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: user?.email || undefined,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${creditPackage.name} - ${creditPackage.credits} Credits`,
              description: creditPackage.description,
            },
            unit_amount: creditPackage.price,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        packageId: creditPackage.id,
        credits: creditPackage.credits.toString(),
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/credits?success=true&credits=${creditPackage.credits}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/credits?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
