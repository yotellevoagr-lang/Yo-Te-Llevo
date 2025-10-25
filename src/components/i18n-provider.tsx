"use client";

import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { useEffect, useState } from 'react';
import enCommon from '@/locales/en/common.json';
import esCommon from '@/locales/es/common.json';

const resources = {
  en: {
    common: enCommon,
  },
  es: {
    common: esCommon,
  },
};


i18next
  .use(initReactI18next)
  .init({
    resources,
    lng: 'es',
    fallbackLng: 'es',
    interpolation: {
      escapeValue: false, 
    },
    defaultNS: 'common'
  });

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        if (i18next.isInitialized) {
            setIsInitialized(true);
        } else {
            i18next.on('initialized', () => {
                setIsInitialized(true);
            });
        }
    }, []);

    if (!isInitialized) {
        return null; 
    }
  
    return <I18nextProvider i18n={i18next}>{children}</I18nextProvider>;
}
