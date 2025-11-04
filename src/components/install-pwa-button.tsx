
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPwaButton() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      // Store the event so it can be triggered later.
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) {
      return;
    }
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the A2HS prompt');
    } else {
      console.log('User dismissed the A2HS prompt');
    }
    // We can only use the prompt once, so clear it.
    setInstallPrompt(null);
  };

  if (!isClient || !installPrompt) {
    return null;
  }

  return (
    <Button
      onClick={handleInstallClick}
      className="h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-2xl transition-transform duration-300 hover:scale-110 active:scale-100 group"
      aria-label="Instalar aplicación"
      title="Instalar aplicación"
    >
      <Download className="h-8 w-8 transition-transform duration-500 group-hover:scale-110" />
    </Button>
  );
}
