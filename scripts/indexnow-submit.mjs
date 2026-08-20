// Submits URLs to IndexNow (Bing/Yandex instant indexing) after a deploy.
// Usage: node scripts/indexnow-submit.mjs https://www.tryzorin.com/blog/my-new-post [more-urls...]
// Key file must already exist at public/<key>.txt (see public/ef163c3695bc0d0c324da556ea420baf.txt).

const KEY = "ef163c3695bc0d0c324da556ea420baf";
const HOST = "www.tryzorin.com";

const urlList = process.argv.slice(2);

if (urlList.length === 0) {
  console.error("Usage: node scripts/indexnow-submit.mjs <url> [url...]");
  process.exit(1);
}

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: `https://${HOST}/${KEY}.txt`,
    urlList,
  }),
});

console.log(`IndexNow submit: ${res.status} ${res.statusText}`);
if (!res.ok) process.exit(1);
