export interface UserRecord {
  id: string;
  name: string;
  email: string;
  plan: string;
  balance: string;
  phone: string;
  status: "Active" | "Pending" | "Suspended";
  joinedDate: string;
}

export interface OrderRecord {
  orderId: string;
  userId: string;
  customerName: string;
  items: string[];
  total: string;
  status: "Delivered" | "In Transit" | "Processing" | "Out for Delivery";
  deliveryEstimate: string;
  carrier: string;
  trackingNumber: string;
}

export interface InventoryItem {
  sku: string;
  productName: string;
  category: string;
  stock: number;
  price: string;
  warehouseLocation: string;
}

export interface ToolLog {
  id: string;
  timestamp: string;
  toolName: string;
  parameters: Record<string, unknown>;
  result: unknown;
  durationMs: number;
}

// In-memory persistent database simulation (can easily connect to Postgres, Supabase, MySQL)
export const mockDatabase = {
  users: [
    {
      id: "USR-101",
      name: "Aman Yadav",
      email: "aman@example.com",
      plan: "Enterprise AI Plus",
      balance: "$0.00",
      phone: "+1 (555) 234-5678",
      status: "Active",
      joinedDate: "2024-03-15",
    },
    {
      id: "USR-102",
      name: "Sarah Connor",
      email: "sarah@cyberdyne.org",
      plan: "Pro Tier",
      balance: "$42.50",
      phone: "+1 (555) 876-5432",
      status: "Active",
      joinedDate: "2023-11-20",
    },
    {
      id: "USR-103",
      name: "Alex Rivera",
      email: "alex.r@techventures.co",
      plan: "Developer Tier",
      balance: "$0.00",
      phone: "+1 (555) 345-9876",
      status: "Pending",
      joinedDate: "2024-08-01",
    },
  ] as UserRecord[],

  orders: [
    {
      orderId: "ORD-9401",
      userId: "USR-101",
      customerName: "Aman Yadav",
      items: ["HyperAudio Pro Headset", "USB-C Studio DAC"],
      total: "$349.00",
      status: "In Transit",
      deliveryEstimate: "Tomorrow by 2:00 PM",
      carrier: "FedEx Express",
      trackingNumber: "FX-894721992",
    },
    {
      orderId: "ORD-8820",
      userId: "USR-101",
      customerName: "Aman Yadav",
      items: ["Acoustic Foam Soundproofing Kit (12pk)"],
      total: "$89.50",
      status: "Delivered",
      deliveryEstimate: "Delivered Oct 8",
      carrier: "UPS Ground",
      trackingNumber: "1Z9999999999999999",
    },
    {
      orderId: "ORD-7712",
      userId: "USR-102",
      customerName: "Sarah Connor",
      items: ["Neural Voice Processor v2"],
      total: "$1,299.00",
      status: "Out for Delivery",
      deliveryEstimate: "Today by 6:00 PM",
      carrier: "DHL Express",
      trackingNumber: "DHL-44910283",
    },
  ] as OrderRecord[],

  inventory: [
    {
      sku: "SKU-VOX-01",
      productName: "HyperAudio Pro Headset",
      category: "Audio Hardware",
      stock: 42,
      price: "$249.00",
      warehouseLocation: "Zone A - Bay 14",
    },
    {
      sku: "SKU-VOX-02",
      productName: "Neural Voice Processor v2",
      category: "Edge Hardware",
      stock: 8,
      price: "$1,299.00",
      warehouseLocation: "Zone C - Cleanroom",
    },
    {
      sku: "SKU-VOX-03",
      productName: "Studio Broadcast Boom Arm",
      category: "Accessories",
      stock: 120,
      price: "$79.00",
      warehouseLocation: "Zone B - Bay 03",
    },
  ] as InventoryItem[],

  toolLogs: [] as ToolLog[],
};

// Database Query Functions
export function getUser(query: string): UserRecord | null {
  const q = query.toLowerCase().trim();
  return (
    mockDatabase.users.find(
      (u) =>
        u.id.toLowerCase() === q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    ) || null
  );
}

export function getOrder(orderId: string): OrderRecord | null {
  const cleanId = orderId.toUpperCase().trim();
  return (
    mockDatabase.orders.find(
      (o) => o.orderId === cleanId || o.orderId.replace("ORD-", "") === cleanId
    ) || null
  );
}

export function getOrdersForUser(userIdOrName: string): OrderRecord[] {
  const q = userIdOrName.toLowerCase().trim();
  return mockDatabase.orders.filter(
    (o) =>
      o.userId.toLowerCase() === q ||
      o.customerName.toLowerCase().includes(q)
  );
}

export function checkStock(productQuery: string): InventoryItem[] {
  const q = productQuery.toLowerCase().trim();
  return mockDatabase.inventory.filter(
    (item) =>
      item.productName.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q)
  );
}

export function logToolCall(toolName: string, parameters: Record<string, unknown>, result: unknown, durationMs: number) {
  const newLog: ToolLog = {
    id: `TL-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toLocaleTimeString(),
    toolName,
    parameters,
    result,
    durationMs,
  };
  mockDatabase.toolLogs.unshift(newLog);
  if (mockDatabase.toolLogs.length > 50) {
    mockDatabase.toolLogs.pop();
  }
  return newLog;
}
