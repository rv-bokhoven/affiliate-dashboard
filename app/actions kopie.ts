'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation'; // <--- Deze miste!

export async function setActiveCampaign(id: string) {
  const cookieStore = await cookies();
  cookieStore.set('activeCampaignId', id);
}

export async function logout() {
  const cookieStore = await cookies();
  
  // Verwijder de sessie cookie
  cookieStore.delete('session_token');
  
  // Stuur de gebruiker terug naar de login pagina
  redirect('/login');
}