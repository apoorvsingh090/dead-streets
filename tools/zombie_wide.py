from playwright.sync_api import sync_playwright

URL = "http://localhost:5173"
OUT = "C:\\Users\\Apoorv\\dead-streets\\tools"

with sync_playwright() as pw:
    browser = pw.chromium.launch(
        channel="chrome",
        headless=True,
        args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"],
    )
    page = browser.new_page(viewport={"width": 1280, "height": 800})
    errors = []
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    page.goto(URL, wait_until="networkidle")
    page.click("#start-button")
    page.wait_for_timeout(2000)
    page.evaluate("window.__deadStreets.player.position.z = 55")
    for i in range(10):
        page.wait_for_timeout(1200)
        page.screenshot(path=f"{OUT}\\wave_{i}.png")
    state = page.evaluate("window.__deadStreets.zombies.zombies.map(z => ({type: z.type, dead: z.dead, d: Math.round(Math.hypot(z.position.x - window.__deadStreets.player.position.x, z.position.z - window.__deadStreets.player.position.z))}))")
    print("zombies:", state)
    print("ERRORS:", errors if errors else "none")
    browser.close()
