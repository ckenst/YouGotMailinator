## 📬 YouGotMailinator 

> *“You’ve Got Mail (inator)”*

YouGotMailinator is a lightweight demo app that showcases how to test email-based workflows (password resets, magic links, verification emails) using Mailinator.

This is a simple but fully functional password reset demo using Node.js, Express, and Nodemailer.


## Functionality:

1. You can request a password reset, using your email address
2. Your Gmail account will send the reset email to the email address you provided
3. You can click the reset link to reset your password in the app
4. You can login with your new password in the app


## Prerequisites

1. Node.js
2. You'll need an app password from your Gmail account 

## Setup

1. Run `npm install` to install dependencies.
2. Go to your Google Account settings > Security > App Passwords and create an app password. 
3. Rename `.env.example` to `.env` and add your Gmail credentials:

```
GMAIL_USER=your-gmail-address
GMAIL_PASSWORD=your-app-password
```

4. Finally you just run `node server.js` and navigate to `http://localhost:3000` in your browser.

## About

Built for testers. Friendly for developers. Great on video.
