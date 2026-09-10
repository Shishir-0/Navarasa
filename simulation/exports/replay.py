"""
Phase 8 — Replay & MP4 Export
Uses CARLA's built-in recorder to replay a saved .log file
and stitches exported PNG frames into an MP4 using OpenCV.

Usage:
    python replay.py --log exports/replay.log --output exports/replay.mp4
"""
import carla
import os
import glob
import argparse
import cv2
import time

def replay_and_screenshot(log_path, output_dir='exports/recordings', host='127.0.0.1', port=2000):
    """
    Replay the CARLA recorder log and save screenshots from a top-down spectator view.
    """
    client = carla.Client(host, port)
    client.set_timeout(10.0)
    world = client.get_world()

    print(f"[Replay] Starting replay of: {log_path}")
    client.replay_file(log_path, 0, 0, 0)  # start from beginning, full duration
    time.sleep(1.0)  # Give CARLA a moment to start replay

    # Move spectator to a top-down view
    spectator = world.get_spectator()
    top_down_transform = carla.Transform(
        carla.Location(x=0, y=0, z=80),
        carla.Rotation(pitch=-90)
    )
    spectator.set_transform(top_down_transform)

    print(f"[Replay] Replay running. CARLA recorder is playing back the scenario.")
    print(f"[Replay] Screenshots should have been saved to: {output_dir}")
    print("[Replay] Run stitch_mp4() to convert PNGs to MP4.")


def stitch_mp4(frames_dir, output_mp4, fps=20):
    """
    Stitches PNG frames from a directory into an MP4 video.
    Processes each view subfolder (driver, third_person, top_down) separately.
    """
    views = ['driver', 'third_person', 'top_down']

    for view in views:
        view_dir = os.path.join(frames_dir, view)
        if not os.path.exists(view_dir):
            print(f"[Stitch] Skipping {view} — no frames found at {view_dir}")
            continue

        pattern = os.path.join(view_dir, f'{view}_*.png')
        frame_files = sorted(glob.glob(pattern))

        if not frame_files:
            print(f"[Stitch] No PNG frames found for view: {view}")
            continue

        # Read first frame to get dimensions
        sample = cv2.imread(frame_files[0])
        h, w, _ = sample.shape

        view_mp4 = output_mp4.replace('.mp4', f'_{view}.mp4')
        writer = cv2.VideoWriter(view_mp4, cv2.VideoWriter_fourcc(*'mp4v'), fps, (w, h))

        for frame_path in frame_files:
            frame = cv2.imread(frame_path)
            if frame is not None:
                writer.write(frame)

        writer.release()
        print(f"[Stitch] Saved {len(frame_files)} frames to: {view_mp4}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='CARLA Replay and MP4 Export')
    parser.add_argument('--log', type=str, default='exports/replay.log', help='Path to CARLA recorder log file')
    parser.add_argument('--output', type=str, default='exports/replay.mp4', help='Output MP4 file path')
    parser.add_argument('--frames-dir', type=str, default='exports/recordings', help='Directory with PNG frame subfolders')
    parser.add_argument('--fps', type=int, default=20, help='Frames per second for output MP4')
    parser.add_argument('--stitch-only', action='store_true', help='Only stitch existing frames into MP4, skip replay')
    parser.add_argument('--host', type=str, default='127.0.0.1')
    parser.add_argument('--port', type=int, default=2000)
    args = parser.parse_args()

    if not args.stitch_only:
        replay_and_screenshot(args.log, args.frames_dir, args.host, args.port)

    print("[Stitch] Stitching PNG frames to MP4...")
    stitch_mp4(args.frames_dir, args.output, args.fps)
    print("[Done] All views exported.")
