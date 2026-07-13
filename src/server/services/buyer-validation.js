import { badRequest } from "@/server/http/api-errors";

export function cleanBuyerText(value) {
  return String(value || "").trim();
}

export function requireBuyerId(value, label) {
  const clean = cleanBuyerText(value);
  if (!clean || clean.length > 100) {
    throw badRequest(`올바른 ${label}를 입력해 주세요.`);
  }
  return clean;
}

export function normalizeBuyerPhone(value) {
  const digits = cleanBuyerText(value).replace(/\D/g, "");
  if (!/^01[016789]\d{7,8}$/.test(digits)) {
    throw badRequest("올바른 휴대폰 번호를 입력해 주세요.");
  }
  return digits;
}

export function validateBuyerShippingProfile(input = {}) {
  const name = cleanBuyerText(input.name);
  const phone = normalizeBuyerPhone(input.phone);
  const address = cleanBuyerText(input.address);
  const addressDetail = cleanBuyerText(input.addressDetail);

  if (!name) throw badRequest("이름을 입력해 주세요.");
  if (name.length > 50) throw badRequest("이름은 50자 이하여야 합니다.");
  if (!address) throw badRequest("배송지 주소를 입력해 주세요.");
  if (address.length > 300) throw badRequest("배송지 주소는 300자 이하여야 합니다.");
  if (addressDetail.length > 100) throw badRequest("상세 주소는 100자 이하여야 합니다.");

  return { name, phone, address, addressDetail };
}
