"use client";

import React from "react";
import Link from "next/link";
import Icon from "../icons";
import { Placeholder, Verified } from "../ui";
import { CAT_ICON } from "../../data/data";
import { useApp } from "@/contexts/app-context";
import { Foot } from "./home";

export default function BrandsScreen({ sellers = [] }) {
  const { following, toggleFollow } = useApp();

  return (
    <div className="byc-scroll fadein">
      {/* Brand Listing Header */}
      <div className="section" style={{ marginTop: 14, marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
          <span style={{ fontSize: 13, color: "var(--ink-soft)", fontWeight: 600 }}>브랜드 디렉토리</span>
          <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>총 {sellers.length}개 입점</span>
        </div>
      </div>

      {/* Brands List Container */}
      <div className="section" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {sellers.length > 0 ? (
          sellers.map((s) => {
            const isF = following.has(s.id);
            const onFollow = (e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFollow(s.id);
            };

            return (
              <Link
                key={s.id}
                href={`/sellers/${s.id}`}
                className="brandcard"
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "16px 14px",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-lg)",
                  textDecoration: "none",
                  color: "inherit",
                  background: "var(--paper)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  cursor: "pointer"
                }}
              >
                {/* Brand Logo / Avatar */}
                <div style={{ marginRight: 14, flexShrink: 0 }}>
                  <div style={{
                    width: 50,
                    height: 50,
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: "1.5px solid var(--line-strong)"
                  }}>
                    <Placeholder icon={CAT_ICON[s.category] || "scissors"} tone={s.tone || "tone-a"} size={24} />
                  </div>
                </div>

                {/* Brand Information */}
                <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.02em" }}>
                      {s.name}
                    </span>
                    {s.verified && <Verified size={13} />}
                  </div>
                  <p style={{
                    margin: 0,
                    fontSize: 12,
                    color: "var(--ink-soft)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    lineHeight: 1.4
                  }}>
                    {s.desc}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: "var(--muted)", marginTop: 5 }}>
                    <span>since {s.since || "2026"}</span>
                    <span>·</span>
                    <span>상품 {s.products}개</span>
                    <span>·</span>
                    <span>팔로워 {s.followers}</span>
                  </div>
                </div>

                {/* Follow Button */}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={onFollow}
                  className={"btn-follow" + (isF ? " on" : "")}
                  style={{
                    padding: "7px 12px",
                    fontSize: 11,
                    fontWeight: 700,
                    borderRadius: 999,
                    whiteSpace: "nowrap",
                    flexShrink: 0
                  }}
                >
                  {isF ? "팔로잉" : "+ 팔로우"}
                </span>
              </Link>
            );
          })
        ) : (
          <div style={{ padding: "60px 18px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
            등록된 입점 브랜드가 없습니다.
          </div>
        )}
      </div>

      <Foot />
    </div>
  );
}
