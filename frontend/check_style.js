const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForTimeout(2000);
    const el = await page.$(':text("Halo")');
    if (el) {
        const style = await el.evaluate(e => {
            const s = window.getComputedStyle(e);
            return {
                display: s.display,
                opacity: s.opacity,
                visibility: s.visibility,
                color: s.color,
                width: s.width,
                height: s.height,
                zIndex: s.zIndex,
                fontFamily: s.fontFamily,
                position: s.position
            };
        });
        console.log("Halo Text Style:", style);
    } else {
        console.log('Halo Text Not found');
    }

    const header = await page.$('text=Dashboard');
    if (header) {
        const hStyle = await header.evaluate(e => {
            const s = window.getComputedStyle(e);
            return {
                display: s.display,
                color: s.color,
                opacity: s.opacity,
                visibility: s.visibility,
                width: s.width,
                height: s.height
            }
        });
        console.log("TopHeader text style:", hStyle);
    } else {
        console.log('TopHeader not found');
    }

    await browser.close();
})();
