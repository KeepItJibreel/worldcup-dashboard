"""
Only for usage if cloning and running locally.
"""

import time
import json
import os
from datetime import datetime, timezone

def run_pipeline():
    """Run the full pipeline including predictions."""
    from pipeline import fetch_matches, fetch_standings, fetch_stadiums
    from prediction.predictor import generate_predictions

    os.makedirs("../frontend/public", exist_ok=True)

    matches   = fetch_matches()
    standings = fetch_standings()
    stadiums  = fetch_stadiums()

    matches.to_json("../frontend/public/matches.json",     orient="records")
    standings.to_json("../frontend/public/standings.json", orient="records")
    stadiums.to_json("../frontend/public/stadiums.json",   orient="records")

    return matches

def run_predictions():
    from prediction.predictor import generate_predictions
    generate_predictions(
        "../frontend/public/matches.json",
        "../frontend/public/standings.json",
        "../frontend/public/predictions.json"
    )
    print("[scheduler] Predictions updated.")

def has_live_matches(matches_df):
    """Return True if any match is currently in progress."""
    return any(
        (not row["finished"]) and (row["time_elapsed"] > 0)
        for _, row in matches_df.iterrows()
    )

def main():
    print("[scheduler] Starting — initial data fetch...")
    matches = run_pipeline()
    run_predictions()

    previously_live = has_live_matches(matches)

    while True:
        matches_df = None

        # check current state from saved JSON (cheap, no API call)
        try:
            with open("../frontend/public/matches.json") as f:
                data = json.load(f)
            currently_live = any(
                (not m["finished"]) and (m["time_elapsed"] > 0)
                for m in data
            )
        except Exception:
            currently_live = False

        if currently_live:
            print(f"[scheduler] {datetime.now(timezone.utc).strftime('%H:%M:%S')} — live match detected, refreshing...")
            matches_df = run_pipeline()
            previously_live = True

        elif previously_live:
            # a match just finished — do one final update + refresh predictions
            print("[scheduler] Match just finished — final update + recalculating predictions...")
            matches_df = run_pipeline()
            run_predictions()
            previously_live = False

        else:
            print(f"[scheduler] {datetime.now(timezone.utc).strftime('%H:%M:%S')} — no live matches, sleeping...")

        time.sleep(60)

if __name__ == "__main__":
    main()