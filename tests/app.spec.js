// @ts-check
const { test, expect } = require('@playwright/test');
const { waitForEmail, clearInbox, MAILINATOR_DOMAIN } = require('./helpers/mailinator');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Timeout (ms) when polling Mailinator for an expected email. */
const EMAIL_WAIT_TIMEOUT_MS = 60000;

/** Default valid login credentials used across login tests. */
const VALID_LOGIN = {
    email: 'test@mailinator.com',
    password: 'password123'
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a unique Mailinator inbox name for this test run, e.g.
 * "ygm-signup-1741564371234"
 */
function uniqueInbox(prefix) {
    return `ygm-${prefix}-${Date.now()}`;
}

// ---------------------------------------------------------------------------
// Login page
// ---------------------------------------------------------------------------

test.describe('Login page', () => {
    test('shows the login form', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
        await expect(page.getByPlaceholder('Email')).toBeVisible();
        await expect(page.getByPlaceholder('Password')).toBeVisible();
        await expect(page.getByRole('button', { name: /login/i })).toBeVisible();
    });

    test('shows navigation links to signup and contact pages', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('link', { name: /create account/i })).toBeVisible();
        await expect(page.getByRole('link', { name: /contact us/i })).toBeVisible();
        await expect(page.getByRole('link', { name: /forgot password/i })).toBeVisible();
    });

    test('redirects to landing page on valid credentials', async ({ page }) => {
        await page.goto('/');
        await page.getByPlaceholder('Email').fill(VALID_LOGIN.email);
        await page.getByPlaceholder('Password').fill(VALID_LOGIN.password);
        await page.getByRole('button', { name: /login/i }).click();
        await expect(page).toHaveURL(/landing\.html/);
    });

    test('shows an error message on invalid credentials', async ({ page }) => {
        await page.goto('/');
        await page.getByPlaceholder('Email').fill('notanemail');
        await page.getByPlaceholder('Password').fill('short');
        await page.getByRole('button', { name: /login/i }).click();
        // Should stay on / with an error query param displayed
        await expect(page).toHaveURL(/error=/);
    });
});

// ---------------------------------------------------------------------------
// Signup flow
// ---------------------------------------------------------------------------

test.describe('Signup flow', () => {
    test('shows the signup form', async ({ page }) => {
        await page.goto('/signup.html');
        await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
        await expect(page.getByPlaceholder('Username')).toBeVisible();
        await expect(page.getByPlaceholder('Email')).toBeVisible();
        await expect(page.getByPlaceholder('Password')).toBeVisible();
    });

    test('shows an error when password is too short', async ({ page }) => {
        await page.goto('/signup.html');
        await page.getByPlaceholder('Username').fill('testuser');
        await page.getByPlaceholder('Email').fill('test@mailinator.com');
        await page.getByPlaceholder('Password').fill('abc');
        await page.getByRole('button', { name: /create account/i }).click();
        await expect(page).toHaveURL(/error=/);
    });

    test('redirects to signup confirmation on valid input', async ({ page }) => {
        const inbox = uniqueInbox('signup');
        await page.goto('/signup.html');
        await page.getByPlaceholder('Username').fill(inbox);
        await page.getByPlaceholder('Email').fill(`${inbox}@${MAILINATOR_DOMAIN}`);
        await page.getByPlaceholder('Password').fill('SecurePass1!');
        await page.getByRole('button', { name: /create account/i }).click();
        await expect(page).toHaveURL(/signup-confirmation/);
        await expect(page.getByText(new RegExp(inbox, 'i'))).toBeVisible();
    });

    /**
     * Requires MAILINATOR_API_TOKEN and a configured MAILINATOR_DOMAIN.
     * Skip this test locally if credentials are not available.
     */
    test('receives a confirmation email after signup', async ({ page }) => {
        test.skip(!process.env.MAILINATOR_API_TOKEN, 'MAILINATOR_API_TOKEN not set');

        const inbox = uniqueInbox('confirm');
        const email = `${inbox}@${MAILINATOR_DOMAIN}`;

        await clearInbox(inbox);

        await page.goto('/signup.html');
        await page.getByPlaceholder('Username').fill(inbox);
        await page.getByPlaceholder('Email').fill(email);
        await page.getByPlaceholder('Password').fill('SecurePass1!');
        await page.getByRole('button', { name: /create account/i }).click();
        await expect(page).toHaveURL(/signup-confirmation/);

        // Poll Mailinator until the confirmation email arrives
        const message = await waitForEmail(inbox, /confirm your account/i, {
            timeoutMs: EMAIL_WAIT_TIMEOUT_MS
        });

        expect(message).toBeTruthy();
        const bodyPart = message.parts?.find((p) =>
            ['text/html', 'text/plain'].includes(p.contentType)
        );
        expect(bodyPart?.body ?? '').toMatch(/thanks for signing up/i);
    });
});

// ---------------------------------------------------------------------------
// Contact Us form
// ---------------------------------------------------------------------------

test.describe('Contact Us form', () => {
    test('shows the contact form', async ({ page }) => {
        await page.goto('/contact.html');
        await expect(page.getByRole('heading', { name: /contact us/i })).toBeVisible();
        await expect(page.getByPlaceholder('Your Name')).toBeVisible();
        await expect(page.getByPlaceholder('Your Email')).toBeVisible();
        await expect(page.getByPlaceholder('Your message...')).toBeVisible();
    });

    test('shows an error when name is missing', async ({ page }) => {
        await page.goto('/contact.html');
        await page.getByPlaceholder('Your Email').fill('user@mailinator.com');
        await page.getByPlaceholder('Your message...').fill('Hello!');
        await page.getByRole('button', { name: /send message/i }).click();
        await expect(page).toHaveURL(/error=/);
    });

    test('redirects to confirmation on valid submission', async ({ page }) => {
        await page.goto('/contact.html');
        await page.getByPlaceholder('Your Name').fill('Test User');
        await page.getByPlaceholder('Your Email').fill('test@mailinator.com');
        await page.getByPlaceholder('Your message...').fill('This is a test message.');
        await page.getByRole('button', { name: /send message/i }).click();
        await expect(page).toHaveURL(/contact-confirmation/);
    });

    /**
     * Requires MAILINATOR_API_TOKEN and CONTACT_NOTIFY_EMAIL pointing to a
     * Mailinator address so we can verify delivery.
     * Skip locally if credentials are not available.
     */
    test('notification email is received in Mailinator', async ({ page }) => {
        test.skip(!process.env.MAILINATOR_API_TOKEN, 'MAILINATOR_API_TOKEN not set');
        test.skip(!process.env.CONTACT_NOTIFY_EMAIL?.includes(MAILINATOR_DOMAIN),
            'CONTACT_NOTIFY_EMAIL is not a Mailinator address');

        const notifyInbox = process.env.CONTACT_NOTIFY_EMAIL.split('@')[0];
        await clearInbox(notifyInbox);

        await page.goto('/contact.html');
        await page.getByPlaceholder('Your Name').fill('Playwright Bot');
        await page.getByPlaceholder('Your Email').fill(`pw-bot@${MAILINATOR_DOMAIN}`);
        await page.getByPlaceholder('Your message...').fill('Automated Playwright test message.');
        await page.getByRole('button', { name: /send message/i }).click();
        await expect(page).toHaveURL(/contact-confirmation/);

        // Poll Mailinator for the notification
        const message = await waitForEmail(notifyInbox, /contact form/i, {
            timeoutMs: EMAIL_WAIT_TIMEOUT_MS
        });
        expect(message).toBeTruthy();
        const bodyPart = message.parts?.find((p) =>
            ['text/html', 'text/plain'].includes(p.contentType)
        );
        expect(bodyPart?.body ?? '').toMatch(/playwright bot/i);
    });
});

// ---------------------------------------------------------------------------
// Password reset flow
// ---------------------------------------------------------------------------

test.describe('Password reset flow', () => {
    test('shows the request reset form', async ({ page }) => {
        await page.goto('/request-reset.html');
        await expect(page.getByRole('heading', { name: /reset password/i })).toBeVisible();
        await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    });

    test('shows an error for an invalid email format', async ({ page }) => {
        await page.goto('/request-reset.html');
        await page.getByPlaceholder(/email/i).fill('notanemail');
        await page.getByRole('button', { name: /send reset link/i }).click();
        await expect(page).toHaveURL(/message=/);
    });

    /**
     * End-to-end reset test: submits the form with a Mailinator address,
     * reads the reset link from the received email, then sets a new password.
     * Requires MAILINATOR_API_TOKEN.
     */
    test('receives a reset email and can follow the link', async ({ page }) => {
        test.skip(!process.env.MAILINATOR_API_TOKEN, 'MAILINATOR_API_TOKEN not set');

        const inbox = uniqueInbox('reset');
        const email = `${inbox}@${MAILINATOR_DOMAIN}`;

        await clearInbox(inbox);

        await page.goto('/request-reset.html');
        await page.getByPlaceholder(/email/i).fill(email);
        await page.getByRole('button', { name: /send reset link/i }).click();
        await expect(page).toHaveURL(/message=/);

        // Fetch the reset email
        const message = await waitForEmail(inbox, /reset your password/i, {
            timeoutMs: EMAIL_WAIT_TIMEOUT_MS
        });
        expect(message).toBeTruthy();

        // Extract the reset link from the email body
        const bodyPart = message.parts?.find((p) =>
            ['text/html', 'text/plain'].includes(p.contentType)
        );
        const body = bodyPart?.body ?? '';
        const linkMatch = body.match(/href="([^"]*\/reset\/[^"]+)"/);
        expect(linkMatch).not.toBeNull();

        const resetLink = linkMatch[1];
        await page.goto(resetLink);
        await expect(page.getByRole('heading', { name: /create new password/i })).toBeVisible();

        // Set a new password
        await page.getByPlaceholder('New Password').fill('NewPassword123!');
        await page.getByRole('button', { name: /set new password/i }).click();
        await expect(page).toHaveURL(/confirmation\.html/);
    });
});
