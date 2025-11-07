
"use client"

import { useState, useEffect, useCallback } from "react";
import type { GeoSettings, GeneralSettings } from "@/lib/types";
import { getDocumentById } from "@/lib/firestore-services";

type GeoAccessStatus = "loading" | "allowed" | "denied" | "prompting" | "checking";

// Haversine formula to calculate distance between two lat/lon points
const getDistanceInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// List of allowed cities (simplified check)
const allowedCities = [
    "san lorenzo", "rosario", "santa fe", "parana", "granadero baigorria", 
    "capitan bermudez", "fray luis beltran", "puerto general san martin",
    "ricardone", "timbues", "villa constitucion"
];

export const useGeoAccess = () => {
  const [status, setStatus] = useState<GeoAccessStatus>("loading");
  const [mainWhatsappNumber, setMainWhatsappNumber] = useState<string | undefined>();
  const [geoSettings, setGeoSettings] = useState<GeoSettings | null>(null);

  useEffect(() => {
    const fetchSettingsAndCheckIp = async () => {
        const [general, geo] = await Promise.all([
            getDocumentById<GeneralSettings>('settings', 'general'),
            getDocumentById<GeoSettings>('settings', 'geo')
        ]);

        if (general) setMainWhatsappNumber(general.mainWhatsappNumber);
        if (geo) setGeoSettings(geo);

        // If no geo settings are configured in Firestore, everyone is allowed.
        if (!geo) {
            setStatus("allowed");
            return;
        }

        // --- IP-based Geolocation Check (Step 1) ---
        try {
            const response = await fetch('https://ipapi.co/json/');
            if (!response.ok) throw new Error('IP API response not ok');
            
            const ipData = await response.json();
            const { latitude, longitude } = ipData;

            if (latitude && longitude) {
                const distance = getDistanceInKm(latitude, longitude, geo.latitude, geo.longitude);
                if (distance <= geo.radiusKm) {
                    // IP is within radius, allow access without prompt.
                    setStatus("allowed");
                } else {
                    // IP is outside radius, show prompt to user.
                    setStatus("prompting");
                }
            } else {
                // Could not get location from IP, show prompt.
                setStatus("prompting");
            }
        } catch (error) {
            console.warn("IP-based geolocation failed, defaulting to prompt:", error);
            setStatus("prompting");
        }
    };

    fetchSettingsAndCheckIp();
  }, []);

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
                // User denied or error occurred, fall back to manual entry or just deny
                setStatus("denied"); 
            }
        );
    } else {
        setStatus("denied"); // Geolocation not supported
    }
  }, [geoSettings]);

  const checkManualLocation = useCallback((province: string, city: string) => {
    setStatus("checking");
    // Simplified check: Allow if province is Santa Fe or city is in the allowed list
    const isAllowed = province.toLowerCase().includes("santa fe") || allowedCities.includes(city.toLowerCase());
    setTimeout(() => { // Simulate "network" delay for UX
        setStatus(isAllowed ? "allowed" : "denied");
    }, 500);
  }, []);

  const denyAccess = () => {
      // This is called when the user closes the prompt or explicitly wants to just browse.
      // We set status to denied so the purchase button is disabled.
      setStatus('denied');
  }

  return { status, mainWhatsappNumber, checkBrowserPermission, checkManualLocation, denyAccess };
};
