import { PrismaClient, TemplateItemType, TemplateTargetType, TodoScheduleType } from "@prisma/client";

const prisma = new PrismaClient();

type SeedTemplateItem = {
  itemType: TemplateItemType;
  title: string;
  content: Record<string, unknown>;
};

type SeedTemplate = {
  code: string;
  slug: string;
  name: string;
  description: string;
  items: SeedTemplateItem[];
};

const templates: SeedTemplate[] = [
  {
    code: "INFANT",
    slug: "infant",
    name: "영유아 가정",
    description: "아기 돌봄에 자주 필요한 생필품, 반복 할 일, 우리집 매뉴얼을 먼저 준비해요.",
    items: [
      householdItem("기저귀", "육아", 1, 7),
      householdItem("물티슈", "육아", 2, 14),
      householdItem("분유", "육아", 1, 10),
      todo("아기 세탁", "아기 옷과 손수건을 따로 모아 세탁해요.", TodoScheduleType.WEEKLY, { interval: 1 }),
      todo("젖병 소독", "젖병과 젖꼭지를 소독하고 건조 상태를 확인해요.", TodoScheduleType.DAILY, { interval: 1 }),
      todo("기저귀 재고 확인", "기저귀와 물티슈가 며칠 남았는지 확인해요.", TodoScheduleType.WEEKLY, { interval: 1 }),
      manual("아기 세탁 방법", "육아", ["아기 옷과 손수건을 분리해요.", "저자극 세제를 사용해요."]),
      manual("외출 가방 챙기기", "육아", ["기저귀와 물티슈를 챙겨요.", "분유, 젖병, 여벌 옷을 확인해요."]),
    ],
  },
  {
    code: "NEWLYWED",
    slug: "newlywed",
    name: "신혼 가정",
    description: "처음 함께 맞추는 집안일을 가볍게 시작할 수 있는 기본 세트예요.",
    items: [
      householdItem("휴지", "생활용품", 1, 21),
      householdItem("세탁세제", "세탁", 1, 30),
      householdItem("주방세제", "주방", 1, 30),
      todo("세탁", "세탁물을 모아 색상과 소재를 확인해요.", TodoScheduleType.WEEKLY, { interval: 1 }),
      todo("화장실 청소", "세면대, 변기, 바닥을 순서대로 청소해요.", TodoScheduleType.WEEKLY, { interval: 1 }),
      todo("분리수거", "종류별로 모아 배출일에 맞춰 내놓아요.", TodoScheduleType.WEEKLY, { interval: 1 }),
      manual("빨래 분류 방법", "세탁", ["흰옷과 색깔 옷을 나눠요.", "수건과 속옷은 따로 모아요."]),
      manual("분리수거 방법", "청소", ["플라스틱과 캔을 비워요.", "종이와 비닐을 따로 묶어요."]),
    ],
  },
  {
    code: "PET",
    slug: "pet",
    name: "반려동물 가정",
    description: "반려동물 돌봄에 필요한 반복 관리와 비상 정보를 함께 정리해요.",
    items: [
      householdItem("사료", "반려동물", 1, 21),
      householdItem("배변패드 또는 모래", "반려동물", 1, 14),
      householdItem("간식", "반려동물", 1, 30),
      todo("밥 주기", "정해진 양만큼 밥을 챙겨요.", TodoScheduleType.DAILY, { interval: 1 }),
      todo("물그릇 교체", "물그릇을 씻고 새 물로 바꿔요.", TodoScheduleType.DAILY, { interval: 1 }),
      todo("배변 공간 청소", "패드나 모래 상태를 확인하고 정리해요.", TodoScheduleType.DAILY, { interval: 1 }),
      manual("급여량 안내", "반려동물", ["사료 봉투의 급여량을 확인해요.", "간식은 하루 기준량을 넘기지 않아요."]),
      manual("병원/비상 연락처", "반려동물", ["주 병원 연락처를 적어둬요.", "야간 응급 병원 위치를 확인해요."]),
    ],
  },
  {
    code: "DUAL_INCOME",
    slug: "dual-income",
    name: "맞벌이 가정",
    description: "바쁜 평일에 놓치기 쉬운 집안일을 주간 루틴으로 나눠요.",
    items: [
      householdItem("휴지", "생활용품", 1, 21),
      householdItem("세탁세제", "세탁", 1, 30),
      householdItem("종량제봉투", "청소", 1, 30),
      todo("주간 장보기", "이번 주 식재료와 생필품을 확인해요.", TodoScheduleType.WEEKLY, { interval: 1 }),
      todo("세탁", "평일에 쌓인 세탁물을 정리해요.", TodoScheduleType.WEEKLY, { interval: 1 }),
      todo("화장실 청소", "주말 전에 욕실을 정리해요.", TodoScheduleType.WEEKLY, { interval: 1 }),
      manual("주말 집안일 루틴", "집안일", ["장보기 목록을 확인해요.", "세탁, 청소, 쓰레기 배출을 나눠서 해요."]),
      manual("택배 수령/정리 방법", "집안일", ["문 앞 택배를 확인해요.", "박스와 완충재를 분리수거해요."]),
    ],
  },
];

async function main() {
  for (const template of templates) {
    const templateSet = await prisma.templateSet.upsert({
      where: {
        code: template.code,
      },
      update: {
        slug: template.slug,
        name: template.name,
        description: template.description,
        targetType: TemplateTargetType.FAMILY,
        isActive: true,
        deletedAt: null,
      },
      create: {
        code: template.code,
        slug: template.slug,
        name: template.name,
        description: template.description,
        targetType: TemplateTargetType.FAMILY,
        isActive: true,
      },
    });

    await prisma.templateItem.deleteMany({
      where: {
        templateSetId: templateSet.id,
      },
    });

    await prisma.templateItem.createMany({
      data: template.items.map((item, index) => ({
        templateSetId: templateSet.id,
        itemType: item.itemType,
        title: item.title,
        content: item.content,
        sortOrder: index + 1,
      })),
    });
  }
}

function householdItem(title: string, category: string, minStock: number, cycleDays: number): SeedTemplateItem {
  return {
    itemType: TemplateItemType.HOUSEHOLD_ITEM,
    title,
    content: {
      category,
      minStock,
      cycleDays,
    },
  };
}

function todo(
  title: string,
  description: string,
  scheduleType: TodoScheduleType,
  repeatRule: Record<string, unknown>,
): SeedTemplateItem {
  return {
    itemType: TemplateItemType.TODO_TASK,
    title,
    content: {
      description,
      schedule: {
        scheduleType,
        repeatRule,
      },
    },
  };
}

function manual(title: string, category: string, steps: string[]): SeedTemplateItem {
  return {
    itemType: TemplateItemType.HOME_MANUAL,
    title,
    content: {
      category,
      steps: steps.map((step) => ({
        title: step,
      })),
    },
  };
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
