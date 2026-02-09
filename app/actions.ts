'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth'; // Zorg dat je deze import hebt!
import { revalidatePath } from 'next/cache';

// --- BESTAANDE ACTIES ---

export async function setActiveCampaign(id: string) {
  const cookieStore = await cookies();
  cookieStore.set('activeCampaignId', id);
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('session_token');
  redirect('/login');
}

// --- NIEUWE ACTIES VOOR ANNOTATIES ---

export async function addAnnotation(campaignId: number, date: string, text: string) {
  const session: any = await getSession();
  if (!session || !session.userId) throw new Error('Unauthorized');

  await prisma.annotation.create({
    data: {
      text,
      date: new Date(date), // Converteer string naar Date object
      campaignId,
      userId: session.userId,
    },
  });

  revalidatePath('/logs'); // Ververs de logs pagina
  revalidatePath('/');     // Ververs eventueel dashboard
  return { success: true };
}

export async function getAnnotations(campaignId: number) {
  const session = await getSession();
  if (!session) return [];

  const notes = await prisma.annotation.findMany({
    where: { campaignId },
    orderBy: { date: 'desc' }, // Nieuwste datum bovenaan
    include: {
      user: {
        select: { name: true, email: true }
      }
    }
  });

  return notes;
}

export async function deleteAnnotation(id: number) {
    const session = await getSession();
    if (!session) return;
    
    await prisma.annotation.delete({ where: { id } });
    revalidatePath('/logs');
}

// --- MANUAL LOGBOOK ---

export async function addManualLog(
  campaignId: number, 
  date: string, 
  platform: string,         // <-- Nieuw
  externalCampaign: string, // <-- Nieuw
  offerName: string,
  leads: number,
  sales: number,
  revenue: number
) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  await prisma.manualLog.create({
    data: {
      campaignId,
      date: new Date(date),
      platform,             // Opslaan
      externalCampaign,     // Opslaan
      offerName,
      leads,
      sales,
      revenue
    }
  });

  revalidatePath('/manual');
  return { success: true };
}

export async function deleteManualLog(id: number) {
  const session = await getSession();
  if (!session) return;

  await prisma.manualLog.delete({ where: { id } });
  revalidatePath('/manual');
}

export async function updateManualLog(
  id: number,
  date: string,
  platform: string,
  externalCampaign: string,
  offerName: string,
  leads: number,
  sales: number,
  revenue: number
) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  await prisma.manualLog.update({
    where: { id },
    data: {
      date: new Date(date),
      platform,
      externalCampaign,
      offerName,
      leads,
      sales,
      revenue
    }
  });

  revalidatePath('/manual');
  return { success: true };
}