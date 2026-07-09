import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Admin master
  const adminHash = await bcrypt.hash("nitroads2025", 12);
  await prisma.adminUser.upsert({
    where: { email: "admin@nitroads.com.br" },
    update: {},
    create: { email: "admin@nitroads.com.br", password: adminHash, role: "admin" },
  });

  // Operadores (colaboradores)
  const gestor = await prisma.collaborator.upsert({
    where: { id: "collab-gestor-1" },
    update: {},
    create: {
      id: "collab-gestor-1",
      name: "Lucas Mendes",
      role: "gestor_trafego",
      active: true,
      salary: 4500,
      variable: 800,
      hireDate: new Date("2023-03-01"),
    },
  });

  const designer = await prisma.collaborator.upsert({
    where: { id: "collab-designer-1" },
    update: {},
    create: {
      id: "collab-designer-1",
      name: "Ana Lima",
      role: "designer",
      active: true,
      salary: 3800,
      variable: 500,
      hireDate: new Date("2023-07-15"),
    },
  });

  // Login de operador para Lucas Mendes
  const operatorHash = await bcrypt.hash("lucas2025", 12);
  await prisma.adminUser.upsert({
    where: { email: "lucas@nitroads.com.br" },
    update: {},
    create: {
      email: "lucas@nitroads.com.br",
      password: operatorHash,
      role: "operator",
      collaboratorId: gestor.id,
    },
  });

  // Clientes
  const client1 = await prisma.client.upsert({
    where: { slug: "autoforce-sp" },
    update: {},
    create: {
      name: "Autoforce SP",
      slug: "autoforce-sp",
      active: true,
      hasDesigner: true,
      ticket: 3500,
      contractDate: new Date("2023-04-01"),
      services: JSON.stringify(["Tráfego", "Criativos"]),
    },
  });

  const client2 = await prisma.client.upsert({
    where: { slug: "moto-parts" },
    update: {},
    create: {
      name: "Moto Parts Brasil",
      slug: "moto-parts",
      active: true,
      hasDesigner: false,
      ticket: 1800,
      contractDate: new Date("2023-06-15"),
      services: JSON.stringify(["Tráfego"]),
    },
  });

  // Atribuir clientes ao operador Lucas
  await prisma.clientOperator.upsert({
    where: { clientId_collaboratorId: { clientId: client1.id, collaboratorId: gestor.id } },
    update: {},
    create: { clientId: client1.id, collaboratorId: gestor.id },
  });
  await prisma.clientOperator.upsert({
    where: { clientId_collaboratorId: { clientId: client2.id, collaboratorId: gestor.id } },
    update: {},
    create: { clientId: client2.id, collaboratorId: gestor.id },
  });

  // Respostas de exemplo
  const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);

  await prisma.npsResponse.upsert({
    where: { id: "resp-demo-1" },
    update: {},
    create: {
      id: "resp-demo-1",
      clientId: client1.id,
      month: lastMonth,
      trafegoScore: 9,
      trafegoCollab: gestor.id,
      designerScore: 8,
      designerCollab: designer.id,
      feedback: "Excelente trabalho da equipe! Os criativos ficaram muito bons.",
    },
  });

  await prisma.npsResponse.upsert({
    where: { id: "resp-demo-2" },
    update: {},
    create: {
      id: "resp-demo-2",
      clientId: client2.id,
      month: lastMonth,
      trafegoScore: 7,
      trafegoCollab: gestor.id,
      feedback: "Bom resultado, mas podemos melhorar o tempo de resposta.",
    },
  });

  console.log("✅ Seed V2 concluído!");
  console.log("📧 Admin:    admin@nitroads.com.br / nitroads2025");
  console.log("👤 Operador: lucas@nitroads.com.br / lucas2025");
  console.log("🏎️  Clientes de teste: /r/autoforce-sp e /r/moto-parts");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
