const bcrypt = require('bcrypt');
const request = require('supertest');
const { app } = require('../../src/app');
const {
    User,
    Role,
    Profile,
    UserPreference,
    MarketplaceProduct,
    MarketplaceReview,
    ServiceListing,
    ServiceReview,
    ServiceRequest,
} = require('../../src/models');

jest.mock('nodemailer', () => ({
    createTransport: jest.fn(() => ({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'qa-message-id' }),
    })),
}));

function uniquePhone(prefix = '98') {
    return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

async function createUserWithRole(roleName) {
    const [role] = await Role.findOrCreate({ where: { name: roleName }, defaults: { name: roleName } });
    const phone = uniquePhone(roleName === 'farmer' ? '96' : roleName === 'technician' ? '97' : '95');
    const password = 'Role@1234';

    const user = await User.create({
        name: `${roleName} listing tester`,
        email: `${roleName}-${Date.now()}-${Math.floor(Math.random() * 1000)}@example.com`,
        phone,
        role_id: role.id,
        encrypted_password: await bcrypt.hash(password, 10),
        info: {},
    });

    await Profile.create({
        user_id: user.id,
        address: 'QA Address',
        profession_type: roleName,
    });

    if (roleName === 'farmer') {
        await UserPreference.findOrCreate({
            where: { user_id: user.id },
            defaults: {
                user_id: user.id,
                saved_items: [],
                recent_items: [],
                notifications: [],
                farmer_onboarding: { completed: true },
                seller_status: 'approved',
            },
        });
    }

    const login = await request(app).post('/api/sign_in').send({ phone, password });
    if (!login.body?.user?.jwtToken) {
        throw new Error(`Unable to login test user: ${JSON.stringify(login.body)}`);
    }

    return { user, token: login.body.user.jwtToken };
}

describe('Marketplace and service listing interactions', () => {
    const cleanupUserIds = [];
    const cleanupProductIds = [];
    const cleanupListingIds = [];
    const cleanupRequestIds = [];

    afterEach(async () => {
        if (cleanupRequestIds.length) {
            await ServiceRequest.destroy({ where: { id: cleanupRequestIds } });
            cleanupRequestIds.length = 0;
        }

        if (cleanupListingIds.length) {
            await ServiceListing.destroy({ where: { id: cleanupListingIds } });
            cleanupListingIds.length = 0;
        }

        await MarketplaceReview.destroy({
            where: {
                comment: [
                    'Initial marketplace review',
                    'Updated marketplace review',
                    'Initial service review',
                    'Updated service review',
                ],
            },
        });

        await ServiceReview.destroy({
            where: {
                comment: [
                    'Initial marketplace review',
                    'Updated marketplace review',
                    'Initial service review',
                    'Updated service review',
                ],
            },
        });

        if (cleanupProductIds.length) {
            await MarketplaceProduct.destroy({ where: { id: cleanupProductIds } });
            cleanupProductIds.length = 0;
        }

        if (cleanupUserIds.length) {
            await Profile.destroy({ where: { user_id: cleanupUserIds } });
            await User.destroy({ where: { id: cleanupUserIds } });
            cleanupUserIds.length = 0;
        }
    });

    test('farmer products support create, update, ownership checks, and published visibility', async () => {
        const { user: farmer, token: farmerToken } = await createUserWithRole('farmer');
        const { user: otherFarmer, token: otherFarmerToken } = await createUserWithRole('farmer');
        const { user: customer, token: customerToken } = await createUserWithRole('customer');
        cleanupUserIds.push(farmer.id, otherFarmer.id, customer.id);

        const createDraft = await request(app)
            .post('/api/marketplace/products')
            .set('Authorization', `Bearer ${farmerToken}`)
            .send({
                title: 'Maize Draft Listing',
                description: 'Draft inventory',
                unit_price: 10,
                stock_quantity: 40,
                status: 'draft',
            });

        expect(createDraft.status).toBe(201);
        cleanupProductIds.push(createDraft.body.id);

        const createPublished = await request(app)
            .post('/api/marketplace/products')
            .set('Authorization', `Bearer ${farmerToken}`)
            .send({
                title: 'Cassava Published Listing',
                description: 'Ready for market',
                unit_price: 18.5,
                stock_quantity: 25,
                status: 'published',
            });

        expect(createPublished.status).toBe(201);
        cleanupProductIds.push(createPublished.body.id);

        const mine = await request(app)
            .get('/api/marketplace/products/mine')
            .set('Authorization', `Bearer ${farmerToken}`);
        expect(mine.status).toBe(200);
        expect(mine.body.length).toBeGreaterThanOrEqual(2);

        const customerVisible = await request(app)
            .get('/api/marketplace/products')
            .set('Authorization', `Bearer ${customerToken}`);
        expect(customerVisible.status).toBe(200);

        const customerTitles = customerVisible.body.map((row) => row.title);
        expect(customerTitles).toContain('Cassava Published Listing');
        expect(customerTitles).not.toContain('Maize Draft Listing');

        const forbiddenUpdate = await request(app)
            .put(`/api/marketplace/products/${createPublished.body.id}`)
            .set('Authorization', `Bearer ${otherFarmerToken}`)
            .send({ title: 'Unauthorized Edit' });
        expect(forbiddenUpdate.status).toBe(403);

        const ownerUpdate = await request(app)
            .put(`/api/marketplace/products/${createPublished.body.id}`)
            .set('Authorization', `Bearer ${farmerToken}`)
            .send({ title: 'Cassava Published Listing Updated', stock_quantity: 30 });

        expect(ownerUpdate.status).toBe(200);
        expect(ownerUpdate.body.title).toBe('Cassava Published Listing Updated');
        expect(Number(ownerUpdate.body.stock_quantity)).toBe(30);
    });

    test('technician listings support create, visibility filtering, and ownership checks', async () => {
        const { user: technician, token: technicianToken } = await createUserWithRole('technician');
        const { user: otherTechnician, token: otherTechnicianToken } = await createUserWithRole('technician');
        const { user: customer, token: customerToken } = await createUserWithRole('customer');
        cleanupUserIds.push(technician.id, otherTechnician.id, customer.id);

        const createInactive = await request(app)
            .post('/api/services/listings')
            .set('Authorization', `Bearer ${technicianToken}`)
            .send({
                title: 'Irrigation Setup - Inactive',
                description: 'Inactive for now',
                service_area: 'District A',
                is_active: false,
            });
        expect(createInactive.status).toBe(201);
        cleanupListingIds.push(createInactive.body.id);

        const createActive = await request(app)
            .post('/api/services/listings')
            .set('Authorization', `Bearer ${technicianToken}`)
            .send({
                title: 'Solar Pump Installation',
                description: 'On-site installation and maintenance',
                service_area: 'District B',
                is_active: true,
            });
        expect(createActive.status).toBe(201);
        cleanupListingIds.push(createActive.body.id);

        const mine = await request(app)
            .get('/api/services/listings/mine')
            .set('Authorization', `Bearer ${technicianToken}`);
        expect(mine.status).toBe(200);
        expect(mine.body.length).toBeGreaterThanOrEqual(2);

        const customerVisible = await request(app)
            .get('/api/services/listings')
            .set('Authorization', `Bearer ${customerToken}`);
        expect(customerVisible.status).toBe(200);
        const customerTitles = customerVisible.body.map((row) => row.title);
        expect(customerTitles).toContain('Solar Pump Installation');
        expect(customerTitles).not.toContain('Irrigation Setup - Inactive');

        const forbiddenUpdate = await request(app)
            .put(`/api/services/listings/${createActive.body.id}`)
            .set('Authorization', `Bearer ${otherTechnicianToken}`)
            .send({ title: 'Unauthorized Service Edit' });
        expect(forbiddenUpdate.status).toBe(403);

        const ownerUpdate = await request(app)
            .put(`/api/services/listings/${createActive.body.id}`)
            .set('Authorization', `Bearer ${technicianToken}`)
            .send({ title: 'Solar Pump Installation Updated', service_area: 'District C' });
        expect(ownerUpdate.status).toBe(200);
        expect(ownerUpdate.body.title).toBe('Solar Pump Installation Updated');
        expect(ownerUpdate.body.service_area).toBe('District C');
    });

    test('customer service requests are linked to listing, visible to both customer and listing technician', async () => {
        const { user: technician, token: technicianToken } = await createUserWithRole('technician');
        const { user: customer, token: customerToken } = await createUserWithRole('customer');
        cleanupUserIds.push(technician.id, customer.id);

        const listingRes = await request(app)
            .post('/api/services/listings')
            .set('Authorization', `Bearer ${technicianToken}`)
            .send({
                title: 'Soil Testing Service',
                description: 'Field sample analysis',
                service_area: 'Region North',
                is_active: true,
            });
        expect(listingRes.status).toBe(201);
        cleanupListingIds.push(listingRes.body.id);

        const requestRes = await request(app)
            .post('/api/services/requests')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
                service_listing_id: listingRes.body.id,
                requester_name: customer.name,
                requester_phone: customer.phone,
                requester_email: customer.email,
                message: 'Need urgent soil nutrient test this week.',
            });

        expect(requestRes.status).toBe(201);
        cleanupRequestIds.push(requestRes.body.id);
        expect(String(requestRes.body.customer_user_id)).toBe(String(customer.id));
        expect(String(requestRes.body.service_listing_id)).toBe(String(listingRes.body.id));
        expect(['sent', 'failed']).toContain(requestRes.body.email_delivery_status);

        const customerMine = await request(app)
            .get('/api/services/requests/mine')
            .set('Authorization', `Bearer ${customerToken}`);
        expect(customerMine.status).toBe(200);
        expect(customerMine.body.some((row) => String(row.id) === String(requestRes.body.id))).toBe(true);

        const technicianInbox = await request(app)
            .get('/api/services/requests/for-technician')
            .set('Authorization', `Bearer ${technicianToken}`);
        expect(technicianInbox.status).toBe(200);
        expect(technicianInbox.body.some((row) => String(row.id) === String(requestRes.body.id))).toBe(true);
    });

    test('customer cannot request inactive service listing', async () => {
        const { user: technician, token: technicianToken } = await createUserWithRole('technician');
        const { user: customer, token: customerToken } = await createUserWithRole('customer');
        cleanupUserIds.push(technician.id, customer.id);

        const listingRes = await request(app)
            .post('/api/services/listings')
            .set('Authorization', `Bearer ${technicianToken}`)
            .send({
                title: 'Dormant Repair Service',
                description: 'Temporarily unavailable',
                service_area: 'Region South',
                is_active: false,
            });

        expect(listingRes.status).toBe(201);
        cleanupListingIds.push(listingRes.body.id);

        const requestRes = await request(app)
            .post('/api/services/requests')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
                service_listing_id: listingRes.body.id,
                requester_name: customer.name,
                requester_phone: customer.phone,
                requester_email: customer.email,
                message: 'Please activate soon',
            });

        expect(requestRes.status).toBe(404);
        expect(String(requestRes.body.errors || '')).toMatch(/active service listing not found/i);
    });

    test('farmer can submit and view own service requests', async () => {
        const { user: technician, token: technicianToken } = await createUserWithRole('technician');
        const { user: farmer, token: farmerToken } = await createUserWithRole('farmer');
        cleanupUserIds.push(technician.id, farmer.id);

        const listingRes = await request(app)
            .post('/api/services/listings')
            .set('Authorization', `Bearer ${technicianToken}`)
            .send({
                title: 'Drip Irrigation Maintenance',
                description: 'On-site line checks and flow tuning',
                service_area: 'Region West',
                is_active: true,
            });

        expect(listingRes.status).toBe(201);
        cleanupListingIds.push(listingRes.body.id);

        const requestRes = await request(app)
            .post('/api/services/requests')
            .set('Authorization', `Bearer ${farmerToken}`)
            .send({
                service_listing_id: listingRes.body.id,
                requester_name: farmer.name,
                requester_phone: farmer.phone,
                requester_email: farmer.email,
                message: 'Need drip system maintenance before next planting cycle.',
            });

        expect(requestRes.status).toBe(201);
        cleanupRequestIds.push(requestRes.body.id);
        expect(String(requestRes.body.customer_user_id)).toBe(String(farmer.id));

        const farmerMine = await request(app)
            .get('/api/services/requests/mine')
            .set('Authorization', `Bearer ${farmerToken}`);

        expect(farmerMine.status).toBe(200);
        expect(farmerMine.body.some((row) => String(row.id) === String(requestRes.body.id))).toBe(true);
    });

    test('technician can update request status with valid transitions and invalid transitions are rejected', async () => {
        const { user: technician, token: technicianToken } = await createUserWithRole('technician');
        const { user: customer, token: customerToken } = await createUserWithRole('customer');
        cleanupUserIds.push(technician.id, customer.id);

        const listingRes = await request(app)
            .post('/api/services/listings')
            .set('Authorization', `Bearer ${technicianToken}`)
            .send({
                title: 'Transition QA Service',
                description: 'Lifecycle transition checks',
                service_area: 'Region East',
                is_active: true,
            });

        expect(listingRes.status).toBe(201);
        cleanupListingIds.push(listingRes.body.id);

        const requestRes = await request(app)
            .post('/api/services/requests')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
                service_listing_id: listingRes.body.id,
                requester_name: customer.name,
                requester_phone: customer.phone,
                requester_email: customer.email,
                message: 'Please schedule a field visit.',
            });

        expect(requestRes.status).toBe(201);
        cleanupRequestIds.push(requestRes.body.id);

        const acceptRes = await request(app)
            .patch(`/api/services/requests/${requestRes.body.id}/status`)
            .set('Authorization', `Bearer ${technicianToken}`)
            .send({ status: 'accepted' });

        expect(acceptRes.status).toBe(200);
        expect(acceptRes.body.status).toBe('ok');
        expect(acceptRes.body.request.status).toBe('accepted');

        const invalidTransition = await request(app)
            .patch(`/api/services/requests/${requestRes.body.id}/status`)
            .set('Authorization', `Bearer ${technicianToken}`)
            .send({ status: 'new' });

        expect(invalidTransition.status).toBe(422);
        expect(String(invalidTransition.body.errors || '')).toMatch(/invalid transition/i);
    });

    test('technician cannot update requests for listings they do not own', async () => {
        const { user: listingOwner, token: ownerToken } = await createUserWithRole('technician');
        const { user: outsiderTech, token: outsiderToken } = await createUserWithRole('technician');
        const { user: customer, token: customerToken } = await createUserWithRole('customer');
        cleanupUserIds.push(listingOwner.id, outsiderTech.id, customer.id);

        const listingRes = await request(app)
            .post('/api/services/listings')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({
                title: 'Ownership QA Service',
                description: 'Ownership checks',
                service_area: 'Region South',
                is_active: true,
            });

        expect(listingRes.status).toBe(201);
        cleanupListingIds.push(listingRes.body.id);

        const requestRes = await request(app)
            .post('/api/services/requests')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
                service_listing_id: listingRes.body.id,
                requester_name: customer.name,
                requester_phone: customer.phone,
                requester_email: customer.email,
                message: 'Need technician follow-up.',
            });

        expect(requestRes.status).toBe(201);
        cleanupRequestIds.push(requestRes.body.id);

        const forbidden = await request(app)
            .patch(`/api/services/requests/${requestRes.body.id}/status`)
            .set('Authorization', `Bearer ${outsiderToken}`)
            .send({ status: 'accepted' });

        expect(forbidden.status).toBe(403);
        expect(String(forbidden.body.errors || '')).toMatch(/forbidden/i);
    });

    test('customer can cancel own request when it is new', async () => {
        const { user: technician, token: technicianToken } = await createUserWithRole('technician');
        const { user: customer, token: customerToken } = await createUserWithRole('customer');
        cleanupUserIds.push(technician.id, customer.id);

        const listingRes = await request(app)
            .post('/api/services/listings')
            .set('Authorization', `Bearer ${technicianToken}`)
            .send({
                title: 'Customer Cancel QA Service',
                description: 'Customer cancelability checks',
                service_area: 'Region North',
                is_active: true,
            });

        expect(listingRes.status).toBe(201);
        cleanupListingIds.push(listingRes.body.id);

        const requestRes = await request(app)
            .post('/api/services/requests')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
                service_listing_id: listingRes.body.id,
                requester_name: customer.name,
                requester_phone: customer.phone,
                requester_email: customer.email,
                message: 'Need this service soon.',
            });

        expect(requestRes.status).toBe(201);
        cleanupRequestIds.push(requestRes.body.id);

        const cancelRes = await request(app)
            .patch(`/api/services/requests/${requestRes.body.id}/cancel`)
            .set('Authorization', `Bearer ${customerToken}`);

        expect(cancelRes.status).toBe(200);
        expect(cancelRes.body.status).toBe('ok');
        expect(cancelRes.body.request.status).toBe('cancelled');
    });

    test('customer cannot cancel someone else request and cannot cancel progressed request', async () => {
        const { user: technician, token: technicianToken } = await createUserWithRole('technician');
        const { user: customerA, token: customerAToken } = await createUserWithRole('customer');
        const { user: customerB, token: customerBToken } = await createUserWithRole('customer');
        cleanupUserIds.push(technician.id, customerA.id, customerB.id);

        const listingRes = await request(app)
            .post('/api/services/listings')
            .set('Authorization', `Bearer ${technicianToken}`)
            .send({
                title: 'Customer Cancel Guard Service',
                description: 'Cancel guard checks',
                service_area: 'Region West',
                is_active: true,
            });

        expect(listingRes.status).toBe(201);
        cleanupListingIds.push(listingRes.body.id);

        const requestRes = await request(app)
            .post('/api/services/requests')
            .set('Authorization', `Bearer ${customerAToken}`)
            .send({
                service_listing_id: listingRes.body.id,
                requester_name: customerA.name,
                requester_phone: customerA.phone,
                requester_email: customerA.email,
                message: 'Request for guard checks.',
            });

        expect(requestRes.status).toBe(201);
        cleanupRequestIds.push(requestRes.body.id);

        const forbiddenCancel = await request(app)
            .patch(`/api/services/requests/${requestRes.body.id}/cancel`)
            .set('Authorization', `Bearer ${customerBToken}`);

        expect(forbiddenCancel.status).toBe(403);
        expect(String(forbiddenCancel.body.errors || '')).toMatch(/forbidden/i);

        const acceptRes = await request(app)
            .patch(`/api/services/requests/${requestRes.body.id}/status`)
            .set('Authorization', `Bearer ${technicianToken}`)
            .send({ status: 'accepted' });

        expect(acceptRes.status).toBe(200);

        const progressRes = await request(app)
            .patch(`/api/services/requests/${requestRes.body.id}/status`)
            .set('Authorization', `Bearer ${technicianToken}`)
            .send({ status: 'in_progress' });

        expect(progressRes.status).toBe(200);

        const invalidCancel = await request(app)
            .patch(`/api/services/requests/${requestRes.body.id}/cancel`)
            .set('Authorization', `Bearer ${customerAToken}`);

        expect(invalidCancel.status).toBe(422);
        expect(String(invalidCancel.body.errors || '')).toMatch(/cannot be cancelled/i);
    });

    test('marketplace review endpoint updates an existing review from same user instead of creating duplicates', async () => {
        const { user: farmer, token: farmerToken } = await createUserWithRole('farmer');
        const { user: customer, token: customerToken } = await createUserWithRole('customer');
        cleanupUserIds.push(farmer.id, customer.id);

        const productRes = await request(app)
            .post('/api/marketplace/products')
            .set('Authorization', `Bearer ${farmerToken}`)
            .send({
                title: 'Review Uniqueness Product',
                description: 'Testing duplicate reviews handling',
                unit_price: 42,
                stock_quantity: 22,
                status: 'published',
            });

        expect(productRes.status).toBe(201);
        cleanupProductIds.push(productRes.body.id);

        const firstReview = await request(app)
            .post(`/api/marketplace/products/${productRes.body.id}/reviews`)
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
                rating: 4,
                comment: 'Initial marketplace review',
            });

        expect(firstReview.status).toBe(201);
        expect(firstReview.body.created).toBe(true);

        const secondReview = await request(app)
            .post(`/api/marketplace/products/${productRes.body.id}/reviews`)
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
                rating: 5,
                comment: 'Updated marketplace review',
            });

        expect(secondReview.status).toBe(200);
        expect(secondReview.body.created).toBe(false);
        expect(Number(secondReview.body.rating)).toBe(5);
        expect(secondReview.body.comment).toBe('Updated marketplace review');

        const reviews = await request(app)
            .get(`/api/marketplace/products/${productRes.body.id}/reviews`)
            .set('Authorization', `Bearer ${customerToken}`);

        expect(reviews.status).toBe(200);
        const sameUserReviews = reviews.body.filter(
            (row) => String(row.user_id) === String(customer.id),
        );
        expect(sameUserReviews.length).toBe(1);
        expect(Number(sameUserReviews[0].rating)).toBe(5);
    });

    test('service review endpoint updates an existing review from same user instead of creating duplicates', async () => {
        const { user: technician, token: technicianToken } = await createUserWithRole('technician');
        const { user: customer, token: customerToken } = await createUserWithRole('customer');
        cleanupUserIds.push(technician.id, customer.id);

        const listingRes = await request(app)
            .post('/api/services/listings')
            .set('Authorization', `Bearer ${technicianToken}`)
            .send({
                title: 'Review Uniqueness Service',
                description: 'Testing duplicate service reviews handling',
                service_area: 'Region Central',
                is_active: true,
            });

        expect(listingRes.status).toBe(201);
        cleanupListingIds.push(listingRes.body.id);

        const firstReview = await request(app)
            .post(`/api/services/listings/${listingRes.body.id}/reviews`)
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
                rating: 3,
                comment: 'Initial service review',
            });

        expect(firstReview.status).toBe(201);
        expect(firstReview.body.created).toBe(true);

        const secondReview = await request(app)
            .post(`/api/services/listings/${listingRes.body.id}/reviews`)
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
                rating: 5,
                comment: 'Updated service review',
            });

        expect(secondReview.status).toBe(200);
        expect(secondReview.body.created).toBe(false);
        expect(Number(secondReview.body.rating)).toBe(5);
        expect(secondReview.body.comment).toBe('Updated service review');

        const reviews = await request(app)
            .get(`/api/services/listings/${listingRes.body.id}/reviews`)
            .set('Authorization', `Bearer ${customerToken}`);

        expect(reviews.status).toBe(200);
        const sameUserReviews = reviews.body.filter(
            (row) => String(row.user_id) === String(customer.id),
        );
        expect(sameUserReviews.length).toBe(1);
        expect(Number(sameUserReviews[0].rating)).toBe(5);
    });

    test('customer can create marketplace order request and farmer can view incoming orders', async () => {
        const { user: farmer, token: farmerToken } = await createUserWithRole('farmer');
        const { user: customer, token: customerToken } = await createUserWithRole('customer');
        cleanupUserIds.push(farmer.id, customer.id);

        const productRes = await request(app)
            .post('/api/marketplace/products')
            .set('Authorization', `Bearer ${farmerToken}`)
            .send({
                title: 'Incoming Order Product',
                description: 'Marketplace order flow checks',
                unit_price: 25,
                stock_quantity: 12,
                status: 'published',
            });

        expect(productRes.status).toBe(201);
        cleanupProductIds.push(productRes.body.id);

        const orderReqRes = await request(app)
            .post(`/api/marketplace/products/${productRes.body.id}/order-requests`)
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
                quantity: 3,
                message: 'Please prepare for Friday pickup.',
            });

        expect(orderReqRes.status).toBe(201);
        expect(orderReqRes.body.status).toBe('ok');
        expect(orderReqRes.body.request.productId).toBe(productRes.body.id);
        expect(Number(orderReqRes.body.request.quantity)).toBe(3);

        const incomingRes = await request(app)
            .get('/api/marketplace/products/incoming-orders')
            .set('Authorization', `Bearer ${farmerToken}`);

        expect(incomingRes.status).toBe(200);
        const matched = incomingRes.body.find(
            (row) => String(row.product_id) === String(productRes.body.id),
        );
        expect(matched).toBeTruthy();
        expect(Number(matched.quantity)).toBe(3);
        expect(String(matched.requester_name || '')).toMatch(/customer/i);
    });
});