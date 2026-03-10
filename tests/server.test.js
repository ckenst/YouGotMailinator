// Mock nodemailer to avoid actual email sending during tests
jest.mock('nodemailer', () => ({
    createTransport: () => ({
        sendMail: (_options, callback) => {
            if (callback) callback(null, { response: 'OK (mock)' });
        }
    })
}));

// Mock uuid to avoid ESM compatibility issues
jest.mock('uuid', () => ({ v4: () => 'mock-test-token-1234' }));

const request = require('supertest');

// Load the app without starting the server
const app = require('../app');

describe('Login endpoint', () => {
    it('redirects to /landing.html on valid credentials', async () => {
        const res = await request(app)
            .post('/login')
            .type('form')
            .send({ email: 'user@example.com', password: 'password123' });

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/landing.html');
    });

    it('redirects with error on invalid email', async () => {
        const res = await request(app)
            .post('/login')
            .type('form')
            .send({ email: 'notanemail', password: 'password123' });

        expect(res.status).toBe(302);
        expect(res.headers.location).toMatch(/error=/);
    });

    it('redirects with error on short password', async () => {
        const res = await request(app)
            .post('/login')
            .type('form')
            .send({ email: 'user@example.com', password: 'short' });

        expect(res.status).toBe(302);
        expect(res.headers.location).toMatch(/error=/);
    });
});

describe('Signup endpoint', () => {
    it('redirects to signup-confirmation on valid input', async () => {
        const res = await request(app)
            .post('/signup')
            .type('form')
            .send({ username: 'testuser', email: 'testuser@mailinator.com', password: 'securepass' });

        expect(res.status).toBe(302);
        expect(res.headers.location).toMatch(/signup-confirmation/);
    });

    it('redirects with error when username is missing', async () => {
        const res = await request(app)
            .post('/signup')
            .type('form')
            .send({ username: '', email: 'user@mailinator.com', password: 'securepass' });

        expect(res.status).toBe(302);
        expect(res.headers.location).toMatch(/error=/);
    });

    it('redirects with error on invalid email', async () => {
        const res = await request(app)
            .post('/signup')
            .type('form')
            .send({ username: 'testuser2', email: 'notanemail', password: 'securepass' });

        expect(res.status).toBe(302);
        expect(res.headers.location).toMatch(/error=/);
    });

    it('redirects with error on short password', async () => {
        const res = await request(app)
            .post('/signup')
            .type('form')
            .send({ username: 'testuser3', email: 'user@mailinator.com', password: 'abc' });

        expect(res.status).toBe(302);
        expect(res.headers.location).toMatch(/error=/);
    });

    it('redirects with error when username is already taken', async () => {
        // First signup
        await request(app)
            .post('/signup')
            .type('form')
            .send({ username: 'dupeuser', email: 'dupe@mailinator.com', password: 'securepass' });

        // Second signup with same username
        const res = await request(app)
            .post('/signup')
            .type('form')
            .send({ username: 'dupeuser', email: 'other@mailinator.com', password: 'securepass' });

        expect(res.status).toBe(302);
        expect(res.headers.location).toMatch(/error=/);
    });
});

describe('Contact endpoint', () => {
    it('redirects with error when name is missing', async () => {
        const res = await request(app)
            .post('/contact')
            .type('form')
            .send({ name: '', email: 'user@mailinator.com', message: 'Hello' });

        expect(res.status).toBe(302);
        expect(res.headers.location).toMatch(/error=/);
    });

    it('redirects with error on invalid email', async () => {
        const res = await request(app)
            .post('/contact')
            .type('form')
            .send({ name: 'Alice', email: 'notanemail', message: 'Hello' });

        expect(res.status).toBe(302);
        expect(res.headers.location).toMatch(/error=/);
    });

    it('redirects with error when message is missing', async () => {
        const res = await request(app)
            .post('/contact')
            .type('form')
            .send({ name: 'Alice', email: 'alice@mailinator.com', message: '' });

        expect(res.status).toBe(302);
        expect(res.headers.location).toMatch(/error=/);
    });

    it('redirects to contact-confirmation on valid input', async () => {
        const res = await request(app)
            .post('/contact')
            .type('form')
            .send({ name: 'Alice', email: 'alice@mailinator.com', message: 'Hello, I have a question.' });

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/contact-confirmation.html');
    });
});

describe('Password reset token endpoint', () => {
    it('returns 404 or error page for invalid token', async () => {
        const res = await request(app).get('/reset/invalid-token-xyz');
        expect(res.status).toBe(200);
        expect(res.text).toMatch(/Invalid or Expired/i);
    });
});

describe('Static pages', () => {
    it('serves the login page at /', async () => {
        const res = await request(app).get('/');
        expect(res.status).toBe(200);
        expect(res.text).toMatch(/Login/i);
    });

    it('serves the signup page', async () => {
        const res = await request(app).get('/signup.html');
        expect(res.status).toBe(200);
        expect(res.text).toMatch(/Create Account/i);
    });

    it('serves the contact page', async () => {
        const res = await request(app).get('/contact.html');
        expect(res.status).toBe(200);
        expect(res.text).toMatch(/Contact Us/i);
    });

    it('serves the request-reset page', async () => {
        const res = await request(app).get('/request-reset.html');
        expect(res.status).toBe(200);
        expect(res.text).toMatch(/Reset Password/i);
    });
});
