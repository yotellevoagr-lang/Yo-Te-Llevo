"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Heart, MessageCircle, Send, Gift, ThumbsUp, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  subscribeToCommunityPosts, 
  toggleReaction, 
  addComment, 
  getComments,
  getUserReactionsForPosts
} from '@/lib/community-services';
import { claimBenefit, getBenefitById } from '@/lib/benefits-services';
import type { CommunityPost, CommunityComment, ReactionType, Benefit } from '@/lib/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function CommunityPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [userReactions, setUserReactions] = useState<Record<string, ReactionType | null>>({});
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [postComments, setPostComments] = useState<Record<string, CommunityComment[]>>({});
  const [newComments, setNewComments] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<string | null>(null);
  const [claimingBenefit, setClaimingBenefit] = useState<string | null>(null);
  const [postBenefits, setPostBenefits] = useState<Record<string, Benefit>>({});
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const visibility = user ? 'all' : 'public';
    
    const unsubscribe = subscribeToCommunityPosts((newPosts) => {
      const filteredPosts = user 
        ? newPosts 
        : newPosts.filter(p => p.visibility === 'public');
      setPosts(filteredPosts);
      setLoading(false);
      
      filteredPosts.forEach(async (post) => {
        if (post.benefitId) {
          const benefit = await getBenefitById(post.benefitId);
          if (benefit) {
            setPostBenefits(prev => ({ ...prev, [post.id]: benefit }));
          }
        }
      });
    }, { visibility, status: 'active' });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (user && posts.length > 0) {
      const postIds = posts.map(p => p.id);
      getUserReactionsForPosts(postIds, user.id).then(setUserReactions);
    }
  }, [user, posts]);

  const handleReaction = async (postId: string, type: ReactionType) => {
    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Necesitas iniciar sesión para reaccionar",
        variant: "destructive"
      });
      return;
    }

    const result = await toggleReaction(postId, user.id, (user as any).name || 'Usuario', type);
    
    setUserReactions(prev => ({
      ...prev,
      [postId]: result.type
    }));
    
    setPosts(prev => prev.map(post => {
      if (post.id !== postId) return post;
      
      const currentReaction = userReactions[postId];
      const newSummary = { ...post.reactionSummary };
      
      if (currentReaction) {
        newSummary[`${currentReaction}s` as 'likes' | 'loves']--;
      }
      
      if (result.type) {
        newSummary[`${result.type}s` as 'likes' | 'loves']++;
      }
      
      return { ...post, reactionSummary: newSummary };
    }));
  };

  const toggleComments = async (postId: string) => {
    const newExpanded = new Set(expandedComments);
    
    if (newExpanded.has(postId)) {
      newExpanded.delete(postId);
    } else {
      newExpanded.add(postId);
      
      if (!postComments[postId]) {
        const comments = await getComments(postId);
        setPostComments(prev => ({ ...prev, [postId]: comments }));
      }
    }
    
    setExpandedComments(newExpanded);
  };

  const handleAddComment = async (postId: string) => {
    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Necesitas iniciar sesión para comentar",
        variant: "destructive"
      });
      return;
    }

    const content = newComments[postId]?.trim();
    if (!content) return;

    setSubmittingComment(postId);
    
    try {
      await addComment(postId, {
        content,
        userId: user.id,
        userName: (user as any).name || 'Usuario'
      });
      
      const comments = await getComments(postId);
      setPostComments(prev => ({ ...prev, [postId]: comments }));
      setNewComments(prev => ({ ...prev, [postId]: '' }));
      
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, commentCount: post.commentCount + 1 }
          : post
      ));
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo agregar el comentario",
        variant: "destructive"
      });
    } finally {
      setSubmittingComment(null);
    }
  };

  const handleClaimBenefit = async (benefitId: string) => {
    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Necesitas iniciar sesión para reclamar beneficios",
        variant: "destructive"
      });
      return;
    }

    setClaimingBenefit(benefitId);
    
    try {
      const result = await claimBenefit(benefitId, user.id, (user as any).name || 'Usuario');
      
      if (result.success) {
        toast({
          title: "¡Beneficio reclamado!",
          description: "El beneficio se agregó a tu cuenta. Puedes verlo en 'Mis Beneficios'"
        });
      } else {
        toast({
          title: "No se pudo reclamar",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo reclamar el beneficio",
        variant: "destructive"
      });
    } finally {
      setClaimingBenefit(null);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="container py-12 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-2xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Comunidad</h1>
        <p className="text-muted-foreground">
          Novedades, promociones y beneficios exclusivos
        </p>
      </div>

      {posts.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Aún no hay publicaciones en la comunidad.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <Card key={post.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {post.createdBy.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold">{post.createdBy.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {post.createdAt && format(post.createdAt, "d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                  </div>
                  {post.benefitId && (
                    <Badge variant="secondary" className="gap-1">
                      <Gift className="h-3 w-3" />
                      Beneficio
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pb-3 space-y-3">
                {post.title && (
                  <h3 className="font-semibold text-lg">{post.title}</h3>
                )}
                <p className="whitespace-pre-wrap">{post.content}</p>
                
                {post.media && post.media.length > 0 && (
                  <div className={cn(
                    "grid gap-2",
                    post.media.length === 1 ? "grid-cols-1" : "grid-cols-2"
                  )}>
                    {post.media.map((item, idx) => (
                      <div key={idx} className="relative rounded-lg overflow-hidden">
                        {item.type === 'image' ? (
                          <img 
                            src={item.url} 
                            alt="" 
                            className="w-full h-auto object-cover"
                          />
                        ) : (
                          <video 
                            src={item.url} 
                            controls 
                            className="w-full h-auto"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {post.benefitId && postBenefits[post.id] && (
                  <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-primary">
                          {postBenefits[post.id].title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {postBenefits[post.id].discountType === 'percentage' 
                            ? `${postBenefits[post.id].discountValue}% de descuento`
                            : `$${postBenefits[post.id].discountValue} de descuento`
                          }
                        </p>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => handleClaimBenefit(post.benefitId!)}
                        disabled={claimingBenefit === post.benefitId}
                      >
                        {claimingBenefit === post.benefitId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Gift className="h-4 w-4 mr-1" />
                            Reclamar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>

              <Separator />

              <CardFooter className="pt-3 pb-3 flex-col gap-3">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "gap-1.5",
                        userReactions[post.id] === 'like' && "text-primary"
                      )}
                      onClick={() => handleReaction(post.id, 'like')}
                    >
                      <ThumbsUp className={cn(
                        "h-4 w-4",
                        userReactions[post.id] === 'like' && "fill-current"
                      )} />
                      {post.reactionSummary.likes > 0 && post.reactionSummary.likes}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "gap-1.5",
                        userReactions[post.id] === 'love' && "text-red-500"
                      )}
                      onClick={() => handleReaction(post.id, 'love')}
                    >
                      <Heart className={cn(
                        "h-4 w-4",
                        userReactions[post.id] === 'love' && "fill-current"
                      )} />
                      {post.reactionSummary.loves > 0 && post.reactionSummary.loves}
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => toggleComments(post.id)}
                  >
                    <MessageCircle className="h-4 w-4" />
                    {post.commentCount > 0 && post.commentCount}
                  </Button>
                </div>

                {expandedComments.has(post.id) && (
                  <div className="w-full space-y-3">
                    <Separator />
                    
                    {postComments[post.id]?.length > 0 && (
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {postComments[post.id].map((comment) => (
                          <div key={comment.id} className="flex gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {comment.userName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 bg-muted rounded-lg px-3 py-2">
                              <p className="text-sm font-medium">{comment.userName}</p>
                              <p className="text-sm">{comment.content}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {comment.createdAt && format(comment.createdAt, "d MMM, HH:mm", { locale: es })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {user ? (
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Escribe un comentario..."
                          value={newComments[post.id] || ''}
                          onChange={(e) => setNewComments(prev => ({ 
                            ...prev, 
                            [post.id]: e.target.value 
                          }))}
                          className="min-h-[60px] resize-none"
                        />
                        <Button
                          size="icon"
                          onClick={() => handleAddComment(post.id)}
                          disabled={submittingComment === post.id || !newComments[post.id]?.trim()}
                        >
                          {submittingComment === post.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-center text-muted-foreground">
                        <Link href="/login" className="text-primary hover:underline">
                          Inicia sesión
                        </Link> para comentar
                      </p>
                    )}
                  </div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
