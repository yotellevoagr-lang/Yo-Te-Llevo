"use client"

import { useEffect } from 'react'
import { getDocumentById } from '@/lib/firestore-services'
import type { GeneralSettings } from '@/lib/types'

function hexToHsl(hex: string): string {
    if (!hex || hex.length < 7) return ''
    try {
        const r = parseInt(hex.slice(1, 3), 16) / 255
        const g = parseInt(hex.slice(3, 5), 16) / 255
        const b = parseInt(hex.slice(5, 7), 16) / 255
        const max = Math.max(r, g, b), min = Math.min(r, g, b)
        let h = 0, s = 0, l = (max + min) / 2
        if (max !== min) {
            const d = max - min
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
                case g: h = ((b - r) / d + 2) / 6; break
                case b: h = ((r - g) / d + 4) / 6; break
            }
        }
        return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
    } catch { return '' }
}

export function DynamicTheme() {
    useEffect(() => {
        const apply = async () => {
            try {
                const cached = localStorage.getItem('ytl_general_settings')
                const settings: GeneralSettings | null = cached
                    ? JSON.parse(cached)
                    : await getDocumentById<GeneralSettings>('settings', 'general')
                if (!settings?.themeColors) return

                const { primaryHex, darkPrimaryHex } = settings.themeColors
                const lightHsl = primaryHex ? hexToHsl(primaryHex) : ''
                const darkHsl = (darkPrimaryHex ? hexToHsl(darkPrimaryHex) : lightHsl)

                if (!lightHsl) return

                let style = document.getElementById('ytl-dynamic-theme') as HTMLStyleElement | null
                if (!style) {
                    style = document.createElement('style')
                    style.id = 'ytl-dynamic-theme'
                    document.head.appendChild(style)
                }
                style.textContent = `
                    :root {
                        --primary: ${lightHsl};
                        --accent: ${lightHsl};
                        --ring: ${lightHsl};
                    }
                    .dark {
                        --primary: ${darkHsl};
                        --accent: ${darkHsl};
                        --ring: ${darkHsl};
                    }
                `
            } catch {}
        }

        apply()
        window.addEventListener('storage', apply)
        return () => window.removeEventListener('storage', apply)
    }, [])

    return null
}
