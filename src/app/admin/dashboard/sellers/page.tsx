

"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog"
import { PlusCircle, MoreHorizontal, Edit, Trash2, InfinityIcon, Percent, Save, Settings } from "lucide-react"
import type { Seller, CommissionRule, CommissionSettings } from "@/lib/types"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import { getAllFromCollection_client, getDocumentById, saveDocument, deleteDocument, saveCommissionSettings } from "@/lib/firestore-services"

type FormData = Omit<Seller, 'id' | 'fixedCommissionRate'> & {
    fixedCommissionRate: number | '';
};

export default function SellersPage() {
  const [sellers, setSellers] = useState<Seller[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isCommissionSettingsOpen, setIsCommissionSettingsOpen] = useState(false)
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null)
  const [formData, setFormData] = useState<FormData>({ name: '', dni: '', phone: '', useFixedCommission: false, fixedCommissionRate: '' });
  const [commissionSettings, setCommissionSettings] = useState<CommissionSettings>({ rules: [] })
  const { toast } = useToast();

  const fetchData = async () => {
    const [sellersData, commissionSettingsData] = await Promise.all([
      getAllFromCollection_client<Seller>('sellers'),
      getDocumentById<CommissionSettings>('settings', 'commissions')
    ]);
    setSellers(sellersData);
    if(commissionSettingsData) setCommissionSettings(commissionSettingsData);
  }

  useEffect(() => {
    fetchData();
  }, [])
  
  useEffect(() => {
    if (selectedSeller) {
        setFormData({
            name: selectedSeller.name,
            dni: selectedSeller.dni,
            phone: selectedSeller.phone,
            useFixedCommission: selectedSeller.useFixedCommission,
            fixedCommissionRate: selectedSeller.fixedCommissionRate || '',
        });
    } else {
        setFormData({ name: '', dni: '', phone: '', useFixedCommission: false, fixedCommissionRate: '' });
    }
  }, [selectedSeller, isFormOpen]);

  const handleCreate = () => {
    setSelectedSeller(null)
    setIsFormOpen(true)
  }

  const handleEdit = (seller: Seller) => {
    setSelectedSeller(seller)
    setIsFormOpen(true)
  }

  const handleFormChange = (id: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  }

  const handleSave = async () => {
    if (!formData.name) {
        toast({ title: "Datos incompletos", description: "El nombre es obligatorio.", variant: "destructive" });
        return;
    }

    const sellerData: Partial<Seller> = {
        name: formData.name,
        dni: formData.dni,
        phone: formData.phone,
        useFixedCommission: formData.useFixedCommission,
        fixedCommissionRate: Number(formData.fixedCommissionRate) || 0,
    }
    
    await saveDocument('sellers', sellerData, selectedSeller?.id);
    await fetchData();
    
    setIsFormOpen(false)
    setSelectedSeller(null)
    toast({ title: "¡Éxito!", description: "El vendedor/a ha sido guardado/a." });
  }

  const handleDelete = async (sellerToDelete: Seller) => {
    await deleteDocument('sellers', sellerToDelete.id);
    await fetchData();
    toast({ title: "Vendedor/a eliminado/a", description: "El vendedor/a ha sido borrado del sistema." });
  }
  
  const handleCommissionRuleChange = (id: string, field: keyof CommissionRule, value: any) => {
    setCommissionSettings(prev => ({
      ...prev,
      rules: prev.rules.map(rule => {
        if (rule.id === id) {
          const numericValue = value === '' ? '' : Number(value);
          return { ...rule, [field]: numericValue };
        }
        return rule;
      })
    }))
  }

  const handleAddCommissionRule = () => {
    const newRule = { id: `C-${Date.now()}`, from: 0, to: 0, rate: 0 };
    setCommissionSettings(prev => ({
      ...prev,
      rules: [...prev.rules, newRule]
    }))
  }

  const handleRemoveCommissionRule = (id: string) => {
    setCommissionSettings(prev => ({
      ...prev,
      rules: prev.rules.filter(rule => rule.id !== id)
    }))
  }
  
  const handleSaveCommissionSettings = async () => {
    await saveCommissionSettings(commissionSettings);
    await fetchData();
    toast({ title: "Configuración de comisiones guardada."});
    setIsCommissionSettingsOpen(false);
  }

  return (
    <div className="space-y-6">
       <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{selectedSeller ? "Editar Vendedor" : "Nuevo Vendedor"}</DialogTitle>
                <DialogDescription>
                {selectedSeller ? "Modifica los datos del vendedor." : "Añade un nuevo vendedor al sistema."}
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Nombre Completo</Label>
                    <Input id="name" value={formData.name} onChange={(e) => handleFormChange('name', e.target.value)}/>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="dni">DNI</Label>
                    <Input id="dni" value={formData.dni} onChange={(e) => handleFormChange('dni', e.target.value)}/>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input id="phone" value={formData.phone} onChange={(e) => handleFormChange('phone', e.target.value)}/>
                </div>
                <div className="flex items-center space-x-2 pt-4">
                  <Switch id="useFixedCommission" checked={formData.useFixedCommission} onCheckedChange={(c) => handleFormChange('useFixedCommission', c)} />
                  <Label htmlFor="useFixedCommission">Usar Comisión Fija</Label>
                </div>
                 {formData.useFixedCommission && (
                    <div className="space-y-2 pl-8">
                        <Label htmlFor="fixedCommissionRate">Comisión Fija (%)</Label>
                        <Input id="fixedCommissionRate" type="number" value={formData.fixedCommissionRate} onChange={(e) => handleFormChange('fixedCommissionRate', e.target.value === '' ? '' : Number(e.target.value))} placeholder="Ej: 15"/>
                    </div>
                 )}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave}>Guardar</Button>
            </DialogFooter>
        </DialogContent>
       </Dialog>

       <Dialog open={isCommissionSettingsOpen} onOpenChange={setIsCommissionSettingsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configurar Comisiones por Venta</DialogTitle>
              <DialogDescription>
                Define los rangos de comisiones que se aplicarán a los vendedores (a menos que tengan una comisión fija).
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              {commissionSettings.rules.map((rule, index) => (
                <div key={rule.id} className="flex items-center gap-2">
                  <Input type="number" placeholder="Desde" value={rule.from || ''} onChange={e => handleCommissionRuleChange(rule.id, 'from', e.target.value)} className="w-24"/>
                  <span>-</span>
                  {rule.to === 'infinite' ? (
                     <Button variant="outline" size="icon" onClick={() => handleCommissionRuleChange(rule.id, 'to', (rule.from || 0) + 1)}><InfinityIcon className="w-4 h-4"/></Button>
                  ) : (
                    <Input type="number" placeholder="Hasta" value={rule.to || ''} onChange={e => handleCommissionRuleChange(rule.id, 'to', e.target.value)} className="w-24"/>
                  )}
                   <Input type="number" placeholder="%" value={rule.rate || ''} onChange={e => handleCommissionRuleChange(rule.id, 'rate', e.target.value)} className="w-24"/>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveCommissionRule(rule.id)}><Trash2 className="w-4 h-4 text-destructive"/></Button>
                </div>
              ))}
              <Button variant="outline" onClick={handleAddCommissionRule}><PlusCircle className="mr-2 h-4 w-4"/>Añadir Rango</Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCommissionSettingsOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveCommissionSettings}><Save className="mr-2 h-4 w-4"/>Guardar Configuración</Button>
            </DialogFooter>
          </DialogContent>
       </Dialog>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Vendedores</h2>
          <p className="text-muted-foreground">
            Añade vendedores y configura las comisiones por ventas.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsCommissionSettingsOpen(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Configurar Comisiones
          </Button>
          <Button onClick={handleCreate}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Vendedor
          </Button>
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>DNI</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Tipo Comisión</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sellers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No hay vendedores registrados.
                  </TableCell>
                </TableRow>
              ) : sellers.map((seller) => (
                  <TableRow key={seller.id}>
                    <TableCell className="font-medium">{seller.name}</TableCell>
                    <TableCell>{seller.dni}</TableCell>
                    <TableCell>{seller.phone}</TableCell>
                    <TableCell>
                      {seller.useFixedCommission 
                        ? <span className="font-semibold">{seller.fixedCommissionRate}% (Fija)</span>
                        : <span>Por Rangos</span>
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(seller)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(seller)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
