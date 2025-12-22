"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Edit, Image, Video, Eye, EyeOff, MessageCircle, Heart, ThumbsUp, Loader2, Upload, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/components/auth/auth-provider';
import { 
  getCommunityPosts, 
  createCommunityPost, 
  updateCommunityPost, 
  deleteCommunityPost 
} from '@/lib/community-services';
import { uploadFile, deleteFile } from '@/lib/storage-service';
import { getAllBenefits } from '@/lib/benefits-services';
import type { CommunityPost, Benefit } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export default function AdminCommunityPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    visibility: 'public' as 'public' | 'registered',
    benefitId: '',
    media: [] as { url: string; type: 'image' | 'video' }[]
  });
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [postsData, benefitsData] = await Promise.all([
        getCommunityPosts({ status: 'active', visibility: 'all' }),
        getAllBenefits({ status: 'active' })
      ]);
      setPosts(postsData);
      setBenefits(benefitsData);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newFiles = files.filter(file => 
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    setMediaFiles(prev => [...prev, ...newFiles]);

    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingMedia = (index: number) => {
    setFormData(prev => ({
      ...prev,
      media: prev.media.filter((_, i) => i !== index)
    }));
  };

  const openCreateDialog = () => {
    setEditingPost(null);
    setFormData({
      title: '',
      content: '',
      visibility: 'public',
      benefitId: '',
      media: []
    });
    setMediaFiles([]);
    setMediaPreviews([]);
    setIsDialogOpen(true);
  };

  const openEditDialog = (post: CommunityPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title || '',
      content: post.content,
      visibility: post.visibility,
      benefitId: post.benefitId || '',
      media: post.media || []
    });
    setMediaFiles([]);
    setMediaPreviews([]);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.content.trim()) {
      toast({
        title: "Error",
        description: "El contenido es requerido",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    try {
      let uploadedMedia = [...formData.media];

      for (const file of mediaFiles) {
        const url = await uploadFile(file, 'community');
        uploadedMedia.push({
          url,
          type: file.type.startsWith('video/') ? 'video' : 'image'
        });
      }

      if (editingPost) {
        await updateCommunityPost(editingPost.id, {
          title: formData.title || undefined,
          content: formData.content,
          visibility: formData.visibility,
          benefitId: formData.benefitId || undefined,
          media: uploadedMedia.length > 0 ? uploadedMedia : undefined
        });
        toast({ title: "Publicación actualizada" });
      } else {
        await createCommunityPost({
          title: formData.title || undefined,
          content: formData.content,
          visibility: formData.visibility,
          benefitId: formData.benefitId || undefined,
          media: uploadedMedia.length > 0 ? uploadedMedia : undefined,
          status: 'active',
          createdBy: {
            uid: user?.id || '',
            role: 'admin',
            name: (user as any)?.name || 'Admin'
          }
        });
        toast({ title: "Publicación creada" });
      }

      setIsDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving post:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la publicación",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      await deleteCommunityPost(postId);
      toast({ title: "Publicación eliminada" });
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la publicación",
        variant: "destructive"
      });
    }
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
          <h1 className="text-2xl font-bold">Comunidad</h1>
          <p className="text-muted-foreground">
            Gestiona las publicaciones de la comunidad
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Publicación
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Publicaciones</CardTitle>
          <CardDescription>
            {posts.length} publicaciones activas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay publicaciones aún</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contenido</TableHead>
                  <TableHead>Visibilidad</TableHead>
                  <TableHead>Reacciones</TableHead>
                  <TableHead>Comentarios</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="max-w-[300px]">
                      <div>
                        {post.title && (
                          <p className="font-medium">{post.title}</p>
                        )}
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {post.content}
                        </p>
                        {post.media && post.media.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {post.media.map((m, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {m.type === 'image' ? <Image className="h-3 w-3" /> : <Video className="h-3 w-3" />}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {post.benefitId && (
                          <Badge variant="secondary" className="mt-1">
                            Beneficio adjunto
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={post.visibility === 'public' ? 'default' : 'secondary'}>
                        {post.visibility === 'public' ? (
                          <><Eye className="h-3 w-3 mr-1" /> Público</>
                        ) : (
                          <><EyeOff className="h-3 w-3 mr-1" /> Registrados</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" /> {post.reactionSummary.likes}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" /> {post.reactionSummary.loves}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm">
                        <MessageCircle className="h-3 w-3" /> {post.commentCount}
                      </span>
                    </TableCell>
                    <TableCell>
                      {post.createdAt && format(post.createdAt, "dd/MM/yyyy", { locale: es })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(post)}
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
                              <AlertDialogTitle>¿Eliminar publicación?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(post.id)}>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPost ? 'Editar Publicación' : 'Nueva Publicación'}
            </DialogTitle>
            <DialogDescription>
              Crea contenido para la comunidad
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título (opcional)</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Título de la publicación"
              />
            </div>

            <div className="space-y-2">
              <Label>Contenido *</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Escribe tu mensaje..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Visibilidad</Label>
              <Select
                value={formData.visibility}
                onValueChange={(value: 'public' | 'registered') => 
                  setFormData(prev => ({ ...prev, visibility: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <span className="flex items-center gap-2">
                      <Eye className="h-4 w-4" /> Público (todos)
                    </span>
                  </SelectItem>
                  <SelectItem value="registered">
                    <span className="flex items-center gap-2">
                      <EyeOff className="h-4 w-4" /> Solo registrados
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Beneficio adjunto (opcional)</Label>
              <Select
                value={formData.benefitId}
                onValueChange={(value) => 
                  setFormData(prev => ({ ...prev, benefitId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar beneficio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Ninguno</SelectItem>
                  {benefits.map((benefit) => (
                    <SelectItem key={benefit.id} value={benefit.id}>
                      {benefit.title} - {benefit.discountType === 'percentage' 
                        ? `${benefit.discountValue}%` 
                        : `$${benefit.discountValue}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Multimedia</Label>
              <div className="flex flex-wrap gap-2">
                {formData.media.map((item, index) => (
                  <div key={`existing-${index}`} className="relative w-24 h-24 rounded-lg overflow-hidden border">
                    {item.type === 'image' ? (
                      <img src={item.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <video src={item.url} className="w-full h-full object-cover" />
                    )}
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => removeExistingMedia(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {mediaPreviews.map((preview, index) => (
                  <div key={`new-${index}`} className="relative w-24 h-24 rounded-lg overflow-hidden border">
                    {mediaFiles[index]?.type.startsWith('video/') ? (
                      <video src={preview} className="w-full h-full object-cover" />
                    ) : (
                      <img src={preview} alt="" className="w-full h-full object-cover" />
                    )}
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => removeMedia(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  className="w-24 h-24"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-6 w-6" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
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
                editingPost ? 'Actualizar' : 'Publicar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
