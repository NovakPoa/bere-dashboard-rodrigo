import { useEffect } from "react";
import { Link } from "react-router-dom";
import { setPageSEO } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { CheckCheck, Wallet, HeartPulse, Utensils } from "lucide-react";

export default function Landing() {
  useEffect(() => {
    setPageSEO(
      "Hub Pessoal — Produtividade simples",
      "Landing clean e minimalista que apresenta o produto e CTAs para começar."
    );
  }, []);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Hub Pessoal",
    description:
      "Aplicativo para organizar finanças, hábitos, alimentação e atividades físicas.",
    applicationCategory: "Productivity",
    operatingSystem: "Web",
    url: typeof window !== "undefined" ? window.location.origin : "",
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <nav className="container flex h-14 items-center justify-between px-4">
          <Link to="/" className="font-semibold tracking-tight">
            Hub Pessoal
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">
              Entrar
            </Link>
            <Button asChild>
              <Link to="/auth">Começar agora</Link>
            </Button>
          </div>
        </nav>
      </header>

      <main>
        <section className="container px-4 py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Seu hub pessoal para finanças, hábitos e organização
            </h1>
            <p className="mt-4 text-muted-foreground">
              Uma plataforma minimalista para visualizar seus indicadores e ganhar clareza
              no dia a dia. Simples, rápida e focada no que importa.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button size="lg" asChild>
                <Link to="/auth">Criar conta gratuita</Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link to="/auth">Entrar</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="container px-4 pb-16 md:pb-24">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<Wallet className="h-5 w-5" aria-hidden />}
              title="Financeira"
              description="Acompanhe gastos por categoria e métodos, com estatísticas claras."
              to="/financeira"
            />
            <FeatureCard
              icon={<HeartPulse className="h-5 w-5" aria-hidden />}
              title="Atividades"
              description="Visualize treinos, evolução e calorias gastas."
              to="/atividades"
            />
            <FeatureCard
              icon={<Utensils className="h-5 w-5" aria-hidden />}
              title="Alimentação"
              description="Calorias consumidas, macro nutrientes e refeições recentes."
              to="/alimentacao"
            />
            <FeatureCard
              icon={<CheckCheck className="h-5 w-5" aria-hidden />}
              title="Hábitos"
              description="Percentual concluído e foco semanal para manter consistência."
              to="/habitos"
            />
          </div>
        </section>

        <section className="container px-4 pb-20">
          <div className="rounded-lg border p-6 text-center md:p-10">
            <h2 className="text-2xl font-semibold">Pronto para começar?</h2>
            <p className="mt-2 text-muted-foreground">
              Crie uma conta em segundos e comece a centralizar sua vida.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button asChild>
                <Link to="/auth">Começar agora</Link>
              </Button>
              <Link to="/auth" className="text-sm underline underline-offset-4">
                Já tenho conta
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="container px-4 py-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Hub Pessoal — Minimalista e eficiente
        </div>
      </footer>

      {/* Structured Data */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  to,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  to: string;
}) {
  return (
    <article className="rounded-lg border p-4 hover:shadow-sm transition-shadow">
      <Link to={to} className="block h-full">
        <div className="flex items-center gap-2">
          <div className="rounded-md border p-2 text-primary">{icon}</div>
          <h3 className="font-medium">{title}</h3>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <span className="mt-3 inline-block text-sm text-primary underline underline-offset-4">
          Ver mais
        </span>
      </Link>
    </article>
  );
}
