"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Mail, ArrowRight, UserPlus } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else if (data.session) {
      router.push("/");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please enter both email and password to register.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    // 1. Register user in Supabase auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    // If user registration succeeded and session exists
    if (data.user) {
      // Check if store already exists for this owner, or insert a new one
      const { data: existingStore } = await supabase
        .from("stores")
        .select("id")
        .eq("owner_id", data.user.id)
        .single();

      if (!existingStore) {
        const { error: storeError } = await supabase.from("stores").insert([
          {
            name: `${email.split("@")[0]}'s Store`,
            owner_id: data.user.id,
          },
        ]);

        if (storeError) {
          console.log("Store notice:", storeError.message);
        }
      }

      setSuccessMsg("Registration complete! Signing in...");
      
      // Attempt sign in
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInData?.session) {
        router.push("/");
      } else if (signInErr) {
        // If sign in fails due to pending confirmation
        setErrorMsg("Account created! Please sign in with your credentials.");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0A192F] flex items-center justify-center p-4 font-sans">
      <Card className="w-full max-w-md bg-white border-slate-200 shadow-2xl rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100 p-8 text-center">
          <div className="w-28 bg-white rounded-xl p-2 shadow-md mx-auto mb-4 border border-slate-100">
            <img 
              src="/logo.jpeg" 
              alt="Quant AI Logo" 
              className="w-full h-auto object-contain rounded-lg"
            />
          </div>
          <CardTitle className="text-lg font-extrabold text-slate-900 tracking-tight">
            Quant Control Center
          </CardTitle>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Sign in or register your store workspace
          </p>
        </CardHeader>

        <CardContent className="p-8 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-0.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="storeowner@quantix.io"
                  required
                  className="bg-white border-slate-200 pl-10 text-xs rounded-xl h-10 focus-visible:ring-blue-600"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-0.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-white border-slate-200 pl-10 text-xs rounded-xl h-10 focus-visible:ring-blue-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-11 rounded-xl shadow-md flex items-center justify-center gap-1.5"
              >
                Sign In <ArrowRight className="h-3.5 w-3.5" />
              </Button>

              <Button
                type="button"
                onClick={handleSignUp}
                disabled={loading}
                variant="outline"
                className="border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs h-11 rounded-xl shadow-sm flex items-center justify-center gap-1.5"
              >
                Register <UserPlus className="h-3.5 w-3.5 text-blue-600" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}