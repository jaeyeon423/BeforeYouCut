"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Icon from "@/components/icons";
import { Placeholder, ProductMedia } from "@/components/ui";
import { createSeller, createSellerProduct, updateSellerCompliance, updateSellerProductDetail } from "@/app/actions";
import { createClient } from "@/utils/supabase/client";
import { CATEGORIES, CAT_ICON, won } from "@/data/data";
import {
  PRODUCT_DETAIL_FIELDS,
  PRODUCT_DETAIL_IMAGE_FIELD,
  buildDetailValues,
  buildProductSpec,
  parseProductSpec,
  parseDetailImageUrls,
  serializeDetailImageUrls,
  splitDetailLines,
} from "@/utils/product-detail";

const REQUIRED_SPEC = ["소재", "제조국", "치수", "취급 주의", "A/S 책임자", "KC 인증 여부"];
const CATEGORY_OPTIONS = CATEGORIES.filter((c) => c.key !== "전체").map((c) => c.key);
const PRODUCT_IMAGE_BUCKET = "product-images";
const SELLER_DOCUMENT_BUCKET = "seller-documents";
const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_SELLER_DOCUMENT_BYTES = 10 * 1024 * 1024;

function firstProductImage(product) {
  return Array.isArray(product?.images) ? product.images.find(Boolean) || "" : "";
}

function safeImageExtension(fileName = "") {
  const ext = fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  return ext && ext.length <= 5 ? ext : "jpg";
}

async function uploadProductImage(file, sellerId) {
  if (!file) return "";
  if (!file.type.startsWith("image/")) {
    throw new Error("이미지 파일만 업로드할 수 있습니다.");
  }
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
    throw new Error("이미지는 5MB 이하로 업로드해 주세요.");
  }

  const supabase = createClient();
  const ext = safeImageExtension(file.name);
  const path = `${sellerId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(`이미지 업로드 실패: ${error.message}`);
  }

  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function uploadSellerDocument(file, sellerId, type) {
  if (!file) return "";
  const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    throw new Error("서류는 PDF, JPG, PNG, WebP 파일만 업로드할 수 있습니다.");
  }
  if (file.size > MAX_SELLER_DOCUMENT_BYTES) {
    throw new Error("서류 파일은 10MB 이하로 업로드해 주세요.");
  }

  const supabase = createClient();
  const ext = safeImageExtension(file.name);
  const path = `${sellerId}/${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from(SELLER_DOCUMENT_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(`서류 업로드 실패: ${error.message}`);
  }

  return path;
}

export default function SellerDashboardScreen({ dashboard, view = "overview", selectedProductId = null }) {
  if (dashboard.status === "guest") {
    return (
      <AccessPanel
        title="로그인이 필요합니다"
        desc="판매자 센터는 입점 신청, 상품 상세 구성, 주문 확인을 위해 로그인 후 사용할 수 있습니다."
        href="/my"
        action="로그인하러 가기"
      />
    );
  }

  if (dashboard.status === "noSeller") {
    return <SellerOnboardingPanel />;
  }

  if (dashboard.status === "error") {
    return (
      <AccessPanel
        title="판매자 정보를 불러오지 못했습니다"
        desc={dashboard.error || "잠시 후 다시 시도해 주세요."}
        href="/my"
        action="마이페이지로 이동"
      />
    );
  }

  return <SellerWorkspace dashboard={dashboard} view={view} selectedProductId={selectedProductId} />;
}

function SellerWorkspace({ dashboard, view = "overview", selectedProductId = null }) {
  const { seller, bankAccount = null, compliance = {}, documentLinks = {}, products = [], orders = [], settlements = [], stats = {} } = dashboard;
  const selected = products.find((p) => p.id === selectedProductId) || null;
  const pendingReviewProducts = products.filter((product) => product.reviewStatus === "PENDING").length;
  const rejectedProducts = products.filter((product) => product.reviewStatus === "REJECTED").length;
  const complianceIssueCount = compliance.issues?.length || 0;
  const nextTask = getSellerNextTask({
    seller,
    products,
    pendingReviewProducts,
    rejectedProducts,
    complianceIssueCount,
    pendingOrders: stats.pendingOrders || 0,
    pendingSettlement: stats.pendingSettlement || 0,
  });
  const attentionCount = (stats.pendingOrders || 0) + pendingReviewProducts + rejectedProducts + complianceIssueCount;
  const sellerTabs = [
    { id: "overview", href: "/seller", label: "오늘", icon: "grid", badge: attentionCount ? String(attentionCount) : "" },
    { id: "products", href: "/seller/products", label: "상품", icon: "store", badge: products.length ? String(products.length) : "" },
    { id: "orders", href: "/seller/orders", label: "주문", icon: "ship", badge: stats.pendingOrders ? String(stats.pendingOrders) : "" },
    { id: "settlements", href: "/seller/settlements", label: "정산", icon: "trend", badge: stats.pendingSettlement ? "원" : "" },
    { id: "settings", href: "/seller/settings", label: "정보", icon: "lock", badge: complianceIssueCount ? String(complianceIssueCount) : "" },
  ];
  const quickActions = [
    { href: "/seller/products", label: "상품 등록/수정", desc: products.length > 0 ? `${products.length}개 상품 관리` : "첫 상품 등록 필요" },
    { href: "/seller/settings", label: "운영 정보", desc: seller.kycStatus === "APPROVED" ? "심사 승인 상태" : `${complianceIssueCount}개 확인 필요` },
    { href: "/seller/orders", label: "주문 처리", desc: `${stats.pendingOrders || 0}건 처리 대기` },
    { href: "/seller/settlements", label: "정산 확인", desc: `${won(stats.pendingSettlement || 0)}원 예정` },
    { href: `/sellers/${seller.id}`, label: "공개 페이지", desc: "구매자 노출 확인", external: true },
  ];
  const processSteps = [
    { label: "운영 준비", desc: seller.kycStatus === "APPROVED" ? "승인" : "확인 필요", href: "/seller/settings", active: view === "settings", done: seller.kycStatus === "APPROVED" && complianceIssueCount === 0 },
    { label: "상품 구성", desc: products.length ? `${products.length}개` : "첫 등록", href: "/seller/products", active: ["products", "productNew", "productEdit"].includes(view), done: products.length > 0 && rejectedProducts === 0 },
    { label: "주문 처리", desc: `${stats.pendingOrders || 0}건`, href: "/seller/orders", active: view === "orders", done: (stats.pendingOrders || 0) === 0 },
    { label: "정산 확인", desc: `${won(stats.pendingSettlement || 0)}원`, href: "/seller/settlements", active: view === "settlements", done: (stats.pendingSettlement || 0) === 0 },
  ];
  const activeNavId = ["productNew", "productEdit"].includes(view) ? "products" : view;

  return (
    <div className="byc-scroll fadein" style={styles.workspace}>
      <section style={styles.sellerHero}>
        <div style={styles.heroTop}>
          <div style={styles.logo}>
            <Placeholder icon={CAT_ICON[seller.category] || "scissors"} tone={seller.tone || "tone-a"} size={30} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={styles.kicker}>SELLER CENTER</div>
            <h1 style={styles.title}>{seller.name}</h1>
            <p style={styles.sub}>{seller.desc}</p>
          </div>
          <Link href={`/sellers/${seller.id}`} style={styles.publicLink}>공개 페이지</Link>
        </div>

        <div style={styles.statGrid}>
          <Stat label="등록 상품" value={`${stats.products || 0}개`} />
          <Stat label="누적 주문액" value={`${won(stats.totalSales || 0)}원`} />
          <Stat label="처리 주문" value={`${stats.pendingOrders || 0}건`} />
          <Stat label="예정 정산" value={`${won(stats.pendingSettlement || 0)}원`} />
        </div>
      </section>

      <section style={styles.sectionCompact}>
        <div style={styles.processRail}>
          {processSteps.map((step, index) => (
            <Link
              key={step.label}
              href={step.href}
              style={step.active ? { ...styles.processStep, ...styles.processStepActive } : styles.processStep}
            >
              <span style={step.done ? { ...styles.processDot, ...styles.processDotDone } : styles.processDot}>{index + 1}</span>
              <span style={styles.processText}>
                <b>{step.label}</b>
                <small>{step.desc}</small>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {view === "overview" && (
        <>
          <section style={styles.sectionCompact}>
            <div style={styles.nextPanel}>
              <div style={styles.nextMain}>
                <div style={styles.kicker}>NEXT ACTION</div>
                <h2 style={styles.nextTitle}>{nextTask.title}</h2>
                <p style={styles.nextDesc}>{nextTask.desc}</p>
              </div>
              <Link href={nextTask.href} style={styles.nextButton}>{nextTask.action}</Link>
            </div>
            <div style={styles.quickGrid}>
              {quickActions.map((item) => (
                <Link key={item.label} href={item.href} style={styles.quickAction}><b>{item.label}</b><span style={styles.quickActionDesc}>{item.desc}</span></Link>
              ))}
            </div>
          </section>

          <section style={styles.section}>
            <SectionTitle
              title="오늘의 판매 운영"
              desc="처리할 항목을 먼저 확인하고 필요한 탭으로 이동합니다."
            />
            <div style={styles.workQueue}>
              <SellerQueueCard
                label="입점 상태"
                value={seller.kycStatus === "APPROVED" ? "승인" : `${complianceIssueCount}개 확인`}
                desc={seller.kycStatus === "APPROVED" ? "판매자 검증이 완료되었습니다." : "운영 정보를 보완해야 합니다."}
                tone={seller.kycStatus === "APPROVED" ? "good" : "warn"}
              />
              <SellerQueueCard
                label="상품 공개"
                value={pendingReviewProducts > 0 ? `${pendingReviewProducts}개 검수` : rejectedProducts > 0 ? `${rejectedProducts}개 반려` : `${products.length}개`}
                desc={pendingReviewProducts > 0 ? "검수 중인 상품이 있습니다." : rejectedProducts > 0 ? "보완이 필요한 상품이 있습니다." : "상품 상태가 안정적입니다."}
                tone={pendingReviewProducts || rejectedProducts ? "warn" : "good"}
              />
              <SellerQueueCard
                label="배송 처리"
                value={`${stats.pendingOrders || 0}건`}
                desc={(stats.pendingOrders || 0) > 0 ? "송장 등록이 필요한 주문입니다." : "처리 대기 주문이 없습니다."}
                tone={(stats.pendingOrders || 0) > 0 ? "warn" : "neutral"}
              />
              <SellerQueueCard
                label="정산"
                value={`${won(stats.pendingSettlement || 0)}원`}
                desc={(stats.pendingSettlement || 0) > 0 ? "정산 예정 금액이 있습니다." : "지급 대기 정산이 없습니다."}
                tone={(stats.pendingSettlement || 0) > 0 ? "good" : "neutral"}
              />
            </div>
          </section>
        </>
      )}

      {view === "products" && (
        <section style={styles.section}>
          <div style={styles.sectionHeaderRow}>
            <SectionTitle
              title="상품 목록"
              desc="상품 상태를 확인하고 상세 수정 페이지로 이동합니다."
            />
            <Link href="/seller/products/new" style={styles.ghostButton}>새 상품</Link>
          </div>
          <SellerProductList products={products} />
        </section>
      )}

      {view === "productNew" && (
        <section style={styles.section}>
          <div style={styles.sectionHeaderRow}>
            <SectionTitle
              title="상품 등록"
              desc="판매 정보, 대표 이미지, 상품정보고시를 순서대로 입력합니다."
            />
            <Link href="/seller/products" style={styles.ghostButton}>목록</Link>
          </div>
          <NewProductForm seller={seller} />
        </section>
      )}

      {view === "productEdit" && (
        <section style={styles.section}>
          <div style={styles.sectionHeaderRow}>
            <SectionTitle
              title="상품 상세 수정"
              desc="구매자가 보는 상품 상세페이지 내용을 보완합니다."
            />
            <Link href="/seller/products" style={styles.ghostButton}>목록</Link>
          </div>
          {selected ? (
            <ProductDetailComposer key={selected.id} product={selected} />
          ) : (
            <EmptyPanel
              icon="store"
              title="상품을 찾지 못했습니다"
              desc="상품 목록에서 다시 선택해 주세요."
            />
          )}
        </section>
      )}

      {view === "orders" && (
        <section style={styles.section}>
          <SectionTitle title="주문" desc="배송 처리가 필요한 주문을 확인합니다." />
          <Panel title="최근 주문">
            {orders.length > 0 ? orders.slice(0, 8).map((order) => (
              <Link key={order.itemId} href={`/orders/${order.id}`} style={styles.orderRow}>
                <div style={styles.orderThumb}>
                  <ProductMedia p={{ name: order.productName, icon: order.icon, tone: order.tone, images: order.images }} size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.rowTitle}>{order.productName}</div>
                  <div style={styles.rowMeta}>{order.date} · {order.buyer}</div>
                </div>
                <StatusPill>{order.status}</StatusPill>
              </Link>
            )) : (
              <SmallEmpty text="아직 주문이 없습니다." />
            )}
          </Panel>
        </section>
      )}

      {view === "settlements" && (
        <section style={styles.section}>
          <SectionTitle title="정산" desc="구매확정 이후 정산 예정 금액과 지급 상태를 확인합니다." />
          <Panel title="정산 상태">
            {settlements.length > 0 ? settlements.slice(0, 8).map((s) => (
              <div key={s.id} style={styles.settlementRow}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.rowTitle}>{s.productName}</div>
                  <div style={styles.rowMeta}>수수료 {won(s.commissionAmount)}원 차감</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={styles.money}>{won(s.netAmount)}원</div>
                  <StatusPill>{s.status}</StatusPill>
                </div>
              </div>
            )) : (
              <SmallEmpty text="정산 데이터가 없습니다." />
            )}
          </Panel>
        </section>
      )}

      {view === "settings" && (
        <section style={styles.section}>
          <SectionTitle
            title="운영 정보"
            desc="입점 심사, 서류, 정산 계좌 정보를 관리합니다."
          />
          <CompliancePanel seller={seller} bankAccount={bankAccount} compliance={compliance} documentLinks={documentLinks} />
        </section>
      )}

      <SellerBottomTabs tabs={sellerTabs} activeNavId={activeNavId} />
    </div>
  );
}

function SellerProductList({ products }) {
  if (products.length === 0) {
    return (
      <div style={styles.productListEmpty}>
        <EmptyPanel
          icon="store"
          title="등록된 상품이 없습니다"
          desc="첫 상품을 등록하면 검수 대기 상태로 저장됩니다."
        />
        <Link href="/seller/products/new" className="buy" style={styles.emptyAction}>첫 상품 등록</Link>
      </div>
    );
  }

  return (
    <div style={styles.productList}>
      {products.map((product) => (
        <div key={product.id} style={styles.productListItem}>
          <div style={styles.productListMedia}>
            <ProductMedia p={product} size={34} />
          </div>
          <div style={styles.productListInfo}>
            <div style={styles.rowTitle}>{product.name}</div>
            <div style={styles.rowMeta}>{product.cat} · {won(product.price)}원</div>
            <p style={styles.productListDesc}>{product.desc}</p>
          </div>
          <div style={styles.productListSide}>
            <StatusPill>{product.reviewStatus === "APPROVED" ? "공개 가능" : product.reviewStatus === "REJECTED" ? "보완 필요" : "검수 대기"}</StatusPill>
            <Link href={`/seller/products/${product.id}`} style={styles.inlineLink}>상세 수정</Link>
          </div>
        </div>
      ))}
    </div>
  );
}

function getSellerNextTask({ seller, products, pendingReviewProducts, rejectedProducts, complianceIssueCount, pendingOrders, pendingSettlement }) {
  if (complianceIssueCount > 0 || seller.kycStatus !== "APPROVED") {
    return {
      title: "운영 정보부터 보완",
      desc: "입점 심사와 정산 계좌가 정리되어야 실제 판매 운영이 안정적으로 진행됩니다.",
      action: "운영 정보 확인",
      href: "/seller/settings",
    };
  }

  if (products.length === 0) {
    return {
      title: "첫 상품 등록",
      desc: "상품명, 가격, 이미지, 상세 정보까지 입력해야 구매자 화면이 비어 보이지 않습니다.",
      action: "상품 등록",
      href: "/seller/products/new",
    };
  }

  if (rejectedProducts > 0) {
    return {
      title: "반려 상품 보완",
      desc: "관리자 검수에서 반려된 상품은 상세 정보와 필수 고시를 먼저 보완해야 합니다.",
      action: "상품 수정",
      href: "/seller/products",
    };
  }

  if (pendingReviewProducts > 0) {
    return {
      title: "검수 대기 상품 확인",
      desc: "승인 전 상품은 공개되지 않으므로 상세 미리보기와 필수 정보를 한 번 더 확인하세요.",
      action: "상품 상태 보기",
      href: "/seller/products",
    };
  }

  if (pendingOrders > 0) {
    return {
      title: "배송 처리",
      desc: "처리 대기 주문은 주문 상세에서 송장 정보를 등록해 구매자 불안을 줄여야 합니다.",
      action: "주문 확인",
      href: "/seller/orders",
    };
  }

  if (pendingSettlement > 0) {
    return {
      title: "정산 상태 확인",
      desc: "구매확정 이후 정산 예정 금액과 지급 상태를 확인하세요.",
      action: "정산 확인",
      href: "/seller/settlements",
    };
  }

  return {
    title: "공개 페이지 점검",
    desc: "구매자가 보는 브랜드 설명, 상품 카드, 상세페이지를 주기적으로 확인합니다.",
    action: "상품 관리",
    href: "/seller/products",
  };
}

function NewProductForm({ seller, onCreated }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORY_OPTIONS.includes(seller.category) ? seller.category : "가위");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [material, setMaterial] = useState("");
  const [origin, setOrigin] = useState("대한민국");
  const [size, setSize] = useState("");
  const [care, setCare] = useState("사용 후 마른 천으로 닦아 습기가 적은 곳에 보관해 주세요.");
  const [kcStatus, setKcStatus] = useState("해당 없음");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setName("");
    setPrice("");
    setDesc("");
    setMaterial("");
    setOrigin("대한민국");
    setSize("");
    setCare("사용 후 마른 천으로 닦아 습기가 적은 곳에 보관해 주세요.");
    setKcStatus("해당 없음");
    setImageUrl("");
    setImageFile(null);
  };
  const formSteps = [
    {
      no: "1",
      title: "판매 정보",
      desc: "상품명, 카테고리, 가격, 한 줄 설명",
      done: Boolean(name.trim() && category && Number(price) > 0 && desc.trim()),
    },
    {
      no: "2",
      title: "대표 이미지",
      desc: "상품 카드와 상세 상단 이미지",
      done: Boolean(imageFile || imageUrl.trim()),
    },
    {
      no: "3",
      title: "상품정보고시",
      desc: "소재, 제조국, 치수, 취급 주의, KC",
      done: Boolean(material.trim() && origin.trim() && size.trim() && care.trim() && kcStatus.trim()),
    },
  ];

  const submit = (event) => {
    event.preventDefault();
    setMessage("");
    startTransition(async () => {
      try {
        const uploadedImageUrl = imageFile ? await uploadProductImage(imageFile, seller.id) : "";
        const result = await createSellerProduct({
          name,
          category,
          price: Number(price),
          desc,
          material,
          origin,
          size,
          care,
          kcStatus,
          imageUrl: uploadedImageUrl || imageUrl,
        });
        setMessage("상품이 등록되었습니다. 상세페이지 편집 목록에 반영됩니다.");
        reset();
        onCreated?.(result.product);
        router.push(`/seller/products/${result.product.id}`);
        router.refresh();
      } catch (error) {
        setMessage(error.message || "상품 등록에 실패했습니다.");
      }
    });
  };

  return (
    <form onSubmit={submit} style={styles.createPanel}>
      <div style={styles.createIntro}>
        <div>
          <div style={styles.kicker}>NEW PRODUCT</div>
          <h3 style={styles.createTitle}>새 상품 등록</h3>
          <p style={styles.createDesc}>등록 후 검수 대기 상태로 저장되고, 상세 내용은 상품 탭에서 이어서 보완합니다.</p>
        </div>
        <div style={styles.createProgress}>{formSteps.filter((step) => step.done).length}/{formSteps.length}</div>
      </div>

      <div style={styles.createSteps}>
        {formSteps.map((step) => (
          <div key={step.no} style={step.done ? { ...styles.createStepChip, ...styles.createStepChipDone } : styles.createStepChip}>
            <b>{step.no}</b>
            <span>{step.title}</span>
          </div>
        ))}
      </div>

      <div style={styles.createStepSection}>
        <FormStepHeader no="1" title="판매 정보" desc="구매자가 목록에서 바로 판단하는 핵심 정보입니다." done={formSteps[0].done} />
        <label style={styles.label}>
          상품명
          <input value={name} onChange={(e) => setName(e.target.value)} required style={styles.input} />
        </label>
        <div style={styles.splitRow}>
          <label style={styles.label}>
            카테고리
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={styles.input}>
              {CATEGORY_OPTIONS.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </label>
          <label style={styles.label}>
            판매가
            <input value={price} onChange={(e) => setPrice(e.target.value)} required inputMode="numeric" style={styles.input} />
          </label>
        </div>
        <label style={styles.label}>
          상품 설명
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} required style={styles.textarea} />
        </label>
      </div>

      <div style={styles.createStepSection}>
        <FormStepHeader no="2" title="대표 이미지" desc="파일 업로드 또는 공개 이미지 URL 중 하나를 사용합니다." done={formSteps[1].done} />
        <div style={styles.splitRow}>
          <label style={styles.label}>
            이미지 파일
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              style={styles.input}
            />
            <span style={styles.helpText}>Supabase Storage `{PRODUCT_IMAGE_BUCKET}` 버킷에 업로드됩니다.</span>
          </label>
          <label style={styles.label}>
            이미지 URL
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="/product-images/scissors.svg"
              style={styles.input}
            />
            <span style={styles.helpText}>파일 대신 공개 이미지 URL을 입력할 수 있습니다.</span>
          </label>
        </div>
        {(imageUrl || imageFile) && (
          <div style={styles.mediaSignal}>
            <Icon name="check" size={15} />
            <span>{imageFile ? imageFile.name : imageUrl}</span>
          </div>
        )}
      </div>

      <div style={styles.createStepSection}>
        <FormStepHeader no="3" title="상품정보고시" desc="관리자 검수와 구매 전 확인에 쓰이는 필수 정보입니다." done={formSteps[2].done} />
        <div style={styles.createGrid}>
          <label style={styles.label}>
            소재
            <input value={material} onChange={(e) => setMaterial(e.target.value)} required style={styles.input} />
          </label>
          <label style={styles.label}>
            제조국
            <input value={origin} onChange={(e) => setOrigin(e.target.value)} required style={styles.input} />
          </label>
          <label style={styles.label}>
            치수
            <input value={size} onChange={(e) => setSize(e.target.value)} required style={styles.input} />
          </label>
          <label style={styles.label}>
            KC 인증 여부
            <input value={kcStatus} onChange={(e) => setKcStatus(e.target.value)} required style={styles.input} />
          </label>
        </div>
        <label style={styles.label}>
          취급 주의
          <textarea value={care} onChange={(e) => setCare(e.target.value)} required style={{ ...styles.textarea, minHeight: 76 }} />
        </label>
      </div>

      <div style={styles.noticeBox}>
        <b>등록 후 진행</b>
        <span>상품은 검수 대기로 생성됩니다. 상품 탭에서 상세 소개, 핵심 포인트, 배송/교환 안내와 상세 이미지를 이어서 보완하세요.</span>
      </div>

      {message && <div style={styles.message}>{message}</div>}
      <button className="buy" type="submit" disabled={isPending} style={styles.submitButton}>
        {isPending ? "등록 중..." : "검수 대기 상품 등록"}
      </button>
    </form>
  );
}

function FormStepHeader({ no, title, desc, done }) {
  return (
    <div style={styles.formStepHead}>
      <span style={done ? { ...styles.formStepNo, ...styles.formStepNoDone } : styles.formStepNo}>{no}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <b>{title}</b>
        <small>{desc}</small>
      </div>
      <StatusPill>{done ? "완료" : "입력"}</StatusPill>
    </div>
  );
}

function ProductDetailComposer({ product }) {
  const router = useRouter();
  const parsedSpec = parseProductSpec(product.spec);
  const [name, setName] = useState(product.name || "");
  const [price, setPrice] = useState(String(product.price || ""));
  const [desc, setDesc] = useState(product.desc || "");
  const [imageUrl, setImageUrl] = useState(firstProductImage(product));
  const [imageFile, setImageFile] = useState(null);
  const [detailImageFiles, setDetailImageFiles] = useState([]);
  const [detailValues, setDetailValues] = useState(() => buildDetailValues(parsedSpec.details, { intro: product.desc || "" }));
  const [specRows, setSpecRows] = useState(() => buildInitialSpecRows(parsedSpec.rows));
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const missingCount = specRows.filter(([key, value]) => REQUIRED_SPEC.includes(key) && !String(value).trim()).length;
  const previewHighlights = splitDetailLines(detailValues.highlights).slice(0, 3);
  const detailImages = parseDetailImageUrls(detailValues.detailImages);
  const detailCompletion = PRODUCT_DETAIL_FIELDS.filter((field) => {
    const value = field.id === "intro" ? detailValues.intro || desc : detailValues[field.id];
    return Boolean(String(value || "").trim());
  }).length;
  const readiness = [
    { label: "상품명", done: Boolean(name.trim()) },
    { label: "가격", done: Number(price) > 0 },
    { label: "대표 이미지", done: Boolean(imageFile || imageUrl || firstProductImage(product)) },
    { label: "상세 소개", done: Boolean((detailValues.intro || desc).trim()) },
    { label: "핵심 포인트", done: previewHighlights.length > 0 },
    { label: "사용/관리", done: Boolean(String(detailValues.usage || "").trim()) },
    { label: "배송/반품", done: Boolean(String(detailValues.shipping || "").trim()) && Boolean(String(detailValues.returns || "").trim()) },
    { label: "구매 전 확인", done: Boolean(String(detailValues.notice || "").trim()) },
    { label: "상세 이미지", done: detailImages.length > 0 || detailImageFiles.length > 0 },
    { label: "상품정보고시", done: missingCount === 0 },
  ];
  const readyCount = readiness.filter((item) => item.done).length;

  const updateSpec = (index, field, value) => {
    setSpecRows((rows) => rows.map((row, i) => {
      if (i !== index) return row;
      return field === "key" ? [value, row[1]] : [row[0], value];
    }));
  };

  const addSpec = () => setSpecRows((rows) => [...rows, ["", ""]]);
  const updateDetail = (id, value) => {
    setDetailValues((current) => ({ ...current, [id]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setMessage("");
    startTransition(async () => {
      try {
        const uploadedImageUrl = imageFile ? await uploadProductImage(imageFile, product.seller) : "";
        const uploadedDetailImageUrls = detailImageFiles.length
          ? await Promise.all(detailImageFiles.map((file) => uploadProductImage(file, product.seller)))
          : [];
        const nextDetailValues = {
          ...detailValues,
          detailImages: serializeDetailImageUrls([...detailImages, ...uploadedDetailImageUrls]),
        };
        await updateSellerProductDetail({
          productId: product.id,
          name,
          price,
          desc,
          imageUrl: uploadedImageUrl || imageUrl,
          spec: buildProductSpec(specRows, nextDetailValues),
        });
        setDetailValues(nextDetailValues);
        setDetailImageFiles([]);
        setMessage("저장되었습니다. 구매자 상세페이지에 반영됩니다.");
        router.refresh();
      } catch (error) {
        setMessage(error.message || "저장에 실패했습니다.");
      }
    });
  };

  return (
    <div style={styles.composer}>
      <div style={styles.previewBox}>
        <div style={styles.previewMedia}>
          <ProductMedia p={{ ...product, name, images: imageUrl ? [imageUrl] : product.images }} size={50} />
        </div>
        <div style={styles.previewInfo}>
          <div style={styles.previewBrand}>구매자 상세 미리보기</div>
          <h3 style={styles.previewName}>{name || "상품명"}</h3>
          <div style={styles.previewPrice}>{price ? `${won(Number(price) || 0)}원` : "가격 입력"}</div>
          <p style={styles.previewDesc}>{desc || "구매자가 이해할 수 있는 상품 설명을 입력해 주세요."}</p>
          {previewHighlights.length > 0 && (
            <div style={styles.previewHighlights}>
              {previewHighlights.map((item) => <span key={item}>{item}</span>)}
            </div>
          )}
          <Link href={`/products/${product.id}`} style={styles.previewLink}>실제 상세 보기</Link>
        </div>
      </div>

      <div style={styles.readinessPanel}>
        <div style={styles.readinessHead}>
          <div>
            <div style={styles.previewBrand}>공개 준비 체크</div>
            <b style={styles.readinessTitle}>{readyCount} / {readiness.length} 완료</b>
          </div>
          <StatusPill>{product.reviewStatus === "APPROVED" ? "공개 가능" : product.reviewStatus === "REJECTED" ? "보완 필요" : "검수 대기"}</StatusPill>
        </div>
        <div style={styles.readinessList}>
          {readiness.map((item) => (
            <span key={item.label} style={item.done ? { ...styles.readinessChip, ...styles.readinessDone } : styles.readinessChip}>
              {item.done ? "✓" : "·"} {item.label}
            </span>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.specHead}>
          <div>
            <div style={styles.labelText}>상품 이미지</div>
            <div style={styles.helpText}>구매자 카드와 상세페이지 상단에 표시됩니다.</div>
          </div>
        </div>

        <div style={styles.splitRow}>
          <label style={styles.label}>
            이미지 파일
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              style={styles.input}
            />
            <span style={styles.helpText}>새 파일을 선택하면 저장 시 업로드됩니다.</span>
          </label>
          <label style={styles.label}>
            이미지 URL
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="/product-images/scissors.svg"
              style={styles.input}
            />
            <span style={styles.helpText}>공개 URL 또는 `/product-images/...` 경로를 사용할 수 있습니다.</span>
          </label>
        </div>

        <label style={styles.label}>
          상품명
          <input value={name} onChange={(e) => setName(e.target.value)} style={styles.input} />
        </label>
        <label style={styles.label}>
          판매가
          <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" style={styles.input} />
        </label>
        <label style={styles.label}>
          상품 설명
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} style={styles.textarea} />
        </label>

        <div style={styles.specHead}>
          <div>
            <div style={styles.labelText}>상세페이지 본문</div>
            <div style={styles.helpText}>구매자 상세페이지의 상세 내용 영역에 섹션별로 표시됩니다.</div>
          </div>
        </div>

        <div style={styles.detailGuideBox}>
          <b>상세내용 완성도 {detailCompletion} / {PRODUCT_DETAIL_FIELDS.length}</b>
          <span>상세 소개, 핵심 포인트, 사용/관리, 배송, 교환/반품, 구매 전 확인사항이 구매자 화면의 상세 내용으로 노출됩니다.</span>
        </div>

        <div style={styles.detailFields}>
          {PRODUCT_DETAIL_FIELDS.map((field) => (
            <label key={field.id} style={styles.label}>
              {field.label}
              <span style={styles.helpText}>{field.help}</span>
              <textarea
                value={detailValues[field.id] || ""}
                onChange={(e) => updateDetail(field.id, e.target.value)}
                placeholder={field.placeholder}
                style={field.id === "highlights" ? { ...styles.textarea, minHeight: 120 } : styles.textarea}
              />
            </label>
          ))}
        </div>

        <div style={styles.detailImagePanel}>
          <div style={styles.specHead}>
            <div>
              <div style={styles.labelText}>{PRODUCT_DETAIL_IMAGE_FIELD.label}</div>
              <div style={styles.helpText}>{PRODUCT_DETAIL_IMAGE_FIELD.help}</div>
            </div>
            <span style={styles.helpText}>{detailImages.length + detailImageFiles.length}장</span>
          </div>
          <label style={styles.label}>
            상세 이미지 파일
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setDetailImageFiles(Array.from(e.target.files || []))}
              style={styles.input}
            />
            <span style={styles.helpText}>여러 장을 선택하면 저장 시 상품 상세 이미지로 추가됩니다.</span>
          </label>
          <label style={styles.label}>
            상세 이미지 URL 목록
            <textarea
              value={detailValues.detailImages || ""}
              onChange={(e) => updateDetail("detailImages", e.target.value)}
              placeholder={PRODUCT_DETAIL_IMAGE_FIELD.placeholder}
              style={{ ...styles.textarea, minHeight: 118 }}
            />
          </label>
          {(detailImages.length > 0 || detailImageFiles.length > 0) && (
            <div style={styles.detailImageGrid}>
              {detailImages.map((url) => (
                <div key={url} style={styles.detailImagePreview}>
                  <Image
                    src={url}
                    alt="상세 이미지 미리보기"
                    width={360}
                    height={360}
                    loading="lazy"
                    style={styles.detailImagePreviewImg}
                    unoptimized
                  />
                </div>
              ))}
              {detailImageFiles.map((file) => (
                <div key={`${file.name}-${file.size}`} style={styles.detailImagePending}>
                  <Icon name="grid" size={18} />
                  <span>{file.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.specHead}>
          <div>
            <div style={styles.labelText}>상품정보제공고시</div>
            <div style={styles.helpText}>필수 항목 {missingCount ? `${missingCount}개 미입력` : "입력 완료"}</div>
          </div>
          <button type="button" onClick={addSpec} style={styles.ghostButton}>항목 추가</button>
        </div>

        <div style={styles.specList}>
          {specRows.map(([key, value], index) => (
            <div key={`${key}-${index}`} style={styles.specRow}>
              <input
                value={key}
                onChange={(e) => updateSpec(index, "key", e.target.value)}
                placeholder="항목"
                style={styles.specKey}
                readOnly={REQUIRED_SPEC.includes(key)}
              />
              <input
                value={value}
                onChange={(e) => updateSpec(index, "value", e.target.value)}
                placeholder="내용"
                style={styles.specValue}
              />
            </div>
          ))}
        </div>

        <div style={styles.noticeBox}>
          <b>상세페이지 구성 기준</b>
          <span>소재, 제조국, 치수, 취급 주의, A/S 책임자는 구매자가 결제 전에 확인할 수 있어야 합니다.</span>
          <span>KC 인증 대상 품목은 인증 여부와 증빙을 관리자 검수 전까지 준비해야 합니다.</span>
        </div>

        {message && <div style={styles.message}>{message}</div>}
        <button className="buy" type="submit" disabled={isPending} style={styles.submitButton}>
          {isPending ? "저장 중..." : "상품 상세 저장"}
        </button>
      </form>
    </div>
  );
}

function CompliancePanel({ seller, bankAccount, compliance, documentLinks = {} }) {
  const router = useRouter();
  const [sellerType, setSellerType] = useState(seller.sellerType || "INDIVIDUAL");
  const [businessName, setBusinessName] = useState(seller.businessName || "");
  const [businessRegNo, setBusinessRegNo] = useState(seller.businessRegNo || "");
  const [representative, setRepresentative] = useState(seller.representative || "");
  const [businessDocumentUrl, setBusinessDocumentUrl] = useState(seller.businessDocumentUrl || "");
  const [mailOrderDocumentUrl, setMailOrderDocumentUrl] = useState(seller.mailOrderDocumentUrl || "");
  const [businessDocumentPath, setBusinessDocumentPath] = useState(seller.businessDocumentPath || "");
  const [mailOrderDocumentPath, setMailOrderDocumentPath] = useState(seller.mailOrderDocumentPath || "");
  const [businessDocumentFile, setBusinessDocumentFile] = useState(null);
  const [mailOrderDocumentFile, setMailOrderDocumentFile] = useState(null);
  const [bankName, setBankName] = useState(bankAccount?.bankName || "");
  const [accountHolder, setAccountHolder] = useState(bankAccount?.accountHolder || "");
  const [accountNumber, setAccountNumber] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const issues = compliance?.issues || [];

  const submit = (event) => {
    event.preventDefault();
    setMessage("");
    startTransition(async () => {
      try {
        const uploadedBusinessDocumentPath = businessDocumentFile
          ? await uploadSellerDocument(businessDocumentFile, seller.id, "business")
          : "";
        const uploadedMailOrderDocumentPath = mailOrderDocumentFile
          ? await uploadSellerDocument(mailOrderDocumentFile, seller.id, "mail-order")
          : "";

        await updateSellerCompliance({
          sellerType,
          businessName,
          businessRegNo,
          representative,
          businessDocumentUrl,
          mailOrderDocumentUrl,
          businessDocumentPath: uploadedBusinessDocumentPath || businessDocumentPath,
          mailOrderDocumentPath: uploadedMailOrderDocumentPath || mailOrderDocumentPath,
          bankName,
          accountHolder,
          accountNumber,
        });
        if (uploadedBusinessDocumentPath) setBusinessDocumentPath(uploadedBusinessDocumentPath);
        if (uploadedMailOrderDocumentPath) setMailOrderDocumentPath(uploadedMailOrderDocumentPath);
        setBusinessDocumentFile(null);
        setMailOrderDocumentFile(null);
        setAccountNumber("");
        setMessage("운영 정보가 제출되었습니다. 관리자 검토 대기 상태로 전환됩니다.");
        router.refresh();
      } catch (error) {
        setMessage(error.message || "운영 정보 저장에 실패했습니다.");
      }
    });
  };

  return (
    <div style={styles.complianceWrap}>
      <div style={styles.complianceSummary}>
        <div>
          <div style={styles.labelText}>심사 상태</div>
          <div style={styles.reviewStatus}>{kycLabel(seller.kycStatus)}</div>
          {seller.kycMemo && <div style={styles.helpText}>{seller.kycMemo}</div>}
        </div>
        <div>
          <div style={styles.labelText}>정산 계좌</div>
          <div style={styles.reviewStatus}>{bankAccount ? `${bankAccount.bankName} ${bankAccount.accountNumberMasked}` : "미등록"}</div>
          {bankAccount && <div style={styles.helpText}>{bankAccount.isVerified ? "검증 완료" : "검증 대기"}</div>}
        </div>
      </div>

      {issues.length > 0 && (
        <div style={styles.issueList}>
          {issues.map((issue) => <span key={issue} style={styles.issueChip}>{issue}</span>)}
        </div>
      )}

      <form onSubmit={submit} style={styles.form}>
        <div style={styles.splitRow}>
          <label style={styles.label}>
            판매자 유형
            <select value={sellerType} onChange={(e) => setSellerType(e.target.value)} style={styles.input}>
              <option value="INDIVIDUAL">개인 판매자</option>
              <option value="BUSINESS">사업자 판매자</option>
            </select>
          </label>
          <label style={styles.label}>
            대표자/성명
            <input value={representative} onChange={(e) => setRepresentative(e.target.value)} required style={styles.input} />
          </label>
        </div>

        <div style={styles.splitRow}>
          <label style={styles.label}>
            상호
            <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} required={sellerType === "BUSINESS"} style={styles.input} />
          </label>
          <label style={styles.label}>
            사업자등록번호
            <input value={businessRegNo} onChange={(e) => setBusinessRegNo(e.target.value)} required={sellerType === "BUSINESS"} style={styles.input} />
          </label>
        </div>

        <div style={styles.splitRow}>
          <label style={styles.label}>
            사업자등록증 파일
            <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setBusinessDocumentFile(e.target.files?.[0] || null)} style={styles.input} />
            <span style={styles.helpText}>{businessDocumentPath ? "업로드된 파일이 있습니다." : "비공개 서류 버킷에 업로드됩니다."}</span>
          </label>
          <label style={styles.label}>
            사업자등록증 URL
            <input value={businessDocumentUrl} onChange={(e) => setBusinessDocumentUrl(e.target.value)} required={sellerType === "BUSINESS" && !businessDocumentPath && !businessDocumentFile} style={styles.input} />
            {documentLinks.businessDocument && <a href={documentLinks.businessDocument} target="_blank" rel="noreferrer" style={styles.inlineLink}>등록 문서 보기</a>}
          </label>
        </div>

        <div style={styles.splitRow}>
          <label style={styles.label}>
            통신판매업 신고증 파일
            <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setMailOrderDocumentFile(e.target.files?.[0] || null)} style={styles.input} />
            <span style={styles.helpText}>{mailOrderDocumentPath ? "업로드된 파일이 있습니다." : "신고 후 받은 증빙을 업로드할 수 있습니다."}</span>
          </label>
          <label style={styles.label}>
            통신판매업 신고증 URL
            <input value={mailOrderDocumentUrl} onChange={(e) => setMailOrderDocumentUrl(e.target.value)} style={styles.input} />
            {documentLinks.mailOrderDocument && <a href={documentLinks.mailOrderDocument} target="_blank" rel="noreferrer" style={styles.inlineLink}>등록 문서 보기</a>}
          </label>
        </div>

        <div style={styles.specHead}>
          <div>
            <div style={styles.labelText}>정산 계좌</div>
            <div style={styles.helpText}>계좌번호는 서버에서 암호화 저장되고, 화면에는 마스킹 값만 표시됩니다.</div>
          </div>
        </div>

        <div style={styles.createGrid}>
          <label style={styles.label}>
            은행명
            <input value={bankName} onChange={(e) => setBankName(e.target.value)} style={styles.input} />
          </label>
          <label style={styles.label}>
            예금주
            <input value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} style={styles.input} />
          </label>
        </div>
        <label style={styles.label}>
          계좌번호
          <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} style={styles.input} />
        </label>

        {message && <div style={styles.message}>{message}</div>}
        <button className="buy" type="submit" disabled={isPending} style={styles.submitButton}>
          {isPending ? "제출 중..." : "운영 정보 제출"}
        </button>
      </form>
    </div>
  );
}

function kycLabel(status) {
  const labels = {
    DRAFT: "작성 전",
    SUBMITTED: "검토 대기",
    APPROVED: "승인",
    REJECTED: "반려",
  };
  return labels[status] || status || "작성 전";
}

function SellerOnboardingPanel() {
  const router = useRouter();
  const [brandName, setBrandName] = useState("");
  const [brandCategory, setBrandCategory] = useState("가위");
  const [brandDesc, setBrandDesc] = useState("");
  const [brandStory, setBrandStory] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const submit = (event) => {
    event.preventDefault();
    setMessage("");
    const slugBase = brandName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "brand";
    const sellerId = `${slugBase}${Date.now().toString().slice(-4)}`.slice(0, 20);

    startTransition(async () => {
      try {
        await createSeller({
          sellerId,
          name: brandName,
          category: brandCategory,
          desc: brandDesc,
          story: brandStory,
          notice: "",
          firstProduct: null,
        });
        setMessage("판매자 계정이 생성되었습니다. 대시보드를 불러옵니다.");
        router.refresh();
      } catch (error) {
        setMessage(error.message || "입점 신청에 실패했습니다.");
      }
    });
  };

  return (
    <div className="byc-scroll fadein">
      <section style={styles.section}>
        <SectionTitle
          title="판매자 센터 시작하기"
          desc="입점 후 구매자 화면과 별도로 상품 상세, 주문, 정산을 관리할 수 있습니다."
        />
        <form onSubmit={submit} style={styles.form}>
          <label style={styles.label}>
            브랜드명
            <input value={brandName} onChange={(e) => setBrandName(e.target.value)} required style={styles.input} />
          </label>
          <label style={styles.label}>
            대표 카테고리
            <select value={brandCategory} onChange={(e) => setBrandCategory(e.target.value)} style={styles.input}>
              {CATEGORY_OPTIONS.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </label>
          <label style={styles.label}>
            한 줄 소개
            <input value={brandDesc} onChange={(e) => setBrandDesc(e.target.value)} style={styles.input} />
          </label>
          <label style={styles.label}>
            브랜드 스토리
            <textarea value={brandStory} onChange={(e) => setBrandStory(e.target.value)} style={styles.textarea} />
          </label>
          <div style={styles.noticeBox}>
            <b>다음 단계</b>
            <span>판매자 센터 생성 후 상품 등록 폼에서 소재, 제조국, 치수, KC 인증 여부까지 입력합니다.</span>
            <span>실제 오픈 전에는 사업자 서류, 통신판매업 신고증, 정산 계좌, KC 증빙을 관리자 심사로 분리해야 합니다.</span>
          </div>
          {message && <div style={styles.message}>{message}</div>}
          <button className="buy" type="submit" disabled={isPending} style={styles.submitButton}>
            {isPending ? "생성 중..." : "판매자 센터 만들기"}
          </button>
        </form>
      </section>
    </div>
  );
}

function AccessPanel({ title, desc, href, action }) {
  return (
    <div className="byc-scroll fadein">
      <section style={styles.access}>
        <Icon name="store" size={40} />
        <h1 style={styles.accessTitle}>{title}</h1>
        <p style={styles.accessDesc}>{desc}</p>
        <Link href={href} className="buy" style={styles.accessButton}>{action}</Link>
      </section>
    </div>
  );
}

function SectionTitle({ title, desc }) {
  return (
    <div style={styles.sectionTitle}>
      <h2 style={styles.sectionHeading}>{title}</h2>
      {desc && <p style={styles.sectionDesc}>{desc}</p>}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={styles.stat}>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

function SellerQueueCard({ label, value, desc, tone = "neutral" }) {
  const toneStyle = tone === "good"
    ? styles.queueGood
    : tone === "warn"
      ? styles.queueWarn
      : styles.queueNeutral;

  return (
    <div style={{ ...styles.queueCard, ...toneStyle }}>
      <div style={styles.queueLabel}>{label}</div>
      <div style={styles.queueValue}>{value}</div>
      <div style={styles.queueDesc}>{desc}</div>
    </div>
  );
}

function SellerBottomTabs({ tabs, activeNavId }) {
  return (
    <nav style={styles.sellerBottomTabs} aria-label="판매자 센터 탭">
      {tabs.map((tab) => {
        const active = activeNavId === tab.id;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            style={active ? { ...styles.sellerBottomTab, ...styles.sellerBottomTabActive } : styles.sellerBottomTab}
            aria-current={active ? "page" : undefined}
          >
            <span style={styles.bottomTabIcon}>
              <Icon name={tab.icon} size={19} stroke={active ? 2 : 1.7} />
              {tab.badge && <em style={styles.bottomTabBadge}>{tab.badge}</em>}
            </span>
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Panel({ title, children }) {
  return (
    <div style={styles.panel}>
      <h3 style={styles.panelTitle}>{title}</h3>
      {children}
    </div>
  );
}

function StatusPill({ children }) {
  return <span style={styles.statusPill}>{children}</span>;
}

function EmptyPanel({ icon, title, desc }) {
  return (
    <div style={styles.empty}>
      <Icon name={icon} size={32} />
      <div style={styles.emptyTitle}>{title}</div>
      <div style={styles.emptyDesc}>{desc}</div>
    </div>
  );
}

function SmallEmpty({ text }) {
  return <div style={styles.smallEmpty}>{text}</div>;
}

function buildInitialSpecRows(spec = []) {
  const source = Array.isArray(spec) ? spec : [];
  const existing = new Map(source.map(([key, value]) => [String(key), String(value)]));
  const requiredRows = REQUIRED_SPEC.map((key) => [key, existing.get(key) || ""]);
  const extras = source
    .map(([key, value]) => [String(key), String(value)])
    .filter(([key]) => key && !REQUIRED_SPEC.includes(key));
  return [...requiredRows, ...extras];
}

const styles = {
  workspace: {
    paddingBottom: 86,
  },
  sellerHero: {
    margin: "14px 18px 0",
    padding: 16,
    border: "1px solid var(--line)",
    borderRadius: 8,
    background: "var(--surface)",
  },
  heroTop: { display: "flex", gap: 12, alignItems: "center" },
  logo: { width: 56, height: 56, borderRadius: 8, overflow: "hidden", border: "1px solid var(--line)" },
  kicker: { fontSize: 10, fontWeight: 800, color: "var(--muted)", letterSpacing: "0.08em" },
  title: { margin: "3px 0 4px", fontSize: 20, color: "var(--ink)", letterSpacing: 0 },
  sub: { margin: 0, fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5 },
  publicLink: {
    flexShrink: 0,
    fontSize: 11,
    fontWeight: 800,
    color: "var(--ink)",
    textDecoration: "none",
    border: "1px solid var(--line-strong)",
    padding: "7px 9px",
    borderRadius: 6,
    background: "#fff",
  },
  statGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 },
  stat: { background: "#fff", border: "1px solid var(--line)", borderRadius: 6, padding: "12px 10px" },
  statValue: { fontSize: 16, fontWeight: 900, color: "var(--ink)" },
  statLabel: { marginTop: 3, fontSize: 11, color: "var(--muted)" },
  section: { padding: "22px 18px 0" },
  sectionCompact: { padding: "14px 18px 0" },
  sectionHeaderRow: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 14 },
  sectionTitle: { marginBottom: 14 },
  sectionHeading: { margin: 0, fontSize: 17, fontWeight: 900, color: "var(--ink)", letterSpacing: 0 },
  sectionDesc: { margin: "5px 0 0", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 },
  processRail: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  },
  processStep: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid var(--line)",
    borderRadius: 8,
    background: "#fff",
    padding: 10,
    color: "var(--ink)",
    fontFamily: "inherit",
    cursor: "pointer",
    textAlign: "left",
    textDecoration: "none",
  },
  processStepActive: { border: "1px solid var(--ink)", boxShadow: "inset 0 0 0 1px var(--ink)" },
  processDot: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    border: "1px solid var(--line)",
    background: "var(--surface)",
    fontSize: 11,
    fontWeight: 900,
    color: "var(--muted)",
  },
  processDotDone: { background: "var(--ink)", border: "1px solid var(--ink)", color: "#fff" },
  processText: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0, fontSize: 12, color: "var(--ink)" },
  nextPanel: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", border: "1px solid var(--line)", borderRadius: 8, background: "#fff", padding: 13 },
  nextMain: { flex: 1, minWidth: 0 },
  nextTitle: { margin: "4px 0 5px", fontSize: 17, fontWeight: 950, color: "var(--ink)", letterSpacing: 0 },
  nextDesc: { margin: 0, fontSize: 12, lineHeight: 1.5, color: "var(--ink-soft)" },
  nextButton: { flexShrink: 0, border: "1px solid var(--ink)", borderRadius: 6, background: "var(--ink)", color: "#fff", padding: "9px 11px", fontSize: 12, fontWeight: 900, textDecoration: "none", fontFamily: "inherit", cursor: "pointer" },
  quickGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 9 },
  quickAction: { display: "flex", flexDirection: "column", gap: 4, border: "1px solid var(--line)", borderRadius: 8, background: "var(--surface)", padding: 11, color: "inherit", textDecoration: "none", textAlign: "left", fontFamily: "inherit", cursor: "pointer" },
  quickActionDesc: { fontSize: 11, color: "var(--muted)" },
  workQueue: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  queueCard: { minHeight: 112, border: "1px solid var(--line)", borderRadius: 8, background: "#fff", padding: 12 },
  queueGood: { border: "1px solid rgba(18, 122, 74, 0.22)", background: "rgba(18, 122, 74, 0.045)" },
  queueWarn: { border: "1px solid rgba(138, 90, 0, 0.24)", background: "rgba(138, 90, 0, 0.05)" },
  queueNeutral: { border: "1px solid var(--line)", background: "#fff" },
  queueLabel: { fontSize: 10.5, fontWeight: 900, color: "var(--muted)", letterSpacing: "0.04em" },
  queueValue: { marginTop: 7, fontSize: 18, fontWeight: 950, color: "var(--ink)", letterSpacing: 0 },
  queueDesc: { marginTop: 6, fontSize: 11.5, lineHeight: 1.45, color: "var(--ink-soft)" },
  productTabs: { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 10 },
  productTab: {
    border: "1px solid var(--line)",
    background: "#fff",
    color: "var(--ink-soft)",
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
    cursor: "pointer",
  },
  productTabActive: { background: "var(--ink)", color: "#fff", border: "1px solid var(--ink)" },
  productList: { display: "flex", flexDirection: "column", gap: 10 },
  productListItem: {
    display: "grid",
    gridTemplateColumns: "54px minmax(0, 1fr) auto",
    gap: 11,
    alignItems: "center",
    border: "1px solid var(--line)",
    borderRadius: 8,
    background: "#fff",
    padding: 11,
  },
  productListMedia: { width: 54, height: 64, borderRadius: 8, overflow: "hidden", background: "var(--surface)" },
  productListInfo: { minWidth: 0 },
  productListDesc: {
    margin: "6px 0 0",
    fontSize: 11.5,
    lineHeight: 1.45,
    color: "var(--ink-soft)",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  productListSide: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 },
  productListEmpty: { display: "flex", flexDirection: "column", gap: 12 },
  emptyAction: { width: "100%", textAlign: "center", textDecoration: "none" },
  composer: { display: "flex", flexDirection: "column", gap: 12 },
  createPanel: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    border: "1px solid var(--line)",
    borderRadius: 8,
    background: "var(--surface)",
    padding: 12,
    marginBottom: 14,
  },
  createIntro: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  createTitle: { margin: "4px 0 5px", fontSize: 16, fontWeight: 950, color: "var(--ink)", letterSpacing: 0 },
  createDesc: { margin: 0, fontSize: 12, lineHeight: 1.5, color: "var(--ink-soft)" },
  createProgress: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    background: "#fff",
    border: "1px solid var(--line)",
    fontSize: 13,
    fontWeight: 950,
    color: "var(--ink)",
  },
  createSteps: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 },
  createStepChip: {
    border: "1px solid var(--line)",
    background: "#fff",
    borderRadius: 8,
    padding: "9px 8px",
    display: "flex",
    flexDirection: "column",
    gap: 3,
    minHeight: 58,
    color: "var(--muted)",
  },
  createStepChipDone: { color: "var(--ink)", border: "1px solid var(--line-strong)" },
  createStepSection: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    background: "#fff",
    border: "1px solid var(--line)",
    borderRadius: 8,
    padding: 12,
  },
  createGrid: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10 },
  formStepHead: { display: "flex", alignItems: "center", gap: 9 },
  formStepNo: {
    width: 26,
    height: 26,
    borderRadius: "50%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    border: "1px solid var(--line)",
    background: "var(--surface)",
    fontSize: 11,
    fontWeight: 950,
    color: "var(--muted)",
  },
  formStepNoDone: { background: "var(--ink)", border: "1px solid var(--ink)", color: "#fff" },
  mediaSignal: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    border: "1px solid var(--line)",
    background: "var(--surface)",
    borderRadius: 8,
    padding: "9px 10px",
    fontSize: 11.5,
    color: "var(--ink-soft)",
    overflowWrap: "anywhere",
  },
  previewBox: { display: "flex", gap: 12, border: "1px solid var(--line)", borderRadius: 8, padding: 12, background: "#fff" },
  previewMedia: { width: 96, height: 120, borderRadius: 8, overflow: "hidden", flexShrink: 0 },
  previewInfo: { flex: 1, minWidth: 0 },
  previewBrand: { fontSize: 10, color: "var(--muted)", fontWeight: 800, letterSpacing: "0.06em" },
  previewName: { margin: "5px 0", fontSize: 15, fontWeight: 900, color: "var(--ink)", lineHeight: 1.3 },
  previewPrice: { fontSize: 14, fontWeight: 900, color: "var(--accent)" },
  previewDesc: { margin: "8px 0", fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.5 },
  previewHighlights: { display: "flex", flexDirection: "column", gap: 4, margin: "8px 0 10px", fontSize: 11.5, color: "var(--ink)" },
  previewLink: { fontSize: 12, fontWeight: 800, color: "var(--ink)", textDecoration: "underline" },
  readinessPanel: { border: "1px solid var(--line)", borderRadius: 8, background: "#fff", padding: 12 },
  readinessHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
  readinessTitle: { display: "block", marginTop: 4, fontSize: 15, color: "var(--ink)", fontWeight: 950 },
  readinessList: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 },
  readinessChip: { border: "1px solid var(--line)", borderRadius: 999, background: "var(--surface)", padding: "5px 8px", fontSize: 11.5, color: "var(--muted)", fontWeight: 800 },
  readinessDone: { color: "var(--ink)", background: "#fff", border: "1px solid var(--line-strong)" },
  inlineLink: { marginTop: 2, fontSize: 11.5, fontWeight: 800, color: "var(--ink)", textDecoration: "underline" },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  label: { display: "flex", flexDirection: "column", gap: 6, minWidth: 0, fontSize: 12, fontWeight: 800, color: "var(--muted)" },
  labelText: { fontSize: 12, fontWeight: 900, color: "var(--ink)" },
  helpText: { marginTop: 3, fontSize: 11, color: "var(--muted)" },
  input: {
    width: "100%",
    border: "1px solid var(--line)",
    background: "#fff",
    borderRadius: 6,
    padding: 11,
    fontSize: 13,
    color: "var(--ink)",
    fontFamily: "inherit",
    outline: "none",
  },
  textarea: {
    width: "100%",
    minHeight: 96,
    border: "1px solid var(--line)",
    background: "#fff",
    borderRadius: 6,
    padding: 11,
    fontSize: 13,
    color: "var(--ink)",
    fontFamily: "inherit",
    outline: "none",
    resize: "vertical",
    lineHeight: 1.55,
  },
  splitRow: { display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)", gap: 10 },
  detailGuideBox: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    border: "1px solid var(--line)",
    borderRadius: 8,
    background: "var(--surface)",
    padding: 12,
    fontSize: 12,
    color: "var(--ink-soft)",
    lineHeight: 1.5,
  },
  detailFields: { display: "flex", flexDirection: "column", gap: 12 },
  detailImagePanel: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    border: "1px solid var(--line)",
    borderRadius: 8,
    background: "#fff",
    padding: 12,
  },
  detailImageGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(92px, 1fr))",
    gap: 8,
  },
  detailImagePreview: {
    minHeight: 112,
    border: "1px solid var(--line)",
    borderRadius: 8,
    overflow: "hidden",
    background: "var(--surface)",
  },
  detailImagePreviewImg: {
    width: "100%",
    height: "100%",
    minHeight: 112,
    objectFit: "cover",
    display: "block",
  },
  detailImagePending: {
    minHeight: 112,
    border: "1px dashed var(--line-strong)",
    borderRadius: 8,
    background: "var(--surface)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    padding: 10,
    fontSize: 11,
    color: "var(--muted)",
    textAlign: "center",
    overflowWrap: "anywhere",
  },
  specHead: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginTop: 4 },
  ghostButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid var(--line)",
    background: "#fff",
    borderRadius: 6,
    padding: "8px 10px",
    fontSize: 12,
    fontWeight: 800,
    color: "var(--ink)",
    cursor: "pointer",
    textDecoration: "none",
  },
  specList: { display: "flex", flexDirection: "column", gap: 8 },
  specRow: { display: "grid", gridTemplateColumns: "120px 1fr", gap: 8 },
  specKey: {
    border: "1px solid var(--line)",
    background: "var(--surface)",
    borderRadius: 6,
    padding: 10,
    fontSize: 12,
    color: "var(--muted)",
    fontFamily: "inherit",
    outline: "none",
  },
  specValue: {
    border: "1px solid var(--line)",
    background: "#fff",
    borderRadius: 6,
    padding: 10,
    fontSize: 12,
    color: "var(--ink)",
    fontFamily: "inherit",
    outline: "none",
  },
  noticeBox: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: 8,
    padding: 12,
    fontSize: 11.5,
    color: "var(--ink-soft)",
    lineHeight: 1.5,
  },
  complianceWrap: { display: "flex", flexDirection: "column", gap: 12 },
  complianceSummary: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  reviewStatus: { marginTop: 5, fontSize: 14, fontWeight: 900, color: "var(--ink)" },
  issueList: { display: "flex", flexWrap: "wrap", gap: 6 },
  issueChip: { border: "1px solid var(--line)", borderRadius: 999, background: "var(--surface)", padding: "4px 8px", fontSize: 11, color: "var(--muted)", fontWeight: 800 },
  message: { fontSize: 12, color: "var(--accent)", fontWeight: 800 },
  submitButton: { width: "100%", marginTop: 2 },
  opsGrid: { display: "flex", flexDirection: "column", gap: 12 },
  panel: { border: "1px solid var(--line)", borderRadius: 8, background: "#fff", padding: 12 },
  panelTitle: { margin: "0 0 10px", fontSize: 13, fontWeight: 900, color: "var(--ink)" },
  orderRow: { display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: "1px solid var(--line)", color: "inherit", textDecoration: "none" },
  orderThumb: { width: 34, height: 34, borderRadius: 6, overflow: "hidden", flexShrink: 0 },
  settlementRow: { display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: "1px solid var(--line)" },
  rowTitle: { fontSize: 12.5, fontWeight: 800, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  rowMeta: { marginTop: 3, fontSize: 11, color: "var(--muted)" },
  money: { fontSize: 12.5, fontWeight: 900, color: "var(--ink)", marginBottom: 4 },
  statusPill: {
    display: "inline-block",
    border: "1px solid var(--line)",
    borderRadius: 999,
    padding: "3px 7px",
    fontSize: 10,
    color: "var(--muted)",
    background: "var(--surface)",
    whiteSpace: "nowrap",
  },
  sellerBottomTabs: {
    position: "sticky",
    bottom: 0,
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: 4,
    margin: "24px 10px 0",
    padding: "8px 8px calc(8px + env(safe-area-inset-bottom, 0px))",
    border: "1px solid var(--line)",
    borderRadius: 12,
    background: "rgba(255,255,255,0.96)",
    boxShadow: "0 -8px 22px rgba(0,0,0,0.06)",
    zIndex: 20,
    backdropFilter: "blur(10px)",
  },
  sellerBottomTab: {
    position: "relative",
    minWidth: 0,
    minHeight: 54,
    border: "1px solid transparent",
    borderRadius: 8,
    background: "transparent",
    color: "var(--muted)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    fontSize: 10.5,
    fontWeight: 850,
    fontFamily: "inherit",
    cursor: "pointer",
    textDecoration: "none",
  },
  sellerBottomTabActive: {
    color: "var(--ink)",
    background: "var(--surface)",
    border: "1px solid var(--line)",
  },
  bottomTabIcon: { position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" },
  bottomTabBadge: {
    position: "absolute",
    top: -7,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 999,
    padding: "0 4px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--ink)",
    color: "#fff",
    border: "1px solid #fff",
    fontSize: 9,
    fontStyle: "normal",
    fontWeight: 900,
  },
  empty: { border: "1px solid var(--line)", borderRadius: 8, padding: "34px 18px", textAlign: "center", color: "var(--muted)" },
  emptyTitle: { marginTop: 10, fontSize: 14, fontWeight: 900, color: "var(--ink)" },
  emptyDesc: { marginTop: 5, fontSize: 12, lineHeight: 1.5 },
  smallEmpty: { padding: "22px 0", textAlign: "center", fontSize: 12, color: "var(--muted)" },
  access: { padding: "96px 30px", textAlign: "center", color: "var(--muted)" },
  accessTitle: { margin: "16px 0 8px", fontSize: 21, color: "var(--ink)", letterSpacing: 0 },
  accessDesc: { margin: "0 auto 22px", fontSize: 13, lineHeight: 1.65, maxWidth: 330 },
  accessButton: { display: "inline-block", height: "auto", padding: "11px 22px", textDecoration: "none" },
};
