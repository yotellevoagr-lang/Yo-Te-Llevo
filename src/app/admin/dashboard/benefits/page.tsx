
"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Trash2, Edit, Gift, Ticket, Users, CalendarIcon, Copy, Loader2, Eye, Download, Palette } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/components/auth/auth-provider';
import { 
  getAllBenefits, 
  createBenefit, 
  updateBenefit, 
  deleteBenefit,
  generateBenefitCode,
  getRedemptionsByBenefit
} from '@/lib/benefits-services';
import { getAllFromCollection_client } from '@/lib/firestore-services';
import type { Benefit, BenefitRedemption, Tour, Passenger, DiscountType, EligibleAudience, VisibilityScope } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type FormData = {
  code: string;
  title: string;
  description: string;
  discountType: DiscountType;
  discountValue: number | '';
  maxUsesTotal: number | '';
  maxUsesPerPassenger: number | '';
  maxPassengersPerUse: number | '';
  applicableTripIds: string[];
  eligibleAudience: EligibleAudience;
  selectedPassengerIds: string[];
  visibilityScope: VisibilityScope;
  publishToCommunity: boolean;
  validFrom: Date;
  validUntil: Date;
  autoApply: boolean;
  design: {
    backgroundColor: string;
    textColor: string;
    accentColor: string;
    layoutPreset: 'bold';
  };
};

const defaultFormData: FormData = {
  code: '',
  title: '',
  description: '',
  discountType: 'percentage' as DiscountType,
  discountValue: 10,
  maxUsesTotal: 0,
  maxUsesPerPassenger: 1,
  maxPassengersPerUse: 1,
  applicableTripIds: [] as string[],
  eligibleAudience: 'all' as EligibleAudience,
  selectedPassengerIds: [] as string[],
  visibilityScope: 'public' as VisibilityScope,
  publishToCommunity: false,
  validFrom: new Date(),
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  autoApply: false,
  design: {
    backgroundColor: '#ec4899',
    textColor: '#ffffff',
    accentColor: '#f472b6',
    layoutPreset: 'bold' as const
  }
};

export default function AdminBenefitsPage() {
  const { user } = useAuth();
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBenefit, setEditingBenefit] = useState<Benefit | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [selectedBenefitRedemptions, setSelectedBenefitRedemptions] = useState<BenefitRedemption[]>([]);
  const [showRedemptionsDialog, setShowRedemptionsDialog] = useState(false);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const { toast } = useToast();
  const couponRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [benefitsData, toursData, passengersData] = await Promise.all([
        getAllBenefits(),
        getAllFromCollection_client<Tour>('tours'),
        getAllFromCollection_client<Passenger>('passengers')
      ]);
      setBenefits(benefitsData);
      setTours(toursData.filter((t: Tour) => new Date(t.date) >= new Date()));
      setPassengers(passengersData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingBenefit(null);
    setFormData({
      ...defaultFormData,
      code: generateBenefitCode()
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (benefit: Benefit) => {
    setEditingBenefit(benefit);
    setFormData({
      code: benefit.code,
      title: benefit.title,
      description: benefit.description,
      discountType: benefit.discountType,
      discountValue: benefit.discountValue,
      maxUsesTotal: benefit.maxUsesTotal,
      maxUsesPerPassenger: benefit.maxUsesPerPassenger,
      maxPassengersPerUse: benefit.maxPassengersPerUse,
      applicableTripIds: benefit.applicableTripIds,
      eligibleAudience: benefit.eligibleAudience,
      selectedPassengerIds: benefit.selectedPassengerIds,
      visibilityScope: benefit.visibilityScope,
      publishToCommunity: benefit.publishToCommunity,
      validFrom: benefit.validFrom,
      validUntil: benefit.validUntil,
      autoApply: benefit.autoApply,
      design: benefit.design || defaultFormData.design
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.code.trim()) {
      toast({
        title: "Error",
        description: "El título y código son requeridos",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    try {
      const benefitData = {
        ...formData,
        discountValue: Number(formData.discountValue) || 0,
        maxUsesTotal: Number(formData.maxUsesTotal) || 0,
        maxUsesPerPassenger: Number(formData.maxUsesPerPassenger) || 1,
        maxPassengersPerUse: Number(formData.maxPassengersPerUse) || 1,
        status: 'active' as const,
        createdBy: user?.id || ''
      };

      if (editingBenefit) {
        await updateBenefit(editingBenefit.id, benefitData);
        toast({ title: "Beneficio actualizado" });
      } else {
        await createBenefit(benefitData);
        toast({ title: "Beneficio creado" });
      }

      setIsDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving benefit:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el beneficio",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (benefitId: string) => {
    try {
      await deleteBenefit(benefitId);
      toast({ title: "Beneficio eliminado" });
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el beneficio",
        variant: "destructive"
      });
    }
  };

  const showRedemptions = async (benefit: Benefit) => {
    const redemptions = await getRedemptionsByBenefit(benefit.id);
    setSelectedBenefitRedemptions(redemptions);
    setShowRedemptionsDialog(true);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Código copiado" });
  };

  const filteredBenefits = benefits.filter(b => {
    if (activeTab === 'active') return b.status === 'active';
    if (activeTab === 'expired') return b.status === 'expired' || new Date(b.validUntil) < new Date();
    if (activeTab === 'draft') return b.status === 'draft';
    return true;
  });

  const handleNumberChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
        ...prev,
        [field]: value === '' ? '' : parseInt(value, 10)
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Beneficios y Cupones</h1>
          <p className="text-muted-foreground">
            Gestiona descuentos y promociones para tus clientes
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Beneficio
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Beneficios Activos</CardDescription>
            <CardTitle className="text-3xl">
              {benefits.filter(b => b.status === 'active').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Canjeados</CardDescription>
            <CardTitle className="text-3xl">
              {benefits.reduce((sum, b) => sum + b.currentUsesTotal, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Expirados</CardDescription>
            <CardTitle className="text-3xl">
              {benefits.filter(b => new Date(b.validUntil) < new Date()).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>En Comunidad</CardDescription>
            <CardTitle className="text-3xl">
              {benefits.filter(b => b.publishToCommunity).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">Activos</TabsTrigger>
          <TabsTrigger value="expired">Expirados</TabsTrigger>
          <TabsTrigger value="all">Todos</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card>
            <CardContent className="pt-6">
              {filteredBenefits.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay beneficios en esta categoría</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Descuento</TableHead>
                      <TableHead>Usos</TableHead>
                      <TableHead>Válido hasta</TableHead>
                      <TableHead>Visibilidad</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBenefits.map((benefit) => (
                      <TableRow key={benefit.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                              {benefit.code}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyCode(benefit.code)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{benefit.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {benefit.description}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {benefit.discountType === 'percentage' 
                              ? `${benefit.discountValue}%`
                              : `$${benefit.discountValue}`
                            }
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {benefit.currentUsesTotal}
                            {benefit.maxUsesTotal > 0 && ` / ${benefit.maxUsesTotal}`}
                          </span>
                        </TableCell>
                        <TableCell>
                          {format(new Date(benefit.validUntil), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant={benefit.visibilityScope === 'public' ? 'default' : 'secondary'} className="text-xs">
                              {benefit.visibilityScope === 'public' ? 'Público' : 'Registrados'}
                            </Badge>
                            {benefit.publishToCommunity && (
                              <Badge variant="outline" className="text-xs">Comunidad</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => showRedemptions(benefit)}
                              title="Ver usos"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(benefit)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar beneficio?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción no se puede deshacer.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(benefit.id)}>
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBenefit ? 'Editar Beneficio' : 'Nuevo Beneficio'}
            </DialogTitle>
            <DialogDescription>
              Configura los detalles del cupón o beneficio
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Código *</Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        code: e.target.value.toUpperCase() 
                      }))}
                      placeholder="CODIGO123"
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setFormData(prev => ({ 
                        ...prev, 
                        code: generateBenefitCode() 
                      }))}
                      title="Generar código"
                    >
                      <Ticket className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Descuento</Label>
                  <Select
                    value={formData.discountType}
                    onValueChange={(value: DiscountType) => 
                      setFormData(prev => ({ ...prev, discountType: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                      <SelectItem value="fixed">Monto Fijo ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ej: Descuento de Verano"
                />
              </div>

              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción del beneficio..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor del Descuento</Label>
                  <Input
                    type="number"
                    value={formData.discountValue}
                    onChange={(e) => handleNumberChange('discountValue', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Límite de Usos Total</Label>
                  <Input
                    type="number"
                    value={formData.maxUsesTotal}
                    onChange={(e) => handleNumberChange('maxUsesTotal', e.target.value)}
                    placeholder="0 = ilimitado"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Máx. por Pasajero</Label>
                  <Input
                    type="number"
                    value={formData.maxUsesPerPassenger}
                    onChange={(e) => handleNumberChange('maxUsesPerPassenger', e.target.value)}
                    min={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pasajeros por Uso</Label>
                  <Input
                    type="number"
                    value={formData.maxPassengersPerUse}
                    onChange={(e) => handleNumberChange('maxPassengersPerUse', e.target.value)}
                    min={1}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Válido Desde</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(formData.validFrom, "dd/MM/yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.validFrom}
                        onSelect={(date) => date && setFormData(prev => ({ ...prev, validFrom: date }))}
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Válido Hasta</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(formData.validUntil, "dd/MM/yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.validUntil}
                        onSelect={(date) => date && setFormData(prev => ({ ...prev, validUntil: date }))}
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Aplicable a Viajes</Label>
                <Select
                  value={formData.applicableTripIds.length === 0 ? 'all' : 'selected'}
                  onValueChange={(value) => {
                    if (value === 'all') {
                      setFormData(prev => ({ ...prev, applicableTripIds: [] }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los viajes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los viajes</SelectItem>
                    {tours.map((tour) => (
                      <SelectItem key={tour.id} value={tour.id}>
                        {tour.destination} - {format(new Date(tour.date), "dd/MM")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Audiencia Elegible</Label>
                <Select
                  value={formData.eligibleAudience}
                  onValueChange={(value: EligibleAudience) => 
                    setFormData(prev => ({ ...prev, eligibleAudience: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="selected">Pasajeros Seleccionados</SelectItem>
                    <SelectItem value="recurrent">Clientes Recurrentes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Publicar en Comunidad</Label>
                    <p className="text-xs text-muted-foreground">
                      Mostrar en el feed de la comunidad
                    </p>
                  </div>
                  <Switch
                    checked={formData.publishToCommunity}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, publishToCommunity: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-aplicar</Label>
                    <p className="text-xs text-muted-foreground">
                      Aplicar automáticamente en reservas elegibles
                    </p>
                  </div>
                  <Switch
                    checked={formData.autoApply}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, autoApply: checked }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Label>Vista Previa del Cupón</Label>
              <div 
                ref={couponRef}
                className="rounded-xl p-6 text-center shadow-lg"
                style={{
                  backgroundColor: formData.design.backgroundColor,
                  color: formData.design.textColor
                }}
              >
                <div className="mb-2">
                  <Gift className="h-10 w-10 mx-auto" style={{ color: formData.design.accentColor }} />
                </div>
                <h3 className="text-xl font-bold mb-1">
                  {formData.title || 'Título del Beneficio'}
                </h3>
                <p className="text-sm opacity-80 mb-3">
                  {formData.description || 'Descripción del beneficio'}
                </p>
                <div 
                  className="text-3xl font-bold mb-3"
                  style={{ color: formData.design.accentColor }}
                >
                  {formData.discountType === 'percentage' 
                    ? `${formData.discountValue || 0}% OFF`
                    : `$${formData.discountValue || 0} OFF`
                  }
                </div>
                <div 
                  className="bg-white/20 rounded-lg py-2 px-4 inline-block font-mono text-lg tracking-wider"
                >
                  {formData.code || 'CODIGO'}
                </div>
                <p className="text-xs mt-3 opacity-70">
                  Válido hasta {format(formData.validUntil, "dd/MM/yyyy")}
                </p>
              </div>

              <div className="space-y-3">
                <Label>Personalizar Diseño</Label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Fondo</Label>
                    <Input
                      type="color"
                      value={formData.design.backgroundColor}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        design: { ...prev.design, backgroundColor: e.target.value }
                      }))}
                      className="h-10 p-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Texto</Label>
                    <Input
                      type="color"
                      value={formData.design.textColor}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        design: { ...prev.design, textColor: e.target.value }
                      }))}
                      className="h-10 p-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Acento</Label>
                    <Input
                      type="color"
                      value={formData.design.accentColor}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        design: { ...prev.design, accentColor: e.target.value }
                      }))}
                      className="h-10 p-1"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      design: { 
                        backgroundColor: '#ec4899', 
                        textColor: '#ffffff', 
                        accentColor: '#f472b6',
                        layoutPreset: 'bold' 
                      }
                    }))}
                  >
                    <Palette className="h-3 w-3 mr-1" /> Rosa
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      design: { 
                        backgroundColor: '#3b82f6', 
                        textColor: '#ffffff', 
                        accentColor: '#60a5fa',
                        layoutPreset: 'bold' 
                      }
                    }))}
                  >
                    <Palette className="h-3 w-3 mr-1" /> Azul
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      design: { 
                        backgroundColor: '#10b981', 
                        textColor: '#ffffff', 
                        accentColor: '#34d399',
                        layoutPreset: 'bold' 
                      }
                    }))}
                  >
                    <Palette className="h-3 w-3 mr-1" /> Verde
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</>
              ) : (
                editingBenefit ? 'Actualizar' : 'Crear Beneficio'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRedemptionsDialog} onOpenChange={setShowRedemptionsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Historial de Usos</DialogTitle>
          </DialogHeader>
          {selectedBenefitRedemptions.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">
              Este beneficio aún no ha sido usado
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pasajero</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descuento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedBenefitRedemptions.map((redemption) => (
                  <TableRow key={redemption.id}>
                    <TableCell>{redemption.passengerName}</TableCell>
                    <TableCell>
                      {format(new Date(redemption.usedAt), "dd/MM/yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      {redemption.discountType === 'percentage' 
                        ? `${redemption.discountApplied}%`
                        : `$${redemption.discountApplied}`
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

