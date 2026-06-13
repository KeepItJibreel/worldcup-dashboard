import requests
import pandas as pd
from dotenv import load_dotenv
import os
import re
from prediction.predictor import generate_predictions

load_dotenv()
BASE    = os.getenv("BASE_URL")
TOKEN   = os.getenv("JWT_TOKEN")
HEADERS = {"Authorization": f"Bearer {TOKEN}"}

def parse_scorers(val):
    """
    Turns MongoDB set-literal string, example:
      {"J. Quiñones 9'","R. Jiménez 67'"}

    Into Python list of strings.
    """
    if val is None:
        return []
    s = str(val).strip()
    if s.lower() == "null" or s == "" or s == "{}":
        return []
    matches = re.findall(r'"([^"]*)"', s)
    return [m.strip() for m in matches if m.strip()]

def fetch_matches():
    r = requests.get(f"{BASE}/get/games", headers=HEADERS)
    df = pd.DataFrame(r.json()["games"])

    df["home_score"]   = pd.to_numeric(df["home_score"], errors="coerce").fillna(0).astype(int)
    df["away_score"]   = pd.to_numeric(df["away_score"], errors="coerce").fillna(0).astype(int)
    df["finished"]     = df["finished"].apply(lambda x: str(x).lower() == "true")
    df["time_elapsed"] = pd.to_numeric(df["time_elapsed"], errors="coerce").fillna(0).astype(int)
    df["home_scorers"] = df["home_scorers"].apply(parse_scorers)
    df["away_scorers"] = df["away_scorers"].apply(parse_scorers)

    df = df[[
        "id", "group", "matchday", "type", "local_date",
        "home_team_name_en", "away_team_name_en",
        "home_score", "away_score",
        "home_scorers", "away_scorers",
        "finished", "time_elapsed", "stadium_id"
    ]].rename(columns={
        "home_team_name_en": "home",
        "away_team_name_en": "away",
    })

    print(f"Loaded {len(df)} matches. {df['finished'].sum()} completed.")
    return df

def fetch_standings():
    groups_r = requests.get(f"{BASE}/get/groups", headers=HEADERS).json()["groups"]
    teams_r  = requests.get(f"{BASE}/get/teams",  headers=HEADERS).json()["teams"]

    team_map = {str(t["id"]): t["name_en"] for t in teams_r}

    rows = []
    for group in groups_r:
        for entry in group["teams"]:
            rows.append({
                "group":  group["name"],
                "team":   team_map.get(str(entry["team_id"]), "Unknown"),
                "mp":     int(entry.get("mp", 0)),
                "w":      int(entry.get("w", 0)),
                "d":      int(entry.get("d", 0)),
                "l":      int(entry.get("l", 0)),
                "points": int(entry.get("pts", 0)),
                "gf":     int(entry.get("gf", 0)),
                "ga":     int(entry.get("ga", 0)),
                "gd":     int(entry.get("gd", 0)),
            })

    df = pd.DataFrame(rows).sort_values(
        ["group", "points", "gd"], ascending=[True, False, False]
    )
    print(f"Standings loaded for {df['group'].nunique()} groups")
    return df

def fetch_stadiums():
    r  = requests.get(f"{BASE}/get/stadiums", headers=HEADERS)
    df = pd.DataFrame(r.json()["stadiums"])
    df = df[["id", "name_en", "city_en", "country_en", "capacity"]]
    print(f"Loaded {len(df)} stadiums")
    return df

if __name__ == "__main__":
    os.makedirs("../frontend/public", exist_ok=True)

    matches   = fetch_matches()
    standings = fetch_standings()
    stadiums  = fetch_stadiums()

    matches.to_json("../frontend/public/matches.json",     orient="records")
    standings.to_json("../frontend/public/standings.json", orient="records")
    stadiums.to_json("../frontend/public/stadiums.json",   orient="records")
    print("Data pipeline complete.")

    generate_predictions(
        "../frontend/public/matches.json",
        "../frontend/public/standings.json",
        "../frontend/public/predictions.json"
    )