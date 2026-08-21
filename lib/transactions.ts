import { supabase } from "./supabase";

export async function processProductSale({
  productId,
  quantity,
  sellingPrice,
  paymentMethod,
  storeId
}: {
  productId: number | string;
  quantity: number;
  sellingPrice: number;
  paymentMethod: string;
  storeId: string;
}) {
  try {
    // Guard: never let a sale process without a confirmed store scope.
    // A silent default here previously risked misattributing sales to a
    // hardcoded placeholder store instead of failing loudly.
    if (!storeId) {
      return { success: false, error: "No active store session. Refresh and try again." };
    }

    // 1. Fetch current stock for the item matching active store
    const { data: product, error: fetchError } = await supabase
      .from("products")
      .select("stock_on_hand")
      .eq("id", productId)
      .eq("store_id", storeId)
      .single();

    if (fetchError || !product) {
      return { success: false, error: fetchError?.message || "Product not found" };
    }

    if (product.stock_on_hand < quantity) {
      return { success: false, error: "Insufficient stock available" };
    }

    // 2. Insert sales transaction attached to store_id
    const { error: txError } = await supabase.from("sales_transactions").insert([
      {
        product_id: productId,
        quantity,
        total_price: sellingPrice * quantity,
        payment_method: paymentMethod,
        store_id: storeId
      }
    ]);

    if (txError) {
      return { success: false, error: txError.message };
    }

    // 3. Deduct stock from products table
    const { error: updateError } = await supabase
      .from("products")
      .update({ stock_on_hand: product.stock_on_hand - quantity })
      .eq("id", productId)
      .eq("store_id", storeId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
