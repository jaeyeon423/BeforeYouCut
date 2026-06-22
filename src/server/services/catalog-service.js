import { prisma } from "../../utils/prisma";

export const PUBLIC_SELLER_WHERE = {
  isActive: true,
  deletedAt: null,
};

export const PUBLIC_PRODUCT_WHERE = {
  isActive: true,
  deletedAt: null,
  reviewStatus: "APPROVED",
  seller: { is: PUBLIC_SELLER_WHERE },
};

export const PRODUCT_IMAGE_CACHE_VERSION = "product-images-v1";

function cleanText(value) {
  return String(value || "").trim();
}

function formatDate(value) {
  return value ? value.toLocaleDateString("ko-KR") : null;
}

function maskBusinessRegNo(value) {
  const digits = cleanText(value).replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `${digits.slice(0, 3)}-**-*****`;
  if (digits.length > 4) return `${digits.slice(0, 2)}${"*".repeat(Math.max(0, digits.length - 6))}${digits.slice(-4)}`;
  return "*".repeat(digits.length);
}

export function normalizeProductImages(images) {
  if (!Array.isArray(images)) return [];
  return images
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object" && typeof item.url === "string") return item.url.trim();
      return "";
    })
    .filter(Boolean);
}

export function formatSeller(s, { includeSensitive = false } = {}) {
  return {
    id: s.id,
    name: s.name,
    verified: s.verified,
    desc: s.desc,
    category: s.category,
    followers: s.followers,
    products: s.productsCount,
    since: s.since,
    tone: s.tone,
    story: s.story,
    notice: s.notice,
    userId: s.userId,
    sellerType: s.sellerType,
    businessName: s.businessName,
    businessRegNo: includeSensitive ? s.businessRegNo : maskBusinessRegNo(s.businessRegNo),
    representative: s.representative,
    businessDocumentUrl: includeSensitive ? s.businessDocumentUrl : null,
    mailOrderDocumentUrl: includeSensitive ? s.mailOrderDocumentUrl : null,
    businessDocumentPath: includeSensitive ? s.businessDocumentPath : null,
    mailOrderDocumentPath: includeSensitive ? s.mailOrderDocumentPath : null,
    kycStatus: s.kycStatus,
    kycMemo: includeSensitive ? s.kycMemo : null,
    kycSubmittedAt: formatDate(s.kycSubmittedAt),
    kycReviewedAt: formatDate(s.kycReviewedAt),
    isActive: s.isActive,
  };
}

export function formatProduct(p) {
  return {
    id: p.id,
    seller: p.sellerId,
    name: p.name,
    price: p.price,
    cat: p.cat,
    icon: p.icon,
    tone: p.tone,
    badge: p.badge,
    disc: p.disc,
    orig: p.orig,
    rating: p.rating,
    reviews: p.reviews,
    likes: p.likesCount,
    images: normalizeProductImages(p.images),
    spec: p.spec,
    desc: p.desc,
    isActive: p.isActive,
    reviewStatus: p.reviewStatus,
  };
}

export async function fetchSellersMap() {
  const dbSellers = await prisma.seller.findMany({ where: PUBLIC_SELLER_WHERE });
  const map = {};
  dbSellers.forEach((seller) => {
    map[seller.id] = formatSeller(seller);
  });
  return map;
}

export async function fetchHomeData() {
  const [rankingRows, newRows, spotlightSellers, mainBanner] = await Promise.all([
    prisma.product.findMany({ where: PUBLIC_PRODUCT_WHERE, orderBy: { likesCount: "desc" }, take: 5 }),
    prisma.product.findMany({ where: { ...PUBLIC_PRODUCT_WHERE, badge: { in: ["new", "best"] } }, take: 6 }),
    prisma.seller.findMany({ where: PUBLIC_SELLER_WHERE, take: 2, orderBy: { since: "desc" } }),
    prisma.mainBanner.findUnique({ where: { id: "hero" } }),
  ]);

  return {
    ranking: rankingRows.map(formatProduct),
    newItems: newRows.map(formatProduct),
    spotlightSellers: spotlightSellers.map(formatSeller),
    mainBanner: mainBanner ? {
      kicker: mainBanner.kicker,
      title: mainBanner.title,
      desc: mainBanner.desc,
      ctaText: mainBanner.ctaText,
      ctaLink: mainBanner.ctaLink,
      icon: mainBanner.icon,
      tone: mainBanner.tone,
    } : null,
  };
}

export async function fetchProductDetail(productId) {
  const product = await prisma.product.findFirst({
    where: { id: productId, ...PUBLIC_PRODUCT_WHERE },
  });
  if (!product) return null;

  const [seller, relatedRows] = await Promise.all([
    prisma.seller.findFirst({ where: { id: product.sellerId, ...PUBLIC_SELLER_WHERE } }),
    prisma.product.findMany({
      where: { sellerId: product.sellerId, id: { not: productId }, ...PUBLIC_PRODUCT_WHERE },
      take: 4,
    }),
  ]);

  return {
    product: formatProduct(product),
    seller: seller ? formatSeller(seller) : null,
    related: relatedRows.map(formatProduct),
  };
}

export async function fetchSellerProfile(sellerId) {
  const seller = await prisma.seller.findFirst({ where: { id: sellerId, ...PUBLIC_SELLER_WHERE } });
  if (!seller) return null;

  const products = await prisma.product.findMany({ where: { sellerId, ...PUBLIC_PRODUCT_WHERE } });
  return {
    seller: formatSeller(seller),
    products: products.map(formatProduct),
  };
}

export async function fetchCategoryProducts(cat = "전체", page = 0, limit = 20, filter = null) {
  const where = {
    ...PUBLIC_PRODUCT_WHERE,
    ...(cat && cat !== "전체" ? { cat } : {}),
  };
  const orderBy = {};

  if (filter === "new") {
    where.badge = "new";
  } else if (filter === "best") {
    orderBy.likesCount = "desc";
  }

  const skip = page * limit;
  const [rows, count] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      ...(Object.keys(orderBy).length > 0 ? { orderBy } : {}),
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items: rows.map(formatProduct),
    hasMore: skip + rows.length < count,
    total: count,
  };
}
