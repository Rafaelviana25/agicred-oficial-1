[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
  
[[headers]]
  for = "/firebase-messaging-sw.js"
  [headers.values]
    Service-Worker-Allowed = "/"
    Cache-Control = "no-cache"