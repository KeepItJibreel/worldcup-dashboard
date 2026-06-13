import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import cross_val_score
import json, os, warnings
warnings.filterwarnings("ignore")

THIS_DIR     = os.path.dirname(os.path.abspath(__file__))
FEATURE_COLS = ["d_pts", "d_gd", "d_gf", "d_ga"]

NAME_MAP = {
    "United States":            "USA",
    "United States of America": "USA",
    "IR Iran":                  "Iran",
    "Korea Republic":           "South Korea",
    "Republic of Korea":        "South Korea",
    "DR Congo":                 "DR Congo",
    "Congo DR":                 "DR Congo",
    "Ivory Coast":              "Côte d'Ivoire",
    "Cote d'Ivoire":            "Côte d'Ivoire",
    "Bosnia Herzegovina":       "Bosnia and Herzegovina",
    "Bosnia-Herzegovina":       "Bosnia and Herzegovina",
    "Curacao":                  "Curaçao",
    "Turkey":                   "Türkiye",
    "Czech Republic":           "Czechia",
}

def normalize(name):
    if not isinstance(name, str) or not name.strip():
        return ""
    return NAME_MAP.get(name.strip(), name.strip())

def _running_form(group_df):
    form     = {}
    pre      = {}
    matchday = {}

    for idx, match in group_df.sort_values(["year", "date"]).iterrows():
        year = match["year"]
        h = normalize(match["home_team"])
        a = normalize(match["away_team"])
        hs  = int(match["home_score"])
        as_ = int(match["away_score"])
        hk, ak = (year, h), (year, a)

        for key in (hk, ak):
            if key not in form:
                form[key] = {"gp": 0, "pts": 0, "gf": 0, "ga": 0}

        pre[(hk, idx)]      = dict(form[hk])
        pre[(ak, idx)]      = dict(form[ak])
        matchday[(hk, idx)] = form[hk]["gp"]
        matchday[(ak, idx)] = form[ak]["gp"]

        if hs > as_:   h_pts, a_pts = 3, 0
        elif hs < as_: h_pts, a_pts = 0, 3
        else:          h_pts, a_pts = 1, 1

        form[hk]["gp"] += 1; form[hk]["pts"] += h_pts
        form[hk]["gf"] += hs; form[hk]["ga"] += as_
        form[ak]["gp"] += 1; form[ak]["pts"] += a_pts
        form[ak]["gf"] += as_; form[ak]["ga"] += hs

    return pre, matchday

def _rates(f):
    gp = f["gp"]
    if gp == 0:
        return 0.0, 0.0, 0.0, 0.0
    return (
        f["pts"] / gp,
        (f["gf"] - f["ga"]) / gp,
        f["gf"] / gp,
        f["ga"] / gp,
    )

def build_training_data(csv_path):
    df = pd.read_csv(csv_path)
    df["date"]       = pd.to_datetime(df["date"])
    df["home_score"] = pd.to_numeric(df["home_score"], errors="coerce")
    df["away_score"] = pd.to_numeric(df["away_score"], errors="coerce")
    df = df.dropna(subset=["home_score", "away_score"])

    group_df = df[
        df["stage"].str.contains("Group", na=False) &
        (df["year"] >= 1994)
    ].copy().sort_values(["year", "date"]).reset_index(drop=True)

    pre, matchday_map = _running_form(group_df)

    rows, labels, weights = [], [], []

    for idx, match in group_df.iterrows():
        year = match["year"]
        h = normalize(match["home_team"])
        a = normalize(match["away_team"])
        hs, as_ = int(match["home_score"]), int(match["away_score"])

        hf = pre.get(((year, h), idx), {"gp":0,"pts":0,"gf":0,"ga":0})
        af = pre.get(((year, a), idx), {"gp":0,"pts":0,"gf":0,"ga":0})

        h_pts, h_gd, h_gf, h_ga = _rates(hf)
        a_pts, a_gd, a_gf, a_ga = _rates(af)

        if hs > as_:    outcome = "H"
        elif hs == as_: outcome = "D"
        else:           outcome = "A"

        gp_before = matchday_map.get(((year, h), idx), 0)
        w = 0.3 if gp_before == 0 else 1.0

        rows.append({"d_pts": h_pts-a_pts, "d_gd": h_gd-a_gd,
                     "d_gf": h_gf-a_gf,   "d_ga": h_ga-a_ga})
        labels.append(outcome)
        weights.append(w)

        rows.append({"d_pts": a_pts-h_pts, "d_gd": a_gd-h_gd,
                     "d_gf": a_gf-h_gf,   "d_ga": a_ga-h_ga})
        labels.append("H" if outcome == "A" else "A" if outcome == "H" else "D")
        weights.append(w)

    return pd.DataFrame(rows)[FEATURE_COLS], np.array(labels), \
           np.array(weights), len(group_df)

def build_model(csv_path=None):
    if csv_path is None:
        csv_path = os.path.join(THIS_DIR, "data", "wcmatches.csv")

    X_df, y, weights, n_matches = build_training_data(csv_path)

    scaler = StandardScaler()
    X = scaler.fit_transform(X_df)

    model = LogisticRegression(solver="lbfgs", max_iter=1000, C=1.0)
    model.fit(X, y, sample_weight=weights)

    cv = cross_val_score(model, X, y, cv=5, scoring="accuracy")
    print(f"Trained on {n_matches} group stage matches (1994–2018)")
    print(f"{len(y)} training rows (2 per match, weighted by matchday)")
    print(f"CV accuracy: {cv.mean():.1%} ± {cv.std():.1%}")
    print(f"Classes: {model.classes_}")

    return model, scaler

def _standings_rates(row):
    mp = row.get("mp", 0)
    if mp == 0:
        return 0.0, 0.0, 0.0, 0.0
    gf = row.get("gf", 0)
    ga = row.get("ga", 0)
    return (
        row.get("points", 0) / mp,
        (gf - ga) / mp,
        gf / mp,
        ga / mp,
    )

def generate_predictions(matches_path, standings_path, out_path):
    matches   = pd.read_json(matches_path)
    standings = pd.read_json(standings_path)

    standings["team"] = standings["team"].apply(normalize)
    team_stats = {row["team"]: row.to_dict() for _, row in standings.iterrows()}

    model, scaler = build_model()

    skipped = set()
    predictions = []
    upcoming = matches[matches["finished"] == False]

    for _, m in upcoming.iterrows():
        home = normalize(m["home"])
        away = normalize(m["away"])

        # skip if name normalized to empty (nan rows) or not in standings
        if not home or not away:
            continue
        if home not in team_stats:
            skipped.add(home)
            continue
        if away not in team_stats:
            skipped.add(away)
            continue

        h_pts, h_gd, h_gf, h_ga = _standings_rates(team_stats[home])
        a_pts, a_gd, a_gf, a_ga = _standings_rates(team_stats[away])

        def predict(t1_pts, t1_gd, t1_gf, t1_ga,
                    t2_pts, t2_gd, t2_gf, t2_ga):
            feats = pd.DataFrame([{
                "d_pts": t1_pts - t2_pts,
                "d_gd":  t1_gd  - t2_gd,
                "d_gf":  t1_gf  - t2_gf,
                "d_ga":  t1_ga  - t2_ga,
            }])[FEATURE_COLS]
            probs = model.predict_proba(scaler.transform(feats))[0]
            cls = list(model.classes_)
            return {c: round(float(probs[i]) * 100, 1) for i, c in enumerate(cls)}

        h_probs = predict(h_pts, h_gd, h_gf, h_ga,
                          a_pts, a_gd, a_gf, a_ga)
        a_probs = predict(a_pts, a_gd, a_gf, a_ga,
                          h_pts, h_gd, h_gf, h_ga)

        hs = team_stats[home]
        as_ = team_stats[away]

        predictions.append({
            "match_id":     m["id"],
            "group":        m["group"],
            "home":         m["home"],
            "away":         m["away"],
            "date":         m["local_date"],
            "home_win_pct": h_probs.get("H", 0),
            "away_win_pct": a_probs.get("H", 0),
            "draw_pct":     h_probs.get("D", 0),
            "home_pts":     hs.get("points", 0),
            "away_pts":     as_.get("points", 0),
            "home_gd":      hs.get("gf", 0) - hs.get("ga", 0),
            "away_gd":      as_.get("gf", 0) - as_.get("ga", 0),
            "home_mp":      hs.get("mp", 0),
            "away_mp":      as_.get("mp", 0),
        })

    if skipped:
        print(f"WARNING — {len(skipped)} team(s) not found in standings:")
        for t in sorted(skipped):
            print(f"  '{t}'")
        print("Add these to NAME_MAP in predictor.py to fix.")

    with open(out_path, "w") as f:
        json.dump(predictions, f)
    print(f"Generated {len(predictions)} predictions ({len(upcoming) - len(predictions)} skipped due to name mismatch)")

if __name__ == "__main__":
    generate_predictions(
        "../../frontend/public/matches.json",
        "../../frontend/public/standings.json",
        "../../frontend/public/predictions.json",
    )