import zipfile
import os

zip_path = "BoPhapDienDienTu.zip"
with zipfile.ZipFile(zip_path, 'r') as zip_ref:
    zip_ref.extract("jsonData.js", ".")
    print("Extracted jsonData.js")
