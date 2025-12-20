"use client"

import { useState, useEffect, useCallback, useRef } from "react";
import type { GeoSettings, GeneralSettings, Passenger } from "@/lib/types";
import { getDocumentById, savePassenger } from "@/lib/firestore-services";
import { useAuth } from "@/components/auth/auth-provider";

export type GeoAccessStatus = "loading" | "allowed" | "denied" | "prompting" | "checking";

const getDistanceInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const allowedCities = [
    "san lorenzo", "rosario", "santa fe", "parana", "granadero baigorria", 
    "capitan bermudez", "fray luis beltran", "puerto general san martin",
    "ricardone", "timbues", "villa constitucion"
];

export const useGeoAccess = () => {
  const [status, setStatus] = useState<GeoAccessStatus>("loading");
  const [mainWhatsappNumber, setMainWhatsappNumber] = useState<string | undefined>();
  const [geoSettings, setGeoSettings] = useState<GeoSettings | null>(null);
  const [manualLocation, setManualLocation] = useState<{ province: string; city: string } | null>(null);
  const { user, loading: authLoading } = useAuth();
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (hasCheckedRef.current) return;
    
    const checkAccess = async () => {
      hasCheckedRef.current = true;
      
      try {
        const [general, geo] = await Promise.all([
          getDocumentById<GeneralSettings>('settings', 'general'),
          getDocumentById<GeoSettings>('settings', 'geo')
        ]);
        
        if (general) setMainWhatsappNumber(general.mainWhatsappNumber);
        if (geo) setGeoSettings(geo);
        
        if (!geo) {
          setStatus("allowed");
          return;
        }
        
        const userAsPassenger = user as Passenger | undefined;
        if (userAsPassenger?.province && userAsPassenger?.city) {
          const isAllowed = allowedCities.includes(userAsPassenger.city.toLowerCase());
          setManualLocation({ province: userAsPassenger.province, city: userAsPassenger.city });
          setStatus(isAllowed ? "allowed" : "denied");
          return;
        }
        
        setStatus("prompting");
      } catch (error) {
        console.error("Error checking geo access:", error);
        setStatus("allowed");
      }
    };
    
    checkAccess();
  }, [authLoading, user]);

  const checkBrowserPermission = useCallback(async () => {
    let settings = geoSettings;
    if (!settings) {
      try {
        settings = await getDocumentById<GeoSettings>('settings', 'geo');
        if (settings) setGeoSettings(settings);
      } catch {
        setStatus("allowed");
        return;
      }
    }
    
    if (!settings) {
      setStatus("allowed");
      return;
    }
    
    setStatus("checking");
    
    if (typeof navigator !== 'undefined' && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const distance = getDistanceInKm(
            position.coords.latitude,
            position.coords.longitude,
            settings!.latitude,
            settings!.longitude
          );
          setStatus(distance <= settings!.radiusKm ? "allowed" : "denied");
        },
        () => {
          setStatus("prompting"); 
        }
      );
    } else {
      setStatus("prompting"); 
    }
  }, [geoSettings]);

  const checkManualLocation = useCallback(async (province: string, city: string) => {
    setStatus("checking");
    setManualLocation({ province, city });
    const isAllowed = allowedCities.includes(city.toLowerCase());
    
    if (user?.id) {
        try {
            await savePassenger({ province, city }, user.id);
        } catch (error) {
            console.error("Failed to save user location:", error);
        }
    }
    
    setTimeout(() => {
        setStatus(isAllowed ? "allowed" : "denied");
    }, 500);
  }, [user]);

  return { status, mainWhatsappNumber, manualLocation, checkBrowserPermission, checkManualLocation };
};
