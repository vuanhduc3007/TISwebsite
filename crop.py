from collections import deque
from PIL import Image
import numpy as np

def generate_clean_transparent_logo(source_path, horizontal_out, icon_out):
    img = Image.open(source_path).convert('RGB')
    arr = np.array(img).astype(np.float32)
    h, w, _ = arr.shape

    bg_color = np.array([254.0, 254.0, 254.0])
    dist = np.linalg.norm(arr - bg_color, axis=2)

    is_bg_seed = dist < 15
    visited = np.zeros((h, w), dtype=bool)
    queue = deque()

    for y in range(h):
        if is_bg_seed[y, 0]: queue.append((y, 0)); visited[y, 0] = True
        if is_bg_seed[y, w - 1]: queue.append((y, w - 1)); visited[y, w - 1] = True
    for x in range(w):
        if is_bg_seed[0, x]: queue.append((0, x)); visited[0, x] = True
        if is_bg_seed[h - 1, x]: queue.append((h - 1, x)); visited[h - 1, x] = True

    while queue:
        y, x = queue.popleft()
        for dy, dx in ((-1,0), (1,0), (0,-1), (0,1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and dist[ny, nx] < 45:
                visited[ny, nx] = True
                queue.append((ny, nx))

    alpha = np.ones((h, w), dtype=np.float32)
    for y in range(h):
        for x in range(w):
            if visited[y, x]:
                if dist[y, x] <= 18:
                    alpha[y, x] = 0.0
                else:
                    alpha[y, x] = (dist[y, x] - 18.0) / (45.0 - 18.0)

    out = np.zeros((h, w, 4), dtype=np.uint8)
    for c in range(3):
        fg = np.where(alpha > 0.01, (arr[:, :, c] - (1.0 - alpha) * 254.0) / np.maximum(alpha, 0.01), 254.0)
        out[:, :, c] = np.clip(fg, 0, 255).astype(np.uint8)
    out[:, :, 3] = np.clip(alpha * 255.0, 0, 255).astype(np.uint8)

    ys, xs = np.where(out[:, :, 3] > 10)
    pad = 10
    ymin = max(0, ys.min() - pad)
    ymax = min(h, ys.max() + pad + 1)
    xmin = max(0, xs.min() - pad)
    xmax = min(w, xs.max() + pad + 1)

    cropped = out[ymin:ymax, xmin:xmax]
    logo = Image.fromarray(cropped)
    logo.save(horizontal_out)

    target_size = 512
    icon = Image.new('RGBA', (target_size, target_size), (0, 0, 0, 0))
    pad = 40
    max_w = target_size - 2 * pad
    max_h = target_size - 2 * pad
    scale = min(max_w / logo.width, max_h / logo.height)
    new_w = int(logo.width * scale)
    new_h = int(logo.height * scale)
    resized = logo.resize((new_w, new_h), Image.LANCZOS)
    x = (target_size - new_w) // 2
    y = (target_size - new_h) // 2
    icon.paste(resized, (x, y), resized)
    icon.save(icon_out)

