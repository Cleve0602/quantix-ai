import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

// Initialize the Google Gen AI client using your hot env key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { message, storeId, accessToken } = await req.json();

    // Guard: refuse to run an inventory analysis with no store scope.
    if (!storeId) {
      return NextResponse.json({ error: "Missing store context. Refresh and try again." }, { status: 400 });
    }

    // Guard: this route must prove who's asking, or RLS will (correctly)
    // return zero rows since auth.uid() would otherwise be null on a
    // server-side request with no session attached.
    if (!accessToken) {
      return NextResponse.json({ error: "Missing session credentials. Please sign in again." }, { status: 401 });
    }

    // Create a request-scoped Supabase client authenticated as the calling
    // user, so Row Level Security resolves auth.uid() correctly and the
    // get_my_store_id() policies actually match the user's own store.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      }
    );

    // 1. Fetch live stock directly from your Supabase spreadsheet rows,
    //    scoped strictly to the requesting store (RLS enforces this too)
    const { data: products, error: dbError } = await supabase
      .from("products")
      .select("name, category, stock_on_hand, min_required, cost_price, selling_price, supplier")
      .eq("store_id", storeId);

    if (dbError) {
      console.error("Supabase read error inside AI route:", dbError);
      return NextResponse.json({ error: "Failed to grab live database context rows." }, { status: 500 });
    }

    // 2. Format the live cloud data cleanly so the AI can read it perfectly
   const inventoryContext = products && products.length > 0 
  ? products.map((p: any) => 
      `- ${p.name} (${p.category}): Stock=${p.stock_on_hand}, Min Required=${p.min_required}, Cost=R${p.cost_price}, Retail=R${p.selling_price}, Supplier=${p.supplier}`
    ).join("\n")
  : "The inventory is currently completely empty.";

    // 3. Command the engine to prioritize retail optimization parameters
    const systemInstruction = `
      You are Jarvis, the core operational intelligence engine for Q-uantix AI.
      Your goal is to provide elite retail stock optimization guidelines to a business owner.
      
      Here is the live inventory data pulled directly from the Supabase cloud cluster:
      ${inventoryContext}

      Analyze this data accurately. If items are below their minimum required safety limits, flag them as critical supply line exceptions. Keep your tone direct, sharp, professional, and business-focused. Never use markdown formatting like asterisks or bullet lists in your final sentence responses—keep paragraphs clean and readable on the console glass.
    `;

    // 4. Generate content using the fast, precise gemini-2.5-flash model
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.2, // Keeps computations tightly bound to factual stock values
      }
    });

    return NextResponse.json({ text: response.text });

  } catch (error: any) {
    console.error("AI Generation Matrix Crash:", error);
    return NextResponse.json({ error: "Language processor runtime error." }, { status: 500 });
  }
}