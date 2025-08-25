import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, User, Link } from "lucide-react";
import { useProfile, useUpdateProfile, useLinkHistoricalData } from "@/hooks/useProfile";

export function ProfileForm() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const linkHistorical = useLinkHistoricalData();
  
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isPhoneNew, setIsPhoneNew] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      const currentPhone = profile.phone_number || "";
      setPhoneNumber(currentPhone);
      setIsPhoneNew(!currentPhone);
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate phone number format
    if (phoneNumber && !phoneNumber.match(/^\+\d{10,15}$/)) {
      return;
    }

    const wasPhoneEmpty = !profile?.phone_number;
    
    await updateProfile.mutateAsync({
      full_name: fullName || null,
      phone_number: phoneNumber || null,
    });

    // If user just added their phone number, link historical data
    if (wasPhoneEmpty && phoneNumber) {
      await linkHistorical.mutateAsync(phoneNumber);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span>Carregando perfil...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Perfil do Usuário
        </CardTitle>
        <CardDescription>
          Gerencie suas informações pessoais e vincule seu WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome Completo</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Digite seu nome completo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Número do WhatsApp
            </Label>
            <Input
              id="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+5511999999999"
              pattern="^\+\d{10,15}$"
              title="Digite o número no formato internacional (+5511999999999)"
            />
            <p className="text-sm text-muted-foreground">
              Digite seu número no formato internacional para vincular dados do WhatsApp
            </p>
            {isPhoneNew && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <Link className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  Ao salvar seu número, dados históricos do WhatsApp serão automaticamente vinculados
                </span>
              </div>
            )}
          </div>

          <Button 
            type="submit" 
            disabled={updateProfile.isPending || linkHistorical.isPending}
            className="w-full"
          >
            {updateProfile.isPending || linkHistorical.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {linkHistorical.isPending ? "Vinculando dados..." : "Salvando..."}
              </>
            ) : (
              "Salvar Perfil"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}