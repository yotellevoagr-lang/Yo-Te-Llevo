
"use client"

import { useState, useEffect, useCallback } from "react";
import type { GeoSettings, GeneralSettings, Passenger } from "@/lib/types";
import { getDocumentById, savePassenger } from "@/lib/firestore-services";
import { useAuth } from "@/components/auth/auth-provider";

type GeoAccessStatus = "loading" | "allowed" | "denied" | "prompting" | "checking";

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
  const { user } = useAuth();

  const fetchSettings = useCallback(async () => {
    const [general, geo] = await Promise.all([
      getDocumentById<GeneralSettings>('settings', 'general'),
      getDocumentById<GeoSettings>('settings', 'geo')
    ]);
    if (general) setMainWhatsappNumber(general.mainWhatsappNumber);
    if (geo) setGeoSettings(geo);
    return geo;
  }, []);

  const checkAccess = useCallback(async () => {
    const settings = geoSettings || await fetchSettings();
    if (!settings) {
      setStatus("allowed");
      return;
    }

    if (user && (user as Passenger).city) {
        const isAllowed = ((user as Passenger).province?.toLowerCase().includes("santa fe") || allowedCities.includes((user as Passenger).city!.toLowerCase()));
        setStatus(isAllowed ? "allowed" : "denied");
        return;
    }

    try {
      const response = await fetch('https://ipapi.co/json/');
      if (!response.ok) throw new Error('IP API response not ok');
      const ipData = await response.json();
      const { latitude, longitude } = ipData;

      if (latitude && longitude) {
        const distance = getDistanceInKm(latitude, longitude, settings.latitude, settings.longitude);
        setStatus(distance <= settings.radiusKm ? "allowed" : "prompting");
      } else {
        setStatus("prompting");
      }
    } catch (error) {
      console.warn("IP-based geolocation failed, defaulting to prompt:", error);
      setStatus("prompting");
    }
  }, [geoSettings, fetchSettings, user]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  const checkBrowserPermission = useCallback(async () => {
    if (!geoSettings) {
      setStatus("allowed");
      return;
    }
    setStatus("checking");
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const distance = getDistanceInKm(
            position.coords.latitude,
            position.coords.longitude,
            geoSettings.latitude,
            geoSettings.longitude
          );
          setStatus(distance <= geoSettings.radiusKm ? "allowed" : "denied");
        },
        () => {
          setStatus("denied"); 
        }
      );
    } else {
      setStatus("denied");
    }
  }, [geoSettings]);

  const checkManualLocation = useCallback(async (province: string, city: string) => {
    setStatus("checking");
    const isAllowed = province.toLowerCase().includes("santa fe") || allowedCities.includes(city.toLowerCase());
    
    if (isAllowed && user?.id) {
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

  const denyAccess = () => {
    setStatus('denied');
  };

  return { status, mainWhatsappNumber, checkBrowserPermission, checkManualLocation, denyAccess };
};
