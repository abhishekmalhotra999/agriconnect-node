'use strict';

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    const now = new Date();

    const [users] = await Promise.all([
      sequelize.query(
        'SELECT id, email FROM users ORDER BY id ASC LIMIT 12',
        { type: sequelize.QueryTypes.SELECT },
      ),
    ]);

    if (!Array.isArray(users) || users.length < 2) {
      console.log('Skipping demo review seeder: not enough users found.');
      return;
    }

    const products = await sequelize.query(
      'SELECT id, farmer_user_id FROM marketplace_products WHERE status = \'published\' ORDER BY id ASC LIMIT 12',
      { type: sequelize.QueryTypes.SELECT },
    );
    const listings = await sequelize.query(
      'SELECT id, technician_user_id FROM service_listings WHERE is_active = true ORDER BY id ASC LIMIT 12',
      { type: sequelize.QueryTypes.SELECT },
    );

    if (!products.length && !listings.length) {
      console.log('Skipping demo review seeder: no published products or active service listings found.');
      return;
    }

    const templateComments = [
      'Seeded review: Fast response and clear communication.',
      'Seeded review: Good value for money and quality.',
      'Seeded review: Reliable provider, would use again.',
      'Seeded review: Delivery and follow-up were professional.',
      'Seeded review: Smooth experience from request to completion.',
      'Seeded review: Product quality matched the description.',
    ];

    const userIds = users.map((row) => Number(row.id)).filter(Number.isFinite);
    const productReviewRows = [];
    const serviceReviewRows = [];

    products.forEach((product, productIdx) => {
      const ownerId = Number(product.farmer_user_id || 0);
      const reviewers = userIds.filter((id) => id !== ownerId).slice(0, 3);
      reviewers.forEach((reviewerId, reviewerIdx) => {
        productReviewRows.push({
          marketplace_product_id: Number(product.id),
          user_id: reviewerId,
          rating: ((productIdx + reviewerIdx) % 5) + 1,
          comment: templateComments[(productIdx + reviewerIdx) % templateComments.length],
          created_at: now,
          updated_at: now,
        });
      });
    });

    listings.forEach((listing, listingIdx) => {
      const ownerId = Number(listing.technician_user_id || 0);
      const reviewers = userIds.filter((id) => id !== ownerId).slice(0, 3);
      reviewers.forEach((reviewerId, reviewerIdx) => {
        serviceReviewRows.push({
          service_listing_id: Number(listing.id),
          user_id: reviewerId,
          rating: ((listingIdx + reviewerIdx + 1) % 5) + 1,
          comment: templateComments[(listingIdx + reviewerIdx + 2) % templateComments.length],
          created_at: now,
          updated_at: now,
        });
      });
    });

    const existingProductReviews = await sequelize.query(
      'SELECT marketplace_product_id, user_id FROM marketplace_reviews',
      { type: sequelize.QueryTypes.SELECT },
    );
    const existingServiceReviews = await sequelize.query(
      'SELECT service_listing_id, user_id FROM service_reviews',
      { type: sequelize.QueryTypes.SELECT },
    );

    const productKeys = new Set(
      existingProductReviews.map((row) => `${row.marketplace_product_id}:${row.user_id}`),
    );
    const serviceKeys = new Set(
      existingServiceReviews.map((row) => `${row.service_listing_id}:${row.user_id}`),
    );

    const nextProductRows = productReviewRows.filter((row) => {
      const key = `${row.marketplace_product_id}:${row.user_id}`;
      if (productKeys.has(key)) {
        return false;
      }
      productKeys.add(key);
      return true;
    });

    const nextServiceRows = serviceReviewRows.filter((row) => {
      const key = `${row.service_listing_id}:${row.user_id}`;
      if (serviceKeys.has(key)) {
        return false;
      }
      serviceKeys.add(key);
      return true;
    });

    if (nextProductRows.length > 0) {
      await queryInterface.bulkInsert('marketplace_reviews', nextProductRows);
    }

    if (nextServiceRows.length > 0) {
      await queryInterface.bulkInsert('service_reviews', nextServiceRows);
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('marketplace_reviews', {
      comment: [
        'Seeded review: Fast response and clear communication.',
        'Seeded review: Good value for money and quality.',
        'Seeded review: Reliable provider, would use again.',
        'Seeded review: Delivery and follow-up were professional.',
        'Seeded review: Smooth experience from request to completion.',
        'Seeded review: Product quality matched the description.',
      ],
    });

    await queryInterface.bulkDelete('service_reviews', {
      comment: [
        'Seeded review: Fast response and clear communication.',
        'Seeded review: Good value for money and quality.',
        'Seeded review: Reliable provider, would use again.',
        'Seeded review: Delivery and follow-up were professional.',
        'Seeded review: Smooth experience from request to completion.',
        'Seeded review: Product quality matched the description.',
      ],
    });
  },
};
