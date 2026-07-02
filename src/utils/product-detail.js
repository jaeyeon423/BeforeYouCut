export const PRODUCT_DETAIL_FIELDS = [
  {
    id: "intro",
    key: "상세 소개",
    label: "상세 소개",
    help: "상품 상세 상단과 상세 내용에 노출되는 긴 소개 문구입니다.",
    placeholder: "예: 커트 현장에서 반복 사용해도 손목 부담을 줄이도록 균형을 잡은 블렌딩 가위입니다. 추천 사용 대상과 차별점을 함께 적어 주세요.",
  },
  {
    id: "highlights",
    key: "핵심 포인트",
    label: "핵심 포인트",
    help: "한 줄에 하나씩 입력하면 구매자 화면에 체크 리스트로 표시됩니다.",
    placeholder: "예:\n장시간 커트에도 안정적인 무게 중심\n모발 밀림을 줄이는 세라믹 코팅\n초보자도 관리하기 쉬운 기본 날각",
  },
  {
    id: "usage",
    key: "사용/관리 팁",
    label: "사용/관리 팁",
    help: "사용 방법, 보관법, 관리 주의사항을 줄 단위로 적습니다.",
    placeholder: "예:\n사용 후 마른 천으로 날을 닦아 주세요.\n습기가 적은 케이스에 보관해 주세요.\n낙하나 충격이 생기면 사용 전 날 상태를 확인해 주세요.",
  },
  {
    id: "shipping",
    key: "배송 안내",
    label: "배송 안내",
    help: "출고일, 택배 방식, 묶음배송 가능 여부를 줄 단위로 적습니다.",
    placeholder: "예:\n평일 오전 주문은 1-2영업일 내 출고됩니다.\n도서산간 지역은 추가 배송비가 발생할 수 있습니다.\n여러 상품을 함께 주문하면 묶음배송으로 처리될 수 있습니다.",
  },
  {
    id: "returns",
    key: "교환/반품 안내",
    label: "교환/반품 안내",
    help: "단순 변심, 불량, 사용 흔적이 있는 경우의 기준을 줄 단위로 적습니다.",
    placeholder: "예:\n상품 수령 후 7일 이내 미사용 상품에 한해 교환/반품 신청이 가능합니다.\n사용 흔적 또는 구성품 훼손이 있으면 제한될 수 있습니다.\n초기 불량은 사진 확인 후 교환 절차가 진행됩니다.",
  },
  {
    id: "notice",
    key: "구매 전 확인사항",
    label: "구매 전 확인사항",
    help: "옵션 선택, 수작업 오차, 인증 대상 여부 등 결제 전 확인할 내용을 줄 단위로 적습니다.",
    placeholder: "예:\n수작업 마감 특성상 미세한 색상과 표면 차이가 있을 수 있습니다.\nKC 인증 대상 품목은 상품정보고시의 인증 여부를 확인해 주세요.\n전문 도구는 사용자의 작업 습관에 따라 체감이 달라질 수 있습니다.",
  },
];

export const PRODUCT_DETAIL_IMAGE_FIELD = {
  id: "detailImages",
  key: "상세 이미지",
  label: "상세 이미지",
  help: "상세 내용 중간에 노출할 이미지 URL을 한 줄에 하나씩 입력합니다.",
  placeholder: "예:\nhttps://example.com/detail-1.jpg\n/product-images/detail-2.webp",
};

const ALL_DETAIL_FIELDS = [...PRODUCT_DETAIL_FIELDS, PRODUCT_DETAIL_IMAGE_FIELD];
const DETAIL_KEY_TO_ID = new Map(ALL_DETAIL_FIELDS.map((field) => [field.key, field.id]));
const DETAIL_IDS = new Set(ALL_DETAIL_FIELDS.map((field) => field.id));

export function parseProductSpec(spec = []) {
  const rows = [];
  const details = {};
  if (!Array.isArray(spec)) return { rows, details };

  spec.forEach((entry) => {
    if (!Array.isArray(entry) || entry.length < 2) return;
    const key = String(entry[0] ?? "").trim();
    const value = String(entry[1] ?? "").trim();
    if (!key || !value) return;

    const detailId = DETAIL_KEY_TO_ID.get(key);
    if (detailId) {
      details[detailId] = value;
      return;
    }
    rows.push([key, value]);
  });

  return { rows, details };
}

export function buildProductSpec(rows = [], detailValues = {}) {
  const cleanRows = Array.isArray(rows)
    ? rows
        .map(([key, value]) => [String(key || "").trim(), String(value || "").trim()])
        .filter(([key, value]) => key && value)
        .filter(([key]) => !DETAIL_KEY_TO_ID.has(key))
    : [];

  const detailRows = ALL_DETAIL_FIELDS
    .map((field) => [field.key, String(detailValues[field.id] || "").trim()])
    .filter(([, value]) => value);

  return [...cleanRows, ...detailRows];
}

export function buildDetailValues(details = {}, fallback = {}) {
  return ALL_DETAIL_FIELDS.reduce((acc, field) => {
    acc[field.id] = String(details[field.id] || fallback[field.id] || "");
    return acc;
  }, {});
}

export function splitDetailLines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function parseDetailImageUrls(value) {
  return splitDetailLines(value).filter((url, index, urls) => urls.indexOf(url) === index);
}

export function serializeDetailImageUrls(urls = []) {
  if (!Array.isArray(urls)) return "";
  return urls
    .map((url) => String(url || "").trim())
    .filter(Boolean)
    .filter((url, index, list) => list.indexOf(url) === index)
    .join("\n");
}

export function isProductDetailField(id) {
  return DETAIL_IDS.has(id);
}
