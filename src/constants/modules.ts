export const ALL_MODULE_KEYS = [
  'employee-dashboard',
  'timekeeping',
  'tasks',
  'reports',
  'team',
  'settings',
] as const;

export type ModuleKey = (typeof ALL_MODULE_KEYS)[number];

export const BASE_MODULE_KEYS: ModuleKey[] = ['employee-dashboard'];

export const isModuleKey = (value: unknown): value is ModuleKey =>
  typeof value === 'string' && (ALL_MODULE_KEYS as readonly string[]).includes(value);

export const normalizeModuleKeys = (values: readonly unknown[] | null | undefined): ModuleKey[] => {
  if (!values) return [];
  const seen = new Set<ModuleKey>();
  for (const value of values) {
    if (isModuleKey(value) && !seen.has(value)) {
      seen.add(value);
    }
  }
  return Array.from(seen);
};

export const ensureBaseModules = (modules: readonly ModuleKey[]): ModuleKey[] => {
  const merged = new Set<ModuleKey>([...BASE_MODULE_KEYS]);
  for (const module of modules) {
    if (isModuleKey(module)) {
      merged.add(module);
    }
  }
  return Array.from(merged);
};
