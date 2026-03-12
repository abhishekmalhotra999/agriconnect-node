/* eslint-disable no-console */
require('dotenv').config();

const {
  sequelize,
  Role,
  User,
  Course,
  Lesson,
  MarketplaceCategory,
  MarketplaceProduct,
  ServiceCategory,
  ServiceListing,
  ServiceRequest,
} = require('../src/models');

const assertLocalSafe = () => {
  const host = String(process.env.DB_HOST || '').toLowerCase();
  const dbName = String(process.env.DB_NAME || '').toLowerCase();
  const nodeEnv = String(process.env.NODE_ENV || '').toLowerCase();
  const isLocalHost =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === 'mysql-dev' ||
    host.endsWith('.local');
  const isLocalDbName =
    dbName.includes('dev') || dbName.includes('local') || dbName.includes('test');

  if (!isLocalHost || !isLocalDbName || nodeEnv === 'production') {
    throw new Error(
      `Refusing seed for host=${host || '<empty>'} db=${dbName || '<empty>'} env=${nodeEnv || '<empty>'}`,
    );
  }
};

const findRoleId = async roleName => {
  const role = await Role.findOne({where: {name: roleName}});
  return role ? Number(role.id) : null;
};

const ensureUser = async ({name, email, phone, roleId}) => {
  let user = await User.findOne({where: {email}});
  if (!user) {
    user = User.build({
      name,
      email,
      phone,
      role_id: roleId,
      country_code: '+231',
      info: {},
    });
    await user.setPassword('AgriConnect@123');
    await user.save();
    return user;
  }

  user.name = name;
  user.phone = phone;
  user.role_id = roleId;
  await user.save();
  return user;
};

const run = async () => {
  assertLocalSafe();
  await sequelize.authenticate();
  console.log('connected to local database');

  const farmerRoleId = await findRoleId('farmer');
  const customerRoleId = await findRoleId('customer');
  const technicianRoleId = await findRoleId('technician');

  const farmer = await ensureUser({
    name: 'Demo Farmer',
    email: 'demo-farmer@agriconnect.local',
    phone: '0777000001',
    roleId: farmerRoleId,
  });

  const customer = await ensureUser({
    name: 'Demo Customer',
    email: 'demo-customer@agriconnect.local',
    phone: '0777000002',
    roleId: customerRoleId,
  });

  const technician = await ensureUser({
    name: 'Demo Technician',
    email: 'demo-tech@agriconnect.local',
    phone: '0777000003',
    roleId: technicianRoleId,
  });

  const [marketCategory] = await MarketplaceCategory.findOrCreate({
    where: {name: 'Vegetables'},
    defaults: {
      description: 'Fresh vegetables from local farms',
      is_active: true,
    },
  });

  const [serviceCategory] = await ServiceCategory.findOrCreate({
    where: {name: 'Irrigation'},
    defaults: {
      description: 'Irrigation installation and maintenance',
      is_active: true,
    },
  });

  const [marketProduct] = await MarketplaceProduct.findOrCreate({
    where: {title: 'Premium Tomato Crate', farmer_user_id: farmer.id},
    defaults: {
      farmer_user_id: farmer.id,
      category_id: marketCategory.id,
      title: 'Premium Tomato Crate',
      description: 'Freshly harvested tomatoes with quality grading.',
      main_picture_url: '/uploads/dump/market-tomato.jpg',
      thumbnail_url: '/uploads/dump/market-tomato.jpg',
      gallery_urls: ['/uploads/dump/market-tomato.jpg'],
      unit_price: 35,
      stock_quantity: 120,
      status: 'published',
    },
  });

  await marketProduct.update({
    category_id: marketCategory.id,
    status: 'published',
    stock_quantity: 120,
  });

  const [serviceListing] = await ServiceListing.findOrCreate({
    where: {title: 'Pump & Irrigation Maintenance', technician_user_id: technician.id},
    defaults: {
      technician_user_id: technician.id,
      service_category_id: serviceCategory.id,
      title: 'Pump & Irrigation Maintenance',
      description: 'On-site repair and maintenance for irrigation lines and pumps.',
      main_picture_url: '/uploads/dump/service-irrigation.jpg',
      thumbnail_url: '/uploads/dump/service-irrigation.jpg',
      gallery_urls: ['/uploads/dump/service-irrigation.jpg'],
      service_area: 'Montserrado, Bong',
      contact_email: 'demo-tech@agriconnect.local',
      is_active: true,
    },
  });

  await serviceListing.update({
    service_category_id: serviceCategory.id,
    is_active: true,
    service_area: 'Montserrado, Bong',
    contact_email: 'demo-tech@agriconnect.local',
  });

  await ServiceRequest.findOrCreate({
    where: {
      service_listing_id: serviceListing.id,
      requester_phone: '0777000002',
      message: 'Please inspect my irrigation setup this week.',
    },
    defaults: {
      service_listing_id: serviceListing.id,
      customer_user_id: customer.id,
      requester_name: customer.name,
      requester_phone: customer.phone,
      requester_email: customer.email,
      message: 'Please inspect my irrigation setup this week.',
      status: 'new',
      email_delivery_status: 'pending',
    },
  });

  const [course] = await Course.findOrCreate({
    where: {title: 'Climate Smart Farming Basics', instructor_id: farmer.id},
    defaults: {
      title: 'Climate Smart Farming Basics',
      subtitle: 'Practical techniques for higher yield and resilience',
      description: 'Hands-on course on soil, irrigation, and crop planning.',
      price: '0',
      duration: '2h 30m',
      instructor_id: farmer.id,
      course_preview: '/uploads/dump/learn-preview.jpg',
      thumbnail_image: '/uploads/dump/learn-thumbnail.jpg',
    },
  });

  await Lesson.findOrCreate({
    where: {course_id: course.id, title: 'Soil Health Checklist'},
    defaults: {
      title: 'Soil Health Checklist',
      content:
        '<h2>Soil Health Checklist</h2><p>Check moisture, texture, and nutrient balance before sowing.</p>',
      resource_url: '/uploads/dump/lesson-soil.pdf',
      course_id: course.id,
      lesson_asset: '/uploads/dump/lesson-soil.jpg',
      thumbnail_asset: '/uploads/dump/lesson-soil-thumb.jpg',
    },
  });

  await Lesson.findOrCreate({
    where: {course_id: course.id, title: 'Irrigation Efficiency Starter'},
    defaults: {
      title: 'Irrigation Efficiency Starter',
      content:
        '<h2>Irrigation Efficiency</h2><p>Use timing and pressure checks to reduce water waste.</p>',
      resource_url: '/uploads/dump/lesson-irrigation.pdf',
      course_id: course.id,
      lesson_asset: '/uploads/dump/lesson-irrigation.jpg',
      thumbnail_asset: '/uploads/dump/lesson-irrigation-thumb.jpg',
    },
  });

  await sequelize.close();
  console.log('domain seed complete for mysql local dev');
};

run().catch(async error => {
  console.error('domain seed failed:', error.message || error);
  try {
    await sequelize.close();
  } catch (_error) {
    // ignore close errors in failure path
  }
  process.exit(1);
});
