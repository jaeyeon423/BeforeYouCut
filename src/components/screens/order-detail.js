"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/icons";
import { ProductMedia } from "@/components/ui";
import { requestRefund, updateShipment } from "@/app/actions";
import { won } from "@/data/data";

const REFUND_REASONS = [
  ["CHANGE_OF_MIND", "단순 변심"],
  ["DEFECTIVE", "상품 불량"],
  ["WRONG_ITEM", "오배송"],
  ["ETC", "기타"],
];

const REFUND_REASON_LABEL = Object.fromEntries(REFUND_REASONS);

export default function OrderDetailScreen({ data }) {
  if (data.status === "guest") {
    return <StatePanel icon="user" title="로그인이 필요합니다" desc="주문 상세는 주문자 또는 판매자 계정으로 로그인 후 확인할 수 있습니다." href="/my" action="로그인하러 가기" />;
  }

  if (data.status === "forbidden") {
    return <StatePanel icon="lock" title="접근 권한이 없습니다" desc="해당 주문의 구매자, 판매자 또는 관리자만 주문 상세를 볼 수 있습니다." href="/my" action="마이페이지로 이동" />;
  }

  if (data.status === "error") {
    return <StatePanel icon="ship" title="주문 정보를 불러오지 못했습니다" desc={data.error || "잠시 후 다시 시도해 주세요."} href="/my" action="마이페이지로 이동" />;
  }

  return <OrderWorkspace order={data.order} role={data.role} />;
}

function OrderWorkspace({ order, role }) {
  const router = useRouter();
  const [carrier, setCarrier] = useState(order.shipment?.carrier || "");
  const [trackingNo, setTrackingNo] = useState(order.shipment?.trackingNo || "");
  const [reason, setReason] = useState("CHANGE_OF_MIND");
  const [reasonDetail, setReasonDetail] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const returnHref = role === "seller" ? "/seller" : role === "admin" ? "/admin" : "/my";

  const submitShipment = (event) => {
    event.preventDefault();
    setMessage("");
    startTransition(async () => {
      try {
        await updateShipment({ orderId: order.id, carrier, trackingNo });
        setMessage("배송 정보가 저장되었습니다.");
        router.refresh();
      } catch (error) {
        setMessage(error.message || "배송 정보 저장에 실패했습니다.");
      }
    });
  };

  const submitRefund = (event) => {
    event.preventDefault();
    setMessage("");
    startTransition(async () => {
      try {
        await requestRefund({ orderId: order.id, reason, reasonDetail });
        setMessage("반품·환불 신청이 접수되었습니다.");
        router.refresh();
      } catch (error) {
        setMessage(error.message || "반품·환불 신청에 실패했습니다.");
      }
    });
  };

  return (
    <div className="byc-scroll fadein">
      <section style={styles.hero}>
        <div style={styles.heroTop}>
          <div>
            <div style={styles.kicker}>ORDER</div>
            <h1 style={styles.title}>#{order.id.slice(0, 8)}</h1>
            <div style={styles.meta}>{order.date}</div>
          </div>
          <StatusPill>{order.status}</StatusPill>
        </div>
        <div style={styles.summaryGrid}>
          <Summary label="주문금액" value={`${won(order.total)}원`} />
          <Summary label="상품수" value={`${order.items.length}개`} />
        </div>
      </section>

      <section style={styles.section}>
        <SectionTitle title="주문 상품" />
        <div style={styles.panel}>
          {order.items.map((item) => (
            <Link key={item.itemId} href={`/products/${item.id}`} style={styles.itemRow}>
              <div style={styles.thumb}>
                <ProductMedia p={item} size={22} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.itemSeller}>{item.sellerName || item.seller}</div>
                <div style={styles.itemName}>{item.name}</div>
                <div style={styles.itemMeta}>수량 {item.quantity}</div>
              </div>
              <div style={styles.itemPrice}>{won(item.lineTotal)}원</div>
            </Link>
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <SectionTitle title="배송 정보" />
        <div style={styles.panel}>
          <InfoRow label="수령인" value={order.buyer} />
          {order.phone && <InfoRow label="연락처" value={order.phone} />}
          <InfoRow label="배송지" value={order.address} />
          <InfoRow label="택배사" value={order.shipment?.carrier || "등록 전"} />
          <InfoRow label="운송장" value={order.shipment?.trackingNo || "등록 전"} />
          {order.shipment?.shippedAt && <InfoRow label="발송일" value={order.shipment.shippedAt} />}
        </div>
      </section>

      {(role === "seller" || role === "admin") && order.canUpdateShipment && (
        <section style={styles.section}>
          <SectionTitle title="송장 등록" desc="판매자 또는 관리자가 배송 정보를 등록하면 주문 상태가 배송중으로 변경됩니다." />
          <form onSubmit={submitShipment} style={styles.formPanel}>
            <label style={styles.label}>
              택배사
              <input value={carrier} onChange={(e) => setCarrier(e.target.value)} required style={styles.input} placeholder="예: CJ대한통운" />
            </label>
            <label style={styles.label}>
              운송장 번호
              <input value={trackingNo} onChange={(e) => setTrackingNo(e.target.value)} required style={styles.input} placeholder="운송장 번호" />
            </label>
            <button className="buy" type="submit" disabled={isPending} style={styles.submitButton}>
              {isPending ? "저장 중..." : "배송 정보 저장"}
            </button>
          </form>
        </section>
      )}

      <section style={styles.section}>
        <SectionTitle title="반품·환불" />
        <div style={styles.panel}>
          {order.refundRequest ? (
            <>
              <InfoRow label="상태" value={order.refundRequest.status} />
              <InfoRow label="사유" value={REFUND_REASON_LABEL[order.refundRequest.reason] || order.refundRequest.reason} />
              {order.refundRequest.reasonDetail && <InfoRow label="상세" value={order.refundRequest.reasonDetail} />}
              <InfoRow label="접수일" value={order.refundRequest.requestedAt} />
            </>
          ) : (
            <div style={styles.emptyText}>접수된 반품·환불 신청이 없습니다.</div>
          )}
        </div>
      </section>

      {role === "buyer" && order.canRequestRefund && (
        <section style={styles.section}>
          <form onSubmit={submitRefund} style={styles.formPanel}>
            <label style={styles.label}>
              반품 사유
              <select value={reason} onChange={(e) => setReason(e.target.value)} style={styles.input}>
                {REFUND_REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label style={styles.label}>
              상세 내용
              <textarea value={reasonDetail} onChange={(e) => setReasonDetail(e.target.value)} style={styles.textarea} placeholder="상품 상태와 요청 내용을 입력해 주세요." />
            </label>
            <button className="buy" type="submit" disabled={isPending} style={styles.submitButton}>
              {isPending ? "신청 중..." : "반품·환불 신청"}
            </button>
          </form>
        </section>
      )}

      {message && <div style={styles.message}>{message}</div>}

      <div style={styles.footer}>
        <Link href={returnHref} style={styles.returnLink}>
          <Icon name="back" size={16} />
          돌아가기
        </Link>
      </div>
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

function Summary({ label, value }) {
  return (
    <div style={styles.summary}>
      <div style={styles.summaryValue}>{value}</div>
      <div style={styles.summaryLabel}>{label}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={styles.infoRow}>
      <span style={styles.infoLabel}>{label}</span>
      <span style={styles.infoValue}>{value}</span>
    </div>
  );
}

function StatusPill({ children }) {
  return <span style={styles.statusPill}>{children}</span>;
}

function StatePanel({ icon, title, desc, href, action }) {
  return (
    <div className="byc-scroll fadein">
      <section style={styles.state}>
        <Icon name={icon} size={40} />
        <h1 style={styles.stateTitle}>{title}</h1>
        <p style={styles.stateDesc}>{desc}</p>
        <Link href={href} className="buy" style={styles.stateButton}>{action}</Link>
      </section>
    </div>
  );
}

const styles = {
  hero: {
    margin: "14px 18px 0",
    padding: 16,
    border: "1px solid var(--line)",
    borderRadius: 8,
    background: "var(--surface)",
  },
  heroTop: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" },
  kicker: { fontSize: 10, fontWeight: 900, color: "var(--muted)", letterSpacing: "0.08em" },
  title: { margin: "4px 0", fontSize: 22, color: "var(--ink)", letterSpacing: 0 },
  meta: { fontSize: 12, color: "var(--muted)" },
  summaryGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 },
  summary: { background: "#fff", border: "1px solid var(--line)", borderRadius: 6, padding: "12px 10px" },
  summaryValue: { fontSize: 15, fontWeight: 900, color: "var(--ink)" },
  summaryLabel: { marginTop: 3, fontSize: 11, color: "var(--muted)" },
  section: { padding: "22px 18px 0" },
  sectionTitle: { marginBottom: 10 },
  sectionHeading: { margin: 0, fontSize: 16, fontWeight: 900, color: "var(--ink)", letterSpacing: 0 },
  sectionDesc: { margin: "5px 0 0", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 },
  panel: { border: "1px solid var(--line)", borderRadius: 8, background: "#fff", padding: 12 },
  itemRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 0",
    borderTop: "1px solid var(--line)",
    color: "inherit",
    textDecoration: "none",
  },
  thumb: { width: 42, height: 42, borderRadius: 6, overflow: "hidden", flexShrink: 0, border: "1px solid var(--line)" },
  itemSeller: { fontSize: 11, color: "var(--muted)", fontWeight: 700 },
  itemName: { marginTop: 2, fontSize: 13, fontWeight: 800, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  itemMeta: { marginTop: 3, fontSize: 11, color: "var(--muted)" },
  itemPrice: { fontSize: 12.5, fontWeight: 900, color: "var(--ink)", whiteSpace: "nowrap" },
  infoRow: { display: "grid", gridTemplateColumns: "78px 1fr", gap: 10, padding: "9px 0", borderTop: "1px solid var(--line)" },
  infoLabel: { fontSize: 12, color: "var(--muted)", fontWeight: 800 },
  infoValue: { fontSize: 12.5, color: "var(--ink)", lineHeight: 1.5, wordBreak: "break-word" },
  formPanel: { display: "flex", flexDirection: "column", gap: 12, border: "1px solid var(--line)", borderRadius: 8, background: "var(--surface)", padding: 12 },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 800, color: "var(--muted)" },
  input: { border: "1px solid var(--line)", background: "#fff", borderRadius: 6, padding: 11, fontSize: 13, color: "var(--ink)", fontFamily: "inherit", outline: "none" },
  textarea: { minHeight: 92, border: "1px solid var(--line)", background: "#fff", borderRadius: 6, padding: 11, fontSize: 13, color: "var(--ink)", fontFamily: "inherit", outline: "none", resize: "vertical", lineHeight: 1.55 },
  submitButton: { width: "100%" },
  emptyText: { padding: "8px 0", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 },
  message: { margin: "18px", fontSize: 12.5, color: "var(--accent)", fontWeight: 900 },
  footer: { padding: "22px 18px 34px" },
  returnLink: { display: "inline-flex", alignItems: "center", gap: 4, color: "var(--ink)", fontSize: 12.5, fontWeight: 800, textDecoration: "none" },
  statusPill: {
    display: "inline-block",
    border: "1px solid var(--line)",
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 11,
    color: "var(--muted)",
    background: "#fff",
    whiteSpace: "nowrap",
  },
  state: { padding: "96px 30px", textAlign: "center", color: "var(--muted)" },
  stateTitle: { margin: "16px 0 8px", fontSize: 21, color: "var(--ink)", letterSpacing: 0 },
  stateDesc: { margin: "0 auto 22px", fontSize: 13, lineHeight: 1.65, maxWidth: 330 },
  stateButton: { display: "inline-block", height: "auto", padding: "11px 22px", textDecoration: "none" },
};
