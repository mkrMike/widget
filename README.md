# Samatrica chat widget

The chat bubble a business embeds on its own website for anonymous visitors.
No login: it talks to the backend's public API (`/api/public/widgets/{key}/chat/**`).

## Embedding

```html
<script
  src="https://…/widget.js"
  data-widget-key="wgt_…"
  data-api-url="https://api.…"
></script>
```

- `data-widget-key` (required): the public key of a row in the backend's `widget` table.
- `data-api-url`: the backend origin, `http://localhost:8080` by default.

The widget renders in a Shadow DOM, so the host page's CSS doesn't affect it.
The conversation (id, access token, messages) is kept in `sessionStorage` per
widget key, so reloading the page continues the chat.

## Flow

1. The first message starts a conversation; the next ones continue it.
2. After a few anonymous messages the backend refuses the message and asks for
   contact details: the widget shows a contact form.
3. The visitor enters the codes sent by email, then by SMS.
4. Once verified, the backend returns a new access token (the old one is
   revoked) and the chat continues with no limit.

If the access token is no longer valid, the widget forgets the conversation
and the next message starts a new one.

## Booking panel

Only the visitor books or cancels, in the booking panel; the assistant just
opens it (`bookingForm` in its replies, pre-selecting a resource and day).
The panel also opens with the **Book** button in the header.

- **New booking:** resource, month calendar (days with free slots), the day's
  free times, then "Request this time". A booking is a request awaiting the
  business's confirmation.
- **My reservations:** the visitor's upcoming reservations (pending or
  confirmed), each with Cancel.

Browsing is open to anonymous visitors; booking and the reservation list need a
verified visitor. The widget asks for verification first, then reopens the
panel on the same resource and day. Each booking or cancellation is confirmed
in the chat.

## Development

```sh
npm install
npm run dev     # http://localhost:5174: a fake business page with the widget
npm run build   # dist/widget.js, the file to host
```

Needs the backend on http://localhost:8080 and a widget key in its database:

```sql
INSERT INTO widget (tenant_id, public_key, name, created_at, created_by, modified_at, modified_by)
VALUES (<tenantId>, 'wgt_demo', 'Website', now() AT TIME ZONE 'UTC', 'system', now() AT TIME ZONE 'UTC', 'system');
```

The database is on `localhost:5433`, database `platform`, user/password `app`/`app`.

Email codes arrive in Mailpit (http://localhost:8025). Phone codes only appear
in the backend log: search for `[NO SMS PROVIDER - DEV ONLY]`.
