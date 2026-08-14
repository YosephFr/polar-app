import { createSerwistRoute } from "@serwist/turbopack";

const revision = process.env.GIT_SHA || process.env.NEXT_PUBLIC_BUILD_ID || crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: "src/sw.ts",
  additionalPrecacheEntries: [
    { url: "/sin-conexion", revision },
  ],
  useNativeEsbuild: true,
});
