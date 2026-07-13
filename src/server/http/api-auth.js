import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/utils/prisma";
import { forbidden, unauthorized } from "./api-errors";

function getBearerToken(request) {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function createApiAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase API auth environment variables are not configured.");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export async function requireApiUser(request) {
  const token = getBearerToken(request);
  if (!token) throw unauthorized();

  const supabase = createApiAuthClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) {
    throw unauthorized("유효하지 않거나 만료된 로그인 정보입니다.", "INVALID_TOKEN");
  }

  return {
    id: data.user.id,
    email: data.user.email || "",
    metadata: data.user.user_metadata || {},
  };
}

export async function requireApiBuyer(request) {
  const authUser = await requireApiUser(request);
  const account = await prisma.user.findFirst({
    where: { id: authUser.id, deletedAt: null },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      defaultShippingName: true,
      defaultShippingPhone: true,
      defaultShippingAddress: true,
      defaultShippingAddressDetail: true,
    },
  });

  if (!account) {
    throw unauthorized("구매자 계정 정보를 확인할 수 없습니다.", "BUYER_ACCOUNT_NOT_FOUND");
  }
  if (account.role !== "BUYER") {
    throw forbidden("구매자 계정으로 로그인해 주세요.", "BUYER_ACCESS_REQUIRED");
  }

  return { ...authUser, account };
}
