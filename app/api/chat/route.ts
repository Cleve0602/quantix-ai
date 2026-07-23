import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "@/lib/supabase";

// Initialize the Google Gen AI client using your hot env key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    // 1. Fetch live stock directly from your Supabase spreadsheet rows
    const { data: products, error: dbError } = await supabase
      .from("products")
      .select("name, category, stock_on_hand, min_required, cost_price, selling_price, supplier");

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