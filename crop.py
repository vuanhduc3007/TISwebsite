from PIL import Image
import numpy as np
def make_transparent(filename, out):
    img = Image.open(filename).convert('RGBA')
    data = np.array(img)
    r, g, b, a = data.T
    white_areas = (r > 240) & (g > 240) & (b > 240)
    data[..., :-1][white_areas.T] = (255, 255, 255)
    data[..., -1][white_areas.T] = 0
    Image.fromarray(data).save(out)

make_transparent(r'C:\Users\Admin\.gemini\antigravity\brain\5b3c10c8-8d18-4700-8887-4617566c0cfb\.user_uploaded\media_1785946087544.jpg', r'src\app\icon.png')
make_transparent(r'C:\Users\Admin\.gemini\antigravity\brain\5b3c10c8-8d18-4700-8887-4617566c0cfb\.user_uploaded\media_1785946211463.png', r'public\brand\tis-logo-horizontal.png')
