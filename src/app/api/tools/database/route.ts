import { NextResponse } from "next/server";
import {
  searchProducts,
  getProductBySku,
  getStockAlerts,
  getSupermarketSections,
  getCustomers,
  getCustomer,
  updateCustomer,
  addCustomerRecord,
  deleteCustomer,
  deleteProduct,
  updateStock,
  logOperation,
} from "@/lib/supermarket-db";

export async function POST(request: Request) {
  const startTime = Date.now();
  try {
    const body = await request.json();
    const action = body.action || body.tool_name || body.tool || "check_product_stock";
    const params = body.parameters || body.args || body;

    let result: unknown = null;
    let summary = "";

    switch (action) {
      // 1. PRODUCT & STOCK QUERY
      case "check_product_stock":
      case "search_product":
      case "get_product_details": {
        const query = params.product_name || params.query || params.item || params.sku || "";
        const products = await searchProducts(String(query));

        if (products.length > 0) {
          const top = products[0];
          summary = `Found ${products.length} product(s). Primary: ${top.name} (SKU: ${top.sku}). Stock: ${top.stockQuantity} ${top.unit} in ${top.aisle}. Status: ${top.status}. Price: $${top.price}.`;
          result = {
            found: true,
            totalMatches: products.length,
            primaryProduct: {
              sku: top.sku,
              name: top.name,
              section: top.sectionName,
              aisle: top.aisle,
              price: `$${top.price}`,
              stockQuantity: `${top.stockQuantity} ${top.unit}`,
              status: top.status,
              reorderThreshold: top.reorderThreshold,
              supplier: top.supplier,
              expiryDate: top.expiryDate,
              variants: top.variants.map((v) => ({
                sku: v.sku,
                variant: v.variantName,
                colorOrFlavor: v.colorOrFlavor,
                size: v.size,
                price: `$${v.price}`,
                stock: v.stock,
              })),
            },
            otherMatches: products.slice(1, 3).map((p) => ({
              sku: p.sku,
              name: p.name,
              aisle: p.aisle,
              stock: `${p.stockQuantity} ${p.unit}`,
              status: p.status,
            })),
            message: summary,
          };
        } else {
          summary = `No products found matching "${query}" in supermarket database.`;
          result = { found: false, message: summary };
        }
        break;
      }

      // 2. LOW STOCK & CRITICAL ALERTS
      case "get_low_stock_alerts":
      case "check_alerts": {
        const alerts = await getStockAlerts();
        summary = `Supermarket has ${alerts.length} active inventory alerts.`;
        result = {
          count: alerts.length,
          alerts: alerts.map((a) => ({
            alertId: a.alertId,
            product: a.productName,
            sku: a.sku,
            section: a.sectionName,
            aisle: a.aisle,
            currentStock: a.currentStock,
            reorderThreshold: a.reorderThreshold,
            severity: a.severity,
            message: a.message,
          })),
          message: summary,
        };
        break;
      }

      // 3. STORE AISLE & LAYOUT OVERVIEW
      case "get_section_overview":
      case "get_aisle_info": {
        const sections = await getSupermarketSections();
        const aisleQuery = String(params.aisle || params.section || params.query || "").toLowerCase();

        let matched = sections;
        if (aisleQuery) {
          matched = sections.filter(
            (s) =>
              s.name.toLowerCase().includes(aisleQuery) ||
              s.aisleNumber.toLowerCase().includes(aisleQuery) ||
              s.sectionId.toLowerCase().includes(aisleQuery)
          );
        }

        summary = `Supermarket layout contains 8 aisles. Matched ${matched.length} section(s).`;
        result = {
          sectionsCount: matched.length,
          sections: matched.map((s) => ({
            sectionId: s.sectionId,
            name: s.name,
            aisle: s.aisleNumber,
            zone: s.zone,
            temperature: s.temperature,
            manager: s.manager,
            shelves: s.shelvesCount,
            restockPriority: s.restockPriority,
            description: s.description,
          })),
          message: summary,
        };
        break;
      }

      // 4. REGULAR CUSTOMER MANAGEMENT
      case "get_customer_info":
      case "lookup_customer": {
        const query = params.customer_name || params.name || params.query || params.customer_id || "Aman";
        const customer = await getCustomer(String(query));

        if (customer) {
          summary = `Customer ${customer.name} (${customer.membershipTier}) found. Shopper frequency: ${customer.shoppingFrequency}. Loyalty points: ${customer.loyaltyPoints}.`;
          result = {
            found: true,
            customer: {
              customerId: customer.customerId,
              name: customer.name,
              phone: customer.phone,
              membershipTier: customer.membershipTier,
              shoppingFrequency: customer.shoppingFrequency,
              loyaltyPoints: customer.loyaltyPoints,
              totalSpent: `$${customer.totalSpent.toFixed(2)}`,
              lastVisit: customer.lastVisitDate,
              notes: customer.notes,
              recurrentWeeklyItems: customer.recurrentWeeklyItems,
            },
            message: summary,
          };
        } else {
          const allCust = await getCustomers();
          summary = `Customer "${query}" not found. Top regulars: ${allCust.map((c) => c.name).join(", ")}`;
          result = {
            found: false,
            message: summary,
            availableCustomers: allCust.map((c) => ({ name: c.name, id: c.customerId })),
          };
        }
        break;
      }

      // 5. UPDATE STOCK (RESTOCK OR SALE)
      case "update_product_stock":
      case "restock_item": {
        const sku = String(params.sku || "");
        const qty = Number(params.quantity || params.added_quantity || 0);

        if (!sku || isNaN(qty)) {
          summary = "Error: sku and quantity parameters required.";
          result = { error: summary };
          break;
        }

        const updated = await updateStock(sku, qty);
        if (updated) {
          summary = `Stock updated for ${updated.name} (SKU: ${updated.sku}). New stock level: ${updated.stockQuantity} ${updated.unit} (Status: ${updated.status}).`;
          result = {
            success: true,
            updatedProduct: {
              sku: updated.sku,
              name: updated.name,
              newStock: updated.stockQuantity,
              status: updated.status,
            },
            message: summary,
          };
        } else {
          summary = `Could not find product with SKU "${sku}" to update.`;
          result = { success: false, message: summary };
        }
        break;
      }

      // 6. UPDATE CUSTOMER RECORD (WRITE: Notes, Family Habits, Weekly Items, Loyalty Points)
      case "update_customer_record":
      case "add_customer_note":
      case "update_customer_habits": {
        const query = String(params.customer_name || params.name || params.customer_id || "Aman");
        const note = params.note || params.family_habits || params.shopping_habits || params.new_note;
        const addWeeklyItem = params.add_weekly_item || params.weekly_item || params.item;
        const pointsDelta = params.loyalty_points_delta !== undefined ? Number(params.loyalty_points_delta) : undefined;
        const membershipTier = params.membership_tier ? String(params.membership_tier) : undefined;
        const shoppingFrequency = params.shopping_frequency ? String(params.shopping_frequency) : undefined;

        let updated = await updateCustomer(query, {
          note: note ? String(note) : undefined,
          addWeeklyItem: addWeeklyItem ? String(addWeeklyItem) : undefined,
          loyaltyPointsDelta: isNaN(pointsDelta as number) ? undefined : pointsDelta,
          membershipTier,
          shoppingFrequency,
        });

        if (!updated && (note || addWeeklyItem)) {
          // Auto-create customer if does not exist yet
          updated = await addCustomerRecord({
            name: query,
            notes: note ? String(note) : undefined,
            recurrentWeeklyItems: addWeeklyItem ? [String(addWeeklyItem)] : [],
          });
        }

        if (updated) {
          summary = `Customer profile for ${updated.name} updated in MongoDB. Notes: "${updated.notes}". Weekly Items: ${updated.recurrentWeeklyItems.join(", ")}. Loyalty Points: ${updated.loyaltyPoints}.`;
          result = {
            success: true,
            customer: {
              customerId: updated.customerId,
              name: updated.name,
              membershipTier: updated.membershipTier,
              notes: updated.notes,
              recurrentWeeklyItems: updated.recurrentWeeklyItems,
              loyaltyPoints: updated.loyaltyPoints,
            },
            message: summary,
          };
        } else {
          summary = `Could not find or update customer "${query}".`;
          result = { success: false, message: summary };
        }
        break;
      }

      // 7. CREATE NEW CUSTOMER PROFILE (WRITE)
      case "add_customer_record":
      case "create_customer": {
        const name = String(params.name || params.customer_name || "New Customer");
        const newCust = await addCustomerRecord({
          name,
          phone: params.phone ? String(params.phone) : undefined,
          notes: params.notes || params.note ? String(params.notes || params.note) : undefined,
          recurrentWeeklyItems: params.recurrent_weekly_items ? (Array.isArray(params.recurrent_weekly_items) ? params.recurrent_weekly_items : [String(params.recurrent_weekly_items)]) : [],
          shoppingFrequency: params.shopping_frequency ? String(params.shopping_frequency) : undefined,
        });
        summary = `New customer ${newCust.name} (ID: ${newCust.customerId}) created in supermarket database.`;
        result = {
          success: true,
          customer: newCust,
          message: summary,
        };
        break;
      }

      // 8. DESTRUCTIVE: DELETE CUSTOMER (REQUIRES MANAGER CONFIRMATION)
      case "delete_customer_record":
      case "remove_customer": {
        const query = String(params.customer_name || params.name || params.customer_id || "");
        const isConfirmed = params.confirmed === true || params.confirm === true || String(params.confirmed).toLowerCase() === "true";

        if (!isConfirmed) {
          summary = `Destructive action: Deleting customer "${query}" requires manager confirmation.`;
          result = {
            requires_confirmation: true,
            is_destructive: true,
            target: query,
            prompt_to_manager: `Deleting customer profile for ${query} is a permanent action that will erase their purchase history and loyalty points. Are you sure you want to delete this customer? Please reply with yes or no to confirm.`,
            message: summary,
          };
          break;
        }

        const deleted = await deleteCustomer(query);
        if (deleted) {
          summary = `Customer "${query}" has been permanently deleted from MongoDB database.`;
          result = {
            success: true,
            deleted: true,
            message: summary,
          };
        } else {
          summary = `Could not find customer "${query}" to delete.`;
          result = { success: false, message: summary };
        }
        break;
      }

      // 9. DESTRUCTIVE: DELETE PRODUCT (REQUIRES MANAGER CONFIRMATION)
      case "delete_product_record":
      case "remove_product": {
        const sku = String(params.sku || params.product || "");
        const isConfirmed = params.confirmed === true || params.confirm === true || String(params.confirmed).toLowerCase() === "true";

        if (!isConfirmed) {
          summary = `Destructive action: Deleting product "${sku}" requires manager confirmation.`;
          result = {
            requires_confirmation: true,
            is_destructive: true,
            target: sku,
            prompt_to_manager: `Permanently deleting product ${sku} will remove it from inventory catalog and delete all related stock alerts. Are you sure you want to proceed? Please confirm with yes or no.`,
            message: summary,
          };
          break;
        }

        const deleted = await deleteProduct(sku);
        if (deleted) {
          summary = `Product ${sku} and associated stock alerts permanently removed from MongoDB.`;
          result = {
            success: true,
            deleted: true,
            message: summary,
          };
        } else {
          summary = `Could not find product ${sku} to delete.`;
          result = { success: false, message: summary };
        }
        break;
      }

      default: {
        // Universal fallback
        const query = String(params.query || params.search || "");
        const products = await searchProducts(query);
        summary = `Universal search executed for "${query}". Found ${products.length} products.`;
        result = {
          found: products.length > 0,
          products: products.slice(0, 3),
          message: summary,
        };
        break;
      }
    }

    const durationMs = Date.now() - startTime;
    await logOperation(action, params, summary, durationMs);

    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        execution_time_ms: durationMs,
        source: "MongoDB Atlas (Cluster0)",
        collection: "supermarket_db",
      },
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "online",
    system: "Supermarket AI Voice Agent Operations & MongoDB Atlas Webhook",
    database: "supermarket_db",
    supported_actions: [
      "check_product_stock",
      "get_low_stock_alerts",
      "get_section_overview",
      "get_customer_info",
      "update_product_stock",
    ],
  });
}
