/* data.js — shared marketplace display data */

// icon per category for placeholders
export const CAT_ICON = {
  "도구": "scissors",
  "가위": "scissors",
  "클리퍼": "clipper",
  "빗·브러시": "comb",
  "염색·펌": "bottle",
  "샴푸·케어": "bottle",
  "드라이기": "spark",
  "소독·위생": "spark",
  "앞치마·유니폼": "apron",
  "소모품": "bottle",
  "핸드메이드": "case",
  "케이스·수납": "case",
};

export const CATEGORIES = [
  { key: "가위", icon: "scissors" },
  { key: "클리퍼", icon: "clipper" },
  { key: "빗·브러시", icon: "comb" },
  { key: "염색·펌", icon: "bottle" },
  { key: "샴푸·케어", icon: "bottle" },
  { key: "드라이기", icon: "spark" },
  { key: "소독·위생", icon: "spark" },
  { key: "앞치마·유니폼", icon: "apron" },
  { key: "소모품", icon: "bottle" },
  { key: "케이스·수납", icon: "case" },
  { key: "전체", icon: "grid" },
];

// helper: 원 formatting
export const won = (n = 0) => Number(n || 0).toLocaleString("ko-KR");
