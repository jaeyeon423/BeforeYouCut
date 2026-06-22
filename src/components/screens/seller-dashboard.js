"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/icons";
import { Placeholder, ProductMedia } from "@/components/ui";
import { createSeller, createSellerProduct, updateSellerCompliance, updateSellerProductDetail } from "@/app/actions";
import { createClient } from "@/utils/supabase/client";
import { CATEGORIES, CAT_ICON, won } from "@/data/data";
import {
  PRODUCT_DETAIL_FIELDS,
  buildDetailValues,
  buildProductSpec,
  parseProductSpec,
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

export default function SellerDashboardScreen({ dashboard }) {
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

  return <SellerWorkspace dashboard={dashboard} />;
}

function SellerWorkspace({ dashboard }) {
  const { seller, bankAccount = null, compliance = {}, documentLinks = {}, products = [], orders = [], settlements = [], stats = {} } = dashboard;
  const [selectedId, setSelectedId] = useState(products[0]?.id || null);
  const [newProductOpen, setNewProductOpen] = useState(products.length === 0);
  const selected = products.find((p) => p.id === selectedId) || products[0] || null;
  const pendingReviewProducts = products.filter((product) => product.reviewStatus === "PENDING").length;
  const rejectedProducts = products.filter((product) => product.reviewStatus === "REJECTED").length;
  const complianceIssueCount = compliance.issues?.length || 0;

  return (
    <div className="byc-scroll fadein">
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

      <section style={styles.section}>
        <SectionTitle
          title="오늘의 판매 운영"
          desc="판매 전환에 필요한 항목부터 처리합니다."
        />
        <div style={styles.workQueue}>
          <SellerQueueCard
            label="입점 상태"
            value={seller.kycStatus === "APPROVED" ? "승인" : `${complianceIssueCount}개 확인`}
            desc={seller.kycStatus === "APPROVED" ? "판매자 검증이 완료되었습니다." : "사업자·통신판매·정산 정보를 확인하세요."}
            tone={seller.kycStatus === "APPROVED" ? "good" : "warn"}
          />
          <SellerQueueCard
            label="상품 공개"
            value={pendingReviewProducts > 0 ? `${pendingReviewProducts}개 검수` : rejectedProducts > 0 ? `${rejectedProducts}개 반려` : `${products.length}개`}
            desc={pendingReviewProducts > 0 ? "관리자 승인 전까지 구매자에게 노출되지 않습니다." : rejectedProducts > 0 ? "반려 상품의 상세 정보를 보완하세요." : "공개 가능한 상품 상태를 유지하세요."}
            tone={pendingReviewProducts || rejectedProducts ? "warn" : "good"}
          />
          <SellerQueueCard
            label="배송 처리"
            value={`${stats.pendingOrders || 0}건`}
            desc={(stats.pendingOrders || 0) > 0 ? "주문 상세에서 송장 정보를 등록하세요." : "처리 대기 주문이 없습니다."}
            tone={(stats.pendingOrders || 0) > 0 ? "warn" : "neutral"}
          />
          <SellerQueueCard
            label="정산"
            value={`${won(stats.pendingSettlement || 0)}원`}
            desc={(stats.pendingSettlement || 0) > 0 ? "구매확정 이후 지급 상태를 확인하세요." : "지급 대기 정산이 없습니다."}
            tone={(stats.pendingSettlement || 0) > 0 ? "good" : "neutral"}
          />
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.sectionHeaderRow}>
          <SectionTitle
            title="상품 상세페이지 구성"
            desc="구매자가 보는 상품 상세 내용을 판매자 관점에서 정리합니다."
          />
          <button type="button" onClick={() => setNewProductOpen((value) => !value)} style={styles.ghostButton}>
            {newProductOpen ? "닫기" : "새 상품 등록"}
          </button>
        </div>

        {newProductOpen && (
          <NewProductForm
            seller={seller}
            onCreated={(product) => {
              setSelectedId(product.id);
              setNewProductOpen(false);
            }}
          />
        )}

        {products.length > 0 ? (
          <>
            <div style={styles.productTabs}>
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  style={selected?.id === p.id ? { ...styles.productTab, ...styles.productTabActive } : styles.productTab}
                >
                  {p.name}
                </button>
              ))}
            </div>
            {selected && <ProductDetailComposer key={selected.id} product={selected} />}
          </>
        ) : (
          !newProductOpen && (
            <EmptyPanel
              icon="store"
              title="등록된 상품이 없습니다"
              desc="첫 상품을 등록하면 상품 상세페이지 구성 도구가 열립니다."
            />
          )
        )}
      </section>

      <section style={styles.section}>
        <SectionTitle
          title="운영 정보"
          desc="입점 심사와 정산 지급에 필요한 정보를 실제 운영 기준으로 관리합니다."
        />
        <CompliancePanel seller={seller} bankAccount={bankAccount} compliance={compliance} documentLinks={documentLinks} />
      </section>

      <section style={styles.section}>
        <SectionTitle title="주문과 정산" desc="최근 주문과 정산 상태를 한 번에 확인합니다." />
        <div style={styles.opsGrid}>
          <Panel title="최근 주문">
            {orders.length > 0 ? orders.slice(0, 5).map((order) => (
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

          <Panel title="정산 상태">
            {settlements.length > 0 ? settlements.slice(0, 5).map((s) => (
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
        </div>
      </section>
    </div>
  );
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
        router.refresh();
      } catch (error) {
        setMessage(error.message || "상품 등록에 실패했습니다.");
      }
    });
  };

  return (
    <form onSubmit={submit} style={styles.createPanel}>
      <div>
        <div style={styles.labelText}>새 상품 등록</div>
        <div style={styles.helpText}>필수 상품 정보까지 함께 입력해야 구매자 상세페이지가 비어 보이지 않습니다.</div>
      </div>

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

      <div style={styles.splitRow}>
        <label style={styles.label}>
          상품 이미지 파일
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

      {message && <div style={styles.message}>{message}</div>}
      <button className="buy" type="submit" disabled={isPending} style={styles.submitButton}>
        {isPending ? "등록 중..." : "상품 등록"}
      </button>
    </form>
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
  const [detailValues, setDetailValues] = useState(() => buildDetailValues(parsedSpec.details, { intro: product.desc || "" }));
  const [specRows, setSpecRows] = useState(() => buildInitialSpecRows(parsedSpec.rows));
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const missingCount = specRows.filter(([key, value]) => REQUIRED_SPEC.includes(key) && !String(value).trim()).length;
  const previewHighlights = splitDetailLines(detailValues.highlights).slice(0, 3);

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
        await updateSellerProductDetail({
          productId: product.id,
          name,
          price,
          desc,
          imageUrl: uploadedImageUrl || imageUrl,
          spec: buildProductSpec(specRows, detailValues),
        });
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
            <div style={styles.helpText}>구매자 상세페이지에 섹션별로 표시됩니다.</div>
          </div>
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
  sectionHeaderRow: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 14 },
  sectionTitle: { marginBottom: 14 },
  sectionHeading: { margin: 0, fontSize: 17, fontWeight: 900, color: "var(--ink)", letterSpacing: 0 },
  sectionDesc: { margin: "5px 0 0", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 },
  workQueue: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  queueCard: { minHeight: 112, border: "1px solid var(--line)", borderRadius: 8, background: "#fff", padding: 12 },
  queueGood: { borderColor: "rgba(18, 122, 74, 0.22)", background: "rgba(18, 122, 74, 0.045)" },
  queueWarn: { borderColor: "rgba(138, 90, 0, 0.24)", background: "rgba(138, 90, 0, 0.05)" },
  queueNeutral: { borderColor: "var(--line)", background: "#fff" },
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
  productTabActive: { background: "var(--ink)", color: "#fff", borderColor: "var(--ink)" },
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
  createGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  previewBox: { display: "flex", gap: 12, border: "1px solid var(--line)", borderRadius: 8, padding: 12, background: "#fff" },
  previewMedia: { width: 96, height: 120, borderRadius: 8, overflow: "hidden", flexShrink: 0 },
  previewInfo: { flex: 1, minWidth: 0 },
  previewBrand: { fontSize: 10, color: "var(--muted)", fontWeight: 800, letterSpacing: "0.06em" },
  previewName: { margin: "5px 0", fontSize: 15, fontWeight: 900, color: "var(--ink)", lineHeight: 1.3 },
  previewPrice: { fontSize: 14, fontWeight: 900, color: "var(--accent)" },
  previewDesc: { margin: "8px 0", fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.5 },
  previewHighlights: { display: "flex", flexDirection: "column", gap: 4, margin: "8px 0 10px", fontSize: 11.5, color: "var(--ink)" },
  previewLink: { fontSize: 12, fontWeight: 800, color: "var(--ink)", textDecoration: "underline" },
  inlineLink: { marginTop: 2, fontSize: 11.5, fontWeight: 800, color: "var(--ink)", textDecoration: "underline" },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 800, color: "var(--muted)" },
  labelText: { fontSize: 12, fontWeight: 900, color: "var(--ink)" },
  helpText: { marginTop: 3, fontSize: 11, color: "var(--muted)" },
  input: {
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
  splitRow: { display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 10 },
  detailFields: { display: "flex", flexDirection: "column", gap: 12 },
  specHead: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginTop: 4 },
  ghostButton: {
    border: "1px solid var(--line)",
    background: "#fff",
    borderRadius: 6,
    padding: "8px 10px",
    fontSize: 12,
    fontWeight: 800,
    color: "var(--ink)",
    cursor: "pointer",
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
  empty: { border: "1px solid var(--line)", borderRadius: 8, padding: "34px 18px", textAlign: "center", color: "var(--muted)" },
  emptyTitle: { marginTop: 10, fontSize: 14, fontWeight: 900, color: "var(--ink)" },
  emptyDesc: { marginTop: 5, fontSize: 12, lineHeight: 1.5 },
  smallEmpty: { padding: "22px 0", textAlign: "center", fontSize: 12, color: "var(--muted)" },
  access: { padding: "96px 30px", textAlign: "center", color: "var(--muted)" },
  accessTitle: { margin: "16px 0 8px", fontSize: 21, color: "var(--ink)", letterSpacing: 0 },
  accessDesc: { margin: "0 auto 22px", fontSize: 13, lineHeight: 1.65, maxWidth: 330 },
  accessButton: { display: "inline-block", height: "auto", padding: "11px 22px", textDecoration: "none" },
};
