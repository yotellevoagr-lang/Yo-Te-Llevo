
"use client"

import { useState, useEffect, useCallback } from "react";
import type { GeoSettings, GeneralSettings } from "@/lib/types";
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
  const { user, loading: authLoading } = useAuth();

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
    if (authLoading) return;

    const settings = geoSettings || await fetchSettings();
    if (!settings) {
      setStatus("allowed");
      return;
    }
    
    // 1. Check for logged-in user with location data
    if (user?.province && user?.city) {
      const isAllowed = user.province.toLowerCase().includes("santa fe") || allowedCities.includes(user.city.toLowerCase());
      setStatus(isAllowed ? "allowed" : "denied");
      return;
    }
    
    // 2. Check for location stored in session for non-logged-in users
    const sessionLocation = sessionStorage.getItem('ytl_manual_location');
    if (sessionLocation) {
        const { province, city } = JSON.parse(sessionLocation);
        const isAllowed = province.toLowerCase().includes("santa fe") || allowedCities.includes(city.toLowerCase());
        setStatus(isAllowed ? "allowed" : "denied");
        return;
    }
    
    // 3. Check for browser permission status
    if ('permissions' in navigator) {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
        if (permissionStatus.state === 'granted') {
            checkBrowserPermission(); // This will automatically get location and set status
            return;
        }
    }

    // 4. If none of the above, prompt the user
    setStatus("prompting");

  }, [geoSettings, fetchSettings, user, authLoading]);

  useEffect(() => {
    // Run check on initial load or when user logs in/out
    checkAccess();
  }, [checkAccess]);

  const checkBrowserPermission = useCallback(async () => {
    const settings = geoSettings || await fetchSettings();
    if (!settings) {
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
            settings.latitude,
            settings.longitude
          );
          setStatus(distance <= settings.radiusKm ? "allowed" : "denied");
        },
        () => {
          setStatus("denied"); // User denied the prompt or an error occurred.
        }
      );
    } else {
      setStatus("denied"); // Geolocation not supported by the browser.
    }
  }, [geoSettings, fetchSettings]);

  const checkManualLocation = useCallback(async (province: string, city: string) => {
    setStatus("checking");
    // Simplified check: allow if province is Santa Fe or city is in the allowed list.
    const isAllowed = province.toLowerCase().includes("santa fe") || allowedCities.includes(city.toLowerCase());
    
    if (user?.id) {
        // If user is logged in, save to their profile
        try {
            await savePassenger({ province, city }, user.id);
        } catch (error) {
            console.error("Failed to save user location:", error);
        }
    } else {
        // If user is not logged in, save to session storage
        sessionStorage.setItem('ytl_manual_location', JSON.stringify({ province, city }));
    }

    // Give visual feedback before changing status
    setTimeout(() => {
        setStatus(isAllowed ? "allowed" : "denied");
    }, 500);
  }, [user]);

  const denyAccess = () => {
    setStatus('denied');
  };

  return { status, mainWhatsappNumber, checkBrowserPermission, checkManualLocation, denyAccess };
};
