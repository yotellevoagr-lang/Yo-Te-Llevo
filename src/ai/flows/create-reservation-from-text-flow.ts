
'use server';
/**
 * @fileOverview An AI flow to extract reservation and passenger details from a block of text.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const ReservationFromTextInputSchema = z.object({
  text: z
    .string()
    .describe('A block of text, likely from a messaging app like WhatsApp, containing details about a travel reservation.'),
});
export type ReservationFromTextInput = z.infer<typeof ReservationFromTextInputSchema>;

const AdditionalPassengerSchema = z.object({
  fullName: z.string().describe("Full name of this additional passenger."),
  dni: z.string().describe("DNI of this additional passenger (numbers only)."),
  dob: z.string().optional().describe("Date of birth in YYYY-MM-DD format if mentioned."),
  phone: z.string().optional().describe("Phone number if mentioned."),
});

const ProcessedReservationOutputSchema = z.object({
  passenger: z.object({
    fullName: z.string().describe("The full name of the main passenger making the reservation."),
    dni: z.string().describe("The DNI (National Identity Document) of the main passenger. Should contain only numbers."),
    phone: z.string().optional().describe("The contact phone number of the main passenger."),
    dob: z.string().optional().describe("The date of birth of the main passenger, in YYYY-MM-DD format if available."),
    email: z.string().optional().describe("Email address if mentioned."),
    city: z.string().optional().describe("City or locality of the passenger if mentioned."),
  }).describe("Details of the main passenger."),
  additionalPassengers: z.array(AdditionalPassengerSchema).optional().describe("Other passengers in the same reservation (family, companions). Only include if explicitly mentioned with their names and/or DNI."),
  reservation: z.object({
    paxCount: z.number().describe("The total number of people in the reservation (quantity of passengers). Include the main passenger in this count."),
    finalPrice: z.number().optional().describe("The total final price of the reservation if mentioned."),
    boardingPointName: z.string().optional().describe("The boarding/pickup location or stop mentioned (e.g. 'Terminal de Rosario', 'Plaza principal', a city name used as pickup point)."),
    observations: z.string().optional().describe("Any other relevant notes, requests, dietary restrictions, or special needs mentioned."),
  }).describe("Details of the reservation."),
  confidence: z.enum(['high', 'medium', 'low']).describe("Your confidence level in the extracted data. 'high' if all key fields found clearly, 'medium' if some fields are missing or ambiguous, 'low' if very little data was found."),
  missingFields: z.array(z.string()).optional().describe("List of important fields that were NOT found in the text (e.g. 'DNI', 'Teléfono', 'Fecha de nacimiento')."),
});
export type ProcessedReservationOutput = z.infer<typeof ProcessedReservationOutputSchema>;


export async function processReservationText(input: ReservationFromTextInput): Promise<ProcessedReservationOutput> {
  return createReservationFromTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'createReservationFromTextPrompt',
  input: {schema: ReservationFromTextInputSchema},
  output: {schema: ProcessedReservationOutputSchema},
  prompt: `Eres un asistente experto en carga de datos para una agencia de viajes argentina llamada "YO TE LLEVO". 
Tu tarea es analizar texto de conversaciones de WhatsApp y extraer información para crear reservas.

El texto puede estar desordenado, con mensajes mezclados, errores tipográficos, abreviaturas y vocabulario informal argentino. Interpretá con criterio.

**DATOS A EXTRAER:**

1. **Pasajero Principal**:
   - fullName: Nombre completo. Si está separado (ej. "Juan" y "Pérez"), unilos.
   - dni: DNI argentino. Limpialo (quitar puntos, espacios, guiones). Solo números.
   - phone: Teléfono de contacto (con código de área si aparece).
   - dob: Fecha de nacimiento en formato YYYY-MM-DD. Si dice "15/03/1990" → "1990-03-15".
   - email: Email si se menciona.
   - city: Ciudad o localidad de origen si se menciona.

2. **Pasajeros Adicionales** (opcional):
   - Solo incluir si están mencionados EXPLÍCITAMENTE con nombre y/o DNI.
   - Típicamente son familiares o acompañantes listados.

3. **Reserva**:
   - paxCount: Total de personas incluyendo el pasajero principal. Si dice "para 3" o "somos 3", es 3.
   - finalPrice: Precio total acordado si se menciona (número).
   - boardingPointName: Lugar de embarque o punto de subida mencionado. Puede ser una ciudad, terminal, plaza, dirección.
   - observations: Notas adicionales importantes (pedidos especiales, restricciones, etc.).

4. **confidence**: 
   - 'high': Se encontraron nombre + DNI + cantidad de pasajeros claramente.
   - 'medium': Falta algún dato clave pero hay suficiente para continuar.
   - 'low': Muy poca información útil.

5. **missingFields**: Listá los campos importantes que NO se encontraron (ej. ["DNI", "Teléfono"]).

**EJEMPLOS DE TEXTO A ANALIZAR:**
- "Hola! Soy María González, dni 27654321, quiero reservar 2 lugares para el viaje a Bariloche. Mi tel es 341-5551234. Viajamos con mi marido Rodrigo Pérez dni 30123456"
- "buenas! para el viaje del viernes me anota 1 lugar? nombre juan perez 30555444 fecha nac 12/5/88"
- "necesito 3 lugares para la familia, embarco desde rosario terminal"

Aquí está el texto a analizar:
### TEXTO ###
{{{text}}}
#############

Respondé SOLO con el objeto JSON según el schema. No agregues explicaciones.`,
});

const createReservationFromTextFlow = ai.defineFlow(
  {
    name: 'createReservationFromTextFlow',
    inputSchema: ReservationFromTextInputSchema,
    outputSchema: ProcessedReservationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
        throw new Error("The AI model could not process the text. Please check the input.");
    }
    // Clean up DNI to ensure it's only numbers
    output.passenger.dni = output.passenger.dni.replace(/\D/g, '');
    // Clean additional passengers DNIs too
    if (output.additionalPassengers) {
      output.additionalPassengers = output.additionalPassengers.map(p => ({
        ...p,
        dni: p.dni.replace(/\D/g, '')
      }));
    }
    return output;
  }
);
