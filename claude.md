This is a critical adjustment. **GitHub Pages only hosts static content** (HTML, CSS, and JS). It does not support a running Node.js/Express backend. 

Since the Madison Metro Transit API likely has CORS (Cross-Origin Resource Sharing) restrictions—which prevents a browser from talking directly to their servers for security reasons—you typically *need* a backend proxy.

To keep this "Free" and deployable on GitHub Pages, we have to pivot the architecture. Here is the updated `claude.md` content with these constraints in mind.

---

## Updated claude.md (GitHub Pages Compatible)

### Project Vision: Madison Metro Tracker
A hyper-local transit web application for Madison, WI. 
**Deployment Target:** GitHub Pages (Static Hosting).

### 1. Revised Architecture (The "Static-First" Pivot)
Since GitHub Pages does not support a Node.js backend, we must use one of the following two paths:

* **Option A (The Proxy Path):** Use a free external "Serverless" provider (like **Vercel Functions** or **Netlify Functions**) to handle the Metro Transit API requests and bypass CORS.
* **Option B (The Direct Path):** Attempt direct client-side fetching if the Madison API allows it, or use a CORS proxy like `cors-anywhere` (though this is less reliable for production).

> **Instruction for Claude:** Default to **Option A**. Structure the code so the React frontend fetch calls point to a relative `/api/` endpoint, which will be handled by a serverless function during deployment.

### 2. GitHub Pages Specific Rules
* **Routing:** Use `HashRouter` instead of `BrowserRouter` in React. (GitHub Pages will 404 on a page refresh if using standard URLs like `/route/10`).
* **Base URL:** Ensure `vite.config.js` or `package.json` includes the `homepage` field so assets load correctly from `username.github.io/repo-name/`.
* **Environment Variables:** Do NOT hardcode API keys. Use `.env` files and GitHub Actions Secrets to inject keys during the build process.

### 3. Updated Technical Stack
* **Frontend:** React (Vite) + Tailwind CSS.
* **Deployment:** GitHub Actions (for automated `npm run build` and deploy).
* **Data Fetching:** Axios or Fetch with a "Service Layer" pattern to easily switch between a local dev backend and a production serverless proxy.

### 4. API Integration Strategy
* **GTFS-Static:** To save on API calls and stay within free-tier limits, Claude should write a script to "bake" the Madison bus stop locations into a static JSON file included in the `/src/assets` folder.
* **GTFS-RT (Realtime):** Only fetch the "Live" data (bus positions/occupancy) dynamically. 

### 5. Deployment Instructions (for Claude to follow)
1.  **Build Command:** `npm run build`.
2.  **Output Directory:** `dist`.
3.  **Hacks:** Include a `404.html` file in the public folder that redirects to `index.html` to help handle React Router refreshes.

---

### Why these changes matter:
1.  **No Node Server:** By moving the "Backend" logic into **Serverless Functions** (which are free on Vercel/Netlify), you keep the zero-cost promise while still having a "backend" to talk to the Madison API.
2.  **Reliability:** Using `HashRouter` prevents your app from breaking when a user hits "Refresh" on their browser while on a specific bus route page.
3.  **Performance:** "Baking" the static bus stop data into the app (instead of fetching it every time) makes the app feel much faster and look more professional.

**Ready to save this?** Just copy the text above into your `claude.md`. This version ensures Claude won't write a traditional Express server that you won't be able to host on GitHub.