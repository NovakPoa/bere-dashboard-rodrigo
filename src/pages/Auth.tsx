import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { setPageSEO } from "@/lib/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPageSEO("Autenticação", "Entre ou crie sua conta para continuar");
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate("/app", { replace: true });
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/app", { replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (error) throw error;
      toast({ title: "Bem-vindo!", description: "Login realizado com sucesso." });
      navigate("/app", { replace: true });
    } catch (err: any) {
      toast({ title: "Erro ao entrar", description: err?.message ?? "Tente novamente." });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: { emailRedirectTo: redirectUrl },
      });
      if (error) throw error;
      toast({
        title: "Verifique seu e-mail",
        description: "Enviamos um link de confirmação para concluir seu cadastro.",
      });
    } catch (err: any) {
      toast({ title: "Erro ao cadastrar", description: err?.message ?? "Tente novamente." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <section className="w-full max-w-md">
        <header className="text-center mb-6">
          <h1 className="text-2xl font-semibold">Autenticação</h1>
          <p className="text-sm text-muted-foreground mt-1">Acesse sua conta ou crie uma nova</p>
        </header>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">Bem-vindo</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Cadastrar</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-4">
                <form onSubmit={handleLogin} className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="login-email">E-mail</Label>
                    <Input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="voce@exemplo.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input
                      id="login-password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Entrando…" : "Entrar"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-4">
                <form onSubmit={handleSignup} className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="signup-email">E-mail</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="voce@exemplo.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={6}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Criando conta…" : "Criar conta"}
                  </Button>
                </form>
              </TabsContent>

            </Tabs>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Quer voltar?</span>{" "}
              <Link to="/" className="underline underline-offset-4">
                Ir para a página inicial
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
