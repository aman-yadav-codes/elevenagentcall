import { getDatabase } from "./mongodb";

export interface SupermarketVariant {
  sku: string;
  variantName: string;
  colorOrFlavor: string;
  size: string;
  price: number;
  stock: number;
}

export interface SupermarketProduct {
  _id?: string;
  sku: string;
  name: string;
  sectionId: string;
  sectionName: string;
  aisle: string;
  category: string;
  price: number;
  unit: string;
  stockQuantity: number;
  reorderThreshold: number;
  status: "In Stock" | "Low Stock" | "Out of Stock";
  supplier: string;
  variants: SupermarketVariant[];
  expiryDate: string;
}

export interface SupermarketSection {
  _id?: string;
  sectionId: string;
  name: string;
  aisleNumber: string;
  zone: string;
  temperature: string;
  manager: string;
  shelvesCount: number;
  restockPriority: "High" | "Critical" | "Normal" | "Low";
  description: string;
}

export interface RecurrentWeeklyItem {
  sku?: string;
  productName: string;
  typicalQty?: number;
  aisle?: string;
  section?: string;
}

export interface SupermarketCustomer {
  _id?: string;
  customerId: string;
  name: string;
  phone: string;
  email: string;
  membershipTier: string;
  shoppingFrequency: string;
  loyaltyPoints: number;
  totalSpent: number;
  preferredPayment: string;
  recurrentWeeklyItems: Array<RecurrentWeeklyItem | string>;
  lastVisitDate: string;
  notes: string;
}

export interface StockAlert {
  _id?: string;
  alertId: string;
  sku: string;
  productName: string;
  sectionName: string;
  aisle: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  type: string;
  currentStock: number;
  reorderThreshold: number;
  message: string;
  createdAt: string;
}

export interface OperationLog {
  id: string;
  timestamp: string;
  action: string;
  parameters: Record<string, unknown>;
  resultSummary: string;
  durationMs: number;
}

// Queries
export async function getSupermarketSections(): Promise<SupermarketSection[]> {
  const db = await getDatabase();
  return (await db.collection("sections").find({}).toArray()) as unknown as SupermarketSection[];
}

export async function getSupermarketProducts(filter?: { sectionId?: string; status?: string }): Promise<SupermarketProduct[]> {
  const db = await getDatabase();
  const query: Record<string, unknown> = {};
  if (filter?.sectionId) query.sectionId = filter.sectionId;
  if (filter?.status) query.status = filter.status;
  return (await db.collection("products").find(query).toArray()) as unknown as SupermarketProduct[];
}

export async function getStockAlerts(): Promise<StockAlert[]> {
  const db = await getDatabase();
  return (await db.collection("stock_alerts").find({}).toArray()) as unknown as StockAlert[];
}

export async function searchProducts(keyword: string): Promise<SupermarketProduct[]> {
  const db = await getDatabase();
  const clean = keyword.trim();
  const regex = new RegExp(clean, "i");

  return (await db
    .collection("products")
    .find({
      $or: [
        { name: { $regex: regex } },
        { sku: { $regex: regex } },
        { category: { $regex: regex } },
        { sectionName: { $regex: regex } },
        { "variants.variantName": { $regex: regex } },
        { "variants.colorOrFlavor": { $regex: regex } },
      ],
    })
    .limit(10)
    .toArray()) as unknown as SupermarketProduct[];
}

export async function getProductBySku(sku: string): Promise<SupermarketProduct | null> {
  const db = await getDatabase();
  return (await db
    .collection("products")
    .findOne({
      $or: [
        { sku: sku.toUpperCase().trim() },
        { "variants.sku": sku.toUpperCase().trim() },
      ],
    })) as unknown as SupermarketProduct | null;
}

export async function updateStock(sku: string, addedQuantity: number): Promise<SupermarketProduct | null> {
  const db = await getDatabase();
  const cleanSku = sku.toUpperCase().trim();

  const product = await getProductBySku(cleanSku);
  if (!product) return null;

  const newQty = Math.max(0, product.stockQuantity + addedQuantity);
  const newStatus =
    newQty === 0 ? "Out of Stock" : newQty <= product.reorderThreshold ? "Low Stock" : "In Stock";

  await db.collection("products").updateOne(
    { sku: product.sku },
    {
      $set: {
        stockQuantity: newQty,
        status: newStatus,
        lastUpdated: new Date().toISOString(),
      },
    }
  );

  // If now in stock, resolve matching alert
  if (newQty > product.reorderThreshold) {
    await db.collection("stock_alerts").deleteMany({ sku: product.sku });
  }

  return (await db.collection("products").findOne({ sku: product.sku })) as unknown as SupermarketProduct;
}

export async function getCustomers(): Promise<SupermarketCustomer[]> {
  const db = await getDatabase();
  return (await db.collection("customers").find({}).toArray()) as unknown as SupermarketCustomer[];
}

export async function getCustomer(query: string): Promise<SupermarketCustomer | null> {
  const db = await getDatabase();
  const clean = query.trim();
  const regex = new RegExp(clean, "i");
  return (await db
    .collection("customers")
    .findOne({
      $or: [
        { customerId: clean.toUpperCase() },
        { name: { $regex: regex } },
        { phone: { $regex: regex } },
        { email: { $regex: regex } },
      ],
    })) as unknown as SupermarketCustomer | null;
}

export async function updateCustomer(
  query: string,
  updates: {
    note?: string;
    addWeeklyItem?: string;
    membershipTier?: string;
    shoppingFrequency?: string;
    loyaltyPointsDelta?: number;
  }
): Promise<SupermarketCustomer | null> {
  const db = await getDatabase();
  const customer = await getCustomer(query);
  if (!customer) return null;

  const mongoSet: Record<string, unknown> = {};

  if (updates.note) {
    mongoSet.notes = customer.notes
      ? `${customer.notes} | ${updates.note}`
      : updates.note;
  }
  if (updates.membershipTier) {
    mongoSet.membershipTier = updates.membershipTier;
  }
  if (updates.shoppingFrequency) {
    mongoSet.shoppingFrequency = updates.shoppingFrequency;
  }
  if (updates.loyaltyPointsDelta !== undefined) {
    mongoSet.loyaltyPoints = Math.max(0, (customer.loyaltyPoints || 0) + updates.loyaltyPointsDelta);
  }

  const updateDoc: Record<string, unknown> = {
    $set: {
      ...mongoSet,
      lastUpdated: new Date().toISOString(),
    },
  };

  if (updates.addWeeklyItem) {
    updateDoc.$addToSet = {
      recurrentWeeklyItems: updates.addWeeklyItem,
    };
  }

  await db.collection("customers").updateOne(
    { customerId: customer.customerId },
    updateDoc
  );

  return (await db.collection("customers").findOne({ customerId: customer.customerId })) as unknown as SupermarketCustomer;
}

export async function addCustomerRecord(data: {
  name: string;
  phone?: string;
  notes?: string;
  recurrentWeeklyItems?: Array<RecurrentWeeklyItem | string>;
  shoppingFrequency?: string;
}): Promise<SupermarketCustomer> {
  const db = await getDatabase();
  const customerId = `CUST-${Date.now().toString().slice(-4)}`;
  const normalizedItems: Array<RecurrentWeeklyItem | string> = (data.recurrentWeeklyItems || []).map((item) => {
    if (typeof item === "string") {
      return {
        sku: "PROD-GEN",
        productName: item,
        typicalQty: 1,
        aisle: "General",
      };
    }
    return item;
  });

  const newCust: SupermarketCustomer = {
    customerId,
    name: data.name,
    phone: data.phone || "Unlisted",
    email: `${data.name.toLowerCase().replace(/\s+/g, "")}@example.com`,
    membershipTier: "Gold Member",
    shoppingFrequency: data.shoppingFrequency || "Weekly regular",
    lastVisitDate: new Date().toISOString().split("T")[0],
    totalSpent: 0,
    loyaltyPoints: 100,
    preferredPayment: "Card",
    notes: data.notes || "Added by Store Manager via Voice",
    recurrentWeeklyItems: normalizedItems,
  };
  await db.collection("customers").insertOne(newCust as unknown as Record<string, unknown>);
  return newCust;
}

export async function deleteCustomer(query: string): Promise<boolean> {
  const db = await getDatabase();
  const customer = await getCustomer(query);
  if (!customer) return false;
  const res = await db.collection("customers").deleteOne({ customerId: customer.customerId });
  return res.deletedCount > 0;
}

export async function deleteProduct(sku: string): Promise<boolean> {
  const db = await getDatabase();
  const product = await getProductBySku(sku);
  if (!product) return false;
  const res = await db.collection("products").deleteOne({ sku: product.sku });
  await db.collection("stock_alerts").deleteMany({ sku: product.sku });
  return res.deletedCount > 0;
}

export async function logOperation(action: string, parameters: Record<string, unknown>, resultSummary: string, durationMs: number) {
  const db = await getDatabase();
  await db.collection("operations_logs").insertOne({
    id: `OP-${Date.now()}`,
    timestamp: new Date().toLocaleTimeString(),
    action,
    parameters,
    resultSummary,
    durationMs,
    createdAt: new Date().toISOString(),
  });
}

export async function getRecentOperationLogs(): Promise<OperationLog[]> {
  const db = await getDatabase();
  return (await db
    .collection("operations_logs")
    .find({})
    .sort({ _id: -1 })
    .limit(25)
    .toArray()) as unknown as OperationLog[];
}
