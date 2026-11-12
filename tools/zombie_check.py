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
    page.on("console", lambda m: errors.append(f"{m.type}: {m.text}") if m.type in ("error", "warning") else None)
    page.goto(URL, wait_until="networkidle")
    page.click("#start-button")
    page.wait_for_timeout(2500)
    print("devhook:", page.evaluate("typeof window.__deadStreets"))
    page.evaluate("window.__deadStreets && (window.__deadStreets.player.position.z = 55)")
    page.keyboard.down("w")
    page.wait_for_timeout(6000)
    page.keyboard.up("w")
    page.wait_for_timeout(5000)
    page.screenshot(path=f"{OUT}\\zombie_1.png")
    page.wait_for_timeout(4000)
    page.screenshot(path=f"{OUT}\\zombie_2.png")
    for _ in range(6):
        page.mouse.click(640, 400)
        page.wait_for_timeout(150)
    page.wait_for_timeout(600)
    page.screenshot(path=f"{OUT}\\zombie_3.png")
    print("zombies:", page.evaluate("window.__deadStreets.zombies.zombies.length"))
    print("ERRORS:", errors if errors else "none")
    browser.close()
