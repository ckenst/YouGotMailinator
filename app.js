const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// --- CONFIGURATION ---
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// --- IN-MEMORY DATABASE ---
// In a real app, this would be a SQL or NoSQL database.
// Format: { "token-string" : "user@email.com" }
const resetTokens = new Map();
// Format: { "username" : { email: string, password: string } }  (simplified — no real hashing in this demo)
const users = new Map();

// --- EMAIL TRANSPORTER (GMAIL) ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
    }
});

// --- RATE LIMITING ---
// Protect sensitive endpoints from brute-force and enumeration attacks.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests, please try again later.'
});

// --- ROUTES ---

// 1. Login Page
// Served automatically by express.static (index.html)

app.post('/login', authLimiter, (req, res) => {
    const { email, password } = req.body;

    // Simple Logic: Email must have '@' and password > 5 chars
    if (email.includes('@') && password.length > 5) {
        res.redirect('/landing.html');
    } else {
        res.redirect('/?error=Invalid email or password (must be > 5 chars)');
    }
});

// 2. Landing Page (Successful Login)
// Served automatically by express.static (landing.html)

// 3. Request Reset Page
// Served automatically by express.static (request-reset.html)

app.post('/request-reset', authLimiter, (req, res) => {
    const { email } = req.body;

    if (!email.includes('@')) {
        return res.redirect('/request-reset.html?message=Please enter a valid email.');
    }

    // Generate a unique token
    const token = uuidv4();

    // Save token to "Database"
    resetTokens.set(token, email);

    // Create the reset link using the request host so it works across environments
    const resetLink = `${req.protocol}://${req.get('host')}/reset/${token}`;

    // Send the Email
    const mailOptions = {
        from: 'Password Demo <noreply@demo.com>',
        to: email,
        subject: 'Reset Your Password',
        text: `Click this link to reset your password: ${resetLink}`,
        html: `<p>You requested a password reset.</p><p>Click here: <a href="${resetLink}">Reset Password</a></p>`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
            return res.redirect('/request-reset.html?message=Error sending email. Check server console.');
        }
        console.log('Email sent: ' + info.response);
        res.redirect(`/request-reset.html?message=Check ${email} for the reset link!`);
    });
});

// 4. Reset Password Form (Access via Email Link)
app.get('/reset/:token', authLimiter, (req, res) => {
    const { token } = req.params;

    // Verify token exists
    if (resetTokens.has(token)) {
        // Serve the static file. The client-side JS will extract the token from the URL.
        res.sendFile(path.join(__dirname, 'public', 'reset-form.html'));
    } else {
        res.send('<h1>Invalid or Expired Token</h1><a href="/">Go Back</a>');
    }
});

app.post('/reset-password', authLimiter, (req, res) => {
    const { token, password } = req.body;

    // Verify token again
    if (!resetTokens.has(token)) {
        return res.send('Invalid token.');
    }

    // Validate new password
    if (password.length > 5) {
        // In a real app, you would update the user's password in the DB here

        // Delete the used token (Single Use)
        resetTokens.delete(token);

        res.redirect('/confirmation.html');
    } else {
        // Redirect back to the reset form with the token and error
        res.redirect(`/reset/${token}?error=Password must be > 5 chars`);
    }
});

// 5. Confirmation Page
// Served automatically by express.static (confirmation.html)

// 6. Signup Page
// Served automatically by express.static (signup.html)

app.post('/signup', authLimiter, (req, res) => {
    const { username, email, password } = req.body;

    if (!username || username.trim().length === 0) {
        return res.redirect('/signup.html?error=Username is required.');
    }

    if (!email.includes('@')) {
        return res.redirect('/signup.html?error=Please enter a valid email.');
    }

    if (!password || password.length <= 5) {
        return res.redirect('/signup.html?error=Password must be more than 5 characters.');
    }

    if (users.has(username)) {
        return res.redirect('/signup.html?error=Username already taken.');
    }

    // Store the new user (no real password hashing in this demo)
    users.set(username, { email, password });

    // Send a confirmation email
    const mailOptions = {
        from: `YouGotMailinator <${process.env.GMAIL_USER}>`,
        to: email,
        subject: 'Welcome to YouGotMailinator — Confirm Your Account',
        text: `Hi ${username},\n\nThanks for signing up! Your account has been created successfully.\n\nEnjoy the demo!\n\n— The YouGotMailinator Team`,
        html: `<p>Hi <strong>${username}</strong>,</p>
               <p>Thanks for signing up! Your account has been created successfully.</p>
               <p>Enjoy the demo!</p>
               <p>— The YouGotMailinator Team</p>`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Signup email error:', error);
            // Still redirect to confirmation even if email fails in demo context
        } else {
            console.log('Signup confirmation email sent:', info.response);
        }
    });

    res.redirect(`/signup-confirmation.html?email=${encodeURIComponent(email)}`);
});

// 7. Contact Us Page
// Served automatically by express.static (contact.html)

app.post('/contact', authLimiter, (req, res) => {
    const { name, email, message } = req.body;

    if (!name || name.trim().length === 0) {
        return res.redirect('/contact.html?error=Name is required.');
    }

    if (!email.includes('@')) {
        return res.redirect('/contact.html?error=Please enter a valid email.');
    }

    if (!message || message.trim().length === 0) {
        return res.redirect('/contact.html?error=Message is required.');
    }

    const notifyAddress = process.env.CONTACT_NOTIFY_EMAIL || process.env.GMAIL_USER;

    const mailOptions = {
        from: `YouGotMailinator <${process.env.GMAIL_USER}>`,
        to: notifyAddress,
        replyTo: email,
        subject: `Contact Form: Message from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
        html: `<p><strong>Name:</strong> ${name}</p>
               <p><strong>Email:</strong> ${email}</p>
               <p><strong>Message:</strong></p>
               <p>${message.replace(/\n/g, '<br>')}</p>`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log('Contact email error:', error);
            return res.redirect('/contact.html?error=Error sending message. Please try again.');
        }
        console.log('Contact email sent:', info.response);
        res.redirect('/contact-confirmation.html');
    });
});

module.exports = app;
