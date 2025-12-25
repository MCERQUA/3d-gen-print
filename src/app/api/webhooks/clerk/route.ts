import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("Missing CLERK_WEBHOOK_SECRET");
    return new NextResponse("Webhook secret not configured", { status: 500 });
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse("Missing svix headers", { status: 400 });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new NextResponse("Error verifying webhook", { status: 400 });
  }

  const eventType = evt.type;

  // Handle user.created event
  if (eventType === "user.created") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    const primaryEmail = email_addresses?.[0]?.email_address;

    if (!primaryEmail) {
      return new NextResponse("No email address found", { status: 400 });
    }

    try {
      await db.user.create({
        data: {
          id,
          email: primaryEmail,
          firstName: first_name || null,
          lastName: last_name || null,
          imageUrl: image_url || null,
          credits: 25, // Signup bonus!
        },
      });

      // Create bonus transaction
      await db.transaction.create({
        data: {
          userId: id,
          type: "BONUS",
          amount: 25,
          description: "Welcome bonus - 25 free credits!",
        },
      });

      console.log(`User created: ${id} with 25 bonus credits`);
    } catch (error) {
      console.error("Error creating user:", error);
      return new NextResponse("Error creating user", { status: 500 });
    }
  }

  // Handle user.updated event
  if (eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    const primaryEmail = email_addresses?.[0]?.email_address;

    try {
      await db.user.update({
        where: { id },
        data: {
          email: primaryEmail,
          firstName: first_name || null,
          lastName: last_name || null,
          imageUrl: image_url || null,
        },
      });

      console.log(`User updated: ${id}`);
    } catch (error) {
      console.error("Error updating user:", error);
      // User might not exist yet, try to create
      if (primaryEmail) {
        await db.user.create({
          data: {
            id,
            email: primaryEmail,
            firstName: first_name || null,
            lastName: last_name || null,
            imageUrl: image_url || null,
            credits: 25,
          },
        });
      }
    }
  }

  // Handle user.deleted event
  if (eventType === "user.deleted") {
    const { id } = evt.data;

    if (id) {
      try {
        await db.user.delete({
          where: { id },
        });
        console.log(`User deleted: ${id}`);
      } catch (error) {
        console.error("Error deleting user:", error);
      }
    }
  }

  return new NextResponse("Webhook processed", { status: 200 });
}
