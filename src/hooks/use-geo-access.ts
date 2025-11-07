
"use client"

import { useState, useEffect } from "react";
import type { GeoSettings, GeneralSettings } from "@/lib/types";
import { getDocumentById } from "@/lib/firestore-services";

type GeoAccessStatus = "loading" | "allowed" | "denied";

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

export const useGeoAccess = () => {
  const [status, setStatus] = useState<GeoAccessStatus>("loading");
  const [mainWhatsappNumber, setMainWhatsappNumber] = useState<string | undefined>();
  
  useEffect(() => {
    const checkGeoAccess = async () => {
      const generalSettings = await getDocumentById<GeneralSettings>('settings', 'general');
      const geoSettings = await getDocumentById<GeoSettings>('settings', 'geo');
      
      if(generalSettings) setMainWhatsappNumber(generalSettings.mainWhatsappNumber);

      if (!geoSettings || !geoSettings.radiusKm || geoSettings.radiusKm <= 0) {
        setStatus("allowed");
        return;
      }
      
      const setStatusFromCoords = (lat: number, lon: number) => {
        const distance = getDistanceInKm(
          lat,
          lon,
          geoSettings.latitude,
          geoSettings.longitude
        );
        setStatus(distance <= geoSettings.radiusKm ? "allowed" : "denied");
      };

      const fallbackToIp = async () => {
         try {
            const response = await fetch('https://get.geojs.io/v1/ip/geo.json');
            const data = await response.json();
            const userLat = parseFloat(data.latitude);
            const userLon = parseFloat(data.longitude);

            if (isNaN(userLat) || isNaN(userLon)) {
              setStatus("denied");
            } else {
              setStatusFromCoords(userLat, userLon);
            }
          } catch (error) {
            console.warn("Error getting user location via IP:", error);
            setStatus("denied");
          }
      };

      if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
              (position) => {
                  setStatusFromCoords(position.coords.latitude, position.coords.longitude);
              },
              (error) => {
                  console.warn(`Geolocation error (${error.code}): ${error.message}. Falling back to IP.`);
                  fallbackToIp();
              },
              {
                  enableHighAccuracy: false,
                  timeout: 10000,
                  maximumAge: 0
              }
          );
      } else {
          fallbackToIp();
      }
    };

    checkGeoAccess();

  }, []);

  return { status, mainWhatsappNumber };
};
