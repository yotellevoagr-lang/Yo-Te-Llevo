
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

const ProcessedReservationOutputSchema = z.object({
  passenger: z.object({
      fullName: z.string().describe("The full name of the main passenger making the reservation."),
      dni: z.string().describe("The DNI (National Identity Document) of the main passenger. Should contain only numbers."),
      phone: z.string().optional().describe("The contact phone number of the main passenger."),
      dob: z.string().optional().describe("The date of birth of the main passenger, in YYYY-MM-DD format if available."),
  }).describe("Details of the main passenger."),
  reservation: z.object({
      paxCount: z.number().describe("The total number of people in the reservation (quantity of passengers)."),
      finalPrice: z.number().optional().describe("The total final price of the reservation if mentioned."),
  }).describe("Details of the reservation."),
});
export type ProcessedReservationOutput = z.infer<typeof ProcessedReservationOutputSchema>;


export async function processReservationText(input: ReservationFromTextInput): Promise<ProcessedReservationOutput> {
  return createReservationFromTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'createReservationFromTextPrompt',
  input: {schema: ReservationFromTextInputSchema},
  output: {schema: ProcessedReservationOutputSchema},
  prompt: `You are an expert data entry assistant for a travel agency. Your task is to analyze a block of text and extract key information to create a new reservation.

The text is a conversation, likely from WhatsApp, between a client and a travel agent.

Carefully analyze the text provided below and extract the following information:
1.  **Passenger Details**:
    *   'fullName': The full name of the person making the reservation.
    *   'dni': The DNI (document number). It must be a string of numbers. Clean it up if necessary (remove dots, spaces).
    *   'phone': The contact phone number.
    *   'dob': The date of birth, if provided. Format it as YYYY-MM-DD.

2.  **Reservation Details**:
    *   'paxCount': The number of people traveling. If it says "un lugar" or mentions only one person, this is 1. If it mentions a couple, it's 2, etc.
    *   'finalPrice': The total price agreed upon for the reservation, if mentioned.

Here is the text to analyze:
### TEXT ###
{{{text}}}
#############`,
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
    return output;
  }
);
