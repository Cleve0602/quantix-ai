"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { processProductSale } from "@/lib/transactions";
import { 
  LayoutDashboard, 
  Package, 
  MessageSquareCode, 
  AlertTriangle, 
  PlusCircle,
  User,
  Search,
  SlidersHorizontal,
  RefreshCw,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Sparkles,
  LogOut,
  Printer,
  X,
  FileText
} from "lucide-react";

// Default Store ID fallback for initial sandbox / testing
const DEFAULT_STORE_ID = "11111111-1111-1111-1111-111111111111";

interface Product {
  id: number | string;
  name: string;
  category: string;
  stock_on_hand: number;
  min_required: number;
  cost_price: number;
  selling_price: number;
  supplier: string;
  store_id?: string;
}

interface Transaction {
  product_id: number | string;
  quantity: number;
  total_price: number;
  payment_method: string;
  created_at?: string;
  store_id?: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"dashboard" | "inventory" | "assistant">("dashboard");
  const [query, setQuery] = useState("");
  const [aiInsight, setAiInsight] = useState("Welcome back. Quant operational metrics engine is active and analyzing telemetry channels.");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Auth & Store Scoping State
  const [user, setUser] = useState<any>(null);
  const [activeStoreId, setActiveStoreId] = useState<string>(DEFAULT_STORE_ID);

  // Step 3 State: Purchase Order Export Modal
  const [showPoModal, setShowPoModal] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("Electronics");
  const [newStock, setNewStock] = useState("");
  const [newMin, setNewMin] = useState("");
  const [newCost, setNewCost] = useState("");
  const [newSelling, setNewSelling] = useState("");

  const categoriesList = ["Electronics", "Components", "Apparel", "General Stock"];

  // Step 2: Auth Session Verification & Auto-Redirection
  useEffect(() => {
    const checkUserSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/login");
      } else {
        setUser(session.user);
        
        // Fetch store ID linked to the authenticated user if available
        const { data: storeData } = await supabase
          .from("stores")
          .select("id")
          .eq("owner_id", session.user.id)
          .single();

        if (storeData?.id) {
          setActiveStoreId(storeData.id);
        }
      }
    };

    checkUserSession();

    // Listen for real-time auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push("/login");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const fetchCloudData = async () => {
    setRefreshing(true);
    try {
      const [productsRes, transactionsRes] = await Promise.all([
        supabase
          .from("products")
          .select("*")
          .eq("store_id", activeStoreId)
          .order("name", { ascending: true }),
        supabase
          .from("sales_transactions")
          .select("*")
          .eq("store_id", activeStoreId)
      ]);
        
      if (productsRes.error) throw productsRes.error;
      if (transactionsRes.error) throw transactionsRes.error;

      setProducts(productsRes.data || []);
      setTransactions(transactionsRes.data || []);

    } catch (err: any) {
      console.error("Layout Crash:", err);
      setAiInsight(`[Quant Error Context]: Failed to synchronize database layout. ${err.message}`);
    }
    setRefreshing(false);
  };

  useEffect(() => {
    if (user || activeStoreId) {
      fetchCloudData();
    }
  }, [activeStoreId, user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleAddProductToCloud = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newStock || !newCost || !newSelling) return;

    const { error } = await supabase.from("products").insert([
      {
        name: newName,
        stock_on_hand: parseInt(newStock),
        min_required: parseInt(newMin) || 10,
        cost_price: parseFloat(newCost),
        selling_price: parseFloat(newSelling),
        category: newCategory,
        supplier: "Direct Vendor",
        store_id: activeStoreId
      }
    ]);

    if (error) {
      alert("Error adding item to Supabase: " + error.message);
    } else {
      setNewName(""); setNewStock(""); setNewMin(""); setNewCost(""); setNewSelling("");
      setNewCategory("Electronics");
      fetchCloudData();
    }
  };

  const handleQuickSale = async (product: Product) => {
    if (product.stock_on_hand <= 0) {
      alert("Out of stock! Cannot complete transaction.");
      return;
    }

    const result = await processProductSale({
      productId: product.id,
      quantity: 1,
      sellingPrice: Number(product.selling_price),
      paymentMethod: "Card",
      storeId: activeStoreId
    });

    if (result.success) {
      fetchCloudData(); 
    } else {
      alert(`Sale process aborted: ${result.error}`);
    }
  };

  const handleAdjustStock = async (productId: number | string, currentStock: number, adjustment: number) => {
    const targetStock = currentStock + adjustment;
    if (targetStock < 0) return;

    const { error } = await supabase
      .from("products")
      .update({ stock_on_hand: targetStock })
      .eq("id", productId)
      .eq("store_id", activeStoreId);

    if (error) {
      alert("Failed to modify stock allocation bounds: " + error.message);
    } else {
      fetchCloudData();
    }
  };

  const handleDeleteProduct = async (productId: number | string, productName: string) => {
    if (!confirm(`Are you completely sure you want to drop "${productName}" from your database architecture?`)) {
      return;
    }

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId)
      .eq("store_id", activeStoreId);

    if (error) {
      alert("Failed to drop database row schema: " + error.message);
    } else {
      fetchCloudData();
    }
  };

  const askQuantixEngine = async (customMessage?: string) => {
    setLoading(true);
    setAiInsight("");
    const messageToSend = customMessage || query || "Give me a strategic overview of my current stock issues.";
    
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageToSend }),
      });
      
      const data = await res.json();
      if (data.text) {
        setAiInsight(data.text);
      } else if (data.error) {
        setAiInsight(`Engine Error: ${data.error}`);
      }
    } catch (err) {
      setAiInsight("System Interruption: Failed to communicate with Quant core language engine.");
    } finally {
      setLoading(false);
      setQuery("");
    }
  };

  const totalRevenue = transactions.reduce((sum, tx) => sum + (Number(tx.total_price) || 0), 0);
  const totalOrders = transactions.length;
  const totalValue = products.reduce((sum, p) => sum + (p.stock_on_hand * p.cost_price), 0);
  const lowStockProducts = products.filter(p => p.stock_on_hand <= p.min_required);
  const criticalShortages = lowStockProducts.length;

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased">
      
      {/* BRAND DEEP NAVY SIDEBAR */}
      <aside className="w-64 bg-[#0A192F] text-white p-6 flex flex-col justify-between hidden md:flex shadow-xl print:hidden">
        <div>
          <div className="flex flex-col items-center justify-center text-center mt-4 mb-10 border-b border-slate-800 pb-6">
            <div className="w-36 bg-white rounded-xl p-2 shadow-md hover:scale-105 transition-transform duration-200">
              <img 
                src="/logo.jpeg" 
                alt="Quant AI Logo" 
                className="w-full h-auto object-contain rounded-lg"
              />
            </div>
            <span className="text-[10px] font-bold tracking-widest text-blue-400 uppercase mt-3 font-mono">
              QUANT ENGINE
            </span>
          </div>

          <nav className="space-y-1">
            <Button 
              onClick={() => setActiveTab("dashboard")}
              variant="ghost"
              className={`w-full justify-start gap-3 h-11 text-xs rounded-xl font-semibold transition-all ${activeTab === "dashboard" ? "bg-blue-600 text-white shadow-md hover:bg-blue-600 hover:text-white" : "text-slate-400 hover:text-white hover:bg-slate-800/50"}`}
            >
              <LayoutDashboard className="h-4 w-4" /> Dashboard Overview
            </Button>
            <Button 
              onClick={() => setActiveTab("inventory")}
              variant="ghost"
              className={`w-full justify-start gap-3 h-11 text-xs rounded-xl font-semibold transition-all ${activeTab === "inventory" ? "bg-blue-600 text-white shadow-md hover:bg-blue-600 hover:text-white" : "text-slate-400 hover:text-white hover:bg-slate-800/50"}`}
            >
              <Package className="h-4 w-4" /> Stock & Inventory
            </Button>
            <Button 
              onClick={() => setActiveTab("assistant")}
              variant="ghost"
              className={`w-full justify-start gap-3 h-11 text-xs rounded-xl font-semibold transition-all ${activeTab === "assistant" ? "bg-blue-600 text-white shadow-md hover:bg-blue-600 hover:text-white" : "text-slate-400 hover:text-white hover:bg-slate-800/50"}`}
            >
              <MessageSquareCode className="h-4 w-4" /> Quant Operations Desk
            </Button>
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-800 flex flex-col gap-1 text-[11px] text-slate-400 font-mono">
          <p>System Layer: Multi-Tenant Node</p>
          <p className="text-blue-400">Ver: 2026.07.ALPHA</p>
        </div>
      </aside>

      {/* CORE WORKSPACE FRAME */}
      <main className="flex-1 p-6 md:p-10 space-y-8 overflow-y-auto max-w-7xl mx-auto w-full print:p-0 print:max-w-none">
        
        {/* UPPER APPLICATION HEADER */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5 print:hidden">
          <div>
            <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">Workspace Console</span>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 mt-0.5">Control Center Overview</h1>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-slate-600" onClick={fetchCloudData} disabled={refreshing}>
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-white border border-slate-200 p-2 pr-4 rounded-xl shadow-sm">
              <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <User className="h-4 w-4 stroke-[2.5]" />
              </div>
              <div className="text-left">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Welcome back,</p>
                <p className="text-xs font-bold text-slate-800">
                  {user?.email || "Store Admin"}
                </p>
              </div>
            </div>

            <Button
              onClick={handleSignOut}
              variant="outline"
              className="h-10 px-3 border-slate-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </Button>
          </div>
        </header>

        {/* METRICS INTERFACE PANEL */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
          <Card className="bg-white border-slate-200 shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-1.5"><CardTitle className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Revenue</CardTitle><div className="h-2 w-2 rounded-full bg-blue-500" /></CardHeader>
            <CardContent>
              <div className="text-xl font-extrabold tracking-tight text-slate-900">
                R{totalRevenue.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1 mt-1">↑ Real-Time <span className="text-slate-400 font-normal">ledger sync</span></span>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-1.5"><CardTitle className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Orders</CardTitle><div className="h-2 w-2 rounded-full bg-slate-300" /></CardHeader>
            <CardContent>
              <div className="text-xl font-extrabold tracking-tight text-slate-900">
                {totalOrders.toLocaleString('en-ZA')}
              </div>
              <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1 mt-1">↑ Throughput <span className="text-slate-400 font-normal">tickets closed</span></span>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-1.5"><CardTitle className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Stock Value</CardTitle><div className="h-2 w-2 rounded-full bg-emerald-500" /></CardHeader>
            <CardContent>
              <div className="text-xl font-extrabold tracking-tight text-slate-900">R{totalValue.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 mt-1">↑ Net Cost <span className="text-slate-400 font-normal">assets on shelf</span></span>
            </CardContent>
          </Card>

          <Card className={`transition-all border-slate-200 shadow-sm rounded-2xl ${criticalShortages > 0 ? "bg-rose-50/40 border-rose-200" : "bg-white"}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-1.5"><CardTitle className={`text-[11px] font-bold uppercase tracking-wider ${criticalShortages > 0 ? "text-rose-600" : "text-slate-400"}`}>Low Stock Items</CardTitle><AlertTriangle className={`h-3.5 w-3.5 ${criticalShortages > 0 ? "text-rose-500" : "text-slate-400"}`} /></CardHeader>
            <CardContent>
              <div className={`text-xl font-extrabold tracking-tight ${criticalShortages > 0 ? "text-rose-600" : "text-slate-900"}`}>{criticalShortages} Lines</div>
              <span className={`text-[10px] font-bold flex items-center gap-1 mt-1 ${criticalShortages > 0 ? "text-rose-600" : "text-slate-400"}`}>⚠️ Attention <span className="text-slate-400 font-normal">restocks pending</span></span>
            </CardContent>
          </Card>
        </section>

        {/* TAB ACTIVE SYSTEM ROUTER VIEWPORTS */}
        {activeTab === "dashboard" && (
          <section className="grid gap-6 lg:grid-cols-5 print:hidden">
            
            {/* LEFT COLUMN: ASSISTANT PANEL */}
            <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-sm min-h-[450px]">
              <div>
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                  <Sparkles className="h-4 w-4 text-blue-600 animate-pulse" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800">Quant Automated Feedback</h3>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 text-xs text-slate-600 font-medium leading-relaxed min-h-[200px] whitespace-pre-wrap font-mono shadow-inner">
                  {loading ? (
                    <div className="space-y-2 py-1">
                      <div className="h-3 w-4/5 bg-slate-200 animate-pulse rounded" />
                      <div className="h-3 w-5/6 bg-slate-200 animate-pulse rounded" />
                    </div>
                  ) : aiInsight}
                </div>
              </div>

              <div className="mt-6 space-y-2.5">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3 h-3.5 w-3.5 text-slate-400" />
                    <Input 
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Ask Quant about operational margins or metrics velocity..." 
                      className="bg-white border-slate-200 pl-10 text-xs text-slate-800 rounded-xl focus-visible:ring-blue-600 h-10 shadow-sm"
                      onKeyDown={(e) => e.key === "Enter" && askQuantixEngine()}
                    />
                  </div>
                  <Button onClick={() => askQuantixEngine()} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 rounded-xl h-10 shadow-md">Submit</Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => askQuantixEngine("Run an absolute profit leakage assessment across my current shelf quantities.")} variant="outline" className="border-slate-200 text-slate-500 hover:bg-slate-50 text-xs rounded-xl h-9 font-medium shadow-sm">📊 Audit Profit Leakage</Button>
                  
                  {/* STEP 3 TRIGGER: Auto-Draft PO Modal */}
                  <Button onClick={() => setShowPoModal(true)} variant="outline" className="border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 text-xs rounded-xl h-9 font-bold shadow-sm flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-blue-600" /> 📝 Auto-Draft POs
                  </Button>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: LIVE RECENT SALES LEDGER */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[450px]">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800">Live Transaction Ledger</h3>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">Sync Active</span>
                </div>
                
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {transactions.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-xs text-slate-400 font-medium">No sales transactions found in database cluster.</p>
                      <p className="text-[10px] text-slate-300 mt-1">Click "Sell 1" in your stock tab to generate transaction records.</p>
                    </div>
                  ) : (
                    [...transactions].reverse().slice(0, 5).map((tx: any, idx) => {
                      const matchingProduct = products.find(p => p.id === tx.product_id);
                      const txDate = tx.created_at ? new Date(tx.created_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }) : "Just Now";

                      return (
                        <div key={idx} className="flex justify-between items-center bg-slate-50 border border-slate-100 p-3 rounded-xl transition-all hover:bg-slate-100/50">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center font-bold text-xs text-emerald-600">
                              +
                            </div>
                            <div>
                              <p className="font-bold text-xs text-slate-800">{matchingProduct ? matchingProduct.name : `Product ID: ${tx.product_id}`}</p>
                              <p className="text-[9px] text-slate-400 font-medium tracking-wide">
                                Method: <span className="font-semibold text-slate-500">{tx.payment_method || "Card"}</span> • {txDate}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-extrabold text-emerald-600 font-mono">
                              +R{Number(tx.total_price).toFixed(2)}
                            </p>
                            <p className="text-[9px] text-slate-400 font-medium font-mono">Qty: {tx.quantity || 1}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-2.5 mt-4">
                <SlidersHorizontal className="h-3.5 w-3.5 text-blue-600" />
                <p className="text-[10px] text-blue-800 font-semibold leading-tight">Ledger calculations matched perfectly to dynamic balance tracking cards.</p>
              </div>
            </div>
          </section>
        )}

        {activeTab === "inventory" && (
          <section className="space-y-6 print:hidden">
            <form onSubmit={handleAddProductToCloud} className="bg-white border border-slate-200 rounded-2xl p-5 grid gap-3 sm:grid-cols-5 items-end shadow-sm">
              <div className="sm:col-span-1 space-y-1.5"><label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-0.5">Asset Description</label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Wireless Headphones" className="bg-white border-slate-200 text-xs rounded-xl h-9" /></div>
              <div className="sm:col-span-1 space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-0.5">Category Node</label>
                <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full bg-white border border-slate-200 text-xs rounded-xl h-9 px-3 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm">
                  {categoriesList.map((cat, idx) => (<option key={idx} value={cat}>{cat}</option>))}
                </select>
              </div>
              <div className="space-y-1.5"><label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-0.5">Stock Count</label><Input type="number" value={newStock} onChange={(e) => setNewStock(e.target.value)} placeholder="12" className="bg-white border-slate-200 text-xs rounded-xl h-9" /></div>
              <div className="space-y-1.5"><label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-0.5">Reorder Level</label><Input type="number" value={newMin} onChange={(e) => setNewMin(e.target.value)} placeholder="20" className="bg-white border-slate-200 text-xs rounded-xl h-9" /></div>
              <div className="sm:col-span-1 space-y-1.5"><label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-0.5">Unit Cost (R)</label><Input type="number" step="0.01" value={newCost} onChange={(e) => setNewCost(e.target.value)} placeholder="120.00" className="bg-white border-slate-200 text-xs rounded-xl h-9" /></div>
              <div className="sm:col-span-1 space-y-1.5"><label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-0.5">Unit Price (R)</label><Input type="number" step="0.01" value={newSelling} onChange={(e) => setNewSelling(e.target.value)} placeholder="199.99" className="bg-white border-slate-200 text-xs rounded-xl h-9" /></div>
              <Button type="submit" className="sm:col-span-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 rounded-xl shadow-md flex gap-2 justify-center items-center"><PlusCircle className="h-4 w-4" /> Inject New Inventory Record to Cluster</Button>
            </form>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="p-4">Product Name</th>
                      <th className="p-4">Category Node</th>
                      <th className="p-4 text-center">Stock Allocation</th>
                      <th className="p-4 text-right">Reorder Level</th>
                      <th className="p-4 text-right">Unit Cost</th>
                      <th className="p-4 text-right">Unit Price</th>
                      <th className="p-4 text-right">Gross Profit</th>
                      <th className="p-4 text-center">Management Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {products.map((p, idx) => {
                      const isLow = p.stock_on_hand <= p.min_required;
                      return (
                        <tr key={p.id || idx} className={`transition-colors hover:bg-slate-50/50 ${isLow ? "bg-rose-50/20" : ""}`}>
                          <td className="p-4 font-bold text-slate-900">{p.name}</td>
                          <td className="p-4 text-slate-400 font-mono text-[11px]">{p.category}</td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => handleAdjustStock(p.id, p.stock_on_hand, -1)} className="p-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 transition"><Minus className="h-3 w-3" /></button>
                              <span className={`w-16 text-center font-extrabold font-mono text-sm ${isLow ? "text-rose-500" : "text-slate-600"}`}>{p.stock_on_hand}</span>
                              <button onClick={() => handleAdjustStock(p.id, p.stock_on_hand, 1)} className="p-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 transition"><Plus className="h-3 w-3" /></button>
                            </div>
                          </td>
                          <td className="p-4 text-right text-slate-400 font-mono">{p.min_required} units</td>
                          <td className="p-4 text-right text-slate-500 font-mono">R{Number(p.cost_price).toFixed(2)}</td>
                          <td className="p-4 text-right font-bold text-blue-600 font-mono">R{Number(p.selling_price).toFixed(2)}</td>
                          <td className="p-4 text-right text-emerald-600 font-extrabold font-mono">R{(Number(p.selling_price) - Number(p.cost_price)).toFixed(2)}</td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              <Button size="sm" onClick={() => handleQuickSale(p)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 h-7 rounded-lg text-[10px] flex items-center gap-1 shadow-sm"><ShoppingBag className="h-3 w-3" /> Sell 1</Button>
                              <button onClick={() => handleDeleteProduct(p.id, p.name)} className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition" title="Delete Record"><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeTab === "assistant" && (
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm min-h-[520px] flex flex-col justify-between print:hidden">
            <div>
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800">Quant Deep Operational Desk</h3>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 font-mono text-xs text-slate-600 leading-relaxed min-h-[320px] shadow-inner">
                {loading ? (
                  <div className="space-y-3 py-2">
                    <div className="h-3 w-5/6 bg-slate-200 animate-pulse rounded" />
                    <div className="h-3 w-full bg-slate-200 animate-pulse rounded" />
                  </div>
                ) : aiInsight}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Input 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Submit structural parameters audit queries to Quant..." 
                className="bg-white border-slate-200 text-xs rounded-xl h-11 shadow-sm focus-visible:ring-blue-600"
                onKeyDown={(e) => e.key === "Enter" && askQuantixEngine()}
              />
              <Button onClick={() => askQuantixEngine()} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 rounded-xl h-11 shadow-md">Execute Matrix Query</Button>
            </div>
          </section>
        )}

      </main>

      {/* STEP 3: PURCHASE ORDER EXPORT MODAL OVERLAY */}
      {showPoModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden print:shadow-none print:border-none print:w-full">
            
            {/* MODAL HEADER CONTROLS (Hidden during printing) */}
            <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center print:hidden">
              <div>
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" /> Automated Purchase Order Draft
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Generated automatically for items below required reorder thresholds
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => window.print()} 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5" /> Print / Save PDF
                </Button>
                <Button 
                  onClick={() => setShowPoModal(false)} 
                  variant="outline" 
                  className="text-xs h-9 w-9 p-0 border-slate-200 text-slate-600 rounded-xl flex items-center justify-center"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* PRINTABLE PURCHASE ORDER SHEET */}
            <div className="p-8 space-y-6 font-sans">
              <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900">PURCHASE ORDER</h1>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1">QUANTIX AI SYSTEM GENERATED</p>
                </div>
                <div className="text-right text-xs text-slate-500 space-y-1 font-mono">
                  <p><strong className="text-slate-800">PO Ref:</strong> PO-{Date.now().toString().slice(-6)}</p>
                  <p><strong className="text-slate-800">Date:</strong> {new Date().toLocaleDateString('en-ZA')}</p>
                  <p><strong className="text-slate-800">Store Account:</strong> {user?.email || "Default Store"}</p>
                </div>
              </div>

              {/* REORDER ITEMS TABLE */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-800 text-slate-800 font-bold uppercase tracking-wider">
                    <th className="py-3">Item Description</th>
                    <th className="py-3 text-center">Current Stock</th>
                    <th className="py-3 text-center">Min Required</th>
                    <th className="py-3 text-center">Suggested Order</th>
                    <th className="py-3 text-right">Est. Cost / Unit</th>
                    <th className="py-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {lowStockProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-mono">
                        All inventory items are currently above baseline reorder levels.
                      </td>
                    </tr>
                  ) : (
                    lowStockProducts.map((item, idx) => {
                      const suggestedOrder = Math.max((item.min_required * 2) - item.stock_on_hand, 10);
                      const lineTotal = suggestedOrder * item.cost_price;

                      return (
                        <tr key={idx}>
                          <td className="py-3 font-bold text-slate-900">{item.name}</td>
                          <td className="py-3 text-center font-mono text-rose-600 font-bold">{item.stock_on_hand}</td>
                          <td className="py-3 text-center font-mono text-slate-500">{item.min_required}</td>
                          <td className="py-3 text-center font-mono font-bold text-blue-600">{suggestedOrder}</td>
                          <td className="py-3 text-right font-mono">R{Number(item.cost_price).toFixed(2)}</td>
                          <td className="py-3 text-right font-mono font-bold text-slate-900">R{lineTotal.toFixed(2)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* SUMMARY TOTALS */}
              <div className="border-t border-slate-200 pt-4 flex justify-end">
                <div className="w-64 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600 font-mono">
                    <span>Estimated PO Total:</span>
                    <span className="font-bold text-slate-900">
                      R{lowStockProducts.reduce((sum, item) => {
                        const qty = Math.max((item.min_required * 2) - item.stock_on_hand, 10);
                        return sum + (qty * item.cost_price);
                      }, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}