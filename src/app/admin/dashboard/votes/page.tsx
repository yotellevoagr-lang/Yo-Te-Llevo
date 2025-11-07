

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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import type { LocationVote } from "@/lib/types"
import { getAllFromCollection_client } from "@/lib/firestore-services"
import { Loader2, MapPin, Building, ThumbsUp } from "lucide-react"

type VoteCounts = {
    [province: string]: {
        total: number;
        cities: {
            [city: string]: number;
        }
    }
}

export default function VotesPage() {
    const [votes, setVotes] = useState<LocationVote[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const votesData = await getAllFromCollection_client<LocationVote>('location_votes');
            setVotes(votesData);
            setIsLoading(false);
        }
        fetchData();
    }, []);

    const voteCounts = useMemo(() => {
        return votes.reduce<VoteCounts>((acc, vote) => {
            if (!acc[vote.province]) {
                acc[vote.province] = { total: 0, cities: {} };
            }
            if (!acc[vote.province].cities[vote.city]) {
                acc[vote.province].cities[vote.city] = 0;
            }
            acc[vote.province].total++;
            acc[vote.province].cities[vote.city]++;
            return acc;
        }, {});
    }, [votes]);

    const sortedProvinces = useMemo(() => {
        return Object.entries(voteCounts).sort(([, a], [, b]) => b.total - a.total);
    }, [voteCounts]);

    return (
         <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Votos por Zona</h2>
                    <p className="text-muted-foreground">
                        Revisa qué provincias y localidades tienen más interés para futuras expansiones.
                    </p>
                </div>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ThumbsUp className="w-5 h-5 text-primary"/> Total de Votos Recibidos: {votes.length}</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                         <div className="flex h-48 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : sortedProvinces.length === 0 ? (
                        <p className="text-center text-muted-foreground p-8">Aún no se han recibido votos.</p>
                    ) : (
                        <Accordion type="multiple" className="w-full space-y-2">
                            {sortedProvinces.map(([province, data]) => (
                                <AccordionItem value={province} key={province} className="border rounded-lg bg-muted/30">
                                    <AccordionTrigger className="px-4 hover:no-underline text-base font-semibold">
                                        <div className="flex justify-between items-center w-full">
                                            <span className="flex items-center gap-2"><MapPin className="w-4 h-4"/> {province}</span>
                                            <span className="mr-4 font-bold text-primary">{data.total} {data.total === 1 ? 'voto' : 'votos'}</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-4 bg-background border-t">
                                        <div className="space-y-2">
                                            {Object.entries(data.cities).sort(([, a], [, b]) => b - a).map(([city, count]) => (
                                                <div key={city} className="flex justify-between items-center p-2 rounded-md hover:bg-secondary/50">
                                                     <span className="flex items-center gap-2"><Building className="w-4 h-4 text-muted-foreground"/> {city}</span>
                                                     <span className="font-semibold">{count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
