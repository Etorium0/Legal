import os
import shutil
import zipfile
import subprocess
import sys

def clean_previous_data():
    print("Cleaning previous data...")
    if os.path.exists("phap-dien"):
        shutil.rmtree("phap-dien")
    if os.path.exists("demuc"):
        shutil.rmtree("demuc")
    if os.path.exists("jsonData.js"):
        os.remove("jsonData.js")
    if os.path.exists("BoPhapDien.html"):
        os.remove("BoPhapDien.html")

def extract_zip():
    zip_path = "BoPhapDienDienTu.zip"
    if not os.path.exists(zip_path):
        print(f"Error: {zip_path} not found!")
        sys.exit(1)
        
    print(f"Extracting {zip_path}...")
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(".")
    print("Extraction complete.")

def run_script(script_path):
    print(f"Running {script_path}...")
    result = subprocess.run([sys.executable, script_path], capture_output=False)
    if result.returncode != 0:
        print(f"Error running {script_path}")
        sys.exit(result.returncode)
    print(f"Finished {script_path}")

def main():
    print("Starting full recrawl process...")
    
    # Step 1: Clean
    clean_previous_data()
    
    # Step 2: Extract
    extract_zip()
    
    # Step 3: Convert JS to JSON and prepare structure
    # convert_js_to_json.py is now in scripts/
    run_script(os.path.join("scripts", "convert_js_to_json.py"))
    
    # Step 4: Run main ingestion
    run_script("main.py")
    
    print("Recrawl process completed successfully!")

if __name__ == "__main__":
    main()
