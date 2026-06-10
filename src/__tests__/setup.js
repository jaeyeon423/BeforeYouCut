import { vi } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: (_fn, _key, _opts) => _fn,
  revalidateTag: vi.fn(),
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, cache: (fn) => fn };
});
