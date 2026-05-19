"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Eye, TrendingUp, Globe, Clock, Activity, BarChart2 } from "lucide-react";
import { subscribeToActiveUsers, subscribeToRecentPageViews, getPageViewStats, PresenceData, PageViewData } from "@/lib/analytics-service";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  employee: "bg-blue-100 text-blue-700",
  passenger: "bg-green-100 text-green-700",
  visitor: "bg-gray-100 text-gray-600",
};

const pathLabel = (path: string) => {
  const map: Record<string, string> = {
    "/": "Inicio",
    "/trips": "Viajes",
    "/flyers": "Flyers",
    "/contact": "Contacto",
    "/login": "Login",
    "/register": "Registro",
    "/admin/dashboard": "Admin · Panel",
    "/admin/dashboard/reservations": "Admin · Reservas",
    "/admin/dashboard/trips": "Admin · Viajes",
    "/admin/dashboard/passengers": "Admin · Pasajeros",
    "/admin/dashboard/settings": "Admin · Configuración",
    "/admin/dashboard/reports": "Admin · Reportes",
    "/admin/dashboard/analytics": "Admin · Analítica",
  };
  if (map[path]) return map[path];
  if (path.startsWith("/booking/")) return "Booking de Viaje";
  if (path.startsWith("/admin/")) return `Admin · ${path.split("/admin/dashboard/")[1] || "Panel"}`;
  return path;
};

export default function AnalyticsPage() {
  const [activeUsers, setActiveUsers] = useState<PresenceData[]>([]);
  const [recentViews, setRecentViews] = useState<PageViewData[]>([]);
  const [pageStats, setPageStats] = useState<Record<string, number>>({});
  const [loadingStats, setLoadingStats] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const unsubPresence = subscribeToActiveUsers((users) => {
      setActiveUsers(users);
      setLastUpdate(new Date());
    });
    const unsubViews = subscribeToRecentPageViews((views) => {
      setRecentViews(views);
    });

    getPageViewStats(7).then(stats => {
      setPageStats(stats);
      setLoadingStats(false);
    });

    return () => {
      unsubPresence();
      unsubViews();
    };
  }, []);

  const topPages = useMemo(() => {
    return Object.entries(pageStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [pageStats]);

  const totalViewsToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return recentViews.filter(v => {
      const ts = v.timestamp?.toDate?.();
      return ts && ts >= today;
    }).length;
  }, [recentViews]);

  const totalViews7d = useMemo(() => Object.values(pageStats).reduce((a, b) => a + b, 0), [pageStats]);

  const roleBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    activeUsers.forEach(u => {
      const r = u.role || 'visitor';
      counts[r] = (counts[r] || 0) + 1;
    });
    return counts;
  }, [activeUsers]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          Analítica en Tiempo Real
        </h2>
        <p className="text-muted-foreground text-sm">
          Usuarios activos ahora, vistas de páginas y actividad del sitio. Actualizado a las {format(lastUpdate, "HH:mm:ss")}.
        </p>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Usuarios Ahora</p>
                <p className="text-3xl font-bold text-primary">{activeUsers.length}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(roleBreakdown).map(([role, count]) => (
                <span key={role} className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[role] || ROLE_COLORS.visitor}`}>
                  {count} {role}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vistas Hoy</p>
                <p className="text-3xl font-bold">{totalViewsToday}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
                <Eye className="h-6 w-6 text-blue-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Páginas visitadas en el día</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vistas (7 días)</p>
                <p className="text-3xl font-bold">{totalViews7d}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Total de últimos 7 días</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Páginas Únicas</p>
                <p className="text-3xl font-bold">{Object.keys(pageStats).length}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-50 flex items-center justify-center">
                <Globe className="h-6 w-6 text-purple-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Páginas distintas visitadas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usuarios activos ahora */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
              En vivo — {activeUsers.length} {activeUsers.length === 1 ? "usuario activo" : "usuarios activos"}
            </CardTitle>
            <CardDescription>Sesiones activas en los últimos 5 minutos</CardDescription>
          </CardHeader>
          <CardContent>
            {activeUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No hay usuarios activos en este momento.</p>
            ) : (
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {activeUsers.map(u => (
                    <div key={u.sessionId} className="flex items-center justify-between p-2 rounded-md bg-secondary/40 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role || 'visitor'] || ROLE_COLORS.visitor}`}>
                          {u.role || 'visitante'}
                        </span>
                        <span className="truncate text-muted-foreground">{pathLabel(u.path)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 ml-2">
                        <Clock className="h-3 w-3" />
                        {u.lastSeen?.toDate ? format(u.lastSeen.toDate(), "HH:mm") : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Top páginas 7 días */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart2 className="h-4 w-4" />
              Top Páginas (últimos 7 días)
            </CardTitle>
            <CardDescription>Páginas más visitadas del sitio</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <p className="text-sm text-muted-foreground text-center py-4">Cargando estadísticas...</p>
            ) : topPages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin datos aún. Los datos se acumulan automáticamente.</p>
            ) : (
              <div className="space-y-2">
                {topPages.map(([path, count]) => {
                  const maxCount = topPages[0]?.[1] || 1;
                  const pct = Math.round((count / maxCount) * 100);
                  return (
                    <div key={path} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="truncate">{pathLabel(path)}</span>
                        <span className="font-semibold shrink-0 ml-2">{count}</span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actividad reciente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Actividad Reciente
          </CardTitle>
          <CardDescription>Últimas 50 vistas de páginas</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-72">
            <div className="space-y-1">
              {recentViews.map(v => (
                <div key={v.id} className="flex items-center justify-between py-1.5 border-b last:border-0 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded ${ROLE_COLORS[v.role || 'visitor'] || ROLE_COLORS.visitor}`}>
                      {v.role || 'vis.'}
                    </span>
                    <span className="truncate">{pathLabel(v.path)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    {v.timestamp?.toDate ? format(v.timestamp.toDate(), "dd/MM HH:mm", { locale: es }) : "—"}
                  </span>
                </div>
              ))}
              {recentViews.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Sin actividad registrada aún.</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
