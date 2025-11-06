
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
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className="w-6 h-6"
      fill="currentColor"
    >
      <path d="M17.472 14.382c-.297-.149-.88-.436-1.017-.486-.137-.05-.282-.075-.427.05-.145.122-.458.583-.563.708-.104.122-.208.147-.386.022-.178-.122-1.072-.368-2.04-1.25-.76-.695-1.27-1.558-1.417-1.823-.145-.265-.015-.422.104-.563.102-.125.232-.208.335-.308.102-.1.153-.175.231-.285.078-.11.038-.213-.015-.335-.053-.125-.478-1.153-.655-1.578-.172-.423-.348-.368-.478-.368h-.137c-.137 0-.358.05-.535.25-.178.2-.655.633-.655 1.538 0 .903.67 1.785.764 1.908.096.123 1.303 2.083 3.25 2.873.432.178.765.285 1.026.368.423.137.804.113.972.05.19-.075.583-.242.667-.478.083-.23.083-.448.058-.478-.025-.03-.149-.075-.323-.15z" />
      <path d="M12.002 2.002c-5.522 0-9.998 4.476-9.998 9.998 0 1.758.455 3.42 1.258 4.896L2 22l5.244-1.378c1.42.758 3.036 1.18 4.756 1.18 5.522 0 9.998-4.476 9.998-9.998s-4.476-9.998-9.998-9.998zm0 18.156c-1.603 0-3.14-.38-4.502-1.078l-.322-.192-3.35 1.042 1.058-3.264-.213-.342c-.75-1.205-1.153-2.61-1.153-4.088 0-4.524 3.67-8.198 8.198-8.198 4.524 0 8.198 3.674 8.198 8.198s-3.674 8.198-8.198 8.198z" />
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
