# Event RSVP page — setup guide

Three files:

| File | What it is |
|---|---|
| `index.html` | The webpage (event details, RSVP form, add‑to‑calendar, guest list) |
| `apps-script.gs` | Free backend that saves RSVPs to a Google Sheet and emails calendar invites |
| `poster.jpg` | The poster shown at the top of the page |
| `og.jpg` | Preview image when the link is shared in iMessage, WhatsApp, etc. |
| `CNAME` | Tells GitHub Pages your custom domain |

Takes about 15 minutes.

---

## 1. Check the event details

Open `index.html` and find the `EVENT DETAILS` block near the bottom. It's set to Friday Nov 6, 7pm to midnight, at The Holmead House, Washington, DC. Add the street address there if you want it in people's calendar invites, and change the end time if needed.

## 2. Set up the RSVP backend (Google Sheet)

1. Go to [sheets.new](https://sheets.new) to make a new Google Sheet. Name it something like "Birthday RSVPs".
2. Click **Extensions → Apps Script**.
3. Delete the starter code, paste in everything from `apps-script.gs`, and click **Save**.
4. Click **Deploy → New deployment**. Click the gear icon, choose **Web app**, then set:
   - **Execute as:** Me
   - **Who has access:** Anyone
5. Click **Deploy** and approve the permissions. Google will warn that the app is unverified, which is normal for your own scripts. Click **Advanced → Go to (project name)**.
6. Copy the **Web app URL**. It ends in `/exec`.
7. In `index.html`, paste that URL into `rsvpEndpoint: ""`.

RSVPs now land in the **RSVPs** tab of your sheet.

### Optional: send real calendar invites by email

With this on, anyone who RSVPs yes with their email gets a Google Calendar invite in their inbox, and if you change the time or place later, everyone's calendar updates automatically.

1. In Apps Script, click **Services (+)** in the left sidebar, choose **Google Calendar API**, then click **Add**.
2. Fill in the `EVENT` block at the top of the script so it matches your page.
3. Choose `setupCalendarEvent` from the function dropdown at the top and click **Run**. This creates the event on your Google Calendar.
4. Click **Deploy → Manage deployments**, click the pencil icon, set **Version** to **New version**, and click **Deploy**. The URL stays the same.

Without this step, guests can still add the event themselves with the Google, Apple, and Outlook buttons.

> **Whenever you edit the script**, repeat step 4 above so the live version updates.

## 3. Publish on GitHub Pages

1. Create a GitHub account if you don't have one, then make a **new public repository** (for example `birthday`).
2. Click **Add file → Upload files** and upload `index.html`, `poster.jpg`, `og.jpg` and `CNAME`. Don't upload `apps-script.gs`; it isn't needed on the site.
3. Go to **Settings → Pages**. Under **Source**, choose **Deploy from a branch**, pick `main` and `/ (root)`, and click **Save**.

After about a minute, the site is live at `https://YOUR-USERNAME.github.io/birthday/`.

## 4. Connect your custom domain

1. Edit `CNAME` so it contains only your domain, for example `bday.yourname.com`.
2. At your domain registrar (Namecheap, GoDaddy, Cloudflare, etc.), add a DNS record:
   - **For a subdomain** like `bday.yourname.com`:
     `CNAME` record, host `bday`, value `YOUR-USERNAME.github.io`
   - **For a root domain** like `yourname.com`: four `A` records for host `@` pointing to
     `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
3. In GitHub, go to **Settings → Pages**, enter the domain under **Custom domain**, and click **Save**.
4. Once the DNS check passes (minutes to a few hours), tick **Enforce HTTPS**.

If you use Cloudflare, set the record to **DNS only** (grey cloud) until HTTPS is working.

---

## Good to know

- **Guest list privacy:** the page shows the names of everyone who said yes. To hide it, set `showGuestList: false` in `index.html` and `SHOW_GUEST_LIST = false` in the script. Emails and notes are never shown publicly.
- **Changed RSVPs:** if someone RSVPs twice, their latest answer counts.
- **Link previews:** once your domain works, change `content="og.jpg"` in `index.html` to the full address (e.g. `https://bday.yourname.com/og.jpg`) so the poster shows up when you text the link.
- **Preview mode:** until `rsvpEndpoint` is filled in, the form works but doesn't save anything, so you can test the page safely.
