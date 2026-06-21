export interface AccountCategory {
  id: string;
  familyId: string;
  code: string;
  name: string;
  categoryType: "EXPENSE" | "INCOME";
}

export interface AccountEntry {
  id: string;
  familyId: string;
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  entryType: "EXPENSE" | "INCOME";
  amount: number | string;
  currency: string;
  occurredAt: string;
  title: string;
  memo: string | null;
  itemPurchaseLogId: string | null;
}

export interface MonthlySummary {
  month: string;
  totalExpense: number | string;
  categorySummaries: Array<{
    categoryCode: string;
    categoryName: string;
    amount: number | string;
    entryCount: number;
  }>;
}

export interface CreateAccountEntryInput {
  categoryId: string;
  entryType: "EXPENSE";
  amount: number;
  currency?: string;
  occurredAt: string;
  title: string;
  memo?: string;
}
