import sys
from playwright.sync_api import sync_playwright

URL = "http://localhost:4173"
OUT = "C:\\Users\\Apoorv\\dead-streets\\tools"

with sync_playwright() as pw:
    browser = pw.chromium.launch(
        channel="chrome",
        headless=True,
        args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"],
    )
    page = browser.new_page(viewport={"width": 1280, "height": 800})
    page.goto(URL, wait_until="networkidle")
    page.screenshot(path=f"{OUT}\\shot_menu.png")
    page.click("#start-button")
    page.wait_for_timeout(4000)
    page.screenshot(path=f"{OUT}\\shot_game_rifle.png")
    page.keyboard.press("2")
    page.wait_for_timeout(800)
    page.screenshot(path=f"{OUT}\\shot_game_shotgun.png")
    page.keyboard.press("3")
    page.wait_for_timeout(800)
    page.screenshot(path=f"{OUT}\\shot_game_pistol.png")
    page.keyboard.press("1")
    page.wait_for_timeout(500)
    # fire a few shots to see recoil/muzzle flash
    for _ in range(3):
        page.mouse.click(640, 400)
        page.wait_for_timeout(120)
    page.wait_for_timeout(300)
    page.screenshot(path=f"{OUT}\\shot_game_fire.png")
    console = []
    page.on("console", lambda msg: console.append(f"{msg.type}: {msg.text}"))
    page.wait_for_timeout(1000)
    browser.close()
    print("console captured after close (note: listener attached late)")
