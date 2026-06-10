const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const dotenv = require('dotenv');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

dotenv.config({ path: '.env.local' });
dotenv.config();

let connectionString =
  process.env.DIRECT_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL;

if (connectionString) {
  connectionString = connectionString.replace(/^["']|["']$/g, '');
}
const maskedConnStr = connectionString ? connectionString.replace(/:[^:@/]+@/, ':***@') : 'undefined';
console.log("Using connection string:", maskedConnStr);

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SELLERS = {
  steelgrain: {
    id: "steelgrain", name: "STEEL & GRAIN", verified: true,
    desc: "단조 수제 가위 · 일본 세키 공방", category: "도구",
    followers: "12.4K", products: 18, since: "2009",
    tone: "tone-b",
    story: [
      "STEEL & GRAIN은 일본 세키(関) 지역 장인와 협업해 한 자루씩 단조하는 수제 커팅 시저 브랜드입니다.",
      "440C·코발트 합금강을 직접 선별하고, 날의 각도와 텐션을 미용사 개개인의 커트 습관에 맞춰 조정해 드립니다.",
      "도구는 손의 연장이라 믿습니다. 10년을 써도 손에 무리가 가지 않는 균형을 만듭니다."
    ],
    notice: "6월 한정 — 시저 구매 시 무료 텐션 조정 1회 제공",
  },
  bladebros: {
    id: "bladebros", name: "BLADE BROS", verified: true,
    desc: "바버 클리퍼 & 트리머 전문", category: "도구",
    followers: "9.8K", products: 14, since: "2016",
    tone: "tone-d",
    story: [
      "BLADE BROS는 현직 바버들이 만든 클리퍼·트리머 브랜드입니다.",
      "현장에서 하루 80컷을 버티는 모터 내구성과 코드리스 지속시간에 집착합니다.",
      "모든 제품은 실제 바버샵 3개월 필드 테스트를 거쳐 출시됩니다."
    ],
    notice: "신상 코드리스 PRO — 첫 구매 한정 8% 쿠폰",
  },
  comblab: {
    id: "comblab", name: "COMB LAB", verified: false,
    desc: "빗 · 브러시 연구소", category: "빗·브러시",
    followers: "5.6K", products: 22, since: "2018",
    tone: "tone-a",
    story: [
      "COMB LAB은 정전기와 열에 강한 카본 소재 빗을 연구하는 스튜디오입니다.",
      "블로우 드라이 시 두피에 닿는 열 분산까지 계산해 브러시 핀 배열을 설계합니다."
    ],
    notice: "카본 콤 세트 리뉴얼 출시",
  },
  apronseoul: {
    id: "apronseoul", name: "APRON SEOUL", verified: true,
    desc: "디자이너 앞치마 & 살롱 유니폼", category: "앞치마·유니폼",
    followers: "8.1K", products: 16, since: "2019",
    tone: "tone-c",
    story: [
      "APRON SEOUL은 미용 현장을 위한 워크웨어를 디자인합니다.",
      "발수·방염 가공 원단에 도구 동선을 고려한 포켓 구성을 더했습니다.",
      "살롱 단위 단체 주문 시 자수 로고 각인이 가능합니다."
    ],
    notice: "살롱 단체 주문 — 5벌 이상 자수 무료",
  },
  toneproject: {
    id: "toneproject", name: "TONE PROJECT", verified: false,
    desc: "염모제 · 살롱 소모품", category: "소모품",
    followers: "3.2K", products: 31, since: "2021",
    tone: "tone-a",
    story: [
      "TONE PROJECT는 발색과 두피 자극의 균형을 맞춘 살롱 전용 염모제 라인입니다.",
      "비건 인증 원료와 저자극 산성 펌제를 함께 제안합니다."
    ],
    notice: "정기구매 시 최대 15% 할인",
  },
  foldstudio: {
    id: "foldstudio", name: "FOLD STUDIO", verified: false,
    desc: "핸드메이드 가죽 도구 케이스", category: "핸드메이드",
    followers: "2.4K", products: 9, since: "2020",
    tone: "tone-c",
    story: [
      "FOLD STUDIO는 식물성 탄닌 가죽으로 시저 케이스와 툴 롤백을 한 점씩 제작합니다.",
      "이니셜 각인과 칸 수 커스텀이 가능하며, 쓸수록 길드는 가죽의 변화를 의도했습니다."
    ],
    notice: "이니셜 각인 무료 (주문 시 요청)",
  },
};

const PRODUCTS = [
  {
    id: "p1", sellerId: "steelgrain", name: "단조 커팅 시저 6.0인치 · 오프셋 핸들", price: 285000,
    cat: "가위", icon: "scissors", tone: "tone-b", badge: "best",
    rating: 4.9, reviews: 312, likesCount: 1840, desc: "한 자루씩 단조한 플래그십 커팅 시저. 손목 부담을 줄인 오프셋 핸들.",
    spec: [["소재", "코발트 합금강 V10"], ["사이즈", "6.0 inch"], ["핸들", "오프셋 / 오프닝 조절"], ["원산지", "일본 세키"]]
  },
  {
    id: "p2", sellerId: "steelgrain", name: "세니징 시저 6.5인치 · 30목", price: 240000,
    cat: "가위", icon: "scissors", tone: "tone-b", badge: null,
    rating: 4.8, reviews: 154, likesCount: 920, desc: "자연스러운 숱 정리를 위한 30목 세니징 시저.",
    spec: [["소재", "440C 스테인리스"], ["사이즈", "6.5 inch"], ["커트율", "약 25%"]]
  },
  {
    id: "p3", sellerId: "steelgrain", name: "다마스커스 한정판 시저 · 넘버드", price: 690000,
    cat: "가위", icon: "scissors", tone: "tone-b", badge: "ltd",
    rating: 5.0, reviews: 28, likesCount: 640, desc: "73겹 다마스커스 패턴, 50자루 한정 넘버링.",
    spec: [["소재", "다마스커스 73겹"], ["에디션", "넘버드 / 50자루"], ["케이스", "전용 가죽 포함"]]
  },
  {
    id: "p4", sellerId: "bladebros", name: "코드리스 클리퍼 PRO · 무선", price: 178000,
    cat: "클리퍼", icon: "clipper", tone: "tone-d", badge: "new", disc: 8, orig: 193000,
    rating: 4.7, reviews: 203, likesCount: 1510, desc: "하루 풀가동을 견디는 현장형 무선 클리퍼.",
    spec: [["모터", "DC 무소음"], ["사용시간", "약 4시간"], ["충전", "USB-C 고속"], ["날", "스테인리스 T-blade"]]
  },
  {
    id: "p5", sellerId: "bladebros", name: "디테일 트리머 미니 · 아웃라이너", price: 92000,
    cat: "클리퍼", icon: "clipper", tone: "tone-d", badge: null,
    rating: 4.8, reviews: 176, likesCount: 880, desc: "0.1mm 클로즈 컷, 정밀 아웃라이닝용 트리머.",
    spec: [["용도", "아웃라인 / 디테일"], ["날", "0.1mm 클로즈"], ["무게", "118g"]]
  },
  {
    id: "p6", sellerId: "comblab", name: "카본 커팅 콤 세트 · 5종", price: 34000,
    cat: "빗·브러시", icon: "comb", tone: "tone-a", badge: "best",
    rating: 4.9, reviews: 521, likesCount: 2240, desc: "정전기에 강한 카본 커팅 콤 5종 세트.",
    spec: [["소재", "카본 파이버"], ["구성", "커팅콤 5종"], ["내열", "230℃"]]
  },
  {
    id: "p7", sellerId: "comblab", name: "롤 브러시 3종 · 세라믹 코어", price: 48000,
    cat: "빗·브러시", icon: "brush", tone: "tone-a", badge: null,
    rating: 4.7, reviews: 198, likesCount: 760, desc: "열 분산 세라믹 코어 롤 브러시 3종.",
    spec: [["사이즈", "43 / 53 / 63mm"], ["코어", "세라믹 알루미늄"]]
  },
  {
    id: "p8", sellerId: "comblab", name: "꼬리빗 10P · 살롱팩", price: 19000,
    cat: "빗·브러시", icon: "comb", tone: "tone-a", badge: null,
    rating: 4.6, reviews: 342, likesCount: 410, desc: "살롱용 꼬리빗 10개입 벌크 팩.",
    spec: [["구성", "10개입"], ["소재", "내열 ABS"]]
  },
  {
    id: "p9", sellerId: "apronseoul", name: "워크 에이프런 · 차콜", price: 68000,
    cat: "앞치마·유니폼", icon: "apron", tone: "tone-c", badge: "best",
    rating: 4.9, reviews: 289, likesCount: 1320, desc: "도구 동선을 고려한 5포켓 워크 에이프런.",
    spec: [["원단", "발수·방염 가공"], ["포켓", "도구 5칸"], ["조절", "버클 크로스백"]]
  },
  {
    id: "p10", sellerId: "apronseoul", name: "린넨 커트보 + 케이프 세트", price: 54000,
    cat: "앞치마·유니폼", icon: "apron", tone: "tone-c", badge: null,
    rating: 4.7, reviews: 121, likesCount: 540, desc: "가벼운 워싱 린넨 커트보·케이프 세트.",
    spec: [["원단", "워싱 린넨"], ["구성", "커트보 + 케이프"]]
  },
  {
    id: "p11", sellerId: "toneproject", name: "염모제 스타터 키트 · 12색", price: 120000,
    cat: "소모품", icon: "bottle", tone: "tone-a", badge: "new",
    rating: 4.6, reviews: 88, likesCount: 470, desc: "살롱 입문용 12색 염모제 스타터 키트.",
    spec: [["구성", "12색 + 산화제"], ["인증", "비건 원료"], ["용량", "각 80g"]]
  },
  {
    id: "p12", sellerId: "toneproject", name: "산성 펌제 1L · 저자극", price: 38000,
    cat: "소모품", icon: "bottle", tone: "tone-a", badge: null, disc: 12, orig: 43000,
    rating: 4.5, reviews: 64, likesCount: 230, desc: "두피 자극을 낮춘 산성 펌 1제.",
    spec: [["타입", "산성 / 저자극"], ["용량", "1L"]]
  },
  {
    id: "p13", sellerId: "foldstudio", name: "가죽 시저 케이스 · 5구", price: 89000,
    cat: "핸드메이드", icon: "case", tone: "tone-c", badge: "new",
    rating: 4.9, reviews: 47, likesCount: 690, desc: "한 점씩 제작하는 5구 가죽 시저 케이스.",
    spec: [["가죽", "베지터블 탄닌"], ["수납", "시저 5구"], ["커스텀", "이니셜 각인"]]
  },
  {
    id: "p14", sellerId: "foldstudio", name: "툴 롤백 · 캔버스 x 가죽", price: 62000,
    cat: "핸드메이드", icon: "case", tone: "tone-c", badge: null,
    rating: 4.8, reviews: 33, likesCount: 380, desc: "왁스드 캔버스 롤업 툴백, 8칸 구성.",
    spec: [["소재", "왁스드 캔버스 + 가죽"], ["수납", "롤업 8칸"]]
  }
];

async function main() {
  console.log("Seeding started...");

  // Seed Sellers and their corresponding Users
  for (const [id, sellerData] of Object.entries(SELLERS)) {
    const userId = `user_${id}`;
    
    // 1. Upsert User
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: `${id}@beforeyoucut.com`,
        name: sellerData.name,
        role: "SELLER",
      }
    });

    // 2. Upsert Seller
    await prisma.seller.upsert({
      where: { id: id },
      update: {
        name: sellerData.name,
        verified: sellerData.verified,
        desc: sellerData.desc,
        category: sellerData.category,
        followers: sellerData.followers,
        since: sellerData.since,
        tone: sellerData.tone,
        story: sellerData.story,
        notice: sellerData.notice,
      },
      create: {
        id: id,
        name: sellerData.name,
        verified: sellerData.verified,
        desc: sellerData.desc,
        category: sellerData.category,
        followers: sellerData.followers,
        since: sellerData.since,
        tone: sellerData.tone,
        story: sellerData.story,
        notice: sellerData.notice,
        userId: userId,
      }
    });
  }

  console.log("Sellers seeded.");

  // Seed Products
  for (const product of PRODUCTS) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: {
        name: product.name,
        price: product.price,
        cat: product.cat,
        icon: product.icon,
        tone: product.tone,
        badge: product.badge,
        disc: product.disc || null,
        orig: product.orig || null,
        rating: product.rating,
        reviews: product.reviews,
        likesCount: product.likesCount,
        desc: product.desc,
        spec: product.spec,
        sellerId: product.sellerId,
      },
      create: {
        id: product.id,
        name: product.name,
        price: product.price,
        cat: product.cat,
        icon: product.icon,
        tone: product.tone,
        badge: product.badge,
        disc: product.disc || null,
        orig: product.orig || null,
        rating: product.rating,
        reviews: product.reviews,
        likesCount: product.likesCount,
        desc: product.desc,
        spec: product.spec,
        sellerId: product.sellerId,
      }
    });
  }

  console.log("Products seeded.");

  // Seed Main Banner
  await prisma.mainBanner.upsert({
    where: { id: "hero" },
    update: {
      kicker: "BEFORE YOU CUT",
      title: "내 미용 브랜드를\n입점시켜보세요",
      desc: "가위, 앞치마, 클리퍼 등 직접 제작한 도구를 판매할 셀러를 모십니다.",
      ctaText: "입점 신청하기",
      ctaLink: "/my",
      icon: "store",
      tone: "tone-a",
    },
    create: {
      id: "hero",
      kicker: "BEFORE YOU CUT",
      title: "내 미용 브랜드를\n입점시켜보세요",
      desc: "가위, 앞치마, 클리퍼 등 직접 제작한 도구를 판매할 셀러를 모십니다.",
      ctaText: "입점 신청하기",
      ctaLink: "/my",
      icon: "store",
      tone: "tone-a",
    }
  });
  console.log("Main Banner seeded.");
  console.log("Seeding finished successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
