

"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Upload, Settings as SettingsIcon, Bus, Trash2, Edit, PlusCircle, Ship, Plane, Save, MapPin, Loader2, Pin, Contact, Utensils, BedDouble, Folder, ShieldCheck, KeyRound, Mail, Eye, EyeOff, Image as ImageIcon } from "lucide-react"
import type { CustomLayoutConfig, LayoutCategory, GeneralSettings, GeoSettings, BoardingPoint, ContactSettings, Pension, RoomType, Employee } from "@/lib/types"
import { LayoutEditor } from "@/components/admin/layout-editor"
import { auth } from "@/lib/firebase"
import { updatePassword, updateEmail, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog"
import { useAuth } from "@/components/auth/auth-provider"
import { getAllFromCollection, getDocumentById, deleteDocument, saveDocument } from "@/lib/firestore-services"


const MapSelector = dynamic(
  () => import('@/components/admin/map-selector').then((mod) => mod.MapSelector),
  { 
    ssr: false,
    loading: () => <div className="h-96 flex items-center justify-center bg-muted rounded-lg"><Loader2 className="w-8 h-8 animate-spin"/></div>
  }
)

function ChangeCredentialsDialog({ adminUser, onUpdate }: { adminUser: Employee | null, onUpdate: (user: Employee) => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newEmail, setNewEmail] = useState(adminUser?.email || "");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { firebaseUser } = useAuth();

  const handleSaveChanges = async () => {
    if (!firebaseUser || !firebaseUser.email) {
      toast({ title: "Error", description: "Usuario no autenticado correctamente.", variant: "destructive" });
      return;
    }
    
    setIsLoading(true);
    try {
        const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
        await reauthenticateWithCredential(firebaseUser, credential);

        if (newEmail && newEmail !== firebaseUser.email) {
            await updateEmail(firebaseUser, newEmail);
            await saveDocument('admin', { email: newEmail }, firebaseUser.uid);
            toast({ title: "Email actualizado", description: "Tu email de acceso ha sido cambiado." });
        }

        if (newPassword) {
            if (newPassword.length < 6) {
                toast({ title: "Error", description: "La nueva contraseña debe tener al menos 6 caracteres.", variant: "destructive" });
                setIsLoading(false);
                return;
            }
            if (newPassword !== confirmPassword) {
                toast({ title: "Error", description: "Las nuevas contraseñas no coinciden.", variant: "destructive" });
                setIsLoading(false);
                return;
            }
            await updatePassword(firebaseUser, newPassword);
            toast({ title: "Contraseña actualizada", description: "Tu contraseña ha sido cambiada exitosamente." });
        }
        
        const updatedAdminData = await getDocumentById<Employee>('admin', firebaseUser.uid);
        if (updatedAdminData) onUpdate(updatedAdminData);
        
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");

    } catch (error) {
        console.error(error);
        toast({ title: "Error de autenticación", description: "La contraseña actual es incorrecta o hubo otro problema.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Cambiar Credenciales de Administrador</DialogTitle>
        <DialogDescription>
          Ingresa tu contraseña actual para poder cambiar tu email y/o contraseña.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
            <Label htmlFor="new-email">Correo Electrónico</Label>
            <Input id="new-email" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="current-password">Contraseña Actual</Label>
          <div className="relative">
            <Input id="current-password" type={showPassword ? "text" : "password"} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-password">Nueva Contraseña (dejar en blanco para no cambiar)</Label>
          <Input id="new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirmar Nueva Contraseña</Label>
          <Input id="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
        <Button onClick={handleSaveChanges} disabled={isLoading}>
            {isLoading && <Loader2 className="animate-spin mr-2" />}
            Guardar Cambios
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}


export default function SettingsPage() {
    const { toast } = useToast()
    const { user } = useAuth();

    const [isLoading, setIsLoading] = useState(true);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null)
    const [layoutConfig, setLayoutConfig] = useState<Record<LayoutCategory, Record<string, CustomLayoutConfig>>>({ vehicles: {}, airplanes: {}, cruises: {} });
    const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({ mainWhatsappNumber: "", calendarDownloadFolder: "Calendarios YO-TE-LLEVO", reportDownloadFolder: "Reportes Gen. YO-TE-LLEVO" });
    const [contactSettings, setContactSettings] = useState<ContactSettings>({});
    const [aboutUsMediaFile, setAboutUsMediaFile] = useState<File | null>(null);
    const [aboutUsMediaPreview, setAboutUsMediaPreview] = useState<{url: string, type: 'image' | 'video'} | null>(null);
    const [geoSettings, setGeoSettings] = useState<GeoSettings>({ latitude: -34.6037, longitude: -58.3816, radiusKm: 100 });
    const [boardingPoints, setBoardingPoints] = useState<BoardingPoint[]>([]);
    const [pensions, setPensions] = useState<Pension[]>([]);
    const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingLayout, setEditingLayout] = useState<{ category: LayoutCategory, key: string | null } | null>(null);
    const [adminUser, setAdminUser] = useState<Employee | null>(null);


    const fetchData = async () => {
        setIsLoading(true);
        try {
            if (user?.id) {
                const adminData = await getDocumentById<Employee>('admin', user.id);
                setAdminUser(adminData);
            }

            const [
                generalSettingsData,
                geoSettingsData,
                boardingPointsData,
                pensionsData,
                roomTypesData,
                layoutConfigData
            ] = await Promise.all([
                getDocumentById<GeneralSettings>('settings', 'general'),
                getDocumentById<GeoSettings>('settings', 'geo'),
                getAllFromCollection<BoardingPoint>('boarding_points'),
                getAllFromCollection<Pension>('pensions'),
                getAllFromCollection<RoomType>('room_types'),
                getDocumentById<any>('settings', 'layouts')
            ]);

            if (generalSettingsData) {
                setGeneralSettings(generalSettingsData);
                if (generalSettingsData.contact) setContactSettings(generalSettingsData.contact);
                setLogoPreview(generalSettingsData.logoUrl || null);
                setAboutUsMediaPreview(generalSettingsData.aboutUsMedia || null);
            }
            if (geoSettingsData) setGeoSettings(geoSettingsData);
            setBoardingPoints(boardingPointsData);
            setPensions(pensionsData);
            setRoomTypes(roomTypesData);
            if (layoutConfigData) setLayoutConfig(layoutConfigData);
        } catch (error) {
            console.error("Failed to fetch settings:", error);
            toast({ title: "Error", description: "No se pudieron cargar las configuraciones.", variant: "destructive"});
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user])

    const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setLogoPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleAboutUsMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAboutUsMediaFile(file);
            const fileType = file.type.startsWith('video/') ? 'video' : 'image';
            const reader = new FileReader();
            reader.onloadend = () => {
                setAboutUsMediaPreview({ url: reader.result as string, type: fileType });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGeneralSettingsChange = (field: keyof GeneralSettings, value: any) => {
        setGeneralSettings(prev => ({ ...prev, [field]: value }));
    }

    const handleContactSettingsChange = (field: keyof ContactSettings, value: string) => {
        setContactSettings(prev => ({ ...prev, [field]: value }));
    }
    
    const handleSaveLogo = async () => {
        if (!logoFile) {
            toast({ title: "Sin cambios", description: "No se ha seleccionado un nuevo archivo de logo." });
            return;
        }
        setIsLoading(true);
        try {
            await saveDocument('settings', { logoUrl: logoPreview }, 'general');
            toast({ title: "Logo guardado", description: "El logo del sitio ha sido actualizado." });
            setLogoFile(null);
        } catch (error) {
            toast({ title: "Error", description: "No se pudo subir o guardar el logo.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveAboutUsMedia = async () => {
        if (!aboutUsMediaFile) {
             toast({ title: "Sin cambios", description: "No se ha seleccionado un nuevo archivo." });
            return;
        }
        setIsLoading(true);
        try {
            const fileType = aboutUsMediaFile.type.startsWith('video/') ? 'video' : 'image';
            
            await saveDocument('settings', { aboutUsMedia: { url: aboutUsMediaPreview?.url, type: fileType } }, 'general');
            
            toast({ title: "Multimedia guardada", description: "La sección 'Sobre Nosotros' ha sido actualizada." });
            setAboutUsMediaFile(null);
        } catch (error) {
            toast({ title: "Error", description: "No se pudo subir o guardar el archivo.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveMainSettings = async () => {
        setIsLoading(true);
        await saveDocument('settings', generalSettings, 'general');
        toast({ title: "Ajustes guardados", description: "Los ajustes generales han sido actualizados." });
        setIsLoading(false);
    };

    const handleSaveContact = async () => {
        setIsLoading(true);
        const currentSettings = await getDocumentById<GeneralSettings>('settings', 'general') || {};
        const newSettings = { ...currentSettings, contact: contactSettings };
        await saveDocument('settings', newSettings, 'general');
        toast({ title: "Contacto guardado", description: "Los datos de contacto han sido actualizados." });
        setIsLoading(false);
    };
    
    const handleSaveGeo = async () => {
        setIsLoading(true);
        await saveDocument('settings', geoSettings, 'geo');
         toast({ title: "Zona guardada", description: "La zona de servicio ha sido actualizada." });
         setIsLoading(false);
    }

    const handleEditLayout = (category: LayoutCategory, key: string) => {
        setEditingLayout({ category, key });
        setIsEditorOpen(true);
    };

    const handleAddNewLayout = (category: LayoutCategory) => {
        setEditingLayout({ category, key: null });
        setIsEditorOpen(true);
    };

    const handleDeleteLayout = async (category: LayoutCategory, keyToDelete: string) => {
      const newConfig = {...layoutConfig};
      if (newConfig[category]) {
        delete newConfig[category][keyToDelete];
        await saveDocument('settings', newConfig, 'layouts');
        setLayoutConfig(newConfig);
      }
      toast({ title: "Elemento Eliminado", description: "El tipo fue eliminado." });
    };

    const handleSaveLayout = async (originalKey: string | null, newConfigData: CustomLayoutConfig) => {
        if (!editingLayout?.category) return;
        const { category } = editingLayout;
        const newKey = newConfigData.name.toLowerCase().replace(/\s+/g, '_');
        
        const currentFullConfig = {...layoutConfig};
        if (!currentFullConfig[category]) currentFullConfig[category] = {};
        
        if (originalKey && originalKey !== newKey) {
            delete currentFullConfig[category][originalKey];
        }
        currentFullConfig[category][newKey] = newConfigData;
        
        await saveDocument('settings', currentFullConfig, 'layouts');
        setLayoutConfig(currentFullConfig);

        setIsEditorOpen(false);
        setEditingLayout(null);
        toast({ title: "¡Guardado!", description: `El layout "${newConfigData.name}" se ha guardado.` });
    };

    const handleAddBoardingPoint = async () => {
        const newId = await saveDocument('boarding_points', { name: '' });
        await fetchData();
    };
    const handleBoardingPointChange = (id: string, name: string) => setBoardingPoints(prev => prev.map(p => p.id === id ? { ...p, name } : p));
    const handleRemoveBoardingPoint = async (id: string) => {
        await deleteDocument('boarding_points', id);
        await fetchData();
    };
    
    const handleSaveBoardingPoints = async () => {
        for(const point of boardingPoints) {
            if (point.name.trim()) {
                await saveDocument('boarding_points', point, point.id);
            } else {
                await deleteDocument('boarding_points', point.id);
            }
        }
        await fetchData();
        toast({ title: "Puntos de embarque guardados." });
    }

    const handleAddPension = async () => {
        await saveDocument('pensions', { name: '', description: '' });
        await fetchData();
    }
    const handlePensionChange = (id: string, field: 'name' | 'description', value: string) => setPensions(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    const handleRemovePension = async (id: string) => {
        await deleteDocument('pensions', id);
        await fetchData();
    }
    
    const handleSavePensions = async () => {
        for(const pension of pensions) {
            if (pension.name.trim()) {
                await saveDocument('pensions', pension, pension.id);
            } else {
                await deleteDocument('pensions', pension.id);
            }
        }
        await fetchData();
        toast({ title: "Tipos de pensión guardados." });
    }

    const handleAddRoomType = async () => {
        await saveDocument('room_types', { name: '' });
        await fetchData();
    }
    const handleRoomTypeChange = (id: string, name: string) => setRoomTypes(prev => prev.map(rt => rt.id === id ? { ...rt, name } : rt));
    const handleRemoveRoomType = async (id: string) => {
        await deleteDocument('room_types', id);
        await fetchData();
    }
    
    const handleSaveRoomTypes = async () => {
        for(const rt of roomTypes) {
            if (rt.name.trim()) {
                await saveDocument('room_types', rt, rt.id);
            } else {
                await deleteDocument('room_types', rt.id);
            }
        }
        await fetchData();
        toast({ title: "Tipos de habitación guardados." });
    }

    const layoutCategoryDetails = {
        vehicles: { icon: Bus, title: "Tipos de Vehículo" },
        airplanes: { icon: Plane, title: "Tipos de Avión" },
        cruises: { icon: Ship, title: "Tipos de Crucero" },
    }
    
    const handleAdminUserUpdate = (updatedUser: Employee) => setAdminUser(updatedUser);
    
  return (
    <Dialog>
     <LayoutEditor
        isOpen={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        onSave={handleSaveLayout}
        layoutKey={editingLayout?.key}
        category={editingLayout?.category}
        layoutConfig={editingLayout?.key && editingLayout?.category ? layoutConfig[editingLayout.category]?.[editingLayout.key] : undefined}
      />
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><SettingsIcon className="w-6 h-6"/> Configuración del Sitio</CardTitle>
                <CardDescription>Administra las configuraciones generales del sitio web.</CardDescription>
            </CardHeader>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="text-xl">Logo del Sitio Web</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <Input id="logoFile" type="file" accept="image/png, image/jpeg, image/gif, image/svg+xml" onChange={handleLogoFileChange} className="file:text-primary-foreground file:font-bold file:mr-4 file:px-4 file:py-2 file:rounded-full file:border-0 file:bg-primary hover:file:bg-primary/90"/>
                {logoPreview && (
                    <div className="space-y-2">
                        <Label>Vista previa del logo</Label>
                        <div className="flex items-center gap-4 p-4 border rounded-md bg-muted">
                            <Image src={getDisplayUrl(logoPreview)} alt="Vista previa del Logo" width={64} height={64} className="rounded-full"/>
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter>
                <Button onClick={handleSaveLogo} disabled={isLoading || !logoFile}><Save className="mr-2 h-4 w-4" /> Guardar Logo</Button>
            </CardFooter>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl"><ImageIcon className="w-5 h-5"/> Imagen/Video 'Sobre Nosotros'</CardTitle>
                <CardDescription>Este contenido aparecerá en la sección "Sobre Nosotros" de la página de inicio.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Input id="aboutUsMedia" type="file" accept="image/*,video/*" onChange={handleAboutUsMediaChange} className="file:text-primary-foreground file:font-bold file:mr-4 file:px-4 file:py-2 file:rounded-full file:border-0 file:bg-primary hover:file:bg-primary/90"/>
                {aboutUsMediaPreview && (
                    <div className="space-y-2">
                        <Label>Vista previa</Label>
                        <div className="flex items-center justify-center p-4 border rounded-md bg-muted">
                            {aboutUsMediaPreview.type === 'video' ? (
                                <video src={getDisplayUrl(aboutUsMediaPreview.url)} controls className="max-h-60 rounded-md" />
                            ) : (
                                <Image src={getDisplayUrl(aboutUsMediaPreview.url)} alt="Vista previa" width={300} height={200} className="rounded-md object-contain max-h-60"/>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter>
                <Button onClick={handleSaveAboutUsMedia} disabled={isLoading || !aboutUsMediaFile}><Save className="mr-2 h-4 w-4" /> Guardar Multimedia</Button>
            </CardFooter>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle className="text-xl">Ajustes Generales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="main-whatsapp">Número de WhatsApp Principal</Label>
                    <Input id="main-whatsapp" type="tel" placeholder="Ej: 5491122334455" value={generalSettings.mainWhatsappNumber || ''} onChange={(e) => handleGeneralSettingsChange('mainWhatsappNumber', e.target.value)}/>
                    <p className="text-xs text-muted-foreground">Este número se usará si un vendedor no tiene uno asignado.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="calendar-folder" className="flex items-center gap-2"><Folder/> Nombre Carpeta Calendarios</Label>
                        <Input id="calendar-folder" value={generalSettings.calendarDownloadFolder || ''} onChange={(e) => handleGeneralSettingsChange('calendarDownloadFolder', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="report-folder" className="flex items-center gap-2"><Folder/> Nombre Carpeta Reportes</Label>
                        <Input id="report-folder" value={generalSettings.reportDownloadFolder || ''} onChange={(e) => handleGeneralSettingsChange('reportDownloadFolder', e.target.value)} />
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleSaveMainSettings} disabled={isLoading}><Save className="mr-2 h-4 w-4" /> Guardar Ajustes</Button>
            </CardFooter>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl"><Contact className="w-5 h-5"/> Datos de Contacto</CardTitle>
                <CardDescription>Esta información se mostrará en la página de contacto pública.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label htmlFor="contact-address">Dirección</Label><Input id="contact-address" value={contactSettings.address || ''} onChange={(e) => handleContactSettingsChange('address', e.target.value)} placeholder="Calle Falsa 123, Ciudad"/></div>
                    <div className="space-y-2"><Label htmlFor="contact-phone">Teléfono de Contacto</Label><Input id="contact-phone" value={contactSettings.phone || ''} onChange={(e) => handleContactSettingsChange('phone', e.target.value)} placeholder="011-4567-8901"/></div>
                    <div className="space-y-2"><Label htmlFor="contact-email">Email</Label><Input id="contact-email" type="email" value={contactSettings.email || ''} onChange={(e) => handleContactSettingsChange('email', e.target.value)} placeholder="contacto@empresa.com"/></div>
                    <div className="space-y-2"><Label htmlFor="contact-hours">Horario de Atención</Label><Input id="contact-hours" value={contactSettings.hours || ''} onChange={(e) => handleContactSettingsChange('hours', e.target.value)} placeholder="Lunes a Viernes de 9 a 18hs"/></div>
                    <div className="space-y-2"><Label htmlFor="contact-instagram">Instagram</Label><Input id="contact-instagram" value={contactSettings.instagram || ''} onChange={(e) => handleContactSettingsChange('instagram', e.target.value)} placeholder="https://instagram.com/usuario"/></div>
                    <div className="space-y-2"><Label htmlFor="contact-facebook">Facebook</Label><Input id="contact-facebook" value={contactSettings.facebook || ''} onChange={(e) => handleContactSettingsChange('facebook', e.target.value)} placeholder="https://facebook.com/usuario"/></div>
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleSaveContact} disabled={isLoading}><Save className="mr-2 h-4 w-4" /> Guardar Contacto</Button>
            </CardFooter>
        </Card>

        <Card>
          <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="w-6 h-6"/> Seguridad de la Cuenta</CardTitle>
              <CardDescription>Gestiona el correo y la contraseña de la cuenta de administrador.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between">
                     <div className="space-y-1">
                        <h3 className="font-semibold">Credenciales</h3>
                         <p className="text-sm text-muted-foreground">Email: {adminUser?.email || 'cargando...'}</p>
                     </div>
                     <DialogTrigger asChild>
                        <Button variant="outline"><KeyRound className="mr-2 h-4 w-4" /> Cambiar</Button>
                     </DialogTrigger>
                </div>
            </div>
          </CardContent>
      </Card>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Pin className="w-6 h-6"/> Puntos de Embarque</CardTitle>
                <CardDescription>Añade y gestiona las paradas o puntos de encuentro para los viajes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">{boardingPoints.map((point) => (<div key={point.id} className="flex items-center gap-2"><Input value={point.name} onChange={(e) => handleBoardingPointChange(point.id, e.target.value)} placeholder="Nombre de la parada..."/><Button variant="ghost" size="icon" onClick={() => handleRemoveBoardingPoint(point.id)}><Trash2 className="w-4 h-4 text-destructive"/></Button></div>))}</div>
                <div className="flex justify-between items-center"><Button variant="outline" onClick={handleAddBoardingPoint}><PlusCircle className="mr-2 h-4 w-4"/> Añadir Parada</Button><Button onClick={handleSaveBoardingPoints}><Save className="mr-2 h-4 w-4"/> Guardar Paradas</Button></div>
            </CardContent>
        </Card>
        
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Utensils className="w-6 h-6"/> Tipos de Pensión</CardTitle>
                <CardDescription>Gestiona los tipos de pensiones que se pueden asignar a una reserva.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">{pensions.map((pension) => (<div key={pension.id} className="flex items-center gap-2"><Input value={pension.name} onChange={(e) => handlePensionChange(pension.id, 'name', e.target.value)} placeholder="Nombre (Ej: Media Pensión)"/><Input value={pension.description} onChange={(e) => handlePensionChange(pension.id, 'description', e.target.value)} placeholder="Descripción (Ej: Desayuno y cena)"/><Button variant="ghost" size="icon" onClick={() => handleRemovePension(pension.id)}><Trash2 className="w-4 h-4 text-destructive"/></Button></div>))}</div>
                <div className="flex justify-between items-center"><Button variant="outline" onClick={handleAddPension}><PlusCircle className="mr-2 h-4 w-4"/> Añadir Tipo</Button><Button onClick={handleSavePensions}><Save className="mr-2 h-4 w-4"/> Guardar Pensiones</Button></div>
            </CardContent>
        </Card>

         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><BedDouble className="w-6 h-6"/> Tipos de Habitación</CardTitle>
                <CardDescription>Añade y gestiona los tipos de habitaciones disponibles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">{roomTypes.map((rt) => (<div key={rt.id} className="flex items-center gap-2"><Input value={rt.name} onChange={(e) => handleRoomTypeChange(rt.id, e.target.value)} placeholder="Nombre (Ej: Doble Matrimonial)"/><Button variant="ghost" size="icon" onClick={() => handleRemoveRoomType(rt.id)}><Trash2 className="w-4 h-4 text-destructive"/></Button></div>))}</div>
                <div className="flex justify-between items-center"><Button variant="outline" onClick={handleAddRoomType}><PlusCircle className="mr-2 h-4 w-4"/> Añadir Tipo</Button><Button onClick={handleSaveRoomTypes}><Save className="mr-2 h-4 w-4"/> Guardar Habitaciones</Button></div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><MapPin className="w-6 h-6"/> Zona Geográfica</CardTitle>
                <CardDescription>Define el centro y el radio de tu zona de servicio.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
             <MapSelector settings={geoSettings} onSettingsChange={setGeoSettings} />
             <Button onClick={handleSaveGeo} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Guardar Zona
             </Button>
            </CardContent>
        </Card>


        {(Object.keys(layoutCategoryDetails) as LayoutCategory[]).map(category => {
            const details = layoutCategoryDetails[category];
            const Icon = details.icon;
            return (
                <Card key={category}>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div><CardTitle className="flex items-center gap-2"><Icon className="w-6 h-6"/> {details.title}</CardTitle><CardDescription>Añade, edita o elimina los tipos y sus layouts.</CardDescription></div>
                            <Button onClick={() => handleAddNewLayout(category)}><PlusCircle className="mr-2 h-4 w-4" /> Añadir</Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {Object.entries(layoutConfig[category] || {}).map(([key, config]) => (
                           <div key={key} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                              <div className="font-medium">{config.name}</div>
                               <div className="flex items-center gap-2">
                                 <Button variant="outline" size="icon" onClick={() => handleEditLayout(category, key)}><Edit className="w-4 h-4" /><span className="sr-only">Editar</span></Button>
                                 <Button variant="destructive" size="icon" onClick={() => handleDeleteLayout(category, key)}><Trash2 className="w-4 h-4" /><span className="sr-only">Eliminar</span></Button>
                               </div>
                           </div>
                        ))}
                        {Object.keys(layoutConfig[category] || {}).length === 0 && (<p className="text-sm text-muted-foreground p-4 text-center">No hay tipos definidos.</p>)}
                    </CardContent>
                </Card>
            );
        })}
      <ChangeCredentialsDialog adminUser={adminUser} onUpdate={handleAdminUserUpdate}/>
    </div>
    </Dialog>
  )
}
