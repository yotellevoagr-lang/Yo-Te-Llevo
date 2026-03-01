
"use client"

import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Settings as SettingsIcon, Bus, Trash2, Edit, PlusCircle, Ship, Plane, Save, Contact, Utensils, BedDouble, Folder, ShieldCheck, KeyRound, Mail, Eye, EyeOff, Image as ImageIcon, Globe, AppWindow, Loader2, Tag, Pin } from "lucide-react"
import type { CustomLayoutConfig, LayoutCategory, GeneralSettings, ContactSettings, Pension, RoomType, Employee, DomainSettings, BoardingPoint, Tour, GeoSettings } from "@/lib/types"
import { LayoutEditor } from "@/components/admin/layout-editor"
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useAuth } from "@/components/auth/auth-provider"
import { getAllFromCollection_client, getDocumentById, deleteDocument, saveDocument } from "@/lib/firestore-services"
import { getDisplayUrl } from "@/lib/utils"
import { GeoSettingsCard } from "@/components/admin/settings/geo-settings-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { arrayRemove, writeBatch, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { uploadFileToStorage, deleteFileFromStorage, isStorageUrl } from "@/lib/storage-service"

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
};

function ChangeCredentialsDialog({ adminUser, onUpdate, isOpen, onOpenChange }: { adminUser: Employee | null, onUpdate: (user: Employee) => void, isOpen: boolean, onOpenChange: (open: boolean) => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newEmail, setNewEmail] = useState(adminUser?.email || "");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { firebaseUser } = useAuth();
  
  useEffect(() => {
    if(isOpen) {
        setNewEmail(adminUser?.email || "");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
    }
  }, [isOpen, adminUser]);

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
        
        onOpenChange(false);

    } catch (error) {
        console.error(error);
        toast({ title: "Error de autenticación", description: "La contraseña actual es incorrecta o hubo otro problema.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
        <Button onClick={handleSaveChanges} disabled={isLoading}>
            {isLoading && <Loader2 className="animate-spin mr-2" />}
            Guardar Cambios
        </Button>
      </DialogFooter>
    </DialogContent>
    </Dialog>
  )
}


export default function SettingsPage() {
    const { toast } = useToast();
    const { user } = useAuth();

    const [isClient, setIsClient] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState<string | null>(null);
    
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null)
    const [pwaIconFile, setPwaIconFile] = useState<File | null>(null);
    const [pwaIconPreview, setPwaIconPreview] = useState<string | null>(null);
    const [pwaScreenshots, setPwaScreenshots] = useState<File[]>([]);
    const [existingPwaScreenshotUrls, setExistingPwaScreenshotUrls] = useState<string[]>([]);
    const [newPwaScreenshotPreviews, setNewPwaScreenshotPreviews] = useState<string[]>([]);


    const [layoutConfig, setLayoutConfig] = useState<Record<LayoutCategory, Record<string, CustomLayoutConfig>>>({ vehicles: {}, airplanes: {}, cruises: {} });
    const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({ mainWhatsappNumber: "", calendarDownloadFolder: "Calendarios YO-TE-LLEVO", reportDownloadFolder: "Reportes Gen. YO-TE-LLEVO", availableTags: [] });
    const [contactSettings, setContactSettings] = useState<ContactSettings>({});
    const [domainSettings, setDomainSettings] = useState<DomainSettings>({ domains: [] });
    const [geoSettings, setGeoSettings] = useState<GeoSettings>({ latitude: -34.6037, longitude: -58.3816, radiusKm: 100 });
    const [newDomain, setNewDomain] = useState("");
    const [aboutUsMediaFile, setAboutUsMediaFile] = useState<File | null>(null);
    const [aboutUsMediaPreview, setAboutUsMediaPreview] = useState<{url: string, type: 'image' | 'video'} | null>(null);
    const [boardingPoints, setBoardingPoints] = useState<BoardingPoint[]>([]);
    const [initialBoardingPoints, setInitialBoardingPoints] = useState<BoardingPoint[]>([]);
    const [pensions, setPensions] = useState<Pension[]>([]);
    const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [isCredentialsDialogOpen, setIsCredentialsDialogOpen] = useState(false);
    const [editingLayout, setEditingLayout] = useState<{ category: LayoutCategory, key: string | null } | null>(null);
    const [adminUser, setAdminUser] = useState<Employee | null>(null);
    const [travelTags, setTravelTags] = useState<string[]>([]);

    const getNextLetterId = (lastId: string): string => {
        if (!lastId) return 'A';
        const len = lastId.length;
        let i = len - 1;
        let newId = lastId.split('');
        while (i >= 0) {
            if (newId[i] === 'Z') {
            newId[i] = 'A';
            i--;
            } else {
            newId[i] = String.fromCharCode(newId[i].charCodeAt(0) + 1);
            return newId.join('');
            }
        }
        return 'A' + newId.join('');
    }

    const fetchData = async () => {
        setIsLoading(true);
        try {
            if (user?.id) {
                const adminData = await getDocumentById<Employee>('admin', user.id);
                setAdminUser(adminData);
            }

            const [
                generalSettingsData,
                boardingPointsData,
                pensionsData,
                roomTypesData,
                layoutConfigData,
                domainSettingsData,
                geoSettingsData
            ] = await Promise.all([
                getDocumentById<GeneralSettings>('settings', 'general'),
                getAllFromCollection_client<BoardingPoint>('boarding_points'),
                getAllFromCollection_client<Pension>('pensions'),
                getAllFromCollection_client<RoomType>('room_types'),
                getDocumentById<any>('settings', 'layouts'),
                getDocumentById<DomainSettings>('settings', 'domains'),
                getDocumentById<GeoSettings>('settings', 'geo')
            ]);

            if (generalSettingsData) {
                setGeneralSettings(generalSettingsData);
                if (generalSettingsData.contact) setContactSettings(generalSettingsData.contact);
                setLogoPreview(generalSettingsData.logoUrl || null);
                setAboutUsMediaPreview(generalSettingsData.aboutUsMedia || null);
                setTravelTags(generalSettingsData.availableTags || []);
            }
            
            setPwaIconPreview('/icons/icon-512x512.png?' + Date.now());
            
            try {
                const screenshotsResponse = await fetch('/api/pwa/screenshots');
                const screenshotsData = await screenshotsResponse.json();
                const screenshotUrls = screenshotsData.screenshots?.map((s: { src: string }) => s.src) || [];
                setExistingPwaScreenshotUrls(screenshotUrls);
            } catch (e) {
                console.warn('No se pudieron cargar las capturas existentes');
            }
            if (domainSettingsData) setDomainSettings(domainSettingsData);
            if (geoSettingsData) setGeoSettings(geoSettingsData);
            setBoardingPoints(boardingPointsData);
            setInitialBoardingPoints(boardingPointsData);
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
        setIsClient(true);
        fetchData();
    }, [user, toast]);

    const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setLogoPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handlePwaIconFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPwaIconFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setPwaIconPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handlePwaScreenshotsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const fileList = Array.from(files);
            setPwaScreenshots(fileList);
            setExistingPwaScreenshotUrls([]);
            setNewPwaScreenshotPreviews([]);
            
            fileList.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setNewPwaScreenshotPreviews(prev => [...prev, reader.result as string]);
                };
                reader.readAsDataURL(file);
            });
        }
    };
    
    const [removedStorageUrls, setRemovedStorageUrls] = useState<string[]>([]);
    
    const allPwaScreenshotPreviews = [...existingPwaScreenshotUrls, ...newPwaScreenshotPreviews];
    
    const removePwaScreenshot = (index: number) => {
        const existingCount = existingPwaScreenshotUrls.length;
        
        if (index < existingCount) {
            setExistingPwaScreenshotUrls(prev => prev.filter((_, i) => i !== index));
        } else {
            const newIndex = index - existingCount;
            setNewPwaScreenshotPreviews(prev => prev.filter((_, i) => i !== newIndex));
            setPwaScreenshots(prev => prev.filter((_, i) => i !== newIndex));
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
        setIsSaving('logo');
        let uploadedLogoUrl: string | null = null;
        try {
            const currentSettings = await getDocumentById<GeneralSettings>('settings', 'general');
            const previousLogoUrl = currentSettings?.logoUrl;
            
            uploadedLogoUrl = await uploadFileToStorage(logoFile, 'settings', 'logo');
            await saveDocument('settings', { logoUrl: uploadedLogoUrl }, 'general');
            
            if (previousLogoUrl && isStorageUrl(previousLogoUrl)) {
                const deleted = await deleteFileFromStorage(previousLogoUrl);
                if (!deleted) {
                    console.warn('No se pudo eliminar el logo anterior del Storage');
                }
            }
            setLogoPreview(uploadedLogoUrl);
            window.dispatchEvent(new Event('storage'));
            toast({ title: "Logo guardado", description: "El logo del sitio ha sido actualizado." });
            setLogoFile(null);
        } catch (error) {
            console.error("Error saving logo:", error);
            if (uploadedLogoUrl) {
                await deleteFileFromStorage(uploadedLogoUrl);
            }
            toast({ title: "Error", description: "No se pudo guardar el logo.", variant: "destructive" });
        } finally {
            setIsSaving(null);
        }
    };

    const handleSavePwaIcon = async () => {
        if (!pwaIconFile) {
            toast({ title: "Sin cambios", description: "No se ha seleccionado un nuevo archivo de ícono." });
            return;
        }
        setIsSaving('pwa-icon');
        try {
            const formData = new FormData();
            formData.append('icon', pwaIconFile);
            
            const response = await fetch('/api/pwa/icons', {
                method: 'POST',
                body: formData,
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Error al procesar el ícono');
            }
            
            setPwaIconPreview('/icons/icon-512x512.png?' + Date.now());
            toast({ title: "Íconos Generados", description: `Se generaron ${result.files?.length || 0} archivos de ícono en diferentes tamaños.` });
            setPwaIconFile(null);
        } catch (error) {
            console.error("Error saving PWA icon:", error);
            toast({ title: "Error", description: error instanceof Error ? error.message : "No se pudo guardar el ícono.", variant: "destructive" });
        } finally {
            setIsSaving(null);
        }
    };

    const handleSavePwaScreenshots = async () => {
        if (pwaScreenshots.length === 0 && allPwaScreenshotPreviews.length > 0) {
            toast({ title: "Sin cambios", description: "Selecciona nuevas capturas para reemplazar las existentes." });
            return;
        }

        setIsSaving('pwa-screenshots');
        try {
            const formData = new FormData();
            for (const screenshot of pwaScreenshots) {
                formData.append('screenshots', screenshot);
            }
            
            const response = await fetch('/api/pwa/screenshots', {
                method: 'POST',
                body: formData,
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Error al procesar las capturas');
            }
            
            const newUrls = result.screenshots?.map((s: { src: string }) => s.src) || [];
            setExistingPwaScreenshotUrls(newUrls);
            setNewPwaScreenshotPreviews([]);
            setPwaScreenshots([]);
            toast({ title: "Capturas guardadas", description: `Se guardaron ${result.screenshots?.length || 0} capturas de pantalla y se actualizó el manifest.` });
        } catch (error) {
            console.error("Error saving PWA screenshots:", error);
            toast({ title: "Error", description: error instanceof Error ? error.message : "No se pudieron guardar las capturas.", variant: "destructive" });
        } finally {
            setIsSaving(null);
        }
    };

    const handleSaveAboutUsMedia = async () => {
        if (!aboutUsMediaFile) {
             toast({ title: "Sin cambios", description: "No se ha seleccionado un nuevo archivo." });
            return;
        }
        setIsSaving('about-us');
        let uploadedMediaUrl: string | null = null;
        try {
            const currentSettings = await getDocumentById<GeneralSettings>('settings', 'general');
            const previousAboutUsUrl = currentSettings?.aboutUsMedia?.url;
            
            uploadedMediaUrl = await uploadFileToStorage(aboutUsMediaFile, 'settings', 'about-us');
            const mediaType = aboutUsMediaFile.type.startsWith('video') ? 'video' : 'image';
            const newAboutUsMedia = { url: uploadedMediaUrl, type: mediaType };

            await saveDocument('settings', { aboutUsMedia: newAboutUsMedia }, 'general');
            
            if (previousAboutUsUrl && isStorageUrl(previousAboutUsUrl)) {
                const deleted = await deleteFileFromStorage(previousAboutUsUrl);
                if (!deleted) {
                    console.warn('No se pudo eliminar el multimedia anterior del Storage');
                }
            }
            setAboutUsMediaPreview({ url: uploadedMediaUrl, type: mediaType as 'image' | 'video' });
            window.dispatchEvent(new Event('storage'));
            
            toast({ title: "Multimedia guardada", description: "La sección 'Sobre Nosotros' ha sido actualizada." });
            setAboutUsMediaFile(null);
        } catch (error) {
            console.error("Error saving about us media:", error);
            if (uploadedMediaUrl) {
                await deleteFileFromStorage(uploadedMediaUrl);
            }
            toast({ title: "Error", description: "No se pudo subir el archivo. Verifica tu conexión.", variant: "destructive" });
        } finally {
            setIsSaving(null);
        }
    };

    const handleSaveMainSettings = async () => {
        setIsSaving('main');
        try {
            const currentSettings = await getDocumentById<GeneralSettings>('settings', 'general') || {};
            const newSettings = { ...currentSettings, ...generalSettings };
            // Aseguramos que whatsappApiNumber se guarde si existe en el estado local
            if ((generalSettings as any).whatsappApiNumber !== undefined) {
                newSettings.whatsappApiNumber = (generalSettings as any).whatsappApiNumber;
            }
            await saveDocument('settings', newSettings, 'general');
            window.dispatchEvent(new Event('storage'));
            toast({ title: "Ajustes guardados", description: "Los ajustes generales han sido actualizados." });
        } catch (error) {
            toast({ title: "Error", description: "No se pudieron guardar los ajustes generales.", variant: "destructive" });
        } finally {
            setIsSaving(null);
        }
    };

    const handleSaveContact = async () => {
        setIsSaving('contact');
        try {
            const currentSettings = await getDocumentById<GeneralSettings>('settings', 'general') || {};
            const newSettings = { ...currentSettings, contact: contactSettings };
            // Aseguramos que whatsappApiNumber se guarde si existe en el estado local
            if ((generalSettings as any).whatsappApiNumber !== undefined) {
                newSettings.whatsappApiNumber = (generalSettings as any).whatsappApiNumber;
            }
            await saveDocument('settings', newSettings, 'general');
            window.dispatchEvent(new Event('storage'));
            toast({ title: "Contacto guardado", description: "Los datos de contacto han sido actualizados." });
        } catch (error) {
            toast({ title: "Error", description: "No se pudieron guardar los datos de contacto.", variant: "destructive" });
        } finally {
            setIsSaving(null);
        }
    };
    
    const handleSaveGeo = async () => {
        setIsSaving('geo');
        try {
            await saveDocument('settings', geoSettings, 'geo');
            window.dispatchEvent(new Event('storage'));
            toast({ title: "Zona guardada", description: "La zona de servicio ha sido actualizada." });
        } catch (error) {
            toast({ title: "Error", description: "No se pudo guardar la zona geográfica.", variant: "destructive" });
        } finally {
            setIsSaving(null);
        }
    }
    
    const handleAddDomain = async () => {
        if (!newDomain.trim()) return;
        setIsSaving('domains');
        try {
            const updatedDomains = [...(domainSettings.domains || []), newDomain.trim()];
            await saveDocument('settings', { domains: updatedDomains }, 'domains');
            setDomainSettings({ domains: updatedDomains });
            setNewDomain("");
            window.dispatchEvent(new Event('storage'));
            toast({ title: "Dominio agregado" });
        } catch (error) {
            toast({ title: "Error", description: "No se pudo agregar el dominio.", variant: "destructive" });
        } finally {
            setIsSaving(null);
        }
    }

    const handleRemoveDomain = async (domainToRemove: string) => {
        setIsSaving('domains');
        try {
            const updatedDomains = (domainSettings.domains || []).filter(d => d !== domainToRemove);
            await saveDocument('settings', { domains: updatedDomains }, 'domains');
            setDomainSettings({ domains: updatedDomains });
            window.dispatchEvent(new Event('storage'));
            toast({ title: "Dominio eliminado", variant: "destructive" });
        } catch (error) {
            toast({ title: "Error", description: "No se pudo eliminar el dominio.", variant: "destructive" });
        } finally {
            setIsSaving(null);
        }
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
      window.dispatchEvent(new Event('storage'));
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
        window.dispatchEvent(new Event('storage'));

        setIsEditorOpen(false);
        setEditingLayout(null);
        toast({ title: "¡Guardado!", description: `El layout "${newConfigData.name}" se ha guardado.` });
    };

    const handleAddBoardingPoint = () => {
        setBoardingPoints(prev => {
            const sorted = [...prev].sort((a, b) => a.id.length - b.id.length || a.id.localeCompare(b.id));
            const lastId = sorted.length > 0 ? sorted[sorted.length - 1].id : '';
            const newId = getNextLetterId(lastId);
            return [...prev, { id: newId, name: '' }];
        });
    };
    
    const handleBoardingPointChange = (idToUpdate: string, field: 'id' | 'name', value: string) => {
        setBoardingPoints(prev => {
            const isDuplicate = field === 'id' && prev.some(p => p.id === value.toUpperCase() && p.id !== idToUpdate);
            if (isDuplicate) {
                toast({ title: "ID Duplicado", description: "Este ID ya está en uso. Por favor, elige otro.", variant: "destructive" });
                return prev;
            }
            return prev.map(p =>
                p.id === idToUpdate
                    ? { ...p, [field]: field === 'id' ? value.toUpperCase() : value }
                    : p
            );
        });
    };

    const handleRemoveBoardingPoint = (id: string) => {
        setBoardingPoints(prev => prev.filter(p => p.id !== id));
    };
    
    const handleSaveBoardingPoints = async () => {
        setIsSaving('boarding');
        try {
            const batch = writeBatch(db);
            const currentPointsMap = new Map(boardingPoints.map(p => [p.id, p]));
            
            for (const initialPoint of initialBoardingPoints) {
                if (!currentPointsMap.has(initialPoint.id)) {
                    const docRef = doc(db, 'boarding_points', initialPoint.id);
                    batch.delete(docRef);
                }
            }

            for (const point of boardingPoints) {
                if (point.name.trim()) {
                    const docRef = doc(db, 'boarding_points', point.id);
                    batch.set(docRef, { name: point.name });
                } else {
                    const docRef = doc(db, 'boarding_points', point.id);
                    batch.delete(docRef);
                }
            }

            await batch.commit();
            await fetchData();
            toast({ title: "Puntos de embarque guardados." });
        } catch (error) {
             toast({ title: "Error", description: "No se pudieron guardar los puntos de embarque.", variant: "destructive" });
        } finally {
            setIsSaving(null);
        }
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
        setIsSaving('pensions');
        try {
            for(const pension of pensions) {
                if (pension.name.trim()) {
                    await saveDocument('pensions', pension, pension.id);
                } else {
                    await deleteDocument('pensions', pension.id);
                }
            }
            await fetchData();
            window.dispatchEvent(new Event('storage'));
            toast({ title: "Tipos de pensión guardados." });
        } catch (error) {
            toast({ title: "Error", description: "No se pudieron guardar los tipos de pensión.", variant: "destructive" });
        } finally {
            setIsSaving(null);
        }
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
        setIsSaving('rooms');
        try {
            for(const rt of roomTypes) {
                if (rt.name.trim()) {
                    await saveDocument('room_types', rt, rt.id);
                } else {
                    await deleteDocument('room_types', rt.id);
                }
            }
            await fetchData();
            window.dispatchEvent(new Event('storage'));
            toast({ title: "Tipos de habitación guardados." });
        } catch (error) {
            toast({ title: "Error", description: "No se pudieron guardar los tipos de habitación.", variant: "destructive" });
        } finally {
            setIsSaving(null);
        }
    }

    const sortedBoardingPoints = useMemo(() => {
        return [...boardingPoints].sort((a, b) => {
            if (a.id.length !== b.id.length) {
                return a.id.length - b.id.length;
            }
            return a.id.localeCompare(b.id);
        });
    }, [boardingPoints]);

    const layoutCategoryDetails = {
        vehicles: { icon: Bus, title: "Tipos de Vehículo" },
        airplanes: { icon: Plane, title: "Tipos de Avión" },
        cruises: { icon: Ship, title: "Tipos de Crucero" },
    }
    
    const handleAdminUserUpdate = (updatedUser: Employee) => setAdminUser(updatedUser);

    const handleTagChange = (index: number, value: string) => {
        const newTags = [...travelTags];
        newTags[index] = value;
        setTravelTags(newTags);
    }
    const handleAddTag = () => setTravelTags([...travelTags, ""]);
    
    const handleRemoveTag = async (index: number) => {
        const tagToRemove = travelTags[index];
        const newTags = travelTags.filter((_, i) => i !== index);
        setTravelTags(newTags);

        toast({
            title: `Etiqueta '${tagToRemove}' marcada para eliminar`,
            description: "Guarda los cambios para que la eliminación sea permanente y se actualice en todos los viajes.",
            variant: "default",
        });
    }

    const handleSaveTags = async () => {
        setIsSaving('tags');
        try {
            const originalTags = generalSettings.availableTags || [];
            const newUniqueTags = [...new Set(travelTags.map(t => t.trim()).filter(Boolean))];
            
            const deletedTags = originalTags.filter(t => !newUniqueTags.includes(t));

            if (deletedTags.length > 0) {
                const allTours = await getAllFromCollection_client<Tour>('tours');
                const batch = writeBatch(db);

                allTours.forEach(tour => {
                    const tourHasDeletedTag = tour.tags?.some(tag => deletedTags.includes(tag));
                    if (tourHasDeletedTag) {
                        const tourRef = doc(db, 'tours', tour.id);
                        batch.update(tourRef, {
                            tags: arrayRemove(...deletedTags)
                        });
                    }
                });
                await batch.commit();
                toast({ title: "Viajes actualizados", description: `Se eliminó la etiqueta de ${deletedTags.length} viaje(s).`});
            }

            const currentSettings = generalSettings || {};
            await saveDocument('settings', { ...currentSettings, availableTags: newUniqueTags }, 'general');
            
            setGeneralSettings(prev => ({...prev!, availableTags: newUniqueTags}));
            setTravelTags(newUniqueTags);
            
            window.dispatchEvent(new Event('storage'));
            toast({ title: "Etiquetas guardadas", description: "La lista de etiquetas ha sido actualizada." });
        } catch (error) {
            console.error("Error saving tags:", error);
            toast({ title: "Error", description: "No se pudieron guardar las etiquetas.", variant: "destructive" });
        } finally {
            setIsSaving(null);
        }
    }


    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>
    }

  return (
    <>
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
                <CardDescription>Administra las configuraciones generales, de contacto, geográficas y de diseño del sitio web.</CardDescription>
            </CardHeader>
        </Card>

        <Accordion type="multiple" className="w-full space-y-6">
            <AccordionItem value="branding" className="border-b-0">
                <Card>
                    <AccordionTrigger className="w-full px-6 text-left hover:no-underline text-xl">Branding y Apariencia</AccordionTrigger>
                    <AccordionContent className="p-6 pt-2 space-y-6">
                        <div className="space-y-4">
                           <h3 className="font-semibold text-lg flex items-center gap-2"><ImageIcon className="w-5 h-5"/> Logo del Sitio Web</h3>
                            <Input id="logoFile" type="file" accept="image/png, image/jpeg, image/gif, image/svg+xml" onChange={handleLogoFileChange} className="file:text-primary-foreground file:font-bold file:mr-4 file:px-4 file:py-2 file:rounded-full file:border-0 file:bg-primary hover:file:bg-primary/90"/>
                            {logoPreview && <div className="space-y-2"><Label>Vista previa del logo</Label><div className="flex items-center gap-4 p-4 border rounded-md bg-muted"><Image src={getDisplayUrl(logoPreview)} alt="Vista previa del Logo" width={64} height={64} className="rounded-full"/></div></div>}
                             <Button onClick={handleSaveLogo} disabled={isSaving === 'logo' || !logoFile}>{isSaving === 'logo' && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Guardar Logo</Button>
                        </div>
                        <Separator/>
                        <div className="space-y-4">
                             <h3 className="font-semibold text-lg flex items-center gap-2"><AppWindow className="w-5 h-5"/> Ícono y Capturas de la App (PWA)</h3>
                            <p className="text-sm text-muted-foreground">Sube el ícono (512x512px) y capturas de pantalla (verticales) para la app instalable.</p>
                             <div className="space-y-2">
                                <Label htmlFor="pwaIconFile">Ícono de la App</Label>
                                <Input id="pwaIconFile" type="file" accept="image/png" onChange={handlePwaIconFileChange} className="file:text-primary-foreground file:font-bold file:mr-4 file:px-4 file:py-2 file:rounded-full file:border-0 file:bg-primary hover:file:bg-primary/90"/>
                                {pwaIconPreview && <div className="space-y-2"><Label>Vista previa del ícono</Label><div className="flex items-center gap-4 p-4 border rounded-md bg-muted"><Image src={getDisplayUrl(pwaIconPreview)} alt="Vista previa del ícono PWA" width={64} height={64} className="rounded-lg"/></div></div>}
                                <Button onClick={handleSavePwaIcon} disabled={isSaving === 'pwa-icon' || !pwaIconFile} className="mt-2">{isSaving === 'pwa-icon' && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Guardar Ícono</Button>
                            </div>
                            <div className="space-y-2 pt-4">
                                <Label htmlFor="pwaScreenshots">Capturas de Pantalla de la App</Label>
                                <Input id="pwaScreenshots" type="file" accept="image/png, image/jpeg" multiple onChange={handlePwaScreenshotsChange} className="file:text-primary-foreground file:font-bold file:mr-4 file:px-4 file:py-2 file:rounded-full file:border-0 file:bg-primary hover:file:bg-primary/90"/>
                                {allPwaScreenshotPreviews.length > 0 && <div className="space-y-2"><Label>Vistas previas</Label><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4 border rounded-md bg-muted">{allPwaScreenshotPreviews.map((preview, index) => (<div key={index} className="relative group aspect-[9/16]"><Image src={getDisplayUrl(preview)} alt={`Captura ${index + 1}`} fill style={{objectFit: "cover"}} className="rounded-md"/><Button variant="destructive" size="icon" className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removePwaScreenshot(index)}><Trash2 className="w-4 h-4"/></Button></div>))}</div></div>}
                                <Button onClick={handleSavePwaScreenshots} disabled={isSaving === 'pwa-screenshots'} className="mt-2">{isSaving === 'pwa-screenshots' && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Guardar Capturas</Button>
                            </div>
                        </div>
                        <Separator/>
                         <div className="space-y-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2"><ImageIcon className="w-5 h-5"/> Imagen/Video 'Sobre Nosotros'</h3>
                            <p className="text-sm text-muted-foreground">Este contenido aparecerá en la sección "Sobre Nosotros" de la página de inicio.</p>
                            <Input id="aboutUsMedia" type="file" accept="image/*,video/*" onChange={handleAboutUsMediaChange} className="file:text-primary-foreground file:font-bold file:mr-4 file:px-4 file:py-2 file:rounded-full file:border-0 file:bg-primary hover:file:bg-primary/90"/>
                            {aboutUsMediaPreview && <div className="space-y-2"><Label>Vista previa</Label><div className="flex items-center justify-center p-4 border rounded-md bg-muted">{aboutUsMediaPreview.type === 'video' ? <video src={getDisplayUrl(aboutUsMediaPreview.url)} controls className="max-h-60 rounded-md" /> : <Image src={getDisplayUrl(aboutUsMediaPreview.url)} alt="Vista previa" width={300} height={200} className="rounded-md object-contain max-h-60"/>}</div></div>}
                            <Button onClick={handleSaveAboutUsMedia} disabled={isSaving === 'about-us' || !aboutUsMediaFile}>{isSaving === 'about-us' && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Guardar Multimedia</Button>
                        </div>
                    </AccordionContent>
                </Card>
            </AccordionItem>
            
             <AccordionItem value="main-settings" className="border-b-0">
                <Card>
                    <AccordionTrigger className="w-full px-6 text-left hover:no-underline text-xl">Ajustes Generales</AccordionTrigger>
                    <AccordionContent className="p-6 pt-2">
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="main-whatsapp">Número de WhatsApp Principal (Ventas)</Label>
                                    <Input id="main-whatsapp" type="tel" placeholder="Ej: 5491122334455" value={generalSettings.mainWhatsappNumber || ''} onChange={(e) => handleGeneralSettingsChange('mainWhatsappNumber', e.target.value)} />
                                    <p className="text-xs text-muted-foreground">Este número se usará si un vendedor no tiene uno asignado.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="whatsapp-api-number">Número WhatsApp API (Asistente IA)</Label>
                                    <Input 
                                        id="whatsapp-api-number" 
                                        placeholder="Ej: 5491122334455" 
                                        value={generalSettings.whatsappApiNumber || ""} 
                                        onChange={e => handleGeneralSettingsChange('whatsappApiNumber', e.target.value)} 
                                    />
                                    <p className="text-[10px] text-muted-foreground">Número vinculado a la API de WhatsApp para respuestas automáticas.</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="calendar-folder" className="flex items-center gap-2"><Folder/> Nombre Carpeta Calendarios</Label><Input id="calendar-folder" value={generalSettings.calendarDownloadFolder || ''} onChange={(e) => handleGeneralSettingsChange('calendarDownloadFolder', e.target.value)} /></div><div className="space-y-2"><Label htmlFor="report-folder" className="flex items-center gap-2"><Folder/> Nombre Carpeta Reportes</Label><Input id="report-folder" value={generalSettings.reportDownloadFolder || ''} onChange={(e) => handleGeneralSettingsChange('reportDownloadFolder', e.target.value)} /></div></div>
                            <Button onClick={handleSaveMainSettings} disabled={!!isSaving}>{isSaving === 'main' && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Guardar Ajustes</Button>
                        </div>
                    </AccordionContent>
                </Card>
            </AccordionItem>
            
            <AccordionItem value="contact" className="border-b-0">
                <Card>
                    <AccordionTrigger className="w-full px-6 text-left hover:no-underline text-xl">Datos de Contacto</AccordionTrigger>
                    <AccordionContent className="p-6 pt-2">
                        <p className="text-sm text-muted-foreground mb-4">Esta información se mostrará en la página de contacto pública.</p>
                        <div className="space-y-4">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2"><Label htmlFor="contact-address">Dirección (Texto)</Label><Input id="contact-address" value={contactSettings.address || ''} onChange={(e) => handleContactSettingsChange('address', e.target.value)} placeholder="Calle Falsa 123, Ciudad"/></div>
                                <div className="space-y-2"><Label htmlFor="contact-addressLink">Enlace de Google Maps</Label><Input id="contact-addressLink" value={contactSettings.addressLink || ''} onChange={(e) => handleContactSettingsChange('addressLink', e.target.value)} placeholder="URL de Google Maps"/></div>
                                <div className="space-y-2"><Label htmlFor="contact-phone">Teléfono de Contacto</Label><Input id="contact-phone" value={contactSettings.phone || ''} onChange={(e) => handleContactSettingsChange('phone', e.target.value)} placeholder="011-4567-8901"/></div>
                                <div className="space-y-2"><Label htmlFor="contact-email">Email</Label><Input id="contact-email" type="email" value={contactSettings.email || ''} onChange={(e) => handleContactSettingsChange('email', e.target.value)} placeholder="contacto@empresa.com"/></div>
                                <div className="space-y-2"><Label htmlFor="contact-hours">Horario de Atención</Label><Input id="contact-hours" value={contactSettings.hours || ''} onChange={(e) => handleContactSettingsChange('hours', e.target.value)} placeholder="Lunes a Viernes de 9 a 18hs"/></div>
                                <div className="space-y-2"><Label htmlFor="contact-instagram">Instagram</Label><Input id="contact-instagram" value={contactSettings.instagram || ''} onChange={(e) => handleContactSettingsChange('instagram', e.target.value)} placeholder="https://instagram.com/usuario"/></div>
                                <div className="space-y-2"><Label htmlFor="contact-facebook">Facebook</Label><Input id="contact-facebook" value={contactSettings.facebook || ''} onChange={(e) => handleContactSettingsChange('facebook', e.target.value)} placeholder="https://facebook.com/usuario"/></div>
                            </div>
                            <Button onClick={handleSaveContact} disabled={!!isSaving}>{isSaving === 'contact' && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Guardar Contacto</Button>
                        </div>
                    </AccordionContent>
                </Card>
            </AccordionItem>
            
            <AccordionItem value="security" className="border-b-0">
                 <Card>
                    <AccordionTrigger className="w-full px-6 text-left hover:no-underline text-xl">Seguridad de la Cuenta</AccordionTrigger>
                    <AccordionContent className="p-6 pt-2">
                        <p className="text-sm text-muted-foreground mb-4">Gestiona el correo y la contraseña de la cuenta de administrador.</p>
                        <div className="p-4 border rounded-lg bg-muted/30"><div className="flex items-center justify-between"><div className="space-y-1"><h3 className="font-semibold">Credenciales</h3><p className="text-sm text-muted-foreground">Email: {adminUser?.email || 'cargando...'}</p></div><Button variant="outline" onClick={() => setIsCredentialsDialogOpen(true)}><KeyRound className="mr-2 h-4 w-4" /> Cambiar</Button></div></div>
                    </AccordionContent>
                 </Card>
            </AccordionItem>
            
            <AccordionItem value="geo" className="border-b-0">
                 <Card>
                    <AccordionTrigger className="w-full px-6 text-left hover:no-underline text-xl">Zona Geográfica</AccordionTrigger>
                    <AccordionContent className="p-6 pt-2 space-y-4">
                         <p className="text-sm text-muted-foreground">Define el centro y el radio de tu zona de servicio para la compra directa.</p>
                         {isClient ? (
                            <GeoSettingsCard settings={geoSettings} onSettingsChange={setGeoSettings}/>
                         ) : (
                            <div className="h-96 flex items-center justify-center bg-muted rounded-lg"><Loader2 className="w-8 h-8 animate-spin"/></div>
                         )}
                         <Button onClick={handleSaveGeo} disabled={isSaving === 'geo'}>
                             {isSaving === 'geo' && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                             Guardar Zona
                         </Button>
                    </AccordionContent>
                 </Card>
            </AccordionItem>

            <AccordionItem value="tags" className="border-b-0">
                <Card>
                    <AccordionTrigger className="w-full px-6 text-left hover:no-underline text-xl">Etiquetas de Viajes</AccordionTrigger>
                    <AccordionContent className="p-6 pt-2">
                        <CardDescription className="mb-4">Gestiona las etiquetas disponibles para categorizar los viajes.</CardDescription>
                        <div className="space-y-2">
                            {travelTags.map((tag, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <Input value={tag} onChange={(e) => handleTagChange(index, e.target.value)} placeholder="Nombre de la etiqueta..."/>
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveTag(index)}><Trash2 className="w-4 h-4 text-destructive"/></Button>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between items-center pt-4">
                            <Button variant="outline" onClick={handleAddTag}><PlusCircle className="mr-2 h-4 w-4"/> Añadir Etiqueta</Button>
                            <Button onClick={handleSaveTags} disabled={isSaving === 'tags'}>{isSaving === 'tags' && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Guardar Etiquetas</Button>
                        </div>
                    </AccordionContent>
                </Card>
            </AccordionItem>

            <AccordionItem value="domains" className="border-b-0">
                <Card>
                    <AccordionTrigger className="w-full px-6 text-left hover:no-underline text-xl">Dominios Personalizados</AccordionTrigger>
                    <AccordionContent className="p-6 pt-2">
                        <CardDescription className="mb-4">Añade los dominios que has configurado en Firebase para el sitio de clientes.</CardDescription>
                         <div className="flex gap-2">
                            <Input placeholder="ejemplo.com" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}/>
                            <Button onClick={handleAddDomain} disabled={isSaving === 'domains'}>{isSaving === 'domains' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4"/>}Agregar</Button>
                        </div>
                        <div className="mt-4 space-y-2">
                            {(domainSettings.domains || []).map(domain => (
                                <div key={domain} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                                    <p className="font-mono">{domain}</p>
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveDomain(domain)} disabled={isSaving === 'domains'}><Trash2 className="w-4 h-4 text-destructive"/></Button>
                                </div>
                            ))}
                             {(domainSettings.domains || []).length === 0 && <p className="text-sm text-muted-foreground text-center p-4">No hay dominios personalizados.</p>}
                        </div>
                    </AccordionContent>
                </Card>
            </AccordionItem>
            
            <AccordionItem value="boarding-points" className="border-b-0">
                <Card>
                    <AccordionTrigger className="w-full px-6 text-left hover:no-underline text-xl">Puntos de Embarque</AccordionTrigger>
                    <AccordionContent className="p-6 pt-2">
                        <CardDescription className="mb-4">Añade y gestiona las paradas o puntos de encuentro para los viajes.</CardDescription>
                        <div className="space-y-2">
                            {sortedBoardingPoints.map((point) => (
                                <div key={point.id} className="flex items-center gap-2">
                                     <Input
                                        value={point.id}
                                        onChange={(e) => handleBoardingPointChange(point.id, 'id', e.target.value)}
                                        className="w-20 font-mono uppercase"
                                        placeholder="ID"
                                    />
                                    <Input 
                                        value={point.name} 
                                        onChange={(e) => handleBoardingPointChange(point.id, 'name', e.target.value)} 
                                        placeholder="Nombre de la parada..."
                                    />
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveBoardingPoint(point.id)}><Trash2 className="w-4 h-4 text-destructive"/></Button>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between items-center pt-4">
                            <Button variant="outline" onClick={handleAddBoardingPoint}><PlusCircle className="mr-2 h-4 w-4"/> Añadir Parada</Button>
                            <Button onClick={handleSaveBoardingPoints} disabled={isSaving === 'boarding'}>
                                {isSaving === 'boarding' && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Guardar Paradas
                            </Button>
                        </div>
                    </AccordionContent>
                </Card>
            </AccordionItem>
            <AccordionItem value="pensions" className="border-b-0">
                <Card>
                    <AccordionTrigger className="w-full px-6 text-left hover:no-underline text-xl">Tipos de Pensión</AccordionTrigger>
                    <AccordionContent className="p-6 pt-2">
                        <CardDescription className="mb-4">Gestiona los tipos de pensiones que se pueden asignar a una reserva.</CardDescription>
                        <div className="space-y-2">{pensions.map((pension) => (<div key={pension.id} className="flex items-center gap-2"><Input value={pension.name} onChange={(e) => handlePensionChange(pension.id, 'name', e.target.value)} placeholder="Nombre (Ej: Media Pensión)"/><Input value={pension.description} onChange={(e) => handlePensionChange(pension.id, 'description', e.target.value)} placeholder="Descripción (Ej: Desayuno y cena)"/><Button variant="ghost" size="icon" onClick={() => handleRemovePension(pension.id)}><Trash2 className="w-4 h-4 text-destructive"/></Button></div>))}</div>
                        <div className="flex justify-between items-center pt-4"><Button variant="outline" onClick={handleAddPension}><PlusCircle className="mr-2 h-4 w-4"/> Añadir Tipo</Button><Button onClick={handleSavePensions} disabled={!!isSaving}>{isSaving === 'pensions' && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Guardar Pensiones</Button></div>
                    </AccordionContent>
                </Card>
            </AccordionItem>
            <AccordionItem value="room-types" className="border-b-0">
                <Card>
                    <AccordionTrigger className="w-full px-6 text-left hover:no-underline text-xl">Tipos de Habitación</AccordionTrigger>
                    <AccordionContent className="p-6 pt-2">
                        <CardDescription className="mb-4">Añade y gestiona los tipos de habitaciones disponibles.</CardDescription>
                        <div className="space-y-2">{roomTypes.map((rt) => (<div key={rt.id} className="flex items-center gap-2"><Input value={rt.name} onChange={(e) => handleRoomTypeChange(rt.id, e.target.value)} placeholder="Nombre (Ej: Doble Matrimonial)"/><Button variant="ghost" size="icon" onClick={() => handleRemoveRoomType(rt.id)}><Trash2 className="w-4 h-4 text-destructive"/></Button></div>))}</div>
                        <div className="flex justify-between items-center pt-4"><Button variant="outline" onClick={handleAddRoomType}><PlusCircle className="mr-2 h-4 w-4"/> Añadir Tipo</Button><Button onClick={handleSaveRoomTypes} disabled={!!isSaving}>{isSaving === 'rooms' && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Guardar Habitaciones</Button></div>
                    </AccordionContent>
                </Card>
            </AccordionItem>

            {(Object.keys(layoutCategoryDetails) as LayoutCategory[]).map(category => {
                const details = layoutCategoryDetails[category];
                const Icon = details.icon;
                return (
                     <AccordionItem key={category} value={`layout-${category}`} className="border-b-0">
                         <Card>
                             <AccordionTrigger className="w-full px-6 text-left hover:no-underline text-xl"><Icon className="w-6 h-6 mr-2"/> {details.title}</AccordionTrigger>
                             <AccordionContent className="p-6 pt-2">
                                <CardDescription className="mb-4">Añade, edita o elimina los tipos y sus layouts.</CardDescription>
                                <div className="space-y-2">
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
                                </div>
                                <div className="pt-4"><Button variant="outline" onClick={() => handleAddNewLayout(category)}><PlusCircle className="mr-2 h-4 w-4" /> Añadir</Button></div>
                            </AccordionContent>
                        </Card>
                    </AccordionItem>
                );
            })}
        </Accordion>
      <ChangeCredentialsDialog adminUser={adminUser} onUpdate={handleAdminUserUpdate} isOpen={isCredentialsDialogOpen} onOpenChange={setIsCredentialsDialogOpen}/>
    </div>
    </>
  )
}
