import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, campaignId, data } = body; 

    // 1. UPDATE PROJECT DETAILS (Naam, Logo, Type)
    if (action === 'update_details') {
      const updated = await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          name: data.name,
          logo: data.logo,
          type: data.type
        }
      });
      return NextResponse.json(updated);
    }

    // 2. ADD MEMBER (User aanmaken of koppelen)
    if (action === 'add_member') {
      const { email, password, role } = data; // We verwachten nu ook een password

      // Stap A: Check of gebruiker al bestaat
      let user = await prisma.user.findUnique({ where: { email } });

      // Stap B: Zo niet, maak nieuwe user aan
      if (!user) {
        if (!password) {
            return NextResponse.json({ error: 'Wachtwoord is verplicht voor nieuwe gebruiker' }, { status: 400 });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        user = await prisma.user.create({
          data: {
            email,
            password: hashedPassword,
            name: email.split('@')[0], // Tijdelijke naam
            role: 'USER'
          }
        });
      }

      // Stap C: Check of ze al lid zijn van dit project
      const existingMember = await prisma.campaignMember.findUnique({
        where: {
          userId_campaignId: {
            userId: user.id,
            campaignId: campaignId
          }
        }
      });
      
      if (existingMember) return NextResponse.json({ error: 'User already added' }, { status: 400 });

      // Stap D: Koppel aan project
      const member = await prisma.campaignMember.create({
        data: {
          campaignId,
          userId: user.id,
          role: role || 'MEMBER'
        },
        include: { user: true } // Return user info voor de frontend
      });
      
      // We returnen een platgeslagen object voor de frontend tabel
      return NextResponse.json({
        id: member.id,
        email: user.email,
        role: member.role
      });
    }

    // 3. REMOVE MEMBER
    if (action === 'remove_member') {
      await prisma.campaignMember.delete({
        where: { id: data.memberId }
      });
      return NextResponse.json({ success: true });
    }

    // 4. DELETE PROJECT
    if (action === 'delete_project') {
      await prisma.campaign.delete({
        where: { id: campaignId }
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error("Settings Error:", error);
    return NextResponse.json({ error: 'Actie mislukt' }, { status: 500 });
  }
}