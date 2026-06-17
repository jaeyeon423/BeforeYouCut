"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/icons";
import { Placeholder } from "@/components/ui";
import { createSeller, updateSellerProductDetail } from "@/app/actions";
import { CATEGORIES, CAT_ICON, won } from "@/data/data";

const REQUIRED_SPEC = ["소재", "제조국", "치수", "취급 주의", "A/S 책임자", "KC 인증 여부"];
const CATEGORY_OPTIONS = CATEGORIES.filter((c) => c.key !== "전체").map((c) => c.key);

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
  const { seller, products = [], orders = [], settlements = [], stats = {} } = dashboard;
  const [selectedId, setSelectedId] = useState(products[0]?.id || null);
  const selected = products.find((p) => p.id === selectedId) || products[0] || null;

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
          title="상품 상세페이지 구성"
          desc="구매자가 보는 상품 상세 내용을 판매자 관점에서 정리합니다."
        />

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
          <EmptyPanel
            icon="store"
            title="등록된 상품이 없습니다"
            desc="첫 상품을 등록하면 상품 상세페이지 구성 도구가 열립니다."
          />
        )}
      </section>

      <section style={styles.section}>
        <SectionTitle title="주문과 정산" desc="최근 주문과 정산 상태를 한 번에 확인합니다." />
        <div style={styles.opsGrid}>
          <Panel title="최근 주문">
            {orders.length > 0 ? orders.slice(0, 5).map((order) => (
              <div key={order.itemId} style={styles.orderRow}>
                <Placeholder icon={order.icon} tone={order.tone} size={18} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.rowTitle}>{order.productName}</div>
                  <div style={styles.rowMeta}>{order.date} · {order.buyer}</div>
                </div>
                <StatusPill>{order.status}</StatusPill>
              </div>
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

function ProductDetailComposer({ product }) {
  const router = useRouter();
  const [name, setName] = useState(product.name || "");
  const [price, setPrice] = useState(String(product.price || ""));
  const [desc, setDesc] = useState(product.desc || "");
  const [specRows, setSpecRows] = useState(() => buildInitialSpecRows(product.spec));
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const missingCount = specRows.filter(([key, value]) => REQUIRED_SPEC.includes(key) && !String(value).trim()).length;

  const updateSpec = (index, field, value) => {
    setSpecRows((rows) => rows.map((row, i) => {
      if (i !== index) return row;
      return field === "key" ? [value, row[1]] : [row[0], value];
    }));
  };

  const addSpec = () => setSpecRows((rows) => [...rows, ["", ""]]);

  const handleSubmit = (event) => {
    event.preventDefault();
    setMessage("");
    startTransition(async () => {
      try {
        await updateSellerProductDetail({
          productId: product.id,
          name,
          price,
          desc,
          spec: specRows,
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
          <Placeholder icon={product.icon} tone={product.tone} size={50} />
        </div>
        <div style={styles.previewInfo}>
          <div style={styles.previewBrand}>구매자 상세 미리보기</div>
          <h3 style={styles.previewName}>{name || "상품명"}</h3>
          <div style={styles.previewPrice}>{price ? `${won(Number(price) || 0)}원` : "가격 입력"}</div>
          <p style={styles.previewDesc}>{desc || "구매자가 이해할 수 있는 상품 설명을 입력해 주세요."}</p>
          <Link href={`/products/${product.id}`} style={styles.previewLink}>실제 상세 보기</Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
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

function SellerOnboardingPanel() {
  const router = useRouter();
  const [brandName, setBrandName] = useState("");
  const [brandCategory, setBrandCategory] = useState("가위");
  const [brandDesc, setBrandDesc] = useState("");
  const [brandStory, setBrandStory] = useState("");
  const [prodName, setProdName] = useState("");
  const [prodPrice, setProdPrice] = useState("");
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
          firstProduct: prodName ? { name: prodName, price: Number(prodPrice) } : null,
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
          <div style={styles.splitRow}>
            <label style={styles.label}>
              첫 상품명
              <input value={prodName} onChange={(e) => setProdName(e.target.value)} style={styles.input} />
            </label>
            <label style={styles.label}>
              가격
              <input value={prodPrice} onChange={(e) => setProdPrice(e.target.value)} inputMode="numeric" style={styles.input} />
            </label>
          </div>
          <div style={styles.noticeBox}>
            <b>다음 단계</b>
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
  sectionTitle: { marginBottom: 14 },
  sectionHeading: { margin: 0, fontSize: 17, fontWeight: 900, color: "var(--ink)", letterSpacing: 0 },
  sectionDesc: { margin: "5px 0 0", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 },
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
  previewBox: { display: "flex", gap: 12, border: "1px solid var(--line)", borderRadius: 8, padding: 12, background: "#fff" },
  previewMedia: { width: 96, height: 120, borderRadius: 8, overflow: "hidden", flexShrink: 0 },
  previewInfo: { flex: 1, minWidth: 0 },
  previewBrand: { fontSize: 10, color: "var(--muted)", fontWeight: 800, letterSpacing: "0.06em" },
  previewName: { margin: "5px 0", fontSize: 15, fontWeight: 900, color: "var(--ink)", lineHeight: 1.3 },
  previewPrice: { fontSize: 14, fontWeight: 900, color: "var(--accent)" },
  previewDesc: { margin: "8px 0", fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.5 },
  previewLink: { fontSize: 12, fontWeight: 800, color: "var(--ink)", textDecoration: "underline" },
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
  message: { fontSize: 12, color: "var(--accent)", fontWeight: 800 },
  submitButton: { width: "100%", marginTop: 2 },
  opsGrid: { display: "flex", flexDirection: "column", gap: 12 },
  panel: { border: "1px solid var(--line)", borderRadius: 8, background: "#fff", padding: 12 },
  panelTitle: { margin: "0 0 10px", fontSize: 13, fontWeight: 900, color: "var(--ink)" },
  orderRow: { display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: "1px solid var(--line)" },
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
