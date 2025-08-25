import { useEffect } from "react";
import { ProfileForm } from "@/components/ProfileForm";
import { setPageSEO } from "@/lib/seo";

export default function Profile() {
  useEffect(() => {
    setPageSEO(
      "Perfil do Usuário",
      "Gerencie suas informações pessoais e configurações da conta"
    );
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Meu Perfil</h1>
          <p className="text-muted-foreground mt-2">
            Configure suas informações pessoais e vincule seu WhatsApp para sincronizar dados automaticamente
          </p>
        </div>
        
        <ProfileForm />
      </div>
    </div>
  );
}