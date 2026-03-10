# YouGotMailinator — Roadmap

This document tracks the planned features and improvements for the **YouGotMailinator** demo app.

---

## ✅ Completed

- Password reset flow (request link → click email link → reset password)
- Static HTML frontend served by Express

---

## 🚧 In Progress

### Account Creation Flow
> Demonstrates Mailinator email confirmation workflows.

- Sign-up form collects a username and email address
- Server sends a confirmation email to the provided address
- User lands on a confirmation page after submitting

### Contact Us Form
> Demonstrates Mailinator webhooks and rules.

- Contact form collects name, email, and message
- Server sends the message details to a configurable notification address
- Useful for showing Mailinator's inbound webhook and routing rules

### Automated Tests
> Ensures reliability as new flows are added.

- `tests/` folder with API-level tests using Jest + Supertest
- Covers login, signup, contact, and password-reset endpoints

---

## 🗺️ Planned

### React / Next.js Frontend Migration
> Replace vanilla HTML pages with a React-based frontend using Next.js.

- Component-based UI for better maintainability
- Client-side routing for a smoother user experience
- Reuse shared layout / navigation components across pages

### GitHub Pages Deployment
> Make the demo publicly accessible without requiring a local server.

- Configure a Next.js static export (`next export`)
- Set up a GitHub Actions workflow to build and deploy to GitHub Pages on every push to `main`
- Document deployment steps in the README

---

## 💡 Future Ideas

- Magic-link login flow
- Webhook listener endpoint to capture inbound Mailinator webhook payloads and display them live in the UI
- Multiple email-provider support (SendGrid, SMTP, Mailgun) selectable via environment variables
- Dark-mode UI theme
