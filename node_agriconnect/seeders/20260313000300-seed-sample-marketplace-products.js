'use strict';

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    const now = new Date();

    const farmers = await sequelize.query(
      `
      SELECT u.id
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      WHERE LOWER(r.name) = 'farmer'
      ORDER BY u.id ASC
      LIMIT 4
      `,
      { type: sequelize.QueryTypes.SELECT },
    );

    if (!Array.isArray(farmers) || farmers.length === 0) {
      console.log('Skipping sample marketplace product seed: no farmer users found.');
      return;
    }

    const categories = await sequelize.query(
      'SELECT id, name FROM marketplace_categories ORDER BY id ASC',
      { type: sequelize.QueryTypes.SELECT },
    );

    const categoryByName = Object.fromEntries(
      categories.map((row) => [String(row.name || '').toLowerCase(), row.id]),
    );

    const sampleTitles = [
      'Sample Cocoa Bean Sack (50kg)',
      'Sample Fresh Cassava Bundle',
      'Sample Organic Chilli Crate',
      'Sample Palm Oil Jar (20L)',
      'Sample Groundnut Bag (30kg)',
      'Sample Plantain Basket',
      'Sample Vegetable Seed Starter Pack',
      'Sample Hybrid Maize Bulk Pack',
    ];

    await queryInterface.bulkDelete('marketplace_products', {
      title: sampleTitles,
    });

    const images = [
      '/uploads/dump/market-tomato.jpg',
      '/uploads/random_images/images.jpeg',
      '/uploads/random_images/images%20(1).jpeg',
      '/uploads/random_images/su-blog-agri-business.jpg',
      '/uploads/random_images/tractor-working-green-field_23-2151983626.avif',
    ];

    const pickFarmer = (index) => Number(farmers[index % farmers.length].id);
    const pickImage = (index) => images[index % images.length];

    const rows = [
      {
        title: 'Sample Cocoa Bean Sack (50kg)',
        description: 'Premium dried cocoa beans cleaned and packed for wholesale buyers.',
        unit_price: 130,
        stock_quantity: 64,
        category_id: categoryByName.grains || null,
      },
      {
        title: 'Sample Fresh Cassava Bundle',
        description: 'Fresh cassava bundle harvested this week for retail and processing.',
        unit_price: 45,
        stock_quantity: 88,
        category_id: categoryByName.vegetables || null,
      },
      {
        title: 'Sample Organic Chilli Crate',
        description: 'Mixed chilli crate with quality sorting for restaurants and markets.',
        unit_price: 38,
        stock_quantity: 40,
        category_id: categoryByName.vegetables || null,
      },
      {
        title: 'Sample Palm Oil Jar (20L)',
        description: 'Filtered red palm oil prepared for household and commercial use.',
        unit_price: 95,
        stock_quantity: 22,
        category_id: categoryByName['farm inputs'] || null,
      },
      {
        title: 'Sample Groundnut Bag (30kg)',
        description: 'Uniform dry groundnut bag suitable for oil mills and traders.',
        unit_price: 78,
        stock_quantity: 33,
        category_id: categoryByName.grains || null,
      },
      {
        title: 'Sample Plantain Basket',
        description: 'Fresh green plantains bundled for local distribution.',
        unit_price: 52,
        stock_quantity: 19,
        category_id: categoryByName.fruits || null,
      },
      {
        title: 'Sample Vegetable Seed Starter Pack',
        description: 'Starter seed mix with planting guide for smallholder farmers.',
        unit_price: 29,
        stock_quantity: 70,
        category_id: categoryByName['farm inputs'] || null,
      },
      {
        title: 'Sample Hybrid Maize Bulk Pack',
        description: 'High-yield maize seed pack for seasonal planting cycles.',
        unit_price: 110,
        stock_quantity: 28,
        category_id: categoryByName.grains || null,
      },
    ].map((item, index) => {
      const hero = pickImage(index);
      return {
        farmer_user_id: pickFarmer(index),
        category_id: item.category_id,
        title: item.title,
        description: item.description,
        thumbnail_url: hero,
        main_picture_url: hero,
        gallery_urls: JSON.stringify([
          pickImage(index + 1),
          pickImage(index + 2),
        ]),
        unit_price: item.unit_price,
        stock_quantity: item.stock_quantity,
        status: 'published',
        created_at: now,
        updated_at: now,
      };
    });

    await queryInterface.bulkInsert('marketplace_products', rows);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('marketplace_products', {
      title: [
        'Sample Cocoa Bean Sack (50kg)',
        'Sample Fresh Cassava Bundle',
        'Sample Organic Chilli Crate',
        'Sample Palm Oil Jar (20L)',
        'Sample Groundnut Bag (30kg)',
        'Sample Plantain Basket',
        'Sample Vegetable Seed Starter Pack',
        'Sample Hybrid Maize Bulk Pack',
      ],
    });
  },
};
