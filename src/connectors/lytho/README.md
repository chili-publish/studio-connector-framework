# Lytho Media Connector

The Lytho connector lets you browse, search, and place images from your Lytho DAM directly in CHILI GraFx Studio. It is read-only: assets are never uploaded to or changed in Lytho.

## Setup guide

The full setup guide, with screenshots, is in the CHILI GraFx documentation:

[Media Connector for Lytho](https://docs.chiligrafx.com/GraFx-Studio/connectors/connector-lytho/)

Setting up the connector is a one-time task for an administrator. Template Designers and end users never enter the connector's credentials. With per-user sign-in, each user signs in once with their own Lytho login.

## Setup at a glance

1. **In Lytho**, a Lytho account admin goes to **Settings → Advanced → GraFx connector** and clicks **Generate credentials**. The page lists every value the connector needs. The client secret is shown only once.
2. **In CHILI GraFx**, install the Lytho connector from the Connector Hub. In your environment's **Settings → Connectors**, switch on the **Available** toggle of the Lytho row (a newly added connector is off by default), then open the connector.
3. On the **Configuration** tab, paste the values Lytho labels **Runtime options → LYTHO_BASE_URL** and **Proxy settings → Allowed domain**.
4. On the **Authentication** tab, choose how users sign in:
   - **Account-level access**: everyone sees every asset in the Lytho account. Use OAuth 2.0 Client Credentials for server and browser, with the **Client ID**, **Client secret**, **Token endpoint**, and **Scope** from Lytho.
   - **Per-user sign-in**: each user signs in to Lytho and sees only the assets they may see. Use OAuth 2.0 Client Credentials for the server and OAuth 2.0 Authorization Code for the browser, which also needs the **Authorization endpoint** from Lytho. Then register the connector in Lytho under **Connectors using per-user sign-in**.

You need one set of credentials per Lytho account. Use them in every GraFx environment you connect, for example both your sandbox and your production environment.

## Which assets are available

- Only file types GraFx Studio can use are offered: EPS, JPG/JPEG, PDF, PNG, PSD, TIF/TIFF, and AI.
- Assets outside their publish dates in Lytho are never offered.
- With per-user sign-in, assets outside their visible dates are hidden unless the user may see embargoed assets, just as in Lytho.

## Support

For help with the Lytho side of the setup, contact Lytho Support at [support@lytho.com](mailto:support@lytho.com).
