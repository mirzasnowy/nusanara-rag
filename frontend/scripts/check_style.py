import asyncio
from playwright.async_api import async_playwright

async def check():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto('http://localhost:3000/dashboard')
        await asyncio.sleep(2)
        
        halo = await page.query_selector('text="Halo"')
        if halo:
            style = await page.evaluate('''el => {
                const s = window.getComputedStyle(el);
                return `opacity: ${s.opacity}, display: ${s.display}, color: ${s.color}, font: ${s.fontFamily}, zIndex: ${s.zIndex}`;
            }''', halo)
            print("Halo style:", style)
            bbox = await halo.bounding_box()
            print("Halo bbox:", bbox)
        else:
            print("Halo not found")

        header = await page.query_selector('h1:has-text("Dashboard")')
        if header:
            style = await page.evaluate('''el => {
                const s = window.getComputedStyle(el);
                return `opacity: ${s.opacity}, display: ${s.display}, color: ${s.color}`;
            }''', header)
            print("Header style:", style)
            bbox = await header.bounding_box()
            print("Header bbox:", bbox)
        else:
            print("Header not found")

        await browser.close()

if __name__ == '__main__':
    asyncio.run(check())
