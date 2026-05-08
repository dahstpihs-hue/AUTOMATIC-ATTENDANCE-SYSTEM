import streamlit as st
import pandas as pd
import gspread
from google.oauth2.service_account import Credentials
import json

# --- 1. CONFIGURATION ---
st.set_page_config(page_title="TPIHS | Portal", layout="wide")

# --- 2. CONNECTION ---
@st.cache_resource
def init_connection():
    try:
        key_dict = json.loads(st.secrets["gcp_service_account"])
        creds = Credentials.from_service_account_info(
            key_dict, 
            scopes=["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"]
        )
        return gspread.authorize(creds)
    except Exception as e:
        st.error(f"Secret Key Error: {e}")
        return None

gc = init_connection()

# --- 3. LOAD DATA (USING INDEX INSTEAD OF NAMES) ---
SHEET_ID = '124hfxw0Y1QQSe1VpPA2LZrhG8cqJpcktlYFGSNVEYc4'

@st.cache_data(ttl=60)
def load_data():
    try:
        sh = gc.open_by_key(SHEET_ID)
        
        # Ab hum naam nahi, tabs ka number use kar rahe hain
        # Pehla tab (0), Dusra tab (1), Tisra tab (2)
        users_sheet = sh.get_worksheet(0)   # Credentials wala tab
        student_sheet = sh.get_worksheet(1) # Students wala tab
        log_sheet = sh.get_worksheet(2)     # Attendance Logs wala tab
        
        df_users = pd.DataFrame(users_sheet.get_all_records())
        return sh, df_users
    except Exception as e:
        st.error(f"🚨 GOOGLE ACCESS DENIED: {e}")
        st.info("Check: Kya aapne Sheet ko 'Anyone with the link' (Editor) kiya hai?")
        st.stop()

if gc:
    sh, df_users = load_data()
    st.success("✅ SYSTEM CONNECTED!")

# --- 4. SIMPLE LOGIN ---
st.title("🎓 ALLIED HEALTH SCIENCES PORTAL")
with st.form("login"):
    u = st.text_input("Username")
    p = st.text_input("Password", type="password")
    if st.form_submit_button("LOGIN"):
        # Login logic
        match = df_users[(df_users['Username'].astype(str) == u.strip()) & (df_users['Password'].astype(str) == p.strip())]
        if not match.empty:
            st.success(f"Khush Amdeed {u}!")
            st.balloons()
        else:
            st.error("Ghalat Username/Password")
