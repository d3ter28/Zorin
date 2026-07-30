# Blog Publishing & Indexing Schedule

## Current state (as of 2026-07-30)

15 blog posts were published in a short burst across three sessions
(2026-07-27 to 2026-07-30), all on a brand-new domain with no backlink
history yet. That burst has already happened and can't be undone, but
it's a real risk factor worth correcting for going forward: rapid,
templated content publication on a low-authority domain is one of the
patterns Google's spam systems (specifically "scaled content abuse,"
named in the March 2024 update) watch for, regardless of whether the
content itself is genuinely good.

**Immediate action: pause new posts for at least 1-2 weeks** before
resuming, so the 15 already live have time to get crawled, indexed, and
ideally picked up by a few real visits/backlinks before more content
arrives on top of them.

## Ongoing cadence (once the pause is over)

**Publish 1-2 new posts per week, not more**, until the domain has
meaningfully more authority (real backlinks, consistent traffic,
Domain Authority climbing from its current near-zero starting point).
This is deliberately conservative for a pre-launch/early-access product
with no existing audience. Revisit and potentially increase pace once:

- The domain has accumulated some real backlinks (not just self-links)
- Search Console shows consistent indexing of new posts within days, not weeks
- There's a real audience reading the blog (return visits, time on page, not just crawler traffic)

## Per-post publishing checklist

1. Write and verify the post locally (dev server + preview tools) before pushing.
2. Commit and push **one post at a time** (or a small batch, max 2-3),
   not another double-digit burst.
3. Confirm the deploy is live (`https://www.tryzorin.com/blog/<slug>` loads).
4. In Google Search Console, use URL Inspection → Request Indexing on
   the new post's specific URL.
   - GSC's manual indexing quota is roughly 10-12 URL submissions per
     day per property — nowhere near a limit at 1-2 posts/week, so this
     is a non-issue at this cadence.
   - No need to resubmit `sitemap.xml` itself each time — it's generated
     dynamically from `posts.ts` and Google re-fetches it on its own
     schedule once it's been submitted the first time.
5. Do NOT re-click Request Indexing repeatedly on the same URL while
   waiting for it to show as indexed. One request is enough; recheck
   status every day or two instead.

## Suggested weekly slot

Pick a consistent day (e.g. every Monday) to publish that week's 1-2
posts, rather than an irregular/bursty schedule. Consistency itself is
a mild positive signal, and it keeps this from turning into another
double-digit dump.

## Why this matters specifically for Zorin right now

Per `HANDOVER.md`, the domain is newly live, Search Console was only
recently verified, and Domain Authority is presumably still near the
starting point (per the seoexpert.sg research read into during blog
content research, climbing from near-zero takes months of consistent,
real signals — not a instant content dump). Protecting the domain's
early reputation matters more right now than maximizing content volume.
