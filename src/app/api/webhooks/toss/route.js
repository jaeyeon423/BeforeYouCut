import crypto from "crypto";
import { handleTossPaymentWebhook } from "@/server/services/payment-service";

export const runtime = "nodejs";

function cleanText(value) {
  return String(value || "").trim();
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function isAuthorized(request) {
  const secret = cleanText(process.env.TOSS_WEBHOOK_SECRET);
  const url = new URL(request.url);
  const presentedSecret =
    cleanText(request.headers.get("x-webhook-secret")) ||
    cleanText(request.headers.get("x-toss-webhook-secret")) ||
    cleanText(url.searchParams.get("token"));

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  return Boolean(presentedSecret) && safeEqual(presentedSecret, secret);
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(await request.text());
  } catch {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  try {
    const result = await handleTossPaymentWebhook(payload);
    return Response.json(result);
  } catch (error) {
    console.error("Failed to process Toss Payments webhook:", error);
    return Response.json({ error: error.message || "Webhook processing failed" }, { status: 400 });
  }
}
