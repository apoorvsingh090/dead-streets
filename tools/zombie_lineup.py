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
    count = page.evaluate(
        """(() => {
          const g = window.__deadStreets;
          const base = g.player.position;
          const yaw = g.player.yaw;
          const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
          const rx = Math.cos(yaw), rz = -Math.sin(yaw);
          const spawn = (type, dist, side) => {
            const p = base.clone();
            p.set(base.x + fx * dist + rx * side, 0, base.z + fz * dist + rz * side);
            g.zombies.spawn(type, p);
          };
          spawn('walker', 6, 0);
          spawn('runner', 8, 1.6);
          spawn('brute', 9, -2.2);
          spawn('spitter', 11, 2.2);
          return g.zombies.zombies.length;
        })()"""
    )
    print("spawned zombies total:", count)
    for i in range(6):
        page.wait_for_timeout(1500)
        page.screenshot(path=f"{OUT}\\lineup_{i}.png")
    print("ERRORS:", errors if errors else "none")
    browser.close()
