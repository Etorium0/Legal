import pandas as pd
from sqlalchemy import create_engine
from bs4 import BeautifulSoup

engine = create_engine("mysql+mysqlconnector://root:123456789@localhost:3307/law")
df = pd.read_sql('SELECT id, noidung FROM vbpl LIMIT 5;', con=engine)

for i in range(len(df)):
    print(f"--- Doc {df.iloc[i]['id']} ---")
    soup = BeautifulSoup(df.iloc[i]['noidung'], 'html.parser')
    toanvan = soup.find('div', id='toanvancontent')
    if toanvan:
        print("Found #toanvancontent")
        print(toanvan.get_text()[:200])
    else:
        print("Not found #toanvancontent")
        print("Available divs:", [div.get('id') for div in soup.find_all('div') if div.get('id')])
