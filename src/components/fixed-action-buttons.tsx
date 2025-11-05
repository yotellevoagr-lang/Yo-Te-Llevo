
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Instagram, Facebook } from 'lucide-react';
import Chatbot from '@/components/chatbot';
import { InstallPwaButton } from '@/components/install-pwa-button';
import { getDocumentById } from '@/lib/firestore-services';
import type { GeneralSettings } from '@/lib/types';

export function FixedActionButtons() {
  const [settings, setSettings] = useState<GeneralSettings | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const fetchSettings = async () => {
      // Always fetch from Firestore to ensure the latest data is available
      const fetchedSettings = await getDocumentById<GeneralSettings>('settings', 'general');
      if (fetchedSettings) {
          setSettings(fetchedSettings);
          // Also update localStorage so other components might benefit from caching
          localStorage.setItem("ytl_general_settings", JSON.stringify(fetchedSettings));
      }
    }
    fetchSettings();
  }, []);
  
  const instagramUrl = settings?.contact?.instagram;
  const facebookUrl = settings?.contact?.facebook;

  if (!isClient) {
      return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-3">
        {instagramUrl && (
             <Button asChild size="icon" variant="outline" className="rounded-full w-12 h-12 bg-background/80 backdrop-blur-sm hover:bg-gradient-to-br from-pink-500 to-yellow-500 hover:text-white transition-all duration-300">
                <a href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                    <Instagram className="w-6 h-6" />
                </a>
            </Button>
        )}
        {facebookUrl && (
             <Button asChild size="icon" variant="outline" className="rounded-full w-12 h-12 bg-background/80 backdrop-blur-sm hover:bg-blue-600 hover:text-white transition-all duration-300">
                <a href={facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                    <Facebook className="w-6 h-6" />
                </a>
            </Button>
        )}
        <Chatbot />
        <InstallPwaButton />
    </div>
  );
}
