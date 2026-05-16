import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ 
    system: "Medisoft",
    version: "1.0.0",
    description: "Sistema de Gestión de Incapacidades" 
  });
}