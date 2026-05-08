import asyncio
from playwright.async_api import async_playwright

async def capture_screenshots():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.set_viewport_size({"width": 1536, "height": 730})

        # Capture Mockup
        print("Capturing Mockup...")
        await page.goto("file:///D:/Tugas%20Akhir/nusanara/frontend/mockups/dashboard.html")
        await page.screenshot(path="C:/Users/ASUS/.gemini/antigravity/brain/5ad288a1-d3b2-478b-874d-3dba35c4d6e3/mockup_dashboard.png", full_page=True)

        # Capture Next.js
        print("Capturing Next.js...")
        await page.goto("http://localhost:3000/dashboard")
        # Give it a second to hydrate
        await asyncio.sleep(2)
        await page.screenshot(path="C:/Users/ASUS/.gemini/antigravity/brain/5ad288a1-d3b2-478b-874d-3dba35c4d6e3/nextjs_dashboard.png", full_page=True)

        await browser.close()
        print("Done.")

if __name__ == "__main__":
    asyncio.run(capture_screenshots())
