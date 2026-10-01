import json, urllib.request, io, os
from PIL import Image
m = json.load(open("demo/img-manifest.json"))
for it in m["items"]:
    d = urllib.request.urlopen(it["url"], timeout=60).read()
    im = Image.open(io.BytesIO(d)).convert("RGB")
    im.thumbnail((900, 900))
    os.makedirs(os.path.dirname(it["path"]), exist_ok=True)
    q = 80
    while True:
        b = io.BytesIO(); im.save(b, "JPEG", quality=q, optimize=True)
        if b.tell() <= 85000 or q <= 40: break
        q -= 5
    open(it["path"], "wb").write(b.getvalue())
    print(it["path"], b.tell(), "bytes q", q)
