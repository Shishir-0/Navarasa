"""
Offline validation script — run WITHOUT CARLA to sanity-check export outputs.

Usage (from simulation/ or simulation/scenarios/):
    python validate_outputs.py [--export-dir PATH]

Exit code 0 = all checks passed.
Exit code 1 = one or more checks failed.
"""

import json
import csv
import os
import sys
import argparse

EXPECTED_CSV_HEADERS = [
    'frame', 'timestamp', 'scenario', 'seed',
    'actor_id', 'is_ego', 'role', 'type',
    'x', 'y', 'z', 'vx', 'vy', 'vz', 'speed', 'heading',
    'bbox_x', 'bbox_y', 'bbox_z'
]

REQUIRED_FRAME_KEYS  = {'frame', 'timestamp', 'scenario', 'seed', 'weather', 'ego', 'actors'}
REQUIRED_ACTOR_KEYS  = {'actor_id', 'is_ego', 'role', 'type', 'x', 'y', 'z',
                        'vx', 'vy', 'vz', 'speed', 'heading'}
VALID_ROLES          = {'ego', 'vehicle', 'pedestrian', 'prop', 'unknown'}


def resolve_export_dir(given: str) -> str:
    """Try to find the exports directory regardless of cwd."""
    candidates = [
        given,
        os.path.join('..', 'exports'),
        os.path.join('simulation', 'exports'),
        os.path.join('..', '..', 'simulation', 'exports'),
    ]
    for c in candidates:
        if os.path.isdir(c):
            return os.path.normpath(c)
    return given  # return as-is, will fail with a clear message later


def check(condition: bool, message: str, errors: list, warnings: list,
          is_warning=False):
    if not condition:
        (warnings if is_warning else errors).append(message)
    return condition


def validate(export_dir: str) -> bool:
    errors   = []
    warnings = []
    print(f"\n=== NAVRASA Export Validation ===")
    print(f"Export dir: {os.path.abspath(export_dir)}\n")

    # --- Directory exists ---
    if not check(os.path.isdir(export_dir),
                 f"Export directory does not exist: {export_dir}", errors):
        _report(errors, warnings)
        return False

    json_path = os.path.join(export_dir, 'actors.json')
    csv_path  = os.path.join(export_dir, 'tracks.csv')
    meta_path = os.path.join(export_dir, 'run_metadata.json')
    log_path  = os.path.join(export_dir, 'replay.log')

    # --- Required files ---
    check(os.path.isfile(json_path),   f"MISSING: actors.json",     errors)
    check(os.path.isfile(csv_path),    f"MISSING: tracks.csv",      errors)
    check(os.path.isfile(meta_path),   f"MISSING: run_metadata.json", warnings, is_warning=True)
    check(os.path.isfile(log_path),    f"MISSING: replay.log (only exists after CARLA run)",
          warnings, is_warning=True)

    # --- Validate actors.json ---
    if os.path.isfile(json_path):
        print(f"[actors.json]")
        try:
            with open(json_path, encoding='utf-8') as f:
                data = json.load(f)

            check(isinstance(data, list),
                  "actors.json: root element must be a JSON array", errors)

            if isinstance(data, list):
                check(len(data) > 0, "actors.json: array is empty (0 frames)", warnings,
                      is_warning=True)
                print(f"  Frames: {len(data)}")

                frame_ids = set()
                for i, frame in enumerate(data[:5]):   # spot-check first 5
                    missing_keys = REQUIRED_FRAME_KEYS - set(frame.keys())
                    check(not missing_keys,
                          f"  Frame {i}: missing keys {missing_keys}", errors)

                    fid = frame.get('frame')
                    check(fid not in frame_ids,
                          f"  Frame {i}: duplicate frame index {fid}", errors)
                    if fid is not None:
                        frame_ids.add(fid)

                    # Check ego
                    ego = frame.get('ego')
                    if ego:
                        missing_actor_keys = REQUIRED_ACTOR_KEYS - set(ego.keys())
                        check(not missing_actor_keys,
                              f"  Frame {i} ego: missing keys {missing_actor_keys}", errors)
                        check(ego.get('is_ego') is True,
                              f"  Frame {i} ego: is_ego != True", errors)
                        check(ego.get('role') == 'ego',
                              f"  Frame {i} ego: role != 'ego' (got {ego.get('role')})", errors)

                    # Check actors list
                    actors = frame.get('actors', [])
                    for actor in actors[:3]:
                        missing = REQUIRED_ACTOR_KEYS - set(actor.keys())
                        check(not missing,
                              f"  Frame {i} actor {actor.get('actor_id')}: missing keys {missing}",
                              errors)
                        check(actor.get('role') in VALID_ROLES,
                              f"  Frame {i} actor: unexpected role '{actor.get('role')}'",
                              warnings, is_warning=True)

                print(f"  Spot-check (first 5 frames): OK")

        except json.JSONDecodeError as e:
            errors.append(f"actors.json: invalid JSON — {e}")

    # --- Validate tracks.csv ---
    if os.path.isfile(csv_path):
        print(f"[tracks.csv]")
        try:
            with open(csv_path, encoding='utf-8', newline='') as f:
                reader = csv.DictReader(f)
                headers = reader.fieldnames or []

                missing_cols = set(EXPECTED_CSV_HEADERS) - set(headers)
                extra_cols   = set(headers) - set(EXPECTED_CSV_HEADERS)
                check(not missing_cols,
                      f"  tracks.csv: missing columns {missing_cols}", errors)
                check(not extra_cols,
                      f"  tracks.csv: unexpected extra columns {extra_cols}",
                      warnings, is_warning=True)

                rows = list(reader)
                check(len(rows) > 0,
                      "tracks.csv: no data rows (only header)", warnings, is_warning=True)
                print(f"  Rows: {len(rows)}, Columns: {len(headers)}")

                # Check frame monotonicity
                frames_seen = [int(r['frame']) for r in rows if r.get('frame', '').isdigit()]
                if frames_seen:
                    is_mono = all(frames_seen[i] <= frames_seen[i+1]
                                  for i in range(len(frames_seen)-1))
                    check(is_mono, "tracks.csv: frame column is not monotonically non-decreasing",
                          warnings, is_warning=True)

                # Check all rows have actor_id
                blank_ids = sum(1 for r in rows if not r.get('actor_id', '').strip())
                check(blank_ids == 0,
                      f"tracks.csv: {blank_ids} rows with blank actor_id", errors)

                print(f"  Schema: OK")

        except Exception as e:
            errors.append(f"tracks.csv: could not read — {e}")

    # --- Validate run_metadata.json ---
    if os.path.isfile(meta_path):
        print(f"[run_metadata.json]")
        try:
            with open(meta_path, encoding='utf-8') as f:
                meta = json.load(f)
            for key in ('scenario', 'seed', 'map', 'weather'):
                check(key in meta,
                      f"run_metadata.json: missing key '{key}'", warnings, is_warning=True)
            print(f"  Scenario: {meta.get('scenario')}  Seed: {meta.get('seed')}")
        except Exception as e:
            warnings.append(f"run_metadata.json: could not parse — {e}")

    return _report(errors, warnings)


def _report(errors, warnings):
    print()
    if warnings:
        print(f"WARNINGS ({len(warnings)}):")
        for w in warnings:
            print(f"  ⚠  {w}")
    if errors:
        print(f"\nERRORS ({len(errors)}):")
        for e in errors:
            print(f"  ✗  {e}")
        print("\nResult: FAILED")
        return False
    print("Result: ALL CHECKS PASSED ✓")
    return True


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Validate NAVRASA simulation export outputs.')
    parser.add_argument('--export-dir', default=None,
                        help='Path to the exports/ directory (default: auto-detected)')
    args = parser.parse_args()

    export_dir = args.export_dir or resolve_export_dir('../exports')
    ok = validate(export_dir)
    sys.exit(0 if ok else 1)
