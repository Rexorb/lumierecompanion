'use strict';

/*
 * Seed idempotente do ambiente demonstrativo do Lumière Companion.
 *
 * - Executado pelo serviço Compose "seed" (perfil tools), com DATABASE_URL do
 *   PostgreSQL demonstrativo.
 * - Não altera schema nem migrations e não lê dados do banco original.
 * - Usa IDs fixos e upserts: pode ser reexecutado sem duplicar registros.
 * - Senhas vêm de variáveis locais (.env.demo) e nunca são impressas.
 */

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const TIMEZONE = 'America/Sao_Paulo';

function required(name) {
  const value = (process.env[name] || '').trim();
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`);
  return value;
}

function dateInSaoPaulo(offsetDays = 0) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type) => Number(parts.find((part) => part.type === type).value);
  const base = new Date(Date.UTC(get('year'), get('month') - 1, get('day')));
  base.setUTCDate(base.getUTCDate() + offsetDays);
  return base.toISOString().slice(0, 10);
}

function at(offsetDays, time) {
  return new Date(`${dateInSaoPaulo(offsetDays)}T${time}:00-03:00`);
}

const IDS = {
  salonA: 'a0000000-0000-4000-8000-000000000001',
  salonB: 'b0000000-0000-4000-8000-000000000001',
  salonInactive: 'c0000000-0000-4000-8000-000000000001',
  userA: 'a0000000-0000-4000-8000-0000000000a1',
  userB: 'b0000000-0000-4000-8000-0000000000b1',
};

const SALONS = [
  {
    key: 'alfa',
    id: IDS.salonA,
    nome: 'Salão Demonstração Alfa',
    telefone: '5511900000101',
    email: 'contato.alfa@example.test',
    cidade: 'São Paulo',
    estado: 'SP',
    ativo: true,
    createdAt: new Date('2026-01-05T12:00:00-03:00'),
  },
  {
    key: 'beta',
    id: IDS.salonB,
    nome: 'Salão Demonstração Beta',
    telefone: '5511900000201',
    email: 'contato.beta@example.test',
    cidade: 'Campinas',
    estado: 'SP',
    ativo: true,
    createdAt: new Date('2026-01-06T12:00:00-03:00'),
  },
  {
    key: 'inativo',
    id: IDS.salonInactive,
    nome: 'Salão Demonstração Inativo',
    telefone: '5511900000301',
    email: 'contato.inativo@example.test',
    cidade: 'Santos',
    estado: 'SP',
    ativo: false,
    createdAt: new Date('2026-01-07T12:00:00-03:00'),
  },
];

function servicesFor(key, salonId, suffix) {
  return [
    {
      id: `demo-${key}-servico-1`,
      nome: `Corte demonstração ${suffix}`,
      descricao: 'Serviço fictício para demonstração',
      duracao: 60,
      preco: '120.00',
      categoria: 'CABELO',
      salaoId: salonId,
    },
    {
      id: `demo-${key}-servico-2`,
      nome: `Coloração demonstração ${suffix}`,
      descricao: 'Serviço fictício para demonstração',
      duracao: 90,
      preco: '180.00',
      categoria: 'CABELO',
      salaoId: salonId,
    },
  ];
}

function clientsFor(key, salonId, phoneBase, suffix) {
  const now = Date.now();
  return Array.from({ length: 25 }, (_, index) => {
    const number = String(index + 1).padStart(2, '0');
    return {
      id: `demo-${key}-cliente-${number}`,
      nome: `Cliente ${suffix} ${number}`,
      telefone: `${phoneBase}${number}`,
      email: `cliente.${key}.${number}@example.test`,
      observacoes: 'Registro inteiramente fictício do seed demo',
      totalVisitas: index % 7,
      ultimaVisita: new Date(now - index * 86_400_000),
      createdAt: new Date(now - (index < 3 ? index + 1 : 90) * 86_400_000),
      salaoId: salonId,
    };
  });
}

const APPOINTMENT_SPECS = [
  { day: 0, time: '09:00', duration: 60, status: 'CONFIRMADO', client: 0, service: 0 },
  { day: 0, time: '10:00', duration: 30, status: 'PENDENTE', client: 1, service: 1 },
  { day: 0, time: '11:00', duration: 60, status: 'CONCLUIDO', client: 2, service: 0 },
  { day: 0, time: '14:00', duration: 30, status: 'CANCELADO', client: 3, service: 1 },
  { day: 0, time: '15:00', duration: 60, status: 'FALTOU', client: 4, service: 0 },
  { day: 0, time: '16:30', duration: 30, status: 'CONFIRMADO', client: 5, service: 1 },
  { day: -1, time: '09:30', duration: 60, status: 'CONCLUIDO', client: 6, service: 0 },
  { day: -1, time: '11:00', duration: 30, status: 'CANCELADO', client: 7, service: 1 },
  { day: 1, time: '09:00', duration: 60, status: 'CONFIRMADO', client: 8, service: 0 },
  { day: 1, time: '11:00', duration: 30, status: 'PENDENTE', client: 9, service: 1 },
  { day: -7, time: '10:00', duration: 60, status: 'CONCLUIDO', client: 10, service: 0 },
  { day: -8, time: '14:00', duration: 30, status: 'CONCLUIDO', client: 11, service: 1 },
  { day: 3, time: '10:00', duration: 60, status: 'PENDENTE', client: 12, service: 0 },
];

async function main() {
  const databaseUrl = required('DATABASE_URL');
  const userAName = required('DEMO_USER_A_NAME');
  const userAEmail = required('DEMO_USER_A_EMAIL');
  const passwordA = required('DEMO_PASSWORD_A');
  const userBName = required('DEMO_USER_B_NAME');
  const userBEmail = required('DEMO_USER_B_EMAIL');
  const passwordB = required('DEMO_PASSWORD_B');

  if (passwordA.length < 8 || passwordB.length < 8) {
    throw new Error('Senhas demo devem ter ao menos 8 caracteres');
  }

  const pool = new Pool({ connectionString: databaseUrl, ssl: false });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    for (const salon of SALONS) {
      const { key, ...salonData } = salon;
      void key;
      await prisma.salao.upsert({
        where: { id: salon.id },
        update: {
          nome: salon.nome,
          telefone: salon.telefone,
          email: salon.email,
          cidade: salon.cidade,
          estado: salon.estado,
          ativo: salon.ativo,
        },
        create: salonData,
      });
    }

    const userAHash = await bcrypt.hash(passwordA, 10);
    const userBHash = await bcrypt.hash(passwordB, 10);

    for (const user of [
      { id: IDS.userA, nome: userAName, email: userAEmail, senha: userAHash },
      { id: IDS.userB, nome: userBName, email: userBEmail, senha: userBHash },
    ]) {
      await prisma.usuario.upsert({
        where: { id: user.id },
        update: {
          nome: user.nome,
          email: user.email,
          senha: user.senha,
          tipo: 'DONO_SALAO',
          verificado: true,
        },
        create: { ...user, tipo: 'DONO_SALAO', verificado: true },
      });
    }

    const memberships = [
      { usuarioId: IDS.userA, salaoId: IDS.salonA },
      { usuarioId: IDS.userB, salaoId: IDS.salonB },
      // Vínculo com salão inativo para validar a recusa de acesso.
      { usuarioId: IDS.userA, salaoId: IDS.salonInactive },
    ];
    for (const membership of memberships) {
      await prisma.usuarioSalao.upsert({
        where: {
          usuarioId_salaoId: {
            usuarioId: membership.usuarioId,
            salaoId: membership.salaoId,
          },
        },
        update: { papel: 'DONO_SALAO' },
        create: { ...membership, papel: 'DONO_SALAO' },
      });
    }

    const dataset = [
      {
        key: 'alfa',
        salonId: IDS.salonA,
        phoneBase: '551190000010',
        suffix: 'Alfa',
      },
      {
        key: 'beta',
        salonId: IDS.salonB,
        phoneBase: '551190000020',
        suffix: 'Beta',
      },
    ];

    for (const data of dataset) {
      const services = servicesFor(data.key, data.salonId, data.suffix);
      const clients = clientsFor(
        data.key,
        data.salonId,
        data.phoneBase,
        data.suffix,
      );

      for (const service of services) {
        await prisma.servico.upsert({
          where: { id: service.id },
          update: service,
          create: service,
        });
      }

      for (const client of clients) {
        await prisma.cliente.upsert({
          where: { id: client.id },
          update: client,
          create: client,
        });
      }

      for (const [index, spec] of APPOINTMENT_SPECS.entries()) {
        const client = clients[spec.client];
        const service = services[spec.service];
        const appointment = {
          id: `demo-${data.key}-agendamento-${String(index + 1).padStart(2, '0')}`,
          dataHora: at(spec.day, spec.time),
          duracao: spec.duration,
          status: spec.status,
          observacoes: 'Agendamento fictício do seed demo',
          salaoId: data.salonId,
          clienteId: client.id,
          servicoId: service.id,
        };
        await prisma.agendamento.upsert({
          where: { id: appointment.id },
          update: appointment,
          create: appointment,
        });
      }
    }

    const [users, salons, clients, services, appointments] = await Promise.all([
      prisma.usuario.count(),
      prisma.salao.count(),
      prisma.cliente.count(),
      prisma.servico.count(),
      prisma.agendamento.count(),
    ]);

    console.log('Seed demo concluído (dados fictícios, idempotente).');
    console.log(
      `usuarios=${users} saloes=${salons} clientes=${clients} servicos=${services} agendamentos=${appointments}`,
    );
    console.log(`salao_alfa=${IDS.salonA}`);
    console.log(`salao_beta=${IDS.salonB}`);
    console.log(`salao_inativo=${IDS.salonInactive}`);
  } finally {
    await prisma.$disconnect().catch(() => undefined);
    await pool.end().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error('Falha no seed demo:', error.message);
  process.exit(1);
});
