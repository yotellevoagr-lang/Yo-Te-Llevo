import { NextRequest, NextResponse } from 'next/server';

/**
 * Webhook para WhatsApp Business API (Cloud API)
 * 
 * Configuración en Meta for Developers:
 * 1. Callback URL: [TU_DOMINIO]/api/whatsapp
 * 2. Verify Token: El valor de WHATSAPP_VERIFY_TOKEN en tus secretos
 * 3. Webhook fields: messages
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Validación del Webhook requerida por Meta
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Extraer datos básicos del mensaje
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (message && message.type === 'text') {
      const from = message.from; // Número de teléfono del usuario
      const text = message.text.body;
      const businessPhoneNumberId = value.metadata.phone_number_id;

      // 1. Obtener respuesta de nuestro motor de IA (Gemini)
      // Reutilizamos la lógica del chat web que ya conoce todos los viajes y contacto
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000';
      
      try {
        const aiResponse = await fetch(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: text }]
          })
        });

        const aiData = await aiResponse.json();

        if (aiData.success && aiData.message) {
          // 2. Enviar respuesta de vuelta a WhatsApp usando la Cloud API
          const whatsappToken = process.env.WHATSAPP_API_TOKEN;
          
          if (whatsappToken) {
            const sendResult = await fetch(`https://graph.facebook.com/v17.0/${businessPhoneNumberId}/messages`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${whatsappToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: from,
                type: "text",
                text: { body: aiData.message }
              })
            });
            
            if (!sendResult.ok) {
              const errorData = await sendResult.json();
              console.error('Error enviando mensaje a WhatsApp:', errorData);
            }
          } else {
            console.warn('WHATSAPP_API_TOKEN no configurado en secretos. Respuesta generada:', aiData.message);
          }
        }
      } catch (aiError) {
        console.error('Error al procesar con IA:', aiError);
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('WhatsApp Webhook error crítico:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
