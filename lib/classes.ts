// Shared class/category definitions + per-class pricing tiers.

export type ClassKey =
  | 'third_preparatory'
  | 'first_secondary'
  | 'second_secondary'
  | 'third_secondary_literary'
  | 'third_secondary_math';

export type PlanId = 'monthly' | 'yearly' | 'semester';

export interface ClassPlan {
  id: PlanId;
  name: string;
  price: number;
  period: string;
}

export interface ClassGroup {
  key: ClassKey;
  name: string;
  short: string;
  icon: string;
  plans: ClassPlan[];
}

export const CLASSES: ClassGroup[] = [
  {
    key: 'third_preparatory',
    name: 'الصف الثالث الاعدادي',
    short: 'الثالث الاعدادي',
    icon: 'GraduationCap',
    plans: [
      { id: 'monthly', name: 'اشتراك شهري', price: 100, period: 'شهرياً' },
      { id: 'semester', name: 'اشتراك فصل دراسي', price: 250, period: 'للفصل الدراسي' },
      { id: 'yearly', name: 'اشتراك سنوي', price: 400, period: 'سنوياً' },
    ],
  },
  {
    key: 'first_secondary',
    name: 'الصف الأول الثانوي',
    short: 'الأول الثانوي',
    icon: 'BookOpen',
    plans: [
      { id: 'monthly', name: 'اشتراك شهري', price: 125, period: 'شهرياً' },
      { id: 'semester', name: 'اشتراك فصل دراسي', price: 450, period: 'للفصل الدراسي' },
      { id: 'yearly', name: 'اشتراك سنوي', price: 1000, period: 'سنوياً' },
    ],
  },
  {
    key: 'second_secondary',
    name: 'الصف الثاني الثانوي (بكالوريا)',
    short: 'الثاني الثانوي بكالوريا',
    icon: 'BarChart3',
    plans: [
      { id: 'monthly', name: 'اشتراك شهري', price: 150, period: 'شهرياً' },
      { id: 'semester', name: 'اشتراك فصل دراسي', price: 500, period: 'للفصل الدراسي' },
      { id: 'yearly', name: 'اشتراك سنوي', price: 1100, period: 'سنوياً' },
    ],
  },
  {
    key: 'third_secondary_literary',
    name: 'الصف الثالث الثانوي (أدبي)',
    short: 'الثالث الثانوي أدبي',
    icon: 'Sparkles',
    plans: [
      { id: 'monthly', name: 'اشتراك شهري', price: 200, period: 'شهرياً' },
      { id: 'semester', name: 'اشتراك فصل دراسي', price: 600, period: 'للفصل الدراسي' },
      { id: 'yearly', name: 'اشتراك سنوي', price: 1500, period: 'سنوياً' },
    ],
  },
  {
    key: 'third_secondary_math',
    name: 'الصف الثالث الثانوي (علمي رياضة)',
    short: 'الثالث الثانوي علمي رياضة',
    icon: 'Target',
    plans: [
      { id: 'monthly', name: 'اشتراك شهري', price: 250, period: 'شهرياً' },
      { id: 'semester', name: 'اشتراك فصل دراسي', price: 750, period: 'للفصل الدراسي' },
      { id: 'yearly', name: 'اشتراك سنوي', price: 2000, period: 'سنوياً' },
    ],
  },
];

export const CLASS_MAP = CLASSES.reduce<Record<string, ClassGroup>>((acc, c) => {
  acc[c.key] = c;
  return acc;
}, {});

export function getClassByKey(key?: string | null): ClassGroup | undefined {
  if (!key) return undefined;
  return CLASS_MAP[key];
}

export const CLASS_OPTIONS = CLASSES.map((c) => ({ value: c.key, label: c.name }));

const DEFAULT_PLAN_PRICES: Record<PlanId, number> = {
  monthly: 150,
  semester: 500,
  yearly: 1000,
};

export function getPlanPrice(
  classKey: string | null | undefined,
  plan: PlanId
): number {
  if (classKey) {
    const group = CLASS_MAP[classKey];
    const classPlan = group?.plans.find((p) => p.id === plan);
    if (classPlan) return classPlan.price;
  }
  return DEFAULT_PLAN_PRICES[plan];
}
