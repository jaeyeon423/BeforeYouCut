import { notFound } from "next/navigation";
import AppCheckoutScreen from "@/components/screens/app-checkout";
import siteConfig from "@/site.config";
import { ApiError } from "@/server/http/api-errors";
import { fetchAppCheckoutSession, resolveCheckoutOrigin } from "@/server/services/checkout-service";

export const metadata = { title: "결제 - 미용사" };
export const runtime = "nodejs";

export default async function AppCheckoutPage({ params }) {
  const { token } = await params;
  let checkout;
  try {
    const origin = resolveCheckoutOrigin(process.env.NEXT_PUBLIC_SITE_URL || siteConfig.service.url);
    checkout = await fetchAppCheckoutSession({ token, origin });
  } catch (error) {
    if (error instanceof ApiError && [404, 409].includes(error.status)) notFound();
    throw error;
  }
  return <AppCheckoutScreen checkout={checkout} />;
}
