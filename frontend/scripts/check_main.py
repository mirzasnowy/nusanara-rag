import asyncio
from playwright.async_api import async_playwright

async def check():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto('http://localhost:3000/dashboard')
        await asyncio.sleep(2)

        main = await page.query_selector('main')
        if main:
            bbox = await main.bounding_box()
            style = await page.evaluate('el => window.getComputedStyle(el).marginLeft', main)
            print("Main bbox:", bbox, "marginLeft:", style)

        h2 = await page.query_selector('h2.cinematic-heading')
        if h2:
            bbox = await h2.bounding_box()
            print("H2 bbox:", bbox)
        
        await browser.close()

if __name__ == '__main__':
    asyncio.run(check())
