# Vercel Firewall Rate Limiting for `/api/ask`

Verified against Vercel docs on March 18, 2026.

This project's LLM spend starts in [`src/app/api/ask/route.ts`](/c:/git/portfolio/src/app/api/ask/route.ts#L69), so the safest low-maintenance protection is a Vercel Firewall rate limit on `/api/ask`.

This is the right first step here because:

- it requires no code changes
- it does not require Redis or another paid datastore
- it blocks obvious abuse before the request reaches the model
- this project is low traffic, so the included usage should be enough in normal conditions

## What Vercel currently supports

As of the docs linked below:

- WAF rate limiting is available on all Vercel plans
- Hobby supports `1` rate limit rule per project
- Hobby can count by `IP` or `JA4 Digest`
- Hobby uses `Fixed Window`
- Hobby time windows must be between `10s` and `10min`
- The first `1,000,000` allowed rate-limited requests per month are included
- Additional allowed requests are priced at `$0.50` per `1,000,000`

For a portfolio site, that makes `/api/ask` a reasonable place to spend the single Hobby rule.

## Recommended rule for this app

Start with this:

- Name: `Rate limit portfolio chat`
- Match path: `/api/ask`
- Strategy: `Fixed Window`
- Time Window: `10 minutes`
- Request Limit: `20`
- Counting Key: `IP`
- Action when exceeded: `429`

That is loose enough for a real visitor to have a short conversation, but tight enough to stop obvious loops and low-effort abuse.

If you want to be more lenient later, move to `30 requests / 10 minutes`. I would not start higher than that for a public LLM endpoint.

## Dashboard setup

1. Open the project in Vercel.
2. Open `Firewall` in the sidebar.
3. Select `Configure`.
4. Select `+ New Rule`.
5. Give the rule a clear name such as `Rate limit portfolio chat`.
6. In the `If` section, add a condition that matches only the chat endpoint.

Use a path condition that targets `/api/ask`. If the UI offers exact path matching, use that. If it offers pattern matching, keep it as narrow as possible and avoid broad `/api/*` matching.

7. In the `Then` section, choose `Rate Limit`.
8. If prompted, review the pricing dialog and continue.
9. Set:

- Limiting strategy: `Fixed Window`
- Time Window: `10 minutes`
- Request Limit: `20`
- Counting key: `IP`
- Follow-up action: `Default (429)`

10. Save the rule.
11. Review the pending firewall changes.
12. Publish the changes.

## Safer rollout

Vercel recommends testing a new rule with logging first before enforcing it. For this project, the safest rollout is:

1. Create the rule and first use `Log` if the UI offers that before final enforcement.
2. Watch traffic on the Firewall overview for a day or two.
3. Confirm that normal usage does not trigger the rule.
4. Change the action to `429`.
5. Publish again.

If you do not want a two-step rollout, applying `429` immediately to `/api/ask` is still reasonable because the path is narrow and low-risk.

## How to test it

After publishing:

1. Open the deployed site.
2. Use the chat normally a few times to confirm there is no regression.
3. Trigger repeated requests to `/api/ask` until the threshold is exceeded.
4. Confirm the endpoint starts returning `429`.
5. Wait for the full 10-minute window to expire and confirm access resumes.

Because this route streams, the important thing is that the request gets blocked before model generation starts. That is exactly what this setup is for.

## Why not put the rule on the whole site

Do not spend the single Hobby rule on all routes.

This project's expensive surface is `/api/ask`, not the landing page or static assets. Narrow path matching gives you the most protection for the least operational risk.

## Tradeoffs and limits

- This protects against basic abuse, not determined attackers.
- IP-based limiting can occasionally group multiple users behind one shared network.
- Vercel Hobby only allows one rate limit rule per project.
- Fixed-window limiting is simple, but can be bursty near window boundaries.
- Allowed requests that pass through the rule count toward rate-limiting usage.

For this portfolio, those tradeoffs are acceptable.

## If abuse grows later

If you later need stronger protection without introducing Redis first:

1. Keep the Vercel Firewall rule in place.
2. Add a challenge step such as Cloudflare Turnstile before starting a chat.
3. Only add app-level quotas after you have evidence the firewall rule is not enough.

## Sources

- Vercel WAF Rate Limiting: <https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting>
- Vercel WAF Custom Rules: <https://vercel.com/docs/vercel-firewall/vercel-waf/custom-rules>
- Vercel WAF Usage and Pricing: <https://vercel.com/docs/vercel-firewall/vercel-waf/usage-and-pricing>
