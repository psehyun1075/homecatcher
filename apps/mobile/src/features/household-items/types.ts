export interface ProductLink {
  id: string;
  url: string;
  productName: string | null;
  mallName: string | null;
  productImageUrl: string | null;
  price: number | null;
  currency: string;
  isPrimary?: boolean;
}

export interface PurchaseRule {
  id: string;
  exactOnly: boolean;
  substitutionPolicy: string;
  priceLimit: number | null;
  approvalRequiredAbove: number | null;
  deliveryCondition: string | null;
  reorderThreshold: number | null;
  preferredMallName: string | null;
  note: string | null;
}

export interface HouseholdItem {
  id: string;
  familyId: string;
  name: string;
  category: string | null;
  unit: string | null;
  minStock: number | null;
  cycleDays: number | null;
  lastPurchasedAt: string | null;
  nextEstimatedRunOutAt: string | null;
  memo: string | null;
  productLinks: ProductLink[];
  purchaseRule: PurchaseRule | null;
}

export interface ReorderPreview {
  householdItem: Pick<HouseholdItem, "id" | "name" | "category" | "unit" | "minStock" | "cycleDays" | "memo" | "lastPurchasedAt" | "nextEstimatedRunOutAt">;
  primaryProductLink: ProductLink | null;
  itemName: string;
  representativeProductUrl: string | null;
  productName: string | null;
  productImageUrl: string | null;
  mallName: string | null;
  previewPrice: number | null;
  recentPurchaseAmount: number | null;
  purchaseRule: PurchaseRule | null;
  exceedsPriceLimit: boolean;
  requiresApprovalOrConfirmation: boolean;
  lastPurchasedAt: string | null;
  nextEstimatedRunOutAt: string | null;
}

export interface ItemPurchase {
  id: string;
  requestId: string;
  householdItemId: string;
  householdItemName: string;
  productLinkId: string | null;
  quantity: number | null;
  unitPrice: number | null;
  totalAmount: number;
  currency: string;
  purchasedAt: string;
  stockAfterPurchase: number | null;
  note: string | null;
}

export interface CreatePurchaseInput {
  requestId: string;
  productLinkId?: string | null;
  quantity?: number;
  unitPrice?: number;
  totalAmount: number;
  currency?: string;
  purchasedAt?: string;
  stockAfterPurchase?: number;
  note?: string;
  confirmRuleOverride?: boolean;
}
