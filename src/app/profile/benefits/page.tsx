"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Gift, Ticket, Clock, CheckCircle, XCircle, Loader2, ArrowRight, Calendar, Tag } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { getPassengerBenefits, claimBenefit, getBenefitByCode } from '@/lib/benefits-services';
import type { PassengerBenefit } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function MyBenefitsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [benefits, setBenefits] = useState<PassengerBenefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeemCode, setRedeemCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      loadBenefits();
    }
  }, [user]);

  const loadBenefits = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const data = await getPassengerBenefits(user.id);
      setBenefits(data);
    } catch (error) {
      console.error('Error loading benefits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemCode = async () => {
    if (!redeemCode.trim() || !user) return;

    setIsRedeeming(true);
    try {
      const benefit = await getBenefitByCode(redeemCode.trim());
      
      if (!benefit) {
        toast({
          title: "Código no encontrado",
          description: "El código ingresado no existe o no es válido",
          variant: "destructive"
        });
        return;
      }

      const result = await claimBenefit(benefit.id, user.id, (user as any).name || 'Usuario');
      
      if (result.success) {
        toast({
          title: "¡Beneficio canjeado!",
          description: "El beneficio se agregó a tu cuenta"
        });
        setRedeemCode('');
        loadBenefits();
      } else {
        toast({
          title: "No se pudo canjear",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo procesar el código",
        variant: "destructive"
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  if (authLoading) {
    return (
      <div className="container py-12 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container py-12 max-w-xl text-center">
        <Gift className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Mis Beneficios</h1>
        <p className="text-muted-foreground mb-6">
          Inicia sesión para ver y gestionar tus beneficios
        </p>
        <Button asChild>
          <Link href="/login">Iniciar Sesión</Link>
        </Button>
      </div>
    );
  }

  const availableBenefits = benefits.filter(b => b.status === 'available');
  const usedBenefits = benefits.filter(b => b.status === 'used');
  const expiredBenefits = benefits.filter(b => b.status === 'expired');

  return (
    <div className="container py-8 max-w-3xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Mis Beneficios</h1>
        <p className="text-muted-foreground">
          Gestiona tus cupones y descuentos
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Canjear Código
          </CardTitle>
          <CardDescription>
            ¿Tienes un código de descuento? Ingrésalo aquí
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={redeemCode}
              onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
              placeholder="CODIGO123"
              className="font-mono"
            />
            <Button 
              onClick={handleRedeemCode}
              disabled={!redeemCode.trim() || isRedeeming}
            >
              {isRedeeming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>Canjear</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Disponibles</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {availableBenefits.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Usados</CardDescription>
            <CardTitle className="text-3xl text-blue-600">
              {usedBenefits.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Expirados</CardDescription>
            <CardTitle className="text-3xl text-gray-400">
              {expiredBenefits.length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : benefits.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Gift className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tienes beneficios aún</h3>
            <p className="text-muted-foreground mb-4">
              Visita la comunidad para encontrar ofertas exclusivas
            </p>
            <Button asChild variant="outline">
              <Link href="/community">
                Ir a la Comunidad <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {availableBenefits.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Beneficios Disponibles
              </h2>
              <div className="space-y-3">
                {availableBenefits.map((benefit) => {
                  const daysLeft = differenceInDays(new Date(benefit.expiresAt), new Date());
                  const isExpiringSoon = daysLeft <= 7;

                  return (
                    <Card key={benefit.id} className="overflow-hidden">
                      <div className="flex">
                        <div className="w-2 bg-green-500" />
                        <CardContent className="flex-1 p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold">{benefit.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {benefit.description}
                              </p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                <Badge variant="secondary">
                                  {benefit.discountType === 'percentage' 
                                    ? `${benefit.discountValue}% OFF`
                                    : `$${benefit.discountValue} OFF`
                                  }
                                </Badge>
                                <Badge variant="outline" className="gap-1">
                                  <Tag className="h-3 w-3" />
                                  {benefit.benefitCode}
                                </Badge>
                                {isExpiringSoon && (
                                  <Badge variant="destructive" className="gap-1">
                                    <Clock className="h-3 w-3" />
                                    {daysLeft <= 0 ? 'Expira hoy' : `${daysLeft} días restantes`}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">
                                Expira el
                              </p>
                              <p className="text-sm font-medium">
                                {format(new Date(benefit.expiresAt), "dd/MM/yyyy", { locale: es })}
                              </p>
                              {benefit.remainingUses > 1 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {benefit.remainingUses} usos restantes
                                </p>
                              )}
                            </div>
                          </div>
                          {benefit.applicableTripIds.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Aplica solo para viajes específicos
                            </p>
                          )}
                        </CardContent>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {usedBenefits.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-muted-foreground">
                <CheckCircle className="h-5 w-5" />
                Beneficios Usados
              </h2>
              <div className="space-y-3">
                {usedBenefits.map((benefit) => (
                  <Card key={benefit.id} className="overflow-hidden opacity-60">
                    <div className="flex">
                      <div className="w-2 bg-blue-500" />
                      <CardContent className="flex-1 p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">{benefit.title}</h3>
                            <Badge variant="outline" className="mt-1">
                              {benefit.discountType === 'percentage' 
                                ? `${benefit.discountValue}% OFF`
                                : `$${benefit.discountValue} OFF`
                              }
                            </Badge>
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary">Usado</Badge>
                            {benefit.usedAt && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(benefit.usedAt), "dd/MM/yyyy")}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {expiredBenefits.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-muted-foreground">
                <XCircle className="h-5 w-5" />
                Beneficios Expirados
              </h2>
              <div className="space-y-3">
                {expiredBenefits.map((benefit) => (
                  <Card key={benefit.id} className="overflow-hidden opacity-40">
                    <div className="flex">
                      <div className="w-2 bg-gray-400" />
                      <CardContent className="flex-1 p-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">{benefit.title}</h3>
                          <Badge variant="outline">Expirado</Badge>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
