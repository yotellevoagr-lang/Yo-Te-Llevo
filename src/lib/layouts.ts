
"use client"

import type { LayoutItemType, CustomLayoutConfig, LayoutCategory } from './types';
import { getDocumentById } from './firestore-services';

export type Cell = 
    | { type: 'seat', number: number | '' } 
    | { type: 'cabin', number: string, cabinType: 'Interior' | 'Exterior' | 'Balcón' | 'Suite', capacity: number | '' }
    | { type: 'pasillo' | 'escalera' | 'baño' | 'cafetera' | 'chofer' | 'cabina' | 'empty' | 'anchor' | 'waves' };

export type Floor = {
    name: string;
    grid: {
        gridData: Cell[];
        cols: number;
    }
};

export type Layout = {
    floors: Record<string, Floor>;
};

export const getLayoutForType = async (category: LayoutCategory, type: LayoutItemType): Promise<Layout | null> => {
    const allConfigs = await getDocumentById<Record<LayoutCategory, Record<string, CustomLayoutConfig>>>('settings', 'layouts');
    
    const categoryConfigs = allConfigs?.[category];
    const config = categoryConfigs?.[type];

    if (config && config.layout) {
        return config.layout;
    }

    return null;
}
