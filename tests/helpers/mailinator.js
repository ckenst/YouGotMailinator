/**
 * Mailinator helper — thin wrapper around the mailinator-client SDK.
 *
 * Requires the MAILINATOR_API_TOKEN environment variable to be set.
 * The MAILINATOR_DOMAIN environment variable should match the private
 * domain configured in your Mailinator account (defaults to 'mailinator.com'
 * for public inboxes, but a private domain is recommended for CI).
 *
 * See: https://github.com/manybrain/mailinator-javascript-client
 */

const {
    MailinatorClient,
    GetInboxRequest,
    GetMessageRequest,
    DeleteMessageRequest
} = require('mailinator-client');

const MAILINATOR_API_TOKEN = process.env.MAILINATOR_API_TOKEN || '';
const MAILINATOR_DOMAIN = process.env.MAILINATOR_DOMAIN || 'mailinator.com';

/**
 * Wait for a new email to arrive in a Mailinator inbox, polling until one
 * matching the subjectPattern arrives or the timeout is exceeded.
 *
 * @param {string} inbox           - The inbox name (the part before @domain)
 * @param {RegExp|string} subjectPattern - Pattern to match against email subject
 * @param {object} [options]
 * @param {number} [options.pollIntervalMs=2000] - Milliseconds between polls
 * @param {number} [options.timeoutMs=30000]     - Total wait time in milliseconds
 * @returns {Promise<object>} The full message object from the Mailinator API
 */
async function waitForEmail(inbox, subjectPattern, options = {}) {
    const { pollIntervalMs = 2000, timeoutMs = 30000 } = options;
    const client = new MailinatorClient(MAILINATOR_API_TOKEN);
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        const inboxResp = await client.request(
            new GetInboxRequest(MAILINATOR_DOMAIN, inbox)
        );

        const msgs = inboxResp.result?.msgs ?? [];
        const match = msgs.find((msg) => {
            const subject = msg.subject ?? '';
            return typeof subjectPattern === 'string'
                ? subject.includes(subjectPattern)
                : subjectPattern.test(subject);
        });

        if (match) {
            // Fetch the full message to get the body
            const msgResp = await client.request(
                new GetMessageRequest(MAILINATOR_DOMAIN, match.id)
            );
            return msgResp.result;
        }

        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(
        `Timed out after ${timeoutMs}ms waiting for email matching "${subjectPattern}" in inbox "${inbox}@${MAILINATOR_DOMAIN}"`
    );
}

/**
 * Delete all messages in a Mailinator inbox. Useful for test cleanup.
 *
 * @param {string} inbox - The inbox name
 */
async function clearInbox(inbox) {
    const client = new MailinatorClient(MAILINATOR_API_TOKEN);
    const inboxResp = await client.request(
        new GetInboxRequest(MAILINATOR_DOMAIN, inbox)
    );

    const msgs = inboxResp.result?.msgs ?? [];
    await Promise.all(
        msgs.map((msg) =>
            client.request(new DeleteMessageRequest(MAILINATOR_DOMAIN, inbox, msg.id))
        )
    );
}

module.exports = { waitForEmail, clearInbox, MAILINATOR_DOMAIN };
