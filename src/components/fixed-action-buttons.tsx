
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Instagram, Facebook } from 'lucide-react';
import Chatbot from '@/components/chatbot';
import { InstallPwaButton } from '@/components/install-pwa-button';
import { getDocumentById } from '@/lib/firestore-services';
import type { GeneralSettings } from '@/lib/types';

// Custom WhatsApp Icon Component
const WhatsAppIcon = () => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className="w-6 h-6"
    >
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
    </svg>
);


export function FixedActionButtons() {
  const [settings, setSettings] = useState<GeneralSettings | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const fetchSettings = async () => {
      const fetchedSettings = await getDocumentById<GeneralSettings>('settings', 'general');
      if (fetchedSettings) {
          setSettings(fetchedSettings);
          localStorage.setItem("ytl_general_settings", JSON.stringify(fetchedSettings));
      }
    }
    fetchSettings();
  }, []);
  
  const instagramUrl = settings?.contact?.instagram;
  const facebookUrl = settings?.contact?.facebook;
  const whatsappNumber = settings?.mainWhatsappNumber;
  const whatsappLink = whatsappNumber 
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent("Hola! Quisiera hacer una consulta.")}`
    : null;


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
             <Button asChild size="icon" variant="outline" className="rounded-full w-12 h-12 bg-background/80 backdrop-blur-sm hover:bg-gradient-to-br from-blue-600 to-blue-400 hover:text-white transition-all duration-300">
                <a href={facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                    <Facebook className="w-6 h-6" />
                </a>
            </Button>
        )}
        {whatsappLink && (
            <Button asChild size="icon" variant="outline" className="rounded-full w-12 h-12 bg-background/80 backdrop-blur-sm hover:bg-gradient-to-br from-green-600 to-green-400 hover:text-white transition-all duration-300">
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                    <WhatsAppIcon />
                </a>
            </Button>
        )}
        <Chatbot />
        <InstallPwaButton />
    </div>
  );
}
