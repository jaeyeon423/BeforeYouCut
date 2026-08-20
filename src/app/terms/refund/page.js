import React from "react";
import { TabHeader } from "@/components/nav";
import siteConfig from "@/site.config";
import TermsLayout from "../_TermsLayout";

export const metadata = {
  title: `청약철회 및 교환·반품·환불정책 — ${siteConfig.service.name}`,
  description: `${siteConfig.service.name}의 전자상거래법 기반 청약철회, 교환, 반품 및 환불 규정 안내입니다.`,
};

export default function RefundPolicyPage() {
  const { version, effectiveAt } = siteConfig.terms.refundPolicy;
  const { business, service } = siteConfig;

  return (
    <>
      <TabHeader title="청약철회·환불정책" bordered />
      <TermsLayout title="청약철회 및 교환·반품·환불정책" version={version} effectiveAt={effectiveAt}>
        
        <Section title="제1조 (목적)">
          본 정책은 {business.name}(이하 &quot;회사&quot;)이 운영하는 {service.name} 마켓플레이스(이하 &quot;서비스&quot;)에서 
          구매자가 주문·결제한 상품의 청약철회(주문 취소, 반품), 교환 및 대금 환불에 관한 제반 사항을 규정하여, 
          「전자상거래 등에서의 소비자보호에 관한 법률」 등 관련 법령을 준수하고 이용자의 권익을 보호함을 목적으로 합니다.
        </Section>

        <Section title="제2조 (청약철회 및 반품 기간)">
          <ol>
            <li>
              <strong>일반 반품(단순 변심 등):</strong> 구매자는 상품을 배송받은 날(수령일)로부터 <strong>7일 이내</strong>에 
              청약철회 및 반품을 요청할 수 있습니다.
            </li>
            <li>
              <strong>상품 하자 및 표시·광고 불일치:</strong> 배송받은 상품의 내용이 표시·광고 내용과 다르거나 계약 내용과 다르게 
              이행된 경우에는, 상품을 수령한 날부터 <strong>3개월 이내</strong>, 그 사실을 안 날 또는 알 수 있었던 날부터 
              <strong>30일 이내</strong>에 청약철회를 할 수 있습니다.
            </li>
          </ol>
        </Section>

        <Section title="제3조 (청약철회가 제한되는 경우)">
          전자상거래 등에서의 소비자보호에 관한 법률 제17조 제2항에 따라, 다음 각 호의 어느 하나에 해당하는 경우에는 
          구매자의 청약철회가 제한될 수 있습니다.
          <ul>
            <li>구매자의 책임 있는 사유로 상품 등이 멸실되거나 훼손된 경우 (단, 상품 확인을 위한 포장 개봉은 제외)</li>
            <li>구매자의 사용 또는 일부 소비로 인하여 상품의 가치가 현저히 감소한 경우 (예: 미용 가위/클리퍼 시술 실사용, 위생 용품 개봉, 세척/오일링 등)</li>
            <li>시간의 경과에 의하여 재판매가 곤란할 정도로 상품 등의 가치가 현저히 감소한 경우</li>
            <li>복제 가능한 상품의 포장을 훼손한 경우</li>
            <li>개별 주문에 따라 맞춤형으로 제작·각인되는 상품으로서 사전에 청약철회 제한을 고지하고 구매자의 개별 동의를 받은 경우</li>
          </ul>
        </Section>

        <Section title="제4조 (반품 및 교환 배송비 부담)">
          <ol>
            <li>
              <strong>구매자 부담 (단순 변심 등):</strong> 상품의 하자가 없으나 구매자의 단순 변심, 색상/사이즈 착오 등으로 
              반품·교환을 요청하는 경우, 왕복 배송비는 <strong>구매자가 부담</strong>합니다.
            </li>
            <li>
              <strong>판매자 부담 (상품 하자/오배송 등):</strong> 상품의 불량·하자, 파손, 오배송, 표시·광고 내용과 다른 상품이 
              배송된 경우 반품 및 재배송에 소요되는 모든 비용은 <strong>판매자가 전액 부담</strong>합니다.
            </li>
          </ol>
        </Section>

        <Section title="제5조 (청약철회 및 반품 신청 절차)">
          <ol>
            <li>
              <strong>접수:</strong> 구매자는 서비스 내 [마이페이지 &gt; 주문 내역] 화면에서 해당 주문 건의 [반품/환불 신청]을 
              접수하거나, 고객센터({business.email})를 통해 신청할 수 있습니다.
            </li>
            <li>
              <strong>상품 수거 및 반송:</strong> 반품 접수 후 안내된 반품 주소지로 상품을 안전하게 포장하여 발송합니다.
            </li>
            <li>
              <strong>입고 검수:</strong> 반송된 상품이 판매자 또는 물류지에 입고되면 상품 상태(미사용 여부, 구성품 누락 여부 등)를 
              검수한 후 최종 환불 또는 교환 승인 처리가 진행됩니다.
            </li>
          </ol>
        </Section>

        <Section title="제6조 (대금 환불 처리 및 환불 기한)">
          <ol>
            <li>
              회사는 반품 상품의 회수 및 입고 검수가 완료된 날로부터 <strong>영업일 기준 3일 이내</strong>에 토스페이먼츠(PG사) 결제 취소 
              API를 호출하여 대금 환급 절차를 진행합니다.
            </li>
            <li>
              <strong>결제수단별 환불 반영 소요 기간:</strong>
              <ul>
                <li><strong>신용·체크카드:</strong> 승인 취소 완료 후 카드사 영업일 기준 약 3~5일 이내 한도 복구 또는 매입 취소 반영</li>
                <li><strong>계좌이체 / 가상계좌:</strong> 승인 취소 완료 후 등록된 구매자 환불 계좌로 즉시 또는 익영업일 이내 입금</li>
                <li><strong>간편결제 (토스페이, 카카오페이 등):</strong> 해당 간편결제사 정책에 따라 원결제수단 취소 또는 포인트 환원</li>
              </ul>
            </li>
            <li>
              주문 당일 결제 후 출고 전에 취소 요청이 승인된 경우에는 별도의 반품 검수 없이 즉시 전액 결제 취소 처리됩니다.
            </li>
          </ol>
        </Section>

        <Section title="제7조 (통신판매중개 및 분쟁 해결 지원)">
          <ol>
            <li>
              회사는 통신판매중개자로서 판매자와 구매자 간의 자유로운 거래 장소를 제공하며, 상품의 배송, 교환, 환불의 
              1차적인 이행 의무는 상품을 판매한 해당 입점 셀러에게 있습니다.
            </li>
            <li>
              회사는 소비자의 정당한 권익 보호와 원활한 거래를 위하여 판매자와 구매자 사이에 반품·환불 관련 분쟁이 발생할 경우, 
              전자상거래법 등 관련 법령에 근거하여 사실관계 확인 및 원만한 분쟁 조정을 적극적으로 지원합니다.
            </li>
          </ol>
        </Section>

        <Section title="제8조 (고객센터 및 반품 문의처)">
          청약철회, 교환, 반품 및 환불에 관한 문의사항은 아래 고객센터를 통해 신속하게 안내받으실 수 있습니다.
          <ul style={{ marginTop: 8 }}>
            <li><strong>상호명:</strong> {business.name}</li>
            <li><strong>대표자:</strong> {business.representative}</li>
            <li><strong>사업자등록번호:</strong> {business.businessRegNo}</li>
            <li><strong>고객센터 이메일:</strong> <a href={`mailto:${business.email}`} style={{ color: "var(--ink)", textDecoration: "underline" }}>{business.email}</a></li>
          </ul>
        </Section>

        <Section title="부칙">
          본 정책은 <strong>{effectiveAt}</strong>부터 시행됩니다.
        </Section>
      </TermsLayout>
    </>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <h3 style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 10, color: "var(--ink)", letterSpacing: "-0.01em" }}>
        {title}
      </h3>
      <div style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.8 }}>
        {children}
      </div>
    </div>
  );
}
