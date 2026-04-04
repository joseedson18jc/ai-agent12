import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed do banco de dados...');

  // Clean existing data (in reverse dependency order)
  await prisma.auditLog.deleteMany();
  await prisma.cashMovement.deleteMany();
  await prisma.cashRegister.deleteMany();
  await prisma.lensOrder.deleteMany();
  await prisma.installment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.salesOrderItem.deleteMany();
  await prisma.salesOrder.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.product.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.billToPay.deleteMany();
  await prisma.billCategory.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.laboratory.deleteMany();
  await prisma.user.deleteMany();
  await prisma.store.deleteMany();

  // ===== STORE CONFIG =====
  const store = await prisma.store.create({
    data: {
      name: 'Ótica Império - Centro',
      cnpj: '12345678000190',
      phone: '11987654321',
      email: 'contato@oticaimperio.com.br',
      address: 'Rua das Flores, 123 - Centro',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01010-010',
      defaultMarkup: 100,
      billAlertDays: 5,
      prescriptionAlertDays: 30,
      defaultMinStock: 2,
      printerType: 'A4',
    },
  });
  console.log('Loja criada:', store.name);

  // ===== USERS (upsert to guarantee admin always exists) =====
  const adminPassword = await bcrypt.hash('admin123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'priscila@oticaimperio.com.br' },
    update: { password: adminPassword, role: 'ADMIN', isActive: true, name: 'Priscila' },
    create: {
      name: 'Priscila',
      email: 'priscila@oticaimperio.com.br',
      password: adminPassword,
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log('Usuário admin pronto:', admin.email);

  // ===== CUSTOMERS =====
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        name: 'Ana Paula Oliveira',
        cpf: '52998224725',
        phone: '11999887766',
        whatsapp: '11999887766',
        email: 'ana.oliveira@email.com',
        birthDate: new Date('1985-03-15'),
        city: 'São Paulo',
        state: 'SP',
        neighborhood: 'Vila Mariana',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Carlos Eduardo Souza',
        cpf: '71428793860',
        phone: '11988776655',
        whatsapp: '11988776655',
        email: 'carlos.souza@email.com',
        birthDate: new Date('1978-07-22'),
        city: 'São Paulo',
        state: 'SP',
        neighborhood: 'Mooca',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Fernanda Costa Lima',
        cpf: '83279616204',
        phone: '11977665544',
        email: 'fernanda.lima@email.com',
        birthDate: new Date('1992-11-08'),
        city: 'Guarulhos',
        state: 'SP',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Roberto Almeida Pereira',
        cpf: '01234567890',
        phone: '11966554433',
        birthDate: new Date('1965-01-30'),
        city: 'São Paulo',
        state: 'SP',
        neighborhood: 'Pinheiros',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Juliana Mendes Barbosa',
        cpf: '98765432100',
        phone: '11955443322',
        whatsapp: '11955443322',
        email: 'juliana.barbosa@email.com',
        birthDate: new Date('1990-04-12'),
        city: 'São Paulo',
        state: 'SP',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Pedro Henrique Nascimento',
        phone: '11944332211',
        birthDate: new Date('2000-09-05'),
        city: 'Osasco',
        state: 'SP',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Mariana Ferreira Santos',
        cpf: '45678912300',
        phone: '11933221100',
        whatsapp: '11933221100',
        email: 'mariana.santos@email.com',
        birthDate: new Date('1988-12-20'),
        city: 'São Paulo',
        state: 'SP',
        neighborhood: 'Tatuapé',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Luciano Ribeiro da Silva',
        phone: '11922110099',
        birthDate: new Date('1975-06-17'),
        city: 'Santo André',
        state: 'SP',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Camila Rodrigues Martins',
        cpf: '32165498700',
        phone: '11911009988',
        email: 'camila.martins@email.com',
        birthDate: new Date('1995-02-28'),
        city: 'São Bernardo do Campo',
        state: 'SP',
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Thiago Carvalho Freitas',
        phone: '11900998877',
        whatsapp: '11900998877',
        birthDate: new Date('1982-08-14'),
        city: 'São Paulo',
        state: 'SP',
        neighborhood: 'Santana',
      },
    }),
  ]);
  console.log(`${customers.length} clientes criados`);

  // ===== SUPPLIERS =====
  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        name: 'Luxottica Brasil',
        cnpj: '01234567000198',
        contactName: 'Ricardo Gomes',
        contactRole: 'Representante Comercial',
        phone: '1140001234',
        email: 'vendas@luxottica.com.br',
        city: 'São Paulo',
        state: 'SP',
        category: 'Armações e Óculos de Sol',
        paymentTerms: '30/60/90',
      },
    }),
    prisma.supplier.create({
      data: {
        name: 'Essilor do Brasil',
        cnpj: '98765432000176',
        contactName: 'Patrícia Moraes',
        contactRole: 'Gerente de Contas',
        phone: '1140005678',
        email: 'vendas@essilor.com.br',
        city: 'São Paulo',
        state: 'SP',
        category: 'Lentes Oftálmicas',
        paymentTerms: '30/60',
      },
    }),
    prisma.supplier.create({
      data: {
        name: 'Hoya Vision Care',
        cnpj: '11223344000155',
        contactName: 'Marcos Tanaka',
        phone: '1140009012',
        email: 'contato@hoya.com.br',
        city: 'São Paulo',
        state: 'SP',
        category: 'Lentes Oftálmicas',
        paymentTerms: '28 dias',
      },
    }),
    prisma.supplier.create({
      data: {
        name: 'Carl Zeiss Vision',
        cnpj: '55667788000133',
        contactName: 'Helena Schmidt',
        phone: '1140003456',
        email: 'vendas@zeiss.com.br',
        city: 'São Paulo',
        state: 'SP',
        category: 'Lentes Premium',
        paymentTerms: '30/60/90',
      },
    }),
    prisma.supplier.create({
      data: {
        name: 'Chilli Beans',
        cnpj: '99887766000111',
        contactName: 'Bruno Ferreira',
        contactRole: 'Representante Regional',
        phone: '1140007890',
        email: 'wholesale@chillibeans.com.br',
        city: 'São Paulo',
        state: 'SP',
        category: 'Óculos de Sol e Acessórios',
        paymentTerms: '30 dias',
      },
    }),
  ]);
  console.log(`${suppliers.length} fornecedores criados`);

  // ===== PRODUCT CATEGORIES =====
  const categories = await Promise.all([
    prisma.productCategory.upsert({
      where: { name: 'Armações de Grau' },
      update: { type: 'FRAMES_PRESCRIPTION', defaultMarkup: 120 },
      create: { name: 'Armações de Grau', type: 'FRAMES_PRESCRIPTION', defaultMarkup: 120 },
    }),
    prisma.productCategory.upsert({
      where: { name: 'Armações de Sol' },
      update: { type: 'FRAMES_SUN', defaultMarkup: 100 },
      create: { name: 'Armações de Sol', type: 'FRAMES_SUN', defaultMarkup: 100 },
    }),
    prisma.productCategory.upsert({
      where: { name: 'Lentes Oftálmicas' },
      update: { type: 'OPHTHALMIC_LENSES', defaultMarkup: 150 },
      create: { name: 'Lentes Oftálmicas', type: 'OPHTHALMIC_LENSES', defaultMarkup: 150 },
    }),
    prisma.productCategory.upsert({
      where: { name: 'Lentes de Contato' },
      update: { type: 'CONTACT_LENSES', defaultMarkup: 80 },
      create: { name: 'Lentes de Contato', type: 'CONTACT_LENSES', defaultMarkup: 80 },
    }),
    prisma.productCategory.upsert({
      where: { name: 'Óculos de Sol Prontos' },
      update: { type: 'SUNGLASSES_READY', defaultMarkup: 100 },
      create: { name: 'Óculos de Sol Prontos', type: 'SUNGLASSES_READY', defaultMarkup: 100 },
    }),
    prisma.productCategory.upsert({
      where: { name: 'Acessórios' },
      update: { type: 'ACCESSORIES', defaultMarkup: 200 },
      create: { name: 'Acessórios', type: 'ACCESSORIES', defaultMarkup: 200 },
    }),
  ]);
  console.log(`${categories.length} categorias de produto criadas`);

  // ===== PRODUCTS =====
  const catGrau = categories[0];
  const catSol = categories[1];
  const catLentes = categories[2];
  const catContato = categories[3];
  const catSolPronto = categories[4];
  const catAcessorios = categories[5];

  const productsData = [
    // Armações de Grau
    { name: 'Ray-Ban RB5228', categoryId: catGrau.id, brand: 'Ray-Ban', model: 'RB5228', color: 'Preto', size: '53-17-140', material: 'Acetato', supplierId: suppliers[0].id, stock: 5, minStock: 2, costPrice: 180, taxFreight: 10, desiredMarkup: 120, sellingPrice: 420, minimumPrice: 300 },
    { name: 'Oakley OX8046 Airdrop', categoryId: catGrau.id, brand: 'Oakley', model: 'OX8046', color: 'Cinza Fumê', size: '55-18-143', material: 'O-Matter', supplierId: suppliers[0].id, stock: 3, minStock: 2, costPrice: 220, taxFreight: 10, desiredMarkup: 100, sellingPrice: 460, minimumPrice: 350 },
    { name: 'Ana Hickmann AH6425', categoryId: catGrau.id, brand: 'Ana Hickmann', model: 'AH6425', color: 'Rosa', size: '52-16-140', material: 'Acetato', supplierId: suppliers[0].id, stock: 4, minStock: 2, costPrice: 150, taxFreight: 8, desiredMarkup: 130, sellingPrice: 370, minimumPrice: 250 },
    { name: 'Vogue VO5285', categoryId: catGrau.id, brand: 'Vogue', model: 'VO5285', color: 'Tartaruga', size: '51-16-135', material: 'Acetato', supplierId: suppliers[0].id, stock: 6, minStock: 2, costPrice: 120, taxFreight: 8, desiredMarkup: 130, sellingPrice: 300, minimumPrice: 200 },
    { name: 'Ray-Ban RB7159', categoryId: catGrau.id, brand: 'Ray-Ban', model: 'RB7159', color: 'Havana', size: '52-20-145', material: 'Acetato', supplierId: suppliers[0].id, stock: 4, minStock: 2, costPrice: 190, taxFreight: 10, desiredMarkup: 120, sellingPrice: 440, minimumPrice: 310 },
    // Óculos de Sol Prontos
    { name: 'Ray-Ban Aviador RB3025', categoryId: catSolPronto.id, brand: 'Ray-Ban', model: 'RB3025', color: 'Dourado/Verde G15', size: '58-14-135', material: 'Metal', supplierId: suppliers[0].id, stock: 8, minStock: 3, costPrice: 250, taxFreight: 12, desiredMarkup: 100, sellingPrice: 530, minimumPrice: 400 },
    { name: 'Oakley Holbrook OO9102', categoryId: catSolPronto.id, brand: 'Oakley', model: 'OO9102', color: 'Preto Fosco/Prizm', size: '55-18-137', material: 'O-Matter', supplierId: suppliers[0].id, stock: 5, minStock: 2, costPrice: 280, taxFreight: 12, desiredMarkup: 90, sellingPrice: 560, minimumPrice: 430 },
    { name: 'Chilli Beans Aviador', categoryId: catSolPronto.id, brand: 'Chilli Beans', model: 'OC.MT.3320', color: 'Grafite', size: '57-16-140', material: 'Metal', supplierId: suppliers[4].id, stock: 10, minStock: 3, costPrice: 80, taxFreight: 5, desiredMarkup: 150, sellingPrice: 220, minimumPrice: 140 },
    { name: 'Arnette Fastball AN4202', categoryId: catSolPronto.id, brand: 'Arnette', model: 'AN4202', color: 'Preto/Cinza', size: '62-16-130', material: 'Nylon', supplierId: suppliers[0].id, stock: 6, minStock: 2, costPrice: 130, taxFreight: 8, desiredMarkup: 100, sellingPrice: 280, minimumPrice: 200 },
    // Lentes Oftálmicas
    { name: 'Essilor Crizal Sapphire 1.67', categoryId: catLentes.id, brand: 'Essilor', model: 'Crizal Sapphire', supplierId: suppliers[1].id, stock: 15, minStock: 5, costPrice: 180, taxFreight: 5, desiredMarkup: 150, sellingPrice: 465, minimumPrice: 300 },
    { name: 'Essilor Varilux Comfort 1.67', categoryId: catLentes.id, brand: 'Essilor', model: 'Varilux Comfort', supplierId: suppliers[1].id, stock: 8, minStock: 3, costPrice: 350, taxFreight: 10, desiredMarkup: 120, sellingPrice: 800, minimumPrice: 580 },
    { name: 'Transitions Signature Gen 8', categoryId: catLentes.id, brand: 'Transitions', model: 'Signature Gen 8', supplierId: suppliers[1].id, stock: 10, minStock: 4, costPrice: 220, taxFreight: 8, desiredMarkup: 140, sellingPrice: 550, minimumPrice: 380 },
    { name: 'Hoya Blue Control 1.60', categoryId: catLentes.id, brand: 'Hoya', model: 'Blue Control', supplierId: suppliers[2].id, stock: 12, minStock: 5, costPrice: 150, taxFreight: 5, desiredMarkup: 160, sellingPrice: 405, minimumPrice: 260 },
    { name: 'Zeiss DriveSafe 1.67', categoryId: catLentes.id, brand: 'Zeiss', model: 'DriveSafe', supplierId: suppliers[3].id, stock: 6, minStock: 2, costPrice: 400, taxFreight: 15, desiredMarkup: 100, sellingPrice: 835, minimumPrice: 620 },
    { name: 'Zeiss SmartLife Progressive', categoryId: catLentes.id, brand: 'Zeiss', model: 'SmartLife Progressive', supplierId: suppliers[3].id, stock: 4, minStock: 2, costPrice: 500, taxFreight: 15, desiredMarkup: 100, sellingPrice: 1035, minimumPrice: 770 },
    // Lentes de Contato
    { name: 'Acuvue Oasys (caixa 6)', categoryId: catContato.id, brand: 'Johnson & Johnson', model: 'Acuvue Oasys', supplierId: suppliers[1].id, stock: 20, minStock: 5, costPrice: 90, taxFreight: 5, desiredMarkup: 80, sellingPrice: 175, minimumPrice: 130 },
    { name: 'Air Optix Aqua (caixa 6)', categoryId: catContato.id, brand: 'Alcon', model: 'Air Optix Aqua', supplierId: suppliers[1].id, stock: 15, minStock: 5, costPrice: 85, taxFreight: 5, desiredMarkup: 80, sellingPrice: 165, minimumPrice: 120 },
    // Acessórios
    { name: 'Estojo Rígido Premium', categoryId: catAcessorios.id, brand: 'Ótica Império', stock: 30, minStock: 10, costPrice: 8, taxFreight: 1, desiredMarkup: 200, sellingPrice: 30, minimumPrice: 15 },
    { name: 'Spray Limpa Lentes 120ml', categoryId: catAcessorios.id, brand: 'Clean Vision', stock: 25, minStock: 10, costPrice: 5, taxFreight: 1, desiredMarkup: 200, sellingPrice: 20, minimumPrice: 12 },
    { name: 'Cordão Salva Óculos', categoryId: catAcessorios.id, brand: 'Ótica Império', stock: 20, minStock: 5, costPrice: 3, taxFreight: 0.5, desiredMarkup: 250, sellingPrice: 15, minimumPrice: 8 },
  ];

  const products = [];
  for (const p of productsData) {
    const totalCost = p.costPrice + (p.taxFreight ?? 0);
    const suggestedPrice = totalCost * (1 + (p.desiredMarkup ?? 100) / 100);
    const profitAmount = (p.sellingPrice ?? suggestedPrice) - totalCost;
    const marginPercent = totalCost > 0 ? (((p.sellingPrice ?? suggestedPrice) - totalCost) / (p.sellingPrice ?? suggestedPrice)) * 100 : 0;

    const product = await prisma.product.create({
      data: {
        name: p.name,
        categoryId: p.categoryId,
        brand: p.brand,
        model: p.model,
        color: p.color,
        size: p.size,
        material: p.material,
        supplierId: p.supplierId,
        stock: p.stock ?? 0,
        minStock: p.minStock ?? 2,
        costPrice: p.costPrice,
        taxFreight: p.taxFreight ?? 0,
        totalCost: Math.round(totalCost * 100) / 100,
        desiredMarkup: p.desiredMarkup ?? 100,
        suggestedPrice: Math.round(suggestedPrice * 100) / 100,
        minimumPrice: p.minimumPrice ?? Math.round(totalCost * 1.1 * 100) / 100,
        sellingPrice: p.sellingPrice ?? Math.round(suggestedPrice * 100) / 100,
        marginPercent: Math.round(marginPercent * 100) / 100,
        profitAmount: Math.round(profitAmount * 100) / 100,
      },
    });
    products.push(product);
  }
  console.log(`${products.length} produtos criados`);

  // ===== PRESCRIPTIONS =====
  const prescriptions = await Promise.all([
    prisma.prescription.create({
      data: {
        customerId: customers[0].id,
        date: new Date('2025-10-15'),
        doctor: 'Dr. Fernando Carvalho',
        doctorCrm: 'CRM/SP 54321',
        validity: new Date('2026-10-15'),
        odSpherical: -2.00,
        odCylindrical: -0.75,
        odAxis: 180,
        odDnp: 31.5,
        oeSphrical: -1.75,
        oeCylindrical: -0.50,
        oeAxis: 175,
        oeDnp: 31.0,
        lensType: 'SINGLE_VISION',
        treatments: ['ANTIREFLECTIVE', 'BLUE_LIGHT'],
      },
    }),
    prisma.prescription.create({
      data: {
        customerId: customers[1].id,
        date: new Date('2025-08-20'),
        doctor: 'Dra. Lucia Menezes',
        doctorCrm: 'CRM/SP 67890',
        validity: new Date('2026-08-20'),
        odSpherical: +1.50,
        odCylindrical: -0.50,
        odAxis: 90,
        odDnp: 32.0,
        odAddition: 2.00,
        oeSphrical: +1.25,
        oeCylindrical: -0.75,
        oeAxis: 85,
        oeDnp: 32.5,
        oeAddition: 2.00,
        lensType: 'MULTIFOCAL',
        treatments: ['ANTIREFLECTIVE', 'PHOTOCHROMIC'],
      },
    }),
    prisma.prescription.create({
      data: {
        customerId: customers[2].id,
        date: new Date('2025-12-01'),
        doctor: 'Dr. Paulo Ribeiro',
        doctorCrm: 'CRM/SP 11223',
        validity: new Date('2026-12-01'),
        odSpherical: -3.50,
        odCylindrical: -1.25,
        odAxis: 10,
        odDnp: 30.5,
        oeSphrical: -3.25,
        oeCylindrical: -1.00,
        oeAxis: 170,
        oeDnp: 30.0,
        lensType: 'SINGLE_VISION',
        treatments: ['ANTIREFLECTIVE', 'TRANSITIONS'],
      },
    }),
    prisma.prescription.create({
      data: {
        customerId: customers[3].id,
        date: new Date('2025-06-10'),
        doctor: 'Dr. Fernando Carvalho',
        doctorCrm: 'CRM/SP 54321',
        validity: new Date('2026-06-10'),
        odSpherical: +2.50,
        odDnp: 33.0,
        odAddition: 2.50,
        oeSphrical: +2.25,
        oeDnp: 33.5,
        oeAddition: 2.50,
        lensType: 'MULTIFOCAL',
        treatments: ['ANTIREFLECTIVE'],
      },
    }),
    prisma.prescription.create({
      data: {
        customerId: customers[4].id,
        date: new Date('2025-11-20'),
        doctor: 'Dra. Lucia Menezes',
        doctorCrm: 'CRM/SP 67890',
        validity: new Date('2026-11-20'),
        odSpherical: -1.00,
        odCylindrical: -0.25,
        odAxis: 5,
        odDnp: 30.0,
        oeSphrical: -0.75,
        oeDnp: 30.5,
        lensType: 'SINGLE_VISION',
        treatments: ['BLUE_LIGHT'],
      },
    }),
  ]);
  console.log(`${prescriptions.length} receitas criadas`);

  // ===== LABORATORIES =====
  const laboratories = await Promise.all([
    prisma.laboratory.create({
      data: {
        name: 'Laboratório Visão Perfeita',
        phone: '1130001234',
        whatsapp: '11930001234',
        email: 'pedidos@visaoperfeita.com.br',
        contactName: 'Renata Oliveira',
        terms: '5-7 dias úteis, frete grátis acima de R$ 500',
      },
    }),
    prisma.laboratory.create({
      data: {
        name: 'Óptica Lab Express',
        phone: '1130005678',
        email: 'express@opticalab.com.br',
        contactName: 'Diego Martins',
        terms: '3-5 dias úteis, frete por conta do cliente',
      },
    }),
  ]);
  console.log(`${laboratories.length} laboratórios criados`);

  // ===== BILL CATEGORIES =====
  const billCategories = await Promise.all([
    prisma.billCategory.create({ data: { name: 'Aluguel' } }),
    prisma.billCategory.create({ data: { name: 'Energia' } }),
    prisma.billCategory.create({ data: { name: 'Água' } }),
    prisma.billCategory.create({ data: { name: 'Telefone' } }),
    prisma.billCategory.create({ data: { name: 'Salários' } }),
    prisma.billCategory.create({ data: { name: 'Impostos' } }),
    prisma.billCategory.create({ data: { name: 'Marketing' } }),
    prisma.billCategory.create({ data: { name: 'Manutenção' } }),
  ]);
  console.log(`${billCategories.length} categorias de contas criadas`);

  // ===== SALES ORDERS =====
  // Sale 1: Ana Paula - Armação + Lentes
  const sale1 = await prisma.salesOrder.create({
    data: {
      customerId: customers[0].id,
      prescriptionId: prescriptions[0].id,
      sellerId: admin.id,
      date: new Date('2026-03-15'),
      subtotal: 870,
      discountAmount: 50,
      total: 820,
      estimatedProfit: 445,
      status: 'DELIVERED',
      items: {
        create: [
          {
            productId: products[0].id, // Ray-Ban RB5228
            unitPrice: 420,
            quantity: 1,
            subtotal: 420,
            costPrice: 190,
          },
          {
            productId: products[9].id, // Essilor Crizal Sapphire
            unitPrice: 465,
            quantity: 1,
            discountAmount: 15,
            subtotal: 450,
            costPrice: 185,
          },
        ],
      },
      payments: {
        create: [
          {
            method: 'CREDIT_CARD',
            amount: 820,
            cardBrand: 'Visa',
            cardInstallments: 3,
          },
        ],
      },
    },
  });

  // Sale 2: Carlos - Multifocal premium
  const sale2 = await prisma.salesOrder.create({
    data: {
      customerId: customers[1].id,
      prescriptionId: prescriptions[1].id,
      sellerId: admin.id,
      date: new Date('2026-03-20'),
      subtotal: 1475,
      discountAmount: 75,
      total: 1400,
      estimatedProfit: 630,
      status: 'AWAITING_LENS',
      items: {
        create: [
          {
            productId: products[1].id, // Oakley Airdrop
            unitPrice: 460,
            quantity: 1,
            subtotal: 460,
            costPrice: 230,
          },
          {
            productId: products[14].id, // Zeiss SmartLife Progressive
            unitPrice: 1035,
            quantity: 1,
            discountAmount: 20,
            subtotal: 1015,
            costPrice: 515,
          },
        ],
      },
      payments: {
        create: [
          {
            method: 'PIX',
            amount: 700,
          },
          {
            method: 'CREDIT_CARD',
            amount: 700,
            cardBrand: 'Master',
            cardInstallments: 2,
          },
        ],
      },
    },
  });

  // Sale 3: Fernanda - Óculos de sol + acessórios
  const sale3 = await prisma.salesOrder.create({
    data: {
      customerId: customers[2].id,
      sellerId: admin.id,
      date: new Date('2026-03-25'),
      subtotal: 580,
      discountAmount: 0,
      total: 580,
      estimatedProfit: 285,
      status: 'DELIVERED',
      items: {
        create: [
          {
            productId: products[5].id, // Ray-Ban Aviador
            unitPrice: 530,
            quantity: 1,
            subtotal: 530,
            costPrice: 262,
          },
          {
            productId: products[17].id, // Estojo
            unitPrice: 30,
            quantity: 1,
            subtotal: 30,
            costPrice: 9,
          },
          {
            productId: products[18].id, // Spray limpa lentes
            unitPrice: 20,
            quantity: 1,
            subtotal: 20,
            costPrice: 6,
          },
        ],
      },
      payments: {
        create: [
          { method: 'DEBIT_CARD', amount: 580, cardBrand: 'Visa' },
        ],
      },
    },
  });

  // Sale 4: Juliana - Armação + lentes com crediário
  const sale4 = await prisma.salesOrder.create({
    data: {
      customerId: customers[4].id,
      prescriptionId: prescriptions[4].id,
      sellerId: admin.id,
      date: new Date('2026-03-28'),
      subtotal: 705,
      discountAmount: 30,
      total: 675,
      estimatedProfit: 320,
      status: 'IN_PRODUCTION',
      items: {
        create: [
          {
            productId: products[3].id, // Vogue VO5285
            unitPrice: 300,
            quantity: 1,
            subtotal: 300,
            costPrice: 128,
          },
          {
            productId: products[12].id, // Hoya Blue Control
            unitPrice: 405,
            quantity: 1,
            subtotal: 405,
            costPrice: 155,
          },
        ],
      },
    },
  });

  // Create store credit payment with installments for sale4
  const storeCreditPayment = await prisma.payment.create({
    data: {
      salesOrderId: sale4.id,
      method: 'STORE_CREDIT',
      amount: 675,
      interestRate: 0,
    },
  });

  // Create installments
  const now = new Date();
  for (let i = 1; i <= 3; i++) {
    const dueDate = new Date(now);
    dueDate.setMonth(dueDate.getMonth() + i);
    await prisma.installment.create({
      data: {
        paymentId: storeCreditPayment.id,
        number: i,
        amount: 225,
        dueDate,
        status: i === 1 ? 'PAID' : 'PENDING',
        paidDate: i === 1 ? new Date('2026-04-01') : undefined,
        paidAmount: i === 1 ? 225 : undefined,
        paymentMethod: i === 1 ? 'PIX' : undefined,
      },
    });
  }

  // Sale 5: Thiago - Chilli Beans sol + acessórios (cash)
  const sale5 = await prisma.salesOrder.create({
    data: {
      customerId: customers[9].id,
      sellerId: admin.id,
      date: new Date('2026-04-01'),
      subtotal: 265,
      discountPercent: 5,
      discountAmount: 13.25,
      total: 251.75,
      estimatedProfit: 140,
      status: 'DELIVERED',
      items: {
        create: [
          {
            productId: products[7].id, // Chilli Beans Aviador
            unitPrice: 220,
            quantity: 1,
            subtotal: 220,
            costPrice: 85,
          },
          {
            productId: products[17].id, // Estojo
            unitPrice: 30,
            quantity: 1,
            subtotal: 30,
            costPrice: 9,
          },
          {
            productId: products[19].id, // Cordão
            unitPrice: 15,
            quantity: 1,
            subtotal: 15,
            costPrice: 3.5,
          },
        ],
      },
      payments: {
        create: [
          { method: 'CASH', amount: 251.75 },
        ],
      },
    },
  });

  console.log('5 vendas criadas com itens e pagamentos');

  // Create a lens order for sale 2
  await prisma.lensOrder.create({
    data: {
      salesOrderId: sale2.id,
      laboratoryId: laboratories[0].id,
      lensType: 'MULTIFOCAL',
      treatments: 'Antirreflexo + Fotossensível',
      expectedDelivery: new Date('2026-04-05'),
      cost: 450,
      status: 'IN_PRODUCTION',
      prescriptionData: {
        odSpherical: +1.50, odCylindrical: -0.50, odAxis: 90, odAddition: 2.00,
        oeSpherical: +1.25, oeCylindrical: -0.75, oeAxis: 85, oeAddition: 2.00,
      },
    },
  });

  // Create a lens order for sale 4
  await prisma.lensOrder.create({
    data: {
      salesOrderId: sale4.id,
      laboratoryId: laboratories[1].id,
      lensType: 'SINGLE_VISION',
      treatments: 'Blue Light Filter',
      expectedDelivery: new Date('2026-04-08'),
      cost: 120,
      status: 'ORDERED',
      prescriptionData: {
        odSpherical: -1.00, odCylindrical: -0.25, odAxis: 5,
        oeSpherical: -0.75,
      },
    },
  });
  console.log('2 pedidos de lente criados');

  // ===== BILLS TO PAY =====
  await Promise.all([
    prisma.billToPay.create({
      data: {
        description: 'Aluguel - Abril/2026',
        categoryId: billCategories[0].id,
        amount: 4500,
        dueDate: new Date('2026-04-10'),
        isRecurring: true,
        frequency: 'MONTHLY',
      },
    }),
    prisma.billToPay.create({
      data: {
        description: 'Conta de Energia - Março/2026',
        categoryId: billCategories[1].id,
        amount: 680,
        dueDate: new Date('2026-04-05'),
        status: 'PAID',
        paidDate: new Date('2026-04-03'),
        paymentMethod: 'PIX',
      },
    }),
    prisma.billToPay.create({
      data: {
        description: 'Conta de Água - Março/2026',
        categoryId: billCategories[2].id,
        amount: 180,
        dueDate: new Date('2026-04-08'),
      },
    }),
    prisma.billToPay.create({
      data: {
        description: 'Telefone/Internet - Abril/2026',
        categoryId: billCategories[3].id,
        amount: 250,
        dueDate: new Date('2026-04-15'),
        isRecurring: true,
        frequency: 'MONTHLY',
      },
    }),
    prisma.billToPay.create({
      data: {
        description: 'Google Ads - Março/2026',
        categoryId: billCategories[6].id,
        amount: 500,
        dueDate: new Date('2026-03-28'),
        status: 'OVERDUE',
        notes: 'Campanha de marketing digital',
      },
    }),
  ]);
  console.log('5 contas a pagar criadas');

  // ===== AUDIT LOG ENTRIES =====
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'SEED',
      entity: 'System',
      details: { message: 'Banco de dados populado com dados iniciais' },
    },
  });

  console.log('\nSeed concluído com sucesso!');
  console.log('========================================');
  console.log('Credenciais de acesso:');
  console.log('  Admin: priscila@oticaimperio.com.br / admin123');
  console.log('========================================');
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
