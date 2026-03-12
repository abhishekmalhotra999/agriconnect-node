'use strict';

const bcrypt = require('bcrypt');

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    if (sequelize.getDialect() !== 'postgres') {
      console.log('Skipping demo marketplace/service seeder on non-Postgres dialect.');
      return;
    }
    const now = new Date();

    const [farmerRoleRow] = await sequelize.query(
      "SELECT id FROM roles WHERE LOWER(name) = 'farmer' LIMIT 1",
      { type: sequelize.QueryTypes.SELECT },
    );
    const [technicianRoleRow] = await sequelize.query(
      "SELECT id FROM roles WHERE LOWER(name) = 'technician' LIMIT 1",
      { type: sequelize.QueryTypes.SELECT },
    );
    const [customerRoleRow] = await sequelize.query(
      "SELECT id FROM roles WHERE LOWER(name) = 'customer' LIMIT 1",
      { type: sequelize.QueryTypes.SELECT },
    );

    if (!farmerRoleRow || !technicianRoleRow || !customerRoleRow) {
      throw new Error('Required roles (farmer, technician, customer) were not found. Run canonical role seed first.');
    }

    const demoPasswordHash = await bcrypt.hash('Demo@1234', 10);

    const userDefs = [
      { name: 'Demo Farmer One', email: 'demo.farmer1@agriconnect.local', phone: '960000001', role_id: farmerRoleRow.id },
      { name: 'Demo Farmer Two', email: 'demo.farmer2@agriconnect.local', phone: '960000002', role_id: farmerRoleRow.id },
      { name: 'Demo Technician One', email: 'demo.tech1@agriconnect.local', phone: '970000001', role_id: technicianRoleRow.id },
      { name: 'Demo Technician Two', email: 'demo.tech2@agriconnect.local', phone: '970000002', role_id: technicianRoleRow.id },
      { name: 'Demo Customer One', email: 'demo.customer1@agriconnect.local', phone: '950000001', role_id: customerRoleRow.id },
    ];

    const usersByEmail = {};
    for (const userDef of userDefs) {
      const [row] = await sequelize.query(
        `
        INSERT INTO users (name, email, phone, encrypted_password, role_id, info, sign_in_count, country_code, created_at, updated_at)
        VALUES (:name, :email, :phone, :encrypted_password, :role_id, :info::jsonb, 0, '+231', :created_at, :updated_at)
        ON CONFLICT (email)
        DO UPDATE SET
          name = EXCLUDED.name,
          phone = EXCLUDED.phone,
          encrypted_password = EXCLUDED.encrypted_password,
          role_id = EXCLUDED.role_id,
          updated_at = EXCLUDED.updated_at
        RETURNING id, email
        `,
        {
          type: sequelize.QueryTypes.SELECT,
          replacements: {
            ...userDef,
            encrypted_password: demoPasswordHash,
            info: JSON.stringify({}),
            created_at: now,
            updated_at: now,
          },
        },
      );
      usersByEmail[row.email] = row.id;
    }

    const profileDefs = [
      { user_id: usersByEmail['demo.farmer1@agriconnect.local'], address: 'Bong County', profession_type: 'farmer', farm_size: '12 acres', years_of_experience: '9', farming_type: 'Rice Farming', technician_type: null },
      { user_id: usersByEmail['demo.farmer2@agriconnect.local'], address: 'Lofa County', profession_type: 'farmer', farm_size: '8 acres', years_of_experience: '6', farming_type: 'Vegetable Farming', technician_type: null },
      { user_id: usersByEmail['demo.tech1@agriconnect.local'], address: 'Montserrado', profession_type: 'technician', farm_size: null, years_of_experience: '7', farming_type: null, technician_type: 'Irrigation Systems' },
      { user_id: usersByEmail['demo.tech2@agriconnect.local'], address: 'Margibi', profession_type: 'technician', farm_size: null, years_of_experience: '5', farming_type: null, technician_type: 'Solar Pump Support' },
      { user_id: usersByEmail['demo.customer1@agriconnect.local'], address: 'Nimba County', profession_type: 'customer', farm_size: null, years_of_experience: null, farming_type: null, technician_type: null },
    ];

    for (const profile of profileDefs) {
      await sequelize.query(
        `
        INSERT INTO profiles (user_id, address, profession_type, farm_size, years_of_experience, farming_type, technician_type, created_at, updated_at)
        VALUES (:user_id, :address, :profession_type, :farm_size, :years_of_experience, :farming_type, :technician_type, :created_at, :updated_at)
        ON CONFLICT (user_id)
        DO UPDATE SET
          address = EXCLUDED.address,
          profession_type = EXCLUDED.profession_type,
          farm_size = EXCLUDED.farm_size,
          years_of_experience = EXCLUDED.years_of_experience,
          farming_type = EXCLUDED.farming_type,
          technician_type = EXCLUDED.technician_type,
          updated_at = EXCLUDED.updated_at
        `,
        {
          type: sequelize.QueryTypes.INSERT,
          replacements: {
            ...profile,
            created_at: now,
            updated_at: now,
          },
        },
      );
    }

    const marketplaceCategoryDefs = [
      { name: 'Grains', description: 'Rice, maize, sorghum and other grains' },
      { name: 'Vegetables', description: 'Fresh vegetables for local markets' },
      { name: 'Fruits', description: 'Seasonal and perennial fruits' },
      { name: 'Farm Inputs', description: 'Seeds, fertilizers and tools' },
    ];

    const serviceCategoryDefs = [
      { name: 'Irrigation', description: 'Irrigation setup and maintenance' },
      { name: 'Equipment Repair', description: 'Farm equipment diagnostics and repair' },
      { name: 'Soil Testing', description: 'Soil fertility and nutrient analysis' },
      { name: 'Post-Harvest Support', description: 'Storage, processing and packaging support' },
    ];

    const marketplaceCategoryIds = {};
    for (const category of marketplaceCategoryDefs) {
      const [row] = await sequelize.query(
        `
        INSERT INTO marketplace_categories (name, description, is_active, created_at, updated_at)
        VALUES (:name, :description, true, :created_at, :updated_at)
        ON CONFLICT (name)
        DO UPDATE SET description = EXCLUDED.description, is_active = true, updated_at = EXCLUDED.updated_at
        RETURNING id, name
        `,
        {
          type: sequelize.QueryTypes.SELECT,
          replacements: {
            ...category,
            created_at: now,
            updated_at: now,
          },
        },
      );
      marketplaceCategoryIds[row.name] = row.id;
    }

    const serviceCategoryIds = {};
    for (const category of serviceCategoryDefs) {
      const [row] = await sequelize.query(
        `
        INSERT INTO service_categories (name, description, is_active, created_at, updated_at)
        VALUES (:name, :description, true, :created_at, :updated_at)
        ON CONFLICT (name)
        DO UPDATE SET description = EXCLUDED.description, is_active = true, updated_at = EXCLUDED.updated_at
        RETURNING id, name
        `,
        {
          type: sequelize.QueryTypes.SELECT,
          replacements: {
            ...category,
            created_at: now,
            updated_at: now,
          },
        },
      );
      serviceCategoryIds[row.name] = row.id;
    }

    const productTitles = [
      'Premium Upland Rice (50kg)',
      'Organic Cassava Bundle',
      'Fresh Pepper Crate',
      'Hybrid Maize Seed Pack',
      'Sweet Pineapple Basket',
      'NPK Fertilizer 25kg',
    ];

    const localImages = [
      '/uploads/random_images/detail-rice-plant-sunset-valencia-with-plantation-out-focus-rice-grains-plant-seed_181624-25838.avif',
      '/uploads/random_images/images.jpeg',
      '/uploads/random_images/images%20(1).jpeg',
      '/uploads/random_images/su-blog-agri-business.jpg',
      '/uploads/random_images/tractor-working-green-field_23-2151983626.avif',
    ];
    const img = (idx) => localImages[idx % localImages.length];

    await queryInterface.bulkDelete('marketplace_products', { title: productTitles });

    await queryInterface.bulkInsert('marketplace_products', [
      {
        farmer_user_id: usersByEmail['demo.farmer1@agriconnect.local'],
        category_id: marketplaceCategoryIds.Grains,
        title: 'Premium Upland Rice (50kg)',
        description: 'Clean, dried upland rice suitable for local retail and wholesale buyers.',
        thumbnail_url: img(0),
        main_picture_url: img(0),
        gallery_urls: JSON.stringify([
          img(1),
          img(2),
          img(3),
        ]),
        unit_price: 62.5,
        stock_quantity: 120,
        status: 'published',
        created_at: now,
        updated_at: now,
      },
      {
        farmer_user_id: usersByEmail['demo.farmer1@agriconnect.local'],
        category_id: marketplaceCategoryIds['Farm Inputs'],
        title: 'Hybrid Maize Seed Pack',
        description: 'High-yield seed pack for one-acre planting with germination guidance.',
        thumbnail_url: img(1),
        main_picture_url: img(1),
        gallery_urls: JSON.stringify([
          img(2),
          img(3),
          img(4),
        ]),
        unit_price: 28.0,
        stock_quantity: 75,
        status: 'published',
        created_at: now,
        updated_at: now,
      },
      {
        farmer_user_id: usersByEmail['demo.farmer2@agriconnect.local'],
        category_id: marketplaceCategoryIds.Vegetables,
        title: 'Organic Cassava Bundle',
        description: 'Fresh cassava harvested this week, ideal for gari processing.',
        thumbnail_url: img(2),
        main_picture_url: img(2),
        gallery_urls: JSON.stringify([
          img(3),
          img(4),
          img(0),
        ]),
        unit_price: 35.0,
        stock_quantity: 90,
        status: 'published',
        created_at: now,
        updated_at: now,
      },
      {
        farmer_user_id: usersByEmail['demo.farmer2@agriconnect.local'],
        category_id: marketplaceCategoryIds.Vegetables,
        title: 'Fresh Pepper Crate',
        description: 'Mixed hot pepper crate suitable for market stalls and restaurants.',
        thumbnail_url: img(3),
        main_picture_url: img(3),
        gallery_urls: JSON.stringify([
          img(4),
          img(0),
          img(1),
        ]),
        unit_price: 24.75,
        stock_quantity: 45,
        status: 'published',
        created_at: now,
        updated_at: now,
      },
      {
        farmer_user_id: usersByEmail['demo.farmer2@agriconnect.local'],
        category_id: marketplaceCategoryIds.Fruits,
        title: 'Sweet Pineapple Basket',
        description: 'Ripe pineapple basket with mixed sizes for retail resale.',
        thumbnail_url: img(4),
        main_picture_url: img(4),
        gallery_urls: JSON.stringify([
          img(0),
          img(1),
          img(2),
        ]),
        unit_price: 41.25,
        stock_quantity: 30,
        status: 'published',
        created_at: now,
        updated_at: now,
      },
      {
        farmer_user_id: usersByEmail['demo.farmer1@agriconnect.local'],
        category_id: marketplaceCategoryIds['Farm Inputs'],
        title: 'NPK Fertilizer 25kg',
        description: 'Balanced fertilizer for vegetables, grains, and root crops.',
        thumbnail_url: img(0),
        main_picture_url: img(0),
        gallery_urls: JSON.stringify([
          img(1),
          img(2),
          img(3),
        ]),
        unit_price: 48.0,
        stock_quantity: 60,
        status: 'published',
        created_at: now,
        updated_at: now,
      },
    ]);

    const serviceTitles = [
      'Drip Irrigation Installation',
      'Solar Water Pump Diagnostics',
      'On-Farm Soil Nutrient Testing',
      'Post-Harvest Drying System Setup',
    ];
    await queryInterface.bulkDelete('service_listings', { title: serviceTitles });

    await queryInterface.bulkInsert('service_listings', [
      {
        technician_user_id: usersByEmail['demo.tech1@agriconnect.local'],
        service_category_id: serviceCategoryIds.Irrigation,
        title: 'Drip Irrigation Installation',
        description: 'Design and install drip lines for vegetable and orchard farms, including maintenance plan.',
        thumbnail_url: img(1),
        main_picture_url: img(1),
        gallery_urls: JSON.stringify([
          img(2),
          img(3),
          img(4),
        ]),
        service_area: 'Montserrado, Margibi',
        contact_email: 'demo.tech1@agriconnect.local',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        technician_user_id: usersByEmail['demo.tech2@agriconnect.local'],
        service_category_id: serviceCategoryIds['Equipment Repair'],
        title: 'Solar Water Pump Diagnostics',
        description: 'Troubleshoot and repair solar-powered irrigation pumps and control units.',
        thumbnail_url: img(2),
        main_picture_url: img(2),
        gallery_urls: JSON.stringify([
          img(3),
          img(4),
          img(0),
        ]),
        service_area: 'Bong, Lofa, Nimba',
        contact_email: 'demo.tech2@agriconnect.local',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        technician_user_id: usersByEmail['demo.tech1@agriconnect.local'],
        service_category_id: serviceCategoryIds['Soil Testing'],
        title: 'On-Farm Soil Nutrient Testing',
        description: 'Field sample collection, pH tests, and fertilizer recommendations with report.',
        thumbnail_url: img(3),
        main_picture_url: img(3),
        gallery_urls: JSON.stringify([
          img(4),
          img(0),
          img(1),
        ]),
        service_area: 'Nationwide',
        contact_email: 'demo.tech1@agriconnect.local',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        technician_user_id: usersByEmail['demo.tech2@agriconnect.local'],
        service_category_id: serviceCategoryIds['Post-Harvest Support'],
        title: 'Post-Harvest Drying System Setup',
        description: 'Configure dryers and storage process to reduce moisture losses after harvest.',
        thumbnail_url: img(4),
        main_picture_url: img(4),
        gallery_urls: JSON.stringify([
          img(0),
          img(1),
          img(2),
        ]),
        service_area: 'Montserrado, Bassa',
        contact_email: 'demo.tech2@agriconnect.local',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('service_listings', {
      title: [
        'Drip Irrigation Installation',
        'Solar Water Pump Diagnostics',
        'On-Farm Soil Nutrient Testing',
        'Post-Harvest Drying System Setup',
      ],
    });

    await queryInterface.bulkDelete('marketplace_products', {
      title: [
        'Premium Upland Rice (50kg)',
        'Organic Cassava Bundle',
        'Fresh Pepper Crate',
        'Hybrid Maize Seed Pack',
        'Sweet Pineapple Basket',
        'NPK Fertilizer 25kg',
      ],
    });
  },
};
