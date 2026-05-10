import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding MarkComm database...');

  // ── Admins ────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin@1234', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@markcomm.lk' },
    update: {},
    create: {
      email: 'admin@markcomm.lk',
      passwordHash: adminPassword,
      firstName: 'Platform',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });
  console.log('✅ Admin user:', admin.email);

  // ── Categories ────────────────────────────────────────────────
  const categories = [
    { name: "Men's Fashion", slug: 'mens-fashion', description: 'Clothing, footwear and accessories for men' },
    { name: "Women's Fashion", slug: 'womens-fashion', description: 'Clothing, footwear and accessories for women' },
    { name: 'Electronics', slug: 'electronics', description: 'Smartphones, laptops, cameras and accessories' },
    { name: 'Home & Garden', slug: 'home-garden', description: 'Furniture, décor and garden supplies' },
    { name: 'Sports & Outdoors', slug: 'sports-outdoors', description: 'Fitness equipment and outdoor gear' },
    { name: 'Beauty & Personal Care', slug: 'beauty-personal-care', description: 'Skincare, makeup and grooming' },
    { name: 'Books & Stationery', slug: 'books-stationery', description: 'Books, notebooks and office supplies' },
    { name: 'Food & Groceries', slug: 'food-groceries', description: 'Dry goods, spices and pantry staples' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { ...cat, isActive: true },
    });
  }
  console.log('✅ Categories created:', categories.length);

  // ── Demo Vendor ───────────────────────────────────────────────
  const vendorPassword = await bcrypt.hash('Demo@1234', 12);
  const vendorUser = await prisma.user.upsert({
    where: { email: 'vendor@fashionlk.lk' },
    update: {},
    create: {
      email: 'vendor@fashionlk.lk',
      passwordHash: vendorPassword,
      firstName: 'Amara',
      lastName: 'Silva',
      role: 'VENDOR_OWNER',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });

  const vendor = await prisma.vendorProfile.upsert({
    where: { userId: vendorUser.id },
    update: {},
    create: {
      userId: vendorUser.id,
      businessName: 'Fashion LK',
      businessType: 'SOLE_PROPRIETORSHIP',
      phone: '+94771234567',
      addressLine1: '45 Galle Road',
      city: 'Colombo',
      district: 'Colombo',
      province: 'WESTERN',
      postalCode: '00300',
      status: 'APPROVED',
      approvedAt: new Date(),
      approvedByAdminId: admin.id,
      onboardingStep: 'LIVE',
      onboardingCompletedAt: new Date(),
    },
  });

  await prisma.vendorStorefront.upsert({
    where: { vendorId: vendor.id },
    update: {},
    create: {
      vendorId: vendor.id,
      slug: 'fashion-lk',
      displayName: 'Fashion LK',
      tagline: 'Sri Lanka\'s Trendiest Online Boutique',
      description: 'Authentic Sri Lankan fashion — batiks, handlooms, and contemporary styles at great prices.',
      primaryColor: '#7c3aed',
    },
  });

  await prisma.payoutAccount.upsert({
    where: { vendorId: vendor.id },
    update: {},
    create: {
      vendorId: vendor.id,
      accountType: 'BANK',
      accountName: 'Amara Silva',
      bankName: 'PEOPLES_BANK',
      branchCode: '001',
      accountNumber: '0001234567890',
      isVerified: true,
      verifiedAt: new Date(),
    },
  });
  console.log('✅ Demo vendor: Fashion LK');

  // ── Demo Vendor 2 ─────────────────────────────────────────────
  const vendor2User = await prisma.user.upsert({
    where: { email: 'vendor@techzone.lk' },
    update: {},
    create: {
      email: 'vendor@techzone.lk',
      passwordHash: vendorPassword,
      firstName: 'Nuwan',
      lastName: 'Perera',
      role: 'VENDOR_OWNER',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });

  const vendor2 = await prisma.vendorProfile.upsert({
    where: { userId: vendor2User.id },
    update: {},
    create: {
      userId: vendor2User.id,
      businessName: 'Tech Zone LK',
      businessType: 'PVT_LTD',
      phone: '+94779876543',
      addressLine1: '120 R.A. De Mel Mawatha',
      city: 'Colombo',
      district: 'Colombo',
      province: 'WESTERN',
      postalCode: '00500',
      status: 'APPROVED',
      approvedAt: new Date(),
      approvedByAdminId: admin.id,
      onboardingStep: 'LIVE',
      onboardingCompletedAt: new Date(),
    },
  });

  await prisma.vendorStorefront.upsert({
    where: { vendorId: vendor2.id },
    update: {},
    create: {
      vendorId: vendor2.id,
      slug: 'tech-zone-lk',
      displayName: 'Tech Zone LK',
      tagline: 'Your Trusted Electronics Partner in Sri Lanka',
      primaryColor: '#0ea5e9',
    },
  });
  console.log('✅ Demo vendor: Tech Zone LK');

  // ── Demo Customer ─────────────────────────────────────────────
  const customerPassword = await bcrypt.hash('Demo@1234', 12);
  const customerUser = await prisma.user.upsert({
    where: { email: 'customer@demo.lk' },
    update: {},
    create: {
      email: 'customer@demo.lk',
      passwordHash: customerPassword,
      firstName: 'Sanduni',
      lastName: 'Rathnayake',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.customerProfile.upsert({
    where: { userId: customerUser.id },
    update: {},
    create: {
      userId: customerUser.id,
      firstName: 'Sanduni',
      lastName: 'Rathnayake',
      phone: '+94712345678',
    },
  });
  console.log('✅ Demo customer: Sanduni Rathnayake');

  // ── Products ──────────────────────────────────────────────────
  const mensCategory = await prisma.category.findUnique({ where: { slug: 'mens-fashion' } });
  const womensCategory = await prisma.category.findUnique({ where: { slug: 'womens-fashion' } });
  const electronicsCategory = await prisma.category.findUnique({ where: { slug: 'electronics' } });

  const product1 = await prisma.product.create({
    data: {
      vendorId: vendor.id,
      title: 'Handloom Batik Shirt — Traditional Sri Lanka Print',
      description: 'Authentic handloom batik shirt crafted by artisans in Kandy. 100% cotton, breathable fabric perfect for Sri Lanka\'s tropical climate.',
      status: 'ACTIVE',
      tags: ['batik', 'handloom', 'traditional', 'cotton', 'mens'],
      images: {
        create: [{ url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800', altText: 'Batik Shirt', isPrimary: true, s3Key: 'placeholder/batik-shirt.jpg', sortOrder: 0 }],
      },
      categories: mensCategory ? { create: { categoryId: mensCategory.id } } : undefined,
      variants: {
        create: [
          { sku: 'BTKS-S-BLUE', size: 'S', color: 'Blue', price: 2800, comparePrice: 3500, isDefault: false, inventory: { create: { quantity: 25, lowStockThreshold: 5 } } },
          { sku: 'BTKS-M-BLUE', size: 'M', color: 'Blue', price: 2800, comparePrice: 3500, isDefault: true, inventory: { create: { quantity: 40, lowStockThreshold: 5 } } },
          { sku: 'BTKS-L-BLUE', size: 'L', color: 'Blue', price: 2800, comparePrice: 3500, isDefault: false, inventory: { create: { quantity: 30, lowStockThreshold: 5 } } },
          { sku: 'BTKS-M-RED', size: 'M', color: 'Red', price: 2800, comparePrice: 3500, isDefault: false, inventory: { create: { quantity: 20, lowStockThreshold: 5 } } },
        ],
      },
    },
  });

  const product2 = await prisma.product.create({
    data: {
      vendorId: vendor.id,
      title: 'Kandyan Saree — Pure Silk Handwoven',
      description: 'Traditional Kandyan saree handwoven by master weavers. Features gold border (zari work) and intricate patterns. Perfect for special occasions.',
      status: 'ACTIVE',
      tags: ['saree', 'silk', 'kandyan', 'handwoven', 'womens', 'traditional'],
      images: {
        create: [{ url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800', altText: 'Kandyan Saree', isPrimary: true, s3Key: 'placeholder/saree.jpg', sortOrder: 0 }],
      },
      categories: womensCategory ? { create: { categoryId: womensCategory.id } } : undefined,
      variants: {
        create: [
          { sku: 'KSR-GOLD', color: 'Gold', price: 18500, comparePrice: 24000, isDefault: true, inventory: { create: { quantity: 8, lowStockThreshold: 2 } } },
          { sku: 'KSR-BLUE', color: 'Royal Blue', price: 18500, comparePrice: 24000, isDefault: false, inventory: { create: { quantity: 5, lowStockThreshold: 2 } } },
        ],
      },
    },
  });

  const product3 = await prisma.product.create({
    data: {
      vendorId: vendor2.id,
      title: 'Samsung Galaxy A55 5G — 256GB',
      description: '6.6-inch Super AMOLED display, 50MP triple camera, 5000mAh battery. Official warranty from Samsung Lanka.',
      status: 'ACTIVE',
      tags: ['samsung', 'smartphone', '5g', 'android', 'phone'],
      images: {
        create: [{ url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800', altText: 'Samsung Galaxy A55', isPrimary: true, s3Key: 'placeholder/samsung.jpg', sortOrder: 0 }],
      },
      categories: electronicsCategory ? { create: { categoryId: electronicsCategory.id } } : undefined,
      variants: {
        create: [
          { sku: 'SAMS-A55-BLK-256', color: 'Awesome Navy', price: 89900, comparePrice: 94900, isDefault: true, inventory: { create: { quantity: 15, lowStockThreshold: 3 } } },
          { sku: 'SAMS-A55-LIL-256', color: 'Awesome Lilac', price: 89900, comparePrice: 94900, isDefault: false, inventory: { create: { quantity: 10, lowStockThreshold: 3 } } },
        ],
      },
    },
  });

  const product4 = await prisma.product.create({
    data: {
      vendorId: vendor2.id,
      title: 'JBL Tune 510BT Wireless Headphones',
      description: 'On-ear Bluetooth 5.0 headphones, 40-hour battery life, JBL Pure Bass Sound. Foldable design for easy portability.',
      status: 'ACTIVE',
      tags: ['jbl', 'headphones', 'bluetooth', 'wireless', 'audio'],
      images: {
        create: [{ url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800', altText: 'JBL Headphones', isPrimary: true, s3Key: 'placeholder/headphones.jpg', sortOrder: 0 }],
      },
      categories: electronicsCategory ? { create: { categoryId: electronicsCategory.id } } : undefined,
      variants: {
        create: [
          { sku: 'JBL-T510-BLK', color: 'Black', price: 8900, comparePrice: 12000, isDefault: true, inventory: { create: { quantity: 20, lowStockThreshold: 5 } } },
          { sku: 'JBL-T510-WHT', color: 'White', price: 8900, comparePrice: 12000, isDefault: false, inventory: { create: { quantity: 15, lowStockThreshold: 5 } } },
          { sku: 'JBL-T510-BLU', color: 'Blue', price: 8900, comparePrice: 12000, isDefault: false, inventory: { create: { quantity: 12, lowStockThreshold: 5 } } },
        ],
      },
    },
  });

  console.log('✅ Products created: 4');

  // ── Commission Rules ───────────────────────────────────────────
  await prisma.commissionRule.create({
    data: {
      vendorId: null, // Platform default
      type: 'PERCENTAGE',
      rate: 0.10,
      currency: 'LKR',
    },
  });
  console.log('✅ Commission rule: 10% platform default');

  // ── Sample Coupons ─────────────────────────────────────────────
  await prisma.coupon.createMany({
    data: [
      {
        code: 'WELCOME15',
        type: 'PERCENTAGE',
        value: 15,
        minOrderAmount: 1000,
        maxDiscountAmount: 1500,
        usageLimit: 100,
        usageLimitPerUser: 1,
        isActive: true,
      },
      {
        code: 'FREESHIP',
        type: 'FREE_SHIPPING',
        value: 350,
        minOrderAmount: 2000,
        usageLimitPerUser: 3,
        isActive: true,
      },
      {
        code: 'SAVE500',
        type: 'FIXED_AMOUNT',
        value: 500,
        minOrderAmount: 3000,
        usageLimitPerUser: 1,
        isActive: true,
      },
    ],
    skipDuplicates: true,
  });
  console.log('✅ Sample coupons: WELCOME15, FREESHIP, SAVE500');

  // ── System Config ──────────────────────────────────────────────
  const configs = [
    { key: 'platform.commission_rate', value: { rate: 0.10, currency: 'LKR' } },
    { key: 'platform.free_shipping_threshold', value: { amount: 2500, currency: 'LKR' } },
    { key: 'platform.default_shipping_fee', value: { amount: 350, currency: 'LKR' } },
    { key: 'platform.vat_rate', value: { rate: 0.18 } },
    { key: 'platform.nbt_rate', value: { rate: 0.02 } },
    { key: 'platform.return_window_days', value: { days: 7 } },
    { key: 'platform.supported_districts', value: { districts: ['Colombo','Gampaha','Kalutara','Kandy','Matale','Nuwara Eliya','Galle','Matara','Hambantota','Jaffna','Kilinochchi','Mannar','Mullaitivu','Vavuniya','Puttalam','Kurunegala','Anuradhapura','Polonnaruwa','Badulla','Monaragala','Ratnapura','Kegalle','Ampara','Batticaloa','Trincomalee'] } },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: { key: config.key, value: config.value, updatedBy: admin.id },
    });
  }
  console.log('✅ System config: commission, shipping, tax, districts');

  console.log('\n🎉 Seed complete!');
  console.log('─────────────────────────────────────');
  console.log('🔑 Login credentials:');
  console.log('  Admin:    admin@markcomm.lk     / Admin@1234');
  console.log('  Vendor 1: vendor@fashionlk.lk   / Demo@1234  (Fashion LK)');
  console.log('  Vendor 2: vendor@techzone.lk    / Demo@1234  (Tech Zone LK)');
  console.log('  Customer: customer@demo.lk      / Demo@1234');
  console.log('─────────────────────────────────────\n');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
