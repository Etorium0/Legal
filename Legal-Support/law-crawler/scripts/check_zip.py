import zipfile
import os

zip_path = "BoPhapDienDienTu.zip"
with zipfile.ZipFile(zip_path, 'r') as zip_ref:
    print("Searching for .json files in zip:")
    found = False
    for file in zip_ref.namelist():
        if file.endswith(".json"):
            print(file)
            found = True
    if not found:
        print("No .json files found.")
