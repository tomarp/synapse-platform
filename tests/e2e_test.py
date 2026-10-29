"""End-to-end test in a real browser (Chromium via Playwright).

    pip install playwright && python -m playwright install chromium
    python tests/e2e_test.py

1. A short protocol with every step type runs to the end with keyboard and mouse responses, a questionnaire,
   a time limit that shows "Continue", and a soundscape; the data page then offers a ZIP with 4 files whose
   trial counts match the protocol.
2. The demo (full SYNAPSE session) starts, every step can be skipped, and the data are marked as demo.
3. The settings page opens the SYNAPSE protocol, adds a step and saves a copy.
"""
from __future__ import annotations

import csv
import functools
import http.server
import io
import json
import sys
import threading
import zipfile
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]

SHORT = {
    "format": "synapse-protocol/1", "id": "e2e_short", "name": "E2E short", "description": "test",
    "settings": {"timer_visible": True, "on_timeout": "show_continue", "keyboard": True, "play_audio": True, "audio_volume": 0,
                 "theme": "light", "theme_field": "lighting", "theme_map": {"warm": "light", "cool": "dark"}},
    "session_fields": [{"id": "lighting", "label": "Lighting", "options": ["warm", "cool"]},
                       {"id": "order", "label": "Order", "options": ["babble_first", "traffic_first"]}],
    "audio_slots": {"r1": {"by": "order", "map": {"babble_first": "cafeteria_babble", "traffic_first": "road_traffic"}}},
    "steps": [
        {"id": "intro", "type": "message", "title": "Welcome", "text": "Hello", "button": "Continue"},
        {"id": "q", "type": "questionnaire", "title": "T1", "questionnaire": "questionnaires/synapse_T1_ieq.json", "time_limit_s": 0},
        {"id": "rest", "type": "baseline", "title": "Rest", "duration_s": 2, "text": "Rest"},
        {"id": "nb", "type": "nback", "variant": "letter", "title": "NB", "levels": [1, 2], "trials_per_level": 4, "target_ratio": 0.3,
         "fixation_ms": 50, "iti_ms": 50, "time_limit_s": 0, "audio": "r1"},
        {"id": "st", "type": "stroop", "variant": "emoji", "title": "ST", "trials": 4, "congruent_ratio": 0, "fixation_ms": 50, "iti_ms": 50, "time_limit_s": 0, "shuffle_group": "g"},
        {"id": "se", "type": "stroop", "variant": "emotional_image", "title": "SE", "trials": 3, "fixation_ms": 50, "iti_ms": 50, "time_limit_s": 0, "shuffle_group": "g"},
        {"id": "fl", "type": "flanker", "variant": "arrow", "title": "FL", "trials": 6, "fixation_ms": 50, "iti_ms": 50, "time_limit_s": 0,
         "practice_trials": 2, "feedback": "practice"},
        {"id": "own", "type": "questionnaire", "title": "Own", "time_limit_s": 0, "questionnaire": {"id": "own", "title": "Own", "sections": [{"title": "", "items": [
            {"id": "effort", "text": "Effort?", "type": "scale", "points": 7, "labels": ["low", "high"], "required": True}]}]}},
        {"id": "vc", "type": "visual", "variant": "count", "title": "VC", "items": "all", "max_trials": 2, "iti_ms": 50, "time_limit_s": 0},
        {"id": "vs", "type": "visual", "variant": "shape", "title": "VS", "items": "verifiable", "max_trials": 2, "iti_ms": 50, "time_limit_s": 0},
        {"id": "slow", "type": "flanker", "variant": "digit", "title": "Timed", "trials": 50, "fixation_ms": 50, "iti_ms": 50, "time_limit_s": 2},
        {"id": "end", "type": "message", "title": "Thank You!", "text": "Done", "button": ""},
    ],
}
EXPECTED_TRIALS = {"nb": 8, "st": 4, "se": 3, "fl": 8, "vc": 2, "vs": 2}   # fl: 6 recorded + 2 practice


def serve() -> str:
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    handler = functools.partial(Quiet, directory=str(ROOT))
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    httpd.handle_error = lambda *a: None                 # browser cancels audio range requests; not an app error
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{httpd.server_address[1]}/"


def start_session(page, protocol_name: str, pid: str, sid: str, fields: dict[str, str] | None = None):
    page.select_option("#protocol", label=protocol_name)
    page.fill("#participant", pid)
    page.fill("#session", sid)
    for k, v in (fields or {}).items():
        page.select_option(f'select[data-field="{k}"]', v)
    page.uncheck("text=Full screen")
    page.click("button.btn.primary.big")


def answer_questionnaire(page):
    page.click("form.questionnaire button[type=submit]")                     # empty submit -> validation message
    expect(page.locator(".item.missing").first).to_be_visible()
    for sel in page.locator("form.questionnaire select").all():
        sel.select_option(index=1)
    for name in sorted(set(r.get_attribute("name") for r in page.locator("form.questionnaire input[type=radio]").all())):
        page.locator(f'input[name="{name}"]').first.check()
    for box in page.locator("form.questionnaire input[type=checkbox]").all()[:1]:
        box.check()
    for t in page.locator("form.questionnaire input[type=text], form.questionnaire input[type=number]").all():
        t.fill("7")
    page.click("form.questionnaire button[type=submit]")


def respond_until_complete(page, use_keys: list[str] | None = None, seen: dict | None = None):
    """Answer trials until the 'Task Complete' card appears; alternate keyboard and mouse."""
    page.click("button.btn.primary >> text=/Start/")
    n = 0
    while True:
        if page.locator("text=Task Complete").count():
            break
        if seen is not None and page.locator(".feedback").count():
            seen["feedback"] = True
        if page.locator("text=Practice complete").count():
            if seen is not None:
                seen["practice_screen"] = True
            page.click(".card.center button:has-text('Start')")
            continue
        if page.locator("text=/Start Level/").count():
            page.click("text=/Start Level/")
            continue
        if page.locator(".count-input").count():
            page.fill(".count-input", "5")
            page.keyboard.press("Enter")
        else:
            btn = page.locator("button.response:not([disabled])").first
            try:
                btn.wait_for(timeout=3000)
            except Exception:
                continue
            if use_keys and n % 2:
                page.keyboard.press(use_keys[n % len(use_keys)])
            else:
                btn.click()
        n += 1
        page.wait_for_timeout(30)
    page.click(".card.center button.btn.primary")


def main() -> int:
    url = serve()
    errors: list[str] = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        ctx = browser.new_context(accept_downloads=True, viewport={"width": 1280, "height": 860})
        page = ctx.new_page()
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.goto(url)
        expect(page.locator(".topnav .brand")).to_contain_text("SYNAPSE")
        expect(page.locator(".task-card")).to_have_count(9)
        expect(page.locator(".logo-tile img")).to_have_count(5)
        for img in page.locator("img").all():                                  # every image on the page loads
            img.scroll_into_view_if_needed()
            assert page.evaluate("i => i.complete && i.naturalWidth > 0", img.element_handle()), img.get_attribute("src")
        page.evaluate("p => localStorage.setItem('synapse.protocols', JSON.stringify([p]))", SHORT)

        # 1 -- short protocol to the end
        page.goto(url + "#/start")
        start_session(page, "E2E short", "P99", "A", {"lighting": "cool", "order": "traffic_first"})
        expect(page.locator("body")).to_have_attribute("data-theme", "dark")
        assert not page.locator(".run-bar button:has-text('Continue')").is_visible(), "Continue must be hidden before the time limit"
        assert page.locator(".run-bar .ctl").count() == 1, "live sessions show only the researcher menu"
        assert not page.locator(".run-bar .ctl:has-text('Skip')").count()
        page.click(".card.center button:has-text('Continue')")                 # message
        answer_questionnaire(page)                                              # T1
        expect(page.locator("text=Baseline complete")).to_be_visible(timeout=6000)
        page.click(".card.center button.btn.primary")
        respond_until_complete(page, ["j", "f"])                                 # n-back (2 levels)
        respond_until_complete(page, ["r", "g", "b", "y"])                       # Stroop (random order group: emoji / emotional)
        respond_until_complete(page)                                             # Stroop (the other one)
        seen: dict = {}
        respond_until_complete(page, ["ArrowLeft", "ArrowRight"], seen)          # arrow flanker with practice + feedback
        assert seen.get("practice_screen") and seen.get("feedback"), seen
        page.locator(".likert-point").nth(4).click()                             # own rating-scale question
        page.click("form.questionnaire button[type=submit]")
        respond_until_complete(page)                                             # counting
        respond_until_complete(page, ["s", "d"])                                 # shape
        page.click("button.btn.primary >> text=/Start/")                          # timed flanker: wait for limit
        assert not page.locator(".run-bar button:has-text('Continue')").is_visible()
        page.locator(".run-bar button:has-text('Continue')").wait_for(state="visible", timeout=8000)
        page.click(".run-bar button:has-text('Continue')")
        expect(page.locator("h1")).to_have_text("Thank You!")
        page.click(".run-bar button:has-text('Finish')")
        expect(page.locator("h1")).to_have_text("Data")
        with page.expect_download() as dl:
            page.locator("tr.hl button:has-text('Download')").click()
        z = zipfile.ZipFile(dl.value.path())
        names = sorted(z.namelist())
        assert len(names) == 4 and all(n.startswith("P99_A_") for n in names), names
        trials = list(csv.DictReader(io.StringIO(z.read(next(n for n in names if n.endswith("_trials.csv"))).decode())))
        counts = {k: sum(1 for t in trials if t["step_id"] == k) for k in EXPECTED_TRIALS}
        assert counts == EXPECTED_TRIALS, counts
        assert all(t["field_lighting"] == "cool" for t in trials)
        assert {t["soundscape"] for t in trials if t["step_id"] == "nb"} == {"road_traffic_spectrum_noise.wav"}
        assert all(t["rt_ms"].isdigit() and t["correct"] in ("0", "1") for t in trials)
        assert any(t["response_key"] not in ("click", "typed") for t in trials), "keyboard responses missing"
        answers = list(csv.DictReader(io.StringIO(z.read(next(n for n in names if n.endswith("_questionnaires.csv"))).decode())))
        own = [a for a in answers if a["step_id"] == "own"]
        assert len(own) == 1 and own[0]["code"] == "5" and own[0]["answer"] == "5", own
        answers = [a for a in answers if a["step_id"] == "q"]
        assert len(answers) == 12 and all(a["code"] == "1" for a in answers), answers[:2]       # first option chosen
        assert all("field_soundscape_order" not in a for a in answers), "fields of another protocol leaked"
        events = z.read(next(n for n in names if n.endswith("_events.csv"))).decode()
        assert "time_limit_reached" in events and "step_end" in events, events
        assert ",intro,step_end,completed" in events and ",slow,step_end,continue" in events, events
        assert {t["phase"] for t in trials if t["step_id"] == "fl"} == {"practice", "main"}
        assert sum(t["phase"] == "practice" for t in trials if t["step_id"] == "fl") == 2
        session = json.loads(z.read(next(n for n in names if n.endswith("_session.json"))))
        assert sorted(session["step_order"][4:6]) == ["se", "st"] and session["step_order"][6] == "fl", session["step_order"]
        assert session["status"] == "completed" and session["protocol"]["id"] == "e2e_short" and isinstance(session["seed"], int)
        print("1 short protocol: OK", counts)

        # 2 -- demo: full SYNAPSE session, skip every step
        page.goto(url + "#/demo")
        page.uncheck("text=Full screen")
        page.click("button.btn.primary.big")
        expect(page.locator(".run-counter")).to_have_text("Step 1 / 15")
        page.click(".run-bar .ctl:has-text('Steps')")                          # jump to step 10 from the step menu
        page.click(".run-menu .step-item[data-k='9']")
        expect(page.locator(".run-counter")).to_have_text("Step 10 / 15")
        page.click(".run-bar .ctl:has-text('Back')")
        expect(page.locator(".run-counter")).to_have_text("Step 9 / 15")
        page.keyboard.press("Alt+ArrowRight")                                    # keyboard shortcut: next step
        expect(page.locator(".run-counter")).to_have_text("Step 10 / 15")
        page.locator(".run-progress .seg").nth(0).click()                        # progress bar: back to the first step
        expect(page.locator(".run-counter")).to_have_text("Step 1 / 15")
        steps = 0
        while page.locator(".run-bar .ctl:has-text('Skip')").count():
            steps += 1
            page.click(".run-bar .ctl:has-text('Skip')")
            page.wait_for_timeout(80)
            if steps > 30:
                break
        expect(page.locator("h1")).to_have_text("Thank You!")
        assert steps == 14, steps
        page.click(".run-bar button:has-text('Finish')")
        page.check("text=Show demo sessions") if not page.locator("tr.hl").count() else None
        expect(page.locator("tr.hl")).to_contain_text("demo")
        with page.expect_download() as dl:
            page.click("text=/Download all/")
        names = zipfile.ZipFile(dl.value.path()).namelist()
        assert "all_sessions_trials.csv" in names and "all_sessions_questionnaires.csv" in names, names
        print("2 demo + combined download: OK", steps, "steps skipped")

        # 3 -- designer: template, step library, preview, save
        page.evaluate("localStorage.removeItem('synapse.pref.draft')")
        page.goto(url + "#/designer")
        page.click(".template:has-text('Quick cognitive battery')")
        expect(page.locator("details.section h2", has_text="Steps (6)")).to_be_visible()
        assert page.locator(".total-time").inner_text().endswith("min")
        page.click(".lib-card:has-text('Flanker')")
        expect(page.locator("details.section h2", has_text="Steps (7)")).to_be_visible()
        expect(page.locator(".save-state")).to_contain_text("Unsaved")
        trials_in = page.locator("details.step[open] label.field:has(span:text-is('Trials')) input")
        trials_in.fill("6")
        trials_in.press("Tab")
        expect(page.locator("details.step[open] > summary")).to_contain_text("6 trials")
        page.locator("details.step[open] button:has-text('Preview')").click()
        page.click("button.btn.primary >> text=/Start/")
        import time
        t_end = time.time() + 40
        while time.time() < t_end:
            if page.locator(".summary").count():
                break
            b = page.locator("button.response:not([disabled])").first
            if b.count():
                b.click()
            page.wait_for_timeout(30)
        expect(page.locator(".summary")).to_be_visible()
        page.click("text=Back to the designer")
        expect(page.locator("details.section h2", has_text="Steps (7)")).to_be_visible()   # back in the designer, draft kept
        page.click(".save-bar button:has-text('Save') >> nth=-1")
        expect(page.locator(".save-state")).to_contain_text("Saved")
        saved = page.evaluate("JSON.parse(localStorage.getItem('synapse.protocols'))")
        assert any(p["id"] == "quick_battery" and len(p["steps"]) == 7 for p in saved), [p["id"] for p in saved]
        page.goto(url + "#/designer/synapse_full_session")
        expect(page.locator("details.section h2", has_text="Steps (15)")).to_be_visible()
        print("3 designer: OK")

        # 4 -- try one task from the home page: summary appears, nothing is kept
        n_before = len(page.evaluate("JSON.parse(localStorage.getItem('synapse.sessions') || '[]')"))
        page.goto(url)
        page.click(".task-card:has-text('Colour-word Stroop') >> text=Try it")
        page.click("button.btn.primary >> text=/Start/")
        for _ in range(12):
            page.locator("button.response:not([disabled])").first.click()
        expect(page.locator(".summary")).to_be_visible(timeout=8000)
        expect(page.locator(".stats")).to_contain_text("12")
        page.click("text=Back to the start page")
        expect(page.locator(".topnav .brand")).to_be_visible()
        assert len(page.evaluate("JSON.parse(localStorage.getItem('synapse.sessions') || '[]')")) == n_before
        print("4 try a task: OK")
        browser.close()
    errors = [e for e in errors if "favicon" not in e and "play()" not in e]
    if errors:
        print("browser errors:", *errors, sep="\n  ")
        return 1
    print("all end-to-end checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
