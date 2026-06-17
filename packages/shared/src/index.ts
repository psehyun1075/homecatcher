export const APP_NAME_KO = "홈캐처" as const;
export const APP_NAME_EN = "HomeCatcher" as const;
export const APP_SLUG = "home-catcher" as const;
export const API_VERSION = "0.1.0" as const;

export const PRODUCT_METADATA_STATUSES = ["success", "partial", "failed", "timeout"] as const;

export type ProductMetadataStatus = (typeof PRODUCT_METADATA_STATUSES)[number];
