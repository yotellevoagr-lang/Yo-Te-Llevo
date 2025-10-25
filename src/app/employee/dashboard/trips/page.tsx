
"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { Tour, Reservation, LayoutCategory } from "@/lib/types"
import { getAllFromCollection_client, getDocumentById } from "@/lib/firestore-services"

export default function TripsPage() {
  const [tours, setTours] = useState<Tour[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])

  const fetchData = async () => {
    const [toursData, reservationsData] = await Promise.all([
      getAllFromCollection_client<Tour>('tours'),
      getAllFromCollection_client<Reservation>('reservations')
    ]);
    
    const processedTours = toursData.map(t => {
      const date = (t.date as any)?.toDate ? (t.date as any).toDate() : new Date(t.date);
      return { ...t, date };
    });

    setTours(processedTours);
    setReservations(reservationsData);
  }

  useEffect(() => {
    fetchData();
  }, [])

  const activeTours = useMemo(() => tours.filter(tour => tour.date && new Date(tour.date) >= new Date()), [tours]);
  
  const getOccupiedCount = (tourId: string) => {
    return reservations
        .filter(r => r.tripId === tourId)
        .reduce((acc, r) => acc + ((r.assignedSeats?.length || 0) + (r.assignedCabins?.length || 0)) , 0);
  }

  const getTourCapacity = async (tour: Tour) => {
    if (!tour.transportUnits) return 0;
    let totalCapacity = 0;
    for (const unit of tour.transportUnits) {
        const config = await getDocumentById<any>('settings', 'layouts');
        if (config) {
            totalCapacity += config[unit.category]?.[unit.type]?.capacity || 0;
        }
    }
    return totalCapacity;
  };
  
  const [capacities, setCapacities] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchCapacities = async () => {
      const newCapacities: Record<string, number> = {};
      for (const tour of activeTours) {
        newCapacities[tour.id] = await getTourCapacity(tour);
      }
      setCapacities(newCapacities);
    };
    if (activeTours.length > 0) {
      fetchCapacities();
    }
  }, [activeTours]);

  const getTransportUnitsByType = (tour: Tour): Partial<Record<LayoutCategory, number>> => {
    if (!tour.transportUnits) return {};
    return tour.transportUnits.reduce((acc, unit) => {
      acc[unit.category] = (acc[unit.category] || 0) + 1;
      return acc;
    }, {} as Partial<Record<LayoutCategory, number>>);
  };

  const activeTransportTypes = useMemo(() => {
    const types = new Set<LayoutCategory>();
    activeTours.forEach(tour => {
      if (tour.transportUnits) {
        tour.transportUnits.forEach(unit => types.add(unit.category));
      }
    });
    return Array.from(types);
  }, [activeTours]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Viajes Disponibles</h2>
          <p className="text-muted-foreground">
            Aquí podrás ver todos los viajes activos para realizar ventas.
          </p>
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Destino</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Asientos Totales</TableHead>
                <TableHead>Asientos Ocupados</TableHead>
                <TableHead>Asientos Disponibles</TableHead>
                {activeTransportTypes.includes('vehicles') && <TableHead>Vehículos</TableHead>}
                {activeTransportTypes.includes('airplanes') && <TableHead>Aviones</TableHead>}
                {activeTransportTypes.includes('cruises') && <TableHead>Cruceros</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeTours.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center">
                    No hay viajes activos.
                  </TableCell>
                </TableRow>
              ) : activeTours.map((tour) => {
                const occupiedCount = getOccupiedCount(tour.id);
                const totalCapacity = capacities[tour.id] || 0;
                const availableSeats = totalCapacity - occupiedCount;
                const unitsByType = getTransportUnitsByType(tour);

                return (
                  <TableRow key={tour.id}>
                    <TableCell className="font-medium">{tour.destination}</TableCell>
                    <TableCell>
                      {new Date(tour.date).toLocaleDateString("es-AR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell>${tour.price.toLocaleString("es-AR")}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{totalCapacity}</Badge>
                    </TableCell>
                    <TableCell>
                       <Badge variant={occupiedCount > 0 ? "secondary" : "outline"}>{occupiedCount}</Badge>
                    </TableCell>
                    <TableCell>
                       <Badge variant={availableSeats > 0 ? "default" : "destructive"}>{availableSeats}</Badge>
                    </TableCell>
                    {activeTransportTypes.includes('vehicles') && <TableCell>{unitsByType.vehicles || 0}</TableCell>}
                    {activeTransportTypes.includes('airplanes') && <TableCell>{unitsByType.airplanes || 0}</TableCell>}
                    {activeTransportTypes.includes('cruises') && <TableCell>{unitsByType.cruises || 0}</TableCell>}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
