import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Clean existing data - order matters due to foreign keys
  await prisma.derechoPeticion.deleteMany()
  await prisma.cobroJuridico.deleteMany()
  await prisma.reintegro.deleteMany()
  await prisma.archivo.deleteMany()
  await prisma.rehabilitacion.deleteMany()
  await prisma.evidenciaRadicacion.deleteMany()
  await prisma.rechazoEPS.deleteMany()
  await prisma.subsanacion.deleteMany()
  await prisma.detalleCobro.deleteMany()
  await prisma.loteCobro.deleteMany()
  await prisma.seguimiento.deleteMany()
  await prisma.historialEstado.deleteMany()
  await prisma.documento.deleteMany()
  await prisma.documentoFisico.deleteMany()
  // Clear self-references before deleting incapacidades
  await prisma.incapacidad.updateMany({ where: { incapacidadOriginalId: { not: null } }, data: { incapacidadOriginalId: null } })
  await prisma.incapacidad.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.employee.deleteMany()
  await prisma.user.deleteMany()
  await prisma.parametro.deleteMany()
  await prisma.ePS.deleteMany()
  await prisma.aRL.deleteMany()

  // ==================== EPS ====================
  console.log('Creating EPS entities...')
  const epsData = [
    { nombre: 'Sanitas', nit: '860042298', portalWeb: 'https://www.epssanitas.com', portalDigital: true, diasTranscripcion: 30, tiempoRespuesta: 15, contacto: 'Carlos Mendoza', email: 'radicacion@epssanitas.com' },
    { nombre: 'Sura', nit: '890903729', portalWeb: 'https://www.epssura.com', portalDigital: true, diasTranscripcion: 30, tiempoRespuesta: 15, contacto: 'María López', email: 'radicacion@epssura.com' },
    { nombre: 'Coomeva', nit: '890900576', portalWeb: 'https://www.coomeva.com.co', portalDigital: true, diasTranscripcion: 30, tiempoRespuesta: 15, contacto: 'Ana Ramírez', email: 'radicacion@coomeva.com.co' },
    { nombre: 'Famisanar', nit: '860035527', portalWeb: 'https://www.famisanar.com.co', portalDigital: true, diasTranscripcion: 30, tiempoRespuesta: 15, contacto: 'Pedro Gómez', email: 'radicacion@famisanar.com.co' },
    { nombre: 'SOS', nit: '900127621', portalWeb: 'https://www.epssos.com.co', portalDigital: false, diasTranscripcion: 30, tiempoRespuesta: 20, contacto: 'Laura Martínez', email: 'radicacion@epssos.com.co' },
    { nombre: 'Nueva EPS', nit: '900156264', portalWeb: 'https://www.nuevaeps.com.co', portalDigital: true, diasTranscripcion: 30, tiempoRespuesta: 15, contacto: 'Jorge Castillo', email: 'radicacion@nuevaeps.com.co' },
    { nombre: 'Cafesalud', nit: '830003564', portalWeb: 'https://www.cafesalud.com.co', portalDigital: false, diasTranscripcion: 30, tiempoRespuesta: 20, contacto: 'Carmen Díaz', email: 'radicacion@cafesalud.com.co' },
    { nombre: 'Saludevida', nit: '830002273', portalWeb: 'https://www.saludevida.com.co', portalDigital: true, diasTranscripcion: 25, tiempoRespuesta: 15, contacto: 'Roberto Ruiz', email: 'radicacion@saludevida.com.co' },
    { nombre: 'Cruz Blanca', nit: '860002272', portalWeb: 'https://www.cruzblanca.com.co', portalDigital: true, diasTranscripcion: 30, tiempoRespuesta: 15, contacto: 'Patricia Torres', email: 'radicacion@cruzblanca.com.co' },
    { nombre: 'Compensar', nit: '860041916', portalWeb: 'https://www.compensar.com', portalDigital: true, diasTranscripcion: 30, tiempoRespuesta: 10, contacto: 'Fernando Vargas', email: 'radicacion@compensar.com' },
  ]

  const epsRecords = await Promise.all(
    epsData.map(data => prisma.ePS.create({ data }))
  )

  // ==================== ARL ====================
  console.log('Creating ARL entities...')
  const arlData = [
    { nombre: 'Sura', nit: '890903729', contacto: 'Andrés Pérez', email: 'arl@epssura.com' },
    { nombre: 'Colpatria', nit: '860005208', contacto: 'Diana Herrera', email: 'arl@colpatria.com' },
    { nombre: 'Positiva', nit: '900072219', contacto: 'Mauricio Silva', email: 'arl@positiva.com.co' },
    { nombre: 'Equidad', nit: '860035024', contacto: 'Viviana Castro', email: 'arl@equidad.com.co' },
  ]

  const arlRecords = await Promise.all(
    arlData.map(data => prisma.aRL.create({ data }))
  )

  // ==================== PARAMETERS ====================
  console.log('Creating system parameters...')
  const parametrosData = [
    { categoria: 'LEGALES', nombre: 'porcentajeEnfermedadComun', valor: '66.67', descripcion: 'Porcentaje de reconocimiento por enfermedad común' },
    { categoria: 'LEGALES', nombre: 'diasEmpleador', valor: '2', descripcion: 'Días a cargo del empleador en incapacidad por enfermedad común' },
    { categoria: 'LEGALES', nombre: 'porcentajeAccidenteTrabajo', valor: '100', descripcion: 'Porcentaje de reconocimiento por accidente de trabajo' },
    { categoria: 'LEGALES', nombre: 'porcentajeLicenciaMaternidad', valor: '100', descripcion: 'Porcentaje de reconocimiento por licencia de maternidad' },
    { categoria: 'LEGALES', nombre: 'porcentajeLicenciaPaternidad', valor: '100', descripcion: 'Porcentaje de reconocimiento por licencia de paternidad' },
    { categoria: 'TIEMPOS', nombre: 'umbralLargoPlazo', valor: '90', descripcion: 'Días para considerar incapacidad de largo plazo' },
    { categoria: 'TIEMPOS', nombre: 'umbralFondoPension', valor: '180', descripcion: 'Días para iniciar trámite ante fondo de pensiones' },
    { categoria: 'TIEMPOS', nombre: 'plazoSubsanacion', valor: '3', descripcion: 'Días hábiles para subsanar documentos' },
    { categoria: 'TIEMPOS', nombre: 'recordatorioSubsanacion', valor: '1', descripcion: 'Días antes del vencimiento para enviar recordatorio de subsanación' },
    { categoria: 'TIEMPOS', nombre: 'tiempoMaximoTranscripcion', valor: '30', descripcion: 'Días máximo para transcribir incapacidad en portal EPS' },
    { categoria: 'TIEMPOS', nombre: 'tiempoRespuestaEPS', valor: '15', descripcion: 'Días para respuesta de EPS por defecto' },
    { categoria: 'COBRO', nombre: 'diasInicioCobroPersuasivo', valor: '30', descripcion: 'Días sin respuesta para iniciar cobro persuasivo' },
    { categoria: 'COBRO', nombre: 'diasInicioCobroJuridico', valor: '60', descripcion: 'Días sin respuesta para iniciar cobro jurídico' },
    { categoria: 'COBRO', nombre: 'diasInicioDerechoPeticion', valor: '15', descripcion: 'Días sin respuesta para derecho de petición' },
    { categoria: 'ENTIDADES', nombre: 'reintegroMayor180', valor: 'true', descripcion: 'Requiere reintegro si incapacidad supera 180 días' },
  ]

  await Promise.all(
    parametrosData.map(data => prisma.parametro.create({ data }))
  )

  // ==================== USERS ====================
  console.log('Creating users...')

  const adminPassword = await hash('Admin123', 12)
  const admin = await prisma.user.create({
    data: {
      email: 'admin@medisoft.com',
      password: adminPassword,
      name: 'Administrador del Sistema',
      document: '99999999',
      role: 'ADMIN',
      active: true,
    },
  })

  const empPassword = await hash('Emp12345', 12)
  const empleado1 = await prisma.user.create({
    data: {
      email: 'empleado1@medisoft.com',
      password: empPassword,
      name: 'Carlos Rodríguez Pérez',
      document: '10000001',
      role: 'EMPLEADO',
      active: true,
    },
  })

  const ghPassword = await hash('GH12345', 12)
  const auxGH = await prisma.user.create({
    data: {
      email: 'gh@medisoft.com',
      password: ghPassword,
      name: 'María González López',
      document: '20000001',
      role: 'AUXILIAR_GH',
      active: true,
    },
  })

  const gerPassword = await hash('Ger12345', 12)
  const gerencia = await prisma.user.create({
    data: {
      email: 'gerencia@medisoft.com',
      password: gerPassword,
      name: 'Juan Martín Velásquez',
      document: '30000001',
      role: 'GERENCIA',
      active: true,
    },
  })

  const contPassword = await hash('Cont12345', 12)
  const contabilidad = await prisma.user.create({
    data: {
      email: 'contabilidad@medisoft.com',
      password: contPassword,
      name: 'Ana Patricia Restrepo',
      document: '40000001',
      role: 'CONTABILIDAD',
      active: true,
    },
  })

  const abogPassword = await hash('Abog12345', 12)
  const abogado = await prisma.user.create({
    data: {
      email: 'abogado@medisoft.com',
      password: abogPassword,
      name: 'Roberto Díaz Castillo',
      document: '50000001',
      role: 'ABOGADO',
      active: true,
    },
  })

  // ==================== EMPLOYEES ====================
  console.log('Creating employee records...')
  
  const sanitas = epsRecords[0] // Sanitas
  const suraEPS = epsRecords[1] // Sura
  const coomeva = epsRecords[2] // Coomeva
  const famisanar = epsRecords[3] // Famisanar
  const suraARL = arlRecords[0] // Sura ARL
  const positiva = arlRecords[2] // Positiva ARL

  await prisma.employee.create({
    data: {
      userId: empleado1.id,
      document: '10000001',
      name: 'Carlos Rodríguez Pérez',
      email: 'empleado1@medisoft.com',
      phone: '3101234567',
      area: 'Tecnología',
      cargo: 'Desarrollador de Software',
      salary: 4500000,
      epsId: sanitas.id,
      arlId: suraARL.id,
      active: true,
    },
  })

  await prisma.employee.create({
    data: {
      userId: auxGH.id,
      document: '20000001',
      name: 'María González López',
      email: 'gh@medisoft.com',
      phone: '3102345678',
      area: 'Gestión Humana',
      cargo: 'Auxiliar de Gestión Humana',
      salary: 3200000,
      epsId: suraEPS.id,
      arlId: positiva.id,
      active: true,
    },
  })

  await prisma.employee.create({
    data: {
      userId: gerencia.id,
      document: '30000001',
      name: 'Juan Martín Velásquez',
      email: 'gerencia@medisoft.com',
      phone: '3103456789',
      area: 'Gerencia',
      cargo: 'Gerente General',
      salary: 12000000,
      epsId: coomeva.id,
      arlId: suraARL.id,
      active: true,
    },
  })

  await prisma.employee.create({
    data: {
      userId: contabilidad.id,
      document: '40000001',
      name: 'Ana Patricia Restrepo',
      email: 'contabilidad@medisoft.com',
      phone: '3104567890',
      area: 'Contabilidad',
      cargo: 'Contadora',
      salary: 4800000,
      epsId: famisanar.id,
      arlId: positiva.id,
      active: true,
    },
  })

  await prisma.employee.create({
    data: {
      userId: abogado.id,
      document: '50000001',
      name: 'Roberto Díaz Castillo',
      email: 'abogado@medisoft.com',
      phone: '3105678901',
      area: 'Jurídica',
      cargo: 'Abogado Corporativo',
      salary: 6500000,
      epsId: sanitas.id,
      arlId: suraARL.id,
      active: true,
    },
  })

  // ==================== SAMPLE NOTIFICATIONS ====================
  console.log('Creating sample notifications...')
  
  await prisma.notification.createMany({
    data: [
      {
        userId: empleado1.id,
        tipo: 'SISTEMA',
        titulo: 'Bienvenido a Medisoft',
        mensaje: 'Su cuenta ha sido creada exitosamente. Puede registrar sus incapacidades desde la sección "Mis Incapacidades".',
        leida: false,
      },
      {
        userId: auxGH.id,
        tipo: 'SISTEMA',
        titulo: 'Bienvenido a Medisoft',
        mensaje: 'Su cuenta de Gestión Humana ha sido configurada. Revise las incapacidades pendientes de validación.',
        leida: false,
      },
      {
        userId: auxGH.id,
        tipo: 'ALERTA',
        titulo: 'Incapacidades pendientes de revisión',
        mensaje: 'Tiene incapacidades pendientes de validación en el sistema. Por favor revise la sección de Pendientes.',
        leida: false,
      },
      {
        userId: gerencia.id,
        tipo: 'SISTEMA',
        titulo: 'Bienvenido a Medisoft',
        mensaje: 'Su cuenta de Gerencia ha sido configurada. Acceda a los reportes y consultas del sistema.',
        leida: false,
      },
      {
        userId: contabilidad.id,
        tipo: 'SISTEMA',
        titulo: 'Bienvenido a Medisoft',
        mensaje: 'Su cuenta de Contabilidad ha sido configurada. Revise la conciliación bancaria y reintegros.',
        leida: false,
      },
      {
        userId: abogado.id,
        tipo: 'SISTEMA',
        titulo: 'Bienvenido a Medisoft',
        mensaje: 'Su cuenta de Abogado ha sido configurada. Revise los rechazos de EPS y cobros jurídicos.',
        leida: false,
      },
      {
        userId: admin.id,
        tipo: 'SISTEMA',
        titulo: 'Sistema inicializado',
        mensaje: 'El sistema Medisoft ha sido inicializado correctamente con todos los parámetros y entidades base.',
        leida: false,
      },
    ],
  })

  // ==================== SAMPLE INCAPACIDADES ====================
  console.log('Creating sample incapacidades...')

  const emp1 = await prisma.employee.findFirst({ where: { document: '10000001' } })
  const empGH = await prisma.employee.findFirst({ where: { document: '20000001' } })
  const empGer = await prisma.employee.findFirst({ where: { document: '30000001' } })
  const empCont = await prisma.employee.findFirst({ where: { document: '40000001' } })
  const empAbog = await prisma.employee.findFirst({ where: { document: '50000001' } })

  if (emp1 && empGH && empGer && empCont && empAbog) {
    // 1. Incapacidad RECIBIDA (just registered)
    const inc1 = await prisma.incapacidad.create({
      data: {
        radicado: 'INC-20260510-0001',
        empleadoId: emp1.id,
        epsId: sanitas.id,
        tipoNovedad: 'ENFERMEDAD_COMUN',
        estado: 'RECIBIDA',
        fechaInicio: new Date('2026-05-08'),
        fechaFin: new Date('2026-05-13'),
        diasIncapacidad: 5,
        diasAcumulados: 5,
        diagnosticoCIE10: 'J06.9',
        descripcionCIE10: 'Infección aguda de vías respiratorias superiores',
        fechaRegistro: new Date('2026-05-10'),
        observaciones: 'Certificado medico adjuntado correctamente.',
      },
    })
    await prisma.historialEstado.create({ data: { incapacidadId: inc1.id, estadoNuevo: 'RECIBIDA', accion: 'Registro de incapacidad', observaciones: 'Registro inicial por empleado' } })
    await prisma.documento.createMany({ data: [
      { incapacidadId: inc1.id, tipoDocumento: 'CERTIFICADO_ORIGINAL', nombreArchivo: 'certificado_incapacidad.pdf', rutaArchivo: '/uploads/inc1/certificado.pdf', formato: 'PDF', pesoKB: 250, obligatorio: true, aprobado: null },
    ]})

    // 2. Incapacidad PENDIENTE_SUBSANACION (needs docs)
    const inc2 = await prisma.incapacidad.create({
      data: {
        radicado: 'INC-20260505-0002',
        empleadoId: emp1.id,
        epsId: sanitas.id,
        tipoNovedad: 'ENFERMEDAD_COMUN',
        estado: 'PENDIENTE_SUBSANACION',
        fechaInicio: new Date('2026-05-01'),
        fechaFin: new Date('2026-05-07'),
        diasIncapacidad: 6,
        diasAcumulados: 6,
        diagnosticoCIE10: 'M54.5',
        descripcionCIE10: 'Lumbalgia baja',
        fechaRegistro: new Date('2026-05-05'),
        observaciones: 'Epicrisis ilegible, requiere reenvío.',
      },
    })
    await prisma.historialEstado.createMany({ data: [
      { incapacidadId: inc2.id, estadoNuevo: 'RECIBIDA', accion: 'Registro', observaciones: 'Registro inicial' },
      { incapacidadId: inc2.id, estadoAnterior: 'RECIBIDA', estadoNuevo: 'PENDIENTE_SUBSANACION', accion: 'Solicitar subsanación', observaciones: 'Epicrisis ilegible' },
    ]})
    await prisma.documento.createMany({ data: [
      { incapacidadId: inc2.id, tipoDocumento: 'CERTIFICADO_ORIGINAL', nombreArchivo: 'certificado.pdf', rutaArchivo: '/uploads/inc2/certificado.pdf', formato: 'PDF', pesoKB: 180, obligatorio: true, aprobado: true },
      { incapacidadId: inc2.id, tipoDocumento: 'EPICRISIS', nombreArchivo: 'epicrisis.pdf', rutaArchivo: '/uploads/inc2/epicrisis.pdf', formato: 'PDF', pesoKB: 95, obligatorio: true, aprobado: false, observaciones: 'Ilegible' },
    ]})
    await prisma.subsanacion.create({ data: {
      incapacidadId: inc2.id,
      fechaSolicitud: new Date('2026-05-06'),
      fechaLimite: new Date('2026-05-11'),
      estado: 'PENDIENTE',
      documentosFaltantes: 'Epicrisis legible',
      recordatoriosEnviados: 1,
    }})

    // 3. Incapacidad VALIDADA (ready for transcription)
    const inc3 = await prisma.incapacidad.create({
      data: {
        radicado: 'INC-20260428-0003',
        empleadoId: empGH.id,
        epsId: suraEPS.id,
        tipoNovedad: 'ENFERMEDAD_COMUN',
        estado: 'VALIDADA',
        fechaInicio: new Date('2026-04-25'),
        fechaFin: new Date('2026-04-30'),
        diasIncapacidad: 5,
        diasAcumulados: 5,
        diagnosticoCIE10: 'K21.0',
        descripcionCIE10: 'Reflujo gastroesofágico',
        fechaRegistro: new Date('2026-04-28'),
        fechaValidacion: new Date('2026-04-29'),
      },
    })
    await prisma.historialEstado.createMany({ data: [
      { incapacidadId: inc3.id, estadoNuevo: 'RECIBIDA', accion: 'Registro', observaciones: 'Registro inicial' },
      { incapacidadId: inc3.id, estadoAnterior: 'RECIBIDA', estadoNuevo: 'VALIDADA', accion: 'Aprobación documentación', observaciones: 'Documentación completa y legible' },
    ]})

    // 4. Incapacidad TRANSCRITA (ready for cobro)
    const inc4 = await prisma.incapacidad.create({
      data: {
        radicado: 'INC-20260415-0004',
        empleadoId: empGer.id,
        epsId: coomeva.id,
        tipoNovedad: 'ENFERMEDAD_COMUN',
        estado: 'TRANSCRITA',
        fechaInicio: new Date('2026-04-10'),
        fechaFin: new Date('2026-04-18'),
        diasIncapacidad: 8,
        diasAcumulados: 8,
        diagnosticoCIE10: 'F41.1',
        descripcionCIE10: 'Trastorno de ansiedad generalizada',
        fechaRegistro: new Date('2026-04-15'),
        fechaValidacion: new Date('2026-04-16'),
        fechaTranscripcion: new Date('2026-04-18'),
        valorCobro: (12000000 / 30) * 8 * 0.6667,
      },
    })
    await prisma.historialEstado.createMany({ data: [
      { incapacidadId: inc4.id, estadoNuevo: 'RECIBIDA', accion: 'Registro' },
      { incapacidadId: inc4.id, estadoAnterior: 'RECIBIDA', estadoNuevo: 'VALIDADA', accion: 'Aprobación' },
      { incapacidadId: inc4.id, estadoAnterior: 'VALIDADA', estadoNuevo: 'TRANSCRITA', accion: 'Transcripción EPS', observaciones: 'Radicado EPS: COO-2026-04521' },
    ]})

    // 5. Incapacidad EN_COBRO (in billing)
    const inc5 = await prisma.incapacidad.create({
      data: {
        radicado: 'INC-20260320-0005',
        empleadoId: empCont.id,
        epsId: famisanar.id,
        tipoNovedad: 'ENFERMEDAD_COMUN',
        estado: 'EN_COBRO',
        fechaInicio: new Date('2026-03-15'),
        fechaFin: new Date('2026-03-25'),
        diasIncapacidad: 10,
        diasAcumulados: 10,
        diagnosticoCIE10: 'N39.0',
        descripcionCIE10: 'Infección urinaria',
        fechaRegistro: new Date('2026-03-20'),
        fechaValidacion: new Date('2026-03-21'),
        fechaTranscripcion: new Date('2026-03-23'),
        fechaCobro: new Date('2026-03-28'),
        valorCobro: (4800000 / 30) * 10 * 0.6667,
      },
    })
    await prisma.historialEstado.createMany({ data: [
      { incapacidadId: inc5.id, estadoNuevo: 'RECIBIDA', accion: 'Registro' },
      { incapacidadId: inc5.id, estadoAnterior: 'RECIBIDA', estadoNuevo: 'VALIDADA', accion: 'Aprobación' },
      { incapacidadId: inc5.id, estadoAnterior: 'VALIDADA', estadoNuevo: 'TRANSCRITA', accion: 'Transcripción' },
      { incapacidadId: inc5.id, estadoAnterior: 'TRANSCRITA', estadoNuevo: 'EN_COBRO', accion: 'Lote de cobro generado' },
    ]})

    // 6. Incapacidad RECHAZADA_ENTIDAD
    const inc6 = await prisma.incapacidad.create({
      data: {
        radicado: 'INC-20260401-0006',
        empleadoId: emp1.id,
        epsId: sanitas.id,
        tipoNovedad: 'ENFERMEDAD_COMUN',
        estado: 'RECHAZADA_ENTIDAD',
        fechaInicio: new Date('2026-03-28'),
        fechaFin: new Date('2026-04-05'),
        diasIncapacidad: 8,
        diasAcumulados: 8,
        diagnosticoCIE10: 'S93.4',
        descripcionCIE10: 'Esguince de tobillo',
        fechaRegistro: new Date('2026-04-01'),
        fechaValidacion: new Date('2026-04-02'),
        fechaTranscripcion: new Date('2026-04-04'),
        observaciones: 'EPS rechaza por documentación incompleta',
      },
    })
    await prisma.historialEstado.createMany({ data: [
      { incapacidadId: inc6.id, estadoNuevo: 'RECIBIDA', accion: 'Registro' },
      { incapacidadId: inc6.id, estadoAnterior: 'RECIBIDA', estadoNuevo: 'VALIDADA', accion: 'Aprobación' },
      { incapacidadId: inc6.id, estadoAnterior: 'VALIDADA', estadoNuevo: 'TRANSCRITA', accion: 'Transcripción' },
      { incapacidadId: inc6.id, estadoAnterior: 'TRANSCRITA', estadoNuevo: 'RECHAZADA_ENTIDAD', accion: 'Rechazo EPS' },
    ]})
    await prisma.rechazoEPS.create({ data: {
      incapacidadId: inc6.id,
      causal: 'DOCUMENTAL',
      descripcion: 'Certificado médico no incluye número de registro profesional del médico tratante',
      fechaRechazo: new Date('2026-04-10'),
      esSubsanable: true,
      gestionado: false,
    }})

    // 7. Incapacidad COBRO_PERSUASIVO
    const inc7 = await prisma.incapacidad.create({
      data: {
        radicado: 'INC-20260210-0007',
        empleadoId: empAbog.id,
        epsId: sanitas.id,
        tipoNovedad: 'ACCIDENTE_TRABAJO',
        estado: 'COBRO_PERSUASIVO',
        fechaInicio: new Date('2026-02-01'),
        fechaFin: new Date('2026-02-10'),
        diasIncapacidad: 9,
        diasAcumulados: 9,
        diagnosticoCIE10: 'S62.3',
        descripcionCIE10: 'Fractura de hueso del carpo',
        fechaRegistro: new Date('2026-02-10'),
        fechaValidacion: new Date('2026-02-11'),
        fechaTranscripcion: new Date('2026-02-13'),
        valorCobro: (6500000 / 30) * 9,
        observaciones: 'Accidente de trabajo - 100% reconocimiento',
      },
    })
    await prisma.historialEstado.createMany({ data: [
      { incapacidadId: inc7.id, estadoNuevo: 'RECIBIDA', accion: 'Registro' },
      { incapacidadId: inc7.id, estadoAnterior: 'RECIBIDA', estadoNuevo: 'VALIDADA', accion: 'Aprobación' },
      { incapacidadId: inc7.id, estadoAnterior: 'VALIDADA', estadoNuevo: 'TRANSCRITA', accion: 'Transcripción' },
      { incapacidadId: inc7.id, estadoAnterior: 'TRANSCRITA', estadoNuevo: 'EN_COBRO', accion: 'Cobro solicitado' },
      { incapacidadId: inc7.id, estadoAnterior: 'EN_COBRO', estadoNuevo: 'RECHAZADA_ENTIDAD', accion: 'Rechazo EPS' },
      { incapacidadId: inc7.id, estadoAnterior: 'RECHAZADA_ENTIDAD', estadoNuevo: 'COBRO_PERSUASIVO', accion: 'Derivación a cobro persuasivo' },
    ]})
    await prisma.rechazoEPS.create({ data: {
      incapacidadId: inc7.id,
      causal: 'DE_FONDO',
      descripcion: 'EPS indica que el accidente no fue laboral sino de origen común',
      fechaRechazo: new Date('2026-03-01'),
      esSubsanable: false,
      gestionado: true,
    }})
    await prisma.seguimiento.createMany({ data: [
      { incapacidadId: inc7.id, tipoAlerta: 'ROJO', accion: 'Primer requerimiento enviado', observaciones: 'Derecho de petición enviado a EPS Sanitas', fechaGestion: new Date('2026-03-15') },
    ]})

    // 8. Incapacidad COBRO_JURIDICO
    const inc8 = await prisma.incapacidad.create({
      data: {
        radicado: 'INC-20260105-0008',
        empleadoId: empGH.id,
        epsId: suraEPS.id,
        tipoNovedad: 'ENFERMEDAD_COMUN',
        estado: 'COBRO_JURIDICO',
        fechaInicio: new Date('2025-12-20'),
        fechaFin: new Date('2026-01-05'),
        diasIncapacidad: 16,
        diasAcumulados: 16,
        diagnosticoCIE10: 'G43.9',
        descripcionCIE10: 'Migraña no especificada',
        fechaRegistro: new Date('2026-01-05'),
        fechaValidacion: new Date('2026-01-06'),
        fechaTranscripcion: new Date('2026-01-08'),
        valorCobro: (3200000 / 30) * 16 * 0.6667,
      },
    })
    await prisma.historialEstado.createMany({ data: [
      { incapacidadId: inc8.id, estadoNuevo: 'RECIBIDA', accion: 'Registro' },
      { incapacidadId: inc8.id, estadoAnterior: 'RECIBIDA', estadoNuevo: 'VALIDADA', accion: 'Aprobación' },
      { incapacidadId: inc8.id, estadoAnterior: 'VALIDADA', estadoNuevo: 'TRANSCRITA', accion: 'Transcripción' },
      { incapacidadId: inc8.id, estadoAnterior: 'TRANSCRITA', estadoNuevo: 'EN_COBRO', accion: 'Cobro' },
      { incapacidadId: inc8.id, estadoAnterior: 'EN_COBRO', estadoNuevo: 'RECHAZADA_ENTIDAD', accion: 'Rechazo' },
      { incapacidadId: inc8.id, estadoAnterior: 'RECHAZADA_ENTIDAD', estadoNuevo: 'COBRO_PERSUASIVO', accion: 'Cobro persuasivo' },
      { incapacidadId: inc8.id, estadoAnterior: 'COBRO_PERSUASIVO', estadoNuevo: 'COBRO_JURIDICO', accion: 'Derivación a jurídico' },
    ]})
    await prisma.cobroJuridico.create({ data: {
      incapacidadId: inc8.id,
      estado: 'DERECHO_PETICION',
      analisisLegal: 'Caso viable. EPS rechazó sin fundamentos médicos. Se recomienda derecho de petición seguido de tutela.',
      estrategia: '1. Derecho de petición (15 días). 2. Si no hay respuesta favorable, acción de tutela.',
      radicadoDP: 'DP-2026-00123',
      fechaRadicadoDP: new Date('2026-03-20'),
    }})

    // 9. Incapacidad PAGADA (completed cycle)
    const inc9 = await prisma.incapacidad.create({
      data: {
        radicado: 'INC-20260201-0009',
        empleadoId: empGer.id,
        epsId: coomeva.id,
        tipoNovedad: 'LICENCIA_MATERNIDAD',
        estado: 'PAGADA',
        fechaInicio: new Date('2026-01-15'),
        fechaFin: new Date('2026-05-20'),
        diasIncapacidad: 126,
        diasAcumulados: 126,
        diagnosticoCIE10: 'Z37.0',
        descripcionCIE10: 'Parto único vivo',
        fechaRegistro: new Date('2026-02-01'),
        fechaValidacion: new Date('2026-02-02'),
        fechaTranscripcion: new Date('2026-02-04'),
        fechaCobro: new Date('2026-02-10'),
        fechaPago: new Date('2026-03-15'),
        valorCobro: (12000000 / 30) * 126,
        valorPagado: (12000000 / 30) * 126,
      },
    })
    await prisma.historialEstado.createMany({ data: [
      { incapacidadId: inc9.id, estadoNuevo: 'RECIBIDA', accion: 'Registro' },
      { incapacidadId: inc9.id, estadoAnterior: 'RECIBIDA', estadoNuevo: 'VALIDADA', accion: 'Aprobación' },
      { incapacidadId: inc9.id, estadoAnterior: 'VALIDADA', estadoNuevo: 'TRANSCRITA', accion: 'Transcripción' },
      { incapacidadId: inc9.id, estadoAnterior: 'TRANSCRITA', estadoNuevo: 'EN_COBRO', accion: 'Cobro' },
      { incapacidadId: inc9.id, estadoAnterior: 'EN_COBRO', estadoNuevo: 'PAGADA', accion: 'Pago recibido', observaciones: 'Pago completo de EPS Coomeva' },
    ]})

    // 10. Incapacidad largo plazo (>90 días, TRAMITE_PENSION)
    const inc10 = await prisma.incapacidad.create({
      data: {
        radicado: 'INC-20251101-0010',
        empleadoId: emp1.id,
        epsId: sanitas.id,
        tipoNovedad: 'ENFERMEDAD_COMUN',
        estado: 'TRAMITE_PENSION',
        fechaInicio: new Date('2025-11-01'),
        fechaFin: new Date('2026-05-15'),
        diasIncapacidad: 195,
        diasAcumulados: 195,
        diagnosticoCIE10: 'F32.1',
        descripcionCIE10: 'Episodio depresivo moderado',
        fechaRegistro: new Date('2025-11-01'),
        fechaValidacion: new Date('2025-11-02'),
        fechaTranscripcion: new Date('2025-11-04'),
        observaciones: 'Caso de largo plazo con prórrogas. Remitido a Fondo de Pensiones.',
      },
    })
    await prisma.historialEstado.createMany({ data: [
      { incapacidadId: inc10.id, estadoNuevo: 'RECIBIDA', accion: 'Registro' },
      { incapacidadId: inc10.id, estadoAnterior: 'RECIBIDA', estadoNuevo: 'VALIDADA', accion: 'Aprobación' },
      { incapacidadId: inc10.id, estadoAnterior: 'VALIDADA', estadoNuevo: 'TRANSCRITA', accion: 'Transcripción' },
      { incapacidadId: inc10.id, estadoAnterior: 'TRANSCRITA', estadoNuevo: 'TRAMITE_PENSION', accion: 'Remisión a Fondo de Pensiones', observaciones: 'Día 181 - Inicio trámite ante Fondo de Pensiones' },
    ]})

    // 11. Another TRANSCRITA for cobro grouping
    const inc11 = await prisma.incapacidad.create({
      data: {
        radicado: 'INC-20260420-0011',
        empleadoId: emp1.id,
        epsId: sanitas.id,
        tipoNovedad: 'ENFERMEDAD_COMUN',
        estado: 'TRANSCRITA',
        fechaInicio: new Date('2026-04-15'),
        fechaFin: new Date('2026-04-20'),
        diasIncapacidad: 5,
        diasAcumulados: 200,
        diagnosticoCIE10: 'J18.9',
        descripcionCIE10: 'Neumonía no especificada',
        fechaRegistro: new Date('2026-04-20'),
        fechaValidacion: new Date('2026-04-21'),
        fechaTranscripcion: new Date('2026-04-23'),
        valorCobro: (4500000 / 30) * 5 * 0.6667,
      },
    })
    await prisma.historialEstado.createMany({ data: [
      { incapacidadId: inc11.id, estadoNuevo: 'RECIBIDA', accion: 'Registro' },
      { incapacidadId: inc11.id, estadoAnterior: 'RECIBIDA', estadoNuevo: 'VALIDADA', accion: 'Aprobación' },
      { incapacidadId: inc11.id, estadoAnterior: 'VALIDADA', estadoNuevo: 'TRANSCRITA', accion: 'Transcripción' },
    ]})

    // Create sample LoteCobro with the EN_COBRO incapacidad
    const lote = await prisma.loteCobro.create({
      data: {
        numeroLote: 'COB-20260328-0001',
        epsId: famisanar.id,
        estado: 'ENVIADO',
        valorTotal: (4800000 / 30) * 10 * 0.6667,
        fechaGeneracion: new Date('2026-03-28'),
        fechaEnvio: new Date('2026-03-29'),
      },
    })
    await prisma.detalleCobro.create({ data: {
      loteCobroId: lote.id,
      incapacidadId: inc5.id,
      valorEsperado: (4800000 / 30) * 10 * 0.6667,
      estado: 'PENDIENTE',
    }})

    // Derecho de petición for the cobro persuasivo case
    await prisma.derechoPeticion.create({ data: {
      incapacidadId: inc7.id,
      tipo: 'FALTA_PAGO',
      contenido: 'Con base en los artículos 23 y 86 de la Constitución Política, y la Ley 1751 de 2015, solicitamos respetuosamente el reconocimiento y pago de la incapacidad radicada bajo el número INC-20260210-0007, correspondiente a accidente de trabajo.',
      estado: 'RADICADO',
      radicado: 'DP-2026-00456',
      fechaRadicado: new Date('2026-03-20'),
    }})
  }

  console.log('Seed completed successfully!')
  console.log(`   - ${epsRecords.length} EPS entities`)
  console.log(`   - ${arlRecords.length} ARL entities`)
  console.log(`   - ${parametrosData.length} System parameters`)
  console.log(`   - 6 Users (1 admin + 5 employees)`)
  console.log(`   - 5 Employee records`)
  console.log(`   - 7 Sample notifications`)
  console.log(`   - 11 Sample incapacidades (various states)`)
  console.log(`   - 1 Sample lote de cobro`)
}

main()
  .catch(e => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
