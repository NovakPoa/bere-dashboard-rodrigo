import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { setPageSEO } from "@/lib/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
  console.log('[Auth] Component rendering');
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  useEffect(() => {
    setPageSEO("Autenticação", "Entre ou crie sua conta para continuar");
    
    // Verificar se há erros na URL (como OTP expirado)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const error = hashParams.get('error');
    const errorCode = hashParams.get('error_code');
    const errorDescription = hashParams.get('error_description');
    const type = hashParams.get('type');
    
    console.log('[Auth] Hash params:', { 
      type, 
      error, 
      errorCode, 
      errorDescription 
    });
    
    if (error) {
      console.log('[Auth] Error detected in URL:', { error, errorCode, errorDescription });
      
      let errorMessage = "Ocorreu um erro durante a autenticação.";
      let shouldOpenDialog = false;
      
      if (errorCode === 'otp_expired') {
        errorMessage = "O link de recuperação expirou ou já foi usado. Solicite um novo link de recuperação.";
        shouldOpenDialog = true;
      } else if (error === 'access_denied') {
        errorMessage = "Acesso negado. Verifique se o link está correto e tente novamente.";
        shouldOpenDialog = true;
      }
      
      toast({
        title: "Erro de autenticação",
        description: errorMessage,
        variant: "destructive"
      });
      
      if (shouldOpenDialog) {
        setResetDialogOpen(true);
      }
      
      // Limpar a URL mantendo apenas o path
      window.history.replaceState(null, '', window.location.pathname);
      return;
    }
    
    // Se há type=recovery na URL, apenas ativar o modo de recuperação
    // O Supabase detectará e processará automaticamente os tokens via detectSessionInUrl
    if (type === 'recovery') {
      console.log('[Auth] Recovery mode detected - activating recovery mode');
      setIsRecoveryMode(true);
      
      // Limpar a URL mantendo apenas o path
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [toast]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] Auth state change:', { event, hasSession: !!session, isRecoveryMode });
      
      // Se não estamos em modo de recuperação e há sessão, redirecionar para app
      if (session && !isRecoveryMode) {
        console.log('[Auth] Redirecting to /app - session exists and not in recovery mode');
        navigate("/organizacao", { replace: true });
      } else if (session && isRecoveryMode) {
        console.log('[Auth] Session exists in recovery mode - staying on auth page');
      }
    });
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[Auth] Initial session check:', { hasSession: !!session, isRecoveryMode });
      if (session && !isRecoveryMode) {
        console.log('[Auth] Redirecting to /app - initial session exists and not in recovery mode');
        navigate("/organizacao", { replace: true });
      }
    });
    
    return () => subscription.unsubscribe();
  }, [navigate, isRecoveryMode]);

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
      navigate("/organizacao", { replace: true });
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
      const redirectUrl = `${window.location.origin}/auth`;
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

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const redirectUrl = `${window.location.origin}/auth`;
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: redirectUrl,
      });
      if (error) throw error;
      toast({
        title: "E-mail enviado",
        description: "Verifique sua caixa de entrada para o link de recuperação.",
      });
      setResetEmail("");
      setResetDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Erro ao enviar e-mail", description: err?.message ?? "Tente novamente." });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Erro", 
        description: "A senha deve ter pelo menos 6 caracteres.",
      });
      return;
    }

    try {
      setLoading(true);
      
      // Verificar se há sessão ativa antes de tentar atualizar
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('[Auth] No active session for password update:', sessionError);
        toast({
          title: "Sessão expirada",
          description: "Sua sessão de recuperação expirou. Solicite um novo link de recuperação.",
          variant: "destructive"
        });
        setIsRecoveryMode(false);
        setResetDialogOpen(true);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        if (error.message.includes('Auth session missing')) {
          toast({
            title: "Sessão expirada",
            description: "Sua sessão de recuperação expirou. Solicite um novo link de recuperação.",
            variant: "destructive"
          });
          setIsRecoveryMode(false);
          setResetDialogOpen(true);
          return;
        }
        throw error;
      }
      
      toast({
        title: "Senha atualizada",
        description: "Sua senha foi redefinida com sucesso.",
      });
      
      setIsRecoveryMode(false);
      setNewPassword("");
      setConfirmPassword("");
      navigate("/organizacao", { replace: true });
    } catch (err: any) {
      console.error('Error updating password:', err);
      toast({
        title: "Erro ao atualizar senha",
        description: err?.message ?? "Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <section className="w-full max-w-md">
        <header className="text-center mb-6">
          <h1 className="text-2xl font-semibold">
            {isRecoveryMode ? "Redefinir Senha" : "Autenticação"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRecoveryMode 
              ? "Digite sua nova senha" 
              : "Acesse sua conta ou crie uma nova"
            }
          </p>
        </header>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">
              {isRecoveryMode ? "Nova Senha" : "Bem-vindo"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isRecoveryMode ? (
              <form onSubmit={handleUpdatePassword} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="new-password">Nova senha</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirm-password">Confirmar senha</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <p className="text-xs text-muted-foreground">
                    A senha deve ter pelo menos 6 caracteres
                  </p>
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Atualizando…" : "Atualizar senha"}
                </Button>
              </form>
            ) : (
              <>
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

                <div className="mt-6 text-center text-sm space-y-2">
                  <div>
                    <span className="text-muted-foreground">Quer voltar?</span>{" "}
                    <Link to="/" className="underline underline-offset-4">
                      Ir para a página inicial
                    </Link>
                  </div>
                  <div>
                    <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                      <DialogTrigger asChild>
                        <button className="underline underline-offset-4 text-muted-foreground hover:text-foreground">
                          Esqueceu sua senha?
                        </button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Recuperar senha</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handlePasswordReset} className="grid gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="reset-email">E-mail</Label>
                            <Input
                              id="reset-email"
                              type="email"
                              autoComplete="email"
                              required
                              value={resetEmail}
                              onChange={(e) => setResetEmail(e.target.value)}
                              placeholder="voce@exemplo.com"
                            />
                            <p className="text-xs text-muted-foreground">
                              Enviaremos um link para redefinir sua senha
                            </p>
                          </div>
                          <Button type="submit" disabled={loading} className="w-full">
                            {loading ? "Enviando…" : "Enviar link de recuperação"}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}