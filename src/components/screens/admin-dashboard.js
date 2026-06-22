"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  updateAdminInquiry,
  updateAdminOrderStatus,
  updateAdminProductReview,
  updateAdminRefundStatus,
  updateAdminSellerStatus,
  updateAdminSettlementStatus,
} from "@/app/actions";
import Icon from "@/components/icons";
import { ProductMedia } from "@/components/ui";
import { won } from "@/data/data";

const REVIEW_LABEL = {
  PENDING: "검수 대기",
  APPROVED: "승인",
  REJECTED: "반려",
};

const REVIEW_TONE = {
  PENDING: "#8a5a00",
  APPROVED: "#127a4a",
  REJECTED: "#a12b2b",
};

const SETTLEMENT_LABEL = {
  PENDING: "구매확정 대기",
  CONFIRMED: "지급 대기",
  PAID: "지급 완료",
  CANCELED: "정산 제외",
};

const SETTLEMENT_TONE = {
  PENDING: "#8a5a00",
  CONFIRMED: "#165d8f",
  PAID: "#127a4a",
  CANCELED: "#777",
};

const REFUND_LABEL = {
  REQUESTED: "접수",
  APPROVED: "승인",
  REJECTED: "거절",
  COMPLETED: "환불 완료",
};

const REFUND_REASON_LABEL = {
  CHANGE_OF_MIND: "단순 변심",
  DEFECTIVE: "상품 불량",
  WRONG_ITEM: "오배송",
  ETC: "기타",
};

const INQUIRY_LABEL = {
  OPEN: "열림",
  IN_PROGRESS: "처리중",
  CLOSED: "종료",
};

export default function AdminDashboardScreen({ dashboard }) {
  if (dashboard.status === "guest") {
    return (
      <AccessPanel
        title="로그인이 필요합니다"
        desc="관리자 콘솔은 운영자 계정으로 로그인한 뒤 사용할 수 있습니다."
        action="마이페이지에서 로그인"
        href="/my"
      />
    );
  }

  if (dashboard.status === "forbidden") {
    return (
      <AccessPanel
        title="관리자 권한이 없습니다"
        desc="현재 계정은 관리자 역할이 아닙니다. 서버 환경변수 ADMIN_EMAILS 또는 DB User.role 값을 확인해 주세요."
        action="마이페이지로 이동"
        href="/my"
      />
    );
  }

  if (dashboard.status === "error") {
    return (
      <AccessPanel
        title="관리자 데이터를 불러오지 못했습니다"
        desc={dashboard.error || "잠시 후 다시 시도해 주세요."}
        action="홈으로 이동"
        href="/"
      />
    );
  }

  return <AdminWorkspace dashboard={dashboard} />;
}

function AdminWorkspace({ dashboard }) {
  const { stats, sellers = [], products = [], orders = [], refunds = [], settlements = [], inquiries = [], options = {} } = dashboard;

  return (
    <div className="byc-scroll fadein">
      <section style={styles.hero}>
        <div style={styles.kicker}>OPERATIONS</div>
        <h1 style={styles.title}>관리자 운영 콘솔</h1>
        <p style={styles.sub}>검수 대기, 판매자 KYC, 환불, 정산, 문의를 우선순위로 처리합니다.</p>
        <div style={styles.statGrid}>
          <Stat label="검수 대기 상품" value={`${stats.pendingProducts || 0}개`} />
          <Stat label="KYC 대기" value={`${stats.pendingKyc || 0}곳`} />
          <Stat label="환불 요청" value={`${stats.openRefunds || 0}건`} />
          <Stat label="예정 정산" value={`${won(stats.pendingSettlement || 0)}원`} />
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.sectionHead}>
          <h2 style={styles.sectionTitle}>운영 처리 큐</h2>
          <p style={styles.sectionDesc}>구매자 노출과 결제 이후 리스크에 직접 연결되는 항목입니다.</p>
        </div>
        <div style={styles.commandGrid}>
          <CommandCard href="#admin-products" label="상품 검수" value={`${stats.pendingProducts || 0}개`} desc="승인 전 상품 비노출" urgent={(stats.pendingProducts || 0) > 0} />
          <CommandCard href="#admin-sellers" label="KYC 승인" value={`${stats.pendingKyc || 0}곳`} desc="판매자 노출·정산 조건" urgent={(stats.pendingKyc || 0) > 0} />
          <CommandCard href="#admin-orders" label="주문 상태" value={`${stats.orders || 0}건`} desc="배송·취소 상태 점검" />
          <CommandCard href="#admin-risk" label="환불·CS" value={`${(stats.openRefunds || 0) + (stats.openInquiries || 0)}건`} desc="고객 응대 대기" urgent={(stats.openRefunds || 0) + (stats.openInquiries || 0) > 0} />
        </div>
      </section>

      <AdminSection id="admin-products" title="상품 검수" count={products.length} desc="승인된 상품만 구매자 화면에 노출됩니다.">
        {products.length > 0 ? products.map((product) => (
          <ProductReviewRow key={product.id} product={product} />
        )) : <Empty text="검수할 상품이 없습니다." />}
      </AdminSection>

      <AdminSection id="admin-sellers" title="판매자 승인" count={sellers.length} desc="검증·노출 상태를 관리합니다.">
        {sellers.length > 0 ? sellers.map((seller) => (
          <SellerReviewRow key={seller.id} seller={seller} />
        )) : <Empty text="등록된 판매자가 없습니다." />}
      </AdminSection>

      <AdminSection id="admin-orders" title="주문 관리" count={orders.length} desc="배송, 반품, 환불 상태를 운영자가 조정합니다.">
        {orders.length > 0 ? orders.map((order) => (
          <OrderRow key={order.id} order={order} statuses={options.orderStatuses || []} />
        )) : <Empty text="주문 내역이 없습니다." />}
      </AdminSection>

      <AdminSection id="admin-risk" title="환불·정산·CS" count={refunds.length + settlements.length + inquiries.length} desc="운영 리스크가 있는 항목을 빠르게 확인합니다.">
        <MiniPanel title="환불 요청">
          {refunds.length > 0 ? refunds.slice(0, 8).map((refund) => (
            <RefundRow key={refund.id} refund={refund} />
          )) : <Empty text="환불 요청이 없습니다." small />}
        </MiniPanel>

        <MiniPanel title="정산">
          {settlements.length > 0 ? settlements.slice(0, 8).map((settlement) => (
            <SettlementRow key={settlement.id} settlement={settlement} />
          )) : <Empty text="정산 데이터가 없습니다." small />}
        </MiniPanel>

        <MiniPanel title="문의">
          {inquiries.length > 0 ? inquiries.slice(0, 8).map((inquiry) => (
            <InquiryRow key={inquiry.id} inquiry={inquiry} />
          )) : <Empty text="열린 문의가 없습니다." small />}
        </MiniPanel>
      </AdminSection>
    </div>
  );
}

function ProductReviewRow({ product }) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const run = (payload, successText) => {
    setMessage("");
    startTransition(async () => {
      try {
        await updateAdminProductReview({ productId: product.id, ...payload });
        setMessage(successText);
        router.refresh();
      } catch (error) {
        setMessage(error.message || "상태 변경에 실패했습니다.");
      }
    });
  };

  return (
    <div style={styles.cardRow}>
      <div style={styles.thumb}><ProductMedia p={product} size={28} /></div>
      <div style={styles.rowMain}>
        <div style={styles.rowTop}>
          <div style={{ minWidth: 0 }}>
            <b style={styles.rowTitle}>{product.name}</b>
            <span style={styles.rowMeta}>{product.sellerName} · {product.cat}</span>
          </div>
          <ReviewPill status={product.reviewStatus} />
        </div>
        {product.issues.length > 0 && (
          <div style={styles.issueList}>{product.issues.slice(0, 4).map((issue) => <span key={issue}>{issue}</span>)}</div>
        )}
        <div style={styles.actionRow}>
          <button type="button" style={styles.primaryButton} disabled={isPending} onClick={() => run({ reviewStatus: "APPROVED", isActive: true }, "상품이 승인되었습니다.")}>승인</button>
          <button type="button" style={styles.ghostButton} disabled={isPending} onClick={() => run({ reviewStatus: "REJECTED" }, "상품이 반려되었습니다.")}>반려</button>
          <button type="button" style={styles.ghostButton} disabled={isPending} onClick={() => run({ isActive: !product.isActive }, product.isActive ? "상품 노출을 중지했습니다." : "상품 노출을 재개했습니다.")}>
            {product.isActive ? "숨김" : "재개"}
          </button>
          <Link href={`/products/${product.id}`} style={styles.linkButton}>상세</Link>
        </div>
        {message && <div style={styles.message}>{message}</div>}
      </div>
    </div>
  );
}

function SellerReviewRow({ seller }) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const run = (payload, successText) => {
    setMessage("");
    startTransition(async () => {
      try {
        await updateAdminSellerStatus({ sellerId: seller.id, ...payload });
        setMessage(successText);
        router.refresh();
      } catch (error) {
        setMessage(error.message || "상태 변경에 실패했습니다.");
      }
    });
  };

  return (
    <div style={styles.cardRow}>
      <div style={styles.sellerLogo}><Icon name="store" size={24} /></div>
      <div style={styles.rowMain}>
        <div style={styles.rowTop}>
          <div style={{ minWidth: 0 }}>
            <b style={styles.rowTitle}>{seller.name}</b>
            <span style={styles.rowMeta}>{seller.ownerEmail || "소유자 미확인"} · 상품 {seller.products}개 · {seller.sellerType === "BUSINESS" ? "사업자" : "개인"}</span>
          </div>
          <Pill>{kycLabel(seller.kycStatus)} · {seller.isActive ? "노출" : "숨김"}</Pill>
        </div>
        <div style={styles.sellerOps}>
          <span>상호: {seller.businessName || "-"}</span>
          <span>대표자: {seller.representative || "-"}</span>
          <span>사업자번호: {seller.businessRegNo || "-"}</span>
          <span>정산계좌: {seller.bankAccount ? `${seller.bankAccount.bankName} ${seller.bankAccount.accountNumberMasked}` : "미등록"}</span>
        </div>
        {seller.complianceIssues?.length > 0 && (
          <div style={styles.issueList}>{seller.complianceIssues.slice(0, 5).map((issue) => <span key={issue}>{issue}</span>)}</div>
        )}
        <div style={styles.actionRow}>
          {seller.documentLinks?.businessDocument && <Link href={seller.documentLinks.businessDocument} target="_blank" style={styles.linkButton}>사업자증</Link>}
          {seller.documentLinks?.mailOrderDocument && <Link href={seller.documentLinks.mailOrderDocument} target="_blank" style={styles.linkButton}>통신판매증</Link>}
        </div>
        <div style={styles.actionRow}>
          <button type="button" style={styles.primaryButton} disabled={isPending} onClick={() => run({ verified: true, isActive: true }, "판매자를 승인했습니다.")}>승인</button>
          <button type="button" style={styles.ghostButton} disabled={isPending} onClick={() => run({ verified: false }, "판매자 검증을 해제했습니다.")}>검증 해제</button>
          <button type="button" style={styles.primaryButton} disabled={isPending} onClick={() => run({ kycStatus: "APPROVED", verified: true, bankAccountVerified: true }, "KYC를 승인했습니다.")}>KYC 승인</button>
          <button type="button" style={styles.ghostButton} disabled={isPending} onClick={() => run({ kycStatus: "REJECTED", verified: false, kycMemo: "제출 정보 확인이 필요합니다." }, "KYC를 반려했습니다.")}>KYC 반려</button>
          <button type="button" style={styles.ghostButton} disabled={isPending} onClick={() => run({ isActive: !seller.isActive }, seller.isActive ? "판매자를 숨겼습니다." : "판매자 노출을 재개했습니다.")}>
            {seller.isActive ? "숨김" : "재개"}
          </button>
          <Link href={`/sellers/${seller.id}`} style={styles.linkButton}>공개</Link>
        </div>
        {message && <div style={styles.message}>{message}</div>}
      </div>
    </div>
  );
}

function OrderRow({ order, statuses }) {
  const [status, setStatus] = useState(order.status);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const save = () => {
    setMessage("");
    startTransition(async () => {
      try {
        await updateAdminOrderStatus({ orderId: order.id, status });
        setMessage("주문 상태가 변경되었습니다.");
        router.refresh();
      } catch (error) {
        setMessage(error.message || "주문 상태 변경에 실패했습니다.");
      }
    });
  };

  return (
    <div style={styles.orderCard}>
      <div style={styles.rowTop}>
        <div style={{ minWidth: 0 }}>
          <Link href={`/orders/${order.id}`} style={styles.orderTitleLink}>{order.id.slice(0, 8)} · {order.buyer}</Link>
          <span style={styles.rowMeta}>{order.date} · {order.sellers.join(", ") || "판매자 없음"} · {won(order.total)}원</span>
        </div>
        <Pill>{order.status}</Pill>
      </div>
      <div style={styles.orderItems}>
        {order.items.slice(0, 3).map((item) => (
          <span key={`${order.id}-${item.productId}`}>{item.productName} x {item.quantity}</span>
        ))}
      </div>
      <div style={styles.statusEdit}>
        <select value={status} onChange={(event) => setStatus(event.target.value)} style={styles.select}>
          {statuses.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <button type="button" style={styles.primaryButton} disabled={isPending || status === order.status} onClick={save}>저장</button>
      </div>
      {message && <div style={styles.message}>{message}</div>}
    </div>
  );
}

function RefundRow({ refund }) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isFinal = ["REJECTED", "COMPLETED"].includes(refund.status);

  const run = (status, successText) => {
    setMessage("");
    startTransition(async () => {
      try {
        await updateAdminRefundStatus({
          refundId: refund.id,
          status,
          refundAmount: status === "COMPLETED" ? (refund.refundAmount || refund.orderTotal) : undefined,
        });
        setMessage(successText);
        router.refresh();
      } catch (error) {
        setMessage(error.message || "환불 요청 처리에 실패했습니다.");
      }
    });
  };

  return (
    <div style={styles.settlementRow}>
      <div style={styles.rowTop}>
        <div style={{ minWidth: 0 }}>
          <b style={styles.rowTitle}>{REFUND_REASON_LABEL[refund.reason] || refund.reason}</b>
          <span style={styles.rowMeta}>{refund.buyer} · {refund.orderStatus} · {won(refund.orderTotal || 0)}원</span>
        </div>
        <Pill>{REFUND_LABEL[refund.status] || refund.status}</Pill>
      </div>
      {refund.reasonDetail && <div style={styles.previewText}>{refund.reasonDetail}</div>}
      <div style={styles.actionRow}>
        <button type="button" style={styles.primaryButton} disabled={isPending || isFinal || refund.status === "APPROVED"} onClick={() => run("APPROVED", "환불 요청을 승인했습니다.")}>승인</button>
        <button type="button" style={styles.ghostButton} disabled={isPending || isFinal} onClick={() => run("REJECTED", "환불 요청을 거절했습니다.")}>거절</button>
        <button type="button" style={styles.primaryButton} disabled={isPending || refund.status !== "APPROVED"} onClick={() => run("COMPLETED", "환불을 완료 처리했습니다.")}>완료</button>
        {refund.orderId && <Link href={`/orders/${refund.orderId}`} style={styles.linkButton}>주문</Link>}
      </div>
      {message && <div style={styles.message}>{message}</div>}
    </div>
  );
}

function SettlementRow({ settlement }) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const canConfirm = settlement.status === "PENDING" && settlement.orderStatus === "구매확정";
  const canPay = settlement.status === "CONFIRMED";
  const canCancel = ["PENDING", "CONFIRMED"].includes(settlement.status);

  const run = (status, successText) => {
    setMessage("");
    startTransition(async () => {
      try {
        await updateAdminSettlementStatus({ settlementId: settlement.id, status });
        setMessage(successText);
        router.refresh();
      } catch (error) {
        setMessage(error.message || "정산 상태 변경에 실패했습니다.");
      }
    });
  };

  return (
    <div style={styles.settlementRow}>
      <div style={styles.rowTop}>
        <div style={{ minWidth: 0 }}>
          <b style={styles.rowTitle}>{settlement.sellerName}</b>
          <span style={styles.rowMeta}>{settlement.productName} · {settlement.orderStatus || "주문 상태 없음"}</span>
        </div>
        <SettlementPill status={settlement.status} />
      </div>
      <div style={styles.settlementMeta}>
        <span>정산액 {won(settlement.netAmount)}원</span>
        <span>수수료 {won(settlement.commissionAmount)}원</span>
        {settlement.settledAt && <span>지급일 {settlement.settledAt}</span>}
      </div>
      <div style={styles.actionRow}>
        <button type="button" style={styles.primaryButton} disabled={isPending || !canConfirm} onClick={() => run("CONFIRMED", "정산을 지급 대기로 확정했습니다.")}>확정</button>
        <button type="button" style={styles.primaryButton} disabled={isPending || !canPay} onClick={() => run("PAID", "정산을 지급 완료 처리했습니다.")}>지급완료</button>
        <button type="button" style={styles.ghostButton} disabled={isPending || !canCancel} onClick={() => run("CANCELED", "정산을 지급 대상에서 제외했습니다.")}>제외</button>
        {settlement.orderId && <Link href={`/orders/${settlement.orderId}`} style={styles.linkButton}>주문</Link>}
      </div>
      {message && <div style={styles.message}>{message}</div>}
    </div>
  );
}

function InquiryRow({ inquiry }) {
  const [reply, setReply] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const run = (payload, successText) => {
    setMessage("");
    startTransition(async () => {
      try {
        await updateAdminInquiry({ inquiryId: inquiry.id, ...payload });
        setMessage(successText);
        setReply("");
        router.refresh();
      } catch (error) {
        setMessage(error.message || "문의 처리에 실패했습니다.");
      }
    });
  };

  return (
    <div style={styles.settlementRow}>
      <div style={styles.rowTop}>
        <div style={{ minWidth: 0 }}>
          <b style={styles.rowTitle}>{inquiry.title}</b>
          <span style={styles.rowMeta}>{inquiry.type} · {inquiry.userEmail || "사용자 미확인"}{inquiry.sellerName ? ` · ${inquiry.sellerName}` : ""}</span>
        </div>
        <Pill>{INQUIRY_LABEL[inquiry.status] || inquiry.status}</Pill>
      </div>
      <div style={styles.previewText}>{inquiry.content}</div>
      {inquiry.latestReply && (
        <div style={styles.replyPreview}>최근 답변: {inquiry.latestReply.content}</div>
      )}
      <textarea
        value={reply}
        onChange={(event) => setReply(event.target.value)}
        style={styles.textarea}
        placeholder="운영자 답변을 입력하세요."
      />
      <div style={styles.actionRow}>
        <button type="button" style={styles.ghostButton} disabled={isPending || inquiry.status === "IN_PROGRESS"} onClick={() => run({ status: "IN_PROGRESS" }, "문의 상태를 처리중으로 변경했습니다.")}>진행</button>
        <button type="button" style={styles.primaryButton} disabled={isPending || reply.trim().length < 5} onClick={() => run({ reply, status: "IN_PROGRESS" }, "답변을 저장했습니다.")}>답변 저장</button>
        <button type="button" style={styles.primaryButton} disabled={isPending} onClick={() => run({ reply, status: "CLOSED" }, "문의가 종료되었습니다.")}>종료</button>
      </div>
      {message && <div style={styles.message}>{message}</div>}
    </div>
  );
}

function AdminSection({ id, title, count, desc, children }) {
  return (
    <section id={id} style={styles.section}>
      <div style={styles.sectionHead}>
        <div style={styles.sectionTitleRow}>
          <h2 style={styles.sectionTitle}>{title}</h2>
          {Number.isFinite(count) && <span style={styles.sectionCount}>{count}건</span>}
        </div>
        {desc && <p style={styles.sectionDesc}>{desc}</p>}
      </div>
      <div style={styles.stack}>{children}</div>
    </section>
  );
}

function CommandCard({ href, label, value, desc, urgent }) {
  return (
    <a href={href} style={urgent ? { ...styles.commandCard, ...styles.commandCardUrgent } : styles.commandCard}>
      <div style={styles.commandTop}>
        <span style={styles.commandLabel}>{label}</span>
        <Icon name="chev-r-sm" size={14} />
      </div>
      <div style={styles.commandValue}>{value}</div>
      <div style={styles.commandDesc}>{desc}</div>
    </a>
  );
}

function MiniPanel({ title, children }) {
  return (
    <div style={styles.miniPanel}>
      <h3 style={styles.panelTitle}>{title}</h3>
      {children}
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

function ReviewPill({ status }) {
  return <span style={{ ...styles.pill, color: REVIEW_TONE[status] || "var(--ink)" }}>{REVIEW_LABEL[status] || status}</span>;
}

function SettlementPill({ status }) {
  return <span style={{ ...styles.pill, color: SETTLEMENT_TONE[status] || "var(--ink)" }}>{SETTLEMENT_LABEL[status] || status}</span>;
}

function Pill({ children }) {
  return <span style={styles.pill}>{children}</span>;
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

function Empty({ text, small }) {
  return <div style={small ? styles.smallEmpty : styles.empty}>{text}</div>;
}

function AccessPanel({ title, desc, href, action }) {
  return (
    <div className="byc-scroll fadein">
      <section style={styles.accessPanel}>
        <Icon name="store" size={34} />
        <h1 style={styles.accessTitle}>{title}</h1>
        <p style={styles.accessDesc}>{desc}</p>
        <Link href={href} className="buy" style={styles.accessButton}>{action}</Link>
      </section>
    </div>
  );
}

const styles = {
  hero: { margin: "14px 18px 0", padding: 16, border: "1px solid var(--line)", borderRadius: 8, background: "var(--surface)" },
  kicker: { fontSize: 10, fontWeight: 900, letterSpacing: "0.1em", color: "var(--muted)" },
  title: { margin: "5px 0 5px", fontSize: 22, letterSpacing: 0, color: "var(--ink)" },
  sub: { margin: 0, fontSize: 12.5, lineHeight: 1.55, color: "var(--ink-soft)" },
  statGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 },
  stat: { background: "#fff", border: "1px solid var(--line)", borderRadius: 6, padding: 11 },
  statValue: { fontSize: 15, fontWeight: 900, color: "var(--ink)" },
  statLabel: { marginTop: 3, fontSize: 10.5, color: "var(--muted)" },
  section: { padding: "22px 18px 0" },
  sectionHead: { marginBottom: 12 },
  sectionTitleRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sectionTitle: { margin: 0, fontSize: 17, fontWeight: 900, letterSpacing: 0, color: "var(--ink)" },
  sectionCount: { flexShrink: 0, border: "1px solid var(--line)", borderRadius: 999, background: "var(--surface)", padding: "4px 8px", fontSize: 11, fontWeight: 900, color: "var(--muted)" },
  sectionDesc: { margin: "5px 0 0", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 },
  commandGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  commandCard: { display: "block", minHeight: 104, border: "1px solid var(--line)", borderRadius: 8, background: "#fff", padding: 12, textDecoration: "none", color: "inherit" },
  commandCardUrgent: { borderColor: "rgba(138, 90, 0, 0.28)", background: "rgba(138, 90, 0, 0.05)" },
  commandTop: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 },
  commandLabel: { fontSize: 10.5, fontWeight: 900, color: "var(--muted)", letterSpacing: "0.04em" },
  commandValue: { marginTop: 8, fontSize: 20, fontWeight: 950, color: "var(--ink)", letterSpacing: 0 },
  commandDesc: { marginTop: 5, fontSize: 11.5, lineHeight: 1.45, color: "var(--ink-soft)" },
  stack: { display: "flex", flexDirection: "column", gap: 10 },
  cardRow: { display: "flex", gap: 12, padding: 12, border: "1px solid var(--line)", borderRadius: 8, background: "#fff" },
  thumb: { width: 62, height: 62, borderRadius: 8, overflow: "hidden", border: "1px solid var(--line)", flexShrink: 0 },
  sellerLogo: { width: 52, height: 52, borderRadius: 8, display: "grid", placeItems: "center", background: "var(--surface)", border: "1px solid var(--line)", flexShrink: 0 },
  rowMain: { flex: 1, minWidth: 0 },
  rowTop: { display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" },
  rowTitle: { display: "block", fontSize: 13, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  orderTitleLink: { display: "block", fontSize: 13, fontWeight: 900, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: "none" },
  rowMeta: { display: "block", marginTop: 3, fontSize: 11.5, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  issueList: { display: "flex", flexWrap: "wrap", gap: 5, marginTop: 9 },
  sellerOps: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginTop: 9, fontSize: 11.5, color: "var(--ink-soft)" },
  actionRow: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 },
  primaryButton: { border: "1px solid var(--ink)", background: "var(--ink)", color: "#fff", borderRadius: 6, padding: "7px 9px", fontSize: 11, fontWeight: 800, cursor: "pointer" },
  ghostButton: { border: "1px solid var(--line-strong)", background: "#fff", color: "var(--ink)", borderRadius: 6, padding: "7px 9px", fontSize: 11, fontWeight: 800, cursor: "pointer" },
  linkButton: { border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", borderRadius: 6, padding: "7px 9px", fontSize: 11, fontWeight: 800, textDecoration: "none" },
  pill: { flexShrink: 0, border: "1px solid var(--line)", borderRadius: 999, background: "var(--surface)", padding: "4px 7px", fontSize: 10.5, fontWeight: 800, color: "var(--ink-soft)", whiteSpace: "nowrap" },
  message: { marginTop: 8, padding: "8px 10px", borderRadius: 6, background: "var(--surface)", color: "var(--ink-soft)", fontSize: 11.5, lineHeight: 1.4 },
  orderCard: { padding: 12, border: "1px solid var(--line)", borderRadius: 8, background: "#fff" },
  orderItems: { display: "flex", flexDirection: "column", gap: 4, marginTop: 9, fontSize: 11.5, color: "var(--ink-soft)" },
  statusEdit: { display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginTop: 10 },
  select: { width: "100%", border: "1px solid var(--line)", borderRadius: 6, background: "#fff", padding: "8px 9px", fontSize: 12, color: "var(--ink)" },
  miniPanel: { border: "1px solid var(--line)", borderRadius: 8, background: "#fff", padding: 12 },
  panelTitle: { margin: "0 0 9px", fontSize: 13, fontWeight: 900, color: "var(--ink)" },
  compactRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "9px 0", borderTop: "1px solid var(--line)" },
  settlementRow: { padding: "10px 0", borderTop: "1px solid var(--line)" },
  settlementMeta: { display: "flex", flexWrap: "wrap", gap: 7, marginTop: 7, fontSize: 11.5, color: "var(--ink-soft)" },
  previewText: { marginTop: 7, fontSize: 11.5, lineHeight: 1.5, color: "var(--ink-soft)" },
  replyPreview: { marginTop: 7, padding: 8, borderRadius: 6, background: "var(--surface)", fontSize: 11.5, lineHeight: 1.5, color: "var(--ink-soft)" },
  textarea: { width: "100%", minHeight: 68, resize: "vertical", border: "1px solid var(--line)", borderRadius: 6, background: "#fff", padding: 9, marginTop: 9, fontSize: 12, color: "var(--ink)", boxSizing: "border-box" },
  money: { fontSize: 12, fontWeight: 900, color: "var(--ink)", marginBottom: 3 },
  empty: { padding: 28, border: "1px dashed var(--line-strong)", borderRadius: 8, color: "var(--muted)", fontSize: 12.5, textAlign: "center", background: "var(--surface)" },
  smallEmpty: { padding: "18px 0", color: "var(--muted)", fontSize: 12, textAlign: "center" },
  accessPanel: { margin: "80px 24px 0", padding: 24, border: "1px solid var(--line)", borderRadius: 8, background: "var(--surface)", textAlign: "center" },
  accessTitle: { margin: "12px 0 6px", fontSize: 20, letterSpacing: 0, color: "var(--ink)" },
  accessDesc: { margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--ink-soft)" },
  accessButton: { display: "inline-flex", marginTop: 18, height: "auto", padding: "11px 18px", textDecoration: "none" },
};
