"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";

function loadTossSdk() {
  if (window.TossPayments) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-app-toss-sdk="true"]');
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.tosspayments.com/v2/standard";
    script.dataset.appTossSdk = "true";
    script.onload = resolve;
    script.onerror = () => reject(new Error("결제 모듈을 불러오지 못했습니다."));
    document.head.appendChild(script);
  });
}

export default function AppCheckoutScreen({ checkout }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requestPayment = async () => {
    setLoading(true);
    setError("");
    try {
      await loadTossSdk();
      const tossPayments = window.TossPayments(checkout.clientKey);
      const payment = tossPayments.payment({ customerKey: window.TossPayments.ANONYMOUS });
      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: checkout.amount },
        orderId: checkout.providerOrderId,
        orderName: checkout.orderName,
        successUrl: checkout.successUrl,
        failUrl: checkout.failUrl,
        customerEmail: checkout.customerEmail,
        customerName: checkout.customerName,
        customerMobilePhone: checkout.customerMobilePhone,
        card: {
          useEscrow: false,
          flowMode: "DEFAULT",
          useCardPoint: false,
          useAppCardOnly: false,
        },
      });
    } catch (paymentError) {
      setError(paymentError?.message || "결제창을 열지 못했습니다.");
      setLoading(false);
    }
  };

  return (
    <main className="app-checkout-page">
      <section className="app-checkout-panel">
        <div className="app-checkout-heading">
          <span>MIYONGSA</span>
          <h1>주문 내용을 확인해 주세요</h1>
          <p>{checkout.orderName}</p>
        </div>

        <div className="app-checkout-items">
          {checkout.items.map((item) => (
            <div className="app-checkout-item" key={item.productId}>
              {item.image ? <img src={item.image} alt="" /> : <div className="app-checkout-image-placeholder" />}
              <div>
                <strong>{item.name}</strong>
                <span>{item.quantity}개</span>
              </div>
              <b>{(item.price * item.quantity).toLocaleString("ko-KR")}원</b>
            </div>
          ))}
        </div>

        <div className="app-checkout-total">
          <span>총 결제금액</span>
          <strong>{checkout.amount.toLocaleString("ko-KR")}원</strong>
        </div>

        {error && <p className="app-checkout-error" role="alert">{error}</p>}
        <button className="buy app-checkout-button" type="button" onClick={requestPayment} disabled={loading}>
          {loading ? "결제창 여는 중" : `${checkout.amount.toLocaleString("ko-KR")}원 결제하기`}
        </button>
      </section>
    </main>
  );
}
