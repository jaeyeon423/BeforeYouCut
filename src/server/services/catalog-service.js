import { prisma } from "../../utils/prisma";
import { buildDetailValues, parseProductSpec } from "../../utils/product-detail";

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

function formatMainBanner(banner) {
  return banner ? {
    kicker: banner.kicker,
    title: banner.title,
    desc: banner.desc,
    ctaText: banner.ctaText,
    ctaLink: banner.ctaLink,
    icon: banner.icon,
    tone: banner.tone,
  } : null;
}

export function formatApiSeller(s) {
  if (!s) return null;
  return {
    id: s.id,
    name: s.name,
    category: s.category,
    desc: s.desc,
    products: s.productsCount,
    productsCount: s.productsCount,
    followers: s.followers,
    verified: s.verified,
    tone: s.tone,
    businessName: s.businessName,
    representative: s.representative,
  };
}

export function formatApiProduct(p) {
  if (!p) return null;
  const { rows, details } = parseProductSpec(p.spec);
  const detailValues = buildDetailValues(details);
  const seller = p.seller ? formatApiSeller(p.seller) : null;

  return {
    id: p.id,
    sellerId: p.sellerId,
    seller,
    name: p.name,
    cat: p.cat,
    category: p.cat,
    desc: p.desc,
    price: p.price,
    orig: p.orig,
    originalPrice: p.orig,
    disc: p.disc,
    discount: p.disc,
    rating: p.rating,
    reviews: p.reviews,
    likes: p.likesCount,
    images: normalizeProductImages(p.images),
    spec: p.spec,
    specRows: rows,
    details: {
      intro: detailValues.intro,
      highlights: detailValues.highlights,
      usage: detailValues.usage,
      shipping: detailValues.shipping,
      returns: detailValues.returns,
      notice: detailValues.notice,
    },
    badge: p.badge,
    icon: p.icon,
    tone: p.tone,
  };
}

function buildProductWhere({ category = "전체", filter = null, query = "" } = {}) {
  const cleanCategory = cleanText(category) || "전체";
  const cleanQuery = cleanText(query);
  const where = {
    ...PUBLIC_PRODUCT_WHERE,
    ...(cleanCategory !== "전체" ? { cat: cleanCategory } : {}),
  };

  if (filter === "new") {
    where.badge = "new";
  }

  if (cleanQuery) {
    where.OR = [
      { name: { contains: cleanQuery, mode: "insensitive" } },
      { desc: { contains: cleanQuery, mode: "insensitive" } },
      { cat: { contains: cleanQuery, mode: "insensitive" } },
    ];
  }

  return where;
}

function buildProductOrderBy(filter = null) {
  if (filter === "best") return [{ likesCount: "desc" }, { reviews: "desc" }];
  if (filter === "new") return [{ reviewedAt: "desc" }, { id: "desc" }];
  return [{ id: "desc" }];
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
    mainBanner: formatMainBanner(mainBanner),
  };
}

export async function fetchApiHomeData() {
  const [rankingRows, newRows, spotlightSellers, mainBanner] = await Promise.all([
    prisma.product.findMany({
      where: PUBLIC_PRODUCT_WHERE,
      include: { seller: true },
      orderBy: { likesCount: "desc" },
      take: 5,
    }),
    prisma.product.findMany({
      where: { ...PUBLIC_PRODUCT_WHERE, badge: { in: ["new", "best"] } },
      include: { seller: true },
      orderBy: buildProductOrderBy("new"),
      take: 6,
    }),
    prisma.seller.findMany({ where: PUBLIC_SELLER_WHERE, take: 2, orderBy: { since: "desc" } }),
    prisma.mainBanner.findUnique({ where: { id: "hero" } }),
  ]);

  return {
    ranking: rankingRows.map(formatApiProduct),
    newItems: newRows.map(formatApiProduct),
    spotlightSellers: spotlightSellers.map(formatApiSeller),
    mainBanner: formatMainBanner(mainBanner),
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

export async function fetchApiProductDetail(productId) {
  const product = await prisma.product.findFirst({
    where: { id: productId, ...PUBLIC_PRODUCT_WHERE },
    include: { seller: true },
  });
  if (!product) return null;

  const relatedRows = await prisma.product.findMany({
    where: { sellerId: product.sellerId, id: { not: productId }, ...PUBLIC_PRODUCT_WHERE },
    include: { seller: true },
    take: 4,
    orderBy: buildProductOrderBy("best"),
  });

  return {
    product: formatApiProduct(product),
    seller: formatApiSeller(product.seller),
    related: relatedRows.map(formatApiProduct),
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

export async function fetchApiSellers() {
  const sellers = await prisma.seller.findMany({
    where: PUBLIC_SELLER_WHERE,
    orderBy: [{ verified: "desc" }, { productsCount: "desc" }],
  });
  return { items: sellers.map(formatApiSeller) };
}

export async function fetchApiSellerProfile(sellerId) {
  const seller = await prisma.seller.findFirst({ where: { id: sellerId, ...PUBLIC_SELLER_WHERE } });
  if (!seller) return null;

  const products = await prisma.product.findMany({
    where: { sellerId, ...PUBLIC_PRODUCT_WHERE },
    include: { seller: true },
    orderBy: buildProductOrderBy("best"),
  });

  return {
    seller: formatApiSeller(seller),
    products: products.map(formatApiProduct),
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

export async function fetchApiProducts({ category = "전체", page = 0, limit = 20, filter = null, query = "" } = {}) {
  const where = buildProductWhere({ category, filter, query });
  const skip = page * limit;

  const [rows, count] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { seller: true },
      skip,
      take: limit,
      orderBy: buildProductOrderBy(filter),
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items: rows.map(formatApiProduct),
    page,
    limit,
    total: count,
    hasMore: skip + rows.length < count,
  };
}
