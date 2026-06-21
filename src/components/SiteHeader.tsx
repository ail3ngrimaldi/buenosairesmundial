import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { LogOut, ShieldCheck } from "lucide-react";

export function SiteHeader() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) checkAdmin(data.session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) checkAdmin(s.user.id);
      else setIsAdmin(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
  };

  const handleSignIn = async () => {
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
    if (res.error) console.error(res.error);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    navigate({ to: "/" });
  };

  return (
    <nav className="border-b border-border bg-stadium/95 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 bg-albice rounded-md flex items-center justify-center text-stadium font-black text-sm">MB</div>
          <span className="font-display text-2xl tracking-wide">MundialBar</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors hidden sm:inline" activeOptions={{ exact: true }} activeProps={{ className: "text-albice" }}>
            Buscar
          </Link>
          {session ? (
            <>
              {isAdmin && (
                <Link to="/admin" className="flex items-center gap-1 text-albice hover:text-albice/80 transition-colors font-semibold" activeProps={{ className: "text-albice" }}>
                  <ShieldCheck className="size-4" /> Admin
                </Link>
              )}
              <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors" activeProps={{ className: "text-albice" }}>
                Mi bar
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-foreground">
                <LogOut className="size-4" />
              </Button>
            </>
          ) : (
            <Button onClick={handleSignIn} size="sm" className="bg-albice text-stadium hover:bg-albice/90 font-semibold">
              Soy un bar — Ingresar
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
