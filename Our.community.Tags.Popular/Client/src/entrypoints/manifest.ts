export const manifests: Array<UmbExtensionManifest> = [
  {
    name: "Ourcommunity Tags Popular Entrypoint",
    alias: "Our.community.Tags.Popular.Entrypoint",
    type: "backofficeEntryPoint",
    js: () => import("./entrypoint.js"),
  },
];
